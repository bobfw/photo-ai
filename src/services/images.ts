// 历史数据把生成图转存在 R2 的 temp_24h/，由桶的生命周期规则 24 小时后删除；新图直接使用 Ark 地址。
const STORED_IMAGE_PREFIX = "temp_24h/";

export function isStoredImage(source: string) {
  return source.startsWith(STORED_IMAGE_PREFIX);
}
