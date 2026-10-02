# ISL-002 — A `false` from a States node's first state reaches its wire as `false`

**Status: 🟡 s3 (2026-10-02): ruled ("Fix both, one commit") and fixed in `06e65ab47` — runtime, export and P107's spec; AC1–AC4 green with their sabotage arms. AC5 driven on a deployed page with its control; AC6 is written (README §6). Every AC met — ✅ **CLOSED 2026-10-02.** Scoped 2026-10-01 at `27d891bf3`. **Source:** [audit](AUDIT-2026-10-01.md) F02 ·
[P106 IG-003](../phase-106-the-island-grows/IG-003-DRIVE-TEACH-PLAY.md) §7, deviation 4 (line 169-172) · the template's
note at `packages/noodl-mcp/tests/cg003Components.ts:1072-1074` · **Side:** product (runtime, the `States` node; the
exported States library too)

Olive's Island has a Drive mode and a Teach mode. Its States node said `record: false` in Drive, the first state, and
four Drive presses still recorded four blocks. The same state's strings arrived. The template now sends `'yes'`/`'no'`.

## 1. The person sentence

**Someone gives a States node a yes/no value, or an empty text, and the node starts in its first state. The wire
carries exactly what that state says, `false` or `''`, from the moment the page opens.**

## 2. What was measured

| reading | where |
|---|---|
| 🔴 **The first state is entered by `jumpToState`, which writes `stateParameters[prefix + v] \|\| 0` for every value, whatever its type.** So a `false` is published as the number `0`, and so is an empty string `''`. A non-empty string survives the `\|\|`, which is why the strings in the same state arrived. *Re-read at HEAD* | `packages/noodl-viewer-react/src/nodes/std-library/states.ts:580-615` (the line is `:592`) |
| Every later move goes through `goToState`'s typed branch. A boolean becomes `_b === undefined ? false : !!_b`, and a string is assigned as it is. So the same `false` is correct when the node comes **back** to the first state. *Re-read at HEAD* | `states.ts:765-768` (first call → `jumpToState`), `:780-788` |
| The first entry is scheduled by the `states` setter (`scheduleGoToState(startState \|\| states[0])`), after every input of the update, so the `value-…` parameters are already stored when `jumpToState` reads them. *Re-read at HEAD* | `states.ts:277-290`, `:640` |
| A `value-` parameter that arrives later, while the node is in that state, writes the raw value and flags it. That path does not coerce. *Re-read at HEAD* | `states.ts:494-509` |
| `0` is sent: `sendValue` drops only `undefined`. *Re-read at HEAD* | `packages/noodl-runtime/src/node.ts:814-835` |
| The template's reader is `var record = Inputs.record !== false && String(Inputs.record) !== 'no'`. A `0` passes both tests, so it records. That alone explains "four Drive presses recorded four blocks". *Re-read at HEAD* | `packages/noodl-mcp/tests/cg003Scripts.ts:365` |
| IG-003 wrote that the `false` *"never reached Record step (the input stayed unset, and unset records)"*. The file does not say whether the input was read or inferred from the behaviour. ⚠️ **The source predicts the input arrived as `0`, not unset.** AC1 decides | `phase-106…/IG-003-DRIVE-TEACH-PLAY.md:169-172`, as recorded 2026-09-28 or 09-29 (IG-003 session dates), not re-driven |
| The same template still uses first-state booleans that happen to be harmless. Examples are `teaching: false` and `padShown: true` in `plMode`, and `iwPayState`'s `shown: false`, where a reader that treats `0` as false sees no difference. *Re-read at HEAD* | `cg003Components.ts:1068-1078`, `:1757` |
| A comment in the same file already names the `\|\| 0` pattern as a past defect in the transition code (it *"animated every value to 0"*). *Re-read at HEAD* | `states.ts:387-396` (NDA-004 §2's note on `onStart`); also `:178` (`targetValues[v] = … \|\| 0`, numbers only) |
| 🔴 **The export copies it.** The exported States library's `jumpToState` writes `m.def.values[v].byState[state] \|\| 0`. *Re-read at HEAD* | `packages/nodegx-export/src/emit/statesLib.ts:324-334` (`:330`) |

## 3. Where it bites a person

- **Anyone who starts a yes/no in its "no" state.** That is the commonest shape there is: closed, off, not editing, not
  recording. The wire carries `0`. A reader that tests `=== false`, `!== false`, `typeof === 'boolean'`, or shows the
  value as text then sees something else: a Function, a Condition with strict checking, a Text that shows `0`.
- **An empty text in the first state shows `0`.** That covers a placeholder, a cleared label, or a CSS class that should
  be empty. Predicted from the same line, not yet seen in a template.
- **It is invisible on the canvas.** The editor shows the parameter as `false`, and the inspector of a running node may
  show `0`. Nobody thinks to look, because after the first move it is right.

## 4. Related work and collisions

- **D49 / [GAM-006](../phase-88-the-defects-the-games-found/GAM-006-A-COLOUR-SWITCHED-BY-STATES-REACHES-THE-SCREEN.md)**
  is a different line. It is colours through **transitions** (`onStart`'s parse, `states.ts:161-195`), and it is
  🟢 built. This defect is the first **jump**, with transitions on or off, and the template has `useTransitions: false`
  on every States node (`cg003Components.ts:185`). AC1 keeps them apart: transitions off in both arms.
- **Memory "LASTSENT"** (an output can never go back to `undefined` on a wire) does not explain this. `0` is a defined
  value and is sent. Memory "a States node driven by a value stays in its first state" (D43) is about the
  `currentState` **input**. This is about a value **output**.
- **P107 [NSP-013](../phase-107-the-node-says-what-it-does/NSP-013-BATCH-DATES-PARSERS-UTILITIES.md)** will spec States
  (T1 machine plus T2 clock, lines 23 and 37). If NSP-013 specs it first, its spec will either pin `|| 0` as the
  reference or record it as a row for a ruling. Whichever goes first tells the other. The spec and the runtime must
  agree on the ruled answer.
- **P18 EXP-011** owns `statesLib.ts`. The export fix is the same one line and its golden. It needs a
  `coverage-ledger.json` note only if the behaviour changes.
- **P79 [DEFECTS-LESSON-6](../phase-79-the-syllabus/DEFECTS-LESSON-6-FOUND.md)** line 38 teaches that a States node
  starts in its first state. That is unchanged.
- Owner grep: `grep -rln "jumpToState" dev-docs/tasks --include='*.md'` returns SYL-009, DEFECTS-LESSON-6 and GAM-006.
  None of them owns the first-jump coercion. `grep -rn -i "first state" dev-docs/tasks --include='*.md'` turns up no
  owner either. The hits are IG-003's record and RKT-008/006's use of first states.

## 5. Design

🔒 **Ruling 1 (plain words): what should the first state hand out for a value it leaves empty?** Today any empty-ish
value becomes `0`.
- (a) **Exactly what the state says, typed like a later move.** A boolean gives `false` (and `false` when unset, as
  `goToState` does). A string gives `''` (or unset). A number gives `0` when unset. A colour gives what it gives today.
- (b) The same as (a), but a value the state never set stays **unset** for every type, so nothing is sent.
- (c) Leave the runtime alone and document "use strings".

**Recommendation: (a).** It makes the first entry and every later entry the same rule, which is the rule the editor
already shows. (b) changes numbers that work today, and (c) leaves a trap that no author can see.

🔒 **Ruling 2: does the export change with it, in the same commit?** (a) Yes, one rule in both places. (b) The runtime
first, with the export recorded as a known divergence. **Recommendation: (a).** P107 exists so that two targets do not
quietly disagree.

Design constraints:
- One helper decides a state's value by type, and both `jumpToState` and `goToState` call it, so the two paths cannot
  drift again.
- Numbers and colours keep their current first-state behaviour (`0` for an unset number). Only booleans and strings
  change. The census (AC4) shows the size of that change.
- `stateChanged` still does not fire on the first entry (`states.ts:601-612`, deliberate).

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8, before any change.** A runtime spec places a States node (`useTransitions: false`, states `off,on`, values `flag` boolean `false/true`, `label` string `''/'x'`, `word` string `'no'/'yes'`), wires each output to a recorder, and runs one update. It asserts `flag === false` and `label === ''` and is expected RED, reading `0` and `0`. **Known-firing beside it:** `word === 'no'` in the same run is green. **Cause isolation:** the same spec with `to-on` then `to-off` reads `flag === false`, which shows the coercion is in the first jump, not in the wire. A second arm with transitions **on** must give the same first-entry reading, which separates it from D49. Record the recorder's raw value and its `typeof`. |
| AC2 | Ruling 1 lands in `states.ts`, and AC1 is green. The existing States specs (`nda-001-states-reactivity`, `erg-001-states-outcomes`, `nda-004-states-unknown-state`, `gam-006-*`, `fb-020-checkbox-shows-its-state`) stay green. **Sabotage arm:** put back `\|\| 0` at the jump and AC1's two rows go RED, the `word` row stays green. |
| AC3 | **Export (ruling 2).** `statesLib.ts`'s `jumpToState` follows the same rule. A paired spec drives the runtime and the emitted library through AC1's script and compares every published value, with its type. The same sabotage arm turns it RED. |
| AC4 | **Blast radius before landing.** A census of every States node in `templates/`, `library/prefabs/`, the embedded templates and the P86 corpus. It lists each boolean or string value whose **first-state** value is `false`, `''` or unset, and what each one's wire feeds. Every row is classed "harmless" (a reader that treats `0` as false) or "was wrong" (a strict reader, or text shown). The known-firing row is `Pages/Workshop`'s `plMode.teaching`. |
| AC5 | **The person sentence, in a browser.** A minimal project built through the door: a States node that starts `off`, its `flag` wired into a Function that shows `typeof Inputs.flag + ':' + Inputs.flag` in a Text, and its `label` into a second Text. Deployed with `nodegx deploy`, the first paint reads `boolean:false` and an empty label. **Control arm:** the same project over HEAD's runtime reads `number:0` and `0`. |
| AC6 | **The template's workaround.** Say whether Olive's Island's `record` can go back to a boolean. Do not change the template here. Write the sentence into README §6 for P108's next session. |

## 7. Traps

- 🔴 **A loose reader hides it.** `if (Inputs.flag)` and a Condition without strict checking treat `0` like `false`. That
  is why most first-state `false`s in the template look fine. AC1 must read the raw value and its type.
- **A test that moves the node first grades the wrong path.** Only the first entry goes through `jumpToState`. A spec
  that pulses `to-off` before reading reads `goToState`'s correct branch and passes at HEAD.
- **"The input stayed unset" is not established.** Do not write an "unset" fix. Measure what arrives (AC1) before
  choosing between ruling 1's (a) and (b).
- **The template's string workaround hides it from every garden drive.** No Olive's Island reading can grade this
  task.
- The editor's inspector and the deployed page can show the value differently. Grade on the deployed DOM (AC5).

## 8. Session log

### Session 1 — 2026-10-01, P109 s1: AC1 measured, nothing changed in `states.ts`

Spec `packages/noodl-viewer-react/tests/corpus/isl-002-states-first-state-false.test.ts` (the corpus harness; a States
node `off,on` with `flag` boolean `false/true`, `label` string `''/'x'`, `word` string `'no'/'yes'`, each output **wired**
to a recorder that writes the value and its `typeof`). Run under `useTransitions: false` and `true`:

| row | reading at HEAD (both settings) |
|---|---|
| known-firing control: `word` in the first state | `'no'`, `string` ✓ |
| **AC1 `flag`** (predicted red) | **`0`, `number`** ✕ — not `false`, and not unset |
| **AC1 `label`** (predicted red) | **`0`, `number`** ✕ — not `''`, and not unset |
| cause isolation: `to-on` then `to-off` (back to the first state through `goToState`) | `flag` `false` `boolean`, `label` `''` `string`, `word` `'no'` ✓ |

So the coercion is in the first jump only (`states.ts:633`, `stateParameters[prefix + v] || 0`), as §2 predicted, and
**IG-003's "the input stayed unset" is corrected: the input arrived as `0`.** The transitions-on arm reads the same, which
separates this from D49. The two red rows are declared `test.failing` so the shared suite stays green until the ruling's
fix lands; a third row pins the `0`/`0` reading in the suite's own words and is deleted with the fix.

**Not done, by design:** no change to `states.ts` or `statesLib.ts` — ruling 1 ((a) typed value / (b) skip unset / (c)
document) and ruling 2 (export in the same commit) are Richard's. AC4's census, AC5's browser arm and AC6's sentence for
P108 wait on the ruling too.

🔒 **Ruling to ask, in plain words:** *"A States node that starts in its first state currently sends the number 0 where
that state says `false` or an empty text. Should it send exactly what the state says, typed (false, ''), as every later
move already does? And should the exported app's States library change in the same commit?"* Recommended: yes and yes.

### Session 3 — 2026-10-02, P109 s3: ruled, fixed in three places (`06e65ab47`)

**Ruling (README §8, asked in plain words):** *"Should the first state send false / empty text like every later change
does? … Should both be fixed in one commit?"* → **"Fix both, one commit"** — §5 ruling 1 (a) and ruling 2 (a).

**The fix.** One helper, `typedStateValue(type, value)`: a true/false is `value === undefined ? false : !!value`, a text
(and a text style) is the value as named, anything else returns `undefined` and keeps its own rule (`|| 0` on the first
entry, a transition after). `jumpToState` and `goToState` both call it, so the two paths cannot drift again. The same
helper, the same shape, in three files:

| file | what changed |
|---|---|
| `noodl-viewer-react/src/nodes/std-library/states.ts` | `typedStateValue`; `jumpToState` (was `:633`) and `goToState`'s two typed branches call it |
| `nodegx-export/src/emit/statesLib.ts` | the emitted library's `typedStateValue` (over `ValueDef.type`); `jumpToState` and `goToState` call it. The export refuses a value a state leaves unset, so only `false`/`''` reach it |
| `nodegx-node-spec/src/nodes/states.ts` + `scenarios/States.json` | P107's reference reads the same rule; the D19 scenario renamed to the ruled reading, and one added for an empty text a state names (`''`) and a true/false named as `1` |

**Readings:**

| AC | reading |
|---|---|
| AC1 | the spec's two `test.failing` rows are plain `test`s and green in both transition settings: `flag` → `false`/`boolean`, `label` → `''`/`string` (were `0`/`number`); the "what arrives at HEAD" row deleted; known-firing `word` row green |
| AC2 sabotage | a sibling copy of `states.ts` with `\|\| 0` back at the jump, loaded by a copy of the spec (the shared file was not touched while a peer's conformance suite ran): **4 red** (the AC1 rows × 2 settings), the `word` control and the round trip green. Copies removed |
| AC2 others | `erg-001`, `nda-001`, `nda-004`, `fb-020`, both `gam-006`, `p107-c21`: **100 / 100**. `tsc --noEmit` on the viewer package: 0 errors |
| AC3 | `animation-pair.test.ts` "A5 ISL-002": the runtime and the emitted library, frame by frame, every value read as `typeof:value` — equal, first frame `boolean:false`, `string:`; CONTROL: the library with `\|\| 0` back reads `number:0` twice and disagrees. Suite 67 / 67 |
| P107 | `nodegx-node-spec` `batch-time` States (interpreter, 200 sequences, mutants): pass; runtime `conformance.test.ts` with `NSP_ONLY=States`: conforms, known rows still fire; `stranger`, `graph`, `catalog-parity` 358 / 358 |
| AC4 census | **273 States nodes** in tracked JSON outside `dev-docs/` (templates, prefabs, modules, the editor's embedded templates and test projects) + **11** in the P86 corpus (`.md`). **69 rows** have a true/false or text whose first state is `false`, `''` or unset (the P86 corpus: 0). Every wire followed to its reader: `Mounted`/`Visible` (truthy, `react-component-node.ts:2020`), `Condition` (`!!`, `condition.ts:133`), every Function/Expression reader `=== true`/`!== true`/`!open`, garden-kit's `flag()` (`=== true`), and texts (`pixel-game`'s banner, `story-engine`'s note, the todo dialog's three labels) under a parent the same first state unmounts. **0 "was wrong"** — every shipped first-state `false` was already read loosely or strictly-as-true. The one that was wrong is the island's `record`, and the template had already moved it to strings. Known-firing row present: `Workshop/Play plMode.teaching` → `Condition(plTeachGate)` |
| behaviour change | a text a first state leaves **unset** is no longer sent (it was `0`); a Text bound to it keeps its own value until a move names one — the same as every later move |

**Met on the way:** HLS-001's corpus golden was red for two reasons of this phase's own, each attributed by a control that
reproduces the old hash exactly — this fix (`glow-desk/src/lib/states.ts`) and ISL-011's `4638de4b1` (`src/kits/runtime.tsx`
in three projects), which had left it red. Four hashes patched by hand; not regenerated, because a peer's in-flight
export work is red in the same run. Filed `P109-S3-ISL011GOLDEN`.

**AC5, on a deployed page (later in session 3).** The deploy bundle (`noodl-editor/src/external/deploy/noodl.deploy.js`,
gitignored) was rebuilt from HEAD (`webpack.deploy.dev.js`, 27 s, `typedStateValue` ×3 in it; the runtime sources had no
peer edits). The project is `isl002-first-state/` in this folder — **hand-written, not authored through the door**, and
validated by `npm run validate:project` (0 errors, 11 nodes): a States node `off,on` never moved, `flag` (off → `false`) and
`label` (off → `''`) each into a Function that writes `typeof:value` into a Text, and `label` straight into a Text whose own
text is `LABEL-DEFAULT`. `nodegx deploy … --allow-development-engine` → exit 0. Driven in headless Chromium by
`scripts/devtools/drive-isl002-first-state.js`:

| arm | `flag` | `label` | the wired Text | console errors |
|---|---|---|---|---|
| as deployed (the fix) | **`boolean:false`** | **`string:""`** | empty (its default replaced by `''`) | 0 |
| **control**: the same folder copied, its bundle's first jump put back to `\|\| 0` | `number:0` | `number:0` | **shows `0`** | 0 |

Both screenshots looked at: the control's page carries a stray **0** under the two readings; the fixed page carries
nothing there. That `0` is the person's defect as §3 predicted it ("an empty text in the first state shows `0`") — seen
for the first time, not only predicted. AC6 written into README §6 for P108.

🔴 **The deploy bundle now carries this fix and every other HEAD change as of 14:01 on 10-02.** A peer drive whose reading
moves after that may be seeing this rebuild (the same note as s2's 11:17 rebuild).
