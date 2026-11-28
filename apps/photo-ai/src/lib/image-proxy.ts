// Ark 原图没有 CORS 头，统一经这个代理取；canvas 才能导出
const IMAGE_PROXY_BASE = "https://proxy.yumus.cn";

export function proxyImageUrl(source: string) {
  return `${IMAGE_PROXY_BASE}/${source}`;
}
