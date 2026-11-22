const PLATFORM_LABELS = [
  { value: "xiaohongshu", label: "小红书" },
  { value: "xianyu", label: "闲鱼" },
  { value: "taobao", label: "淘宝" },
  { value: "douyin", label: "抖音" },
] as const;

export function platformLabel(platform: string) {
  return PLATFORM_LABELS.find((item) => item.value === platform)?.label ?? platform;
}
