# photo-ai（出片）

pnpm workspace monorepo。

- `apps/photo-ai` — AI 婚纱照 / 形象照生成，跑在 Cloudflare Workers 上（D1）。

新应用放在 `apps/<name>`；跨应用共享代码放在 `packages/<name>`。

## 本地开发

在仓库根目录：

```bash
pnpm install
pnpm cf-typegen                  # 生成 worker-configuration.d.ts
pnpm db:migrate                  # 本地 D1 迁移
pnpm dev                         # http://localhost:5701
pnpm voucher:create -- --total 3 --count 5
```

密钥放在 `apps/photo-ai/.dev.vars`（从 `apps/photo-ai/.dev.vars.example` 复制，填入
ARK_MEDIAKIT_API_KEY 和七牛的 QINIU_* 配置）。

根目录的脚本都会转发到 `apps/photo-ai`；也可以 `cd apps/photo-ai` 后直接运行。

## 数据库

```bash
pnpm db:generate                 # schema 改动后生成 drizzle 迁移
pnpm db:migrate:remote           # 应用到线上 D1
```

## 部署

在 `apps/photo-ai` 下（`wrangler` 是本地 devDependency，用 `pnpm exec`）：

```bash
pnpm exec wrangler d1 create photo-ai   # 把返回的 database_id 填进 wrangler.jsonc
# 七牛桶 chupiandate：访问域名写在 apps/photo-ai/src/services/qiniu.ts 的 PUBLIC_URL，
# 线上换成 HTTPS 自定义域名；配置 temp_24h/ 的 1 天生命周期规则
pnpm exec wrangler secret put ARK_MEDIAKIT_API_KEY
pnpm exec wrangler secret put QINIU_ACCESS_KEY
pnpm exec wrangler secret put QINIU_SECRET_KEY
```

在仓库根目录部署：

```bash
pnpm db:migrate:remote
pnpm deploy
```
