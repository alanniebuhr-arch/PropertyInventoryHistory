#!/usr/bin/env node
/**
 * Bump App Store / Play Store version numbers in app.json and package.json.
 *
 * Usage:
 *   node scripts/bump-store-version.mjs build          # ios build + android versionCode +1
 *   node scripts/bump-store-version.mjs patch        # 1.0.0 -> 1.0.1, reset build to 1
 *   node scripts/bump-store-version.mjs minor        # 1.0.1 -> 1.1.0, reset build to 1
 *   node scripts/bump-store-version.mjs major        # 1.1.0 -> 2.0.0, reset build to 1
 *   node scripts/bump-store-version.mjs set 1.2.0 3 # set marketing version + ios build
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(root, 'app.json');
const packagePath = join(root, 'package.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return { major: +match[1], minor: +match[2], patch: +match[3] };
}

function formatVersion(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

const [command, arg1, arg2] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/bump-store-version.mjs <build|patch|minor|major|set> [args]');
  process.exit(1);
}

const app = readJson(appPath);
const pkg = readJson(packagePath);
const expo = app.expo;

if (command === 'build') {
  const nextBuild = Number(expo.ios.buildNumber) + 1;
  expo.ios.buildNumber = String(nextBuild);
  expo.android.versionCode = Number(expo.android.versionCode) + 1;
} else if (command === 'set') {
  if (!arg1 || !/^\d+\.\d+\.\d+$/.test(arg1)) {
    throw new Error('set requires marketing version like 1.2.0');
  }
  expo.version = arg1;
  expo.ios.buildNumber = String(arg2 ? Number(arg2) : 1);
  expo.android.versionCode = arg2 ? Number(arg2) : 1;
} else if (command === 'patch' || command === 'minor' || command === 'major') {
  const parts = parseVersion(expo.version);
  if (command === 'patch') parts.patch += 1;
  if (command === 'minor') {
    parts.minor += 1;
    parts.patch = 0;
  }
  if (command === 'major') {
    parts.major += 1;
    parts.minor = 0;
    parts.patch = 0;
  }
  expo.version = formatVersion(parts);
  expo.ios.buildNumber = '1';
  expo.android.versionCode = 1;
} else {
  throw new Error(`Unknown command: ${command}`);
}

pkg.version = expo.version;
writeJson(appPath, app);
writeJson(packagePath, pkg);

console.log(`version (CFBundleShortVersionString): ${expo.version}`);
console.log(`ios.buildNumber (CFBundleVersion): ${expo.ios.buildNumber}`);
console.log(`android.versionCode: ${expo.android.versionCode}`);
