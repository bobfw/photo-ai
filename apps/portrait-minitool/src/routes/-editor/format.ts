export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatSigned(value: number) {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}
