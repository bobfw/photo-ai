export interface BuiltWeddingInstruction {
  text: string;
  references: string[];
}

export interface BodySize {
  height?: number;
  weight?: number;
}

export type RetouchLevel = "natural" | "refined" | "retouched";

const RETOUCH_SECTIONS: Record<RetouchLevel, string> = {
  natural: "自然修图：保留皮肤真实质感和毛孔，只去掉明显瑕疵，不磨皮、不美白、不改变脸型和五官。",
  refined: "精致修图：适度磨皮，保留皮肤质感，肤色均匀提亮，可轻微瘦脸，五官保持本人特征。",
  retouched: "精修：皮肤干净细腻，五官和脸型更精致，但仍能一眼认出本人。",
};

const PHOTO_STYLE =
  "真实相机拍摄的婚纱摄影作品，人物与场景的光线自然融合，皮肤和婚纱质感真实。画面不要文字、水印、Logo、边框，不要多余的人物、肢体或手指。";

function bodySection(label: string, bodySize: BodySize) {
  const facts = [
    bodySize.height === undefined ? undefined : `身高 ${bodySize.height} cm`,
    bodySize.weight === undefined ? undefined : `体重 ${bodySize.weight} kg`,
  ].filter((fact) => fact !== undefined);
  if (facts.length === 0) return "";

  return `${label}${facts.join("、")}，身材按这个数据调整，服装自然贴合，脸型和五官保持不变。`;
}

export function buildWeddingInstruction(input: {
  faces: string[];
  reference: string;
  bodySizes: BodySize[];
  retouch: RetouchLevel;
}): BuiltWeddingInstruction {
  const { faces, reference, bodySizes, retouch } = input;

  if (faces.length !== 2) throw new Error("双人模式需要两张人物照片");
  if (bodySizes.length !== 2) throw new Error("双人模式需要两个人的身高体重");

  return {
    references: [...faces, reference],
    text: [
      "以图 3 为底图生成婚纱照，把新娘替换为图 1 中的人，新郎替换为图 2 中的人，两人都面带自然的微笑，看向镜头。面部严格参考对应照片，保留本人原有的脸型、五官特征和面部比例，不要改变或重新塑造面部特征。",
      "图 3 的服装、发型、姿势、构图、背景和光线均按原图还原，灰色人体模型仅为去除原人物身份特征的处理，生成时恢复真实的人体、肤色及头发。",
      "图 3 有几个人就生成几个人，人物位置与对应身份保持一致，不要对调或新增人物",
      bodySection("新娘", bodySizes[0]),
      bodySection("新郎", bodySizes[1]),
      RETOUCH_SECTIONS[retouch],
      PHOTO_STYLE,
    ]
      .filter((section) => section !== "")
      .join("\n\n"),
  };
}

export function buildWeddingEditInstruction(input: {
  photo: string;
  instruction: string;
  retouch: RetouchLevel;
}): BuiltWeddingInstruction {
  const { photo, instruction, retouch } = input;

  return {
    references: [photo],
    text: [
      "图 1 是当前照片。",
      `在图 1 中，${instruction}。`,
      "只改这一处，其余全部保持不变：人物身份、五官、妆容、发型、服装、场景、光线、构图、姿势和表情。修改后仍是同一个人，不换脸。",
      RETOUCH_SECTIONS[retouch],
      PHOTO_STYLE,
    ].join("\n\n"),
  };
}
