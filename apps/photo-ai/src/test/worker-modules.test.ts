import { expect, test } from "vite-plus/test";

import { database } from "#services/database";

test("Worker modules import in Node", () => {
  expect(database).toBeDefined();
});
