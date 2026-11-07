// HST-016 §4: one call to a deployed backend's admin API, for the live schedule reading.
//
//   node campus-admin.mjs <deployment folder> <METHOD> <path> [json body]
//
// The address and the admin credential come from the deployment's own `deployment.json`. Never prints the token.
// Prints the status code and the answer. Exits 1 on a status of 400 or more.
//
// The overnight reading (deployment folder: ~/.nodegx/cloudflare/hst-campus):
//   … POST /admin/workflow-defs '{"id":"tick","name":"tick","entry":"done","steps":[{"id":"done","kind":"return","params":{"value":{"tick":true}}}]}'
//   … POST /admin/triggers '{"id":"hst016-tick","type":"schedule","name":"HST-016 overnight tick","enabled":true,"target":{"kind":"workflow","name":"tick"},"schedule":{"cron":"*/15 * * * *"}}'
//   … GET /admin/triggers/hst016-tick            (next morning: status.fireCount, status.lastFiredAt)
//   … DELETE /admin/triggers/hst016-tick         then DELETE /admin/workflow-defs/tick
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, method, path, body] = process.argv.slice(2);
if (!dir || !method || !path) {
  console.error('usage: node campus-admin.mjs <deployment folder> <METHOD> <path> [json body]');
  process.exit(2);
}
const d = JSON.parse(readFileSync(join(dir.replace(/^~(?=\/)/, process.env.HOME), 'deployment.json'), 'utf8'));
const res = await fetch(d.url + path, {
  method,
  headers: { authorization: 'Bearer ' + d.adminToken, ...(body ? { 'content-type': 'application/json' } : {}) },
  body
});
const text = await res.text();
console.log(res.status, text.split(d.adminToken).join('<admin token>').slice(0, 4000));
process.exit(res.status >= 400 ? 1 : 0);
