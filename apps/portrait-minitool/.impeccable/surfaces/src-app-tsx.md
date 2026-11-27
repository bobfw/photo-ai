---
version: 1
slug: "src-app-tsx"
primary_target: "src/app.tsx"
related_targets: []
---

# Surface brief: 人像出片棚

- Scope: `apps/portrait-minitool` single-page minitool.
- Mode: Operate.
- Audience: 小红书 users on a phone who want a quick portrait retouch and a studio background.
- Job: choose a normal portrait or an already-transparent portrait on the home page, retouch skin and tone in the editor, give only the transparent one a new background, export/save or post a note.
- Constraints: offline static zip, Chrome 61 / ES2017, no WASM, Worker or network, no AI cutout; the background is offered for the 透明底人像 upload choice and for any image with detected alpha, 44px targets, safe areas, Simplified Chinese only.
- Chosen direction: Xiaohongshu App design language — white entry, black photo-first editor, signature red actions, white bottom sheet.
- Memorable moment: the screen goes dark when the portrait enters; a transparent portrait becomes the studio-background hero, and the result rises as a white Xiaohongshu bottom sheet with a red 发笔记 action.
- Unresolved: none.

## Direction contract

THESIS: A native-feeling Xiaohongshu creation tool: white entry, black photo-first editor, signature red #FF2442 actions; refuses the warm cream/serif studio look.

OWN-WORLD: #FF2442 / #E61E3B / #FFE9ED on white and #0F0F0F / #1C1C1E; PingFang/system sans; 12–16px radii; red pill primary, light gray pill secondary; tab labels with a red underline; white bottom sheet with a drag handle; soft depth, no glass.

STORY: The visitor recognizes a 小红书 tool in the first viewport, chooses a normal photo or an already-transparent portrait, which opens the black editor, retouches skin and — for transparent portraits — fills in the background, then posts the result through a familiar bottom sheet.

FIRST VIEWPORT: White page, top bar with a 34px red mark and 人像出片棚, bold black 34px headline, a two-option portrait-type switch (普通照片 / 透明底人像), a large #F7F7F7 upload card with a #FFE9ED icon tile and a red 选择照片 pill, a short flow list, and a gray privacy line with a lock; no eyebrow, no decorative gradient.

FORM: Pinned Xiaohongshu App world; seed: none (pinned) — "完全小红书app的风格，全部使用小红书的设计语言".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
