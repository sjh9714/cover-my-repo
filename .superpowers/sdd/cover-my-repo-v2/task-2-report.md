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
