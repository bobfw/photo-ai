import { and, eq, gt, inArray, isNotNull } from "drizzle-orm";

import { database } from "./database.ts";
import { qiniuConfig, signDownloadUrl } from "./qiniu.ts";
import { uploads } from "./schema.ts";
import { IMAGE_TTL_MS } from "./voucher-types.ts";

// 验证 key 是本凭证上传的、未过期的七牛对象，再签发 30 分钟的下载 URL 给 MediaKit。
export async function signUploadUrls(voucherId: number, keys: string[]) {
  const uniqueKeys = [...new Set(keys)];
  const cutoff = Date.now() - IMAGE_TTL_MS;
  const rows = await database
    .select({ key: uploads.key })
    .from(uploads)
    .where(
      and(
        eq(uploads.voucherId, voucherId),
        inArray(uploads.key, uniqueKeys),
        isNotNull(uploads.confirmedAt),
        gt(uploads.createdAt, cutoff),
      ),
    );
  const found = new Set(rows.map((row) => row.key));
  if (uniqueKeys.some((key) => !found.has(key))) throw new Error("照片已过期，请重新上传");

  const config = qiniuConfig();
  return Promise.all(keys.map((key) => signDownloadUrl(config, config.publicBase, key)));
}
