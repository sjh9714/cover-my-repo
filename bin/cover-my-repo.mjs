#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { win32 } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');
const agents = ['codex', 'claude', 'cursor'];
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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
  return true;
}

export function main(args = process.argv.slice(2), write = console.log) {
  const options = parseOptions(args);
  if (options.help) write('Run cover-my-repo [owner/repo] [--agent auto|codex|claude|cursor] [--output <dir>] [--no-open]');
  if (options.version) write(version);
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
