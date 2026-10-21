// OWN-023 round 2: the arms' starting folders, from the game as it is today (P122's game/).
//   node make-seeds.mjs <out>     → <out>/Aplus (the game), <out>/B/{gala-rules,reference}, <out>/brief-{Aplus,B}.txt
// The game folder holds nothing private (P122's notes stay out: only the files a browser or `npm test` needs).
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const GAME = path.resolve(HERE, '../../../phase-122-the-gala/game');
const out = path.resolve(process.argv[2] || ''); if (!process.argv[2]) throw new Error('usage: node make-seeds.mjs <out>');
if (fs.existsSync(out)) throw new Error(`${out} exists`);
const GAME_FILES = ['index.html', 'style.css', 'package.json', 'serve.mjs', 'README.md', 'src', 'vendor', 'tests'];
const copyGame = (to) => { fs.mkdirSync(to, { recursive: true }); for (const f of GAME_FILES) fs.cpSync(path.join(GAME, f), path.join(to, f), { recursive: true }); };
copyGame(path.join(out, 'Aplus'));
copyGame(path.join(out, 'B', 'reference'));
// the rules, as one package: the same four files and three test files, byte for byte
const R = path.join(out, 'B', 'gala-rules');
fs.mkdirSync(path.join(R, 'src'), { recursive: true }); fs.mkdirSync(path.join(R, 'tests'));
for (const f of ['engine.js', 'data.js', 'plan.js', 'tunes.js']) fs.copyFileSync(path.join(GAME, 'src', f), path.join(R, 'src', f));
for (const f of ['engine.test.mjs', 'music.test.mjs', 'rows.test.mjs']) fs.copyFileSync(path.join(GAME, 'tests', f), path.join(R, 'tests', f));
fs.writeFileSync(path.join(R, 'package.json'), JSON.stringify({ name: 'gala-rules', version: '1.0.0', private: true, type: 'module', exports: { './engine': './src/engine.js', './data': './src/data.js', './plan': './src/plan.js', './tunes': './src/tunes.js' }, scripts: { test: 'node --test tests/*.test.mjs' } }, null, 2) + '\n');
fs.writeFileSync(path.join(R, 'README.md'), `# gala-rules

The rules of the dance-school gala game, as plain ES modules with no DOM and no dependencies. \`npm test\` runs their tests.

- \`src/engine.js\`: \`simulate({ plan, school, season, mode: 'rehearsal' | 'try' | 'gala', seed })\` returns the whole evening
  as data: every verdict, each dancer's schedule, the points, a trace. Also \`danceOf\`, \`routineInfo\`, \`judgeSpacing\`,
  \`judgeMusic\`, \`analyseLoge\`, \`stageOf\`, \`fits\`, \`againstWall\`, \`footprint\`, \`seatsOf\`.
- \`src/data.js\`: every table the game knows (classes, numbers, moves, outfits, hairdos, shoes, accessories, furniture,
  snacks, upgrades, parking, rules, the starting stars) and \`applyRows(over)\`, which lays changed rows over the defaults
  in place (\`EDITABLE\` lists the tables).
- \`src/plan.js\`: \`defaultPlan()\`, \`defaultSchool()\`, \`addSeasonNumbers()\`, \`migrateNumber()\`.
- \`src/tunes.js\`: \`score(id)\`, every note of a number's music on the dance's counts.

The game in \`reference/\` shows how a page uses them: \`reference/README.md\` maps its files and states every rule.
`);
const person = fs.readFileSync(path.join(HERE, 'person.txt'), 'utf8').trim();
for (const arm of ['Aplus', 'B']) fs.writeFileSync(path.join(out, `brief-${arm}.txt`), fs.readFileSync(path.join(HERE, `brief-${arm}.txt`), 'utf8').replace('{{PERSON}}', person));
console.log(JSON.stringify({ out, files: { Aplus: fs.readdirSync(path.join(out, 'Aplus')), B: fs.readdirSync(path.join(out, 'B')) } }));
