# Mood terminal

The repo as a terminal session. A window frame with traffic-light dots,
a prompt line, the name as huge mono type with a block cursor, and an
EXIT 0 status bar. For CLIs, shells, and anything that lives in a
terminal.

## Tokens

```
bg = #16181D   window body = #1D2026   frame/bar = #23262D
text = #E6E3DC   dim = #8B8F98
accent = language color, LIGHTENED to >=4.5:1 on the window body
```

## Skeleton

Copy `assets/examples/terminal-freeze.html`. Everything sits inside a
`.win` frame inset 72px vertical, 96px horizontal, and radius 10.

1. `.bar`, 44px, three 12px `.dot` circles, centered `.wtitle`
   reading `owner/name · zsh` in mono 13px `dim`. Keep the class
   name `wtitle`; `title` is reserved for the h1.
2. `.prompt`, mono 18px `dim`, an accent `&#10095;` symbol, then a
   plausible command (`gh repo view owner/name`).
3. `.title`, the repo name. Mono 600, size = min(name-length tier,
   92px), followed by `<span class="cursor">`, a .5em x .9em accent
   block.
4. `.desc`, mono 21px/1.7 `dim`, max-width 880px, up to 3 lines.
5. `.status`, bottom strip inside the window with metas joined with
   `&middot;` uppercase on the left, `EXIT 0` on the right.

## Rules

- Mono everywhere, no serif, no sans.
- Accent appears exactly twice in the prompt symbol and cursor block.
- The window title and the command must use the real owner/name; no
  fictional paths.
- Only mood allowed to end without a period; the cursor is the
  terminal mark.
