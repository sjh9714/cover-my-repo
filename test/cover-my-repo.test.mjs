import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  findChrome,
  generateCards,
  main,
  openOutputs,
  parseOptions,
  parseRepository,
  renderCards,
  selectAuthenticatedAgent,
  validateCardHtml,
  validatePngDimensions,
} from '../bin/cover-my-repo.mjs';

const decisionCompletePrompt = 'This batch is pre-approved. Do not ask questions or request confirmation. Read repo-context.md and skill/SKILL.md. Using only facts from repo-context.md, create exactly editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory. Use the editorial mood for editorial.html and the poster mood for poster.html. For adaptive.html, choose terminal for CLI or developer tools, otherwise blueprint for infrastructure, otherwise gallery. Read the matching mood reference and example for each selected mood. Run skill/scripts/check_card.py on all three files. Finish only after all three files exist and pass the checker.';

function html(name) {
  return `<!doctype html><html><head><title>${name}</title><style>body { width: 1280px; height: 640px; } .title { font-size: 132px; }</style></head><body><h1 class="title">${name}</h1></body></html>`;
}

function fakeAgent(directory, { context, createsCards = true, cursorStatus = 'Logged in', invalid = false, target }) {
  const log = join(directory, 'agent.log');
  const script = `#!/usr/bin/env node
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const name = process.argv[1].split('/').pop();
const statuses = { claude: '{"loggedIn":true}', codex: 'Logged in', 'cursor-agent': ${JSON.stringify(cursorStatus)} };
const target = ${JSON.stringify(target)};
const context = ${JSON.stringify(context)};
const prompt = ${JSON.stringify(decisionCompletePrompt)};
appendFileSync(${JSON.stringify(log)}, name + ' ' + args.join(' ') + '\\n');
if (['login status', 'auth status', 'status'].includes(args.join(' '))) {
  console.log(statuses[name]);
  process.exit(0);
}
const expected = {
  claude: '-p ' + prompt,
  codex: 'exec --skip-git-repo-check ' + prompt,
  'cursor-agent': '--print --force --output-format text ' + prompt,
};
if (args.join(' ') !== expected[name] || process.cwd() === target || process.env.GIT_DIR || process.env.GIT_WORK_TREE || process.env.OPENAI_API_KEY || process.env.PWD) process.exit(20);
if (!existsSync('skill/references/mood-editorial.md') || !existsSync('skill/assets/examples/editorial-red-handed.html') || !existsSync('skill/scripts/check_card.py') || !readFileSync('repo-context.md', 'utf8').includes(context)) process.exit(21);
if (!${createsCards}) process.exit(0);
for (const name of ['editorial', 'poster', 'adaptive']) {
  writeFileSync(name + '.html', ${invalid ? "name === 'poster' ? '<!doctype html><html><head><title>poster</title><style>.title { font-size: 132px; }</style></head><body><h1 class=\"title\">poster</h1></body></html>' : '<!doctype html><html><head><title>' + name + '</title><style>body { width: 1280px; height: 640px; } .title { font-size: 132px; }</style></head><body><h1 class=\"title\">' + name + '</h1></body></html>'" : "'<!doctype html><html><head><title>' + name + '</title><style>body { width: 1280px; height: 640px; } .title { font-size: 132px; }</style></head><body><h1 class=\"title\">' + name + '</h1></body></html>'"});
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
  const log = fakeAgent(join(directory, 'bin'), { context: options.context || 'remote metadata facts', createsCards: options.createsCards, cursorStatus: options.cursorStatus, invalid: options.invalid, target });
  return { chrome: fakeChrome(join(directory, 'bin')).executable, directory, log, target };
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

function fakeChrome(directory, { fail = false, height = 640, missing = false, oversized = false, width = 1280 } = {}) {
  const log = join(directory, 'chrome.log');
  const executable = join(directory, 'chrome');
  writeFileSync(executable, `#!/usr/bin/env node
import { appendFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(log)}, args.join(' ') + '\\n');
if (args.includes('--version')) process.exit(0);
if (${fail}) process.exit(1);
const screenshot = args.find((arg) => arg.startsWith('--screenshot='));
if (!${missing} && screenshot) {
  const png = Buffer.alloc(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  png.writeUInt32BE(13, 8);
  png.write('IHDR', 12);
  png.writeUInt32BE(${width}, 16);
  png.writeUInt32BE(${height}, 20);
  if (${oversized}) writeFileSync(screenshot.slice('--screenshot='.length), Buffer.concat([png, Buffer.alloc(1024 * 1024)]));
  else writeFileSync(screenshot.slice('--screenshot='.length), png);
}
`);
  chmodSync(executable, 0o755);
  return { executable, log };
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
  assert.throws(() => parseOptions(['--unknown']), { message: 'Unknown argument --unknown' });
  assert.equal(parseOptions([]).output, 'cover-my-repo-output');
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
  assert.throws(() => validatePngDimensions(Buffer.concat([pngHeader(1280, 640), Buffer.alloc(1024 * 1024)])));
});

test('renders all cards with Chrome flags and creates a comparison page', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cover-my-repo-render-'));
  try {
    const { executable, log } = fakeChrome(directory);
    const htmlPaths = ['editorial.html', 'poster.html', 'adaptive.html'].map((name) => {
      const path = join(directory, name);
      writeFileSync(path, html(name.slice(0, -5)));
      return path;
    });

    const pngPaths = renderCards({ chrome: executable, htmlPaths, output: directory, repository: { owner: 'octo-org', repo: 'target' } });

    assert.deepEqual(pngPaths.map((path) => path.split('/').pop()), ['editorial.png', 'poster.png', 'adaptive.png']);
    for (const path of pngPaths) assert.equal(validatePngDimensions(readFileSync(path)), true);
    const index = readFileSync(join(directory, 'index.html'), 'utf8');
    assert.match(index, /editorial\.png/);
    assert.match(index, /width="506"/);
    assert.match(index, /https:\/\/github\.com\/octo-org\/target\/settings/);
    const commands = readFileSync(log, 'utf8').trim().split('\n');
    assert.equal(commands.length, 3);
    for (const command of commands) {
      assert.match(command, /--headless=new/);
      assert.match(command, /--no-sandbox/);
      assert.match(command, /--disable-dev-shm-usage/);
      assert.match(command, /--disable-gpu/);
      assert.match(command, /--hide-scrollbars/);
      assert.match(command, /--window-size=1280,640/);
      assert.match(command, /--virtual-time-budget=9000/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects failed, missing, wrong-sized, and oversized Chrome renders', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cover-my-repo-render-'));
  try {
    const htmlPath = join(directory, 'editorial.html');
    writeFileSync(htmlPath, html('editorial'));
    for (const options of [{ fail: true }, { missing: true }, { width: 640 }, { oversized: true }]) {
      const { executable } = fakeChrome(directory, options);
      assert.throws(() => renderCards({ chrome: executable, htmlPaths: [htmlPath], output: directory }), /failed to render|did not create|PNG must/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('opens validated outputs with each supported platform command', () => {
  const calls = [];
  const spawn = (command, args) => calls.push([command, args]);
  const repository = { owner: 'octo-org', repo: 'target' };
  for (const [platform, command, args] of [
    ['darwin', 'open', ['/tmp/cards/index.html']],
    ['linux', 'xdg-open', ['/tmp/cards/index.html']],
    ['win32', 'explorer.exe', ['/tmp/cards/index.html']],
  ]) {
    calls.length = 0;
    openOutputs({ output: '/tmp/cards', platform, repository, spawn });
    assert.deepEqual(calls[0], [command, args]);
    assert.equal(calls.length, 3);
  }
});

test('opens hostile Windows targets as single explorer.exe arguments', () => {
  const output = join(tmpdir(), 'cards & echo hostile');
  const calls = [];
  openOutputs({
    output,
    platform: 'win32',
    repository: { owner: 'octo-org', repo: 'target' },
    spawn: (command, args) => calls.push([command, args]),
  });
  assert.deepEqual(calls, [
    ['explorer.exe', [join(output, 'index.html')]],
    ['explorer.exe', [output]],
    ['explorer.exe', ['https://github.com/octo-org/target/settings']],
  ]);
});

test('does not call an agent when Chrome is unavailable', async () => {
  const { directory, log, target } = temporaryRepository();
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome: null,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
      }),
      /Chrome is required/,
    );
    assert.equal(existsSync(log), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects a zero-exit agent that creates no required card files', async () => {
  const { chrome, directory, target } = temporaryRepository({ createsCards: false });
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: 'cards',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /codex completed without creating the required card files/,
    );
    assert.equal(existsSync(join(target, 'cards')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('leaves no final or temporary output directory after a failed render', async () => {
  const { directory, target } = temporaryRepository();
  try {
    const { executable } = fakeChrome(join(directory, 'bin'), { fail: true });
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome: executable,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: 'cards',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /failed to render/,
    );
    assert.equal(existsSync(join(target, 'cards')), false);
    assert.deepEqual(readdirSync(target).filter((name) => name.startsWith('.cards-')), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('renders cards end to end with a fake agent and real Chrome without opening', async () => {
  const { directory, log, target } = temporaryRepository();
  const opened = [];
  const messages = [];
  try {
    const cards = await main(
      ['octo-org/target', '--agent', 'codex', '--no-open'],
      (message) => messages.push(message),
      target,
      {
        chrome: findChrome(),
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        open: (...args) => opened.push(args),
      },
    );
    const output = join(target, 'cover-my-repo-output');
    assert.deepEqual(cards.map((path) => path.split('/').pop()), ['editorial.html', 'poster.html', 'adaptive.html']);
    for (const name of ['editorial.png', 'poster.png', 'adaptive.png']) {
      const path = join(output, name);
      assert.equal(validatePngDimensions(readFileSync(path)), true);
      assert.ok(statSync(path).size <= 1024 * 1024);
    }
    assert.match(readFileSync(join(output, 'index.html'), 'utf8'), /GitHub social preview settings/);
    assert.equal(opened.length, 0);
    assert.deepEqual(messages, [
      'Creating three cover options. This can take a few minutes.',
      `Created three cover options in ${realpathSync(output)}`,
    ]);
    assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>body { width: 1280px; height: 640px; }</style></head><body><h1>Card</h1><img src=https://evil.example/card.png></body></html>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>@import "https://example.com/card.css"; body { width: 1280px; height: 640px; }</style></head><body><h1>Card</h1></body></html>'));
  assert.throws(() => validateCardHtml('<!doctype html><html><head><title>Card</title><style>body { width: 1280px; height: 640px; }</style></head><body>Card</body></html>'));
});

test('mirrors the deterministic card checker without requiring Python', () => {
  const examples = join(import.meta.dirname, '..', 'skills', 'repo-cover', 'assets', 'examples');
  const editorial = readFileSync(join(examples, 'editorial-repo-cover.html'), 'utf8');
  const blueprint = readFileSync(join(examples, 'blueprint-macos-harness.html'), 'utf8');
  const korean = readFileSync(join(examples, 'editorial-korean.html'), 'utf8');

  assert.equal(validateCardHtml(editorial), true);
  assert.equal(validateCardHtml(blueprint), true);
  assert.throws(() => validateCardHtml(editorial.replace('font-size:108px', 'font-size:132px')), /title size/);
  assert.throws(() => validateCardHtml(editorial.replace('</p>', `${'x'.repeat(111)}</p>`)), /description budget/);
  assert.throws(() => validateCardHtml(editorial.replace('color:#B3382C', 'color:#FAF9F5')), /accent contrast/);
  assert.throws(() => validateCardHtml(editorial.replace('</p>', ' 🐙</p>')), /emoji/);
  assert.throws(() => validateCardHtml(korean.replaceAll('Noto', 'Arial')), /Noto font/);
  assert.throws(() => validateCardHtml(korean.replace('word-break:keep-all', 'word-break:normal')), /keep-all/);
  assert.throws(() => validateCardHtml(blueprint.replace('background-size:32px 32px', 'background-size:31px 31px')), /gradient/);
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
    const { chrome, directory, target } = temporaryRepository({ cursorStatus });
    try {
      const generation = generateCards({
        agent,
        chrome,
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
    const { chrome, directory, log, target } = temporaryRepository();
    try {
      const output = await generateCards({
        agent,
        chrome,
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
  const { chrome, directory, target } = temporaryRepository({ context: 'local fallback facts', invalid: true });
  try {
    await assert.rejects(
      generateCards({
      agent: 'codex',
      chrome,
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
  const { chrome, directory, target } = temporaryRepository();
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome,
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

test('rejects the repository root as the output directory', async () => {
  const { chrome, directory, target } = temporaryRepository();
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: '.',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /Output directory must stay within the target repository/,
    );
    assert.equal(existsSync(join(target, 'editorial.html')), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects an existing output directory', async () => {
  const { chrome, directory, target } = temporaryRepository();
  try {
    mkdirSync(join(target, 'cards'));
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: 'cards',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /Output directory already exists/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects a broken output symlink', async () => {
  const { chrome, directory, target } = temporaryRepository();
  try {
    symlinkSync(join(directory, 'missing'), join(target, 'cards'));
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome,
        cwd: target,
        env: { PATH: `${join(directory, 'bin')}:${process.env.PATH}` },
        fetch: async () => ({ ok: true, json: async () => ({ description: 'remote metadata facts' }) }),
        output: 'cards',
        repository: { owner: 'octo-org', repo: 'target' },
      }),
      /Output directory already exists/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects output symlinks that escape the target repository', async () => {
  const { chrome, directory, target } = temporaryRepository();
  const outside = join(directory, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(target, 'cards'));
  try {
    await assert.rejects(
      generateCards({
        agent: 'codex',
        chrome,
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
