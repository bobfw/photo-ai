// 姿势参考测试：node scripts/test-pose.ts [--dry-run]
// 图 3 的线稿只提供姿势；人物和婚纱礼服抠像式输出，透明背景。
// 每次只生成 1 张，1K，不重试。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const ARK_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL = "doubao-seedream-5-5-261028";
const SIZE = "1024x1536";

function fail(message: string): never {
  throw new Error(message);
}

const dryRun = process.argv.includes("--dry-run");

const portraits = [
  { label: "新娘", file: "test-img/woman.png", height: 168, weight: 50 },
  { label: "新郎", file: "test-img/man.jpg", height: 180, weight: 70 },
];
const poseFile = path.join(ROOT, "test-img/zaoxing1.png");
for (const file of [...portraits.map((portrait) => path.join(ROOT, portrait.file)), poseFile]) {
  if (!existsSync(file)) fail(`缺少图片：${file}`);
}

const identity = `参考图 1（新娘）、图 2（新郎）的面部特征，按婚纱摄影高P精修标准美化：皮肤冷调瓷白、明度高、饱和度低，像干净的奶油肌，透着淡淡的蜜桃粉气色，妆面透亮有柔光；即使背景偏暖也不吃环境色，不发黄、不发灰、不发暗；面部高光明亮、阴影通透；五官更精致，可以磨皮、适度瘦脸、优化五官比例和妆容；精修后保持本人样貌，一眼能认出。肤色不照搬参考照片的偏黄肤色。配饰只保留参考照片里原有的。新郎发型以图 2 为准，保留原来的短发。`;

const body = `${portraits
  .map((portrait) => `${portrait.label} ${portrait.height} cm、${portrait.weight} kg`)
  .join(
    "，",
  )}；两人身材高挑修长、腿长、头部比例偏小，头身比约 7.5–8 头身，不要显矮或头大，婚纱礼服贴合身形。`;

const pose =
  "姿势严格参考图 3，保持图 3 的姿势和互动；只参考姿势，不要保留线稿风格。七分身构图，人物占满画面高度。";

const prompt = [
  "图 1 是新娘，图 2 是新郎，图 3 是姿势参考线稿。",
  identity,
  "生成一张婚纱摄影风格的两人合影：新娘穿白色抹胸大拖尾婚纱、白色头纱、蕾丝手套，新郎穿黑色三件套西装、白衬衫、黑领结。",
  pose,
  body,
  "透明背景（真正的 alpha 通道），画面只有人物和婚纱礼服：不要背景、地面、投影、文字、水印、Logo、边框，也不要用灰白棋盘格或纯色底模拟透明；不要多余的人物、肢体或手指。",
].join("\n\n");

console.log(
  `姿势：${path.basename(poseFile)}｜肖像：${portraits.map((portrait) => portrait.label).join(" + ")}｜透明背景｜尺寸：${SIZE}`,
);
console.log(`--- prompt ---\n${prompt}\n---`);

if (dryRun) {
  console.log("dry-run：未调用 Ark。");
} else {
  const variables = readFileSync(path.join(ROOT, ".dev.vars"), "utf8");
  const key = /^ARK_API_KEY=(.*)$/m
    .exec(variables)?.[1]
    ?.trim()
    .replaceAll(/^["']|["']$/g, "");
  if (!key) fail("未找到 ARK_API_KEY（.dev.vars）");

  const references = [...portraits.map((portrait) => path.join(ROOT, portrait.file)), poseFile].map(
    (file) => {
      const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
      return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
    },
  );

  console.log("本次只生成 1 张，1K；不重试。");
  const response = await fetch(ARK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      image: references,
      size: SIZE,
      background: "transparent",
      output_format: "png",
      response_format: "url",
      watermark: false,
    }),
  });

  const text = await response.text();
  if (!response.ok) fail(`生成失败（HTTP ${response.status}）：${text}`);

  const result = JSON.parse(text) as {
    data?: { url?: string; size?: string }[];
    error?: { message?: string };
  };
  const generated = result.data?.[0];
  if (!generated?.url) fail(`没有返回图片：${result.error?.message ?? text.slice(0, 500)}`);

  const outputDirectory = path.join(ROOT, "test-img/output");
  mkdirSync(outputDirectory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "").replace(/\..+/, "");
  const outputPath = path.join(outputDirectory, `test-transparent-${stamp}.png`);

  const download = await fetch(generated.url);
  if (!download.ok) fail(`下载图片失败（HTTP ${download.status}）`);
  writeFileSync(outputPath, Buffer.from(await download.arrayBuffer()));
  console.log(`已生成：${outputPath}`);
}
