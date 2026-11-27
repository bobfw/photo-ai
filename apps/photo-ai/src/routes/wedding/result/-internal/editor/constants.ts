import { stickerImageUrl } from "../../../-internal/services/poses.ts";

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

// Ark 原图没有 CORS 头，统一经这个代理取；canvas 才能导出，也不再读 R2
const IMAGE_PROXY_BASE = "https://proxy.yumus.cn";

export function proxyImageUrl(source: string) {
  return `${IMAGE_PROXY_BASE}/${source}`;
}
