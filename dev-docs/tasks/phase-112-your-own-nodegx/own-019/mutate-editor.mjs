// OWN-019 s5: proves grade-editor.mjs on mutants of SE1's editor (Sonnet, s4, 13/13 — the grader's yardstick). Each
// mutant is a copy with one behaviour of the brief broken in its graph; the grader must fail the checks that behaviour
// carries and pass the rest. Specific to SE1's graph (its node ids and scripts).
//   node mutate-editor.mjs <SE1-app-dir> <out-dir>      → <out-dir>/<mutant>/capital-quiz and expected.json
//   then: for m in <out-dir>/*/; do node grade-editor.mjs $m/capital-quiz --tgz <tgz> --home <SE1 round>/home --out $m/grade; done
import fs from 'node:fs';
import path from 'node:path';

const [appArg, outArg] = process.argv.slice(2);
const APP = path.resolve(appArg);
const OUT = path.resolve(outArg);
const edit = (p, fn) => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  fn(j);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
};
const script = (dir, comp, id, from, to) => edit(path.join(dir, 'components', comp, 'nodes.json'), (j) => {
  const n = j.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`${comp}: no node ${id}`);
  const s = n.parameters.functionScript;
  if (!s.includes(from)) throw new Error(`${id}: "${from}" not in its script`);
  n.parameters.functionScript = s.replace(from, to);
});
const EDITOR = 'Pages/Editor';

const MUTANTS = {
  // The seconds field is shown and ignored: every question saves 10.
  seconds: { fails: ['seconds'], apply: (d) => script(d, EDITOR, 'build_payload', 'return Number.isFinite(secs) && secs > 0 ? secs : 10;', 'return 10;') },
  // The two colour fields are shown and ignored: the defaults are saved.
  colours: {
    fails: ['rightanswer', 'rightcolour', 'wrongcolour'],
    apply: (d) => {
      script(d, EDITOR, 'build_payload', 'hexPattern.test(Inputs.correctColor) ? Inputs.correctColor : "#16a34a"', '"#16a34a"');
      script(d, EDITOR, 'build_payload', 'hexPattern.test(Inputs.wrongColor) ? Inputs.wrongColor : "#dc2626"', '"#dc2626"');
    }
  },
  // The right-answer marker of question 1 is ignored: its first answer (Lisbon's place, now Seville) stays right.
  marker: {
    fails: ['rightanswer'],
    apply: (d) => script(d, EDITOR, 'build_payload', 'correctIndex: q && [0, 1, 2]', 'correctIndex: i === 0 ? 0 : q && [0, 1, 2]')
  },
  // Kept in this browser only: Save still writes the backend, but the quiz plays what this browser's storage holds.
  // Another browser, and everything restarted with a fresh browser, play the quiz as it was. (`unchanged` fails too:
  // browser B's question 1 is still Portugal, so Madrid is never tapped and question 2 never reached — measured s5.)
  browseronly: {
    fails: ['shared', 'question', 'order', 'seconds', 'rightanswer', 'rightcolour', 'wrongcolour', 'unchanged', 'restart'],
    apply: (d) => {
      script(d, EDITOR, 'build_payload', 'Outputs.built();', 'localStorage.setItem("own019-mutant", JSON.stringify({ title, correctColor, wrongColor, questionsJson: JSON.stringify(questions) }));\nOutputs.built();');
      script(
        d,
        'App',
        'parse_config',
        'const record = items[0];',
        'let local = null;\ntry { local = JSON.parse(localStorage.getItem("own019-mutant")); } catch (e) {}\nconst record = items[0] ? (local ? { ...local, id: items[0].id } : { id: items[0].id }) : null;'
      );
    }
  }
};

const only = process.argv.slice(4);
fs.mkdirSync(OUT, { recursive: true });
const expected = {};
for (const [name, m] of Object.entries(MUTANTS)) {
  if (only.length && !only.includes(name)) continue;
  const dir = path.join(OUT, name, path.basename(APP));
  fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
  fs.cpSync(APP, dir, { recursive: true, filter: (s) => !/[\\/](grade|node_modules)$/.test(s) });
  m.apply(dir);
  expected[name] = m.fails;
}
fs.writeFileSync(path.join(OUT, 'expected.json'), JSON.stringify(expected, null, 2) + '\n');
console.log(JSON.stringify(expected));
