# Banner variant (1280x320)

A README hero banner. Same editorial language as the card, half the
height, no meta strip. Use when the user asks for a README banner,
hero image, or header instead of a social preview.

## Skeleton

Copy `assets/examples/banner-repo-cover.html`. Inside
`.card { width:1280px; height:320px; padding:64px 72px 0; overflow:hidden }` uses the following structure.

1. `.eyebrow`, an 8px accent dot + owner. Mono 500 13px, ls .22em,
   uppercase, `--muted`.
2. `.title`, the repo name. Fraunces 560, opsz 144, 72px fixed (the
   banner does not use the card size tiers; names over 20 chars drop
   to 56px), accent period.
3. `.desc`, one line only, 22px/1.4, max-width 760px. Budget 60
   characters (36 CJK).
4. Arcs pinned to the bottom-right corner of a 300x300 SVG. Count =
   3 + hash % 2, radii start at 64 and step by 48 + hash % 12,
   opacities .5 .3 .18 .1. Same hash as the editorial mood.

## Rules

- Everything else follows the editorial mood tokens and the SKILL.md
  hard rules. The checker accepts the 1280x320 canvas.
- No meta strip and no avatar. A banner is a masthead, not a spec
  sheet.
- In the README, place it as the first image, full width.
