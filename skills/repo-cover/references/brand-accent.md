# Brand accents

When the user wants their brand color instead of the language color.

## Recipe

1. Ask for the color (hex) or take it from the site the user names.
2. Darken toward ink `#1D1A16` until it passes 4.5:1 on the mood's
   background, in steps of 2 percent. The blend is per RGB channel,
   `a + (b - a) * t`. On dark-field moods (poster deep, blueprint,
   terminal) lighten toward `#FFFFFF` instead.
3. Run `check_card.py`; the contrast check is the gate, not your eye.
4. Keep the ONE-accent rule. A second brand color goes unused; note it
   to the user rather than adding it.

## Worked example

Toss blue `#3182F6` on editorial paper fails at 3.53:1. Blending 14
percent toward ink gives `#2E71D2` at 4.52:1, visually still Toss blue.
The shipped `editorial-korean` example uses exactly this value.

## When to refuse

- Yellow and pastel brands cannot reach 4.5:1 on paper without turning
  muddy. Offer the poster mood (their color becomes the deep field, a
  lifted tint becomes the accent) instead of a darkened accent.
- Never place brand LOGOS on the card; the avatar slot is the only
  image, and only in editorial.
