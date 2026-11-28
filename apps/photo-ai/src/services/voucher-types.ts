import { z } from "zod";

export const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
// Ark 一次修改最长约 2 分钟；锁超过 3 分钟视为请求已中断，允许重试。
export const EDIT_LOCK_MS = 3 * 60 * 1000;

export const codeSchema = z.string().min(1, "凭证格式不正确").max(64, "凭证格式不正确");

export const voucherTypeSchema = z.enum(["wedding", "portrait"]);
export type VoucherType = z.infer<typeof voucherTypeSchema>;

// 七牛对象 key；前端只上传并把 key 交给生成接口，图片预览留在本地。
export const uploadKeySchema = z
  .string()
  .regex(
    /^temp_24h\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/,
    "照片地址无效，请重新上传",
  );

export const clientTokenSchema = z.string().min(1, "缺少请求标识").max(64, "请求标识不正确");

export interface ImageVersion {
  url: string;
  // Ark 原始地址；老数据没有
  sourceUrl?: string;
  createdAt: number;
}

export interface PublicImage {
  id: number;
  // 当前版本地址：Ark 原图；前端经 proxy.yumus.cn 展示和合成
  url: string;
  // Ark 原始地址，老数据没有
  sourceUrl?: string;
  versions: ImageVersion[];
  series: string;
  pose: number;
  ratio: string;
  remainingEdits: number;
  createdAt: number;
  expiresAt: number;
}
