import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

// 表结构由 drizzle-kit 生成，通过 wrangler d1 migrations apply 应用。
export const database = drizzle(env.DB);
