# Task 1 Report

## Implementation

- Added the Node 20 package entrypoint and one testable CLI module.
- Added standard-library tests for repository parsing, public options, agent selection, Chrome lookup, PNG dimensions, and complete card HTML.
- Preserved the Python skill and all existing examples.
- Added no generation, rendering, network, or browser-opening behavior.

## RED

```sh
node --test test/cover-my-repo.test.mjs
```

```text
Error [ERR_MODULE_NOT_FOUND]
Cannot find module '.../bin/cover-my-repo.mjs'
# tests 1
# pass 0
# fail 1
```

```sh
node --test test/cover-my-repo.test.mjs
```

```text
Expected values to be strictly equal
+ actual 'Google\\Chrome\\Application\\chrome.exe'
- expected undefined
# tests 8
# pass 7
# fail 1
```

## GREEN

```sh
node --test test/cover-my-repo.test.mjs
```

```text
# tests 8
# pass 8
# fail 0
```

```sh
npm test
```

```text
> node --test
# tests 8
# pass 8
# fail 0
```

```sh
node bin/cover-my-repo.mjs --help
node bin/cover-my-repo.mjs --version
npm pack --dry-run
```

```text
Run cover-my-repo [owner/repo] [--agent auto|codex|claude|cursor] [--output <dir>] [--no-open]
0.1.0
cover-my-repo-0.1.0.tgz
```

## Self Review

The review found one Windows Chrome lookup issue. Empty environment variables produced a relative path. The focused regression test failed first and the lookup now excludes those paths.

No unresolved concerns.

## Fix Round 1

### Changed Behavior

- Help begins with `Run` and has no label-style colon.
- Card HTML must have ordered document parts and end at `</html>` apart from whitespace.

### Test File

`test/cover-my-repo.test.mjs`

### RED

```sh
node --test test/cover-my-repo.test.mjs
```

```text
# tests 10
# pass 7
# fail 3
Missing expected exception for misordered and trailing card HTML
Expected help text did not match
```

### GREEN

```sh
node --test test/cover-my-repo.test.mjs
npm test
```

```text
# tests 10
# pass 10
# fail 0
```
