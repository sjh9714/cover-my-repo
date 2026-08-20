#!/usr/bin/env node

import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, win32 } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const agents = ['codex', 'claude', 'cursor'];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const skillDirectory = resolve(moduleDirectory, '../skills/repo-cover');
const requiredCards = ['editorial.html', 'poster.html', 'adaptive.html'];

function boundedText(value, length) {
  return String(value ?? '').slice(0, length);
}

function readFileIfPresent(path) {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : '';
  } catch {
    return '';
  }
}

function localRepositoryFacts(cwd) {
  const manifestName = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod'].find((name) => existsSync(join(cwd, name)));
  const manifest = manifestName ? readFileIfPresent(join(cwd, manifestName)) : '';
  let packageFacts = {};
  if (manifestName === 'package.json') {
    try {
      packageFacts = JSON.parse(manifest);
    } catch {}
  }
  return {
    manifest: manifest ? { name: manifestName, content: boundedText(manifest, 6000) } : null,
    metadata: { description: packageFacts.description, name: packageFacts.name },
    paths: readdirSync(cwd, { withFileTypes: true }).slice(0, 200).map((entry) => boundedText(entry.name, 32)),
    readme: boundedText(readFileIfPresent(join(cwd, 'README.md')), 10000),
  };
}

async function githubFacts(repository, fetch) {
  if (!repository) return {};
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'cover-my-repo' };
  const baseUrl = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
  try {
    const metadataResponse = await fetch(baseUrl, { headers });
    const metadata = metadataResponse.ok ? await metadataResponse.json() : {};
    const readmeResponse = await fetch(`${baseUrl}/readme`, { headers });
    const readmeData = readmeResponse.ok ? await readmeResponse.json() : {};
    return {
      metadata: {
        description: metadata.description,
        language: metadata.language,
        license: metadata.license?.spdx_id,
        name: metadata.name,
      },
      readme: readmeData.content ? Buffer.from(readmeData.content, 'base64').toString('utf8') : '',
    };
  } catch {
    return {};
  }
}

export async function collectRepositoryContext({ cwd = process.cwd(), fetch = globalThis.fetch, repository = null } = {}) {
  const local = localRepositoryFacts(cwd);
  const github = await githubFacts(repository, fetch);
  return [
    '# Repository context',
    '## Metadata',
    boundedText(JSON.stringify({ ...local.metadata, ...github.metadata, repository }), 2000),
    '## README',
    boundedText(github.readme || local.readme, 10000),
    '## Manifest',
    local.manifest ? `${local.manifest.name}\n${local.manifest.content}` : '',
    '## Top-level paths',
    local.paths.join('\n'),
  ].join('\n');
}

function agentCommand(agent, prompt, status = false) {
  const argumentsByAgent = {
    claude: status ? ['auth', 'status'] : ['-p', prompt],
    codex: status ? ['login', 'status'] : ['exec', '--skip-git-repo-check', prompt],
    cursor: status ? ['status'] : ['--print', '--force', '--output-format', 'text', prompt],
  };
  return {
    args: argumentsByAgent[agent],
    command: agent === 'cursor' ? 'cursor-agent' : agent,
  };
}

function agentEnvironment(env) {
  return Object.fromEntries(
    ['APPDATA', 'HOME', 'LOCALAPPDATA', 'PATH', 'USERPROFILE', 'XDG_CONFIG_HOME']
      .filter((name) => env[name])
      .map((name) => [name, env[name]]),
  );
}

function hasAuthenticatedStatus(agent, env) {
  const { command, args } = agentCommand(agent, '', true);
  const result = spawnSync(command, args, { encoding: 'utf8', env: agentEnvironment(env) });
  const status = `${result.stdout || ''}\n${result.stderr || ''}`;
  if (result.status !== 0) return false;
  if (agent === 'claude') {
    try {
      return JSON.parse(status).loggedIn === true;
    } catch {}
  }
  return /logged in|authenticated/i.test(status) && !/not (logged in|authenticated)|unauthenticated|login required/i.test(status);
}

function staysWithin(parent, child) {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(path));
}

function outputDirectory(cwd, output) {
  if (output && (isAbsolute(output) || output.split(/[\\/]+/).includes('..'))) throw new Error('Output directory must stay within the target repository');
  const target = realpathSync(cwd);
  const requested = resolve(target, output || 'cover-my-repo');
  if (!staysWithin(target, requested)) throw new Error('Output directory must stay within the target repository');
  mkdirSync(requested, { recursive: true });
  const actual = realpathSync(requested);
  if (!staysWithin(target, actual)) throw new Error('Output directory must stay within the target repository');
  return actual;
}

function localRepository(cwd) {
  const result = spawnSync('git', ['config', '--get', 'remote.origin.url'], { cwd, encoding: 'utf8' });
  try {
    return result.status === 0 ? parseRepository(result.stdout.trim()) : null;
  } catch {
    return null;
  }
}

export async function generateCards({ agent = 'auto', cwd = process.cwd(), env = process.env, fetch = globalThis.fetch, output = null, repository = null } = {}) {
  if (agent !== 'auto' && !agents.includes(agent)) throw new Error('Invalid agent');
  const candidates = agent === 'auto' ? agents : [agent];
  const authenticated = Object.fromEntries(candidates.map((name) => [name, hasAuthenticatedStatus(name, env)]));
  const selectedAgent = selectAuthenticatedAgent(agent, authenticated);
  const stage = mkdtempSync(join(tmpdir(), 'cover-my-repo-'));
  try {
    cpSync(skillDirectory, join(stage, 'skill'), { recursive: true });
    writeFileSync(join(stage, 'repo-context.md'), await collectRepositoryContext({ cwd, fetch, repository }));
    const prompt = 'Read repo-context.md and skill/SKILL.md. Create editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory.';
    const { command, args } = agentCommand(selectedAgent, prompt);
    const result = spawnSync(command, args, { cwd: stage, encoding: 'utf8', env: agentEnvironment(env) });
    if (result.status !== 0) throw new Error(`${selectedAgent} failed to generate cards`);
    const cards = requiredCards.map((name) => ({ name, html: readFileSync(join(stage, name), 'utf8') }));
    for (const card of cards) validateCardHtml(card.html);
    const destination = outputDirectory(cwd, output);
    for (const card of cards) writeFileSync(join(destination, card.name), card.html);
    return cards.map((card) => join(destination, card.name));
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

export function parseRepository(value) {
  if (typeof value !== 'string') throw new Error('Repository must be a string');

  const match = value.match(
    /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)?([^/\s:]+)\/([^/\s]+?)(?:\.git)?\/?$/,
  );
  if (!match || (!value.includes('github.com') && !/^[^/\s]+\/[^/\s]+$/.test(value))) {
    throw new Error('Repository must be a GitHub remote or owner/repo');
  }

  return { owner: match[1], repo: match[2] };
}

export function parseOptions(args) {
  const options = {
    agent: 'auto',
    help: false,
    open: true,
    output: null,
    repository: null,
    version: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--agent' || argument === '--output') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      index += 1;
      if (argument === '--agent') {
        if (value !== 'auto' && !agents.includes(value)) throw new Error('Invalid agent');
        options.agent = value;
      } else {
        options.output = value;
      }
    } else if (argument === '--no-open') {
      options.open = false;
    } else if (argument === '--help') {
      options.help = true;
    } else if (argument === '--version') {
      options.version = true;
    } else if (argument.startsWith('--') || options.repository) {
      throw new Error(`Unknown argument: ${argument}`);
    } else {
      options.repository = parseRepository(argument);
    }
  }

  return options;
}

export function selectAuthenticatedAgent(agent, authenticated) {
  if (agent !== 'auto' && !agents.includes(agent)) throw new Error('Invalid agent');
  const selected = agent === 'auto' ? agents.find((name) => authenticated[name]) : agent;
  if (!selected || !authenticated[selected]) throw new Error('No authenticated agent is available');
  return selected;
}

export function findChrome({ platform = process.platform, env = process.env, exists = existsSync } = {}) {
  const locations = {
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: [
      env.CHROME_PATH,
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ],
    win32: [
      env.CHROME_PATH,
      env.PROGRAMFILES && win32.join(env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      env['PROGRAMFILES(X86)'] && win32.join(env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
      env.LOCALAPPDATA && win32.join(env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
  };
  return locations[platform]?.find((location) => location && exists(location));
}

export function validatePngDimensions(png, width = 1280, height = 640) {
  if (!Buffer.isBuffer(png) || png.length < 24 || !png.subarray(0, 8).equals(pngSignature) || png.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('Invalid PNG');
  }
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) {
    throw new Error(`PNG must be ${width} by ${height}`);
  }
  return true;
}

export function validateCardHtml(html) {
  if (typeof html !== 'string' || !/^\s*<!doctype html>\s*<html(?:\s[^>]*)?>\s*<head(?:\s[^>]*)?>[\s\S]*<\/head\s*>\s*<body(?:\s[^>]*)?>[\s\S]*<\/body\s*>\s*<\/html\s*>\s*$/i.test(html)) {
    throw new Error('Card HTML must be a complete document');
  }
  if (!/\bwidth\s*:\s*1280px\b/i.test(html) || !/\bheight\s*:\s*640px\b/i.test(html)) throw new Error('Card HTML must be 1280 by 640');
  if (!/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1\s*>/i.test(html)) throw new Error('Card HTML must include an h1 title');
  if (/\b(?:box-shadow|text-shadow|drop-shadow|backdrop-filter|linear-gradient|radial-gradient|conic-gradient)\b/i.test(html)) throw new Error('Card HTML includes forbidden styles');
  for (const match of html.matchAll(/(?:href|src)\s*=\s*(?:["']\s*)?(?:https?:)?\/\/([^/"'\s>]+)/gi)) {
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(match[1].toLowerCase())) throw new Error('Card HTML includes an external resource');
  }
  for (const match of html.matchAll(/url\(\s*["']?\s*(?:https?:)?\/\/([^/"'\s)]+)/gi)) {
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(match[1].toLowerCase())) throw new Error('Card HTML includes an external resource');
  }
  for (const match of html.matchAll(/@import\s+(?:url\(\s*)?["']?\s*(?:https?:)?\/\/([^/"'\s)]+)/gi)) {
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(match[1].toLowerCase())) throw new Error('Card HTML includes an external resource');
  }
  return true;
}

export async function main(args = process.argv.slice(2), write = console.log, cwd = process.cwd()) {
  const options = parseOptions(args);
  if (options.help) write('Run cover-my-repo [owner/repo] [--agent auto|codex|claude|cursor] [--output <dir>] [--no-open]');
  if (options.version) write(version);
  if (options.help || options.version) return options;
  return generateCards({ ...options, cwd, repository: options.repository || localRepository(cwd) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
