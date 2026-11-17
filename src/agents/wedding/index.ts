import { generatePhotoBytes } from "../generate-photo.ts";
import { buildWeddingEditInstruction, buildWeddingInstruction } from "./prompts.ts";

const WEDDING_SIZE = "1536x2048";

interface WeddingImage {
  data: Uint8Array;
  mediaType: string;
}

/**
 * 生成一张婚纱照：用新娘、新郎两张面部参考，加上一张场景与造型参考图。
 */
export async function generateWeddingImage(input: {
  faces: string[];
  reference: string;
  model: string;
  apiKey: string;
}): Promise<WeddingImage> {
  const { text, references } = buildWeddingInstruction(input);
  return generate(text, references, input.model, input.apiKey);
}

/**
 * 按文字描述修改已生成的婚纱照。
 */
export async function editWeddingImage(input: {
  photo: string;
  instruction: string;
  model: string;
  apiKey: string;
}): Promise<WeddingImage> {
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
