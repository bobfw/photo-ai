import { env } from "cloudflare:workers";

import { storeImage } from "#services/images";

const ARK_IMAGE_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const ARK_IMAGE_MODEL = "doubao-seedream-5-5-261028";
// const ARK_IMAGE_MODEL = "doubao-seedream-5-0-pro-260628";

export type ImageSize = "1K" | "1.5K" | "2K";

interface ArkImageResponse {
  data?: {
    url?: string;
    error?: { message?: string };
  }[];
  error?: { message?: string };
}

/**
 * 生成透明背景 PNG，转存到 R2 的 temp_24h/ 后返回 R2 key（24 小时后自动删除）。
 * 不依赖 sharp / fs 的静态导入，可直接跑在 Cloudflare Workers。
 */
export async function generatePhoto(
  prompt: string,
  options: {
    // 参考图，按顺序编号为图 1、图 2……：data URL 或 http(s) URL
    references: string[];
    // 分辨率档位，必须由调用方指定；宽高比写在 prompt 里
    size: ImageSize;
  },
): Promise<string> {
  const response = await fetch(ARK_IMAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: ARK_IMAGE_MODEL,
      prompt,
      image: options.references,
      size: options.size,
      background: "transparent",
      output_format: "png",
      response_format: "url",
      watermark: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`图片生成失败（${response.status}）：${await response.text()}`);
  }

  const result = await response.json<ArkImageResponse>();
  const image = result.data?.at(0);
  if (!image?.url) {
    const message = image?.error?.message ?? result.error?.message ?? "模型没有返回图片";
    throw new Error(`图片生成失败：${message}`);
  }

  return storeImage(image.url);
}
