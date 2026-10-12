#!/usr/bin/env node
/**
 * CARRY THE PRIVACY NOTICE INTO THE GRAPH (TASK-L185 §1).
 *
 * `privacy/notice.en.json` is the ONE owner of the notice's words and its
 * version. Two things need them and neither can read that file at run time:
 *
 *   - the browser, which reads every word through Data/Strings — so this writes
 *     the `privacy` namespace into the GENERATED `str_privacy` node there, with
 *     `{{version}}` and `{{email}}` already filled in and the version itself as
 *     `privacy.version` for the acceptance gate in App;
 *   - the server, which compares an account's accepted version — so this
 *     rewrites the one constant between the NOTICE_VERSION markers in
 *     `__cloud__/shared/Notice`, the only place a cloud function knows it.
 *
 * Generated, never hand-edited, for the same reason as the kit's strings
 * (L160): two hand-kept copies of a version are how a notice changes on screen
 * and not on the server, so the page asks somebody to accept a version every
 * write then refuses. tools/check-privacy.mjs fails if they ever disagree.
 *
 * Run: node tools/build-privacy.mjs   (then redeploy the functions and the site)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOTICE = join(TEMPLATE, 'privacy', 'notice.en.json');
const STRINGS = join(TEMPLATE, 'components', 'Data', 'Strings', 'nodes.json');
const NOTICE_FN = join(TEMPLATE, 'components', '__cloud__', 'shared', 'Notice', 'nodes.json');

const fail = (m) => { console.error('build-privacy: ' + m); process.exit(1); };
const notice = JSON.parse(readFileSync(NOTICE, 'utf8'));
const version = String(notice.version || '');
const email = String(notice.contactEmail || '');
if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) fail(`version '${version}' is not a date (YYYY-MM-DD).`);
if (!/^[^@\s]+@[^@\s]+$/.test(email)) fail(`contactEmail '${email}' is not an address.`);

/** Fill `{{version}}` and `{{email}}`; any OTHER placeholder is a typo that would render as braces. */
const fill = (x) => {
  if (typeof x === 'string') {
    const out = x.replace(/\{\{version\}\}/g, version).replace(/\{\{email\}\}/g, email);
    const stray = out.match(/\{\{[^}]*\}\}/);
    if (stray) fail(`unknown placeholder ${stray[0]} in "${x.slice(0, 60)}…"`);
    return out;
  }
  if (Array.isArray(x)) return x.map(fill);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, fill(v)]));
  return x;
};
const privacy = Object.assign({ version }, fill(notice.privacy));

/** Write JSON in the file's own indentation and encoding, so a regeneration is not a reformat. */
const writeLike = (path, obj) => {
  const raw = readFileSync(path, 'utf8');
  const second = raw.split('\n')[1] || '';
  const indent = second.length - second.trimStart().length || 2;
  let out = JSON.stringify(obj, null, indent);
  if (/[^\x00-\x7f]/.test(raw) === false) out = out.replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  if (raw.endsWith('\n')) out += '\n';
  if (out !== raw) writeFileSync(path, out);
  return out !== raw;
};

// ── 1. Data/Strings: the generated `privacy` half.
const strings = JSON.parse(readFileSync(STRINGS, 'utf8'));
const node = strings.nodes.find((n) => n.id === 'str_privacy');
if (!node) fail('Data/Strings has no `str_privacy` node. It is placed once, by hand, and filled from here.');
node.parameters = node.parameters || {};
node.parameters.json = JSON.stringify(
  [{ _generated: 'by tools/build-privacy.mjs from privacy/notice.en.json — do not hand-edit (TASK-L185 §1)', privacy }],
  null,
  2
);
const a = writeLike(STRINGS, strings);

// ── 2. shared/Notice: the server's copy of the version.
const fnFile = JSON.parse(readFileSync(NOTICE_FN, 'utf8'));
const fn = fnFile.nodes.find((n) => n.id === 'nt_fn');
const script = fn.parameters.functionScript;
const re = /(\/\* NOTICE_VERSION:begin[^\n]*\n)const NOTICE_VERSION = '[^']*';(\n\/\* NOTICE_VERSION:end \*\/)/;
if (!re.test(script)) fail('shared/Notice has lost its NOTICE_VERSION markers.');
fn.parameters.functionScript = script.replace(re, `$1const NOTICE_VERSION = '${version}';$2`);
const b = writeLike(NOTICE_FN, fnFile);

console.log(`build-privacy: version ${version}, ${privacy.sections.length} sections. Data/Strings ${a ? 'updated' : 'unchanged'}; shared/Notice ${b ? 'updated' : 'unchanged'}.`);
if (a || b) console.log('build-privacy: redeploy the functions (deploy-functions.mjs) and rebuild the site.');
