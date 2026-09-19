# Phase 94 — next session

**Written at the end of s9, 2026-09-19.** Commit this session: `99381daea` (STY-006, AC1–AC7 + the
three-guard fix the drive forced).

🔴 **READ FIRST:** [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) §8 — it
supersedes README §5. **Nothing in this phase closes on a passing test.**

---

## 1. Built vs. driven, per task

| task | built (code + gates) | **driven** (the app doing it) | Richard |
|---|---|---|---|
| STY-001 study + verdict | 🟢 | n/a | 🟢 ruled 2026-09-18 |
| STY-002 the Look model | 🟢 AC2–AC7 + AC1's mechanism | 🟢 | ⬜ AC1's *name* ("Look") still unruled |
| STY-003 the property panel | 🟢 AC1–AC3, AC6, AC7 | 🟢 AC5 (s5), gutter + rename (s7) | 🔴 **AC8 — `shots/sty003-gutter-{dark,light}.png`** |
| STY-004 export carries Looks | 🟢 Part A (AC1–AC7) | 🟢 | — Part B (one shared class per Look) = 1 session, **not blocking** |
| STY-005 the Styles panel | 🟢 AC1–AC6 (s8) | 🟢 AC7 — 25/25 arms, both themes | 🔴 **AC8 — `shots/sty005-panel-{dark,light}.png`** |
| **STY-006 where it's used** | 🟢 **AC1–AC4, AC6 (s9)** | 🟢 **AC5 + AC7 — 28/28 arms, exit 0, both themes** | 🔴 **AC8 — `shots/sty006-used-by-{dark,light}.png`** |
| STY-007 the after picture | ⬜ | ⬜ | — 🔴 **must not open before the three pairs above are ruled** |

🔴 **BUILT-BUT-UNDRIVEN COUNT: 0.** Every built task in this phase has been driven.
🔴 **STY-007 is the only unbuilt task, and it is BLOCKED on Richard by definition** — it is the
*after* picture of surfaces he has not yet approved. **The phase's entire remaining debt is three
screenshot pairs in front of one person.**

---

## 2. Gate readings — s9, 2026-09-19, at `99381daea`

| gate | reading | note |
|---|---|---|
| `npm run test:main` | **514 suites / 8,223 tests, all pass, exit 0, zero FAIL** | ⚠️ **do NOT read 514 as this task's number** — STY-006 is 3 suites / 44 tests; the rest arrived from peers mid-session |
| `tsc -p tsconfig.json --noEmit` (noodl-editor) | **exit 0, zero output** | 🔴 `--noEmit` matters: `tsc -p <package>` EMITS IN PLACE |
| `tests-unit/sty-006` | **3 suites / 44 tests** | wearers, format, styleRowWearers |
| `tests-unit/sty-005` | **38/38, unchanged** across the walk rewrite | the reading that says the count-derivation is the same answer |
| `tests-unit/chr-007` | **passes** | the suite an added import has silently switched off before |
| mutant arm | `return list.push(...)` in both walks ⇒ **5 named failures**; reverted ⇒ 18/18 | the gate can go red |
| `drive-sty006-wheres-it-used.js` | **28/28 graded arms, exit 0**, dark + light, 1 ungraded and named | |
| `npm run test:ci` | ⏳ **NOT RUN at s8 or s9.** Last trusted reading is s7: seed 13542, 2,978 specs, **8 failures BY NAME** (3 SUB-006, 3 SUB-011, 2 NDA-017) = the floor | `TESTCI_EXIT=1` **IS** the floor — read the NAMES, never the code |

---

## 3. What s9 settled

### STY-006, and the one decision that shapes it
Pressing a row's count opens the list of what names that style, **inline under the row**; pressing
an entry switches the canvas to that component and selects that node.
🔴 **The count is a `.length` over the wearer walk** — `styleUsageIn` *and*
`ProjectModel.variantWearerCounts` both derive from `styleWearersIn`/`lookWearersIn`, so a row
cannot say `9×` above eight lines. Inline rather than a `ContextMenu` because `BaseDialog` reads
`document` in a `useState` initialiser and **there is no jsdom here**; the open row is the
**section's** state, which is what lets a spec render a row open.

### 🔴 The defect the drive found, and the three guards it took
Pressing an entry **destroyed the list it was pressed in** — the sidebar came back reading
`components`. `keepSidePanel` is **P93 TVW-004's** flag and was threaded through `selectNode` only;
`clearSelection` → `deselect` → `hidePanels` was unguarded at **two further sites**, and the one
that actually fired was **`selectNode`'s own `clearSelection()` inside `settle`**.
🔴 **The first two fixes measured byte-identical to no fix at all.** What settled it was **wrapping
`SidebarModel`'s own methods in the running editor and reading the stack** — not a third guess.
See `STY-006-WHERE-ITS-USED.md` §6.

### 🔴 Two things a next session must know before it drives anything
1. **Webpack HMR replaces the MODULE; an already-constructed instance keeps the OLD prototype.**
   Reload the renderer before trusting a fix, and read the fix's own string off the **loaded class**.
   A `tail | grep "compiled successfully"` matches **history**, not the compile you are waiting for.
2. **A peer session drove this editor for ~30 minutes and it cost three runs.** Their `dev:debug`
   died with **exit 144 = the single-instance lock**, so their `cdp.js` attached to *my* Electron.
   The drive now **refuses an editor it cannot prove it owns** and **fails closed**. Exit 144 is a
   statement about *ownership*, not a launch failure to retry.

---

## 4. What to do next

### 🔴 Owed by RICHARD — an agent cannot close these, and they ARE the phase now
1. **STY-003 AC8** — `shots/sty003-gutter-{dark,light}.png`. Does the gutter read right?
2. **STY-005 AC8** — `shots/sty005-panel-{dark,light}.png`. Is the Styles panel WORTHY?
3. **STY-006 AC8** — `shots/sty006-used-by-{dark,light}.png`. ⚠️ The Look called **`Drive Look`
   was made by the drive**, not shipped with the fixture.
4. **STY-002 AC1** — is the concept called **"Look"**? Still explicitly unruled (`STY-DESIGN` §9).
   Renaming is cheap in code and expensive in docs, so **ask before STY-007**.

✅ **Already ruled at s9, do not re-ask:** the wearer entries need **no visible pressable cue**
(hover is enough — an arrow and an accent label were both offered and declined), and **`Drive Look`
stays** in the fixture.

### What an agent can do alone, in order
1. **`test:ci`** — not run at s8 or s9. Run it before anything ships and read the eight **by name**.
2. **Relay to P93** (see §5 below) — one message, not a task.
3. **The two s7 defects, still filed-not-fixed** (STY-003 §2f); neither blocks an AC, so neither is
   a first job: (a) a node can hold a `VariantModel` that is **not the project's**; (b)
   `nodegx.styles.json` stopped being written for a session.
4. **STY-004 Part B** (one shared class per Look) — one session, not blocking.

🔴 **Do NOT open STY-007 before the three pairs are ruled**, and do not treat the two filed defects
as the next build — [[build-the-tasks-do-not-farm-the-defects]].

---

## 5. Owed to other phases

- **P93 (TVW-004):** `keepSidePanel` now holds on the **cross-component** path, which their drive
  never exercised — their fix guarded one of three `clearSelection` sites. Worth a line to them.
- **P93 (TVW-001):** `ComponentsPanelNew/showUsedInPopover.ts` → `navigateToInstance` uses the same
  door **unguarded**. Its symptom is invisible because `hidePanels()` falls back to `components`,
  which is the panel that popover was opened from. **Filed, not fixed, not farmed.**
