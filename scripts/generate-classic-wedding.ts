// 以 test-img/经典婚纱.png 为参考图生成一张新图，输出到 test-img/output/经典婚纱.png。
// 先在 PROMPT 里写关键词，再运行：node scripts/generate-classic-wedding.ts
// 加 --dry-run 只打印请求，不调用模型。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// 身高关系：生成女生更高的版本时，改成“新娘比新郎高约半个头，不要画成比新郎矮。”
const HEIGHT_RULE = "新娘只比新郎矮约半个头，不要画成明显矮一截。";
// const HEIGHT_RULE = "新娘比新郎高一点，不要画成比新郎矮。";

const PROMPT = `以图 1 为参考，保持同样的无脸线稿风格、线条粗细和人物造型。这张图用于生图参考，每个姿势的构图都要像真实婚纱摄影：姿态优雅、互动自然、构图稳定、人物比例舒展；每个格子顶部必须留出约半个头高的空白，头顶不要贴边，底部必须贴边、不留空。输出一张整体宽高比 3:4 的姿势参考图，按 5 列 × 5 行排列，共 25 个姿势，每个子网格的宽高比同样是 3:4；前 20 个姿势、互动和相对站位沿用图 1，不要改动动作，但每个格子按统一的婚纱照构图重新排布；再补充 5 个风格统一的新姿势。${HEIGHT_RULE}每个格子只画人物线稿，白底，人物水平居中、比例一致；顶部必须留出约半个头高的空白，头顶和头发绝对不要贴边或被裁切，即使图 1 对应图的顶部较紧也要重新留白；底部必须不留空：脚部或裙摆直接抵住格子下边缘，不要在下边缘留白，可以裁掉脚部或裙摆；手部不要贴边，姿势之间互不重叠；不要网格线、编号、文字、背景、阴影或多余装饰；头部和上半身必须完整。`;

function fail(message: string): never {
  throw new Error(message);
}

if (!PROMPT.trim()) fail("请先在 PROMPT 里写关键词");

const REFERENCE = path.join(ROOT, "test-img/新中式-旗袍.png");
// 生成另一版时改一下文件名，避免覆盖
const OUTPUT = path.join(ROOT, "test-img/output/新中式-旗袍.png");
const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL = "doubao-seedream-5-5-261028";
const SIZE = "1K"; // 可改成 "1K" / "1.5K"
const dryRun = process.argv.includes("--dry-run");

console.log(`参考图：${path.relative(ROOT, REFERENCE)}`);
console.log(`输出：${path.relative(ROOT, OUTPUT)}｜尺寸：${SIZE}`);
console.log(`--- prompt ---\n${PROMPT}\n---`);

if (dryRun) {
  console.log("dry-run：未调用 Ark。");
} else {
  if (!existsSync(REFERENCE)) fail(`参考图不存在：${path.relative(ROOT, REFERENCE)}`);

  const variables = readFileSync(path.join(ROOT, ".dev.vars"), "utf8");
  const key = /^ARK_API_KEY=(.*)$/m
    .exec(variables)?.[1]
    ?.trim()
    .replaceAll(/^["']|["']$/g, "");
  if (!key) fail("未找到 ARK_API_KEY（.dev.vars）");

  const reference = `data:image/png;base64,${readFileSync(REFERENCE).toString("base64")}`;
  const response = await fetch(ARK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      prompt: PROMPT,
      image: [reference],
      size: SIZE,
      output_format: "png",
      response_format: "url",
      watermark: false,
    }),
  });

  const text = await response.text();
  if (!response.ok) fail(`生成失败（HTTP ${response.status}）：${text}`);

  const result = JSON.parse(text) as {
    data?: { url?: string }[];
    error?: { message?: string };
  };
  const imageUrl = result.data?.[0]?.url;
  if (!imageUrl) fail(`没有返回图片：${result.error?.message ?? text.slice(0, 500)}`);

  const download = await fetch(imageUrl);
  if (!download.ok) fail(`下载图片失败（HTTP ${download.status}）`);

  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, Buffer.from(await download.arrayBuffer()));
  console.log(`已保存：${path.relative(ROOT, OUTPUT)}`);
}
