// 把 wedding 参考图清单里的图片上传到 R2：
// node scripts/seed-references.ts [--remote]
// 不带 --remote 时写入本地开发的 R2（.wrangler/state）；加 --remote 上传线上桶。
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parseArgs } from "node:util";

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MANIFEST = path.join(ROOT, "src/routes/wedding/-internal/services/groups.json");
const BUCKET = "photo-ai-images";
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const { values } = parseArgs({
  options: { remote: { type: "boolean", default: false } },
});

const groups = JSON.parse(await readFile(MANIFEST, "utf8")) as {
  images: string[];
}[];
const keys = [...new Set(groups.flatMap((group) => group.images))];

for (const [index, key] of keys.entries()) {
  const extension = path.extname(key).slice(1).toLowerCase();
  await run("pnpm", [
    "exec",
    "wrangler",
    "r2",
    "object",
    "put",
    `${BUCKET}/${key}`,
    `--file=${path.join(ROOT, key)}`,
    `--content-type=${CONTENT_TYPES[extension] ?? "application/octet-stream"}`,
    values.remote ? "--remote" : "--local",
  ]);
  console.log(`${index + 1}/${keys.length} ${key}`);
}

console.log(`已上传 ${keys.length} 张参考图到${values.remote ? "线上" : "本地"} R2`);
