import { generatePhoto } from "../generate-photo.ts";
import { buildWeddingEditInstruction, buildWeddingInstruction } from "./prompts.ts";

const WEDDING_SIZE = "1536x2048";

/**
 * 生成一张婚纱照：用新娘、新郎两张面部参考，加上一张场景与造型参考图。
 * 返回图片 URL（24 小时内有效）。
 */
export async function generateWeddingImage(input: {
  faces: string[];
  reference: string;
}): Promise<string> {
  const { text, references } = buildWeddingInstruction(input);
  return generate(text, references);
}

/**
 * 按文字描述修改已生成的婚纱照。
 * 返回新图片 URL（24 小时内有效）。
 */
export async function editWeddingImage(input: {
  photo: string;
  instruction: string;
}): Promise<string> {
  const { text, references } = buildWeddingEditInstruction(input);
  return generate(text, references);
}

async function generate(text: string, references: string[]) {
  return generatePhoto(text, { references, size: WEDDING_SIZE });
}
