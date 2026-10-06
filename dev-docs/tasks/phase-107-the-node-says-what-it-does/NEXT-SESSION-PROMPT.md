# P107 — next session

**Written 2026-10-06 (s51).** Read the [README](README.md) §2–§7 (R15 is the newest ruling). s51's record is
[NSP-016 §7.12](NSP-016-VISUAL-NODES.md) (the Text v5, the zone side); s50's is §7.11.

## Board (from the task files)

| task | built | committed |
|---|---|---|
| NSP-000 … NSP-015 | as s44 (NSP-013 left: AC2, the deep run for s11–s14; NSP-014 / NSP-015 left: AC2's export half, P18) | s1 … s44 |
| **NSP-016 the visual nodes** | 🟡 9 of 19 conform. **The Text v5 (s51): step (b) done — the zone side.** The other 10 need infrastructure (§7.6). AC4 waits for NSP-017 | `aa8abb06f` … s51 |
| NSP-023 the spec without React | ✅ all six ACs (s50) | s45 … s50 |
| NSP-006 the stranger | ✅ rounds 1–4 | `649e6864d` |
| NSP-020 ports without a viewer | rows only | s20 |
| NSP-022 the cloud-only nodes | 📋 (needs a second runtime target) | s21 |

**115 of 147 conform on the runtime (78.2%)**, unchanged: the Text was already counted. The census was not regenerated.

## What s51 settled

1. **The zone side** (text.ts v5; 248 → 1,203 scenarios; acts 14 → 17). Three cards sit on the Text's page (`CARDS`: a Drag
   Value and a Drag Kind each). The runtime face builds them as real Draggable Texts in their own containers, armed after
   their first render (`page.cards`, `cardActs` in node-spec-target.ts). New acts: `grab` (mouse), `pickUp` (keyboard) and
   `away` (the pointer onto nothing). The module has ONE gesture, so the Text's existing `move`, `release`, `click` and `key`
   carry a card's gesture. State: `carry`, `carryBy`. No format change, nothing hashed moved, so the stranger was not re-run.
2. **Two runtime rules the handoff did not foresee, found by the deep run's matrix and modelled (R3):**
   - the keyboard can be on a card (`cardFocused`): a Space the Text cannot take goes to the card and lifts it;
   - a pointer drag whose element was replaced drops the Text on ITSELF (`sourceElem`, `pointerAt`; zoneAt skips only zones
     inside the OLD element). This is **C78 by the pointer**: the C78 ledger's "the pointer can never do it" was wrong, and a
     paragraph was added (the file is P109's, ISL-031).
   `pointerAt` is declared `synced` (it follows every pointer act).
3. **Three new rows.** **C83** (low): a card carried from the keyboard drops into a zone that has left the page (Mounted off);
   modelled, as C81 is. **C84 and C85** (medium; found by the runtime's 10,000, both C82's shape): drag-drop.ts reads Accept Kind
   (`kindsOf`) and Zone Name (`zoneName`) as text and throws on anything else. With a bad Accept Kind a pointer let go dies
   before its swallow and its drop, the gesture never ends, and no later drag starts; with a bad Zone Name a drop fires Dropped
   and then never finishes. Known rows on the runtime (`nonTextAcceptKind`, `nonTextZoneName`), each a row scenario + twin.
4. **How the mutants converged** (worth knowing for Group): adding the matrix first pushed the 200 run to 345 survivors.
   **Writes made only when a value changes doubled the branch shapes.** Writing what an act always does, unconditionally,
   took it to 44. Then 7 new equivalents (a click that starts and ends its own press; a carry ended outside a zone) and the
   paint recipe with one change: **END every gesture before Space reads the keyboard** (a card's mouse carry swallowed the
   Space). The "mounted again" case needed the read inside the act's own frame.
5. **The handoff's "human decisions outstanding" list was stale.** `node scripts/bugs.js --from P107 --all` at s51: 71 fixed,
   45 scheduled (P109, mostly ISL-028 … ISL-033), 1 wontfix, **0 needs-ruling, and open: C81, C82 (s50) and C83, C84, C85
   (s51).** P109 owns asking
   about and fixing the app for the scheduled ones.
6. **C79 reaches the drag**: an invisible Text takes the press that starts its own drag (the runtime's 10,000, sequence 5059 of
   seed 20732). The `invisibleTakesPointer` matcher now also counts Is Lifted / Drag Over going true and Picked Up.

**Readings (2026-10-06; load 3–6, a P109 peer's suites running beside; the census not regenerated).**
- Interpreter, 200 (seed 13), all 1,203 scenarios: CONFORMS, 0 divergences, 3,228 / 3,254 mutants killed, 26 declared, 0
  survivors (244 s). This is `batch-visual`'s gate for the Text.
- Interpreter, 10,000 (seed 20731), 1,201 scenarios (before the last two kills): CONFORMS, 0 divergences, 3,274 / 3,302
  killed, 28 declared, 0 survivors (451 s).
- Runtime, 200: CONFORMS on seed 13 (550 s) and seed 20730 (526 s) at 1,191 scenarios, and on seed 20732 (565 s) at 1,203,
  where C85 was attributed once. The known-rows test is green: C79, C82, C84 and C85 each still fire.
- Runtime, 10,000 (seed 20732), 1,203 scenarios, after the C79 matcher was widened: CONFORMS, 0 unattributed divergences;
  known C79 ×4, C82 ×1, C84 ×5, C85 ×1; 3,228 / 3,254 mutants; all 7 tests of the file green (1,516 s).
- Package checks: page model, page-model plants, catalog parity, schema and adapter, 360 / 360; `tsc --noEmit` clean.
  **Not run:** the whole package suite (`batch-visual` is ~40 minutes); its Text part is the 200 reading above, and no other
  spec moved. **Not run either: the stranger file.** A P109 peer has an open edit to spec.ts and world.ts (ISL-029 D24,
  `backendUser(backend)`), both hashed. That is theirs to refresh. s51 touched no hashed file.

## What s52 does

1. **Group** (NSP-016; its children are the slots): Drop Index from the keyboard (ArrowUp / ArrowDown over the slots), a card
   that is one of its own children (its home index, `homeIndex`), and C81's label-swap case (a "Drop files here" child
   replaced while a file hovers). Reuse the Text's cards (`acts.grab.values`) and its page-model keys. **Build the matrix
   from the start**, with the s51 observer (Space on it hidden, Escape, a move and a let go, the hold, Space after a new
   Tag), and write what an act always does unconditionally. Deep-run at 10,000 on both targets before the handoff.
2. **Then Image and Circle** (the Text with another look). Each needs a page model (G1), written while sorting.
3. Re-run the whole runtime visual batch per spec (`NSP_ONLY=<one type>`), not as one run.
4. **Cost to watch:** the Text at 200 now takes ~230 s on the interpreter (with mutants) and ~530 s on the runtime (was 115 s).
   The package's `batch-visual` is ~4 minutes longer. If a matrix for Group would double that again, join its segments
   (the s45 recipe: play each segment alone, then the joined run) rather than adding plays.

**Human decisions outstanding.** Ask in plain words (README §7 holds the earlier ones):
- **C81, C82, C83, C84, C85** (all open, none asked yet). Each has a proposed fix in its ledger file, and none needs a ruling on
  intent. They may belong on P109's list beside ISL-031's drag-and-drop rows (C77, C78, C79). Ask whether to hand them over.
  C84 and C85 are one-line fixes (`String(...)`) that unstick every drag on a page; they are the most worth fixing.
- **R7, R8, R4's confirmation and G1**, and NSP-017's question about the templates' CSS sheets, as before.

**Known face choices, written down (not gaps):** as s46's handoff, plus s51's: a card is drawn first and armed after, so it
has its tabindex before the first step; a card is never hidden; `grab` is a press and a move past the slop, over the card;
`away` moves onto the page's body; `elementFromPoint` answers the element the last pointer act landed on while it is
connected, so a pointer act on an element that is later hidden still counts as "over it" at the hold timer.

## Before you start

- **R11 / R12:** keep React out of the spec. React's mechanics go in the runtime target and its face, never in a spec's
  state or rules.
- **Shared checkout.** Commit through a temporary index with `BASE` pinned **in the same Bash call** as `read-tree`, and
  build bug files that P109 has re-headed (uncommitted `phase: P109` / `task: ISL-031`) as `git show $BASE:<file>` plus your
  edit (s47 used a patch script for both the working tree and HEAD's text). Then `git reset -q -- <yours>`. A peer committed
  between s47's reads and its commit, and the pinned base handled it. Never `git add -A`, never `git stash`; one heavy job
  at a time, with `uptime` first. **The `/next` state file belongs to P109; do not overwrite it.**
- **After a `/clear`, a running suite or an uncommitted pile may be your own pre-clear session's**: read the `.jsonl` tail.
- **Row scenarios are labels**: a scenario with a `row` counts as known on ANY divergence, and the matchers grade only the
  generated sequences. So a row scenario's name must say the intent, and a twin must grade what the row would hide.
- **The probes** (s47's; s48 and s51 rebuilt `zz-side`; all deleted; each takes a minute to rebuild). s51 added `zz-mut.test.ts`
  in the spec package: `discoverBranches` over the suite, then ONE mutant (`ZZ_M` = reducer||kind||branch||swappedWith) played on
  the scenarios whose names hold `ZZ_NAMES`, with the branch's and the sibling's recorded examples printed. Read the examples
  before calling a survivor equivalent. The matrix generators lived in the scratchpad; the JSON is the source.
  - `noodl-runtime/test/node-spec/zz-side.test.ts`: every scenario of `NSP_TYPE` (or of the JSON file `ZZ_FILE`) on both
    targets, compact traces, `!!` on a difference. `ZZ_ONLY` takes indices, `ZZ_PRINT=1` prints the traces, `ZZ_ALL=1`
    keeps the quiet outputs.
  - `zz-at.test.ts`: the events around index `ZZ_AT` of scenario `ZZ_I` on both targets.
  - `nodegx-node-spec/tests/zz-conf.test.ts` (s50 rebuilt it, 10 lines: `runConformance` on `interpreterAdapter` per seed): `NSP_ONLY`,
    `NSP_SEEDS` (a comma list), `NSP_N`. Run the package suite with `--testPathIgnorePatterns zz-` while a probe exists.
  - `zz-branches.test.ts` (s50 rebuilt it: `discoverBranches` + `play` over `loadScenarios` and `generateSequence`): `ZZ_BRANCH` is a
    substring of `reducer|shape`, `NSP_SEED`, `NSP_N`; prints each branch with its recorded example. **At 10,000 the examples differ
    from 200's**: read them at the run's own size.
  - `noodl-runtime/test/node-spec/zz-replay.test.ts`: the UNSHRUNK generated sequence for each seed in `ZZ_SEEDS` (from a
    replay file) at run seed `NSP_SEED`, played on both targets, with the events up to the first difference.
  - The rewrite scripts lived in the scratchpad. **The JSON is the source now.**
  - s48's `zz-side` was 40 lines: `play` the scenario on `interpreterAdapter({ resolve: () => spec })` and on
    `withViewerNodes(runtimeTarget())`, with a `World` only when the spec has `needs`, then `compareTraces(...).index >= 0`.
    `specs` is a Record (use `Object.values`).
- **The guard (§8.8) wraps reducers**; a Proxy cannot tell a read from a spread (`{ ...s }` reads every key), so G3 measures
  dependence by PERTURBING a key and comparing the patch. A new visual spec fails G1 until it has a page model.
  `page-model-plants.test.ts` makes each copy by text edits that must each match exactly once. If a spec it plants in
  changes, re-read and re-point the edit, and never weaken the expectation.
- **A replay file is a two-control experiment waiting to happen**: s47 checked the C80 replay with four variants (placed
  label × later change) before widening the matcher.
- The census reads the WORKING TREE; `tiers.json` is hand-kept; a spec behaviour change is a version; an ADDITIVE format
  change needs the stranger hashes refreshed (`node -e "require('./tests/stranger-suite-hashes.helper.js').write()"`) and
  all four rounds green (`tests/stranger.test.ts`, about 10 minutes now). Since s49 the Dropdown, its scenarios, `data-attributes.ts`
  (s50) and the stranger page are hashed; the radio specs and the Text are not.
- **The runtime conformance test's `beforeAll` plays every listed spec before any test, under a 30-minute hook limit:** always set
  `NSP_ONLY`. Without it, `-t 'known rows'` plays all ~115 specs (it outlived a 30-minute background job in s50); the nine visuals
  in one run time out (the Slider alone is ~29 minutes at 200).
- An ABSENCE scenario needs a firing control beside it. JSON has no `undefined` (`{ "set": "<port>" }`). A world FACE
  reports a throw and goes on. A new world-handler kind goes in FOUR places; a new ACT kind in the face and the spec's `acts`.
- Catalog parity compares descriptions VERBATIM, and defaults. Deep-run every new spec before its handoff; print two
  runtime traces before trusting a first-run green; measure REACH; plant defects in a COPY of the runtime node when a first
  run is clean.
