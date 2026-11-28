import { env } from "cloudflare:workers";

const MEDIAKIT_BASE_URL = "https://mediakit.cn-beijing.volces.com";
const SUBMIT_URL = `${MEDIAKIT_BASE_URL}/api/v1/tools/call-maas-proxy`;
const TASK_URL = `${MEDIAKIT_BASE_URL}/api/v1/tasks`;
const ARK_IMAGE_MODEL = "doubao-seedream-5-5-261028";
// const ARK_IMAGE_MODEL = "doubao-seedream-5-0-pro-260628";

export type ImageSize = "1K" | "1.5K" | "2K";

interface MediaKitError {
  code?: string;
  message?: string;
  type?: string;
  param?: string;
}

interface MediaKitSubmitResponse {
  success?: boolean;
  task_id?: string;
  request_id?: string;
  error?: MediaKitError;
}

interface MediaKitTaskResponse {
  success?: boolean;
  task_id?: string;
  status?: "running" | "completed" | "failed";
  result?: {
    api?: string;
    duration?: number;
    maas_result?: {
      data?: { url?: string; error?: MediaKitError }[];
      error?: MediaKitError;
    };
  };
  error?: MediaKitError;
}

type PhotoTaskState =
  | { status: "running" }
  | { status: "completed"; url: string }
  | { status: "failed"; error: string };

function errorMessage(error: MediaKitError | undefined, fallback: string) {
  return error?.message ?? fallback;
}

function mediaKitApiKey() {
  if (!env.ARK_MEDIAKIT_API_KEY) throw new Error("服务端未配置 ARK_MEDIAKIT_API_KEY");
  return env.ARK_MEDIAKIT_API_KEY;
}

/**
 * 提交异步图片生成任务，返回 MediaKit 的 task_id。
 * references 必须是 MediaKit 能直接下载的 URL（七牛或 Ark 地址），代理不支持 base64。
 * clientToken 同时用作 MediaKit 的幂等键。
 */
export async function submitPhotoTask(
  prompt: string,
  options: { references: string[]; size: ImageSize },
  clientToken: string,
): Promise<string> {
  const response = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mediaKitApiKey()}`,
    },
    body: JSON.stringify({
      api: "ark.image_generation",
      client_token: clientToken,
      maas_params: {
        model: ARK_IMAGE_MODEL,
        prompt,
        image: options.references,
        size: options.size,
        background: "transparent",
        output_format: "png",
        response_format: "url",
        watermark: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`图片生成失败（${response.status}）：${await response.text()}`);
  }

  const result = await response.json<MediaKitSubmitResponse>();
  if (!result.success || !result.task_id) {
    throw new Error(`图片生成失败：${errorMessage(result.error, "任务提交失败")}`);
  }
  return result.task_id;
}

// 纯函数便于测试；completed 时 result.maas_result 是方舟原始返回。
export function parsePhotoTask(result: MediaKitTaskResponse): PhotoTaskState {
  if (result.success === false) {
    return { status: "failed", error: errorMessage(result.error, "生成任务查询失败") };
  }
  if (result.status === "failed") {
    return { status: "failed", error: errorMessage(result.error, "图片生成失败") };
  }
  if (result.status === "completed") {
    const image = result.result?.maas_result?.data?.at(0);
    if (!image?.url) {
      return {
        status: "failed",
        error: errorMessage(image?.error ?? result.result?.maas_result?.error, "模型没有返回图片"),
      };
    }
    return { status: "completed", url: image.url };
  }
  return { status: "running" };
}

export async function pollPhotoTask(taskId: string): Promise<PhotoTaskState> {
  const response = await fetch(`${TASK_URL}/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${mediaKitApiKey()}` },
  });

  if (!response.ok) {
    throw new Error(`查询生成任务失败（${response.status}）：${await response.text()}`);
  }
  return parsePhotoTask(await response.json<MediaKitTaskResponse>());
}
