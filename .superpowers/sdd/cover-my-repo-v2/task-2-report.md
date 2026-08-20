# Task 2 Report

## Implementation

- Added bounded local and public GitHub context collection.
- Staged the complete existing skill directory in an OS temporary directory.
- Ran one selected agent generation process in staging and required three valid HTML documents before copying any result.
- Added Codex, Claude, and Cursor CLI adapters with authentication-output checks.
- Removed credential-like environment values and target-directory variables before starting the agent.

## RED

```sh
node --test test/cover-my-repo.test.mjs
```

```text
SyntaxError
The requested module '../bin/cover-my-repo.mjs' does not provide an export named 'generateCards'
```

```sh
node --test --test-name-pattern='generates validated' test/cover-my-repo.test.mjs
```

```text
not ok 1 - generates validated cards through one staged fake agent process
error 'codex failed to generate cards'
```

The test made the inherited target `PWD` and GitHub token fail the fake agent. It passed only after staging removed both values.

```sh
node --test --test-name-pattern='non-authenticated zero-exit' test/cover-my-repo.test.mjs
```

```text
not ok 1 - treats non-authenticated zero-exit status as unavailable
error Expected rejection No authenticated agent is available
actual Error codex failed to generate cards
```

The empty zero-exit status initially counted as authenticated. The parser now requires affirmative authentication text and rejects negative text.

```sh
node --test --test-name-pattern='generates validated' test/cover-my-repo.test.mjs
```

```text
Expected login status and one generation command
Actual login status, auth status, status, and one generation command
```

An explicit `--agent codex` selection initially probed Claude and Cursor. It now runs only the selected CLI status command and its one generation command.

## GREEN

```sh
node --test --test-name-pattern='generates validated' test/cover-my-repo.test.mjs
```

```text
# tests 1
# pass 1
# fail 0
```

```sh
npm test
```

```text
# tests 13
# pass 13
# fail 0
```

```sh
git diff --check
```

```text
No output
```

## Self review

- Only the staged directory is the generation process working directory.
- The fake executable exercises the real process boundary and verifies staged skill assets, validated output, credential removal, and target path removal.
- Validation completes before the output directory is created so an invalid card leaves no copied result.
- An explicit agent selection probes only that CLI before the single generation process.

## Concern

No live agent account or model was called. The automated coverage uses the required fake executable.

## Fix Round 1

### RED

```sh
node --test test/cover-my-repo.test.mjs
```

```text
# tests 16
# pass 10
# fail 6
```

The failures covered a complete document accepted without card constraints, Claude JSON status rejected, invalid output copied, traversal accepted, and a symlink escape accepted.

```sh
node --test --test-name-pattern='complete cards' test/cover-my-repo.test.mjs
```

```text
not ok 1 - rejects complete cards that fail the generated card checker
error Missing expected exception
```

The final checker regression demonstrated that a CSS `@import` could bypass the external-resource restriction.

### GREEN

```sh
node --test --test-name-pattern='complete cards|Codex text|each staged|invalid|parent-traversal|symlinks' test/cover-my-repo.test.mjs
```

```text
# tests 6
# pass 6
# fail 0
```

```sh
npm test
```

```text
# tests 16
# pass 16
# fail 0
```

```sh
git diff --check
```

```text
No output
```

### Changes

- Claude accepts only JSON status with `loggedIn` set to true. Codex and Cursor retain text status parsing and Cursor zero-exit not-logged-in output is rejected.
- The HTML boundary requires 1280 by 640 CSS dimensions, an `h1`, no forbidden styles, and only Google Fonts external resources.
- Agent processes receive only path and local keyring-config variables. Test paths and fake behavior are embedded in the generated fake executables.
- Output rejects absolute and parent-traversal paths. It resolves the created output directory and rejects symlinks outside the real target directory before copying files.
- Fake Codex, Claude, and Cursor executables validate their real generation arguments.

## Fix Round 2

### Covering test file

`test/cover-my-repo.test.mjs`

### RED

```sh
node --test --test-name-pattern='complete cards|repository root' test/cover-my-repo.test.mjs
```

```text
# tests 2
# pass 0
# fail 2
```

The card checker accepted `img src=https://evil.example/card.png` without quotes. The output-root run rejected `--output .` with Output directory must stay within the target repository.

### GREEN

```sh
node --test --test-name-pattern='complete cards|repository root' test/cover-my-repo.test.mjs
```

```text
# tests 2
# pass 2
# fail 0
```

```sh
npm test
```

```text
# tests 17
# pass 17
# fail 0
```

```sh
git diff --check
```

```text
No output
```

### Changes

- External-resource matching accepts quoted and unquoted `href` and `src` syntax while retaining the Google Fonts host allowance.
- Exact real-path equality now counts as within the target repository. Parent traversal and output symlink escape checks remain unchanged.
