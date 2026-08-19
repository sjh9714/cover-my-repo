# Mood: poster

A deep color field built from the repo's own accent, cream type, and the
repo's first letter as a giant cropped watermark. The loudest mood.
Gallery poster, not tech banner.

## Tokens

```
deep  = blend(accent, #14110D, 0.72)   // background field
lift  = blend(accent, #FFFFFF, 0.55)   // accent for period + meta dot
cream = #FAF6EE                        // all type
```

`blend(a, b, t)` mixes each RGB channel: `a + (b - a) * t`.

## Skeleton

Copy `assets/examples/poster-archify.html`. Structure inside
`.card { background:deep; padding:118px 88px 0; overflow:hidden }`:

1. `.glyph`, the first letter of the repo name, uppercase. Fraunces 600,
   660px, cream at opacity .07, positioned `right:-48px; bottom:-190px`
   so it crops off two edges. This is the per-repo variation: every
   repo gets a different letterform.
2. `.eyebrow`, the owner. Mono 500 15px, ls .22em, uppercase, cream at .72.
3. `.title`, as editorial (Fraunces 560, opsz 144) but cream, with the
   accent period in `lift`.
4. `.desc`, 29px/1.5, cream at .78, max-width 640px, margin-top 34px.
   Keep it to 2 lines; if it wraps to 3, cut words from the line, not
   the font size.
5. `.meta`, the bottom strip at `bottom:64px`, border-top
   `rgba(250,246,238,.22)`, cream at .85, meta dot in `lift`.

## Rules

- The watermark letter must touch at least two canvas edges. Never
  shrink it to fit; the crop is the composition.
- Nothing else decorative. Field + letter + type is the whole design.
- If `deep` fails 4.5:1 against cream (very light language colors),
  raise the blend t toward 0.8 until it passes.
