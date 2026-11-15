// 从 Instagram 帖子（单图或轮播）提取图片 URL。
// 用法：node scripts/spider/instagram.ts https://www.instagram.com/p/Dfd0oaegcl_/

import https from "node:https";

import { BROWSER_HEADERS } from "./shared/headers.ts";

const POST_PATH = /instagram\.com\/(?:p|reel|tv)\/([\w-]+)/;

interface Media {
  is_video: boolean;
  display_url: string;
  edge_sidecar_to_children?: { edges: { node: Media }[] };
}

// 只有带 iframe 的 Sec-Fetch 头，embed 页才返回帖子数据，否则返回登录壳。
// fetch 会把 Sec-Fetch-Mode 改成 cors，所以这里用 https.get 发原始请求头。
function getHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: BROWSER_HEADERS }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Instagram 返回 ${response.statusCode}：${url}`));
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve(body);
        });
      })
      .on("error", reject);
  });
}

/**
 * 返回帖子里的全部图片 URL（原图分辨率，轮播里的视频会被跳过）
 */
export async function getInstagramImages(postUrl: string): Promise<string[]> {
  const shortcode = POST_PATH.exec(postUrl)?.[1];
  if (!shortcode) throw new Error(`不是有效的 Instagram 帖子链接：${postUrl}`);

  const html = await getHtml(`https://www.instagram.com/p/${shortcode}/embed/captioned/`);
  const serialized = /"contextJSON":"((?:[^"\\]|\\.)*)"/.exec(html)?.[1];
  if (!serialized) throw new Error(`没有找到帖子数据，帖子可能不存在或私密：${postUrl}`);

  const context = JSON.parse(JSON.parse(`"${serialized}"`) as string) as {
    gql_data: { shortcode_media: Media };
  };
  const media = context.gql_data.shortcode_media;
  const items = media.edge_sidecar_to_children?.edges.map((edge) => edge.node) ?? [media];

  return items.filter((item) => !item.is_video).map((item) => item.display_url);
}

if (import.meta.main) {
  const postUrl = process.argv[2];
  if (!postUrl) throw new Error("用法：node scripts/spider/instagram.ts <帖子链接>");
  const images = await getInstagramImages(postUrl);
  console.log(images.join("\n"));
}
