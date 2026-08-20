import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findChrome,
  main,
  parseOptions,
  parseRepository,
  selectAuthenticatedAgent,
  validateCardHtml,
  validatePngDimensions,
} from '../bin/cover-my-repo.mjs';

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
