import groups from "./groups.json";

export interface ReferenceImage {
  key: string;
  url: string;
}

export interface ReferenceGroup {
  source: string;
  title: string;
  images: ReferenceImage[];
}

export type ReferenceChoice =
  | { kind: "curated"; key: string; url: string }
  | { kind: "custom"; dataUrl: string };

export const REFERENCE_GROUPS: ReferenceGroup[] = groups.map((group) => ({
  source: group.source,
  title: group.title,
  images: group.images.map((key) => ({ key, url: `/media/${key}` })),
}));

export function findReference(key: string): ReferenceImage | undefined {
  return REFERENCE_GROUPS.flatMap((group) => group.images).find((image) => image.key === key);
}
