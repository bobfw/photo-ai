import { createOpenRouter, openrouter } from "@openrouter/ai-sdk-provider";
import { generateImage } from "ai";

const FLUX_3_IMAGE = "black-forest-labs/flux-3-image";

// FLUX 3 只接受这些分辨率档位和宽高比
const RESOLUTION_TIERS = [
  [3840, "4K"],
  [2048, "2K"],
  [1536, "1.5K"],
  [1024, "1K"],
  [0, "768"],
] as const;

const ASPECT_RATIOS = [
  [1, 1],
  [2, 3],
  [3, 2],
  [3, 4],
  [4, 3],
  [4, 5],
  [5, 4],
  [9, 16],
  [16, 9],
  [21, 9],
] as const;

/**
 * FLUX 3 不接受像素尺寸，改为分辨率档位 + 最接近的宽高比
 */
export function fluxImageOptions(size: `${number}x${number}`) {
  const [width, height] = size.split("x").map(Number);
  const longEdge = Math.max(width, height);
  const resolution = RESOLUTION_TIERS.find(([min]) => longEdge >= min)?.[1] ?? "768";

  const target = width / height;
  let nearest: (typeof ASPECT_RATIOS)[number] = ASPECT_RATIOS[0];
  for (const ratio of ASPECT_RATIOS) {
    if (Math.abs(ratio[0] / ratio[1] - target) < Math.abs(nearest[0] / nearest[1] - target)) {
      nearest = ratio;
    }
  }

  return {
    aspectRatio: `${nearest[0]}:${nearest[1]}` as `${number}:${number}`,
    providerOptions: { openrouter: { resolution } },
  };
}

export type GenerateOptions = Omit<
  Parameters<typeof generateImage>[0],
  "model" | "prompt" | "size"
> & {
  /**
   * 参考图，按顺序传给模型：data URL 或 http(s) URL（本地路径只在 Node 下可用）
   */
  references: string[];
  /**
   * OpenRouter 图像模型 ID
   */
  model: string;
  /**
   * OpenRouter API key；不传时使用默认 provider 读取 process.env
   */
  apiKey?: string;
  /**
   * 生成尺寸，必须由调用方指定
   */
  size: `${number}x${number}`;
};

/**
 * 只生成图片，不写本地文件；由调用方（如对外服务）自己上传对象存储。
 * 不依赖 sharp / fs 的静态导入，可直接跑在 Cloudflare Workers。
 */
export async function generatePhotoBytes(prompt: string, options: GenerateOptions) {
  const { references, model, size, apiKey, ...imageOptions } = options;
  const images = await Promise.all(references.map((reference) => loadReference(reference)));
  const provider = apiKey ? createOpenRouter({ apiKey }) : openrouter;

  return generateImage({
    model: provider.imageModel(model),
    prompt: { images, text: prompt },
    ...(model === FLUX_3_IMAGE ? fluxImageOptions(size) : { size }),
    ...imageOptions,
  });
}

async function loadReference(reference: string) {
  // ponytail: data URL 交给 provider；http(s) 自己下载成字节，避免服务器返回的 image/jpg 等非标准 content-type 被原样转发
  if (/^data:/i.test(reference)) return reference;
  if (/^https?:/i.test(reference)) {
    const response = await fetch(reference);
    if (!response.ok) throw new Error(`下载参考图失败（${response.status}）：${reference}`);
    return response.bytes();
  }

  throw new Error(`不支持的参考图地址：${reference.slice(0, 64)}`);
}
