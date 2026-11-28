import { submitPhotoTask, type ImageSize } from "../generate-photo.ts";
import { buildWeddingPoseEditPrompt, buildWeddingPosePrompt } from "./prompts.ts";

/**
 * 提交按姿势线稿生成透明背景婚纱照的异步任务：图 1 新娘、图 2 新郎、图 3 姿势。
 * 返回 MediaKit task_id；结果 URL 24 小时后失效。
 */
export async function submitWeddingPose(
  faces: [string, string],
  pose: string,
  outfit: string,
  size: ImageSize,
  aspect: string,
  request: string,
  clientToken: string,
): Promise<string> {
  return submitPhotoTask(
    buildWeddingPosePrompt(outfit, aspect, request),
    { references: [faces[0], faces[1], pose], size },
    clientToken,
  );
}

/**
 * 提交按提示词微调当前婚纱照的异步任务，保持人物、姿势和透明背景。
 * 返回 MediaKit task_id；结果 URL 24 小时后失效。
 */
export async function submitWeddingEdit(
  photo: string,
  instruction: string,
  size: ImageSize,
  aspect: string,
  clientToken: string,
): Promise<string> {
  return submitPhotoTask(
    buildWeddingPoseEditPrompt(instruction, aspect),
    { references: [photo], size },
    clientToken,
  );
}
