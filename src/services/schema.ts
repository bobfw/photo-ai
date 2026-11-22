import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const generatedImages = sqliteTable(
  "generated_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    // Ark 返回的图片 URL，过期时间由 Ark 控制
    imageUrl: text("image_url").notNull(),
    poseIndex: integer("pose_index").notNull(),
    // 旧系列 key 的默认值；插入时总是显式写 series
    series: text("series").notNull().default("han-shi"),
    ratio: text("ratio").notNull().default("2:3"),
    editCount: integer("edit_count").notNull().default(0),
    // 历史版本（含当前），JSON 数组，按生成先后排列
    versions: text("versions").notNull().default("[]"),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("idx_generated_images_voucher").on(table.voucherId),
    index("idx_generated_images_expires").on(table.expiresAt),
  ],
);
