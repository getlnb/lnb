#!/usr/bin/env node
// Write the release version into every manifest that carries one.
// Called by @semantic-release/exec during `prepare`.
import { readFileSync, writeFileSync } from 'node:fs';

const version = process.argv[2];
if (!version) {
  console.error('usage: set-version.mjs <version>');
  process.exit(1);
}

const targets = [
  // [file, mutator]
  ['.claude-plugin/plugin.json', (j) => { j.version = version; }],
  ['.claude-plugin/marketplace.json', (j) => {
    for (const p of j.plugins ?? []) p.version = version;
  }],
];

for (const [file, mutate] of targets) {
  const raw = readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  mutate(json);
  // Match the repo's existing 2-space, newline-terminated style.
  writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
  console.log(`set version ${version} in ${file}`);
}
