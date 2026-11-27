export interface BodyInfo {
  brideHeight?: number;
  brideWeight?: number;
  groomHeight?: number;
  groomWeight?: number;
}

function describePerson(label: string, height?: number, weight?: number) {
  const parts: string[] = [];
  if (height) parts.push(`身高约 ${height} cm`);
  if (weight) parts.push(`体重约 ${weight} kg`);
  return parts.length === 0 ? "" : `${label}${parts.join("、")}`;
}

function describeBody(body: BodyInfo) {
  return [
    describePerson("新娘", body.brideHeight, body.brideWeight),
    describePerson("新郎", body.groomHeight, body.groomWeight),
  ]
    .filter((part) => part !== "")
    .join("；");
}

function describeHeightRelation(body: BodyInfo) {
  if (!body.brideHeight || !body.groomHeight) return "";
  const difference = body.brideHeight - body.groomHeight;
  if (difference > 0) {
    return `新娘比新郎高约 ${difference} cm，在不违背图 3 姿势的前提下体现这个身高差；站姿时新娘的头顶必须高于新郎，不要因为性别刻板印象把新郎画得更高，也不要照搬图 3 的身高差`;
  }
  if (difference < 0) {
    return `新郎比新娘高约 ${-difference} cm，身高差按这个数值，不要照搬图 3`;
  }
  return "两人身高相同，头顶大致齐平，不要照搬图 3 的身高差";
}

const IDENTITY =
  "面部严格以图 1（新娘）和图 2（新郎）为准：脸型、骨相、五官比例、眉眼形状、鼻型、嘴型和发际线都要像本人，一眼能认出是这两个人，不要生成通用网红脸或换成别人。精修只改皮肤质感、肤色、妆容和光影，不要改变脸型、骨相和五官特征，不要过度瘦脸或缩小头部。皮肤按婚纱摄影高P标准：冷调瓷白、明度高、饱和度低，像干净的奶油肌，透着淡淡的蜜桃粉气色，妆面透亮有柔光；即使背景偏暖也不吃环境色，不发黄、不发灰、不发暗；面部高光明亮、阴影通透。肤色不照搬参考照片的偏黄肤色。配饰只保留参考照片里原有的。新郎发型以图 2 为准，保留原来的短发。两人的面部和皮肤都按同一标准精修，不要只美化新娘。";

// 图 1 是新娘，图 2 是新郎，图 3 是从系列里切出的姿势线稿。
// 姿势线稿只提供姿势和互动；人物和服装按参考照片和系列服装描述生成，输出透明背景。
export function buildWeddingPosePrompt(outfit: string, aspect: string, body: BodyInfo) {
  const measurements = describeBody(body);
  const heightRule =
    describeHeightRelation(body) ||
    (body.brideHeight || body.groomHeight
      ? "按填写的身高调整两人的高矮，不要默认女生更矮，也不要照搬图 3 的身高差"
      : "");
  const proportionLine =
    "腿要显长：提高腰线、拉长腿部比例，拍出显腿长的效果；头身比约 8 头身，不要显矮、短腿或五五分；头部大小保持自然，保证五官清晰、像本人，不要为了显高把头缩得过小。服装贴合身形。";
  const bodyLine = measurements
    ? `${measurements}。${heightRule ? `${heightRule}。` : ""}按真实身材生成，图 3 只提供姿势和动作，不提供身高差和体型关系；${proportionLine}`
    : `两人身材高挑修长，${proportionLine}`;

  return [
    "图 1 是新娘，图 2 是新郎，图 3 是姿势参考线稿。这是双人合影，两人同等重要。",
    IDENTITY,
    `生成一张婚纱摄影风格的两人合影，人物必须是图 1 的新娘和图 2 的新郎本人，不要换成其他人：${outfit}`,
    `画面为 ${aspect}。`,
    "姿势和互动参考图 3，保持图 3 中两人的动作和左右站位；只参考姿势和互动，不要保留线稿风格；身高差和体型关系以文字数据为准，不照搬图 3。",
    bodyLine,
    "如果图 3 中人物是坐在凳子或椅子上的姿势，请同时生成一张与人物、服装和拍摄风格协调的凳子/椅子，人物自然坐在上面；如果图 3 没有坐具，不要添加凳子或椅子。",
    "透明背景（真正的 alpha 通道），画面只包含人物、服装，以及图 3 中人物所坐的凳子/椅子（如有）：不要背景、地面、投影、文字、水印、Logo、边框，也不要用灰白棋盘格或纯色底模拟透明；不要多余的人物、肢体或手指。",
  ].join("\n\n");
}

export function buildWeddingPoseEditPrompt(instruction: string, aspect: string) {
  return [
    "图 1 是当前婚纱照。",
    `只按下面的要求修改：${instruction}。`,
    `输出保持原图的 ${aspect}。`,
    "其余全部保持不变：人物身份、五官、妆容、发型、服装、姿势、构图和透明背景。不要换成完全不同的人，不要新增或减少人物，不要添加背景、文字、水印、Logo、边框；不要保留线稿风格。",
  ].join("\n\n");
}
