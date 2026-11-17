import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, count, desc, eq, gt, gte, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { database } from "#services/database";
import { vouchers } from "#services/schema";

import { UNAUTHORIZED } from "../auth.ts";
import { VOUCHER_PLATFORMS, type VoucherPlatform } from "../platforms.ts";
import { VOUCHER_TYPES, type VoucherType } from "../voucher-types.ts";

const MAX_BATCH = 100;

const keyInput = z.object({ key: z.string().min(1, "缺少 API Key").max(200) });
const distributionFilterSchema = z.enum(["all", "undistributed", "distributed"]);
const usageFilterSchema = z.enum(["all", "unused", "partial", "used"]);
const listInput = keyInput.extend({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  type: z.enum(["all", ...VOUCHER_TYPES.map((type) => type.value)] as ["all", ...VoucherType[]]),
  distribution: distributionFilterSchema,
  usage: usageFilterSchema,
});

function distributionCondition(value: z.infer<typeof distributionFilterSchema>) {
  if (value === "all") return;
  return value === "distributed" ? isNotNull(vouchers.platform) : isNull(vouchers.platform);
}

function usageCondition(value: z.infer<typeof usageFilterSchema>) {
  if (value === "all") return;
  if (value === "unused") return eq(vouchers.generatedCount, 0);
  if (value === "partial") {
    return and(gt(vouchers.generatedCount, 0), lt(vouchers.generatedCount, vouchers.totalImages));
  }
  return gte(vouchers.generatedCount, vouchers.totalImages);
}
const voucherTypeSchema = z.enum(
  VOUCHER_TYPES.map((type) => type.value) as [VoucherType, ...VoucherType[]],
);
const createInput = keyInput.extend({
  type: voucherTypeSchema,
  total: z.number().int().min(1, "每张至少可生成 1 张").max(100, "每张最多 100 张"),
  count: z.number().int().min(1, "至少生成 1 个").max(MAX_BATCH, `一次最多生成 ${MAX_BATCH} 个`),
});
const platformSchema = z.enum(
  VOUCHER_PLATFORMS.map((platform) => platform.value) as [VoucherPlatform, ...VoucherPlatform[]],
);
const distributeInput = keyInput.extend({
  id: z.number().int().positive(),
  platform: platformSchema,
});

function unauthorizedError() {
  return Object.assign(new Error(UNAUTHORIZED), { status: 401 });
}

// shortcut: API Key 校验没有限流，公开部署后若担心暴力破解，再按 IP 加限流。
const adminMiddleware = createMiddleware({ type: "function" }).server(({ data, next }) => {
  if (!env.ADMIN_API_KEY) throw new Error("服务端未配置 ADMIN_API_KEY");
  const parsed = keyInput.safeParse(data);
  if (!parsed.success || parsed.data.key !== env.ADMIN_API_KEY) throw unauthorizedError();
  return next();
});

export const listVouchers = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data) => listInput.parse(data))
  .handler(async ({ data }) => {
    const [stats] = await database
      .select({
        total: count(),
        distributed: sql<number>`count(*) filter (where ${vouchers.platform} is not null)`,
        unused: sql<number>`count(*) filter (where ${vouchers.generatedCount} = 0)`,
        partial: sql<number>`count(*) filter (where ${vouchers.generatedCount} > 0 and ${vouchers.generatedCount} < ${vouchers.totalImages})`,
        used: sql<number>`count(*) filter (where ${vouchers.generatedCount} >= ${vouchers.totalImages})`,
      })
      .from(vouchers);
    const filter = and(
      data.type === "all" ? undefined : eq(vouchers.type, data.type),
      distributionCondition(data.distribution),
      usageCondition(data.usage),
    );
    const [filtered] = await database.select({ total: count() }).from(vouchers).where(filter);
    const rows = await database
      .select()
      .from(vouchers)
      .where(filter)
      .orderBy(desc(vouchers.createdAt), desc(vouchers.id))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize);
    return { vouchers: rows, stats, total: filtered.total };
  });

export const createVoucherBatch = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data) => createInput.parse(data))
  .handler(async ({ data }) => {
    const createdAt = Date.now();
    const codes = Array.from({ length: data.count }, () => crypto.randomUUID());
    await database
      .insert(vouchers)
      .values(codes.map((code) => ({ code, type: data.type, totalImages: data.total, createdAt })));
    return codes;
  });

export const distributeVoucher = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data) => distributeInput.parse(data))
  .handler(async ({ data }) => {
    const rows = await database.select().from(vouchers).where(eq(vouchers.id, data.id)).limit(1);
    const voucher = rows.at(0);
    if (!voucher) throw new Error("凭证不存在");
    if (voucher.platform !== null) throw new Error("凭证已分发，不能重复分发");
    await database
      .update(vouchers)
      .set({ platform: data.platform })
      .where(eq(vouchers.id, data.id));
  });
