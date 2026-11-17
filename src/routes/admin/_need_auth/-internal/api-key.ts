const STORAGE_KEY = "admin_api_key";

export function getApiKey() {
  return typeof sessionStorage === "undefined" ? "" : (sessionStorage.getItem(STORAGE_KEY) ?? "");
}

export function setApiKey(key: string) {
  sessionStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey() {
  sessionStorage.removeItem(STORAGE_KEY);
}
