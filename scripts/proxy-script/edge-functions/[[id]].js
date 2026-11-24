/* oxlint-disable typescript/ban-ts-comment, typescript/no-unsafe-argument, typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access, unicorn/no-useless-undefined */
// @ts-nocheck
// EdgeOne Pages 边缘函数：文件放到 edge-functions/[[default]].js，入口是 export function onRequest。
// Pages 直接上传只接受 HTML 或 ZIP，函数文件夹必须在 zip 根目录；运行时是 V8 + Web API（不是 Node），
// 所以这份文件刻意不写 TS 类型语法（.ts 只是仓库里的存放格式）。
// 用法：https://你的域名/https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/....png?X-Tos-...
const ARK_IMAGE_HOST = "ark-acg-cn-beijing.tos-cn-beijing.volces.com";

// 图片 2 小时内不变，浏览器和 EdgeOne 节点都可以直接命中缓存
const CACHE_SECONDS = 2 * 60 * 60;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

// 只透传这些请求头，其余全部丢弃
// —— TOS 签名里 X-Tos-SignedHeaders=host，改别的头都不影响签名
const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "if-none-match",
  "if-modified-since",
  "range",
  "if-range",
  "user-agent",
];

// 不回传客户端的响应头（由我们重算，或对 CORS 无意义）
const DROP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "transfer-encoding",
  "connection",
  "content-length",
  "set-cookie",
  "access-control-allow-origin",
  "access-control-allow-methods",
  "access-control-allow-headers",
  "x-tos-request-id",
]);

/**
 * @param {string} source
 * @returns {URL | undefined}
 */
function parseTarget(source) {
  try {
    return new URL(source);
  } catch {
    return undefined;
  }
}

/**
 * @param {URL} target
 * @param {string} method
 * @param {Headers} headers
 * @returns {Promise<Response>}
 */
async function fetchUpstream(target, method, headers) {
  try {
    return await fetch(target, { method, headers, redirect: "follow" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`上游请求失败：${message}`, { status: 502, headers: CORS_HEADERS });
  }
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(undefined, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  // ---- 解析目标 URL ----
  // 路径和 query 原样拼回：TOS 签名覆盖完整 URL，不能 decode，改一个字节就 403
  // CDN 可能把协议里的 // 合并成一个，这里补回来
  const rawPath = url.pathname.replace(/^\/+/, "").replace(/^(https?):\/(?!\/)/i, "$1://");
  const target = parseTarget(rawPath + url.search);

  if (!target) {
    return new Response("用法：/https://host/path?query", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS_HEADERS },
    });
  }
  // 公开 Worker，不做白名单就是给人白嫖的任意 URL 代理
  if (target.protocol !== "https:" || target.hostname !== ARK_IMAGE_HOST) {
    return new Response("非法地址", { status: 403, headers: CORS_HEADERS });
  }

  // ---- 只透传少量请求头 ----
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const upstream = await fetchUpstream(target, request.method, headers);

  // ---- 组装响应头 ----
  const respHeaders = new Headers();
  for (const [key, value] of upstream.headers) {
    if (!DROP_RESPONSE_HEADERS.has(key.toLowerCase())) respHeaders.set(key, value);
  }
  for (const [key, value] of Object.entries(CORS_HEADERS)) respHeaders.set(key, value);

  if (upstream.status === 200) {
    respHeaders.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

// EdgeOne Pages 的函数入口；onRequest 处理所有方法
export function onRequest(context) {
  return handleRequest(context.request);
}
