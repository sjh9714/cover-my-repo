---
name: repo-cover
description: >
  Design a GitHub social-preview card (og:image, 1280x640) for a repository.
  Use when the user asks for a social preview, repo cover, og image, link
  card, opengraph image, or README hero. Four editorial moods (editorial,
  poster, blueprint, gallery), CJK-first typography, one self-contained HTML
  file, deterministic checks, crisp PNG export. No image model needed.
license: MIT
---

# repo-cover

You design one 1280x640 social-preview card as a single self-contained HTML
file. You write the HTML yourself. There is no image model and no build
step. Quality comes from following the numbers below exactly.

## Workflow

1. **Gather facts.** From the target repo: owner, name, description,
   primary language, license (use the `spdx_id`). Prefer
   `gh api repos/<owner>/<name>` or the local checkout. Never invent a
   star count or license.
2. **Rewrite the description.** The card line is not the GitHub description
   verbatim. Compress it to one or two sentences, max 110 characters
   (CJK: max 60 characters), concrete nouns, no marketing adjectives.
   Show the user your line before rendering if they are present; in a
   non-interactive run, proceed and include the line in your report.
3. **Pick a mood.** Default `editorial`. Offer the other three only if the
   user asks for options. Read exactly ONE mood reference and ONE example:
   - `references/mood-editorial.md` + `assets/examples/editorial-red-handed.html`
   - `references/mood-poster.md` + `assets/examples/poster-archify.html`
   - `references/mood-blueprint.md` + `assets/examples/blueprint-macos-harness.html`
   - `references/mood-gallery.md` + `assets/examples/gallery-cumora.html`
   - `references/mood-terminal.md` + `assets/examples/terminal-freeze.html`
   Do not read renderer-free files "for context". Two files, then write.
   For a README hero banner instead of a card, read
   `references/banner.md` (1280x320, editorial language).
4. **Write `<repo>-cover.html`.** Copy the example's skeleton, replace
   content, apply the mood's rules. If the description or repo name
   contains CJK text, also read `references/cjk.md` first.
5. **Check.** Run `python3 scripts/check_card.py <file>`. Fix every FAIL,
   re-run, stop after two repair rounds and report remaining failures
   honestly.
6. **Export.** Follow `references/export.md` for the PNG and where to
   upload it (GitHub Settings → Social preview). If the user wants the
   card to update itself, point them to the bundled GitHub Action.

## Hard rules (all moods)

- Canvas exactly 1280x640. Margins 88px (blueprint: 96px).
- Follow the mood reference's numbers exactly. When you invent a
  coordinate the reference does not give, snap it to a 4px grid.
- ONE accent color per card, used only in the places the mood reference
  names. Default: the repo's primary-language color, darkened until it
  passes 4.5:1 contrast against the background (`check_card.py`
  verifies). No primary language (docs repos): use a brand color the
  user names, or slate `#46627F` in one-shot runs. For brand colors
  read `references/brand-accent.md`.
- Fonts only from Google Fonts: Fraunces, IBM Plex Mono, Noto Sans KR/JP/SC.
  Real fallback stacks always.
- Title size by name length: <=9 chars 132px, <=14 108px, <=20 92px,
  <=26 74px, longer 64px and allow two lines broken at a hyphen.
- Description: max 2 lines. No mid-word hyphen breaks. Wrap compound
  words in `white-space:nowrap` spans.
- Star counts are OFF by default. They go stale and embarrass small
  repos. Only include when the user explicitly asks; then format with
  thousands separators.
- Meta row fallback: show what exists (language, license). If both are
  missing, the single item is the repo URL without protocol.
- Owner avatar is optional. If used, inline it as a base64 data URI
  (`references/avatar.md`) so the file stays self-contained.
- Never: box-shadow, drop-shadow, glassmorphism, gradients (except the
  blueprint grid lines), emoji, more than 2 typefaces + 1 mono, dark
  background with neon cyan glow, centered Inter on a purple gradient.

## What this is not

- Not a screenshot beautifier, not a logo generator, not a slide tool.
- Not dynamic: the card is a static file. Freshness comes from
  re-rendering (the bundled Action), not from live data.
- If the user wants diagrams, recommend a diagram skill instead.
