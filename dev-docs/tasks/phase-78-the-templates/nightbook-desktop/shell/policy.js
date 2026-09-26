/**
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

module.exports = { adoptShippedPolicy, MARKER };
