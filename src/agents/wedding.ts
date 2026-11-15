import { generatePhotoBytes } from "./generate-photo.ts";
import {
  buildWeddingEditInstruction,
  buildWeddingInstruction,
  type WeddingScene,
} from "./wedding-prompts.ts";

const WEDDING_SIZE = "1536x2048";

interface WeddingImage {
  data: Uint8Array;
  mediaType: string;
}

interface WeddingBaseInput {
  faces: string[];
  scene: WeddingScene;
  model: string;
  apiKey: string;
}

/**
 * 生成一张婚纱照：单人模式用一张面部参考，双人模式用新娘、新郎两张面部参考。
 */
export async function generateWeddingImage(
  input: WeddingBaseInput & { mode: "single" | "couple" },
): Promise<WeddingImage> {
  const { text, references } = buildWeddingInstruction(input);
  return generate(text, references, input.model, input.apiKey);
}

/**
 * 按文字描述修改已生成的婚纱照，同时用原始面部参考保持人物身份。
 */
export async function editWeddingImage(
  input: WeddingBaseInput & { photo: string; instruction: string },
): Promise<WeddingImage> {
  const { text, references } = buildWeddingEditInstruction(input);
  return generate(text, references, input.model, input.apiKey);
}

async function generate(
  text: string,
  references: string[],
  model: string,
  apiKey: string,
): Promise<WeddingImage> {
  const result = await generatePhotoBytes(text, { references, model, apiKey, size: WEDDING_SIZE });
  const image = result.images.at(0);
  if (!image) throw new Error("模型没有返回图片，请重试");

  return { data: image.uint8Array, mediaType: image.mediaType };
}
