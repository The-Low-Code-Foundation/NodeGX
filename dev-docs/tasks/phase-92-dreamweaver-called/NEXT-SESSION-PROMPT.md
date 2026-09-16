# Phase 92 — next session

**Written 2026-09-16 at the end of s11 (CHR-008 slice 4: the first widget conversion — built, driven,
and deliberately NOT shipped).** Branch `cline-dev`. Phase commits:
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half is
`~/vscode_projects/nodegx-community` (separate repo, no remote), deployed at `f39d20f` — s11 changed
nothing there.

⚠️ A **P88 peer** is working in this checkout: `validation/{authoredCandidate,responsiveArrangement}.ts`
and the untracked `tests-unit/validation/gam-022-*.test.ts` are theirs. Never commit them; commit by
pathspec. (s11 did.)

## The board, re-derived from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard: "Looks good" |
| CHR-003 one radius, one shadow, one box model | ✅ Richard: "fine" |
| CHR-005 one launcher page | ✅ Richard: "fine" |
| CHR-006 the Templates tab gets its pictures | ✅ WORTHY |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| CHR-012 the Community tab | ✅ closed as "passable" (Richard, after s8) |
| **CHR-008 the panel is one tree** | 🟡 **R8** (s8), **§3.4 identity** (s9), **§3.2 + §3.1 scaffold** (s10), **§3.1 slice 4 — first widget converted, driven, INERT** (s11, §10). Left: the undo re-seed defect, then the remaining 37 widgets, §3.6 popout, §3.8 chevron; AC3, AC4 |
| CHR-004, 009, 010, 011 | ⬜ not built |

## First job

🔴 **Fix the undo re-seed defect, then flip one line.** `components/widgets/index.ts` holds
`// textArea: TextAreaWidget`, commented out. Everything else in the slice is finished, committed and
driven; that comment is the whole of what is switched off.

**The defect, measured as a control pair** (one node, one drive, one varied thing — which row):

| row | after `undo()` | agreed |
|---|---|---|
| legacy `fontSize` (`createRoot` + `ControlHost`) | field follows the model back | ✅ 250 ms |
| converted `text` (`TextAreaWidget`) | model reverts, field keeps the typed text | 🔴 no, at 4000 ms |

The legacy path re-seeds by construction — a fresh `createRoot` every render. The converted one needs
React to re-render the widget *and* `PropertyPanelTextArea`'s `useEffect([value])` to fire. A marker
set on the textarea **survives the undo**, so the element is never replaced: the component is either
re-rendering with an unchanged `value`, or not re-rendering at all.

✅ **The diagnostic that separates those in one run:** put a render counter in `TextAreaWidget` (e.g.
`window.__twRenders = (window.__twRenders || 0) + 1` plus the `value` it saw), rebuild, then repeat
`verdicts/CHR-008/2026-09-16/probe4`-style edit → undo. If the counter does not move, `renderGroups`
is not reaching this row and the fix is in `Ports`; if it moves but `value` is stale, the fix is in
how `TextAreaWidget` reads the parameter (it reads `view.parent.model.getParameter` at render).

🔴 **Do not "fix" it by keying the control on the value.** That remounts the input on every commit and
throws away the caret, which is the whole property §3.5 is chasing — and this slice already proved the
caret survives (the textarea element is never replaced).

## Then, in order

1. **The remaining §3.1 conversions, in the order the census gives** (task §10.1), not by file size:
   **unblocked** — `dimension`, `icon`, `marginPadding`, `listValue`, `stringList`, `alignTools`,
   `propList`, `pages`, the `logicBuilder` pair, and the six `PickerTypeView` rows (one shared base).
   **blocked until a host stops reading `.el`** — `basic`, `boolean`, `color`, `enum`,
   `numberWithUnits`, `sizeMode`.
   ✅ **`dimension` is unblocked**, and it is the one that closes §3.5's Width/caret arm — take it
   first once the re-seed defect is fixed, because it is the conversion with a visible payoff.
2. CHR-004 — smaller than scoped; CHR-005's `drive.js` `CONTRAST` prototypes R3's gate.
3. CHR-006 remainders (no ruling): plural chip labels; pictures for `site-builder` / `members-area`.

## Still Richard's

1. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
2. R6 final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed.
3. The Projects tab's two full-width cards (BST-003 / UNI-001) — ask before moving them.
4. `members-area`'s live summary is lowercase and fragmentary (P86/P78 data).
5. **Nothing in s11 changes a pixel at rest**, by design — the slice is inert. The panel is
   byte-for-byte the s10 panel.

## 🔴 Two acceptance criteria are wrong as written (task §10.4)

- **AC3 counts prose.** `grep -rl "createRoot"` reads **42**, up from 39, while the code count went
  **38 → 37** — the new files *discuss* `createRoot` in their comments. Re-word it to strip comments
  (`tests-unit/support/renderElements.ts` already exports `stripComments`), or it reads as a
  regression on every slice that documents itself. Its ≤ 3 target is also **unreachable by widget
  conversion**: popout roots (`IconType`, `ColorType`, `PickerTypeView`, `CodeEditorType`,
  `componentpicker`, `ListValueEditor`, `TabGroup`, `PopoutGroup`…) keep their files in that grep.
  Reaching ≤ 3 needs one shared portal host, which is unscoped.
- **AC4 cannot move on a `textArea` conversion at all**: the Group panel has no `textArea` port — only
  `Text.text` and `String Format.format` have one in the whole catalog. `dimension` is where 1,241
  starts falling.

## Traps

- 🔴 **A row class must keep a working `render()` while its widget can be registered.** Emptying the
  registry is only a real fallback if the class can still draw itself. s11 reduced `TextAreaType` to
  `fromPort` + a redraw signal, so with the registry off `renderParams` got an `undefined` element and
  `ControlHost` hosted an empty div — **the Text row drew nothing, silently**. Restored from `HEAD`.
- 🔴 **Five instrument faults produced confident wrong answers before any product reading was true**
  (task §10.9): synthetic `input`/`change` commit nothing through a *controlled* component that
  commits on blur — type with CDP **`Input.insertText`**; a single snapshot is not a measurement (use
  a bounded retry, as `settleScroll`/`settleHints` do); searching only `getActiveComponent()` misses
  every node not on screen; a **connected** port draws FB-018's chip and looks exactly like a missing
  row; and a backtick inside a JS template literal ends the string (`node --check` first).
- 🔴 **`findNodeWithId` returns the VIEW node — the model is at `.model`.** `ed.selectNode(null)`
  throws rather than clearing.
- 🔴 **The census population must be printed, not assumed.** Three censuses returned confident wrong
  answers (a regex that missed `sizeMode` because its condition is built in a variable;
  `dynamicports` vs `dynamicPorts`; a dict read as a list). The catalog adapter that works is the one
  `tests-unit/fb-021/portGateReason.test.ts` already uses: `node.dynamicPorts.declaredPortGroups[]`.
- 🔴 `--expect-dir` in `open.js` is **inert on the dev build** — `ProjectModel` is not on `window`, so
  it prints "could not read the project directory" and guards nothing. Verify which project opened by
  mtime (opening writes three files into it) and by the recents `latestAccessed`.
- 🔴 The dev build shares `~/Library/Application Support/NodeGX` with the **installed app**. s11 seeded
  a scratch "Story engine" recents entry before boot and restored the file byte-identical afterwards;
  back it up first, and never append while the editor is running (`store()` rewrites the whole array).
- 🔴 One heavy job at a time, and tear the stack down when a drive ends (`npm run dev:stop`, 26
  processes). zsh: `npx jest $DIRS` needs `${=DIRS}`; `$PIPESTATUS` is bash — zsh is `${pipestatus[1]}`,
  and s11's first spec run reported `EXIT=0` from a `tail` while the suite had failed **to run**.
- ✅ Drive recipe that works: `reload.js` → `open.js` → `textarea.js` / `probe4.js`, all in
  `verdicts/CHR-008/2026-09-16/`. Confirm the served bundle carries the change **and** reload the
  renderer before believing a re-drive.

## Readings at the end of s11

`tsc` **EXIT=0**; targeted jest **38 suites / 609 tests**, 0 failed-to-run; full `tests-unit`
**446 / 446 suites, 7,361 tests** (s10: 445 / 7,345 — the delta is exactly the one new suite and its
16 tests). Mutants **5/5 killed**. Panel structure with the slice inert: **44 rows, 44 control hosts,
1 textarea**, undo re-seeding in **250 ms** — byte-for-byte the s10 behaviour.
