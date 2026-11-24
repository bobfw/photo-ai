export async function loadImage(source: string) {
  for (let attempt = 0; ; attempt += 1) {
    const image = new Image();
    // 贴纸从 CDN 取，导出 canvas 需要跨域许可；成图走同源 /media 代理
    image.crossOrigin = "anonymous";
    // 数据 URL 不能加 query；网络图片失败重试时换缓存键，绕过浏览器缓存的坏响应
    image.src = attempt === 0 || source.startsWith("data:") ? source : `${source}?retry=${attempt}`;
    try {
      await image.decode();
      return image;
    } catch (error) {
      if (attempt >= 2) throw error;
    }
  }
}
