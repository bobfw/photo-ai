import { env } from "cloudflare:workers";

// 七牛桶和上传策略：前端拿到服务端签发的凭证后直传，key 由服务端决定。
const BUCKET = "chupiandate";
// 桶在华东 z0；换区域/迁移桶时改这里
const UPLOAD_HOST = "https://upload.qiniup.com";
const KEY_PREFIX = "temp_24h/";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const TOKEN_TTL_SECONDS = 60 * 60;
// 只给 MediaKit 拉图用，正常几十秒内就开始生成
const DOWNLOAD_TTL_SECONDS = 30 * 60;

export function qiniuConfig() {
  const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_PUBLIC_URL } = env;
  if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY || !QINIU_PUBLIC_URL) {
    throw new Error("服务端未配置七牛参数");
  }
  if (!/^https?:\/\//.test(QINIU_PUBLIC_URL)) {
    throw new Error("QINIU_PUBLIC_URL 必须是完整 URL（含 http:// 或 https://）");
  }
  return {
    accessKey: QINIU_ACCESS_KEY,
    secretKey: QINIU_SECRET_KEY,
    publicBase: QINIU_PUBLIC_URL,
    uploadHost: UPLOAD_HOST,
  };
}

export function createUploadKey() {
  return `${KEY_PREFIX}${crypto.randomUUID()}.png`;
}

export function publicUrl(base: string, key: string) {
  return `${base.replace(/\/+$/, "")}/${key}`;
}

// 七牛使用带 '=' 填充的 URL-safe Base64（Go base64.URLEncoding），不能去掉填充。
function base64Url(value: Uint8Array) {
  return Buffer.from(value).toString("base64").replaceAll("+", "-").replaceAll("/", "_");
}

async function hmacSha1(secretKey: string, data: string) {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    Buffer.from(secretKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", hmacKey, Buffer.from(data));
  return base64Url(new Uint8Array(signature));
}

// 七牛上传凭证：AccessKey + HMAC-SHA1(SecretKey, base64url(policy)) + base64url(policy)
export async function signUploadToken(
  credentials: { accessKey: string; secretKey: string },
  key: string,
) {
  const policy = {
    scope: `${BUCKET}:${key}`,
    deadline: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    insertOnly: 1,
    fsizeLimit: MAX_UPLOAD_BYTES,
    mimeLimit: "image/png",
  };
  const encodedPolicy = base64Url(Buffer.from(JSON.stringify(policy)));
  const signature = await hmacSha1(credentials.secretKey, encodedPolicy);
  return `${credentials.accessKey}:${signature}:${encodedPolicy}`;
}

// 私有桶下载凭证：签名串是加了 e 参数的完整 URL，token 必须放在最后。
export async function signDownloadUrl(
  credentials: { accessKey: string; secretKey: string },
  base: string,
  key: string,
) {
  const deadline = Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS;
  const url = `${publicUrl(base, key)}?e=${deadline}`;
  const signature = await hmacSha1(credentials.secretKey, url);
  return `${url}&token=${credentials.accessKey}:${signature}`;
}
