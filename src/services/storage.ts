import { env } from "cloudflare:workers";

// 读取 R2 里存的参考图
export async function getImage(key: string): Promise<{ data: Uint8Array; contentType: string }> {
  const object = await env.BUCKET.get(key);
  if (!object) throw new Error("图片不存在或已过期");

  return {
    data: new Uint8Array(await object.arrayBuffer()),
    contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
  };
}
