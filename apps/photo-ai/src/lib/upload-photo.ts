import { confirmUpload, createUploadTicket } from "#services/upload-tickets";
import type { VoucherType } from "#services/voucher-types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// 前端只保留本地预览，生成时传七牛 key；下载地址在服务端按需签发。
export interface PhotoValue {
  key: string;
  previewUrl: string;
}

// 后端只签发上传凭证，文件由浏览器直传七牛；上传成功后再通知后端记录。
export async function uploadPhoto(code: string, type: VoucherType, file: Blob) {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("照片太大了，请压缩后重试");

  const ticket = await createUploadTicket({ data: { code, type } });
  const body = new FormData();
  body.append("token", ticket.token);
  body.append("key", ticket.key);
  body.append("file", file, "photo.png");

  let response: Response;
  try {
    response = await fetch(ticket.uploadHost, { method: "POST", body });
  } catch {
    throw new Error("照片上传失败，请检查网络后重试");
  }
  if (!response.ok) throw new Error(`照片上传失败（${response.status}），请重试`);

  await confirmUpload({ data: { code, type, key: ticket.key } });
  return ticket.key;
}
