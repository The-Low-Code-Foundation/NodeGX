#!/usr/bin/env node
/**
 * BRING A BACKEND THAT ALREADY HOLDS DATA UP TO THIS TEMPLATE'S SCHEMA AND POLICY (TASK-L191).
 *
 *   node tools/update-backend.mjs --backend <url> --token <admin>            show what would change
 *   node tools/update-backend.mjs --backend <url> --token <admin> --apply    change it
 *
 * setup-backend.mjs and setup-production.mjs both REFUSE a backend holding rows,
 * on purpose (L67) — they build one from empty. A live backend gaining a
 * collection (sprint 55's LessonDraft) or a rule (its eight functions) needs the
 * other half, and until now the redeploy recipe had none: the policy applied at
 * a backend's first start is the policy it keeps, and a function deployed later
 * with no rule runs for any signed-in caller (deploy-functions now refuses that).
 *
 * ADDITIONS ONLY. The schema goes through the backend's own diff first; anything
 * it marks destructive — a dropped table, a dropped column, a changed type — is
 * refused here, with the diff printed, and nothing is applied. Dropping data is
 * never something this tool does (no product feature deletes, sprint 34 §5.6).
 * The policy is replaced with nodegx.security.json whole, then read back and
 * compared, because "applied" is a claim and the backend's answer is the evidence.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminClient } from './lib/admin-client.mjs';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BACKEND = (arg('backend') || '').replace(/\/$/, '');
const TOKEN = arg('token') || process.env.NODEGX_ADMIN_TOKEN;
const APPLY = process.argv.includes('--apply');
if (!BACKEND || !TOKEN) {
  console.error('update-backend: pass --backend <url> --token <admin credential> [--apply].');
  process.exit(2);
}
const { call } = adminClient(BACKEND, TOKEN);
const schema = JSON.parse(readFileSync(join(TEMPLATE, 'backend', 'schema.json'), 'utf8'));
const policy = JSON.parse(readFileSync(join(TEMPLATE, 'nodegx.security.json'), 'utf8'));
const source = { tables: schema.tables };

const { diff, rendered } = await call('POST', '/admin/schema/diff', { source });
console.log(rendered || JSON.stringify(diff));
if (diff.destructive) {
  console.error('update-backend: REFUSED — the schema diff is destructive. This tool only adds; nothing was applied.');
  process.exit(1);
}
const live = (await call('GET', '/admin/permissions')).config;
const policyChanged = JSON.stringify(live) !== JSON.stringify(policy);
const missing = Object.keys(policy.functions || {}).filter((f) => !(live.functions || {})[f]);
console.log(`policy: ${policyChanged ? 'differs from nodegx.security.json' : 'already nodegx.security.json'}` +
  (missing.length ? `; no live rule for ${missing.join(', ')}` : ''));
if (!APPLY) {
  console.log('update-backend: nothing changed. Run again with --apply.');
  process.exit(0);
}
const tableChanges = diff.tables.added.length + diff.tables.changed.length;
if (tableChanges) await call('POST', '/admin/schema/apply', { source });
if (policyChanged) await call('PUT', '/admin/permissions', policy);

const after = await call('POST', '/admin/schema/diff', { source });
const back = (await call('GET', '/admin/permissions')).config;
const schemaOk = !after.diff.tables.added.length && !after.diff.tables.removed.length && !after.diff.tables.changed.length;
const policyOk = JSON.stringify(back) === JSON.stringify(policy);
if (!schemaOk || !policyOk) {
  console.error(`update-backend: applied, but read back ${schemaOk ? '' : 'a schema that still differs'}${!schemaOk && !policyOk ? ' and ' : ''}${policyOk ? '' : 'a policy that is not the file'}.`);
  process.exit(1);
}
console.log(`update-backend: done — ${tableChanges} table change(s), policy ${policyChanged ? 'replaced' : 'unchanged'}; both read back equal to the files. Now run deploy-functions.`);
