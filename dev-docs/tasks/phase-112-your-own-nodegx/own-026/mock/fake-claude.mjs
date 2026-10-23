#!/usr/bin/env node
// OWN-026 $0 stand-in for Claude Code: the relay judge (--model haiku → DONE) and the grader (writes ../grade.json).
import fs from 'node:fs';
const a = process.argv.slice(2);
const model = a[a.indexOf('--model') + 1];
if (model === 'haiku') { console.log(JSON.stringify({ result: 'DONE' })); process.exit(0); }
const prompt = a[a.indexOf('-p') + 1];
const out = prompt.match(/(\/\S+\/grade\.json)/)[1];
await new Promise((r) => setTimeout(r, 20000)); // hold the lock long enough to see the other chain wait
fs.writeFileSync(out, JSON.stringify({ S0: { grade: 'PASS', evidence: `mock grader, cwd ${process.cwd()}, app has node_modules: ${fs.existsSync(process.cwd() + '/../app/node_modules')}` } }, null, 2));
console.log(JSON.stringify({ type: 'result', total_cost_usd: 0, result: 'mock grade' }));
