# Launch measurement

The verified baseline before v2 was 4 GitHub stars at 2026-08-20 23:24 KST.

| Checkpoint | Repository visitors | npm downloads | GitHub stars | Tracked referral visits | Confirmed uses |
| --- | --- | --- | --- | --- | --- |
| T0 at 2026-08-20 23:46 KST |  | 0 | 4 |  |  |
| T plus 24h |  |  |  |  |  |
| Before Reddit at 2026-08-21 23:39 KST | 36 unique |  | 5 |  | 0 |
| After Reddit at 2026-08-22 10:39 KST | 36 unique | pending | 5 | 1.6K Reddit views | 0 |
| Pre-final check at 2026-08-23 21:22 KST | 50 unique | 559 last-week downloads | 5 | 18 reported referrer uniques | 0 |
| Final check at 2026-08-23 23:46 KST |  |  |  |  |  |

## Decision gates

Continue when v2 earns at least 25 new GitHub stars, reaching 29 total, or 3 confirmed external uses within 72 hours.

Rework the positioning when v2 earns fewer than 10 new GitHub stars, remaining below 14 total, and has no confirmed use within 72 hours.

Between those outcomes, keep observing through day seven before deciding.

The final 72-hour decision is due at 2026-08-23 23:46 KST.

The pre-final checkpoint is already in the rework range. There has been no
external star since 2026-08-21 and no confirmed use in public code search. The
formal final row remains open until the scheduled time. npm download counters
are not counted as adoption because they do not identify a user or repository.

A confirmed use requires a public repository using a generated cover or a linked confirmation from its owner.

Tracked referral visits come from GitHub traffic referrers for the launch pages listed below. They measure visits, not causal star attribution.

## Release log

| Surface | URL | v2 update |
| --- | --- | --- |
| GitHub | https://github.com/sjh9714/cover-my-repo | Renamed and released |
| GitHub release | https://github.com/sjh9714/cover-my-repo/releases/tag/v2.0.2 | Security boundary release published |
| npm | https://www.npmjs.com/package/cover-my-repo | 0.1.3 published |
| Awesome AI Plugins | https://github.com/hashgraph-online/awesome-ai-plugins/pull/123 | Merged after source scan |
| GeekNews | https://news.hada.io/topic?id=32651#cid63827 | v2 comment live |
| Zenn | https://zenn.dev/sjh9714/articles/96a33c56dc5307 | Article updated in place |
| DEV | https://dev.to/sjh9714/your-ogimage-renders-tofu-cjk-safe-github-social-cards-written-by-your-coding-agent-1oon | Article updated in place |
| Product Hunt | https://www.producthunt.com/products/repo-cover?launch=cover-my-repo | Product details and maker comment updated |
| Reddit | https://www.reddit.com/r/coolgithubprojects/comments/1vtmaz0/i_made_a_cli_that_lets_codex_or_cursor_design/ | Visual link post live |
| Reddit ClaudeAI | https://www.reddit.com/r/ClaudeAI/comments/1vul8v4/a_reddit_comment_found_a_prompt_injection_hole_in/ | Security write-up public |

All five external updates were verified on their public pages by 2026-08-21 00:16 KST.

The r/ClaudeAI post was submitted at 2026-08-22 01:32 KST. It reached 2.1K
views with no visible reader comment and no star change. The earlier
r/coolgithubprojects post reached 527 views, a score of zero and one technical
thread that led to the security fixes. GitHub reported 168 unique clones across
the available traffic days, but repository search found no confirmed external
use, so clones are not counted as adoption.
