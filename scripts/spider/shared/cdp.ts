// 通过 9222 调试端口在后台标签页打开页面并轮询执行表达式，用于需要浏览器环境的抓取。

const BROWSER_URL = "http://127.0.0.1:9222";
const TIMEOUT_MS = 30_000;

interface BrowserVersion {
  webSocketDebuggerUrl: string;
}

interface CdpReply {
  id?: number;
  error?: { message?: string };
  result?: {
    result?: { value?: unknown };
    sessionId?: string;
    targetId?: string;
  };
}

/**
 * 在后台标签页打开 pageUrl，反复执行 expression，直到返回非空值。
 */
export async function evaluateOnPage<T>(pageUrl: string, expression: string): Promise<T> {
  new URL(pageUrl);

  let response: Response;
  try {
    response = await fetch(`${BROWSER_URL}/json/version`);
  } catch {
    throw new Error(
      `连接不到浏览器调试端口 ${BROWSER_URL}，请先用 --remote-debugging-port=9222 启动 Chrome/Chromium`,
    );
  }
  if (!response.ok) throw new Error(`连接浏览器失败：${response.status}`);

  const browser = (await response.json()) as BrowserVersion;
  const ws = new WebSocket(browser.webSocketDebuggerUrl);

  try {
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener(
        "open",
        () => {
          resolve();
        },
        { once: true },
      );
      ws.addEventListener(
        "error",
        () => {
          reject(new Error("连不上浏览器调试 WebSocket"));
        },
        {
          once: true,
        },
      );
    });

    let nextId = 0;
    const send = (method: string, parameters: object = {}, sessionId?: string) =>
      new Promise<CdpReply>((resolve) => {
        const id = ++nextId;
        const onMessage = (event: MessageEvent) => {
          const reply = JSON.parse(String(event.data)) as CdpReply;
          if (reply.id !== id) return;
          ws.removeEventListener("message", onMessage);
          resolve(reply);
        };
        ws.addEventListener("message", onMessage);
        ws.send(JSON.stringify({ id, method, params: parameters, sessionId }));
      });

    // 在后台标签页打开，不打断当前页面
    const created = await send("Target.createTarget", { url: pageUrl, background: true });
    const targetId = created.result?.targetId;
    if (!targetId) throw new Error(`打开页面失败：${created.error?.message ?? "未知错误"}`);

    try {
      const attached = await send("Target.attachToTarget", { targetId, flatten: true });
      const sessionId = attached.result?.sessionId;
      if (!sessionId) throw new Error(`连接页面失败：${attached.error?.message ?? "未知错误"}`);

      const startedAt = Date.now();
      let lastError = "";
      while (Date.now() - startedAt < TIMEOUT_MS) {
        const reply = await send(
          "Runtime.evaluate",
          { expression, returnByValue: true },
          sessionId,
        );
        lastError = reply.error?.message ?? lastError;
        const value = reply.result?.result?.value as T | null | undefined;
        if (value) return value;
        // 页面跳转时执行上下文会被销毁，忽略后重试
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      throw new Error(`没有读到页面数据：${pageUrl}${lastError ? `（${lastError}）` : ""}`);
    } finally {
      await send("Target.closeTarget", { targetId });
    }
  } finally {
    ws.close();
  }
}
