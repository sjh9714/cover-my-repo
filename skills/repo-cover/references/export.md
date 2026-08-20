# Export and install

## PNG

The card is already exact at 1280x640. Rasterize with the Chrome the
user already has, with no dependency.

```sh
# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1280,640 --virtual-time-budget=9000 \
  --screenshot=<repo>-cover.png "file://$PWD/<repo>-cover.html"
# Linux: replace the binary with google-chrome or chromium
```

`--virtual-time-budget` matters because without it the screenshot races the
Google Fonts load and ships fallback type.

## Where it goes

- On GitHub, open repo → Settings → General → Social preview and upload the PNG.
  This is the image GitHub serves for every link to the repo on X,
  Slack, Discord, etc.
- On websites, use `<meta property="og:image" content=".../cover.png">` plus
  `twitter:card = summary_large_image`.
- For a README hero, commit the PNG such as `assets/cover.png` and put it at
  the top of the README.

## Downscale check

X renders link cards at about 506px wide. In the squint test, the title must stay
readable at 40% size. The verifier warns when meta text is under 14px
or the title under 64px for long names.

## Keeping it fresh (bundled GitHub Action)

The card is static by design. If the repo's description changes, or the
user wants scheduled re-renders, the repo ships `action.yml`, a
composite Action that re-screenshots the committed card HTML in CI.
See the README "Keep it fresh" section for the copy-paste workflow.
