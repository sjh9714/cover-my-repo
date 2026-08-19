# Mood: editorial (default)

Warm paper, a big Fraunces wordmark with an accent full stop, quiet mono
metadata, concentric arcs breathing in from the bottom-right corner.
Reads like a literary magazine masthead, not a generated banner.

## Tokens

```css
--paper:#FAF9F5; --ink:#1D1A16; --muted:#6B655C; --hair:#E3DFD7;
--accent: language color, darkened to >=4.5:1 on --paper;
```

## Skeleton

Copy `assets/examples/editorial-red-handed.html` and replace content.
Structure, top to bottom, all inside `.card { padding:118px 88px 0 }`:

1. `.eyebrow` — 9px accent dot + owner. IBM Plex Mono 500 15px,
   letter-spacing .22em, uppercase, `--muted`.
2. `.title` — repo name. Fraunces, weight 560, `font-variation-settings:
   'opsz' 144`, letter-spacing -.015em, line-height 1.04, margin-top 38px.
   Size from the name-length table in SKILL.md. Ends with
   `<span class="stop">.</span>` in the accent — the only accent period
   on the card.
3. `.desc` — Noto Sans KR stack, 29px/1.5, `--muted`, margin-top 34px,
   max-width 660px.
4. `.meta` — absolutely positioned bottom strip: `left:0; right:0;
   bottom:0; margin:0 88px; padding:22px 0 64px; background:var(--paper);
   border-top:1px solid var(--hair)`. The opaque background is mandatory:
   it is what stops the arcs at the rule. Items: 10px language dot in
   accent + language name, then license. Mono 500 15px, ls .14em,
   uppercase, gap 44px.

## Arcs

SVG 420x420 pinned to the card's bottom-right corner, behind the meta
strip. 4-6 `<circle>` centered at (420,420), stroke accent 2px, no fill.
Vary per repo so two cards never match: derive arc count (4 + hash % 3)
and radius step (56 + hash % 14, starting at r=84) from a hash of the
repo name. Opacities from the outside in: .5 .36 .26 .17 .11 .07.
No solid dot on the arcs — the title period is the single focal accent.

## Avatar (optional)

72px circle, `top:104px; right:88px`, 1px `--hair` outline offset 5px.
Base64 data URI only (`references/avatar.md`).

## CJK

If the description is CJK: 30px/1.6, `word-break:keep-all` (Korean),
see `references/cjk.md`.
