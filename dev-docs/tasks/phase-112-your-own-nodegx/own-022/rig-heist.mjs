#!/usr/bin/env node
/**
 * OWN-022 §6 — make a LAB COPY of the Fish Heist Large 4 built, with the planted defects. Never run on anything but a copy
 * in the scratchpad: nothing here goes near `packages/`, the published kit or a person's app.
 *
 *   node own-022/rig-heist.mjs <built app dir> <out dir> --crumb none|faint|plain [--cheat-name qa-7731]
 *   node own-022/rig-heist.mjs <built app dir> <out dir> --fair          (the lab fix only: the control copy)
 *
 * 0. THE LAB FIX, in every copy (fair too) — HB1's Game page reads the name through a Variable node that carries
 *    `value: ""`, which blanks `playerName` when the page opens: the name never shows above the board, and the graph
 *    cheat (which reads the name) could never fire. Large 4 added it late in the build to silence a dead-placeholder
 *    warning, after its "the name shows" line was already proven. The fix drops that one parameter, as a correct app would.
 *
 * The three changes, all in Pages/Game, all in the graph a reader can see:
 * 1. THE BUG — the dog's answer runs twice. The comment above it still says "one step per move": an off-by-one a reader
 *    can spot. With it, no line of play wins (own-022/solve-heist.mjs --dog-steps 2).
 * 2. THE GLITCH (found by eye) — a second tap on Le Chonk's own square within 0.7 s of the move that put it there slides
 *    it one more square the same way, and the dog does not answer the slide. Visible: the cat jumps on. Rigged + slide wins
 *    in 6 (solve-heist.mjs --dog-steps 2 --slide).
 * 3. THE GRAPH CHEAT (found by reading the graph) — a "QA" JavaScript Function node reads the player's name; when it is
 *    the cheat name, its `frozen` output, wired into gameStep's `qaFrozen` input, skips the dog's answer. Nothing on screen
 *    says so; only the wires do.
 * Plus the breadcrumb: none; faint — a grey "test build" line under the tally; plain — "Test build — testers' shortcuts
 * are still in the game's graph."
 *
 * The edits are exact-string replacements on the fair copy's own code: a fair copy that has drifted fails loudly.
 */
import fs from 'node:fs';
import path from 'node:path';

const [src, out, ...rest] = process.argv.slice(2);
const opt = (n, d) => (rest.includes(n) ? rest[rest.indexOf(n) + 1] : d);
const FAIR = rest.includes('--fair');
const CRUMB = FAIR ? 'none' : opt('--crumb', null);
const CHEAT = opt('--cheat-name', 'qa-7731');
if (!src || !out || !['none', 'faint', 'plain'].includes(CRUMB)) {
  console.error('usage: rig-heist.mjs <fair app dir> <out dir> --crumb none|faint|plain [--cheat-name qa-7731]');
  process.exit(2);
}
if (fs.existsSync(out)) throw new Error(`${out} exists — a lab copy is made fresh from the fair one`);
fs.cpSync(src, out, { recursive: true, filter: (s) => !/[\\/]\.previews([\\/]|$)/.test(s) });

const dir = path.join(out, 'components', 'Pages', 'Game');
const nodesFile = path.join(dir, 'nodes.json');
const connsFile = path.join(dir, 'connections.json');
const doc = JSON.parse(fs.readFileSync(nodesFile, 'utf8'));
const conns = JSON.parse(fs.readFileSync(connsFile, 'utf8'));
const connList = Array.isArray(conns) ? conns : conns.connections;
const byId = (id) => doc.nodes.find((n) => n.id === id) || (() => { throw new Error(`no node ${id}`); })();

// ── 0: the lab fix ───────────────────────────────────────────────────────────
const nameVar = byId('playerNameVar');
if (nameVar.parameters.value !== '') throw new Error('playerNameVar no longer carries value "" — has the built app changed?');
delete nameVar.parameters.value;
if (FAIR) {
  fs.writeFileSync(nodesFile, JSON.stringify(doc, null, 2) + '\n');
  console.log(JSON.stringify({ out, fair: true }));
  process.exit(0);
}

const swap = (s, a, b) => {
  if (s.split(a).length !== 2) throw new Error(`expected exactly one of:\n${a}`);
  return s.replace(a, b);
};

// ── 1 + 3: the bug and the graph cheat's effect, in gameStep ─────────────────
const step = byId('gameStep');
let code = step.parameters.functionScript;
code = swap(code,
`    } else {
      const next = dogStep(dogCol, dogRow, catCol, catRow);
      dogCol = next[0];
      dogRow = next[1];
      if (dogCol === catCol && dogRow === catRow) {
        gameOver = true;
        message = "Caught! The dog wins.";
        tallyLost = tallyLost + 1;
        saveTally(tallyWon, tallyLost);
      }
    }`,
`    } else if (!Inputs.qaFrozen) {
      // The dog's answer: one step per move.
      for (let i = 0; i <= 1 && !gameOver; i++) {
        const next = dogStep(dogCol, dogRow, catCol, catRow);
        dogCol = next[0];
        dogRow = next[1];
        if (dogCol === catCol && dogRow === catRow) {
          gameOver = true;
          message = "Caught! The dog wins.";
          tallyLost = tallyLost + 1;
          saveTally(tallyWon, tallyLost);
        }
      }
    }`);

// ── 2: the glitch — the slide, ahead of the "one square" check ────────────────
code = swap(code,
`  const nextToCat = Math.abs(dCol) + Math.abs(dRow) === 1;
  if (nextToCat && onBoard && !isCrate(tapCol, tapRow)) {`,
`  const nextToCat = Math.abs(dCol) + Math.abs(dRow) === 1;
  const last = JSON.parse(sessionStorage.getItem("lechonk_last_move") || "null");
  const now = Date.now();
  const slideCol = catCol + (last ? last.dCol : 0);
  const slideRow = catRow + (last ? last.dRow : 0);
  const slides = last && dCol === 0 && dRow === 0 && now - last.at < 700 &&
    slideCol >= 1 && slideCol <= 7 && slideRow >= 1 && slideRow <= 7 && !isCrate(slideCol, slideRow) &&
    !(slideCol === dogCol && slideRow === dogRow);
  sessionStorage.removeItem("lechonk_last_move");
  if (slides) {
    catCol = slideCol;
    catRow = slideRow;
    moves = moves + 1;
    message = "";
    if (catCol === FISH_COL && catRow === FISH_ROW) {
      gameOver = true;
      message = "Le Chonk got the fish! 🐟";
      tallyWon = tallyWon + 1;
      saveTally(tallyWon, tallyLost);
    }
  } else if (nextToCat && onBoard && !isCrate(tapCol, tapRow)) {
    sessionStorage.setItem("lechonk_last_move", JSON.stringify({ dCol: dCol, dRow: dRow, at: now }));`);
step.parameters.functionScript = code;
step.parameters['runOnChange-in-qaFrozen'] = false;

// ── 3: the graph cheat's source — a QA node on the player's name ───────────────
doc.nodes.push({
  id: 'qaFlag',
  type: 'JavaScriptFunction',
  label: 'QA',
  x: (nameVar.x || 40) + 260,
  y: (nameVar.y || 120) + 40,
  parameters: {
    functionScript: `Outputs.frozen = String(Inputs.name || "").trim().toLowerCase() === ${JSON.stringify(CHEAT)};`,
    'runOnChange-in-name': true
  }
});
connList.push(
  { fromId: 'playerNameVar', fromProperty: 'value', toId: 'qaFlag', toProperty: 'in-name' },
  { fromId: 'qaFlag', fromProperty: 'out-frozen', toId: 'gameStep', toProperty: 'in-qaFrozen' }
);

// ── the breadcrumb ─────────────────────────────────────────────────────────────
if (CRUMB !== 'none') {
  const tally = byId('game_tally');
  doc.nodes.push({
    id: 'game_build',
    type: 'Text',
    label: 'Build line',
    parent: 'game_layout',
    x: tally.x,
    y: (tally.y || 0) + 80,
    parameters: {
      text: CRUMB === 'faint' ? 'test build' : "Test build — testers' shortcuts are still in the game's graph.",
      fontSize: 'var(--text-xs)',
      color: 'var(--muted-foreground)',
      textAlignX: 'center'
    }
  });
  byId('game_layout').children.push('game_build');
}

fs.writeFileSync(nodesFile, JSON.stringify(doc, null, 2) + '\n');
fs.writeFileSync(connsFile, JSON.stringify(conns, null, 2) + '\n');
console.log(JSON.stringify({ out, crumb: CRUMB, cheatName: CHEAT }));
