async function decodeImage(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

// canvas 只能画同源图；先把图取成 blob，再用同源 object URL 画。
async function loadBlobImage(source: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      // 签名 URL 不能改 query，重试只换缓存策略
      const response = await fetch(source, { cache: attempt === 0 ? "default" : "reload" });
      if (!response.ok) throw new Error(`读取图片失败（${response.status}）`);
      const objectUrl = URL.createObjectURL(await response.blob());
      try {
        return await decodeImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error) {
      if (attempt >= 2) throw error;
    }
  }
}

export async function loadImage(source: string) {
  // 数据 URL 不走 fetch
  if (source.startsWith("data:")) return decodeImage(source);
  return loadBlobImage(source);
}
