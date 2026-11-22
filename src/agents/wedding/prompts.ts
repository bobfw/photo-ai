/**
 * 婚纱/礼服姿势提示词。
 * 参考图顺序：图 1 新娘、图 2 新郎、图 3 姿势线稿。
 * 按 Seedream 提示词指南：编号指代参考图，两段式——先写保留哪些参考元素，再写生成画面；
 * 编辑指令指明对象，并显式写「保持……不变」。中文提示词控制在 300 字左右。
 * 优先级：人物身份 > 姿势与互动 > 人体比例 > 服装 > 构图与背景。
 * 该接口没有独立 negative_prompt 字段，禁止项直接写在正文里。
 */

const KEEP_REFERENCES =
  "图1（女生）、图2（男生）保留面部身份、脸型、骨相和五官比例，像本人，不换脸、不网红脸；图3仅保留姿势、动作、互动和左右站位，不保留它的头身比、腿长和人物高度。";

export function buildWeddingPosePrompt(outfit: string, aspect: string, request = ""): string {
  const requestLine =
    request.trim() === ""
      ? []
      : [`用户补充要求：${request.trim()}（与前面的要求冲突时，以前面的要求为准）`];

  return [
    KEEP_REFERENCES,
    `生成真实的双人婚纱礼服写真：皮肤冷白透亮、细腻真实，妆容自然，光影柔和；${outfit}`,
    "两人均为高挑修长的写真模特体态：约7.5–8头身，腿长（胯到脚底）约占身高一半，腰线偏高，身体纵向舒展，头部大小自然；避免矮胖、短腿、五五分、躯干压缩、横向膨胀，不要照搬线稿的矮比例。礼服自然垂坠，避免裙摆横向扩张。",
    ...requestLine,
    "人物完整呈现，构图舒展，头顶适当留白，脚部不裁切；图3有坐具才生成坐具。",
    `画面比例 ${aspect}；只保留人物、服装及姿势所需坐具；不要背景、地面、投影、文字、水印、Logo、边框。`,
  ].join("\n");
}

export function buildWeddingPoseEditPrompt(instruction: string, aspect: string): string {
  return [
    "参考图1是当前成片。",
    `只修改：${instruction}。`,
    "保持人物身份、脸型、骨相、五官、发型、服装、姿势、构图和画面风格不变；不换人、不增减人物。",
    `输出 ${aspect} 的婚纱礼服写真照片；不要添加背景、文字、水印、Logo 或边框。`,
  ].join("\n");
}
