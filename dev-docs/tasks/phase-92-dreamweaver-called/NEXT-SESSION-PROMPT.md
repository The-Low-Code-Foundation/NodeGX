# Phase 92 — next session

**Written 2026-09-16 at the end of s10 (CHR-008 §3.5 measured, slice 3 built).** Branch `cline-dev`. Phase commits:
`git log -- dev-docs/tasks/phase-92-dreamweaver-called`. The platform half is `~/vscode_projects/nodegx-community`
(separate repo, no remote), deployed at `f39d20f` — s10 changed nothing there.

⚠️ A **P88 peer** is working in this checkout: `validation/{authoredCandidate,responsiveArrangement}.ts` and the
untracked `tests-unit/validation/gam-022-*.test.ts` are theirs. Never commit them; commit by pathspec.

## The board, from the task files

| id | state |
|---|---|
| CHR-001 the before picture | ✅ committed without its PNGs (ruling) |
| CHR-002 the type scale | ✅ Richard: "Looks good" |
| CHR-003 one radius, one shadow, one box model | ✅ Richard: "fine" |
| CHR-005 one launcher page | ✅ Richard: "fine" |
| CHR-006 the Templates tab gets its pictures | ✅ WORTHY |
| CHR-007 the rows become descriptors | ✅ built s4, invisible by design |
| CHR-012 the Community tab | ✅ closed as passable (Richard, after s8) |
| **CHR-008 the panel is one tree** | 🟡 **R8** (s8), **§3.4 identity** (s9), **§3.2 + §3.1 scaffold** (s10, §9). **§3.5 measured, not fixed** (§8). Left: §3.1's 38 widget conversions, §3.6 popout, §3.8 chevron; AC3, AC4 |
| CHR-004, 009, 010, 011 | ⬜ not built |

## First job

1. **Commit state:** s10 is committed — `627f1a0cc` (slice 3) and the fix + docs commit after it. Nothing of mine
   is uncommitted. Verdict PNGs stay local (gitignored by ruling); the JSONs and drive scripts are committed.
2. Nothing of Richard's is pending on built work. Go to the list below.

## Then, in order

1. **CHR-008 §3.1 — convert the widgets, smallest first.** The scaffold is in: `renderParams` returns
   `<PropertyRow>` nodes and a row class's element is hosted by `ControlHost`. Converting a widget means its
   `renderReact()` body becomes a component rendered as `PropertyRow`'s child, and the class is deleted when
   nothing constructs it — each conversion removes one `createRoot` **and** one `ControlHost` div, which is what
   moves AC3 (39 → ≤3) and AC4 (1,241 → ≤600). Order by size: `FontType` (30 lines), `ComponentType` (43),
   `IdentifierType` (60), `BooleanType` (93), `EnumType` (109). `ColorType`, `CurveType`, `CodeEditorType` LAST,
   each its own commit + drive (task §5).
2. **§3.5 falls out of that, and only that.** A widget holding its value in React state lets a re-render
   reconcile instead of rebuild. Re-run `verdicts/CHR-008/2026-09-16/focus.js`: arm U should keep
   `widthIsFocused: true` and `caret: 2` where today it reads `BODY` / `null`.
3. CHR-004 — smaller than scoped; CHR-005's `drive.js` `CONTRAST` prototypes R3's gate.
4. CHR-006 remainders (no ruling): plural chip labels; pictures for `site-builder` / `members-area`.

## Still Richard's

1. CHR-007 declined AC4's "≤ 1 `_portsHash = undefined`" (CHR-007 §6.2) — do not quietly revisit.
2. R6 final only on his look at CHR-009's screenshots; R7's marker-on-the-tab detail is proposed, not ruled.
3. The Projects tab's two full-width cards (BST-003 / UNI-001) — ask before moving them.
4. `members-area`'s live summary is lowercase and fragmentary (P86/P78 data).
5. Nothing in s10 changes a pixel at rest. Clicking between nodes still does not blink (s9); a rebuild still
   loses the caret (§8) — that is the next visible win.

## What s10 settled

- **§3.5 measured on the packaged 0.2.4** (§8): with `250` typed into Width and the caret at 2, one undo
  rebuilds every row and `activeElement` lands on **`BODY`** with the caret gone. The scroll survives either
  way — FB-017's map — so what a rebuild costs is the **caret**, exactly as the remount cost a blink and not
  the scroll position (§7).
- **Slice 3** (§9): `PropertyRow` + `ControlHost`, `renderParams` returns React nodes, `RowHost` deleted,
  `portDecorationClasses.ts` split out. Full `tests-unit` **445 / 7,345**, `tsc` 0, `test:ci` **at the floor**
  (2,984 specs, 8 failures, the eight by full name, seed 53977).

## Traps

- 🔴 **jest and `tsc` both passed a half-broken feature.** Slice 3's first commit drew FB-017's hint on the live
  path and **not** on a fresh render; a bare `setTimeout(0)` in `renderGroups` fires before React commits, and the
  marked rows arrive at t = 60 ms. The fix is `settleHints`, the bounded retry `settleScroll` already uses for the
  same reason. **Drive every path a feature has before calling it built** (§9.6).
- 🔴 **A direct `NodeGraphNode.setParameter` does not reach the panel** — the rows are bound to a `ModelProxy`, and
  `Ports.bindModel` listens for `instancePortsChanged` / `modelParameterUndo`. Four "firing controls" written that
  way read identical to their own control and graded nothing (§8.2). Use the UI, or `__nodeGraphEditor.undo()`.
- 🔴 **An arm that reads the same as its control grades nothing** — and a mutant table delimited by `|` splits a
  mutated `||` mid-expression, writes garbage, and the suite fails **to run**: `Tests: 0 total` reads like a pass.
- 🔴 `.property-row` was already taken (`propertyeditor.css:98`, a flex row with child rules). The new wrapper is
  `.property-panel-row`; the host is `.property-row-control`.
- 🔴 Importing a constant from `capability-gating/portDecoration` drags in `./index` → `projectmodel` →
  `bugtracker` and kills a `tests-unit` suite at import. Import from `portDecorationClasses.ts`.
- 🔴 One heavy job at a time, and **tear the dev stack down when a drive ends** (`npm run dev:stop`, 25 processes).
  zsh: `npx jest $DIRS` needs `${=DIRS}`; `$PIPESTATUS` is bash — zsh is `$pipestatus[1]`, and a piped exit code
  read the wrong way reports nothing at all.
- ✅ The drive recipe that works: `open.js` (launcher → the story-engine COPY), then `census.js` / `hint.js` /
  `identity.js` / `focus.js`, all in `verdicts/CHR-008/2026-09-16/`. Confirm the bundle carries the change
  (`curl localhost:8080/src/editor/index.bundle.js | grep <marker>`) **and** `cdp.js reload` before believing a
  re-drive — a served bundle is not a running renderer.
