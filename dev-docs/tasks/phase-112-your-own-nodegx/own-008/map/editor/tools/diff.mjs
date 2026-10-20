// Which files differ between two project folders, byte for byte, and for a differing JSON file
// which top-level node, wire or field changed. Reads only.
// node tools/diff.mjs <before-dir> <after-dir>
import fs from 'node:fs';
import path from 'node:path';

const [a, b] = process.argv.slice(2).map((p) => path.resolve(p));
const list = (root) => {
  const out = new Set();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const abs = path.join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else out.add(path.relative(root, abs));
    }
  };
  walk(root);
  return out;
};
const fa = list(a);
const fb = list(b);
let same = 0;
for (const f of [...new Set([...fa, ...fb])].sort()) {
  if (!fa.has(f)) { console.log(`+ ${f} (only in after)`); continue; }
  if (!fb.has(f)) { console.log(`- ${f} (only in before)`); continue; }
  const ta = fs.readFileSync(path.join(a, f), 'utf8');
  const tb = fs.readFileSync(path.join(b, f), 'utf8');
  if (ta === tb) { same++; continue; }
  console.log(`~ ${f}`);
  if (!f.endsWith('.json')) continue;
  const ja = JSON.parse(ta);
  const jb = JSON.parse(tb);
  if (ja.nodes) {
    const ma = new Map(ja.nodes.map((n) => [n.id, n]));
    const mb = new Map(jb.nodes.map((n) => [n.id, n]));
    for (const [id, n] of mb) {
      if (!ma.has(id)) console.log(`    node added ${id}: ${JSON.stringify(n)}`);
      else if (JSON.stringify(ma.get(id)) !== JSON.stringify(n)) {
        for (const k of new Set([...Object.keys(ma.get(id)), ...Object.keys(n)])) {
          if (JSON.stringify(ma.get(id)[k]) !== JSON.stringify(n[k])) {
            if (k === 'parameters') {
              const pa = ma.get(id).parameters ?? {};
              const pb = n.parameters ?? {};
              for (const pk of new Set([...Object.keys(pa), ...Object.keys(pb)])) if (JSON.stringify(pa[pk]) !== JSON.stringify(pb[pk])) console.log(`    ${id}.parameters.${pk}: ${JSON.stringify(pa[pk])} → ${JSON.stringify(pb[pk])}`);
            } else console.log(`    ${id}.${k}: ${JSON.stringify(ma.get(id)[k])} → ${JSON.stringify(n[k])}`);
          }
        }
      }
    }
    for (const id of ma.keys()) if (!mb.has(id)) console.log(`    node removed ${id}`);
  } else if (ja.connections) {
    const key = (w) => `${w.fromId}.${w.fromProperty} → ${w.toId}.${w.toProperty}`;
    const sa = new Set(ja.connections.map(key));
    const sb = new Set(jb.connections.map(key));
    for (const k of sb) if (!sa.has(k)) console.log(`    wire added ${k}`);
    for (const k of sa) if (!sb.has(k)) console.log(`    wire removed ${k}`);
  } else {
    for (const k of new Set([...Object.keys(ja), ...Object.keys(jb)])) {
      if (JSON.stringify(ja[k]) === JSON.stringify(jb[k])) continue;
      const s = (v) => JSON.stringify(v)?.slice(0, 160);
      console.log(`    ${k}: ${s(ja[k])} → ${s(jb[k])}`);
    }
  }
}
console.log(`${same} file(s) identical`);
