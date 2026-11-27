export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function clampIndex(value: number, length: number) {
  if (value < 0) return 0;
  if (value >= length) return length - 1;
  return value;
}
