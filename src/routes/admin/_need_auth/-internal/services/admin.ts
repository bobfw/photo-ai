import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { database } from "#services/database";
import { generatedImages, vouchers } from "#services/schema";

import { UNAUTHORIZED } from "../auth.ts";
import { VOUCHER_TYPES, type VoucherType } from "../voucher-types.ts";

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
  total: z.number().int().min(1, "每张至少可生成 1 张").max(5, "每张最多 5 张"),
  edits: z.number().int().min(0, "可修改次数不能小于 0").max(5, "每张最多修改 5 次"),
});
const distributeInput = keyInput.extend({
  code: z.string().min(1).max(200),
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
      .select({
        ...getTableColumns(vouchers),
        editsUsed: sql<number>`(
          select coalesce(sum(${generatedImages.editCount}), 0)
          from ${generatedImages}
          where ${generatedImages.voucherId} = ${vouchers.id}
        )`.as("edits_used"),
      })
      .from(vouchers)
      .where(filter)
      .orderBy(desc(vouchers.createdAt), desc(vouchers.id))
      .limit(data.pageSize)
      .offset((data.page - 1) * data.pageSize);
    return { vouchers: rows, stats, total: filtered.total };
  });

export const createVoucher = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data) => createInput.parse(data))
  .handler(async ({ data }) => {
    const code = crypto.randomUUID();
    const createdAt = Date.now();
    await database.insert(vouchers).values({
      code,
      type: data.type,
      totalImages: data.total,
      maxEdits: data.edits,
      createdAt,
    });
    return { code, createdAt };
  });

export const distributeVoucher = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data) => distributeInput.parse(data))
  .handler(async ({ data }) => {
    await database
      .update(vouchers)
      .set({ platform: "xiaohongshu" })
      .where(and(eq(vouchers.code, data.code), isNull(vouchers.platform)));
  });
