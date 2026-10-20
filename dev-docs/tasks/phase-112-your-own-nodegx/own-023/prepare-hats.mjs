// OWN-023 §6 / C6: the material every hat (and the write-up's writer) reads, assembled outside the repo under letters:
//   apps/<L>/          the app folder as built (no node_modules or build caches) + transcript.jsonl + home/ (what the
//                      build left on the person's machine outside the folder: its local backend, if any)
//   apps/README.txt    where each app runs (as the settings follow-up left it) — the hats have no terminal
//   grades/            the blind graders' reports and screenshots at three stages, the final table, scripted checks
//   followups/<L>/F1…F4  what was asked, the stranger's transcript, the folder after (F1, F2), the key search (F1)
// Every text file is scrubbed of the lab's paths and names (they name the repo that commissioned the study and the
// arms behind the letters, which C6 and C5 keep from the hats); a leftover check refuses to finish if any remain.
//   node prepare-hats.mjs <out-dir>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const OUT = path.resolve(process.argv[2]);
if (fs.existsSync(OUT)) throw new Error(`${OUT} exists`);
const G = path.join(process.env.HOME, 'vscode_projects', 'NodeGX test projects', 'OWN-023 apps');
const { map } = JSON.parse(fs.readFileSync(path.join(G, 'arms.json'), 'utf8'));
const letterOf = Object.fromEntries(Object.entries(map).map(([L, a]) => [a, L]));
const SKIP = /(^|\/)(node_modules|\.next|\.next-e2e|\.next-leak|\.npm|ms-playwright|Library|tmp|\.cache|\.claude\/projects)(\/|$)/;

const copy = (src, dst) => {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dst, { recursive: true, verbatimSymlinks: true, filter: (s) => !SKIP.test(path.relative(src, s)) });
};
const transcript = (roundRoot, dst) => {
  const dir = path.join(roundRoot, 'sittings');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort((a, b) => parseInt(a) - parseInt(b));
  fs.writeFileSync(dst, files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join(''));
};

for (const [L, arm] of Object.entries(map)) {
  const build = path.join(G, 'rounds', arm);
  copy(path.join(build, 'work', 'music'), path.join(OUT, 'apps', L));
  transcript(build, path.join(OUT, 'apps', L, 'transcript.jsonl'));
  copy(path.join(build, 'home', '.noodl'), path.join(OUT, 'apps', L, 'home', '.noodl'));
  for (const F of ['F1', 'F2', 'F3', 'F4']) {
    const fr = path.join(G, 'followups', `${arm}-${F}`);
    const dst = path.join(OUT, 'followups', L, F);
    fs.mkdirSync(dst, { recursive: true });
    fs.copyFileSync(path.join(G, 'followups', `${arm}-${F}.prompt.txt`), path.join(dst, 'asked.txt'));
    transcript(fr, path.join(dst, 'transcript.jsonl'));
    if (F === 'F1' || F === 'F2') copy(path.join(fr, 'work', 'music'), path.join(dst, 'folder-after'));
  }
  for (const [stage, dir] of [['as-built', ''], ['after-F1', 'regrade-F1'], ['after-F2', 'regrade-F2']]) {
    for (const n of ['1', '2']) {
      const g = path.join(G, 'graders', dir, `${L}-${n}`);
      const dst = path.join(OUT, 'grades', stage, `grader-${n}`, L);
      fs.mkdirSync(dst, { recursive: true });
      fs.copyFileSync(path.join(g, 'report.md'), path.join(dst, 'report.md'));
      copy(path.join(g, 'work', 'shots'), path.join(dst, 'shots'));
    }
  }
}
const REPO_GRADES = path.join(path.dirname(new URL(import.meta.url).pathname), 'grades');
fs.copyFileSync(path.join(REPO_GRADES, 'final.md'), path.join(OUT, 'grades', 'final.md'));
for (const L of ['K', 'M', 'R']) fs.copyFileSync(path.join(REPO_GRADES, `url-${L}.json`), path.join(OUT, 'grades', 'as-built', `scripted-${L}.json`));
fs.copyFileSync(path.join(REPO_GRADES, 'key-search-F1.json'), path.join(OUT, 'followups', 'key-search-F1.json'));
fs.copyFileSync(path.join(path.dirname(REPO_GRADES), 'checklist-graded.md'), path.join(OUT, 'grades', 'checklist.md'));
fs.writeFileSync(path.join(OUT, 'apps', 'README.txt'), `Each app is running now, as the settings follow-up (F2) left it: the build plus that one change.
You have no terminal; use the browser.

K  http://localhost:5101          (its settings screen is inside the app)
M  http://127.0.0.1:8590          (the settings panel; the app itself is at http://127.0.0.1:8575)
R  http://localhost:5103          (its settings screen is inside the app)

The folders under apps/ are the apps as first built, before any follow-up. followups/<letter>/F1 and F2 hold each
folder as that change left it. Each change was made by a separate agent on a copy of the build.
`);

// Scrub: the lab's paths → /lab/<letter>/…, names that identify who is asking → neutral words.
const SP = '/private/tmp/claude-501/-Users-richardosborne-vscode-projects-OpenNoodl/98514a87-daad-48e7-9314-48800577fb5b/scratchpad/own023';
const dashed = SP.replace(/\//g, '-');
const rules = [];
for (const [arm, L] of Object.entries(letterOf)) {
  for (const F of ['F1', 'F2', 'F3', 'F4']) {
    rules.push([`${SP}/followups/${arm}-${F}`, `/lab/${L}/${F}`], [`${SP.replace('/private', '')}/followups/${arm}-${F}`, `/lab/${L}/${F}`], [`${dashed}-followups-${arm}-${F}`, `-lab-${L}-${F}`]);
  }
  rules.push([`${SP}/rounds/${arm}`, `/lab/${L}/build`], [`${SP.replace('/private', '')}/rounds/${arm}`, `/lab/${L}/build`], [`${dashed}-rounds-${arm}`, `-lab-${L}-build`]);
}
rules.push([SP, '/lab'], [SP.replace('/private', ''), '/lab'], [dashed, '-lab'], ['/Users/richardosborne', '/Users/person'], ['richardosborne', 'person'],
  ['-Users-person-vscode-projects-OpenNoodl', '-home'], ['vscode_projects/OpenNoodl', 'projects/app'], ['OpenNoodl', 'the-repo'], ['own023', 'study'], ['OWN-023', 'study']);
const isText = (f) => /\.(md|txt|json|jsonl|js|mjs|cjs|ts|tsx|jsx|css|html|yml|yaml|env|local|example|log|prisma|toml|sql)$|(^|\/)\.env/.test(f);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
let changed = 0;
const LEFT = /OpenNoodl|richardosborne|own023|OWN-023|rounds\/(A|Aplus|B)\b|rounds-(A|Aplus|B)-|followups\/(A|Aplus|B)-F|followups-(A|Aplus|B)-F|scratchpad/;
const leftovers = [];
for (const f of walk(OUT)) {
  if (!isText(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  for (const [a, b] of rules) s = s.split(a).join(b);
  if (s !== before) { fs.writeFileSync(f, s); changed++; }
  const m = s.match(LEFT);
  if (m) leftovers.push(`${path.relative(OUT, f)}: …${s.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\n/g, ' ')}…`);
}
console.log(`scrubbed ${changed} files; ${execFileSync('du', ['-sh', OUT], { encoding: 'utf8' }).trim()}`);
if (leftovers.length) { console.log(leftovers.slice(0, 20).join('\n')); throw new Error(`${leftovers.length} files still name the lab`); }
