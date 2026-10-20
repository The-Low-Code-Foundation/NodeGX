#!/usr/bin/env node
// check.mjs — the Bubble importer's gate (s6). Converts the fixtures committed in this folder (the Bubble editor's
// requests: backend workflows, option sets, data types with privacy rules) and, when `exports/template/` holds a
// run-mode bundle (gitignored; IMPORT.md §7 says how to fetch it), Richard's template too. Asserts what each session
// paid for: P123-S5-NOHOME (rootNodeId), P123-S5B-DISABLEDSTEP (no Log In in someApiWorkflow), §10 (four cloud
// components, two triggers), §12 (three collections), s6 (nodegx.security.json valid, the rules derived). Prints
// PASS n/n or FAIL and exits 1. The backend's own validator is used when packages/nodegx-backend/dist is built, and
// validate_project through the MCP when packages/noodl-mcp/dist is; each is skipped by name when it is not.
//   cd dev-docs/tasks/phase-123-open-bubble/import && node check.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const here = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(here, '../../../..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-check-'));
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? ' — ' + detail : ''}`); return !!ok; };
const skip = (name, why) => console.log(`skip ${name} — ${why}`);
const run = (args, timeoutMs = 300000) => spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 1 << 28, timeout: timeoutMs });
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);
const require = createRequire(import.meta.url);
const backendDist = path.join(repo, 'packages/nodegx-backend/dist/index.js');
const validateSecurity = exists(backendDist) ? require(backendDist).validateSecurityConfig : null;
const mcpBuilt = exists(path.join(repo, 'packages/noodl-mcp/dist/noodl-mcp.cjs'));

function convert(name, inDir) {
  const out = path.join(tmp, name); const exp = path.join(out, 'app.export.json'); const project = path.join(out, 'project');
  const b = run([path.join(here, 'bubble-run-bundle-to-export.mjs'), inDir, exp]);
  if (!check(`${name}: the bundler exits 0`, b.status === 0, (b.stderr || b.stdout).slice(-400))) return null;
  const c = run([path.join(here, 'bubble2nodegx.mjs'), exp, project]);
  if (!check(`${name}: the converter exits 0`, c.status === 0, (c.stderr || c.stdout).slice(-600))) return null;
  return { project, report: fs.readFileSync(path.join(project, 'docs', 'IMPORT-REPORT.md'), 'utf8'), out: c.stdout };
}
function validateProject(name, project) {
  if (!mcpBuilt) return skip(`${name}: validate_project`, 'packages/noodl-mcp/dist is not built');
  const v = run([path.join(here, 'validate-project.mjs'), project], 240000);
  const m = /summary: (\{.*\})/.exec(v.stdout || '');
  const summary = m ? JSON.parse(m[1]) : null;
  check(`${name}: validate_project reports 0 errors`, summary && summary.errors === 0, summary ? JSON.stringify(summary) : (v.stderr || v.stdout || '').slice(-400));
}
const countBy = (text, re) => (text.match(re) || []).length;

// ---------------------------------------------------------------- 1. the editor requests alone (committed fixtures)
{
  const inDir = path.join(tmp, 'editor-in'); fs.mkdirSync(inDir);
  for (const f of ['backend-workflows/example-c5r6j filled.json', 'option-sets/example-dxr78ubfdtfq6tbmec.json', 'database-schema/example-privacy-rule-entpawjzehwq0tbk.json']) fs.copyFileSync(path.join(here, f), path.join(inDir, path.basename(f)));
  const r = convert('editor requests', inDir);
  if (r) {
    const { project, report } = r;
    const pj = readJson(path.join(project, 'nodegx.project.json'));
    check('P123-S5-NOHOME: nodegx.project.json names rootNodeId app_root', pj.rootNodeId === 'app_root', JSON.stringify(pj.rootNodeId));
    check('§12: three collections declared (_User, someDataType, someOtherDataType)', JSON.stringify((pj.metadata?.dbCollections || []).map((c) => c.name).sort()) === JSON.stringify(['_User', 'someDataType', 'someOtherDataType']), JSON.stringify((pj.metadata?.dbCollections || []).map((c) => c.name)));
    const cloudDir = path.join(project, 'components', '__cloud__');
    const cloudComponents = exists(cloudDir) ? fs.readdirSync(cloudDir, { recursive: true }).filter((f) => f.endsWith('component.json')).length : 0;
    check('§10: four cloud components (three functions and one shared custom event)', cloudComponents === 4, String(cloudComponents));
    const api = path.join(cloudDir, 'someApiWorkflow', 'nodes.json');
    check('P123-S5B-DISABLEDSTEP: the disabled Log In step of someApiWorkflow is not converted', exists(api) && !fs.readFileSync(api, 'utf8').includes('net.noodl.user.LogIn'));
    const trig = path.join(project, 'backend', 'triggers.bubble.json');
    const t = exists(trig) ? readJson(trig) : null;
    check('§10: a db-change and a schedule trigger are written', t && t.triggers.map((x) => x.type).sort().join(',') === 'db-change,schedule', t && JSON.stringify(t.triggers.map((x) => x.type)));
    // s6: nodegx.security.json
    const secPath = path.join(project, 'nodegx.security.json');
    const sec = exists(secPath) ? readJson(secPath) : null;
    check('s6: nodegx.security.json is written', !!sec);
    if (sec) {
      if (validateSecurity) { const errs = validateSecurity(sec); check("s6: the backend's validateSecurityConfig accepts it", errs.length === 0, errs.join('; ')); } else skip('s6: validateSecurityConfig', 'packages/nodegx-backend/dist is not built');
      check('s6: no system collection carries rules', !Object.keys(sec.collections).some((k) => k.startsWith('_')), Object.keys(sec.collections).join(','));
      const sd = sec.collections.someDataType;
      check('s6: someDataType reads public ("everyone" views and finds), writes nobody (no page writes it)', sd && sd.permissions.find === 'public' && sd.permissions.get === 'public' && sd.permissions.create === 'nobody' && sd.permissions.update === 'nobody' && sd.permissions.delete === 'nobody' && sd.creatorOwns === false, JSON.stringify(sd));
      check('s6: the API workflow is callable signed-in and runs as system (it writes)', sec.functions.someApiWorkflow?.call === 'authenticated' && sec.functions.someApiWorkflow?.runAs === 'system', JSON.stringify(sec.functions.someApiWorkflow));
      check('s6: the db-change trigger\'s function is callable by nobody and runs as system', sec.functions.someThingIsModified?.call === 'nobody' && sec.functions.someThingIsModified?.runAs === 'system', JSON.stringify(sec.functions.someThingIsModified));
      check('s6: the recurring event\'s function is callable by nobody', sec.functions.recurringEvent1?.call === 'nobody', JSON.stringify(sec.functions.recurringEvent1));
      check('s6: signup is public (the backend workflow signs a user up)', sec.signup === 'public', sec.signup);
      check('s6: devOpen is false and the defaults are nobody', sec.devOpen === false && Object.values(sec.defaults.permissions).every((v) => v === 'nobody'));
    }
    check('s6: the report has the Security section with the three User rules read', report.includes('## Security — nodegx.security.json') && report.includes("| User | User's own data |") && report.includes('| User | somePrivacyRule |'));
    check("s6: the report says the User rules have no place in the file (fixed posture)", report.includes('_User is a system collection with a fixed posture'));
    check('s6: the old "privacy rules are not converted" finding is gone', !report.includes('are not converted; nodegx.security.json needs'));
    check('s6: a write to a type the schema lacks is listed, not dropped', report.includes('is not one of the app\'s data types'));
    validateProject('editor requests', project);
  }
}

// ---------------------------------------------------------------- 1b. P123-S6-THINGTYPE: a page added to the editor fixtures, whose steps change
// "Parent group's item" (a row of someDataType, a Group of someOtherDataType) and "Result of step 1", with no explicit type
{
  const base = path.join(tmp, 'editor requests', 'app.export.json');
  if (exists(base)) {
    const synth = readJson(base);
    synth.pages = { tpage: { type: 'Page', id: 'tpage', name: 'index', properties: { new_responsive: true, container_layout: 'column' }, elements: {
      grp: { id: 'grp', type: 'Group', name: 'Group other', properties: { group_type: 'custom.someotherdatatype', container_layout: 'column' }, elements: {
        rg1: { id: 'rg1', type: 'RepeatingGroup', name: 'RG rows', properties: { group_type: 'custom.somedatatype', container_layout: 'column' }, elements: {
          b1: { id: 'b1', type: 'Button', name: 'Button edit', properties: {} } } },
        b2: { id: 'b2', type: 'Button', name: 'Button delete other', properties: {} } } } },
      workflows: {
        w1: { id: 'w1', type: 'ButtonClicked', properties: { element_id: 'b1' }, actions: {
          0: { id: 'a1', type: 'ChangeThing', properties: { thing_to_change: { type: 'ElementParent' }, changes: {} } },
          1: { id: 'a2', type: 'ChangeThing', properties: { thing_to_change: { type: 'PreviousStep', properties: { action_id: 'a1' } }, changes: {} } } } },
        w2: { id: 'w2', type: 'ButtonClicked', properties: { element_id: 'b2' }, actions: {
          0: { id: 'a3', type: 'DeleteThing', properties: { thing_to_delete: { type: 'ElementParent' } } } } } } } };
    const out = path.join(tmp, 'synth'); fs.mkdirSync(out); const exp = path.join(out, 'app.export.json'); fs.writeFileSync(exp, JSON.stringify(synth));
    const c = run([path.join(here, 'bubble2nodegx.mjs'), exp, path.join(out, 'project')]);
    if (check('P123-S6-THINGTYPE: the synthetic page converts', c.status === 0, (c.stderr || c.stdout).slice(-600))) {
      const nodes = fs.readdirSync(path.join(out, 'project', 'components'), { recursive: true }).filter((f) => f.endsWith('nodes.json') && !f.includes('__cloud__')).map((f) => fs.readFileSync(path.join(out, 'project', 'components', f), 'utf8')).join('\n'); // the page and its row only: the backend fixture writes a deleted type, "thing", on purpose
      check('P123-S6-THINGTYPE: "Parent group\'s item" in a row is the row\'s type, and "Result of step 1" the same', countBy(nodes, /"collectionName": "someDataType"/g) === 2, `someDataType named ${countBy(nodes, /"collectionName": "someDataType"/g)} times`);
      check('P123-S6-THINGTYPE: no page step writes to "Message" or "thing" (the expression\'s node kind)', !/"collectionName": "(Message|thing)"/.test(nodes));
      const sec = readJson(path.join(out, 'project', 'nodegx.security.json'));
      check('s6: a page write with no condition is the floor "public" on that op (someDataType update, someOtherDataType delete)', sec.collections.someDataType.permissions.update === 'public' && sec.collections.someOtherDataType.permissions.delete === 'public' && sec.collections.someDataType.permissions.delete === 'nobody', JSON.stringify([sec.collections.someDataType.permissions, sec.collections.someOtherDataType.permissions]));
      const report = fs.readFileSync(path.join(out, 'project', 'docs', 'IMPORT-REPORT.md'), 'utf8');
      check('s6: the writes table lists the delete of a someOtherDataType from the page', /\| someOtherDataType \| delete \| the page \|/.test(report));
    }
  }
}

// ---------------------------------------------------------------- 2. the template's run-mode bundle (gitignored; optional)
{
  const tplDir = path.join(here, 'exports', 'template');
  const bundles = exists(tplDir) ? fs.readdirSync(tplDir).filter((f) => f.endsWith('dynamic.js')) : [];
  if (!bundles.length) skip('template bundle', 'import/exports/template has no *.dynamic.js (IMPORT.md §7 says how to fetch it)');
  else {
    const r = convert('template', tplDir);
    if (r) {
      const { project, report } = r;
      const m = /\| elements \| (\d+) \| (\d+) /.exec(report);
      check('§9: every element of the template is mapped', m && m[1] === m[2] && Number(m[1]) > 0, m ? `${m[2]}/${m[1]}` : 'no elements row');
      const pj = readJson(path.join(project, 'nodegx.project.json'));
      check('§9: the Google Fonts link is in settings.headCode', String(pj.settings?.headCode || '').includes('fonts.googleapis.com/css2'));
      const sec = readJson(path.join(project, 'nodegx.security.json'));
      if (validateSecurity) check("s6: the template's nodegx.security.json validates", validateSecurity(sec).length === 0, validateSecurity(sec).join('; '));
      validateProject('template', project);
    }
  }
}

fs.rmSync(tmp, { recursive: true, force: true });
const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? 'FAIL' : 'PASS'} ${checks.length - failed}/${checks.length}`);
process.exit(failed ? 1 : 0);
