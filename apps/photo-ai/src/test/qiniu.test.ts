import { createHmac } from "node:crypto";

import { expect, test } from "vite-plus/test";

import { signDownloadUrl, signUploadToken } from "#services/qiniu";
import { uploadKeySchema } from "#services/voucher-types";

const KEY = "temp_24h/00000000-0000-0000-0000-000000000000.png";
const BASE = "https://cdn.example.com";

test("upload keys are validated as keys, not URLs", () => {
  expect(uploadKeySchema.safeParse(KEY).success).toBe(true);
  expect(uploadKeySchema.safeParse(`https://cdn.example.com/${KEY}`).success).toBe(false);
  expect(uploadKeySchema.safeParse("temp_24h/not-a-key.png").success).toBe(false);
});

test("upload token signs the policy with padded HMAC-SHA1", async () => {
  const token = await signUploadToken({ accessKey: "ak", secretKey: "sk" }, KEY);
  const [accessKey, signature, encodedPolicy] = token.split(":", 3);
  expect(accessKey).toBe("ak");

  const policy = JSON.parse(Buffer.from(encodedPolicy, "base64url").toString()) as {
    scope: string;
    deadline: number;
    insertOnly: number;
    mimeLimit: string;
  };
  expect(policy.scope).toBe(`chupiandate:${KEY}`);
  expect(policy.insertOnly).toBe(1);
  expect(policy.mimeLimit).toBe("image/png");
  expect(policy.deadline).toBeGreaterThan(Math.floor(Date.now() / 1000));

  // 七牛保留 '=' 填充，与 Node 的 base64url 不同
  const expected = createHmac("sha1", "sk")
    .update(encodedPolicy)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  expect(signature).toBe(expected);
});

test("download token signs the full URL and expires in 30 minutes", async () => {
  const url = await signDownloadUrl({ accessKey: "ak", secretKey: "sk" }, BASE, KEY);
  const separator = "&token=";
  const signedUrl = url.slice(0, url.indexOf(separator));
  const token = url.slice(url.indexOf(separator) + separator.length);
  expect(token.startsWith("ak:")).toBe(true);

  const deadline = Number(new URL(signedUrl).searchParams.get("e"));
  const ttl = deadline - Math.floor(Date.now() / 1000);
  expect(ttl).toBeGreaterThan(29 * 60);
  expect(ttl).toBeLessThanOrEqual(30 * 60);

  const expected = createHmac("sha1", "sk")
    .update(signedUrl)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
  expect(token).toBe(`ak:${expected}`);
});
