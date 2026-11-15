import { env } from "cloudflare:workers";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionFor(mediaType: string): string {
  return EXT_BY_MIME[mediaType] ?? "png";
}

/**
图片统一通过 /media/<key> 读取，24 小时过期由数据库记录驱动清理。
*/
export function publicImageUrl(key: string): string {
  return `/media/${key}`;
}

export async function putImage(key: string, data: Uint8Array, contentType: string): Promise<void> {
  await env.BUCKET.put(key, data, { httpMetadata: { contentType } });
}

export async function getImage(key: string): Promise<{ data: Uint8Array; contentType: string }> {
  const object = await env.BUCKET.get(key);
  if (!object) throw new Error("图片不存在或已过期");

  return {
    data: new Uint8Array(await object.arrayBuffer()),
    contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
  };
}

export async function deleteImage(key: string): Promise<void> {
  await env.BUCKET.delete(key);
}
