import type { PortraitAdjustments } from "@photo-ai/portrait-editor";

import type { TabName } from "./types.ts";

export const PHOTO_TAB_NAMES: readonly TabName[] = ["beauty", "export"];

export const CUTOUT_TAB_NAMES: readonly TabName[] = ["beauty", "background", "export"];

export const TAB_LABELS: Record<TabName, string> = {
  beauty: "美颜",
  background: "背景",
  export: "导出",
};

export const BACKGROUNDS = [
  { label: "奶油白", value: "#f4ede2" },
  { label: "香槟金", value: "#e3cdaa" },
  { label: "雾粉", value: "#ebcfcb" },
  { label: "浅灰", value: "#d9d9d7" },
  { label: "雾霾蓝", value: "#afc2cb" },
  { label: "鼠尾草", value: "#a8b8a2" },
  { label: "中国红", value: "#b4232a" },
  { label: "酒红", value: "#800020" },
  { label: "朱砂", value: "#cc3300" },
  { label: "墨黑", value: "#2a2320" },
  { label: "透明", value: "transparent" },
] as const;

export const RATIOS = [
  { label: "3:4", value: 0.75 },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 0.8 },
  { label: "2:3", value: 2 / 3 },
] as const;

export const DEFAULT_ADJUSTMENTS: PortraitAdjustments = {
  smooth: 0.35,
  whiten: 0.2,
  brightness: 0,
  saturation: 0,
  warmth: 0,
};
