import { env } from "cloudflare:workers";

// Ark 图片 24 小时后失效；转存到 R2 的 temp_24h/，由桶的生命周期规则自动删除。
const STORED_IMAGE_PREFIX = "temp_24h/";

export function isStoredImage(source: string) {
  return source.startsWith(STORED_IMAGE_PREFIX);
}

export interface StoredImage {
  key: string;
  // Ark 原始地址，24 小时后失效；和 R2 key 一起入库便于追溯
  sourceUrl: string;
}

// 流式转存，不把整张图读进内存；返回 R2 key 和原始地址。
export async function storeImage(sourceUrl: string): Promise<StoredImage> {
  const response = await fetch(sourceUrl);
  if (!response.ok || !response.body) {
    throw new Error(`转存生成图片失败（${response.status}）`);
  }
  const key = `${STORED_IMAGE_PREFIX}${crypto.randomUUID()}.png`;
  await env.BUCKET.put(key, response.body, {
    httpMetadata: { contentType: "image/png" },
  });
  return { key, sourceUrl };
}
