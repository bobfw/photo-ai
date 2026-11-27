// 把本地 D1 历史记录里的旧图片 URL（Ark / OSS，24 小时后失效）转存到本地 R2 的
// temp_24h/，并改写 image_url 和 versions，让新代码读到 R2 key。
// 已经没有权限的 URL 保留原样并打印出来，不做删除。
// 用法：node scripts/fix-local-images.ts
import { randomUUID } from "node:crypto";

import { getPlatformProxy } from "wrangler";

const PREFIX = "temp_24h/";

interface ImageVersion {
  url: string;
  createdAt: number;
}

const { env, dispose } = await getPlatformProxy<Env>();

// 同一条 URL 在 image_url 和 versions 里可能重复出现，只转存一次。
const migrated = new Map<string, string>();
const skipped: string[] = [];

async function storeOrKeep(source: string): Promise<string> {
  if (source.startsWith(PREFIX)) return source;
  const cached = migrated.get(source);
  if (cached) return cached;

  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const key = `${PREFIX}${randomUUID()}.png`;
    await env.BUCKET.put(key, await response.arrayBuffer(), {
      httpMetadata: { contentType: "image/png" },
    });
    migrated.set(source, key);
    return key;
  } catch (error) {
    skipped.push(source);
    console.log(`跳过（URL 已失效，保留原值）：${source}（${String(error)}）`);
    return source;
  }
}

const { results: rows } = await env.DB.prepare(
  "SELECT id, image_url, versions FROM generated_images ORDER BY id",
).all<{ id: number; image_url: string; versions: string }>();

for (const row of rows) {
  const versions = JSON.parse(row.versions) as ImageVersion[];
  const imageUrl = await storeOrKeep(row.image_url);
  const nextVersions: ImageVersion[] = [];
  for (const version of versions) {
    nextVersions.push({ ...version, url: await storeOrKeep(version.url) });
  }

  const nextVersionsJson = JSON.stringify(nextVersions);
  if (imageUrl === row.image_url && nextVersionsJson === row.versions) continue;

  await env.DB.prepare("UPDATE generated_images SET image_url = ?, versions = ? WHERE id = ?")
    .bind(imageUrl, nextVersionsJson, row.id)
    .run();
  console.log(`#${row.id} 已更新：${imageUrl}`);
}

console.log(`完成：转存 ${migrated.size} 张，跳过 ${skipped.length} 个失效 URL。`);
await dispose();
