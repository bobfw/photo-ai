import { generatePhoto, type ImageSize } from "../generate-photo.ts";
import { buildWeddingPoseEditPrompt, buildWeddingPosePrompt } from "./prompts.ts";

/**
 * 按姿势线稿生成一张透明背景的婚纱照：图 1 新娘、图 2 新郎、图 3 姿势。
 * 返回图片 URL（24 小时内有效）。
 */
export async function generateWeddingPose(
  faces: [string, string],
  pose: string,
  outfit: string,
  size: ImageSize,
  aspect: string,
  request = "",
): Promise<string> {
  return generatePhoto(buildWeddingPosePrompt(outfit, aspect, request), {
    references: [faces[0], faces[1], pose],
    size,
  });
}

/**
 * 按提示词微调当前婚纱照，保持人物、姿势和透明背景。
 * 返回新图片 URL（24 小时内有效）。
 */
export async function editWeddingPose(
  photo: string,
  instruction: string,
  size: ImageSize,
  aspect: string,
): Promise<string> {
  return generatePhoto(buildWeddingPoseEditPrompt(instruction, aspect), {
    references: [photo],
    size,
  });
}
