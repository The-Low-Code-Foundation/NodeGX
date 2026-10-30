#!/usr/bin/env node
// npx -p @nodegx/backend-kit backend-suite <adapter.mjs> <project folder> <edits.json> [--backend <url> --token-file <file>]
//                                          [--people <id, email or name>,…]
//
// The backend suite (lib/suite.mjs): if the adapter offers handed(person), grades what it shows each person was
// handed (lib/handed.mjs); then applies the edits through your editor's adapter, reads the backend and the project's
// files after each one, and compares them with the kit's own writers. PASS (exit 0) or FAIL with a sentence per
// difference (exit 1). Both places are put back at the end. Run it on a copy of the app and the copy's backend.
// edits.json is a list of edits, or { "edits": […], "people": […] }; `[]` grades the read half alone.
import fs from 'node:fs';
import path from 'node:path';
import { runSuite, projectBackend } from '@nodegx/backend-kit';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
let url = flag('--backend');
const tokenFile = flag('--token-file');
const peopleFlag = flag('--people');
const [adapter, project, editsFile] = args;
if (!adapter || !project || !editsFile) {
  console.error('backend-suite <adapter.mjs> <project folder> <edits.json> [--backend <url> --token-file <file>] [--people <id, email or name>,…]');
  process.exit(2);
}
let token;
if (url) {
  if (!tokenFile) {
    console.error('With --backend, pass --token-file <file>: a file holding the backend’s admin credential.');
    process.exit(2);
  }
  token = fs.readFileSync(tokenFile, 'utf8').split(/\r?\n/)[0].trim();
} else {
  const found = projectBackend(path.resolve(project));
  ({ url, token } = found);
  console.log(`(the backend ${found.name ?? ''} at ${url}, which this project is linked to)`);
}
const script = JSON.parse(fs.readFileSync(editsFile, 'utf8'));
const people = peopleFlag ? peopleFlag.split(',').map((p) => p.trim()).filter(Boolean) : Array.isArray(script) ? undefined : script.people;
const r = await runSuite({ adapter: path.resolve(adapter), project: path.resolve(project), backend: url, token, edits: Array.isArray(script) ? script : script.edits ?? [], people });
console.log(r.line);
for (const d of r.differences) console.log(`  ${d}`);
process.exit(r.pass ? 0 : 1);
