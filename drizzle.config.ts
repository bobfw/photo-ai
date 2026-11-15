import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/services/schema.ts",
  out: "./drizzle",
});
