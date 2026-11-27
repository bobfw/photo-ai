export function errorMessage(error: unknown) {
  if (typeof error === "object" && error) {
    if ("message" in error && typeof error.message === "string") return error.message;
    if ("errMsg" in error && typeof error.errMsg === "string") return error.errMsg;
  }
  return "操作失败，请重试";
}
