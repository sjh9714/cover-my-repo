import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  return `<!doctype html><html><head><title>${name}</title><style>body { width: 1280px; height: 640px; }</style></head><body><h1>${name}</h1></body></html>`;
}

function fakeAgent(directory, { context, cursorStatus = 'Logged in', invalid = false, target }) {
  const log = join(directory, 'agent.log');
  const script = `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const name = process.argv[1].split('/').pop();
const statuses = { claude: '{"loggedIn":true}', codex: 'Logged in', 'cursor-agent': ${JSON.stringify(cursorStatus)} };
const target = ${JSON.stringify(target)};
const context = ${JSON.stringify(context)};
appendFileSync(${JSON.stringify(log)}, name + ' ' + args.join(' ') + '\\n');
if (['login status', 'auth status', 'status'].includes(args.join(' '))) {
  console.log(statuses[name]);
  process.exit(0);
}
const expected = {
  claude: '-p Read repo-context.md and skill/SKILL.md. Create editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory.',
  codex: 'exec --skip-git-repo-check Read repo-context.md and skill/SKILL.md. Create editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory.',
  'cursor-agent': '--print --force --output-format text Read repo-context.md and skill/SKILL.md. Create editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory.',
};
if (args.join(' ') !== expected[name] || process.cwd() === target || process.env.GIT_DIR || process.env.GIT_WORK_TREE || process.env.OPENAI_API_KEY || process.env.PWD) process.exit(20);
if (!existsSync('skill/references/mood-editorial.md') || !existsSync('skill/assets/examples/editorial-red-handed.html') || !existsSync('skill/scripts/check_card.py') || !readFileSync('repo-context.md', 'utf8').includes(context)) process.exit(21);
for (const name of ['editorial', 'poster', 'adaptive']) {
  writeFileSync(name + '.html', ${invalid ? "name === 'poster' ? '<!doctype html><html><head><title>poster</title></head><body><h1>poster</h1></body></html>' : '<!doctype html><html><head><title>' + name + '</title><style>body { width: 1280px; height: 640px; }</style></head><body><h1>' + name + '</h1></body></html>'" : "'<!doctype html><html><head><title>' + name + '</title><style>body { width: 1280px; height: 640px; }</style></head><body><h1>' + name + '</h1></body></html>'"});
}
`;
  for (const name of ['claude', 'codex', 'cursor-agent']) {
    const executable = join(directory, name);
    writeFileSync(executable, script);
    chmodSync(executable, 0o755);
  }
  return log;
}

function temporaryRepository(options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'cover-my-repo-test-'));
  mkdirSync(join(directory, 'bin'));
  const target = join(directory, 'target');
  mkdirSync(target);
  writeFileSync(join(target, 'README.md'), '# Target\nREADME facts');
  writeFileSync(join(target, 'package.json'), JSON.stringify({ name: 'target', description: 'local fallback facts' }));
  for (let index = 0; index < 201; index += 1) writeFileSync(join(target, `file-${index}`), '');
  const log = fakeAgent(join(directory, 'bin'), { context: options.context || 'remote metadata facts', cursorStatus: options.cursorStatus, invalid: options.invalid, target });
  return { directory, log, target };
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
  assert.equal(validateCardHtml(html('Card')), true);
  assert.throws(() => validateCardHtml('<html><body>Card</body>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><body>Card</body><head></head></html>'));
});

test('rejects card HTML with trailing garbage', () => {
  assert.throws(() => validateCardHtml(`${html('Card')}garbage`));
});

test('rejects complete cards that fail the generated card checker', () => {
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>body { width: 1280px; height: 640px; box-shadow: 1px 1px; }</style></head><body><h1>Card</h1></body></html>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>body { width: 640px; height: 1280px; }</style></head><body><h1>Card</h1></body></html>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>body { width: 1280px; height: 640px; }</style><link href="https://example.com/card.css"></head><body><h1>Card</h1></body></html>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>@import "https://example.com/card.css"; body { width: 1280px; height: 640px; }</style></head><body><h1>Card</h1></body></html>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>body { width: 1280px; height: 640px; }</style></head><body>Card</body></html>'));
});

test('prints help without a label-style colon', () => {
  const messages = [];
  main(['--help'], (message) => messages.push(message));
  assert.deepEqual(messages, [
    'Run cover-my-repo [owner/repo] [--agent auto|codex|claude|cursor] [--output <dir>] [--no-open]',
  ]);
});

test('parses Codex text and Claude JSON status while rejecting Cursor text status', async () => {
  for (const [agent, cursorStatus, accepted] of [
    ['codex', 'Not logged in', true],
    ['claude', 'Not logged in', true],
    ['cursor', 'Not logged in', false],
  ]) {
    const { directory, target } = temporaryRepository({ cursorStatus });
    try {
      const generation = generateCards({
        agent,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: `${agent}-cards`,
        repository: { owner: 'octo-org', repo: 'target' },
      });
      if (accepted) await generation;
      else await assert.rejects(generation, /No authenticated agent is available/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test('generates validated cards through each staged agent adapter', async () => {
  for (const agent of ['codex', 'claude', 'cursor']) {
    const { directory, log, target } = temporaryRepository();
    try {
      const output = await generateCards({
        agent,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts', language: 'JavaScript', license: { spdx_id: 'MIT' } }) }),
        output: `${agent}-cards`,
        repository: { owner: 'octo-org', repo: 'target' },
      });

      assert.deepEqual(output.map((path) => path.split('/').pop()), ['editorial.html', 'poster.html', 'adaptive.html']);
      assert.deepEqual(output.map((path) => readFileSync(path, 'utf8')), [html('editorial'), html('poster'), html('adaptive')]);
      assert.deepEqual(readFileSync(log, 'utf8').trim().split('\n').length, 2);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

test('does not copy any cards when one staged card is invalid', async () => {
  const { directory, target } = temporaryRepository({ context: 'local fallback facts', invalid: true });
  try {
    await assert.rejects(
      generateCards({
      agent: 'codex',
      cwd: target,
      env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
      fetch: async () => { throw new Error('offline'); },
      output: 'cards',
      repository: { owner: 'octo-org', repo: 'target' },
      }),
      /1280 by 640/,
    );
    assert.equal(existsSync(join(target, 'cards')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects parent-traversal output paths', async () => {
  const { directory, target } = temporaryRepository();
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: '../outside',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /Output directory must stay within the target repository/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects output symlinks that escape the target repository', async () => {
  const { directory, target } = temporaryRepository();
  const outside = join(directory, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(target, 'cards'));
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: 'cards',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /Output directory must stay within the target repository/,
    );
    assert.equal(existsSync(join(outside, 'editorial.html')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
