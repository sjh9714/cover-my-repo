# CJK typography

Cards with Korean, Japanese, or Chinese text are first-class here, not a
fallback. Latin titles + CJK descriptions is the common case (repo names
are ASCII); full-CJK titles also work.

## Font stacks

- Korean: `'Noto Sans KR', sans-serif`, already in the default embed.
- Japanese: swap the Google Fonts family to `Noto+Sans+JP`.
- Chinese: `Noto+Sans+SC` (or TC). Load only the family you need.
- Titles stay Fraunces for Latin names. A CJK repo name renders in the
  Noto family at the same size tier; drop `font-variation-settings`.

## Rules

- Description size gets +1px and line-height 1.6 (CJK glyphs read
  smaller at equal size next to Latin).
- Korean: `word-break:keep-all` so lines break between words, never
  inside them. Japanese/Chinese: default breaking is correct; do NOT
  use keep-all.
- Never letter-space CJK body text. The mono eyebrow may stay spaced
  only if it is ASCII.
- Character budget: 60 per card (vs 110 Latin). Two lines max still.
- Punctuation: Japanese and Chinese use their own marks (。 、 ·). Do
  not swap them for Latin periods. Korean orthography uses the Latin
  period and comma; do not force 。 into Korean text.

## Verification

`check_card.py` flags CJK text without `keep-all` (Korean), missing
Noto family in the stack, and over-budget descriptions.
