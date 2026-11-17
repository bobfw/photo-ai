# photo-ai（出片）

AI 婚纱照生成，跑在 Cloudflare Workers 上（D1 + R2）。

## 本地开发

```bash
cp .dev.vars.example .dev.vars   # 填入 OPENROUTER_API_KEY
pnpm install
pnpm cf-typegen                  # 生成 worker-configuration.d.ts
pnpm db:migrate                  # 本地 D1 迁移
pnpm references:seed             # 把参考图上传到本地 R2（线上用 -- --remote）
pnpm dev                         # http://localhost:5701
pnpm voucher:create -- --total 3 --count 5
```

## 数据库

```bash
pnpm db:generate                 # schema 改动后生成 drizzle 迁移
pnpm db:migrate:remote           # 应用到线上 D1
```

## 部署

```bash
wrangler d1 create photo-ai      # 把返回的 database_id 填进 wrangler.jsonc
wrangler r2 bucket create photo-ai-images
wrangler secret put OPENROUTER_API_KEY
pnpm db:migrate:remote
pnpm deploy
```
