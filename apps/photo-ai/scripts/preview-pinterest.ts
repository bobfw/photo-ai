// 本地预览 korean-wedding-pinterest 的参考图：
// - 标记/取消标记：写入 korean-wedding-pinterest/marked.json
// - 删除：直接删除图片（并从 marked.json 移除）
// 运行：node scripts/preview-pinterest.ts（可加 PORT=<端口>）
import { existsSync } from "node:fs";
import { readFile, readdir, unlink, writeFile } from "node:fs/promises";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGES_DIR = path.resolve(
  process.env.PINTEREST_DIR ??
    fileURLToPath(new URL("../korean-wedding-pinterest", import.meta.url)),
);
const MARKED_FILE = path.join(IMAGES_DIR, "marked.json");
const PORT = Number(process.env.PORT ?? 5702);

async function listImages(): Promise<string[]> {
  const files = await readdir(IMAGES_DIR);
  return files.filter((file) => file.endsWith(".jpg")).toSorted((a, b) => a.localeCompare(b));
}

async function readMarked(): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(MARKED_FILE, "utf8");
  } catch {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("marked.json 应为文件名数组");
  const entries = parsed.filter((item): item is string => typeof item === "string");
  if (entries.length !== parsed.length) throw new Error("marked.json 里有非字符串项");
  return entries;
}

async function writeMarked(files: string[]) {
  await writeFile(
    MARKED_FILE,
    JSON.stringify(
      files.toSorted((a, b) => a.localeCompare(b)),
      undefined,
      2,
    ) + "\n",
  );
}

function imageFile(url: URL): { name: string; path: string } | undefined {
  const name = url.searchParams.get("file");
  if (!name || !/^[\da-f-]+\.jpg$/i.test(name)) return undefined;
  return { name, path: path.join(IMAGES_DIR, name) };
}

// 只接受本机同源请求，避免任意网页通过表单/无 CORS 请求删本地文件。
function isLocalRequest(request: IncomingMessage): boolean {
  const host = request.headers.host ?? "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return false;
  const origin = request.headers.origin;
  return !origin || origin === "http://" + host;
}

async function setMarked(name: string, isMarked: boolean) {
  const markedFiles = new Set(await readMarked());
  if (isMarked) markedFiles.add(name);
  else markedFiles.delete(name);
  await writeMarked([...markedFiles]);
}

async function removeImage(name: string) {
  await unlink(path.join(IMAGES_DIR, name));
  const marked = await readMarked();
  if (marked.includes(name)) await writeMarked(marked.filter((item) => item !== name));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderPage(images: string[], marked: Set<string>): string {
  const cards = images
    .map((name) => {
      const source = "/img?file=" + encodeURIComponent(name);
      const isMarked = marked.has(name);
      return `<div class="card" data-name="${escapeHtml(name)}" data-marked="${isMarked}">
  <a class="shot" href="${source}" target="_blank" rel="noreferrer"><img src="${source}" alt="${escapeHtml(name)}" loading="lazy" /></a>
  <div class="actions">
    <button type="button" data-action="mark">${isMarked ? "已标记" : "标记"}</button>
    <button type="button" data-action="delete">删除</button>
  </div>
</div>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Korean Wedding 参考图</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.45 system-ui, -apple-system, "PingFang SC", sans-serif; background: #111113; color: #ececf0; }
header { position: sticky; top: 0; z-index: 1; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding: 12px 16px; padding-top: max(12px, env(safe-area-inset-top)); background: #111113e6; backdrop-filter: blur(10px); border-bottom: 1px solid #ffffff14; }
h1 { margin: 0; font-size: 15px; }
.count { font-size: 13px; color: #a1a1aa; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; padding: 12px 16px calc(24px + env(safe-area-inset-bottom)); }
@media (max-width: 430px) { main { grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; } }
.card { overflow: hidden; border: 2px solid transparent; border-radius: 12px; background: #1c1c20; }
.card[data-marked="true"] { border-color: #4ade80; }
.shot { display: block; }
.shot img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; background: #232327; }
.actions { display: flex; gap: 6px; padding: 8px; }
button { flex: 1; min-height: 44px; border: 0; border-radius: 8px; background: #2c2c33; color: #ececf0; font: inherit; font-size: 13px; cursor: pointer; }
button:active { opacity: 0.7; }
button:disabled { opacity: 0.5; }
.card[data-marked="true"] [data-action="mark"] { background: #14532d; color: #86efac; }
[data-action="delete"] { background: #3f1d1d; color: #fca5a5; }
</style>
</head>
<body>
<header>
  <h1>Korean Wedding 参考图</h1>
  <span class="count"><span id="total">${images.length}</span> 张 · 已标记 <span id="marked">${images.filter((name) => marked.has(name)).length}</span></span>
</header>
<main>
${cards}
</main>
<script>
const grid = document.querySelector("main");
const totalCount = document.getElementById("total");
const markedCount = document.getElementById("marked");

function syncCounts() {
  totalCount.textContent = String(grid.querySelectorAll(".card").length);
  markedCount.textContent = String(grid.querySelectorAll('.card[data-marked="true"]').length);
}

async function post(url) {
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

grid.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".card");
  const file = card.dataset.name;
  if (button.dataset.action === "delete" && !confirm("删除 " + file + "？不可撤销")) return;
  button.disabled = true;
  try {
    if (button.dataset.action === "mark") {
      const nextMarked = card.dataset.marked !== "true";
      const state = await post("/api/mark?file=" + encodeURIComponent(file) + "&marked=" + nextMarked);
      card.dataset.marked = String(state.marked);
      button.textContent = state.marked ? "已标记" : "标记";
    } else {
      await post("/api/delete?file=" + encodeURIComponent(file));
      card.remove();
    }
    syncCounts();
  } catch (error) {
    alert("操作失败：" + error.message);
  } finally {
    button.disabled = false;
  }
});
</script>
</body>
</html>`;
}

function send(response: ServerResponse, status: number, body: string, contentType: string) {
  response.writeHead(status, { "content-type": contentType });
  response.end(body);
}

function sendJson(response: ServerResponse, status: number, data: unknown) {
  send(response, status, JSON.stringify(data), "application/json; charset=utf-8");
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/") {
      const images = await listImages();
      const marked = new Set(await readMarked());
      send(response, 200, renderPage(images, marked), "text/html; charset=utf-8");
      return;
    }

    if (request.method === "GET" && url.pathname === "/img") {
      const file = imageFile(url);
      if (!file) {
        send(response, 404, "Not found", "text/plain");
        return;
      }
      try {
        const image = await readFile(file.path);
        response.writeHead(200, { "content-type": "image/jpeg", "cache-control": "no-store" });
        response.end(image);
      } catch {
        send(response, 404, "Not found", "text/plain");
      }
      return;
    }

    if (
      request.method === "POST" &&
      (url.pathname === "/api/mark" || url.pathname === "/api/delete")
    ) {
      if (!isLocalRequest(request)) {
        sendJson(response, 403, { error: "forbidden" });
        return;
      }
      const file = imageFile(url);
      if (!file || !existsSync(file.path)) {
        sendJson(response, 404, { error: "not found" });
        return;
      }
      if (url.pathname === "/api/mark") {
        const isMarked = url.searchParams.get("marked") === "true";
        await setMarked(file.name, isMarked);
        sendJson(response, 200, { marked: isMarked });
        return;
      }
      await removeImage(file.name);
      sendJson(response, 200, { ok: true });
      return;
    }

    send(response, 404, "Not found", "text/plain");
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal error";
    send(response, 500, message, "text/plain; charset=utf-8");
  }
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`参考图预览: http://127.0.0.1:${PORT}`);
});
