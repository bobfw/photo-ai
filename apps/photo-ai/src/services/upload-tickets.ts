import { createServerFn } from "@tanstack/react-start";
import { and, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";

import { database } from "./database.ts";
import { createUploadKey, publicUrl, qiniuConfig, signUploadToken } from "./qiniu.ts";
import { generatedImages, uploads } from "./schema.ts";
import { assertUploadSignAllowed } from "./upload-sign-limit.ts";
import { assertTermsAccepted, loadVoucher } from "./voucher-store.ts";
import { codeSchema, uploadKeySchema, voucherTypeSchema } from "./voucher-types.ts";

const typeInput = z.object({ code: codeSchema, type: voucherTypeSchema });

// 前端拿凭证直传七牛，key 和服务端签发的一致；桶里的对象由生命周期规则清理。
export const createUploadTicket = createServerFn({ method: "POST" })
  .validator((data) => typeInput.parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code, data.type);
    if (!voucher) throw new Error("凭证无效");
    assertTermsAccepted(voucher);
    // 新图额度用完时，只要还有未过期且可修改的图，仍允许上传照片用于重新生成。
    if (voucher.generatedCount >= voucher.totalImages) {
      const now = Date.now();
      const editable = await database
        .select({ id: generatedImages.id })
        .from(generatedImages)
        .where(
          and(
            eq(generatedImages.voucherId, voucher.id),
            lt(generatedImages.editCount, voucher.maxEdits),
            gt(generatedImages.expiresAt, now),
          ),
        )
        .limit(1);
      if (editable.length === 0) throw new Error("这个凭证的照片额度和修改次数都已用完");
    }
    await assertUploadSignAllowed(voucher.id);

    const config = qiniuConfig();
    const key = createUploadKey();
    // 先记录签发的 key；confirm 只能确认这里存在的 key，未确认的不能用于生成。
    await database
      .insert(uploads)
      .values({
        voucherId: voucher.id,
        key,
        url: publicUrl(config.publicBase, key),
        createdAt: Date.now(),
      })
      .onConflictDoNothing();
    const token = await signUploadToken(config, key);
    return { uploadHost: config.uploadHost, token, key };
  });

// 前端上传成功后确认；只记录服务端签发过格式的 key。
// shortcut: 没有向七牛 HEAD/stat 校验对象是否真的存在，伪造确认只会让自己的生成失败。
export const confirmUpload = createServerFn({ method: "POST" })
  .validator((data) => typeInput.extend({ key: uploadKeySchema }).parse(data))
  .handler(async ({ data }) => {
    const voucher = await loadVoucher(data.code, data.type);
    if (!voucher) throw new Error("凭证无效");

    const rows = await database
      .select()
      .from(uploads)
      .where(and(eq(uploads.voucherId, voucher.id), eq(uploads.key, data.key)))
      .limit(1);
    const upload = rows.at(0);
    if (!upload) throw new Error("上传凭证无效，请重新上传");
    if (upload.confirmedAt === null) {
      await database
        .update(uploads)
        .set({ confirmedAt: Date.now() })
        .where(eq(uploads.id, upload.id));
    }
  });
