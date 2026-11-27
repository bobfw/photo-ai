/* oxlint-disable unicorn/prefer-global-this, unicorn/consistent-function-scoping, unicorn/no-null, unicorn/prefer-string-replace-all, unicorn-js/no-this-outside-of-class, unicorn-js/no-unsafe-string-replacement, unicorn-js/prefer-await, unicorn-js/prefer-then-catch, eslint/no-empty-function, typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unnecessary-type-conversion, typescript/use-unknown-in-catch-callback-variable -- hand-written ES2017 browser polyfills */

// React 19 的客户端渲染会调用 queueMicrotask；Chrome 61 没有这个 API。
if (typeof window.queueMicrotask !== "function") {
  // oxlint-disable-next-line unicorn-js/no-global-object-property-assignment -- Chrome 61 polyfill
  window.queueMicrotask = (callback) => {
    void (async () => {
      try {
        await Promise.resolve();
        callback();
      } catch (error) {
        window.setTimeout(() => {
          // oxlint-disable-next-line typescript/only-throw-error -- rethrow the original microtask error
          throw error;
        }, 0);
      }
    })();
  };
}

// TanStack Router 在导航时使用 AbortController；Chrome 61 没有这个 API。
if (typeof window.AbortController !== "function") {
  // oxlint-disable-next-line unicorn-js/no-global-object-property-assignment -- Chrome 61 polyfill
  window.AbortController = function AbortController() {
    const listeners = [];
    const signal = {
      aborted: false,
      onabort: undefined,
      reason: undefined,
      addEventListener(type, listener) {
        if (type === "abort" && typeof listener === "function") listeners.push(listener);
      },
      removeEventListener(type, listener) {
        if (type !== "abort") return;
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      },
    };

    this.signal = signal;
    this.abort = (reason) => {
      if (signal.aborted) return;
      signal.aborted = true;
      signal.reason = reason;
      const event = { type: "abort", target: signal };
      if (typeof signal.onabort === "function") signal.onabort(event);
      const current = [...listeners];
      for (const listener of current) listener(event);
    };
  };

  // React 的事件系统会做 `signal instanceof AbortSignal`，不能只补 AbortController。
  // oxlint-disable-next-line unicorn-js/no-global-object-property-assignment -- Chrome 61 polyfill
  window.AbortSignal = function AbortSignal() {};
}

// TanStack Router 的路由参数编码会调用 replaceAll；Chrome 61 没有这个 API。
if (typeof String.prototype.replaceAll !== "function") {
  String.prototype.replaceAll = function replaceAll(search, replacement) {
    if (search instanceof RegExp) {
      if (!search.global) throw new TypeError("replaceAll requires a global RegExp");
      return this.replace(search, replacement);
    }
    const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    return this.replace(new RegExp(escaped, "g"), replacement);
  };
}

// React 19 的 View Transition 代码会调用 allSettled；Chrome 61 没有这个 API。
if (typeof Promise.allSettled !== "function") {
  Promise.allSettled = (iterable) =>
    Promise.all(
      [...iterable].map((promise) =>
        Promise.resolve(promise).then(
          (value) => ({ status: "fulfilled", value }),
          (error) => ({ status: "rejected", error }),
        ),
      ),
    );
}
