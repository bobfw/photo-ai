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

async function toFilePath(dataUrl: string) {
  const result = await window.xhs.miniTool.writeTempFile({ data: dataUrl });
  return result.filePath;
}

export async function saveToAlbum(dataUrl: string) {
  const filePath = await toFilePath(dataUrl);
  await window.xhs.miniTool.saveImageToPhotosAlbum({ filePath });
}

export async function publishNote(dataUrl: string) {
  const filePath = await toFilePath(dataUrl);
  await window.xhs.miniTool.postNote({
    pageType: "photo_publish",
    title: "我的人像写真",
    content: "用「人像出片棚」做的一张影棚人像。",
    mediaInfo: { image_resources: [{ url: filePath }] },
  });
}
