# Mood: blueprint

A technical drawing of the repo. Navy field, faint 32px grid, a hairline
frame with corner ticks, everything in IBM Plex Mono. The only mood with
an uppercase title. For infrastructure, CLI, and systems repos.

## Tokens

```
bg   = #10233B
line = rgba(214,228,244,.30)    // frame, ticks, rules
grid = rgba(214,228,244,.055)   // background grid lines
text = #E8F0FA                  // title
dim  = rgba(232,240,250,.62)    // everything else
accent = language color, LIGHTENED to >=4.5:1 on bg (dark field!)
```

## Skeleton

Copy `assets/examples/blueprint-macos-harness.html`. Inside
`.card { background:bg; padding:128px 96px 0; font-family:'IBM Plex Mono' }`:

1. Background grid: two `linear-gradient` layers, `background-size:32px
   32px` — the single allowed gradient use in this skill.
2. `.frame` — `position:absolute; inset:40px; border:1px solid line`.
3. Four `.corner` SVG ticks (24px L-shapes) rotated into each corner at
   inset 28px.
4. `.eyebrow` — flex space-between: owner on the left, `PLATE NNN` on
   the right. NNN = hash of the repo name % 900 + 100. Mono 500 15px,
   ls .22em, uppercase, `dim`.
5. `.title` — mono 600, UPPERCASE, size = min(name-length table, 88px),
   letter-spacing .01em, line-height 1.1, `text`. Ends with
   `<span class="stop">_</span>` in the accent — an underscore, not a
   period, echoing a cursor.
6. `.desc` — mono 400 22px/1.7, `dim`, max-width 700px, margin-top 32px.
   Up to 3 lines allowed in this mood (mono runs wide).
7. `.meta` — bottom strip at `bottom:68px`, margins 96px, border-top
   `line`, accent language dot, `dim` text.
8. `.dims` — `1280 × 640` annotation, mono 12px, `right:52px;
   bottom:46px`. Keep it; it is the signature detail.

## Rules

- Mono everywhere. No Fraunces, no sans, no italics.
- The grid must stay faint — raise opacity above .07 and the card dies.
- Accent appears exactly twice: title underscore, language dot.
