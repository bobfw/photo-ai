import { z } from "zod";

export const IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
// Ark 一次修改最长约 2 分钟；锁超过 3 分钟视为请求已中断，允许重试。
export const EDIT_LOCK_MS = 3 * 60 * 1000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const codeSchema = z.string().min(1, "凭证格式不正确").max(64, "凭证格式不正确");

export const imageDataUrlSchema = z
  .string()
  .regex(/^data:image\/(?:jpeg|jpg|png|webp);base64,/, "照片格式不支持，请上传 JPG、PNG 或 WebP")
  .max(MAX_IMAGE_BYTES * 1.4, "照片太大了，请压缩后重试");

export interface ImageVersion {
  url: string;
  // Ark 原始地址；老数据没有
  sourceUrl?: string;
  createdAt: number;
}

export interface PublicImage {
  id: number;
  // 当前版本地址：新数据是 Ark 原图，老数据可能是 R2 key；前端经 proxy.yumus.cn 展示和合成
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
