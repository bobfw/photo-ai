import { stickerImageUrl } from "../../../-internal/services/poses.ts";

// 婚纱摄影棚常用的背景纸颜色：红色系 + 中性/流行色
export const BACKGROUNDS = [
  { value: "transparent", label: "透明" },
  { value: "#B4232A", label: "中国红" },
  { value: "#C0392B", label: "朱砂红" },
  { value: "#CC3300", label: "宫墙红" },
  { value: "#800020", label: "酒红" },
  { value: "#BC121A", label: "石榴红" },
  { value: "#E02A1A", label: "夕阳红" },
  { value: "#F4EDE2", label: "奶油白" },
  { value: "#E3CDAA", label: "香槟金" },
  { value: "#EBCFCB", label: "雾粉" },
  { value: "#AFC2CB", label: "雾霾蓝" },
  { value: "#D9D9D7", label: "浅灰" },
] as const;

export const STICKERS = [
  {
    key: "xi-jia-landscape",
    label: "喜嫁 · 横版",
    src: stickerImageUrl("xi-jia-landscape.png"),
    width: 0.36,
  },
  {
    key: "xi-jia-vertical",
    label: "喜嫁 · 竖版",
    src: stickerImageUrl("xi-jia-vertical.png"),
    width: 0.18,
  },
  {
    key: "wu-jia-you-xi",
    label: "吾家有喜",
    src: stickerImageUrl("wu-jia-you-xi.png"),
    width: 0.34,
  },
] as const;

export type StickerPreset = (typeof STICKERS)[number];

export const PHOTO_MIN_SCALE = 0.5;
export const PHOTO_MAX_SCALE = 3;
export const STICKER_MIN_SIZE = 0.05;
export const STICKER_MAX_SIZE = 0.55;
export const STUDIO_LIGHT_PREVIEW_WIDTH = 576;

// Ark 原图没有 CORS 头，统一经这个代理取；canvas 才能导出，也不再读 R2
const IMAGE_PROXY_BASE = "https://proxy.yumus.cn";

export function proxyImageUrl(source: string) {
  return `${IMAGE_PROXY_BASE}/${source}`;
}
