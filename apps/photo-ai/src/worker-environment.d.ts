declare namespace Cloudflare {
  // oxlint-disable-next-line unicorn-js/name-replacements
  interface Env {
    ADMIN_API_KEY: string;
    QINIU_ACCESS_KEY: string;
    QINIU_SECRET_KEY: string;
    // 桶的访问域名，必须含协议，例如 https://img.example.com
    QINIU_PUBLIC_URL: string;
    ARK_MEDIAKIT_API_KEY: string;
  }
}
