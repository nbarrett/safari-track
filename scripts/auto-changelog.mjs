#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const VERSION_FILE = join(ROOT, "src/lib/version.ts");

let lastBumpSha = "";
try {
  lastBumpSha = execSync(
    'git log --oneline --grep="^build.*bump version" -1 --format="%H"',
    { encoding: "utf8" },
  ).trim();
} catch {
  // no previous bump
}

let raw = "";
if (lastBumpSha) {
  raw = execSync(`git log --format="%s" ${lastBumpSha}..HEAD`, { encoding: "utf8" }).trim();
} else {
  raw = execSync('git log --format="%s"', { encoding: "utf8" }).trim();
}

if (!raw) {
  process.exit(0);
}

const lines = raw
  .split("\n")
  .filter((l) => l.length > 0)
  .filter((l) => !l.match(/^build.*bump version/));

if (lines.length === 0) {
  process.exit(0);
}

const CONVENTIONAL_RE = /^(feat|fix|refactor|style|build|ci|docs|test|chore)(?:\([^)]*\))?!?:\s*(.+)/;

const feats = [];
const fixes = [];
const others = [];
const seen = new Set();

for (const line of lines) {
  const match = line.match(CONVENTIONAL_RE);
  if (!match) continue;
  const type = match[1];
  const desc = match[2].trim();
  const capitalised = desc.charAt(0).toUpperCase() + desc.slice(1);
  if (seen.has(capitalised.toLowerCase())) continue;
  seen.add(capitalised.toLowerCase());

  if (type === "feat") feats.push(capitalised);
  else if (type === "fix") fixes.push(capitalised);
  else if (type === "refactor") others.push(capitalised);
}

if (feats.length === 0 && fixes.length === 0) {
  process.exit(0);
}

const content = readFileSync(VERSION_FILE, "utf8");
const versionMatch = content.match(/APP_VERSION = "(\d+)\.(\d+)\.(\d+)"/);
if (!versionMatch) {
  console.error("Could not parse current version from version.ts");
  process.exit(1);
}

let major = parseInt(versionMatch[1], 10);
let minor = parseInt(versionMatch[2], 10);
let patch = parseInt(versionMatch[3], 10);
const oldVersion = `${major}.${minor}.${patch}`;

if (feats.length > 0) {
  minor++;
  patch = 0;
} else {
  patch++;
}

const newVersion = `${major}.${minor}.${patch}`;

let title;
if (feats.length > 0 && fixes.length > 0) title = "New features and fixes";
else if (feats.length > 0) title = "New features";
else title = "Bug fixes";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const now = new Date();
const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

const changes = [...feats, ...fixes, ...others];
const changesLines = changes.map((c) => `      "${c.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}",`).join("\n");

const newEntry = [
  "  {",
  `    version: "${newVersion}",`,
  `    date: "${dateStr}",`,
  `    title: "${title}",`,
  "    changes: [",
  changesLines,
  "    ],",
  "  },",
].join("\n");

let updated = content.replace(
  /export const APP_VERSION = "[^"]*"/,
  `export const APP_VERSION = "${newVersion}"`,
);

updated = updated.replace(
  "export const CHANGELOG: ChangelogEntry[] = [\n",
  `export const CHANGELOG: ChangelogEntry[] = [\n${newEntry}\n`,
);

writeFileSync(VERSION_FILE, updated);

execSync(`git add "${VERSION_FILE}"`);
execSync(`git commit --no-verify -m "build: bump version to ${newVersion}"`);

console.log(`Auto-bumped version: ${oldVersion} \u2192 ${newVersion}`);
