# GAM-012 — A field focused as its row appears has the cursor, every time

**Status: 🟡 2026-09-17 (session 21): AC1–AC5 met for all three faults under R13 (§5, §8). Fault 3 fixed by splitting an unmount from an explicit Blur, driven in Chromium; AC6 (Rocket School keyboard drive) still owed.** **Source:** [P78 D68](../phase-78-the-templates/DEFECTS-THE-TEMPLATES-FOUND.md) · found by P87 [RKT-003](../phase-87-the-first-play-test/RKT-003-ONE-SCREEN-PER-QUESTION.md) AC5 run 2, 2026-09-13 · **Side:** product (viewer focus tracker)

A child playing with the keyboard answers the first question and presses Enter twice. The second question arrives with no
cursor in the box. The author did send Focus. It worked once and never again.

## 1. The person sentence

**Each time a question's answer box appears and the author sends it Focus, a person on a keyboard can type
straight away, on the first question and the fiftieth, without touching the mouse.**

## 2. What was measured

HEAD `eb12ebe99`, 2026-09-14.

| reading | where |
|---|---|
| Driven, keyboard-only arm, build 4, 1366×768 and 1280×720 × FR/EN: 20/20 rounds graded, **`focusIn` failed in 13/13 typed rounds after the first**. Round 1 passed. The Text Input's Focus was sent on its row's `didMount`, and the row remounted after each verdict. As recorded 2026-09-13, not re-driven | RKT-003 §5 lines 137-141; clause `scripts/devtools/drive-rkt003-stage.js:29`, `:475` |
| With a Function focusing the rendered `<input>` on the next animation frame (build 5): `focusIn` passed on 17 typed rounds, including the 13 after a verdict. As recorded 2026-09-13 | RKT-003 §5 lines 142-144 |
| **No pointer event in any round of either run.** The failure appeared only in the keyboard-only arm, and the mouse arms never reported it. As recorded | RKT-003 §5 lines 142, 145 |
| Text Input's Focus calls `this.context.setNodeFocused(this, true)`, then reports `Done` unconditionally. Re-read at HEAD | `packages/noodl-viewer-react/src/nodes/controls/text-input.ts:210-220` |
| 🔴 **Candidate 1, read from source, not isolated.** `setNodeFocused` calls `node._focus()` **only if the node is not already in `focusedNoodlNodes`**, then pushes it. Nothing removes a node on unmount. So a second Focus to the same node instance is a silent no-op. Re-read at HEAD | `viewer.jsx:348-358`; `react-component-node.ts:747-757` (`componentWillUnmount` does not touch the list) |
| The list is rebuilt only by `onClickCapture`, on a **click**: it walks the clicked element's ancestors for nodes with `_focus` and replaces the list. So in a mouse session any click clears the stale entry, which fits the mouse arms never showing it. Re-read at HEAD | `viewer.jsx:378-395` |
| 🔴 The Blur branch reads inverted: `if (index !== -1) return;`. A Blur on a tracked node does nothing; a Blur on an untracked node calls `_blur()`, then `splice(-1, 1)` removes the list's **last** entry, another node. Read from source at HEAD, not driven | `viewer.jsx:359-375` |
| **Candidate 2.** Text Input's `_focus` returns silently when `innerReactComponentRef` is null; it does not use the queue that exists for exactly this. Re-read at HEAD | `text-input.ts:327-330`; `withInnerComponent` at `react-component-node.ts:1638-1660`, flushed by the ref callback at `:779-783` |
| Against candidate 2: the signal was on the **row's** `didMount`, sent from the wrapper's `componentDidMount`. React commits a child's refs and `componentDidMount` before its parent's, so the field's ref should exist by then. That is an inference, not measured | `react-component-node.ts:736-743` |
| The React field's `focus()` is `this.ref.current && this.ref.current.focus()`. Re-read at HEAD | `components/controls/TextInput/TextInput.tsx:266-268` |
| Group's Focus uses the same tracker. Group's `_focus` only sends its `focused` signal. Re-read at HEAD | `nodes/visual/group.ts:178-189`, `:483-488` |
| No spec covers the tracker: the ERG-001 corpus harness **stubs** `setNodeFocused` to a no-op. Re-read at HEAD | `tests/corpus/erg-001-visual-outcomes.test.ts:86-89` |
| At HEAD the question box has **no Text Input** (RKT-005 replaced it with `game-kit.AnswerPad`). Its workaround `qbFocusBox` runs `FOCUS_ANSWER_SCRIPT` on `qbTyped.didMount`, which calls `document.querySelector('.rkt-answer input').focus()` inside `requestAnimationFrame`. Re-read at HEAD | `packages/noodl-mcp/tests/tpl007Components.ts:975-981`, `:1012`, `:1048-1050` |

## 3. Where it bites a person

- Every keyboard-only flow that shows a field again: a quiz, a chat box that clears and refocuses after Send, a search field on a
  panel that reopens, a wizard step revisited.
- It is silent. Focus reports `Done` (`text-input.ts:218`) whether or not anything moved.
- It reads like a timing bug, so authors reach for next-frame scripts. Rocket School now has four of them (this one and GAM-010's three).

## 4. Related work and collisions

- **P88 [GAM-010](GAM-010-A-BUTTON-CAN-BE-GIVEN-THE-KEYBOARD.md)**: a Button Focus through the same tracker would inherit this.
  **This task comes first.**
- **P14 PLAT-003** ([notes](../phase-14-editor-platform-health/PLAT-003-NOTES.md) lines 360, 1760) typed `setNodeFocused` and the
  click handler; it did not change their behaviour. Not an owner.
- **P41 [ACC-004](../phase-41-accessibility/README.md)** (line 77) will move focus on route change. If it uses the tracker, it
  meets this defect on the second navigation.
- The deprecated `nodes-deprecated/controls/text-input.tsx:353-366` calls the same tracker.
- Owner grep: `grep -a -rn "setNodeFocused\|focusedNoodlNodes\|onClickCapture" dev-docs --include='*.md'` (PLAT-003 only), plus
  `grep -a -rn -i "focus signal\|Focus action" dev-docs/tasks`. No owner.

## 5. Design

**Isolate first; no fix is chosen until AC1 names the cause.** The candidates, each with the measurement that separates it:

1. **Stale tracker entry** (candidate 1). Measure: log `focusedNoodlNodes.includes(node)` and whether `_focus` ran, per Focus.
   Discriminator: a click anywhere between rounds should cure it; if so, this is the cause.
2. **No element yet** (candidate 2). Measure: `!!node.innerReactComponentRef` at the moment `_focus` runs.
3. **Focus stolen afterwards.** Measure: a `focusin`/`focusout` log on `document` for the round, naming each target, including
   the Next button the verdict focused and whether unmounting a focused element sent focus to `body`.
4. **Signal ordering.** Measure: the order of the row's `didMount`, the field's `componentDidMount`, and the Focus input's
   `valueChangedToTrue`.

Likely fix shapes, to be chosen by AC1's result: the tracker checks `document.activeElement` rather than its own list (or drops a
node on `willUnmount`), and its Blur branch is corrected. `_focus` goes through `withInnerComponent` so a Focus before mount is held.
🔒 **Ruling, only if candidate 1 is confirmed:** should the tracker exist at all, now that the browser tracks focus? Removing it
changes the click-blurs-other-nodes behaviour Group's `Focus Lost` relies on.
**Do not** "fix" this with a next-frame delay inside the runtime. That is the workaround, moved.

> 🔒 **R13, ruled 2026-09-14 (session 2), after AC1 named three faults:** *"That sounds weird, surely if I've made a race
> condition mistake, the group with my input's group isn't mounted yet but I sent the focus signal to the input, then the user
> goes on and does other stuff and the group is eventually mounted, I don't want the focus to be taken at all costs. It feels
> like if the input is mounted, you focus, it focusses, otherwise it's not mounted and the focus signal fails and that's the
> end of the story and the builder needs to trace why or there's a failure message in the editor (but not the browser)"* — Richard
>
> **So the build is:**
> - **Mounted → focus, every time.** A Focus to a mounted field puts the cursor in it whether or not the tracker has it listed
>   (fault 2 goes). The tracker's list must describe reality: a node is recorded only when focus really moved, and is dropped
>   on unmount.
> - **Not mounted → the Focus fails, and that is the end.** It is **not held**. §5's "`_focus` goes through
>   `withInnerComponent`" is **rejected**, because it would take focus later, after the person has moved on. It is not recorded
>   in the list (fault 1 goes). It does not report `Done`.
> - **The failure is told to the builder in the editor, not the browser.** Mechanism to be read before code (outcome contract
>   `failure` with no console raise, and/or an editor-only warning on the node).
> - **The Blur inversion is a bug, not a design question** (fault 3). It is fixed, with its own AC4 row.
> - The tracker **stays** for Groups' click-driven Focused / Focus Lost. That was not ruled away.
> - R11 (GAM-010) follows this ruling: a Button's Focus obeys the same rule.
>
> **Consequence for the ACs:** arm D (build 4's shape) and arm K must go GREEN. Arm C (a Focus only before mount) must stay
> unfocused **and** report its failure in the editor, beside a known-firing check that the message is absent in the browser
> console. RKT-003 build 4's shape passes because its `didMount` Focus arrives mounted.

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, and the cause named, recorded in §8.** A minimal project, no template: a Text Input inside a Group toggled by `Mounted`, Focus wired from the Group's `didMount`, a Button that toggles it, driven keyboard-only (CDP Enter with `text: "\r"`) for five cycles. Expect `activeElement` to be the input on cycle 1 only. Beside it, the four §5 measurements, and a **control arm** with one click on `body` between cycles. The cause is the candidate the measurements confirm, not the one that fits. |
| AC2 | **The person sentence, in a browser.** The same project passes all five cycles, keyboard only; and the mouse arm still passes. |
| AC3 | **Sabotage arm.** Revert the fix; AC2's cycle 2 goes RED. |
| AC4 | **A tracker spec that does not stub it.** Focus A, Focus A again after a remount, Focus B, Blur B, each asserting `activeElement` and the list. If the Blur inversion is confirmed, it gets its own row and its own sabotage arm. |
| AC5 | **Blast radius.** List every wire into `focus`/`blur` on Text Input and Group in shipped `library/` and `templates/`, and every `Focus Lost` consumer on Group. Record per wire what repeated Focus does before and after. Group's click-driven `focused`/`focusLost` rows must be unchanged. |
| AC6 | **Workaround.** At HEAD Rocket School's box is the kit pad, which has no Focus input, so `qbFocusBox` cannot become a wire. Record that. Then check the keyboard-only drive (`drive-rkt003-stage.js --keys`) still passes 4/4 cells. Remove any Text Input Focus workaround the template still carries, if one exists; §8 lists what was searched. |

## 7. Traps

- A drive with **any** pointer event rebuilds the tracker's list and hides candidate 1. The drive must assert zero pointer events.
- A CDP Enter without `text: "\r"` does not activate a focused native button (RKT-003 AC5 run 1). A stalled round then looks
  like a focus failure.
- `jsdom` does not run React's commit order the way a browser does for refs and `componentDidMount`. Candidate 2's measurement
  belongs in the browser.
- Focus reports `Done` before anything moved. An AC that reads the outcome grades nothing; read `document.activeElement`.

## 8. Record

### Session 2 — 2026-09-14, over `15f7bf720`

**AC1 — RED at HEAD, and the cause named.** 🔴 **It is not one candidate. It is three faults in the tracker
(`viewer.jsx:348-376`), acting together.**
1. **A Focus that did nothing is recorded as done** (candidates 2 + 1's precondition). `setNodeFocused(node, true)` calls
   `node._focus()`. Text Input's `_focus` returns silently when `innerReactComponentRef` is null (`text-input.ts:327-330`).
   The node is **pushed onto `focusedNoodlNodes` anyway**.
2. **A recorded node is never focused again** (candidate 1). A later Focus to it, even one sent once the ref exists, is skipped
   by the `indexOf === -1` test. Nothing removes a node on unmount, and nothing checks `document.activeElement`.
3. **The Blur branch is inverted** (§2's reading, now driven). `Group.componentWillUnmount` sends
   `setNodeFocused(group, false)` (`Group.tsx:73`). For a group that is **not** in the list, the branch runs `_blur()` and
   then `splice(-1, 1)`, which removes the list's **last** entry, an unrelated node. On a simple page that last entry is
   the stale field, so this accidentally cures fault 2. That is why the first minimal page did not reproduce. On a page where
   another field was focused last, it removes the wrong one and the field's next Focus is skipped.

**Instrument.** A minimal project (a copy of MCP's `demo-app` fixture, with a hand-written Home) was served by
`render-from-disk.js` against `external/viewer/noodl.viewer.js` (built 2026-09-12 10:45, after the last `viewer.jsx` (08-25)
and `text-input.ts` (09-04) commits). It was driven headless by keyboard only, with CDP Tab and Enter (`text: "\r"`), and
`Emulation.setFocusEmulationEnabled`. The page wraps `context.setNodeFocused` and each node's `_focus`, and reads the
**real** list off the Viewer instance through React's fiber, before and after every call. It also logs every
`focusin`/`focusout` and every pointer, mouse and click event. Scratch: session `c7b27bb6…/scratchpad/gam012/`
(`project/`, `drive-gam012-ac1.js`, `tracker-hook.js`, `ac1-drive*.log`).

| arm, keyboard only | wiring | remount cycles with the field focused | what the list shows |
|---|---|---|---|
| **C** | `timer.timerFinished → sw.on` **and** `→ field.focus` (a Focus in the update that remounts the row, before React mounts it) | **0 / 3** | `_focus ref=false`, then `after` holds `fieldC` |
| **D**, build 4's shape | C's wire **plus** `row.didMount → field.focus` | **0 / 3** | the first Focus is pushed with no ref; the `didMount` Focus has `before` already holding `fieldD` and is skipped, `active=body` |
| **K** | `row.didMount → field.focus` only | 2 / 3 (cycle 2 RED) | cycle 2: `before=[fieldB, fieldD]`; `rowB`'s unmount Blur spliced `fieldD`, so `fieldB`'s Focus was skipped |
| **B** | Button `onClick → sw.flip`; `row.didMount → field.focus` | 4 / 4 | Enter on a native button fires a trusted `click` (`detail=0`), and `onClickCapture` rebuilds the list |
| **control** | K with a real mouse click between cycles | 3 / 3 | the click rebuilds the list: the §5 discriminator for candidate 1 |

Zero pointer or click events in arms C, D and K (asserted per cycle). An earlier version of the page, with only K and B, read
5/5 in both; §7's trap, **"a drive with any pointer event hides candidate 1"**, has a keyboard twin: **Enter on a button is a
click**, and so is a Group unmounting beside a lucky list order.

**The person's shape, read in the original build.** RKT-003 build 4 was still on disk (`674e2ffe…/scratchpad/rocket-rkt003`: two
wires into `qbInput.focus`, `qbNew.valueChanged` and `qbTyped.didMount`, and no next-frame script). `drive-rkt003-stage.js --keys
--only 1366x768 --lang en`, with the list hook preloaded (`node -r tracker-hook.js`, nothing in the drive or the build edited):
`focusIn` **failed on rounds 2 and 5** (typed, after a verdict), exit 1. Round 2's events:
`13777 click → Next` (Enter) rebuilds the list → `13778 _focus qbInput ref=false` + `setNodeFocused(qbInput, true)` pushes it →
`13792` `fbCard`/`fbRow` unmount (tracked, so the inverted branch returns) → `13808 setNodeFocused(qbInput, true)`, already
listed, **skipped**, `active=body`. Build 5 (`rocket-rkt003-v5`, one wire + the rAF script) under the same hook: exit 0, and
its `13742 _focus qbInput ref=false` is the same fault 1. The field is focused only by the script, outside the tracker.

**So §5's "likely fix shapes" all hold, and none alone is enough:** record a node only once `_focus` has really run (hold a
Focus that arrives before mount through `withInnerComponent`), drop a node from the list on unmount, and correct the Blur branch.
Fault 3 gets its own AC4 row and sabotage arm, as §6 says.

**Instrument defects found, not fixed (they block only the deploy route):** `scripts/devtools/deploy-from-disk.cjs`, the checked-in build
and a fresh one built to scratch, fails on the shipped `templates/landing-pages` (`TypeError: node.component.getConnectionsTo is
not a function` in `nodedefinition.ts:592` `collectPorts`, reached from `registerRuntimeDiscoveredPorts`). On the `demo-app`
fixture, `Exporter.exportToJSON` returns nothing, and the rejection `{result:'failure', message:'Failed to export project.'}` is
printed as `[object Object]` because the catch does `String(err)`. AC2 and AC3 can use `render-from-disk.js` after a viewer rebuild.

🔒 **R13 is now askable** (§5): candidate 1 is confirmed. **Ruled the same session** (§5).

**Built under R13:**
- `noodl-viewer-react/src/focus-tracker.ts` (new): the tracker as a class, with `viewer.jsx` delegating to it and keeping a
  `focusedNoodlNodes` getter. Fault 1: `_canFocus()` false → return `false`, nothing blurred or recorded. Fault 2: a listed node
  whose `_hasFocus()` is false is focused again; a Group (no hook) keeps today's no-repeat.
- 🔴 **Fault 3 is NOT fixed, and that was measured, not preferred.** The first build corrected Blur (blur the tracked node and its
  containers, splice its own index). AC5's Dropdown drive (below) showed that correction **breaks multi-select's Dropdown in a
  browser**, so the branch is HEAD's again, with the reason in the code. **Owed as a follow-up:** split an unmount (drop the node,
  fire nothing) from an explicit Blur (act on the node it names), then fix the branch.
- `text-input.ts`: `_canFocus` / `_hasFocus`. Focus reports `Unchanged` and sets the editor-only diagnostic `focus/not-mounted`
  when the tracker returns `false`, and clears it on success. It is not `Failure`, because a failure raises on the error bus,
  whose console subscriber is live in a deployed page (`nodecontext.ts:298-303`). `Unchanged`'s description names Focus.
- `react-component-node.ts`: `setNodeFocused` returns `boolean | void`.
- Not changed: the deprecated Text Input (same tracker; no `_canFocus`, so it keeps fault 1's recording).

**AC4 — the spec does not stub the tracker** (`tests/gam-012-focus-tracker.test.ts`, final): 13 passed + 1 todo (fault 3 proper),
exit 0. **Reverted arms**, each on a snapshot of `focus-tracker.ts`, restored `cmp`-identical:
| reverted | red |
|---|---|
| fault 1 (the `_canFocus` guard) | not-mounted refusal, build 4's shape, Text Input `Unchanged` + diagnostic (3) |
| fault 2 (re-focus a listed node) | after a remount, arm K's order (2) |
| the Dropdown pin (the Blur correction that broke it, re-applied) | "a clicked child Group that unmounts does not blur the Group around it" (1) |

**AC2 — in a browser, GREEN.** Viewer rebuilt (`webpack.viewer.prod.js`, exit 0, three size warnings only; bundle 10:45 → 15:04, the
fix present), the same page and drive as AC1, 5 cycles, keyboard only, console errors `[]`:
| arm | at HEAD (AC1 run) | with the fix |
|---|---|---|
| D (build 4's shape) | 0 / 3 | **4 / 4** remounts |
| K | cycle 2 RED | **4 / 4** |
| B, control | green | green |
| C (Focus only before mount) | unfocused | unfocused, **by ruling**, with the diagnostic set (spec-graded; the page has no editor) |

AC3's browser arm is the AC1 run: the same page on the pre-fix bundle.

**Regression:** viewer specs touching Text Input, `viewer.jsx`, Group or focus: 13 files, 13 PASS lines, 185 tests, exit 0.

**AC5 — census** (connection endpoints by node type, both file shapes):
| population | connections | Group `focusLost` out | Group `focused` out | → Group `focus` | → Text Input `focus` / `blur` |
|---|---|---|---|---|---|
| `templates/` | 2,539 | 0 | 0 | 0 | 0 / 0 |
| `library/prefabs` | 2,063 | **1** | 0 | 0 | 0 / 5 |
| `library/modules` | 45 | 0 | 0 | 0 | 0 / 0 |
| `project-examples` | 264 | 0 | 0 | 0 | 1 / 0 |
| NodeGX test projects | 14,577 | **3** | 1 | 1 | 4 / 2 |

**AC5 — multi-select's Dropdown, driven both ways** (a copy of NodeGX test project `test112`, whose Home places the prefab;
`render-from-disk.js`; real mouse clicks; `scratchpad/gam012/drive-dropdown.js`). `Group(root).focusLost → States.to-No` closes its
sheet, and the opening click lands on the "Border neutral" overlay, which the state change unmounts. 🔴 **My prediction from source
was backwards.** I predicted HEAD fired `Focus Lost` as the sheet opened. It does not: the overlay is **tracked** (the click listed it),
and HEAD's inverted branch returns early for a tracked node.
| step | HEAD tracker (a scratch file with HEAD's logic, bundle built, repo file restored `cmp`-identical) | first fix (Blur corrected) | final fix (Blur = HEAD) |
|---|---|---|---|
| click the wrapper, +300ms | sheet open | **sheet closed**: `root.focusLost` at 20ms, from the overlay's unmount Blur | sheet open |
| +1500ms | open | closed | open |
| click away | closed | closed | closed |
| wrapper again / wrapper to close | open / closed | closed / closed | open / closed |

The final fix matches HEAD at every step. The two test-project copies of this prefab are covered by the same reading. "Text Input
With Dropdown" (def036-dash-drive, a legacy file) was **not driven**. It has no Text Input Focus wire into its field, so faults 1 and 2
cannot reach it, and Blur is HEAD's.

**AC2 re-driven on the final build** (viewer rebuilt again, exit 0): D 5/5, K cycles 2-5, B 5/5, control 2-5, C unfocused by ruling,
console errors `[]`.

### Session 21 (P88) — 2026-09-17, over `8fe91b234`: fault 3

**Built.** An unmount and an explicit Blur no longer share one call.
- `focus-tracker.ts`: `setNodeFocused(node, false)` is the explicit Blur. It calls the node's `_blur()` and removes **that node** from
  the list if listed. It no longer returns early for a listed node, blurs no containers, and splices nothing else. New
  `nodeUnmounted(node)` removes the node from the list and fires nothing.
- `react-component-node.ts`: the wrapper's `componentWillUnmount` calls `context.setNodeUnmounted?.(node)` for **every** node (R13:
  "dropped on unmount"). `viewer.jsx` installs it. Optional, so a runtime without the browser viewer does not throw.
- `Group.tsx`: its unmount no longer sends `setNodeFocused(node, false)`.

**AC4, the spec** (`tests/gam-012-focus-tracker.test.ts`): the todo is gone; **18 passed**, exit 0. Group's scroll plugins are mocked
(as GAM-001's spec does) so the real `Group.prototype.componentWillUnmount` can be called. **Reverted arms**, each on a snapshot restored
with `cp` and `cmp`-checked:
| reverted | red |
|---|---|
| M1 HEAD's Blur branch | Blur after a Focus signal; Blur on a Tab-focused field (2) |
| M2 `nodeUnmounted` empty | the Dropdown pin, which also asserts the overlay leaves the list (1) |
| M3 the wrapper's `setNodeUnmounted` call removed | "the wrapper's unmount is what tells the tracker" (1) |
| M4 `Group.tsx`'s unmount Blur put back | "a Group's own unmount no longer sends a Blur" (1) |
| M5 Blur also blurs listed containers (session 2's first correction) | Blur after a Focus signal (1) |
| M6 Blur does not splice | Blur after a Focus signal (1) |

**In Chromium.** Viewer bundles: **before** = `src/external/viewer/noodl.viewer.js` copied to scratch before any edit (a dev build of
12:31, logic identical to `8fe91b234` for these files); **after** = a prod build with `OUT_PATH` in scratch, exit 0. The shared bundle was
not overwritten (a peer's dev stack was watching). `render-from-disk.js` and `harness-paths.js` copied to scratch with `VIEWER_DIR` from an
env var. Page: Text Inputs E, T, F, G, a Group "Pad"; `fieldE.onEnter → fieldE.blur`, `fieldT.onEnter → fieldT.blur`,
`fieldG.onEnter → fieldF.focus`, `fieldF.onEnter → fieldF.blur`. Real mouse clicks and CDP keys, focus emulation on.
| arm | before | after |
|---|---|---|
| E: click into the field, type, Enter → its Blur | `body`; list `[]` | `body`; list `[]` |
| T: click Pad (lists Pad and 3 ancestors), Tab into T, Enter → its Blur | `body`; **`focusLost` on Layout, the page Group and `app_group`**; `app_group` spliced from the list | `body`; no `focusLost`; list unchanged |
| **F: G's Enter sends F a Focus (listed), Enter → F's Blur** | 🔴 **`active=INPUT[F]`, F still listed, no `onBlur`** | **`body`**, F removed, `onBlur` fired |

🔴 **My prediction was wrong in one place:** I wrote the spec row as "a field the person clicked into". A click into a Text Input does
**not** list it (arm E's list stayed `[]`). A field is listed only by a Focus signal, so the row was rewritten to that shape before
the arms were re-run (M1/M5/M6 red again on it). The person-visible defect at HEAD is arm F: **Focus then Blur left the cursor in the
field.** Console errors `[]` in all four runs.

**Regression.**
- Session 2's keyboard page, 5 cycles, before vs after: **identical**, K 2–5 Y, B 5/5, control 2–5 Y, C unfocused by ruling, D 5/5,
  console errors `[]`.
- multi-select's Dropdown (test112 copy, `drive-dropdown.js` extended to select two options while the sheet is open), before vs after:
  sheet open/closed **identical at all 11 steps**, including after selecting One and Two. One difference: closing with the wrapper
  fired the root's `Focus Lost` before (the old unmount Blur) and not after. The sheet closes by its own toggle either way; its
  `focusLost` only sends `to-No`.
- The other consumers, **read, not driven**: `fb020b-drive`'s copy is the same prefab. `def036-dash-drive`'s "Text Input With Dropdown"
  closes on `Item Selected` and on `Focus Lost`, which a click away still sends through the unchanged click path. Its checkbox variant
  opens on `Focused` **and** on its field's `onClick`, and closes through a script, so reopening does not depend on the list.
- Viewer specs that mention Group, Text Input, the wrapper, `viewer.jsx` or focus: **26 suites, 349 tests, exit 0**. `tsc --noEmit`
  exit 0.

**Not rebuilt:** `nodegx-backend/deploy/artifact/app/noodl.deploy.js` and `scripts/devtools/deploy-from-disk.cjs` carry the old tracker
until their next build. The deprecated Text Input's Blur now gets the corrected branch too.

Scratch: session `a79831ee…/scratchpad/f3/` (`before/`, `after/`, `devtools/`, `blurproj/`, `project/`, `drive-blur.js`,
`drive-dropdown.js`, `drive-*-{before,after}.log`, `mut/`).

