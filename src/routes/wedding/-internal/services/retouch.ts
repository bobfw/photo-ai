export const RETOUCH_LEVELS = [
  { value: "natural", label: "自然" },
  { value: "refined", label: "精致" },
  { value: "retouched", label: "精修" },
] as const;

export type RetouchLevel = (typeof RETOUCH_LEVELS)[number]["value"];

export const DEFAULT_RETOUCH: RetouchLevel = "refined";

export function retouchLabel(level: RetouchLevel) {
  return RETOUCH_LEVELS.find((item) => item.value === level)?.label ?? level;
}
