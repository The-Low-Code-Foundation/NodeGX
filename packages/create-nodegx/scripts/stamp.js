#!/usr/bin/env node
// OWN-036 (Richard, 2026-11-03): a learning that reaches the kit's skills reaches a new version of the package.
// `profiles/` is what `npm create nodegx` writes into a person's folder. `profiles.stamp.json` records the fingerprint
// of the `profiles/` that the current version shipped. Versions move in the kit's lockstep release cut
// (`chore(release): npm 0.2.x`, create-nodegx with @nodegx/mcp and the two wrappers), never here:
//   npm run stamp              the cut, after bumping the version: record this profiles/ as what that version ships
//   npm run stamp -- --check   say whether profiles/ changed since the stamped version (a cut is due); exit 0
//   npm run stamp -- --from <an extracted older package root> --version <v>   record what an older version shipped
// The package test fails when the version moved without a stamp, so a cut cannot ship skills nobody fingerprinted.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const STAMP = path.join(root, 'profiles.stamp.json');

/** sha256 over every file under <base>/profiles/, by relative path and content, in a fixed order. */
function fingerprint(base = root) {
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(base, rel), { withFileTypes: true })) {
      const next = path.posix.join(rel, e.name);
      if (e.isDirectory()) walk(next);
      else files.push(next);
    }
  };
  walk('profiles');
  const h = crypto.createHash('sha256');
  for (const f of files.sort()) h.update(`${f}\0`).update(fs.readFileSync(path.join(base, f))).update('\0');
  return h.digest('hex').slice(0, 16);
}

function readStamp() {
  try { return JSON.parse(fs.readFileSync(STAMP, 'utf8')); } catch { return null; }
}

/** What a reader needs in one line: is there anything in profiles/ that no published version carries yet? */
function status() {
  const stamp = readStamp();
  if (!stamp) return { due: true, line: 'skills: never stamped (run npm run stamp in packages/create-nodegx at the next cut)' };
  const due = stamp.fingerprint !== fingerprint();
  return { due, line: due ? `skills: changed since ${stamp.version} shipped — the next release cut carries them` : `skills: as ${stamp.version} shipped` };
}

module.exports = { fingerprint, readStamp, status, STAMP };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (n) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : undefined);
  if (argv.includes('--check')) {
    console.log(status().line);
    process.exit(0);
  }
  const from = opt('--from');
  const version = from ? opt('--version') : JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (!version) throw new Error('--from needs --version <the version that folder shipped>');
  const fp = fingerprint(from ? path.resolve(from) : root);
  fs.writeFileSync(STAMP, JSON.stringify({ version, fingerprint: fp }, null, 2) + '\n');
  console.log(`profiles/ ${fp} recorded as what ${version} ships.`);
}
