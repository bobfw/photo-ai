// 姿势图由 scripts/split-poses.ts 从 test-img 的系列拼图切出并去掉编号。
export const POSE_SERIES = [
  {
    key: "jing-dian-hun-sha",
    title: "经典婚纱",
    outfit: "新娘穿白色抹胸大拖尾婚纱、白色头纱，新郎穿黑色三件套西装、白衬衫、黑领结。",
  },
  {
    key: "qing-fa-shi",
    title: "轻法式",
    outfit: "新娘穿缎面轻婚纱、低发髻，新郎穿浅色西装、白衬衫。",
  },
  {
    key: "xi-jia-feng",
    title: "现代喜嫁风",
    outfit: "新娘穿层红色叠荷叶边大裙摆婚纱、蝴蝶结发饰，新郎穿浅色西装、系领带。",
  },
  {
    key: "qi-pao",
    title: "新中式-旗袍",
    outfit: "新娘穿长款新中式旗袍、中式盘发，新郎穿立领中式套装。",
  },
  {
    key: "xiu-he",
    title: "新中式-秀禾",
    outfit: "新娘穿红色秀禾服、中式盘发，新郎穿红色中式马褂长衫。",
  },
  {
    key: "xiu-he-qing-song",
    title: "新中式-秀禾-轻松风",
    outfit: "新娘穿红色秀禾服、中式盘发，新郎穿红色中式马褂长衫，整体更轻松活泼。",
  },
];

export const POSE_COUNT = 20;

export const IMAGE_RATIOS = [
  { value: "2:3", hint: "经典 4×6 冲印比例，更修长" },
  { value: "3:4", hint: "适合小红书/朋友圈竖图，人物更饱满" },
] as const;

export type ImageRatio = (typeof IMAGE_RATIOS)[number]["value"];

export function findPoseSeries(key: string) {
  return POSE_SERIES.find((series) => series.key === key);
}

export function findImageRatio(value: string) {
  return IMAGE_RATIOS.find((ratio) => ratio.value === value);
}

const ASSET_BASE_URL = "https://image.chupian.date";

export function poseImageUrl(series: string, pose: number) {
  return `${ASSET_BASE_URL}/wedding/poses/${series}/${String(pose).padStart(2, "0")}.png`;
}

export function stickerImageUrl(file: string) {
  return `${ASSET_BASE_URL}/wedding/stickers/${file}`;
}
