# Contributing to Cover My Repo

The fastest way to help, in order of value.

## Show a card

Open a [showcase issue](../../issues/new?template=showcase.yml) with a card
you made. Good ones get featured in the gallery with credit.

## Propose or build a mood

A mood is one reference file plus one or two examples. Read an existing
pair (`skills/repo-cover/references/mood-editorial.md` and its example)
to see the shape. Rules for a new mood.

- Every number pinned. Sizes, margins, opacities, accent placement.
- Distinct silhouette. If a thumbnail of your mood could be mistaken
  for an existing one, it is a variant, not a mood.
- Two shipped examples, both passing `skills/repo-cover/scripts/check_card.py`.
- Regenerate examples with `python3 scripts/build_examples.py` from the
  repo root and commit the output. CI diffs the generator against the
  checked-in files.

## Fix the checker

`skills/repo-cover/scripts/check_card.py` is stdlib-only and stays that
way. A new check needs a card that fails it and a card that passes.

## Ground rules

- One mood or one fix per PR.
- No new dependencies. The skill runs on Python stdlib and the Chrome
  the user already has.
- Match the prose style. Avoid em dashes and decorative punctuation.
