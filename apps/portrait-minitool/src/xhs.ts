/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

interface PostNoteOptions {
  pageType: "photo_publish";
  title: string;
  content: string;
  mediaInfo: { image_resources: { url: string }[] };
}

interface MiniToolApi {
  postNote: (options: PostNoteOptions) => Promise<unknown>;
  saveImageToPhotosAlbum: (options: { filePath: string }) => Promise<unknown>;
  writeTempFile: (options: { data: string }) => Promise<{ filePath: string }>;
}

declare global {
  interface Window {
    xhs: { miniTool: MiniToolApi };
  }
}

// 只有容器接口需要字符串，才在这里把 Blob 转成 data URL。
function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("图片读取失败"));
    });
    reader.addEventListener("error", () => {
      reject(new Error("图片读取失败"));
    });
    reader.readAsDataURL(blob);
  });
}

async function toFilePath(blob: Blob) {
  const data = await readAsDataUrl(blob);
  const result = await window.xhs.miniTool.writeTempFile({ data });
  return result.filePath;
}

export async function saveToAlbum(blob: Blob) {
  const filePath = await toFilePath(blob);
  await window.xhs.miniTool.saveImageToPhotosAlbum({ filePath });
}

export async function publishNote(blob: Blob) {
  const filePath = await toFilePath(blob);
  await window.xhs.miniTool.postNote({
    pageType: "photo_publish",
    title: "我的人像写真",
    content: "用「人像出片棚」做的一张影棚人像。",
    mediaInfo: { image_resources: [{ url: filePath }] },
  });
}
