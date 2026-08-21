# Cover My Repo

**Give your GitHub repo a social preview worth clicking.**

[한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)

[![HOL Guard Scanner](https://img.shields.io/badge/HOL%20Guard-passing-00a67e)](https://github.com/hashgraph-online/hol-guard)

![Cover My Repo CLI demo](docs/cli-demo.gif)

## Run it

```sh
npx cover-my-repo owner/repo
```

Pass any public GitHub repository. The CLI detects an authenticated Codex or
Cursor CLI, creates three design options, renders them with your local Chrome,
and opens a comparison preview.

To use the repository in your current directory instead, run this inside it.

```sh
npx cover-my-repo
```

It uses no image model and sends no repository credentials.

Node.js 20 and Chrome are required. Upload stays manual under
**Settings → Social preview**, so nothing changes on GitHub without you.

![Five moods](docs/hero.png)

![A generator template compared with Cover My Repo](docs/compare.png)

## What you get

- three self-contained HTML options
- matching 1280x640 PNG files rendered by local Chrome
- a comparison page with full-size and feed-size previews
- deterministic checks for contrast, CJK line breaks, and canvas size

The CLI leaves the final GitHub upload to you.

## Repository data boundary

The design agent never receives README, issue, or raw manifest text. The
parent process supplies fixed placeholders and text lengths, then inserts the
HTML-escaped repository name and description after generation. Every card is
checked again before Chrome renders it.

## Five moods

Every example is a live page in the
[gallery](https://sjh9714.github.io/cover-my-repo/). Click through to view its
source.

| | |
|---|---|
| **editorial**. Warm paper, a Fraunces wordmark, and restrained corner arcs | ![editorial](skills/repo-cover/assets/examples/editorial-red-handed.png) |
| **poster**. A deep field mixed from the language color and a cropped initial | ![poster](skills/repo-cover/assets/examples/poster-openlogi.png) |
| **blueprint**. Navy grid, mono type, corner ticks, and a derived plate number | ![blueprint](skills/repo-cover/assets/examples/blueprint-macos-harness.png) |
| **gallery**. A museum wall label with centered, light serif type | ![gallery](skills/repo-cover/assets/examples/gallery-cumora.png) |
| **terminal**. The repo as a terminal session with window chrome and EXIT 0 | ![terminal](skills/repo-cover/assets/examples/terminal-freeze.png) |

The accent comes from the primary language. Layout details are seeded by the
repository name, so the options keep a shared system without becoming clones.

## Use it as an agent skill

The original `repo-cover` skill remains available for compatible agents. Its
internal name stays unchanged.

```sh
# Agent Skills CLI
npx skills add sjh9714/cover-my-repo

# Claude Code plugin marketplace
/plugin marketplace add sjh9714/cover-my-repo
/plugin install repo-cover@repo-cover

# Codex
codex plugin marketplace add sjh9714/cover-my-repo
codex plugin add repo-cover@repo-cover

# Pi
pi install https://github.com/sjh9714/cover-my-repo

# fx
/skills install sjh9714/cover-my-repo --skill repo-cover
```

Then ask your agent to make a social preview card for the repository.

## What the checker enforces

- one accent per card with WCAG contrast
- title size tiers from 132px to 64px
- a 110-character description budget, or 60 characters for CJK
- no shadows, gradients, glass effects, or emoji
- star counts off by default because they go stale

`skills/repo-cover/scripts/check_card.py` checks canvas size,
self-containment, contrast, CJK line breaking, and downscale legibility.

## CJK support

![Korean example](skills/repo-cover/assets/examples/editorial-korean.png)

Korean uses `word-break:keep-all` and Noto Sans KR. Japanese and Chinese use
Noto Sans JP and Noto Sans SC with their own line-breaking rules.

## Keep a card fresh

The bundled Action can render an existing HTML card again in CI.

```yaml
- uses: sjh9714/cover-my-repo@main
  with:
    card: assets/my-repo-cover.html
    output: cover.png
```

## When not to use it

- Use a diagram tool for charts or architecture diagrams.
- Use an image generator for a logo or mascot.
- Keep GitHub's default card when a private repository is never shared.

## License

MIT
