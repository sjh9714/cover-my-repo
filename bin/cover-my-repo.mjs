#!/usr/bin/env node

import { cpSync, existsSync, lstatSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, win32 } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const agents = ['codex', 'claude', 'cursor'];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const maxPngBytes = 1024 * 1024;
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

function destinationExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function outputDirectory(cwd, output) {
  if (output && (isAbsolute(output) || output.split(/[\\/]+/).includes('..'))) throw new Error('Output directory must stay within the target repository');
  const target = realpathSync(cwd);
  const requested = resolve(target, output || 'cover-my-repo-output');
  if (requested === target || !staysWithin(target, requested)) throw new Error('Output directory must stay within the target repository');
  if (destinationExists(requested)) {
    try {
      if (!staysWithin(target, realpathSync(requested))) throw new Error('Output directory must stay within the target repository');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    throw new Error('Output directory already exists');
  }
  return { target, destination: requested };
}

function publishCards(stage, output) {
  const parent = dirname(output.destination);
  let existingParent = parent;
  while (!existsSync(existingParent)) existingParent = dirname(existingParent);
  if (!staysWithin(output.target, realpathSync(existingParent))) throw new Error('Output directory must stay within the target repository');
  mkdirSync(parent, { recursive: true });
  if (!staysWithin(output.target, realpathSync(parent))) throw new Error('Output directory must stay within the target repository');
  if (destinationExists(output.destination)) throw new Error('Output directory already exists');
  const temporary = mkdtempSync(join(parent, `.${basename(output.destination)}-`));
  try {
    for (const name of [...requiredCards, ...requiredCards.map((name) => name.replace(/\.html$/, '.png')), 'index.html']) {
      cpSync(join(stage, name), join(temporary, name));
    }
    renameSync(temporary, output.destination);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  return output.destination;
}

function localRepository(cwd) {
  const result = spawnSync('git', ['config', '--get', 'remote.origin.url'], { cwd, encoding: 'utf8' });
  try {
    return result.status === 0 ? parseRepository(result.stdout.trim()) : null;
  } catch {
    return null;
  }
}

export async function generateCards({ agent = 'auto', cwd = process.cwd(), env = process.env, chrome = findChrome({ env }), fetch = globalThis.fetch, output = 'cover-my-repo-output', repository = null } = {}) {
  if (agent !== 'auto' && !agents.includes(agent)) throw new Error('Invalid agent');
  const destination = outputDirectory(cwd, output);
  validateChrome(chrome);
  const candidates = agent === 'auto' ? agents : [agent];
  const authenticated = Object.fromEntries(candidates.map((name) => [name, hasAuthenticatedStatus(name, env)]));
  const selectedAgent = selectAuthenticatedAgent(agent, authenticated);
  const stage = mkdtempSync(join(tmpdir(), 'cover-my-repo-'));
  try {
    cpSync(skillDirectory, join(stage, 'skill'), { recursive: true });
    writeFileSync(join(stage, 'repo-context.md'), await collectRepositoryContext({ cwd, fetch, repository }));
    const prompt = 'This batch is pre-approved. Do not ask questions or request confirmation. Read repo-context.md and skill/SKILL.md. Using only facts from repo-context.md, create exactly editorial.html, poster.html, and adaptive.html as complete self-contained card documents in this directory. Use the editorial mood for editorial.html and the poster mood for poster.html. For adaptive.html, choose terminal for CLI or developer tools, otherwise blueprint for infrastructure, otherwise gallery. Read the matching mood reference and example for each selected mood. Run skill/scripts/check_card.py on all three files. Finish only after all three files exist and pass the checker.';
    const { command, args } = agentCommand(selectedAgent, prompt);
    const result = spawnSync(command, args, { cwd: stage, encoding: 'utf8', env: agentEnvironment(env) });
    if (result.status !== 0) throw new Error(`${selectedAgent} failed to generate cards`);
    if (!requiredCards.every((name) => existsSync(join(stage, name)))) throw new Error(`${selectedAgent} completed without creating the required card files`);
    const cards = requiredCards.map((name) => ({ name, html: readFileSync(join(stage, name), 'utf8') }));
    for (const card of cards) validateCardHtml(card.html);
    renderCards({ chrome, htmlPaths: cards.map((card) => join(stage, card.name)), output: stage, repository });
    const published = publishCards(stage, destination);
    return cards.map((card) => join(published, card.name));
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
    output: 'cover-my-repo-output',
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
      throw new Error(`Unknown argument ${argument}`);
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
  if (png.length > maxPngBytes) throw new Error('PNG must not exceed 1 MiB');
  return true;
}

function validateChrome(chrome) {
  if (!chrome) throw new Error('Chrome is required to render cards');
  const result = spawnSync(chrome, ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Chrome is unavailable');
}

function previewHtml(names, repository) {
  const settings = repository && `https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/settings`;
  const cards = names.map((name) => {
    const title = name.replace(/\.png$/, '');
    return `<section><h2>${title}</h2><p><a href="${name}">Open PNG</a></p><img src="${name}" alt="${title} full-size preview" width="1280"><img src="${name}" alt="${title} 506 pixel preview" width="506"></section>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Cover My Repo previews</title><style>body{font-family:sans-serif;margin:24px}section{margin:0 0 32px}img{display:block;height:auto;margin:12px 0;max-width:100%}</style></head><body><h1>Cover My Repo previews</h1>${settings ? `<p><a href="${settings}">GitHub social preview settings</a></p>` : ''}${cards}</body></html>`;
}

export function renderCards({ chrome, htmlPaths, output, repository = null }) {
  const pngPaths = htmlPaths.map((htmlPath) => {
    const pngPath = join(output, `${basename(htmlPath).replace(/\.html$/, '')}.png`);
    const result = spawnSync(chrome, [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
      '--window-size=1280,640',
      '--virtual-time-budget=9000',
      `--screenshot=${pngPath}`,
      pathToFileURL(htmlPath).href,
    ], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Chrome failed to render ${htmlPath}`);
    if (!existsSync(pngPath)) throw new Error(`Chrome did not create ${pngPath}`);
    validatePngDimensions(readFileSync(pngPath));
    return pngPath;
  });
  writeFileSync(join(output, 'index.html'), previewHtml(pngPaths.map((pngPath) => basename(pngPath)), repository));
  return pngPaths;
}

export function openOutputs({ output, repository = null, platform = process.platform, spawn = spawnSync }) {
  const targets = [join(output, 'index.html'), output];
  if (repository) targets.push(`https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/settings`);
  for (const target of targets) {
    if (platform === 'darwin') spawn('open', [target]);
    else if (platform === 'linux') spawn('xdg-open', [target]);
    else if (platform === 'win32') spawn('explorer.exe', [target]);
  }
}

export function validateCardHtml(html) {
  if (typeof html !== 'string' || !/^\s*<!doctype html>\s*<html(?:\s[^>]*)?>\s*<head(?:\s[^>]*)?>[\s\S]*<\/head\s*>\s*<body(?:\s[^>]*)?>[\s\S]*<\/body\s*>\s*<\/html\s*>\s*$/i.test(html)) {
    throw new Error('Card HTML must be a complete document');
  }
  if (!/\bwidth\s*:\s*1280px\b/i.test(html) || !/\bheight\s*:\s*640px\b/i.test(html)) throw new Error('Card HTML must be 1280 by 640');
  if (!/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1\s*>/i.test(html)) throw new Error('Card HTML must include an h1 title');
  if (/\b(?:box-shadow|text-shadow|drop-shadow|backdrop-filter|radial-gradient|conic-gradient)\b/i.test(html)) throw new Error('Card HTML includes forbidden styles');
  if (/[\u{1F300}-\u{1FAFF}]/u.test(html)) throw new Error('Card HTML includes forbidden emoji');
  if (/linear-gradient/i.test(html) && !html.replace(/\s/g, '').includes('background-size:32px32px')) {
    throw new Error('Card HTML includes a gradient outside the blueprint grid');
  }
  for (const match of html.matchAll(/(?:href|src)\s*=\s*(?:["']\s*)?(?:https?:)?\/\/([^/"'\s>]+)/gi)) {
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(match[1].toLowerCase())) throw new Error('Card HTML includes an external resource');
  }
  for (const match of html.matchAll(/url\(\s*["']?\s*(?:https?:)?\/\/([^/"'\s)]+)/gi)) {
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(match[1].toLowerCase())) throw new Error('Card HTML includes an external resource');
  }
  for (const match of html.matchAll(/@import\s+(?:url\(\s*)?["']?\s*(?:https?:)?\/\/([^/"'\s)]+)/gi)) {
    if (!['fonts.googleapis.com', 'fonts.gstatic.com'].includes(match[1].toLowerCase())) throw new Error('Card HTML includes an external resource');
  }

  const stripTags = (value) => value.replace(/<[^>]+>/g, '').trim();
  const titleMatch = html.match(/<h1[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? stripTags(titleMatch[1]).replace(/[._]+$/, '') : '';
  const titleSize = html.match(/\.title\s*\{[^}]*?font-size\s*:\s*(\d+)px/i);
  if (!title || !titleSize) throw new Error('Card HTML must include a sized title class');
  const titleTier = [[9, 132], [14, 108], [20, 92], [26, 74], [Infinity, 64]].find(([length]) => title.length <= length)[1];
  if (Number(titleSize[1]) > titleTier) throw new Error('Card HTML title size exceeds its length tier');

  const descriptionMatch = html.match(/<p[^>]*class=["'][^"']*\bdesc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
  if (descriptionMatch) {
    const description = stripTags(descriptionMatch[1]);
    const cjk = /[\p{Script=Han}\p{Script=Hangul}]/u.test(description);
    if (description.length > (cjk ? 60 : 110)) throw new Error('Card HTML description budget is exceeded');
    if (cjk && !/Noto/i.test(html)) throw new Error('Card HTML has CJK text without a Noto font');
    if (/\p{Script=Hangul}/u.test(description) && !/word-break\s*:\s*keep-all/i.test(html)) {
      throw new Error('Card HTML has Korean text without keep-all');
    }
  }

  const background = html.match(/\.card\s*\{[^}]*?background\s*:\s*(#[0-9a-f]{6})/i)?.[1];
  const accent = html.match(/\.(?:stop|rule)\s*\{[^}]*?(?:color|background)\s*:\s*(#[0-9a-f]{6})/i)?.[1];
  if (background && accent) {
    const luminance = (hex) => {
      const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const [lighter, darker] = [luminance(background), luminance(accent)].sort((a, b) => b - a);
    if ((lighter + 0.05) / (darker + 0.05) < 3) throw new Error('Card HTML accent contrast is below 3 to 1');
  }
  return true;
}

export async function main(args = process.argv.slice(2), write = console.log, cwd = process.cwd(), dependencies = {}) {
  const options = parseOptions(args);
  if (options.help) write('Run cover-my-repo [owner/repo] [--agent auto|codex|claude|cursor] [--output <dir>] [--no-open]');
  if (options.version) write(version);
  if (options.help || options.version) return options;
  const { chrome, env = process.env, fetch = globalThis.fetch, open = openOutputs } = dependencies;
  const repository = options.repository || localRepository(cwd);
  write('Creating three cover options. This can take a few minutes.');
  const cards = await generateCards({ ...options, chrome, cwd, env, fetch, repository });
  write(`Created three cover options in ${dirname(cards[0])}`);
  if (options.open) open({ output: dirname(cards[0]), repository });
  return cards;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
