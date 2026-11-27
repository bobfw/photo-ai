/* oxlint-disable unicorn/prefer-global-this -- Chrome 61 baseline has no globalThis */

interface PostNoteOptions {
  pageType: "photo_publish";
  title: string;
  content: string;
  mediaInfo: { image_resources: { url: string }[] };
}

interface MiniToolApi {
  postNote?: (options: PostNoteOptions) => Promise<unknown>;
  saveImageToPhotosAlbum?: (options: { filePath: string }) => Promise<unknown>;
  writeTempFile?: (options: { data: string }) => Promise<{ filePath: string }>;
}

function getMiniTool() {
  type WindowWithXhs = Window & { xhs?: { miniTool?: MiniToolApi } };
  const globalWindow = window as WindowWithXhs;
  return globalWindow.xhs?.miniTool;
}

async function toFilePath(miniTool: MiniToolApi, dataUrl: string) {
  if (!miniTool.writeTempFile) return dataUrl;
  try {
    const result = await miniTool.writeTempFile({ data: dataUrl });
    return result.filePath;
  } catch {
    // 写临时文件失败时仍可把 data URI 直接交给保存/发布接口。
    return dataUrl;
  }
}

export async function saveToAlbum(dataUrl: string) {
  const miniTool = getMiniTool();
  if (!miniTool?.saveImageToPhotosAlbum) return false;

  const filePath = await toFilePath(miniTool, dataUrl);
  await miniTool.saveImageToPhotosAlbum({ filePath });
  return true;
}

export async function publishNote(dataUrl: string) {
  const miniTool = getMiniTool();
  if (!miniTool?.postNote) return false;

  const filePath = await toFilePath(miniTool, dataUrl);
  await miniTool.postNote({
    pageType: "photo_publish",
    title: "我的人像写真",
    content: "用「人像出片棚」做的一张影棚人像。",
    mediaInfo: { image_resources: [{ url: filePath }] },
  });
  return true;
}
