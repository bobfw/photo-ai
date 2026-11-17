import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const vouchers = sqliteTable("vouchers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  totalImages: integer("total_images").notNull(),
  generatedCount: integer("generated_count").notNull().default(0),
  platform: text("platform"),
  createdAt: integer("created_at").notNull(),
});

export const generatedImages = sqliteTable(
  "generated_images",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    voucherId: integer("voucher_id")
      .notNull()
      .references(() => vouchers.id),
    imageUrl: text("image_url").notNull(),
    faceKeys: text("face_keys").notNull(),
    referenceKey: text("reference_key").notNull(),
    mode: text("mode").notNull(),
    editCount: integer("edit_count").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("idx_generated_images_voucher").on(table.voucherId),
    index("idx_generated_images_expires").on(table.expiresAt),
  ],
);
