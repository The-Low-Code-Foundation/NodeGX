/**
 * HLS-001 AC3 — a packaging change does not change a single emitted byte.
 *
 * HLS-001 moved two modules into `@nodegx/project-contract`, added a build, and made the manifest
 * publishable. None of that is allowed to alter what the exporter emits. The golden beside this
 * file was generated **at `11b2d3a9`, before the first of those edits**, over the 42 projects that
 * were already in `tests/fixtures/` — artefacts other tasks put there, never a fixture minted for
 * this one, because a budget measured on a fixture only ever bounds the fixture.
 *
 * ## What this gate can and cannot see
 *
 * 🔴 **It is blind to `detectIO`.** Not one of the 42 corpus projects contains a Logic Builder
 * node — measured, and the reason it is written here rather than assumed: an identity gate that
 * never reaches the module you moved reads green for the wrong reason. What grades that half is
 * `@noodl/runtime`'s own eight `logic-builder-*` suites and the editor's `lgc-*`/`vfn-*` specs,
 * which run against the moved code through the re-export.
 *
 * ✅ It is **not** blind to the token vocabulary: changing one value in
 * `@nodegx/project-contract/tokens` moves 42 of these hashes (every project's `tokens.css`). That
 * control was run in both directions — against the editor's old copy before the move and against
 * the contract package's copy after it — so the corpus is known to reach the module, not merely
 * known to agree with itself.
 *
 * 🔴 **If this goes red, the honest first question is what changed in the export, not whether the
 * golden is stale.** Regenerating it (`HLS001_REGENERATE=1 npx jest hls001-corpus`) is a design
 * conversation, exactly like the hand-written goldens elsewhere in this suite — a red count gate is
 * answered by counting the artefact, never by bumping the literal.
 *
 * ## Two instruments, and which one proves which thing
 *
 * ⚠️ **This golden is generated under jest, from the tree after the move, so on its own it cannot
 * prove the move changed nothing.** What proves that is a separate pair of runs recorded in the
 * task file: `scripts/corpus-hashes.ts` under `ts-node` at `11b2d3a9` and again after the last
 * edit — 42 projects, 840 hashes, zero differing, with the token mutant moving 42 of them in both
 * directions. This file is the *forward* net: it keeps the corpus honest from here on.
 *
 * ✅ **C41 is fixed, and this golden was regenerated once, deliberately, because of it.**
 *
 * HLS-001 left the two runners disagreeing about exactly three hashes, all in the `kits` project,
 * and filed the disagreement as a product defect rather than a test artefact: `kitSource.ts` and
 * `parseModules.ts` both narrowed with `error instanceof Error ? error.message : String(error)`,
 * which is **false for an error that crossed a realm boundary** — jest's context, and in the
 * product the `vm` context a kit's own source is executed in. The same failure was reported as
 * `(SyntaxError: Unexpected token 'export')` or `(Unexpected token 'export')` depending on where
 * the error was constructed.
 *
 * HLS-002 hit it from the other end and could not proceed past it: its AC1 compares the editor's
 * export against `nodegx export` byte for byte, and the two trees agreed on all eighteen files
 * **except `EXPORT-REPORT.md`**, differing by exactly that prefix. A defect that blocks an
 * acceptance criterion is the task that finds it. Both sites now call `src/errorMessage.ts`,
 * which asks the value what it has rather than which constructor made it.
 *
 * 🔴 **What was counted before the golden was touched**, because a red count gate is answered by
 * counting the artefact and never by bumping the literal:
 *
 *  - `scripts/corpus-hashes.ts` under `ts-node`, after the fix, against the pre-fix golden:
 *    **3 of 840** hashes differ — `kits/@notes`, `kits/@report`, `kits/EXPORT-REPORT.md`. The
 *    same three HLS-001 recorded, and no others: the fix moved what it was supposed to move.
 *  - after regenerating under jest: **3** hashes changed, and jest and `ts-node` now agree on
 *    **all 840**, where they disagreed about 3 before. The convergence is the evidence that what
 *    was fixed was the realm sensitivity rather than the wording.
 *
 * ✅ **Regenerated a FIFTH time by GAM-006 (P88, session 4), in two counted steps.** Both moved the
 * same one file, because `glow-desk` is still the only corpus project with a `States` node.
 *
 *  1. A States colour inside its per-value delay holds the colour on screen instead of the tween's
 *     parsed RGBA array. The full suite named **1** differing file, `glow-desk/src/lib/states.ts`
 *     (100/101). With only that `statesLib` hunk reverse-applied the gate was 4/4. Regenerating
 *     moved **1** line (`795c6bf2…` → `f474fdaa…`).
 *  2. GAM-006 (a): the emitted `statesLib` reads colours through a transcribed `readColor` and holds
 *     a colour it cannot read. The full suite again named **1** file, the same one. With the step-1
 *     `statesLib` restored the gate was 4/4. Regenerating moved **1** line (`f474fdaa…` →
 *     `8126c053…`), and the gate is 4/4 after.
 *
 *  - The parity is graded in `animation-pair.test.ts`: the delayed-colour A5 row goes red with step
 *    1's export hunk reverted, and the token row goes red with step 2's reader bypassed.
 *
 * ✅ **Regenerated by GAM-002 (P88, session 11), and the red run was counted before the golden was touched.**
 *
 * GAM-002 replaces the Expression port scan (P78 D54: `String(n)` threw "String is not a function").
 * The export mints from a byte-identical copy of the runtime's lexer, which no longer reads a member
 * name after `)` as a port, so `cheer`'s `(name || '').length > 1` lost its unfed `length` input.
 *
 *  - The full suite's red run named **1** differing file, `cheer/src/pages/Home.tsx`, and the two
 *    hand-written pins of the same wrapper (`jsfun.test.ts`, `stores-events.test.ts`) went red with it.
 *  - With HEAD's `jsfun.ts` put back (snapshot, then restored and `cmp`-checked), all three suites
 *    were green again, 70/70. The move was that file and nothing else in the tree.
 *  - Regenerating moved **1** hash line (`2f4c0fef…` → `d420548f…`).
 *
 * ✅ **Regenerated a FIFTH time by GAM-008 (P88), and the red run was counted before the golden was touched.**
 *
 * GAM-008 gives Animate To Value a `Jump To` action (P78 D67: a countdown never refilled), so the
 * emitted `animateLib` gained `jumpTo` and `carryOn` in step, and it *is* allowed to move bytes.
 *
 *  - The full suite's red run named **2** differing files, `board-desk/src/lib/animate.ts` and
 *    `glow-desk/src/lib/animate.ts`: the two projects that emit the animate library.
 *  - With HEAD's `animateLib.ts` put back (snapshot, then restored and `cmp`-checked), this gate
 *    was green again, 4/4. The move was that file and nothing else in the tree.
 *  - Regenerating moved **2** hash lines in the golden, those two files.
 *  - 🔴 The parity is graded elsewhere: `animation-pair.test.ts` A4 runs the runtime's real node
 *    and the emitted library over 7 jump scripts, plus a CONTROL that disagrees when `carryOn`
 *    is disabled.
 *
 * ✅ **Regenerated a FOURTH time by GAM-006 (P88), and the red run was counted before the golden was touched.**
 *
 * GAM-006 (b) makes a States colour transition end on the value its state names instead of the
 * tween's parsed hex, because a `var(--token)` came out as `#0aNaNNaNNaN` (P78 D49). The emitted
 * `statesLib` changed in step, so it *is* allowed to move bytes.
 *
 *  - The full suite's red run named **1** differing file, `glow-desk/src/lib/states.ts`. `glow-desk`
 *    is the only one of the 46 fixture projects with a `States` node (`grep -rl '"States"'
 *    tests/fixtures`), and no other project emits `states.ts`.
 *  - With GAM-006's two source hunks reverse-applied, this gate was green again, so the move was
 *    that change and nothing else in the tree.
 *  - Regenerating moved **1** hash line in the golden, the same file.
 *  - 🔴 As with CMP-005, the parity that makes this safe is graded elsewhere: `animation-pair.test.ts`
 *    A5 boots the runtime's real `states.ts` and compares it frame by frame with the emitted
 *    `statesLib`. It went 7 red with the export half reverted and is 57/57 with both halves in.
 *
 * ✅ **Regenerated a THIRD time by CMP-005 (P85), and the count was predicted before it was taken.**
 *
 * CMP-005 gave `Date To String` the tokens an app actually needs (weekday, full month name,
 * 12-hour clock, unpadded numbers, ordinal) and a `Locale` port, so like HLS-004 it *is* allowed
 * to move bytes: the emitted `dateToString` gained a fourth argument and `src/lib/date.ts` gained
 * the substitution pass. The prediction, made from `grep -rl '"Date To String"' tests/fixtures`
 * **before** the golden was touched, was **two projects and no others** — `deadline-desk` and
 * `due-desk` are the only corpus projects that contain the node.
 *
 *  - **4 of 840** hashes differ, and they are those two projects' `src/lib/date.ts` and
 *    `src/pages/Home.tsx` — the emitted library and its one call site. The other 42 projects do
 *    not emit `date.ts` at all, which is why a change to the formatter reaches four files rather
 *    than forty-four.
 *  - 🔴 The parity that makes this safe is graded elsewhere and deliberately not here:
 *    `tests/date-family.test.ts` runs the **emitted** library and the **runtime node's own
 *    `_format`** over the same formats and asserts they agree, CMP-005's new tokens and every
 *    Locale included. This gate answers "did the bytes move"; that one answers "do the two
 *    implementations still say the same thing", and only the second can catch a divergence that
 *    moves both sides at once.
 *
 * ✅ **Regenerated a second time by HLS-004, and here is what was counted first.**
 *
 * HLS-004 changed the re-hosted JS wrapper's input contract (`jsWrapperLines` in
 * `src/emit/component.ts`), so unlike HLS-001 it *is* allowed to move bytes — which makes the
 * count the whole of the evidence, not a formality. Against the pre-HLS-004 golden:
 *
 *  - **2 of 840** hashes differ: `batch-desk/src/pages/Home.tsx` and `cheer/src/pages/Home.tsx`.
 *    They are the only two corpus projects with a re-hosted `Function` or `Expression`, and the
 *    diff in each is confined to the wrapper's signature line and the scope binding beneath it.
 *  - **0** files appeared or vanished in any project that already existed.
 *  - **1** project was added — `budget-desk`, minted by HLS-004 because the corpus had no
 *    fixture doing arithmetic on a component input, which is why a green gate had never once
 *    compiled issue #24's shape. 🔴 It is a fixture minted for a task, which §1 above warns
 *    about: it bounds nothing on its own, and the 42 projects around it are what keep this gate
 *    honest. Its own claims are graded in `hls004-an-export-that-builds.test.ts`.
 *
 * ⚠️ The `42` above is left as written: it is the count HLS-001 took, and the row below now
 * asserts 43 because a project was deliberately added. The two numbers disagreeing is the record.
 */
import * as fs from 'fs';
import * as path from 'path';

import { corpusHashes, corpusProjects } from '../scripts/corpus-hashes';

const GOLDEN = path.join(__dirname, 'goldens', 'hls001-corpus.sha256.json');

// `HLS001_REGENERATE=1` rewrites the golden from this runner. Deliberately an explicit opt-in and
// not an auto-heal: a gate that repairs itself on red grades nothing.
if (process.env.HLS001_REGENERATE === '1') {
  fs.writeFileSync(GOLDEN, JSON.stringify(corpusHashes(), null, 2) + '\n');
}

describe('HLS-001 AC3 — emitApp over the corpus is byte-identical', () => {
  const golden: Record<string, Record<string, string>> = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));

  it('the corpus is the one the golden was taken over', () => {
    // Arming the instrument: a corpus that shrank to nothing would make the comparison vacuous.
    //
    // 43 → 44 on 2026-09-09 (HLS-005), counted off `ls tests/fixtures/`, not inferred from the
    // failure: `status-rail` is issue #23's own table reconstructed as a project, added because
    // the golden's 43 already carried the defect but none of them carried it in the shape the
    // issue describes — one input reaching three sinks of which two survive.
    //
    // 44 → 45 on 2026-09-11 (FLD-015), counted the same way: `charts` is issue #39's shape — a
    // chart kit fed from a Static Data array, beside the same chart built the old way out of a
    // Group with a wired width. None of the 44 had an array read into anything but a repeater,
    // which is exactly why the hole was invisible.
    //
    // 🔴 **The regenerate was additive and that was MEASURED, not assumed.** The "different
    // byte" row above was green before the golden was touched, and diffing the two files after
    // said: one project added, none removed, **zero existing hashes changed**. That is what says
    // FLD-015's widening of `bindable` and of `Static Data.items` emits nothing new for a project
    // that had neither.
    //
    // 45 → 46 on 2026-09-12 (EXP-014 §14.5), counted the same way: `picture-desk` is the first
    // project in the corpus with a route two segments deep (`gallery/team`), which is the depth at
    // which a project-relative `<img src>` resolves under the route and 404s.
    //
    // 🔴 **This regenerate was NOT purely additive, and that was counted before the golden was
    // touched**: 9 existing hashes changed and 3 files were added, in exactly the three projects
    // with a WIRED picture — `gallery-desk` and `photo-desk` (`src={mediaSrc(…?.url)}` off a Cloud
    // File) and `puppy-test-3` (`src={mediaSrc(photo)}` in PuppyCard) — each moving `Home.tsx` /
    // `PuppyCard.tsx`, `EXPORT-REPORT.md` (its file count, `src/lib/media.ts` joined) and `@report`.
    // Zero hashes changed in the other 42, which have no wired media URL. `tests/the-picture-path.test.ts`
    // grades the rule; the hand-written PuppyCard golden in `visual.test.ts` moved by the same two lines.
    //
    // 46 → 47 on 2026-09-17 (P88 GAM-013): `beat-desk` is the first project with a `Repeat`, the new built-in
    // node (18 files added). 🔴 **Not additive, counted before the literal moved:** 46 existing hashes changed,
    // every one a project's `README.md` and nothing else, because the alpha sentence reads the ledger and now
    // says "118 of the 128 nodes you can place". Proved by putting 117/127 back in three READMEs (tick-desk,
    // cheer, socket-desk): each hash equalled the old golden. Zero other files moved.
    //
    // 47 → 48 on 2026-09-17 (P88 GAM-017, export half): `kit-signals` is the first project with a Click wired into a
    // kit node's signal input, both ways a kit declares one. Counted before the literal moved: one project added, and
    // exactly one existing file changed in each of the two projects that carry a kit (`kits`, `charts`):
    // `src/kits/runtime.tsx`, which now seeds a signal prop and runs `valueChangedToTrue` on a rising count. Zero other
    // hashes moved.
    //
    // 48 → 49 on 2026-09-18 (P94 STY-004 Part A): `look-desk` is the first project in the corpus
    // with a `nodegx.styles.json` at all — a Look, a text style and a colour style, which is the
    // dictionary the exporter had never opened. 15 keys added, counted off `ls tests/fixtures/`.
    //
    // 🔴 **Not additive, and the 48 that moved are NOT this task's:** every one of them is
    // `<project>/src/styles/tokens.css` and nothing else. `git log 99522fd72..HEAD --
    // packages/nodegx-project-contract/tokens.ts` names exactly one commit, `19b3517d3`
    // (P88 GAM-026), which adds `--ring-width` to the shared vocabulary and did not regenerate
    // this golden; `git merge-base --is-ancestor 99522fd72 19b3517d3` is true, so the golden was
    // older than the token. **Attributed by a control rather than by that argument:** for `cheer`,
    // `tick-desk`, `socket-desk` and `task-desk`, deleting just the two lines that token
    // contributes from the freshly emitted `tokens.css` reproduces the *old* golden hash exactly,
    // 4 of 4. The header's own prediction — "changing one value in `@nodegx/project-contract/tokens`
    // moves 42 of these hashes (every project's `tokens.css`)" — is the shape that was seen.
    //
    // ✅ **And that is the strongest form of STY-004's own AC7 available:** carrying Looks, text
    // styles and colour styles into the emitter moved **zero** existing bytes in 48 projects — no
    // `.module.css`, no `.tsx`, no `EXPORT-REPORT.md`, which is what says `stylesReport` prints
    // nothing for a project with no style dictionary.
    expect(corpusProjects().length).toBe(49);
    expect(Object.keys(golden).sort()).toEqual(corpusProjects());
  });

  it('the golden covers a non-trivial number of emitted files', () => {
    const entries = Object.values(golden).reduce((n, files) => n + Object.keys(files).length, 0);
    expect(entries).toBeGreaterThanOrEqual(800);
  });

  it('no project emits a different byte than it did before HLS-001', () => {
    const now = corpusHashes();
    const differing: string[] = [];
    for (const [project, files] of Object.entries(golden)) {
      for (const [file, sha] of Object.entries(files)) {
        if (now[project]?.[file] !== sha) differing.push(`${project}/${file}`);
      }
    }
    expect(differing).toEqual([]);
  });

  it('no project emits a file the golden does not know about', () => {
    const now = corpusHashes();
    const added: string[] = [];
    for (const [project, files] of Object.entries(now)) {
      for (const file of Object.keys(files)) {
        if (!(file in (golden[project] ?? {}))) added.push(`${project}/${file}`);
      }
    }
    expect(added).toEqual([]);
  });
});
