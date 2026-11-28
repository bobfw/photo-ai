// Node 里的 Vitest 没有 Workers 运行时，测试只替换会用到的 Worker 运行时导出。
// shortcut: env 为空、waitUntil 是 no-op；需要真实 D1 时改用 @cloudflare/vitest-pool-workers。
// oxlint-disable-next-line unicorn-js/name-replacements
export const env = {} as Cloudflare.Env;

export function waitUntil(promise: Promise<unknown>) {
  void promise;
}
