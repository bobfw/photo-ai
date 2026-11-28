import { eq, sql } from "drizzle-orm";

import { database } from "./database.ts";
import { uploadSignCounters } from "./schema.ts";

// 预签名防刷：每个凭证 10 秒最多 5 次、每天 30 次、累计 100 次。
const WINDOW_MS = 10_000;
const WINDOW_LIMIT = 5;
const DAY_LIMIT = 30;
const TOTAL_LIMIT = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
// 按中国时间划分自然日
const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;

export async function assertUploadSignAllowed(voucherId: number) {
  const now = Date.now();
  const dayKey = Math.floor((now + CHINA_OFFSET_MS) / DAY_MS);
  await database.insert(uploadSignCounters).values({ voucherId }).onConflictDoNothing();

  // shortcut: 固定窗口近似限流，窗口边界可能短暂多放行；需要严格滑动窗口再改事件表。
  const allowed = await database.run(sql`
    UPDATE upload_sign_counters
    SET
      window_start = CASE WHEN window_start <= ${now - WINDOW_MS} THEN ${now} ELSE window_start END,
      window_count = CASE WHEN window_start <= ${now - WINDOW_MS} THEN 1 ELSE window_count + 1 END,
      day_key = CASE WHEN day_key <> ${dayKey} THEN ${dayKey} ELSE day_key END,
      day_count = CASE WHEN day_key <> ${dayKey} THEN 1 ELSE day_count + 1 END,
      total_count = total_count + 1
    WHERE voucher_id = ${voucherId}
      AND total_count < ${TOTAL_LIMIT}
      AND (day_key <> ${dayKey} OR day_count < ${DAY_LIMIT})
      AND (window_start <= ${now - WINDOW_MS} OR window_count < ${WINDOW_LIMIT})
  `);
  if (allowed.meta.changes > 0) return;

  const rows = await database
    .select()
    .from(uploadSignCounters)
    .where(eq(uploadSignCounters.voucherId, voucherId))
    .limit(1);
  const counter = rows.at(0);
  if (counter && counter.totalCount >= TOTAL_LIMIT) {
    throw new Error("这个凭证的上传次数已用完");
  }
  if (counter?.dayKey === dayKey && counter.dayCount >= DAY_LIMIT) {
    throw new Error("今天上传次数已达上限，请明天再试");
  }
  throw new Error("上传太频繁，请 10 秒后再试");
}
