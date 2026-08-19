---
name: repo-cover
description: >
  Design a GitHub social-preview card (og:image, 1280x640) for a repository.
  Use when the user asks for a social preview, repo cover, og image, link
  card, opengraph image, or README hero. This flat file is the
  self-contained editorial-mood version for harnesses that discover a
  single skill file; the full four-mood skill lives in skills/repo-cover/
  at https://github.com/sjh9714/repo-cover
license: MIT
---

# repo-cover (flat, editorial mood)

You design one 1280x640 social-preview card as a single self-contained
HTML file. You write the HTML yourself. There is no image model and no
build step. Quality comes from following the numbers below exactly.

## Workflow

1. Gather facts about the target repo: owner, name, description, primary
   language, license (`spdx_id`). Never invent a star count or license.
2. Rewrite the description into one or two sentences, max 110 characters
   (CJK text: max 60 characters). Concrete nouns, no marketing adjectives.
3. Write `<repo>-cover.html` from the skeleton below.
4. Export the PNG:
   `chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1280,640 --virtual-time-budget=9000 --screenshot=<repo>-cover.png "file://$PWD/<repo>-cover.html"`
   (macOS binary: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`)
5. Tell the user to upload the PNG under GitHub Settings, Social preview.

## Tokens

paper `#FAF9F5`, ink `#1D1A16`, muted `#6B655C`, hairline `#E3DFD7`.
Accent = the repo's primary-language color, darkened by blending toward
ink until it reaches 4.5:1 contrast on paper. No primary language: use a
brand color the user names, or slate `#46627F`.

## Skeleton

```html
<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;500&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1280px;height:640px;overflow:hidden}
.card{position:relative;width:1280px;height:640px;background:#FAF9F5;padding:118px 88px 0}
.eyebrow{font:500 15px/1 'IBM Plex Mono',monospace;letter-spacing:.22em;
  text-transform:uppercase;color:#6B655C;display:flex;align-items:center;gap:12px}
.eyebrow .dot{width:9px;height:9px;border-radius:50%;background:ACCENT}
.title{font-family:'Fraunces',serif;font-weight:560;color:#1D1A16;font-size:TITLEpx;
  letter-spacing:-.015em;line-height:1.04;margin-top:38px;font-variation-settings:'opsz' 144}
.title .stop{color:ACCENT}
.desc{font:400 29px/1.5 'Noto Sans KR',sans-serif;color:#6B655C;margin-top:34px;max-width:660px}
.meta{position:absolute;left:0;right:0;bottom:0;background:#FAF9F5;
  margin:0 88px;padding:22px 0 64px;border-top:1px solid #E3DFD7;
  display:flex;gap:44px;font:500 15px/1 'IBM Plex Mono',monospace;
  letter-spacing:.14em;text-transform:uppercase;color:#6B655C}
.arcs{position:absolute;right:0;bottom:0}
</style></head><body><div class="card">
<svg class="arcs" width="420" height="420" viewBox="0 0 420 420" fill="none">
<g stroke="ACCENT" stroke-width="2"><!-- arcs, see rules --></g></svg>
<div class="eyebrow"><span class="dot"></span>OWNER</div>
<h1 class="title">NAME<span class="stop">.</span></h1>
<p class="desc">DESCRIPTION</p>
<div class="meta"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:ACCENT;margin-right:10px;vertical-align:-1px"></span>LANGUAGE</span><span>LICENSE</span></div>
</div></body></html>
```

## Hard rules

- Title size by name length: up to 9 chars 132px, up to 14 108px, up to
  20 92px, up to 26 74px, longer 64px on two lines broken at a hyphen.
- Arcs: hash = first 8 hex digits of sha256(repo name) as an integer.
  Circle count = 4 + hash % 3, all centered at (420,420), radii start at
  84 and step by 56 + hash % 14. Opacities from the innermost circle
  outward: .5 .36 .26 .17 .11 .07. The opaque meta strip must cover them
  at the rule.
- One accent color, exactly four places: eyebrow dot, title period, arc
  strokes, meta language dot.
- Description: max 2 lines. Wrap compound words in
  `<span style="white-space:nowrap">` so hyphens never break mid-word.
- Korean text: 30px, line-height 1.6, `word-break:keep-all`. Japanese
  and Chinese: default breaking, swap the Google Fonts family to
  Noto Sans JP or SC. Never letter-space CJK body text.
- Star counts stay off unless the user asks. Meta row shows what exists
  (language, license); if both are missing, show the repo URL without
  protocol as the single item.
- Never: box-shadow, drop-shadow, gradients, glassmorphism, emoji.

## Self-check before delivering

- Canvas exactly 1280x640, only fonts.googleapis.com external.
- Accent contrast at least 4.5:1 on paper (compute WCAG luminance).
- Title size matches the tier for its length.
- Description within its character budget, no mid-word hyphen breaks.
- Korean present implies keep-all present.

For the poster, blueprint, and gallery moods, the deterministic checker
script, shipped examples, and a live gallery, see
https://github.com/sjh9714/repo-cover
