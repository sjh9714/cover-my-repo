# Mood: gallery

A museum wall label. Pure white, everything centered, a light-weight
Fraunces wordmark, one short accent rule. The quietest mood, for
libraries, specs, documentation, and anything that wants to look
established rather than launched.

## Tokens

```css
background:#FFFFFF; --ink:#1D1A16; --muted:#6B655C;
--accent: language color, darkened to >=4.5:1 on white;
```

## Skeleton

Copy `assets/examples/gallery-cumora.html`. `.card` is a centered flex
column, `padding-top:126px`, `text-align:center`:

1. `.eyebrow`, the owner. Mono 500 14px, letter-spacing .3em (widest of
   all moods), uppercase, `--muted`.
2. `.title`, Fraunces weight 420 (light, this mood only), opsz 144,
   letter-spacing -.01em, margin-top 44px. Size from the name-length
   table. No accent period. The rule below carries the accent.
3. `.rule`, a 56x2px block in the accent, margin-top 40px.
4. `.desc`, 27px/1.55, `--muted`, max-width 760px, margin-top 36px.
5. `.meta`, centered flex at `bottom:64px`, gap 44px, mono 500 14px,
   ls .18em, uppercase, accent language dot. No border-top rule in
   this mood; whitespace does the separating.

## Rules

- Symmetry is the composition. Every element centered; no motifs, no
  avatar, no watermark.
- Weight 420 on the title is what separates this from editorial. Do not
  bold it.
- Accent appears exactly twice: the rule, the language dot.
