/**
 * Forked from Nightbook's shell (TPL-011-DESKTOP §12) for P105 CG-004, unchanged in behaviour.
 *
 * An app version owns its policy. Nobody edits it on the tablet (the backend runs with --no-admin),
 * and the backend only ever installs a policy into a data folder that has NONE
 * (nodegx-backend/src/security/projectPolicy.ts — right for a backend someone configured, wrong for
 * an app whose next version adds a collection). Found 2026-09-26 before it shipped: installer 0.0.2
 * over 0.0.1 would have kept the todo list's rules and refused every write to 0.0.2's JournalPage.
 *
 * So, before the backend starts: when the policy this version ships differs from the one this data
 * folder last took, the installed one is kept beside it (never deleted) and moved out of the way,
 * and the backend installs the shipped one. A marker file names the shipped policy last taken, so
 * an unchanged version never touches it again.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const MARKER = 'app-policy.sha256';

/**
 * The policy the shell ships for an app that brings NONE (P105 s3): the garden template has no backend and no
 * `nodegx.security.json` — the family lives in the page's localStorage. Without a policy the backend mints
 * `defaultSecurityConfig()`, which is `devOpen: true` (row ACLs off on the loopback) and `signup: public`: a door any
 * program on the tablet could write through, for nothing the game uses. So the shell's backend is CLOSED: every rule
 * `nobody`, no collections, no functions, no files, no signup. It is a legal policy by the backend's own validator
 * (`validateSecurityConfig`, measured 2026-09-28: 0 errors) and it gives the upgrade drive a shipped policy to adopt.
 */
const CLOSED_POLICY = Object.freeze({
  version: 1,
  devOpen: false,
  defaults: { permissions: { find: 'nobody', get: 'nobody', create: 'nobody', update: 'nobody', delete: 'nobody' }, creatorOwns: true },
  collections: {},
  functions: {},
  files: { upload: 'nobody', read: 'nobody', delete: 'nobody' },
  signup: 'nobody'
});

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {{ shipped: string, dataDir: string, version: string, now?: () => Date }} o
 * @returns {{ action: 'none' | 'first' | 'same' | 'replaced', keptAs?: string }}
 */
function adoptShippedPolicy({ shipped, dataDir, version, now = () => new Date() }) {
  if (!fs.existsSync(shipped)) return { action: 'none' };
  const hash = sha256(fs.readFileSync(shipped));
  const marker = path.join(dataDir, MARKER);
  const installed = path.join(dataDir, 'security.json');
  const last = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : null;
  if (last === hash) return { action: 'none' };
  fs.mkdirSync(dataDir, { recursive: true });
  let result = { action: 'first' };
  if (fs.existsSync(installed)) {
    let same = false;
    try {
      same = JSON.stringify(JSON.parse(fs.readFileSync(installed, 'utf8'))) === JSON.stringify(JSON.parse(fs.readFileSync(shipped, 'utf8')));
    } catch {
      same = false;
    }
    if (same) {
      result = { action: 'same' };
    } else {
      const stamp = now().toISOString().replace(/[:.]/g, '-');
      const keptAs = path.join(dataDir, `security.before-${version}-${stamp}.json`);
      fs.renameSync(installed, keptAs);
      result = { action: 'replaced', keptAs };
    }
  }
  fs.writeFileSync(marker, hash + '\n');
  return result;
}

/**
 * The app's cloud functions: every `<bundle>.workflow.json` it ships is copied into `<dataDir>/workflows/`, where the
 * backend loads them at start (WorkflowRunner.loadAll), and every OTHER bundle there is removed. A bundle is named
 * after the folder it was built in (`cloudBundleName`), so an upgrade built elsewhere ships a new name — kept beside
 * the old one, the backend would load both and serve two `savePage`s. This app's backend serves this app only, and a
 * bundle is code, not something she wrote, so nothing is lost. An app that ships no functions touches nothing.
 * @returns {{ installed: string[], removed: string[] }}
 */
function installFunctions({ from, dataDir }) {
  if (!fs.existsSync(from)) return { installed: [], removed: [] };
  const files = fs.readdirSync(from).filter((f) => f.endsWith('.workflow.json'));
  if (!files.length) return { installed: [], removed: [] };
  const to = path.join(dataDir, 'workflows');
  fs.mkdirSync(to, { recursive: true });
  const removed = fs.readdirSync(to).filter((f) => f.endsWith('.workflow.json') && !files.includes(f));
  for (const f of removed) fs.unlinkSync(path.join(to, f));
  for (const f of files) fs.copyFileSync(path.join(from, f), path.join(to, f));
  return { installed: files, removed };
}

module.exports = { adoptShippedPolicy, installFunctions, MARKER, CLOSED_POLICY };
