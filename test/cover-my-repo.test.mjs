import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  findChrome,
  generateCards,
  main,
  parseOptions,
  parseRepository,
  selectAuthenticatedAgent,
  validateCardHtml,
  validatePngDimensions,
} from '../bin/cover-my-repo.mjs';

function html(name) {
  return `<!doctype html><html><head><title>${name}</title></head><body>${name}</body></html>`;
}

function fakeAgent(directory) {
  const script = `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
if (process.env.FAKE_LOG) appendFileSync(process.env.FAKE_LOG, args.join(' ') + '\\n');
if (['login status', 'auth status', 'status'].includes(args.join(' '))) {
  if (process.env.FAKE_MODE !== 'empty-status') console.log(process.env.FAKE_MODE === 'not-logged-in' ? 'Not logged in' : 'Logged in');
  process.exit(0);
}
if (args[0] !== 'exec' || process.cwd() === process.env.FAKE_TARGET || process.env.GH_TOKEN || process.env.OPENAI_API_KEY || process.env.PWD === process.env.FAKE_TARGET) process.exit(20);
const context = readFileSync('repo-context.md', 'utf8');
if (!existsSync('skill/references/mood-editorial.md') || !existsSync('skill/assets/examples/editorial-red-handed.html') || !existsSync('skill/scripts/check_card.py') || !context.includes(process.env.FAKE_CONTEXT)) process.exit(21);
for (const name of ['editorial', 'poster', 'adaptive']) {
  writeFileSync(name + '.html', process.env.FAKE_MODE === 'invalid' && name === 'poster' ? '<html>' : '<!doctype html><html><head><title>' + name + '</title></head><body>' + name + '</body></html>');
}
`;
  for (const name of ['claude', 'codex', 'cursor-agent']) {
    const executable = join(directory, name);
    writeFileSync(executable, script);
    chmodSync(executable, 0o755);
  }
}

function temporaryRepository() {
  const directory = mkdtempSync(join(tmpdir(), 'cover-my-repo-test-'));
  mkdirSync(join(directory, 'bin'));
  mkdirSync(join(directory, 'target'));
  writeFileSync(join(directory, 'target', 'README.md'), '# Target\nREADME facts');
  writeFileSync(join(directory, 'target', 'package.json'), JSON.stringify({ name: 'target', description: 'local fallback facts' }));
  for (let index = 0; index < 201; index += 1) writeFileSync(join(directory, 'target', `file-${index}`), '');
  fakeAgent(join(directory, 'bin'));
  return directory;
}

function pngHeader(width, height) {
  const png = Buffer.alloc(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.writeUInt32BE(13, 8);
  png.write('IHDR', 12);
  png.writeUInt32BE(width, 16);
  png.writeUInt32BE(height, 20);
  return png;
}

test('parses GitHub HTTPS remotes', () => {
  assert.deepEqual(
    parseRepository('https://github.com/octo-org/hello-world.git'),
    { owner: 'octo-org', repo: 'hello-world' },
  );
});

test('parses GitHub SSH remotes', () => {
  assert.deepEqual(
    parseRepository('git@github.com:octo-org/hello-world.git'),
    { owner: 'octo-org', repo: 'hello-world' },
  );
});

test('parses positional owner and repository names', () => {
  assert.deepEqual(parseRepository('octo-org/hello-world'), {
    owner: 'octo-org',
    repo: 'hello-world',
  });
  assert.throws(() => parseRepository('https://gitlab.com/octo-org/hello-world'));
});

test('parses public options', () => {
  assert.deepEqual(
    parseOptions(['octo-org/hello-world', '--agent', 'claude', '--output', 'cards', '--no-open']),
    {
      agent: 'claude',
      help: false,
      open: false,
      output: 'cards',
      repository: { owner: 'octo-org', repo: 'hello-world' },
      version: false,
    },
  );
  assert.throws(() => parseOptions(['--agent', 'unknown']));
});

test('selects the requested authenticated agent or the first available agent', () => {
  assert.equal(selectAuthenticatedAgent('auto', { codex: false, claude: true, cursor: true }), 'claude');
  assert.equal(selectAuthenticatedAgent('cursor', { codex: true, claude: true, cursor: true }), 'cursor');
  assert.throws(() => selectAuthenticatedAgent('codex', { codex: false }));
});

test('finds Chrome in supported system locations', () => {
  assert.equal(
    findChrome({
      platform: 'darwin',
      exists: (path) => path === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    }),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  );
  assert.equal(
    findChrome({
      platform: 'linux',
      exists: (path) => path === '/usr/bin/google-chrome',
    }),
    '/usr/bin/google-chrome',
  );
  assert.equal(
    findChrome({
      platform: 'win32',
      env: { PROGRAMFILES: 'C:\\Program Files' },
      exists: (path) => path === 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    }),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  );
  assert.equal(findChrome({ platform: 'win32', env: {}, exists: () => true }), undefined);
});

test('validates 1280 by 640 PNG dimensions', () => {
  assert.equal(validatePngDimensions(pngHeader(1280, 640)), true);
  assert.throws(() => validatePngDimensions(pngHeader(640, 1280)));
});

test('rejects malformed card HTML', () => {
  assert.equal(
    validateCardHtml('<!doctype html><html><head><title>Card</title></head><body>Card</body></html>'),
    true,
  );
  assert.throws(() => validateCardHtml('<html><body>Card</body>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><body>Card</body><head></head></html>'));
});

test('rejects card HTML with trailing garbage', () => {
  assert.throws(() => validateCardHtml('<!doctype html><html><head></head><body>Card</body></html>garbage'));
});

test('prints help without a label-style colon', () => {
  const messages = [];
  main(['--help'], (message) => messages.push(message));
  assert.deepEqual(messages, [
    'Run cover-my-repo [owner/repo] [--agent auto|codex|claude|cursor] [--output <dir>] [--no-open]',
  ]);
});

test('generates validated cards through one staged fake agent process', async () => {
  const directory = temporaryRepository();
  const target = join(directory, 'target');
  const log = join(directory, 'agent.log');
  try {
    const fetch = async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts', language: 'JavaScript', license: { spdx_id: 'MIT' } }) });
    const output = await generateCards({
      agent: 'codex',
      cwd: target,
      env: { ...process.env, GH_TOKEN: 'must-not-reach-agent', PATH: `${join(directory, 'bin')}:${process.env.PATH}`, FAKE_CONTEXT: 'remote metadata facts', FAKE_LOG: log, FAKE_TARGET: target, OPENAI_API_KEY: 'must-not-reach-agent', PWD: target },
      fetch,
      output: 'cards',
      repository: { owner: 'octo-org', repo: 'target' },
    });

    assert.deepEqual(output.map((path) => path.split('/').pop()), ['editorial.html', 'poster.html', 'adaptive.html']);
    assert.deepEqual(output.map((path) => readFileSync(path, 'utf8')), [html('editorial'), html('poster'), html('adaptive')]);
    assert.deepEqual(readFileSync(join(target, 'cards', 'editorial.html'), 'utf8'), html('editorial'));
    assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n'), ['login status', 'exec --skip-git-repo-check Read repo-context.md and skill/SKILL.md. Create editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory.']);
    assert.equal(existsSync(join(target, 'skill')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('treats non-authenticated zero-exit status as unavailable', async () => {
  const directory = temporaryRepository();
  try {
    for (const FAKE_MODE of ['not-logged-in', 'empty-status']) {
      await assert.rejects(
        generateCards({
          agent: 'codex',
          cwd: join(directory, 'target'),
          env: { ...process.env, PATH: `${join(directory, 'bin')}:${process.env.PATH}`, FAKE_MODE },
          output: 'cards',
          repository: { owner: 'octo-org', repo: 'target' },
        }),
        /No authenticated agent is available/,
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('does not copy any cards when one staged card is invalid', async () => {
  const directory = temporaryRepository();
  const target = join(directory, 'target');
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        cwd: target,
        env: { ...process.env, PATH: `${join(directory, 'bin')}:${process.env.PATH}`, FAKE_MODE: 'invalid', FAKE_TARGET: target, FAKE_CONTEXT: 'local fallback facts' },
        fetch: async () => { throw new Error('offline'); },
        output: 'cards',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /Card HTML must be a complete document/,
    );
    assert.equal(existsSync(join(target, 'cards')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
