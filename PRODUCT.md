# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Couples who buy a wedding-photo voucher on Chinese social commerce — 小红书, 淘宝, 闲鱼, or 抖音 — and redeem it on a phone. One voucher admits a couple: the flow expects a frontal photo of each partner. There is no account and no in-app payment; the voucher code is the only access credential.

The operator runs the product and handles customer support through the private admin console, creating voucher batches and marking which commerce platform each code went to.

## Product Purpose

出片 (photo-ai) is an AI wedding photography studio. A customer enters a voucher code, uploads one frontal photo of each partner, picks a pose from a curated wedding-pose series, and receives one transparent-background wedding photo of the two of them per pose in minutes.

Success means both partners recognize themselves in the result — identity accuracy outranks beautification — and the cutout reads as a real camera photograph rather than an AI render.

## Positioning

A voucher-gated AI studio for wedding photos: the customer picks a pose from a curated series and their own two faces are generated into it with likeness as the highest priority. Access is a prepaid code distributed through social commerce, and the pose catalog is curated by the operator, so every result starts from a composition the customer would plausibly want.

## Operating Context

- Purchase happens off-app: the customer buys a voucher in a shop on 小红书, 淘宝, 闲鱼, or 抖音, receives a UUID code, and enters it on the site.
- Customer flow: enter code and accept the user agreement → upload two frontal photos → pick a series and pose → generate → optionally adjust with a text prompt or regenerate from the original photos → choose the output ratio, a background color, add stickers, save the composed PNG from the browser. Each new pose generation consumes one image from the voucher's fixed quota; prompt adjustments and regeneration use the image's modification budget instead.
- Portrait flow: enter a portrait voucher code → upload one frontal photo → pick one of four styles (商务正装、商务休闲、白衬衫、高级感肖像) → generate a transparent upper-body portrait → choose a background color and a 3:4 or 1:1 ratio in the same editor, then save. Prompt adjustments consume the image's modification budget; there is no regenerate action in this flow.
- The studio route rejects a valid code until the agreement has been accepted. Acceptance records the time, IP, country, and user agent on the voucher; every generation or regeneration start is appended to a permanent log with the voucher, kind, series, pose, ratio, and request metadata for dispute handling.
- Background color and stickers are composed entirely in the browser on a canvas. Prompt-based adjustments and full regeneration happen on the server and replace the current transparent PNG while keeping earlier versions selectable as history; both consume the per-image modification count configured when the voucher is created, not photo quota.
- If the couple does not look like themselves, the UI recommends regenerating from the original photos instead of prompt editing.
- Uploaded portraits are downscaled in the browser (long edge ≤ 2048 px) and sent for generation only; they are not stored. Generated PNGs are referenced by their Ark URL and their records expire after 24 hours.
- Operations: the admin console creates batches of 1–100 codes, each with 1–100 images and a per-image modification count, and records the distribution platform. It is protected by an API key.
- Poses come from six sketch series (经典婚纱、轻法式、现代喜嫁风、新中式-旗袍、新中式-秀禾、新中式-秀禾-轻松风), each a 5 × 4 sheet split into local images; the split script removes the printed numbers and grid lines, and the app reads the files from `image.chupian.date`.
- Runs on Cloudflare Workers with D1; local development is on port 5701.

## Capabilities and Constraints

- Wedding vouchers have a fixed image quota; multiple vouchers coexist. New-generation quota is reserved atomically and returned if generation fails. Each image also has a voucher-configured modification count shared by prompt edits and regeneration.
- Input is two frontal photos (JPG/PNG/WebP) and one pose from the series. The pose sketch supplies only the pose; the faces and wedding outfits are generated from the photos.
- Output is one portrait per pose at 2:3, generated with a prompt that prioritizes identity fidelity, then photographic realism (real skin, fabric, light; no text, watermarks, or logos), on a true transparent background. The background composer can export the final image at 2:3 or 3:4.
- The transparent PNG stays on Ark's URL and is read through the CORS proxy `proxy.yumus.cn` so the browser canvas can compose and export it without cross-origin taint.
- Generated image records expire after 24 hours, as does the Ark URL. Uploaded face photos are not persisted.
- Portrait vouchers use the `portrait` type and the second studio flow: one frontal photo plus a style, output as a transparent upper-body PNG at 3:4 generated with the same identity-first prompt rules; the editor composes backgrounds at 3:4 or 1:1.
- The interface is Simplified Chinese only. There is no account system or in-app payment.
- Undecided: pricing and when the portrait flow launches.

## Brand Commitments

- Name: 出片 (the package and repository are `photo-ai`). The voucher page also uses the secondary label “AI Wedding Studio”.
- Language: Simplified Chinese, addressed to the couple as “你们”. Existing copy is warm, plain-spoken, and promise-led (“把你们的故事，拍成婚纱照。”).
- Privacy promise, stated in the studio UI: uploaded photos are not saved and are used only for the current generation.
- No fabricated proof: the operator confirmed there are no cleared customer photos, reviews, buyer-show posts, or live listings to publish. Future work must not invent them.

## Evidence on Hand

- Pose library: six sketch series (20 poses each) served from `image.chupian.date`.
- The text wordmark “出片” and `public/favicon.svg`; no other brand assets are in the repository.
- Absent: customer samples, testimonials, reviews, press, pricing, and shop listings. None may be fabricated.

## Product Principles

1. **Likeness before beauty.** The customer must recognize themselves and their partner. Identity accuracy outranks aesthetic optimization; never flatten a real face into a generic AI face.
2. **Real photography is the bar.** Every result must read as a real camera photograph — real skin, fabric, light, and depth — not an illustration, 3D render, or beauty filter.
3. **The voucher is the product boundary.** No accounts, no in-app payment; keep the path from code to downloadable photo short and reliable on a phone.
4. **Privacy is a promise, not a setting.** Uploaded faces are never stored; generated work expires after 24 hours.
5. **Curate the catalog.** Poses are curated by the operator. Keep the choice bounded enough that every option can meet the quality bar.

## Accessibility & Inclusion

- Most customers use the product on a phone. Project standards: touch targets ≥ 44×44 px, nothing essential behind hover, no horizontal page scroll, controls clear of the bottom safe area, and native mobile file-input behavior.
- The interface is Chinese-only; no localization exists yet.
