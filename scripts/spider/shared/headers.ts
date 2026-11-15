// 抓取外部站点时统一使用的浏览器请求头。
// 注意：部分站点（如 Lululemon）会拒绝「Bun TLS 指纹 + Chrome UA」的组合，调用方需要去掉 User-Agent。
export const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Sec-Fetch-Dest": "iframe",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
};
