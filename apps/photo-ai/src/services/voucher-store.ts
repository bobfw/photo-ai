import { getRequest } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { and, eq, gt } from "drizzle-orm";

import { database } from "./database.ts";
import { isStoredImage } from "./images.ts";
import { generatedImages, generationRecords, vouchers } from "./schema.ts";
import { IMAGE_TTL_MS, type ImageVersion, type PublicImage } from "./voucher-types.ts";

export async function loadVoucher(code: string, type: string) {
  const rows = await database.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  const voucher = rows.at(0);
  return voucher?.type === type ? voucher : undefined;
}

export async function loadAnyVoucher(code: string) {
  const rows = await database.select().from(vouchers).where(eq(vouchers.code, code)).limit(1);
  return rows.at(0);
}

export function assertTermsAccepted(voucher: typeof vouchers.$inferSelect) {
  if (typeof voucher.termsAcceptedAt !== "number") throw new Error("请先同意用户协议");
}

export function requestMetadata() {
  const request = getRequest();
  return {
    ip:
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ??
      "",
    country: request.headers.get("cf-ipcountry") ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

export async function recordGeneration(
  voucherId: number,
  kind: "generate" | "regenerate",
  series: string,
  poseIndex: number,
  ratio: string,
) {
  await database.insert(generationRecords).values({
    voucherId,
    kind,
    series,
    poseIndex,
    ratio,
    ...requestMetadata(),
    createdAt: Date.now(),
  });
}

function readVersions(value: string) {
  return JSON.parse(value) as ImageVersion[];
}

// 前端传当前选中的版本地址；确认它属于这张图。
export function resolveVersionUrl(row: typeof generatedImages.$inferSelect, publicUrl: string) {
  if (row.imageUrl === publicUrl || row.sourceUrl === publicUrl) return row.imageUrl;

  const version = readVersions(row.versions).find(
    (item) => item.url === publicUrl || item.sourceUrl === publicUrl,
  );
  if (!version) throw new Error("版本不存在");
  if (version.createdAt + IMAGE_TTL_MS <= Date.now()) throw new Error("这个版本已过期");
  return version.url;
}

// 修改/重新生成前把旧图记进历史；老数据没有 versions，顺手补上当前图。
export function appendVersion(
  row: typeof generatedImages.$inferSelect,
  version: ImageVersion,
): ImageVersion[] {
  const versions = readVersions(row.versions);
  if (versions.every((item) => item.url !== row.imageUrl)) {
    versions.push({ url: row.imageUrl, createdAt: row.createdAt });
  }
  versions.push(version);
  return versions;
}

export function toPublicImage(
  row: typeof generatedImages.$inferSelect,
  maxEdits: number,
): PublicImage {
  const now = Date.now();
  return {
    id: row.id,
    // 生成图直接用 Ark 原图地址；老数据没有 sourceUrl 时回退到存的值
    url: row.sourceUrl ?? row.imageUrl,
    sourceUrl: row.sourceUrl ?? undefined,
    versions: readVersions(row.versions)
      .filter((version) => version.createdAt + IMAGE_TTL_MS > now)
      .map((version) => ({
        url: version.sourceUrl ?? version.url,
        sourceUrl: version.sourceUrl,
        createdAt: version.createdAt,
      })),
    series: row.series,
    pose: row.poseIndex,
    ratio: row.ratio,
    remainingEdits: Math.max(0, maxEdits - row.editCount),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

// 生成结果固定是 PNG：新图从 Ark 读，老数据在 R2；服务端读取不受 CORS 限制。
export async function loadImageDataUrl(source: string) {
  if (isStoredImage(source)) {
    const object = await env.BUCKET.get(source);
    if (!object) throw new Error("当前图片已过期");
    return `data:image/png;base64,${Buffer.from(await object.arrayBuffer()).toString("base64")}`;
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`读取当前图片失败（${response.status}）`);
  return `data:image/png;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
}

export async function loadImageRow(voucherId: number, imageId: number) {
  const rows = await database
    .select()
    .from(generatedImages)
    .where(and(eq(generatedImages.id, imageId), eq(generatedImages.voucherId, voucherId)))
    .limit(1);
  const row = rows.at(0);
  if (!row) throw new Error("照片不存在");
  if (row.expiresAt <= Date.now()) throw new Error("照片已过期");
  return row;
}

export async function loadPublicImages(voucherId: number, maxEdits: number) {
  const now = Date.now();
  const rows = await database
    .select()
    .from(generatedImages)
    .where(and(eq(generatedImages.voucherId, voucherId), gt(generatedImages.expiresAt, now)))
    .orderBy(generatedImages.createdAt);
  return rows.map((row) => toPublicImage(row, maxEdits));
}

export async function acceptTerms(voucher: typeof vouchers.$inferSelect) {
  // 保留第一次同意的记录，不覆盖
  if (typeof voucher.termsAcceptedAt === "number") return;
  const metadata = requestMetadata();

  await database
    .update(vouchers)
    .set({
      termsAcceptedAt: Date.now(),
      termsAcceptedIp: metadata.ip,
      termsAcceptedCountry: metadata.country,
      termsAcceptedUserAgent: metadata.userAgent,
    })
    .where(eq(vouchers.id, voucher.id));
}
