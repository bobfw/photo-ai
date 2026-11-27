import { generatePhoto, type ImageSize } from "../generate-photo.ts";
import { buildPortraitEditPrompt, buildPortraitPrompt, type PortraitLook } from "./prompts.ts";

/**
 * 按 1–3 张同一人的照片生成透明背景的职业形象照，服装、姿势和构图由选项决定。
 * 返回 Ark 原始地址（24 小时后失效）。
 */
export async function generatePortrait(
  faces: string[],
  look: PortraitLook,
  size: ImageSize,
  aspect: string,
  request = "",
): Promise<string> {
  return generatePhoto(buildPortraitPrompt(faces.length, look, aspect, request), {
    references: faces,
    size,
  });
}

/**
 * 按提示词微调当前形象照，保持人物、姿势和透明背景。
 * 返回新图片的 Ark 原始地址（24 小时后失效）。
 */
export async function editPortrait(
  photo: string,
  instruction: string,
  size: ImageSize,
  aspect: string,
): Promise<string> {
  return generatePhoto(buildPortraitEditPrompt(instruction, aspect), {
    references: [photo],
    size,
  });
}
