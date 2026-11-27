import { expect, test } from "vite-plus/test";

import { buildPortraitPrompt } from "../agents/portrait/prompts.ts";
import {
  PORTRAIT_COMPOSITIONS,
  PORTRAIT_POSES,
  PORTRAIT_STYLES,
} from "../routes/portrait/-internal/services/styles.ts";

test("portrait prompt includes style, pose, composition and every uploaded angle", () => {
  for (const style of PORTRAIT_STYLES) {
    const look = {
      attire: style.attire,
      mood: style.mood,
      pose: PORTRAIT_POSES[0].prompt,
      composition: PORTRAIT_COMPOSITIONS[0].prompt,
    };
    const single = buildPortraitPrompt(1, look, "3:4 竖幅");

    expect(single).toContain("图1是人物参考照片");
    expect(single).toContain(style.attire);
    expect(single).toContain(style.mood);
    expect(single).toContain(look.pose);
    expect(single).toContain(look.composition);
    expect(single).toContain("透明 PNG");
    expect(single).toContain("3:4 竖幅");

    const triple = buildPortraitPrompt(3, look, "3:4 竖幅");

    expect(triple).toContain("图1至图3");
    expect(triple).toContain("同一个人不同角度");
  }
});

test("portrait prompt appends the user request", () => {
  const prompt = buildPortraitPrompt(
    2,
    {
      attire: "白衬衫",
      mood: "自然微笑",
      pose: PORTRAIT_POSES[1].prompt,
      composition: PORTRAIT_COMPOSITIONS[1].prompt,
    },
    "3:4 竖幅",
    "戴眼镜",
  );

  expect(prompt).toContain("用户补充要求：戴眼镜");
});
