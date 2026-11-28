import { submitPhotoTask, type ImageSize } from "../generate-photo.ts";
import { buildPortraitEditPrompt, buildPortraitPrompt, type PortraitLook } from "./prompts.ts";

/**
 * 提交按 1–3 张同一人的照片生成透明背景职业形象照的异步任务，服装、姿势和构图由选项决定。
 * 返回 MediaKit task_id；结果 URL 24 小时后失效。
 */
export async function submitPortrait(
  faces: string[],
  look: PortraitLook,
  size: ImageSize,
  aspect: string,
  request: string,
  clientToken: string,
): Promise<string> {
  return submitPhotoTask(
    buildPortraitPrompt(faces.length, look, aspect, request),
    { references: faces, size },
    clientToken,
  );
}

/**
 * 提交按提示词微调当前形象照的异步任务，保持人物、姿势和透明背景。
 * 返回 MediaKit task_id；结果 URL 24 小时后失效。
 */
export async function submitPortraitEdit(
  photo: string,
  instruction: string,
  size: ImageSize,
  aspect: string,
  clientToken: string,
): Promise<string> {
  return submitPhotoTask(
    buildPortraitEditPrompt(instruction, aspect),
    { references: [photo], size },
    clientToken,
  );
}
