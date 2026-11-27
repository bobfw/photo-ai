# Product

<!-- impeccable:product-schema 1 -->

## Platform

web — Xiaohongshu minitool, an offline H5 zip loaded inside the Xiaohongshu app on phones.

## Users

Xiaohongshu users on a phone who want a fast portrait retouch and, when they already have a transparent-background portrait, a studio-style background without leaving the app. There is no account and no in-app payment.

## Product Purpose

人像出片棚 is a local portrait studio: choose a normal portrait or an already-transparent portrait, smooth skin and adjust tone, place the cutout on a clean studio background, then post a note or save the result. Success means the portrait still looks like the person and the tool feels native to Xiaohongshu.

## Positioning

A small, offline creation tool inside Xiaohongshu. It does not generate faces and does not remove backgrounds; it retouches the supplied portrait and gives already-cut-out images a new studio background. The photo never leaves the device.

## Operating Context

- At upload, choose 普通照片 or 透明底人像. Ordinary photos get beauty and a full-bleed export; transparent images open directly on the background tab.
- The home page selects the photo; a successful read opens the `/editor` hash route. The editor keeps the photo in memory, and opening `/editor` without a selected photo returns home.
- File input (`accept="image/*"`; the transparent option prefers PNG) → beauty sliders → for transparent images, background color, custom background image, light, grain, texture, scale and ratio → export.
- Export is a 1400px-wide JPEG; a transparent background exports as PNG. Ordinary photos keep the source aspect ratio.
- Save to album and post note use the container JS APIs when present; a normal browser shows an unsupported message.
- No accounts, no in-app payments, no network requests.

## Capabilities and Constraints

- Offline static zip, Chrome 61 / ES2017 baseline, classic scripts, no WASM, Worker or network, 10 MiB cap.
- No AI cutout or segmentation. The background tab belongs to the 透明底人像 upload choice; the app also detects alpha and enables it when a transparent image is uploaded as a normal photo. If the chosen transparent photo has no alpha, the app keeps the background settings but warns that the background will not show through. The portrait starts at 100% scale; shrinking it reveals more background.
- Photos are processed in memory only; nothing is uploaded.
- Simplified Chinese only; 44px touch targets; safe areas.

## Brand Commitments

- Name: 人像出片棚.
- Design language: Xiaohongshu App — white entry, black photo-first editor, signature red actions, rounded cards, red-underlined tabs, white bottom sheet.
- Privacy promise: “照片只在本机处理，不会上传”.

## Evidence on Hand

- No customer samples, reviews or live listings; do not fabricate them.

## Product Principles

1. Keep the portrait recognizable.
2. The background fill is only for transparent cutouts; never imply the tool removed a background.
3. Local by default.
4. Native Xiaohongshu feel over generic web styling.

## Accessibility & Inclusion

- Mobile-first; 44×44px targets; safe areas; contrast-checked text; visible keyboard focus; reduced motion.
