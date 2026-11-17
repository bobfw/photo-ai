export const VOUCHER_PLATFORMS = [
  { value: "xiaohongshu", label: "小红书" },
  { value: "xianyu", label: "闲鱼" },
  { value: "taobao", label: "淘宝" },
  { value: "douyin", label: "抖音" },
] as const;

export type VoucherPlatform = (typeof VOUCHER_PLATFORMS)[number]["value"];

export function platformLabel(platform: string) {
  return VOUCHER_PLATFORMS.find((item) => item.value === platform)?.label ?? platform;
}
