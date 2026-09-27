# GAM-009 — What someone typed is still there when the field comes back

**Status: 🟢 BUILT AND DRIVEN on a minimal page (2026-09-14, session 9, uncommitted).** AC1 was RED at HEAD, and the
register was wrong about the Value output. AC1, AC3, AC4 and AC5 are graded, with three reverted arms. AC2's person
sentence was driven in a browser beside the old runtime and a sabotage runtime. **Left:** AC2's Rocket School clause
(P87's drive reached no cell in a `deploy-from-disk` build) and AC6 (`rsNameKeep` kept; it is the peer's file).
🔒 One new question for Richard, in §8 AC4. **Source:** [P78 D61](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-006](../phase-87-the-first-play-test/RKT-006-RESTART-FROM-INSIDE-THE-RACE.md), 2026-09-13 · **Side:** product (viewer controls, Text Input)

A child types player two's name, starts a race, taps *Change the race*, and the name box is empty. Any
Text Input that unmounts and mounts again (a `Mounted` toggle, a tab, a wizard step) comes back showing its Value input.
It does not show what the person typed.

## 1. The person sentence

**Someone types into a field, the field is hidden and shown again, and what they typed is still in it,
without the author wiring anything to keep it.**

## 2. What was measured

HEAD `eb12ebe99`, 2026-09-14.

| reading | where |
|---|---|
| Driven: `nameBox ""` in 4 of 4 cells after *Change the race*, build 2. As recorded 2026-09-13, not re-driven | `scripts/devtools/drive-rkt006-restart.js:190`, `:208`, `:487` (`choicesKept`) |
| The React field's **state** is seeded from `props.startValue` in its constructor. Re-read at HEAD | `components/controls/TextInput/TextInput.tsx:66-70` |
| On mount the field calls `this.setText(this.props.startValue)`. Re-read at HEAD | `TextInput.tsx:88-93` |
| Typing runs `onChange → setText(value)`. That writes React state and calls `props.onTextChanged`, and **never** writes the node's `props.startValue`. Re-read at HEAD | `TextInput.tsx:80-86`, `:261-264` |
| The only writers of the node's `props.startValue` are the node's `setText` and `clear`. Re-read at HEAD | `nodes/controls/text-input.ts:372-373`, `:348` |
| ⚠️ **The register's citation `text-input.ts:372-373` is the *writer*, not the mount.** The mechanism holds at HEAD; the mount lives in `TextInput.tsx:69` and `:92` | this row |
| 🔴 **The remount also re-emits Start Value on the Value output.** `componentDidMount → setText → props.onTextChanged`. The output handler writes `outputPropValues` and flags it dirty with no equality check, then `onChange` sends `Value Changed`. Read from source at HEAD, **not driven** | `TextInput.tsx:85`, `react-component-node.ts:562-566`, `text-input.ts:285-287` |
| ⚠️ The register says *"the `Text` output still holds the name"* after the remount. The source reading above says a remount overwrites it with Start Value. **The two disagree, and AC1 has to measure which is true** | P78 D61 vs. this table |
| `startValue.set` returns early when the value equals `_internal.text`. So an author who re-sends the same Value after a person typed over it changes nothing. Re-read at HEAD | `text-input.ts:184` |
| ERG-001 §4 contract: `Set` abstains while the field has focus and reports `Unchanged`, and it still writes `props.startValue` on every path. Re-read at HEAD | `text-input.ts:146-155`, `:364-391`; pinned by `tests/corpus/erg-001-visual-outcomes.test.ts:379-425` |
| Template workaround `Race/Setup#rsNameKeep`, a Variable: `rsNameB.onTextChanged → rsNameKeep.value → rsNameB.startValue`. Re-read at HEAD | `packages/noodl-mcp/tests/tpl007Components.ts:1605`, `:1648-1649` |

## 3. Where it bites a person

- Every form split across steps or tabs: Site Builder forms, checkout, onboarding.
- Any field inside a collapsible section, and any Text Input under a `Mounted` toggle.
- The workaround needs a Variable and a feedback wire. Nothing teaches it, and a feedback wire on a
  Text Input is exactly the loop shape P77 D31 found.

## 4. Related work and collisions

- **P77 [D33](../phase-77-the-site-builder-rescue/DEFECTS-THE-SITE-BUILDER-FOUND.md) (line 1692), adjacent, not the same defect.**
  Its *"plausible benign reading"* (line 1706-1707) is that `startValue` does not emit `onTextChanged`.
  🔴 At HEAD, from source, **it does**: when mounted and unfocused through `TextInput.setText` (`TextInput.tsx:85`), and when unmounted
  through the node's own flag (`text-input.ts:381-388`). D33 is about a write loop through that route; D61 is about what a
  remount shows. This task must not make D33's six writes worse, so its census is part of AC5's population.
- **P77 D31/D32** (line 1673) traced a real cycle through `bodyField.startValue → bodyField.onTextChanged`. A fix that makes
  typing write back must add no emission, or it changes that trace.
- **ERG-001 §4** ([phase-35](../phase-35-authoring-ergonomics/ERG-001-OUTCOME-CONTRACT.md) §4, the sweep that put the
  focused-`Set` rule into `text-input.ts`). The fix must not break it.
- **P88 GAM-011** adds an insert action on the same node. Land this first so both do not rewrite `setText` at once.
- Owner grep: `grep -a -rn -i "remount" dev-docs/tasks --include='*.md'` filtered for Text Input / Start Value found only
  D61 itself and P87's README. No other owner.

## 5. Design

- **(a) Typing writes `props.startValue`.** That is the register's cheapest door, and it is one line in the node's
  `onTextChanged.onChange`. A remount then starts from what is in the field.
- **(b) Typing also writes `_internal.text`.** A later unfocused `Set` would then write what was typed, not the author's last
  Value, and re-sending the same Value would apply again (`:184`). That changes `Set`'s meaning.
- 🔒 **Ruling for Richard:** when a person has typed over an authored Value, does the Value input still own the field? **(a)**
  keeps `Set` pointing at the author's last Value. **(b)** makes the field's own content the source of truth. The question is
  not about code.
- 🔒 **Second ruling:** should a remount fire `Value Changed` at all when the value did not change? Today it fires on every
  mount (`TextInput.tsx:92`). (a) alone keeps that firing.
- > 🔒 **Ruled, 2026-09-14 (session 1):** **(a).** Typing writes the start value, and `Set` still means the author's last
  > Value. **And a remount fires `Value Changed` only on a real change.** A remount that shows the same value emits nothing.
  > — Richard, both as recommended
  >
  > ⚠️ The second half **removes** an emission. AC5's census must list every graph in the population that receives the
  > mount emission today, P77 D33's six rows included, because each one stops receiving it.
- **Do not** remove the `hasFocus()` guard in `setText` (`text-input.ts:376`); it is ERG-001 §4.
- **Do not** make `startValue.set` emit anything new. D31's trace depends on what emits today.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** A jsdom spec mounts a Text Input, types `Tom` through a real `input` event, unmounts it with `Mounted`, and remounts it. It reads the DOM value (expect `""` at HEAD) **and** the node's `Value` output. That settles the register-vs-source disagreement in §2. Known-firing beside it: the `input` event did change the output to `Tom` before the unmount. |
| AC2 | **The person sentence, in a browser.** A minimal project: a field under a `Mounted` toggle. Type with real CDP key events, hide, show; the field reads `Tom`. Same drive over Rocket School's setup with `rsNameKeep` removed: `nameBox === 'Tom'` in 4/4 cells. |
| AC3 | **Sabotage arm.** Revert the write the fix adds; AC1's spec goes RED on the DOM value. |
| AC4 | **ERG-001 §4 still holds.** `erg-001-visual-outcomes.test.ts`'s focused-`Set` row (Unchanged) and its unfocused control (Done) both still pass. A new row types into a focused field, sends `Set`, and asserts the typed text survives, plus a control where the field is unfocused and `Set` lands. |
| AC5 | **Blast radius.** Enumerate every Text Input in the shipped `library/` and `templates/` with a wire **into** `startValue` and a wire **out of** `onTextChanged`. For each, record before and after whether a remount fires `Value Changed` and with what value. P77 D33's six rows are in the population. The count comes from the artefacts, not from memory. |
| AC6 | **Workaround.** Rocket School's `rsNameKeep` and its two wires can be removed and AC2's template arm still passes. Record whether it was removed or kept, and why. |

## 7. Traps

- A spec that calls `node.setText` to "type" does not type. Typing is `onChange`, and the defect lives only on that path.
- An unmounted field and a focused field are both abstaining paths in `setText`, and they are different ones. Grade each.
- `jsdom`'s `document.activeElement` follows `.focus()`, so a spec can accidentally put the field in the focused mode.
- The deprecated `nodes-deprecated/controls/text-input.tsx` is a second copy. Say whether it is in scope, with a reason.

## 8. Record

### Session 9 (2026-09-14, over `1f5c10c5b`, uncommitted)

R10 as ruled. Logs, scripts and arms are in session 9's scratchpad (`3a932927…`), folder `gam009/`.

#### AC1: RED at HEAD, and the register was wrong about the Value output

The spec is [`gam-009-typed-text-survives-a-remount.test.tsx`](../../../packages/noodl-viewer-react/tests/gam-009-typed-text-survives-a-remount.test.tsx).
It takes a real Text Input node from the corpus graph and renders it through the node's own `render()` into a jsdom `createRoot`.
It types with the native value setter and a real `input` event, and hides and shows the field with `Mounted`. Nothing
calls `node.setText`.

| row | HEAD | after |
|---|---|---|
| known-firing: typing reaches the box and the Value output, and `Value Changed` fires once | pass | pass |
| the hide really takes the `<input>` off the page | pass | pass |
| shown again, the box reads `Tom` | **FAIL, `""`** | pass |
| shown again, the Value output reads `Tom` | **FAIL, `""`** | pass |
| a remount showing the same value sends no `Value Changed` and writes no Value | **FAIL, 3 signals for 2** | pass |
| a Number field keeps a half-typed `1.` as its start value | **FAIL, `""`** | pass |
| the first mount still publishes `''` once | pass | pass |
| an unfocused `Set` after typing still puts the author's Value back (R10 (a)) | pass | pass |

HEAD: **5 failed, 4 passed** (`ac1-head.log`). After: **12/12** with AC4's three rows (`ac14-fixed.log`).

- ✅ **§2's disagreement is settled for the source.** A remount overwrites the Value output with the start value and
  fires `Value Changed` with it. The register's *"the Text output still holds the name"* is wrong.
- 🔴 **Found by the first run, not in §2 or §7.** While the field is away, the node's `setText` writes and flags the
  Value output but sends **no** `Value Changed`. That signal arrives at the next mount. So a remount check against the
  output's current value would drop it for ever. The check compares against what was last **announced** instead,
  which keeps that case's count and timing exactly as today (arm S3 below).

**The fix, in two files:**
- `TextInput.tsx` `onChange` calls the node's `_typed(text)`, which writes `props.startValue` with the **raw** text. Only
  a keystroke does, so a Number field's `1.` comes back as `1.`. `_internal.text` is untouched, so `Set` still means the
  author's last Value.
- `componentDidMount` asks the node's `_announcedValueIs(value)` and skips the announcement when the Value output last
  announced exactly that value. The node records the value in `onTextChanged.onChange`, which is the one place
  `Value Changed` is sent from.

#### AC2: the person sentence in a browser, driven on a minimal page; Rocket School not reached

**The minimal page.** A five-file project (`gam009/project-remount`) has a Checkbox wired to a Text Input's `Mounted`,
and a Text showing the field's Value output. `deploy-from-disk` built it once, and both nodes and both wires reached
`index.js`. Three copies differ **only** in `noodl.deploy.js`:

| arm | runtime | sha |
|---|---|---|
| old | `src/external/deploy/noodl.deploy.js` as it stands (GAM-006's rebuild, 18:29, before this task) | `3f3c8d8f…` |
| new | this session's source, `webpack.deploy.prod.js` into scratch | `ed604813…` |
| sab | arm S1 (typing no longer calls `_typed`), built into scratch, `TextInput.tsx` restored and `cmp`-checked | `fe41dea3…` |

[`scripts/devtools/drive-gam009-remount.js`](../../../scripts/devtools/drive-gam009-remount.js) (new) does it all
with real CDP events: a mouse click on the field, one key event per character, and a click on the checkbox to hide and
another to show. Each target is checked with `elementFromPoint` first.

| arm | clicks reached | typed: box / Value | hidden: box | **shown: box / Value** | console errors |
|---|---|---|---|---|---|
| old | 3 of 3 | `Tom` / `Tom` | gone | **`""` / `""`** | 0 |
| new | 3 of 3 | `Tom` / `Tom` | gone | **`Tom` / `Tom`** | 0 |
| sab | 3 of 3 | `Tom` / `Tom` | gone | **`""` / `""`** | 0 |

Every known-firing clause holds in all three arms, and only the fixed runtime keeps the word. The browser agrees with
AC1's jsdom reading, the Value output included.

**Rocket School: NOT reached, so nothing is graded.** `gam009/rocket-nokeep` is a copy of `templates/rocket-school` with
`rsNameKeep` and its two wires removed. It deploys (exit 0, 89 of 1,791 wires dropped, none in `Race/Setup`). P87's
`drive-rkt006-restart.js --arm settings` ran over the same three runtimes. **All 12 cells read `NOT REACHED, passed 0/0`**:
the drive never found its opening *New player* or *Let's go!* button, in any arm. That matches GAM-006 §8, where
Rocket School's profile page did not respond to a click in the `deploy-from-disk` build. The `nameBox === 'Tom'`
clause needs a build P87's drive can walk.

#### AC6: the workaround is kept, and it is not this task's file

- `rsNameKeep` is in `packages/noodl-mcp/tests/tpl007Components.ts:1683`, `:1726-1727`, and it is pinned by
  `tpl007Template.test.ts:692`. Both files are **untracked, and the TPL-007 peer changed them at 20:07 today**.
- With the fix, the workaround is **redundant but harmless**. Typing already writes the start value, and the loop writes
  the same value back into a focused field, where `Set` abstains.
- It stays until AC2's Rocket School clause is driven. The removal is one node, two wires and the pin, and it is the
  peer's to make.

#### AC3: three reverted arms

`sabotage.sh`. Each arm was restored from a snapshot and checked with `cmp`.

| arm | mutation | reddens |
|---|---|---|
| S1 | typing no longer calls `_typed` | exactly 4: the box, the Value output, the remount emission, the Number row |
| S2 | the mount announces whatever it shows | exactly 1: the remount emission |
| S3 | `_announcedValueIs` compares against the output's value | exactly 1: the Value sent while hidden |

#### AC4: ERG-001 §4 still holds

- `erg-001-visual-outcomes.test.ts` unchanged: **19/19**, including the focused-`Set` `Unchanged` row and its unfocused
  `Done` control.
- New rows in the GAM-009 spec use real focus (`document.activeElement` asserted). Focused: typed `Tom`, `Set` reports
  `unchanged`, and the box and the Value output keep `Tom`. Unfocused control: `Set` reports `done` and `Ann` lands.
- ⚠️ **Measured, not changed.** An absorbed `Set` still writes `props.startValue` (`text-input.ts` `setText`, whose
  comment says so on purpose). So typed `Tom`, then a focused `Set` of `Ann`, then hide and show, comes back as **`Ann`**.
  🔒 **For Richard:** should a `Set` the field absorbed decide what a later remount shows? R10 did not cover it.

#### AC5: blast radius, counted from the artefacts

`census.js` read 885 JSON files across `library/`, `templates/` and the embedded template content: 5,399 nodes and 6,844
wires. **The sabotage arm (type set emptied) reads 0 Text Inputs over the same 5,399 nodes.**

| population | count |
|---|---|
| Text Inputs | **90** (deprecated `Text Input`: 0) |
| a wire into Value | 40 |
| a wire out of Value | 85 |
| **both** | **36**: prefabs 12, site-builder content 15, todo-list 3, todo-list-demo 3, Rocket School 2, story-engine 1 |
| `Value Changed` wired | 7, all in prefabs |
| a direct feedback loop (Value → X → Value) | 1: Rocket School `rsNameB`, the workaround |

🔴 **The first census run was blind to every template.** It joined wires per file, and a V2 template splits a component
into `nodes.json` and `connections.json`. Every template field read zero wires, and 9 of the 36 were missing. It now
joins per component folder.

**Before and after, by case.** The spec grades each one:

| case | before | after |
|---|---|---|
| typed, then hidden and shown, with no author write between | the box and Value go back to the author's last Value, and `Value Changed` fires with it | nothing fires; the box and Value keep the typed text |
| never typed, remounted on the same value | a duplicate Value write and `Value Changed` | nothing |
| an author Value arrives while hidden | Value at arrival, `Value Changed` at the show | the same |
| the first mount | Value `''` and `Value Changed` | the same |

**The 7 `Value Changed` consumers** lose only the duplicate from a same-value remount:
- crud-screen *Search input* → `Counter(Page index).reset`, so a remount no longer resets paging;
- filters → `Emit Changed`;
- form-fields ×3 and settings-page → `Component Outputs.Changed`;
- search-bar → `Timer(Debounce).restart`.

**P77 D33.** The ThemeEditor and PageEditor fields sit on routed Pages, so navigation remounts them. SectionRow's sit in
Drag rows. None wires `Value Changed`. Their only change is that a same-value remount no longer rewrites the Value output
into `buildTokens` and `readTheme`. The fix adds no emission on any path, so it cannot add a write to D33's six. Not driven.

#### §7's open questions

- **The deprecated copy** (`nodes-deprecated/controls/text-input.tsx`) is out of scope. It carries `deprecated: true`,
  and shipped content has 0 instances.
- **`nodegx-export`** emits its own native input (`plan.ts`'s write-through rule). Whether an exported app keeps typed
  text across a remount is **not measured**. It is P18's parity question, named here.

#### Gates

| gate | result |
|---|---|
| GAM-009 spec, HEAD / after | 5 failed + 4 passed / **12/12** |
| `erg-001-visual-outcomes.test.ts` | **19/19** |
| whole `noodl-viewer-react` suite | **111 suites, 1,465 passed, 1 todo**, exit 0 |
| editor `test:main` | **7,522 / 7,522, 458 suites**, exit 0 |
| AC2 minimal drive, 3 arms | exit 0 each; old `""`, new `Tom`, sab `""`; 0 console errors |
| AC2 Rocket School drive, 3 arms | exit 1 each, **12 of 12 cells not reached, 0 clauses**: graded nothing |
| noodl-mcp suites, Electron `test:ci` | **not run** (no door or diagnostic changed) |
| `src/external` viewer, deploy and ssr, rebuilt in place | exit 0, identical file lists, all three carry `_announcedValueIs`; `deploy/noodl.deploy.js` byte-identical to AC2's "new" arm (`ed604813…`); the previous bundles are in `gam009/external-before/` |

**Found on the way, in the devtool.** `deploy-from-disk` threw `ENOENT … noodl_bundles` on a one-component project,
*after* the deploy had written every file. A project whose components all land in the index writes no bundle folder.
It is now guarded with `existsSync`.
