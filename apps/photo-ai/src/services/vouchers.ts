import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { acceptTerms, loadAnyVoucher, loadPublicImages, loadVoucher } from "./voucher-store.ts";
import { codeSchema } from "./voucher-types.ts";

const stateInput = z.object({ code: codeSchema, type: z.string().min(1).max(32) });
const acceptInput = z.object({
  code: codeSchema,
  type: z.string().min(1, "缺少凭证类型").max(32, "凭证类型不正确"),
});

export const getVoucherState = createServerFn({ method: "POST" })
  .validator((data) => stateInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code, data.type);
    if (!voucher) return;

    return {
      totalImages: voucher.totalImages,
      generatedCount: voucher.generatedCount,
      remaining: Math.max(0, voucher.totalImages - voucher.generatedCount),
      termsAccepted: typeof voucher.termsAcceptedAt === "number",
      images: await loadPublicImages(voucher.id, voucher.maxEdits),
    };
  });

export const acceptVoucherTerms = createServerFn({ method: "POST" })
  .validator((data) => acceptInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadAnyVoucher(data.code);
    if (!voucher) throw new Error("凭证无效");
    if (voucher.type !== data.type) {
      throw new Error("这个凭证不属于当前服务，请从首页选择对应的入口");
    }
    await acceptTerms(voucher);
  });
