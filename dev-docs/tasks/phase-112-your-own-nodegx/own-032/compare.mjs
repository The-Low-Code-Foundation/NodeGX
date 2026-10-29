// OWN-032 s4 — a run against its control: turns, free (non-fix) moves, the first turn they part, the end findings,
// and the headline's words and desktop lines at the end.
//
//   node compare.mjs <control prefix> <test prefix> [m-bakery s-jazz …]     e.g. node compare.mjs w10 w11
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [A, B, ...keys] = process.argv.slice(2);
const read = (run) => { const f = path.join(HERE, 'runs', `arm-${run}`, 'ledger.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const sum = (L) => {
  const t = L.turns, last = t.filter((x) => x.shot).at(-1);
  const facts = last && JSON.parse(fs.readFileSync(path.join(HERE, 'runs', `arm-${L.run}`, last.shot.facts), 'utf8'));
  const h = last?.nodes.find((n) => n.role === 'headline'), hText = String(h?.params.text ?? '');
  const hb = (facts?.desktop.facts?.blocks ?? facts?.desktop.blocks)?.find((b) => b.kind === 'words' && b.text === hText.trim().replace(/\s+/g, ' ').slice(0, 40));
  const words = last?.nodes.filter((n) => n.params.text != null || n.params.label != null).map((n) => String(n.params.text ?? n.params.label)).join(' | ') ?? '';
  return {
    turns: t.length,
    free: t.filter((x) => x.action.via !== 'fix').length,
    freeAfterGoal: t.filter((x) => x.findingsIn?.some((f) => f.check === 'goalMet') && x.action.via !== 'fix').map((x) => `${x.turn}:${x.action.kind}`),
    end: L.end?.ended ? 'ended' : L.end?.done ? 'done' : 'cap',
    left: (L.end?.findings || []).map((f) => f.check).filter((c) => c !== 'goalMet'),
    headline: `${hText} (${hText.trim().split(/\s+/).length} w, ${hb?.lines ?? '?'} lines)`,
    named: words.includes(L.goal.name),
    tree: last?.tree
  };
};
for (const k of keys.length ? keys : ['m-bakery', 's-bakery', 'm-jazz', 's-jazz', 'm-plumber', 's-plumber']) {
  const [look, brief] = k.split('-');
  const a = read(`${A}${look}-${brief}`), b = read(`${B}${look}-${brief}`);
  if (!a || !b) { console.log(`${k}: missing ${!a ? A : B}`); continue; }
  const sa = sum(a), sb = sum(b);
  const part = a.turns.findIndex((x, i) => x.action.say !== b.turns[i]?.action.say);
  console.log(`${k}: turns ${sa.turns} → ${sb.turns}; free ${sa.free} → ${sb.free}; free after goal [${sa.freeAfterGoal}] → [${sb.freeAfterGoal}]; end ${sa.end} → ${sb.end}; left [${sa.left}] → [${sb.left}]; parts at ${part < 0 ? 'never' : `t${part + 1}`}; same tree ${sa.tree === sb.tree}`);
  console.log(`   headline: ${sa.headline} → ${sb.headline}; name in the words: ${sa.named} → ${sb.named}`);
}
