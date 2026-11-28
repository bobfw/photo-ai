import { expect, test } from "vite-plus/test";

import { parsePhotoTask } from "#agents/generate-photo";

test("MediaKit task states map to the poll response", () => {
  expect(parsePhotoTask({ status: "running" })).toEqual({ status: "running" });
  expect(
    parsePhotoTask({
      success: true,
      status: "completed",
      result: { maas_result: { data: [{ url: "https://example.com/a.png" }] } },
    }),
  ).toEqual({ status: "completed", url: "https://example.com/a.png" });
  expect(parsePhotoTask({ success: true, status: "failed", error: { message: "boom" } })).toEqual({
    status: "failed",
    error: "boom",
  });
  expect(parsePhotoTask({ success: false, error: { message: "bad request" } })).toEqual({
    status: "failed",
    error: "bad request",
  });
  expect(parsePhotoTask({ success: true, status: "completed", result: {} }).status).toBe("failed");
});
