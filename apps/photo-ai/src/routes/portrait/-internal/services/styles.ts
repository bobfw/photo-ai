import { portraitLooks } from "#agents/portrait/prompts";

export function findPortraitStyle(key: string) {
  return portraitLooks.find((style) => style.key === key);
}

export const PORTRAIT_POSES = [
  {
    key: "front",
    title: "正面自然",
    description: "正对镜头，双肩放松，适合正式简历",
    prompt: "身体正对镜头，双肩平齐放松，双臂自然下垂",
  },
  {
    key: "angle",
    title: "微侧身",
    description: "身体微侧，脸部转向镜头，更有立体感",
    prompt: "身体微侧约 30°，头部转向镜头，一侧肩膀靠近镜头",
  },
  {
    key: "arms-crossed",
    title: "抱臂",
    description: "双臂交叉，自信干练，适合管理岗",
    prompt: "双臂自然交叉于胸前，肩背挺直，自信专业",
  },
] as const;

export function findPortraitPose(key: string) {
  return PORTRAIT_POSES.find((pose) => pose.key === key);
}

export const PORTRAIT_COMPOSITIONS = [
  {
    key: "half",
    title: "半身",
    description: "腰部以上，标准形象照",
    prompt: "半身构图，腰部以上，人物在画面中完整舒展",
  },
  {
    key: "bust",
    title: "胸像",
    description: "胸部以上，适合头像、领英",
    prompt: "胸像构图，胸部以上，肩膀自然入画",
  },
  {
    key: "three-quarter",
    title: "七分身",
    description: "膝盖以上，更完整地展示身形与服装",
    prompt: "七分身构图，膝盖以上，人物完整呈现",
  },
] as const;

export function findPortraitComposition(key: string) {
  return PORTRAIT_COMPOSITIONS.find((composition) => composition.key === key);
}

export const PORTRAIT_EDITOR_RATIOS = [
  { label: "3:4", value: 3 / 4, hint: "形象照、简历常用" },
  { label: "1:1", value: 1, hint: "头像、社交平台" },
] as const;
