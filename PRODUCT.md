# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Couples who buy a wedding-photo voucher on Chinese social commerce — 小红书, 淘宝, 闲鱼, or 抖音 — and redeem it on a phone. One voucher admits a couple: the flow expects a frontal photo of each partner. There is no account and no in-app payment; the voucher code is the only access credential.

The operator runs the product and handles customer support through the private admin console, creating voucher batches and marking which commerce platform each code went to.

## Product Purpose

出片 (photo-ai) is an AI wedding photography studio. A customer enters a voucher code, uploads one frontal photo of each partner, picks wedding styles from a curated library, and receives one photorealistic wedding photo per style in minutes.

Success means both partners recognize themselves in the result — identity accuracy outranks beautification — and the image reads as a real camera photograph rather than an AI render.

## Positioning

A voucher-gated AI studio for wedding photos: the customer chooses a real wedding-photography look and their own two faces are placed into it with likeness as the highest priority. Access is a prepaid code distributed through social commerce, and the style catalog is curated by the operator rather than open-prompt, so every result starts from a real photograph the customer would plausibly want.

## Operating Context

- Purchase happens off-app: the customer buys a voucher in a shop on 小红书, 淘宝, 闲鱼, or 抖音, receives a UUID code, and enters it on the site.
- Customer flow: enter code → upload two frontal photos → pick styles → generate → optionally describe edits → download. Each selected style reference produces one image, drawn from the voucher's fixed image quota.
- Each generated image can be edited up to five times with a text instruction. An edit replaces the current image and consumes an edit, not voucher quota.
- Uploaded portraits are downscaled in the browser (long edge ≤ 2048 px) and sent for generation only; they are not stored. Generated images are kept for 24 hours, then expire and are cleaned up.
- Operations: the admin console creates batches of 1–100 codes (1–100 images per voucher) and records the distribution platform. It is protected by an API key.
- Reference styles are curated from public photography portfolios: 14 Instagram posts and 2 weddingbook.studio sets, recorded with source URLs in `src/routes/wedding/-internal/services/groups.json`. The image files are local-only and gitignored; only the manifest is committed.
- Runs on Cloudflare Workers with D1 and R2; media is served from `/media`; local development is on port 5701.

## Capabilities and Constraints

- Wedding vouchers have a fixed image quota; multiple vouchers coexist. Quota is reserved atomically and returned if generation fails.
- Input is exactly two frontal photos (JPG/PNG/WebP) plus at least one reference style. The number of people in the output follows the reference image: a single-person reference yields a single-person photo even though two faces are uploaded.
- Output is one 3:4 portrait per selected reference, generated with a prompt that prioritizes identity fidelity, then photographic realism (real skin, fabric, light; no text, watermarks, or logos).
- Editing is free text per image, up to five times; identity and wedding attributes must survive the edit.
- Generated images and their database rows expire after 24 hours. Uploaded face photos are not persisted.
- Portrait (写真) vouchers exist as a type in the admin console, but the portrait generation flow is not wired up; the console states this.
- The interface is Simplified Chinese only. There is no account system or in-app payment.
- Undecided: permission status for the reference photos, pricing, and when the portrait flow launches.

## Brand Commitments

- Name: 出片 (the package and repository are `photo-ai`). The voucher page also uses the secondary label “AI Wedding Studio”.
- Language: Simplified Chinese, addressed to the couple as “你们”. Existing copy is warm, plain-spoken, and promise-led (“把你们的故事，拍成婚纱照。”).
- Privacy promise, stated in the studio UI: uploaded photos are not saved and are used only for the current generation.
- No fabricated proof: the operator confirmed there are no cleared customer photos, reviews, buyer-show posts, or live listings to publish. Future work must not invent them.

## Evidence on Hand

- Style library: 16 groups and 203 reference photos, listed in `src/routes/wedding/-internal/services/groups.json` with source URLs (14 Instagram posts and 2 weddingbook.studio portfolios). The image files live in `reference-images/` and are gitignored; the manifest is committed.
- The text wordmark “出片” and `public/favicon.svg`; no other brand assets are in the repository.
- Absent: customer samples, testimonials, reviews, press, pricing, and shop listings. None may be fabricated.

## Product Principles

1. **Likeness before beauty.** The customer must recognize themselves and their partner. Identity accuracy outranks aesthetic optimization; never flatten a real face into a generic AI face.
2. **Real photography is the bar.** Every result must read as a real camera photograph — real skin, fabric, light, and depth — not an illustration, 3D render, or beauty filter.
3. **The voucher is the product boundary.** No accounts, no in-app payment; keep the path from code to downloadable photo short and reliable on a phone.
4. **Privacy is a promise, not a setting.** Uploaded faces are never stored; generated work expires after 24 hours.
5. **Curate the catalog.** Styles are chosen from real photographs by the operator. Keep the choice bounded enough that every option can meet the quality bar.

## Accessibility & Inclusion

- Most customers use the product on a phone. Project standards: touch targets ≥ 44×44 px, nothing essential behind hover, no horizontal page scroll, controls clear of the bottom safe area, and native mobile file-input behavior.
- The interface is Chinese-only; no localization exists yet.
