#!/bin/sh
# One monitoring tick for repo-cover. Prints a compact status block; the
# caller diffs against the previous snapshot to decide if anything changed.
set -eu
echo "== repo"
gh api repos/sjh9714/cover-my-repo --jq '"stars=\(.stargazers_count) forks=\(.forks_count) watchers=\(.subscribers_count) issues=\(.open_issues_count)"'
echo "== repo issues/PRs"
gh api 'repos/sjh9714/cover-my-repo/issues?state=all&per_page=10' --jq '.[] | "\(.number) \(.state) \(.comments)c \(.title)"' 2>/dev/null || true
echo "== list PRs"
for pr in "ComposioHQ/awesome-claude-skills 1683" "travisvn/awesome-claude-skills 1137" \
          "BehiSecc/awesome-claude-skills 593" "composio-community/awesome-codex-skills 241" \
          "heilcheng/awesome-agent-skills 428" "Dominic789654/awesome-deepseek-harness 173" \
          "dshworks/awesome-dsh-plugins 49" "awesome-opencode/awesome-opencode 621" \
          "spencerpauly/awesome-cursor-skills 51"; do
  repo=${pr% *}; num=${pr#* }
  gh api "repos/$repo/pulls/$num" --jq "\"$repo#$num \(.state) merged=\(.merged) comments=\(.comments + .review_comments)\"" 2>/dev/null || echo "$repo#$num FETCH_FAIL"
done
echo "== geeknews"
curl -sL --max-time 15 "https://news.hada.io/topic?id=32651" | grep -oE '[0-9]+ points?|댓글과 토론|comment_row' | sort | uniq -c | head -5 || true
