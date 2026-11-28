import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const vouchers = sqliteTable("vouchers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  totalImages: integer("total_images").notNull(),
  generatedCount: integer("generated_count").notNull().default(0),
  maxEdits: integer("max_edits").notNull().default(5),
  platform: text("platform"),
  termsAcceptedAt: integer("terms_accepted_at"),
  termsAcceptedIp: text("terms_accepted_ip"),
  termsAcceptedCountry: text("terms_accepted_country"),
  termsAcceptedUserAgent: text("terms_accepted_user_agent"),
  createdAt: integer("created_at").notNull(),
});

// 永久保留的生成请求记录，用于处理纠纷；不随图片过期清理。
export const generationRecords = sqliteTable(
  "generation_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    kind: text("kind").notNull(),
    series: text("series").notNull(),
    poseIndex: integer("pose_index").notNull(),
    ratio: text("ratio").notNull(),
    ip: text("ip").notNull().default(""),
    country: text("country").notNull().default(""),
    userAgent: text("user_agent").notNull().default(""),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_generation_records_voucher").on(table.voucherId),
    index("idx_generation_records_created").on(table.createdAt),
  ],
);

// 用户上传的参考照片；对象存在七牛 temp_24h/，由桶的生命周期规则删除。
export const uploads = sqliteTable(
  "uploads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    key: text("key").notNull().unique(),
    url: text("url").notNull(),
    // 前端确认上传成功的时间；未确认的 key 不能用于生成
    confirmedAt: integer("confirmed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_uploads_voucher").on(table.voucherId)],
);

// 上传凭证签发计数，按凭证限制防刷。
export const uploadSignCounters = sqliteTable("upload_sign_counters", {
  voucherId: integer("voucher_id")
    .primaryKey()
    .references(() => vouchers.id),
  windowStart: integer("window_start").notNull().default(0),
  windowCount: integer("window_count").notNull().default(0),
  dayKey: integer("day_key").notNull().default(0),
  dayCount: integer("day_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
});

// 异步生成任务；前端轮询，MediaKit 的 task_id 和最终图片落在这里。
export const generationTasks = sqliteTable(
  "generation_tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    // 前端生成，接口据此幂等；同时作为 MediaKit 的 client_token
    clientToken: text("client_token").notNull().unique(),
    kind: text("kind").notNull(),
    // 生成新图时为空，完成前不会写入；修改/重新生成时指向目标图片
    imageId: integer("image_id"),
    series: text("series").notNull(),
    poseIndex: integer("pose_index").notNull(),
    ratio: text("ratio").notNull(),
    status: text("status").notNull().default("running"),
    providerTaskId: text("provider_task_id"),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_generation_tasks_voucher").on(table.voucherId)],
);

export const generatedImages = sqliteTable(
  "generated_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    // 生成新图的任务，用来保证轮询重复完成时只插入一次；老数据为空
    taskId: integer("task_id"),
    // Ark 原始地址（24 小时后失效）
    imageUrl: text("image_url").notNull(),
    // Ark 原始地址，24 小时后失效，永久留着便于追溯；老数据为空
    sourceUrl: text("source_url"),
    poseIndex: integer("pose_index").notNull(),
    // 旧系列 key 的默认值；插入时总是显式写 series
    series: text("series").notNull().default("han-shi"),
    ratio: text("ratio").notNull().default("2:3"),
    editCount: integer("edit_count").notNull().default(0),
    // 修改请求开始时间；非空表示正在生成，防止同一张图被并发重复扣次数
    editStartedAt: integer("edit_started_at"),
    // 历史版本（含当前），JSON 数组，按生成先后排列
    versions: text("versions").notNull().default("[]"),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("idx_generated_images_voucher").on(table.voucherId),
    index("idx_generated_images_expires").on(table.expiresAt),
    uniqueIndex("idx_generated_images_task").on(table.taskId),
  ],
);
