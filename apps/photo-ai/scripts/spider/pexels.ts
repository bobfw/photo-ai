// 解析 Pexels 图片页链接，返回原图 URL。
// 用法：node packages/agents/src/spider/pexels.ts https://www.pexels.com/zh-cn/photo/32893872/

const PHOTO_PATH = /\/photo\/(?:.*-)?(\d+)\/?$/;

/**
 * 返回图片页对应的原图 URL；从链接末尾的图片 id 拼出稳定地址，不请求页面。
 */
export function getPexelsImage(photoUrl: string): string {
  const id = PHOTO_PATH.exec(new URL(photoUrl).pathname)?.[1];
  if (!id) throw new Error(`不是有效的 Pexels 图片链接：${photoUrl}`);
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg`;
}

if (import.meta.main) {
  const photoUrl = process.argv[2];
  if (!photoUrl) throw new Error("用法：node packages/agents/src/spider/pexels.ts <图片页链接>");
  console.log(getPexelsImage(photoUrl));
}
