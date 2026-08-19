# Avatar embedding

The card file must stay self-contained. A hotlinked avatar breaks in
og:image contexts and goes stale. Inline it:

```sh
curl -sL "https://github.com/<owner>.png?size=144" | base64
```

Then:

```html
<img class="avatar" src="data:image/png;base64,<...>" width="72" height="72">
```

Rules:

- 144px source for a 72px circle (2x for retina).
- Editorial mood only, `top:104px; right:88px`, `border-radius:50%`,
  1px `--hair` outline with 5px offset. Other moods do not take an
  avatar.
- Optional. Skip it when the avatar is an identicon. Identicons read
  as noise, not identity.
- Organization logos with white backgrounds sit fine on the paper
  token; do not add a background fill.
