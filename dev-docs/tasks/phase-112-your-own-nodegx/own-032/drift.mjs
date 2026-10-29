// OWN-032 s5 — where a test run parts from its control, and the largest odds drift on the turns before that
//   node drift.mjs <control run> <test run>      e.g. node drift.mjs w12m-bakery w16m-bakery
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const [A, B] = process.argv.slice(2).map((r) => JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${r}`, 'ledger.json'), 'utf8')));
let drift = 0, same = 0, part = null, calls = 0;
for (const [i, t] of A.turns.entries()) {
  const u = B.turns[i];
  if (!u || u.action.say !== t.action.say) { part = t.turn; break; }
  same++;
  for (const [j, c] of t.calls.entries()) if (u.calls[j]?.prompt === c.prompt && ++calls) for (const o of c.options || []) { const p = u.calls[j]?.options?.find((x) => x.label === o.label)?.p; if (o.p != null && p != null) drift = Math.max(drift, Math.abs(o.p - p)); }
}
console.log(`${A.run} → ${B.run}: ${same} actions the same, parts at ${part ? `t${part}` : 'never'}; max odds drift over the ${calls} calls asked the same prompt ${drift.toFixed(4)}`);
