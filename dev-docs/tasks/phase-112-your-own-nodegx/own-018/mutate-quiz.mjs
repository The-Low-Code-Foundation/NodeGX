// OWN-018 §13: proves grade-quiz.mjs on mutants of the Sonnet yardstick's app (run 0, 12/12). Each mutant is a copy
// of the app with one behaviour broken in its graph; the grader must fail exactly the checks that behaviour carries
// (plus what a stopped play can no longer reach), and pass the rest. Specific to run 0's graph (node ids are its).
//   node mutate-quiz.mjs <app-dir> <out-dir>      → <out-dir>/<mutant>/ (one app each) and expected.json
import fs from 'node:fs';
import path from 'node:path';

const [appArg, outArg] = process.argv.slice(2);
const APP = path.resolve(appArg);
const OUT = path.resolve(outArg);
const file = (dir, comp, f) => path.join(dir, 'components', comp, f);
const edit = (dir, comp, f, fn) => {
  const p = file(dir, comp, f);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  fn(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
};
const cut = (dir, comp, pred) => edit(dir, comp, 'connections.json', (j) => {
  const before = j.connections.length;
  j.connections = j.connections.filter((c) => !pred(c));
  if (j.connections.length === before) throw new Error(`nothing cut in ${comp}`);
});
const node = (j, id) => { const n = j.nodes.find((x) => x.id === id); if (!n) throw new Error(`no node ${id}`); return n; };

const MUTANTS = {
  // The score is never counted: the right-answer signal no longer reaches the counter.
  noscore: { fails: ['score', 'best', 'keep', 'reload'], apply: (d) => cut(d, 'Pages/Home', (c) => c.toId === 'scoreCounter' && c.toProperty === 'increase') },
  // The countdown never ticks: the Repeat node and its wires are gone.
  notimer: {
    fails: ['timer', 'timeout'], // the play stops at question 4, so everything after it is "not reached" too
    apply: (d) => {
      cut(d, 'Components/QuestionScreen', (c) => c.fromId === 'beat' || c.toId === 'beat');
      edit(d, 'Components/QuestionScreen', 'nodes.json', (j) => { j.nodes = j.nodes.filter((n) => n.id !== 'beat'); });
    }
  },
  // The best score lives in the page only: a reload forgets it.
  nopersist: {
    fails: ['reload'],
    apply: (d) => edit(d, 'Pages/Home', 'nodes.json', (j) => {
      const n = node(j, 'finalizeResults');
      const s = n.parameters.functionScript;
      n.parameters.functionScript = s.replace('window.localStorage.getItem(key)', '(window.__best ?? null)').replace('window.localStorage.setItem(key, String(next))', 'window.__best = String(next)');
      if (n.parameters.functionScript === s || n.parameters.functionScript.includes('localStorage')) throw new Error('nopersist: localStorage calls not found');
    })
  },
  // No colour feedback: every answer keeps its unanswered look.
  nocolour: {
    fails: ['green', 'red'],
    apply: (d) => edit(d, 'Components/QuestionScreen', 'nodes.json', (j) => {
      for (const id of ['styleA', 'styleB', 'styleC']) node(j, id).parameters.functionScript = "Outputs.bg = 'var(--surface)';\nOutputs.labelColor = 'var(--foreground)';\nOutputs.borderColor = 'var(--border-control)';";
    })
  },
  // No pause after an answer: the next question replaces it at once, so no colour is ever on screen either.
  nodelay: { fails: ['advance', 'green', 'red'], apply: (d) => edit(d, 'Components/QuestionScreen', 'nodes.json', (j) => { node(j, 'revealTimer').parameters.duration = 0; }) }
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, m] of Object.entries(MUTANTS)) {
  const d = path.join(OUT, name, path.basename(APP));
  fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
  fs.cpSync(APP, d, { recursive: true, filter: (src) => !/[\\/](\.previews|grade|node_modules)([\\/]|$)/.test(src) });
  m.apply(d);
  console.log(name, '→', d);
}
fs.writeFileSync(path.join(OUT, 'expected.json'), JSON.stringify(Object.fromEntries(Object.entries(MUTANTS).map(([k, v]) => [k, v.fails])), null, 2) + '\n');
