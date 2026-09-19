# Phase 94 — next session

**Written at the end of s8, 2026-09-19.** Commits this session: `7f2e31414` (STY-005 AC1–AC6),
`3673dd82c` (STY-005 AC7 + the two things the shot found).

🔴 **READ FIRST:** [`STY-DESIGN-THE-LOOK-MODEL.md`](./STY-DESIGN-THE-LOOK-MODEL.md) §8 — it
supersedes README §5. **Nothing in this phase closes on a passing test.**

---

## 1. Built vs. driven, per task

| task | built (code + gates) | **driven** (the app doing it) | Richard |
|---|---|---|---|
| STY-001 study + verdict | 🟢 | n/a | 🟢 ruled 2026-09-18 |
| STY-002 the Look model | 🟢 AC2/3/4/6 + AC5 + AC1's mechanism; **AC7 closed at s7** (`tests/models/*` ran under `test:ci`) | 🟢 | ⬜ AC1's *name* ("Look") still unruled |
| STY-003 the property panel | 🟢 AC1–AC3, AC6, AC7 | 🟢 **AC5 driven s5; the gutter + rename fixes driven s7** | 🔴 **AC8 — `shots/sty003-gutter-{dark,light}.png`** |
| STY-004 export carries Looks | 🟢 Part A (AC1–AC7) | 🟢 | — Part B (one shared class per Look) = 1 session, **not blocking** |
| **STY-005 the Styles panel** | 🟢 **AC1–AC6 (s8)** | 🟢 **AC7 driven s8 — 25/25 arms, both themes** | 🔴 **AC8 — `shots/sty005-panel-{dark,light}.png`** |
| STY-006 where it's used | ⬜ | ⬜ | — |
| STY-007 the after picture | ⬜ | ⬜ | — |

🔴 **BUILT-BUT-UNDRIVEN COUNT: 0.** Every built task in this phase has been driven. **The phase's
real debt is not code — it is two screenshots nobody has shown Richard.**

---

## 2. Gate readings — s8, 2026-09-19, at `3673dd82c`

| gate | reading | note |
|---|---|---|
| `npm run test:main` | **510 suites / 8,161 tests, all pass, exit 0** | up from s7's 504/8,063 — +4 suites are `tests-unit/sty-005` (38 tests), the rest are peers' |
| `tsc -p tsconfig.json --noEmit` (noodl-editor) | **exit 0, zero output** | 🔴 `--noEmit` matters: `tsc -p <package>` EMITS IN PLACE |
| `tests-unit/sty-005` | **4 suites / 38 tests** | railSlot, styleUsage, styleRow, format |
| `tests-unit/fix-015` | **passes after the move** | it imports `TokenCategorySection` BY PATH; the retirement moved both together |
| `drive-sty005-panel.js` | **25/25 graded arms**, dark + light | against a COPY of `cn027-drive` |
| `npm run test:ci` | ⏳ **NOT RUN THIS SESSION.** Last trusted reading is s7: seed 13542, 2,978 specs, **8 failures BY NAME** (3 SUB-006, 3 SUB-011, 2 NDA-017) = the floor | `TESTCI_EXIT=1` **IS** the floor — read the NAMES, never the code |

---

## 3. What s8 settled

### STY-005 is built, and the task file did not exist when the session started
There was no `STY-005-*.md`; it was written from R1/R3–R6 and the verdict's R-D, then built. The
panel: **order 1.5**, between Components (1) and Search (2), **not `experimental`**. Four sections —
**Colours, Text styles, Looks, Other tokens**. Every row badged with its layer and counted.

### 🔴 The task file's own §2 was wrong about one thing, corrected in the build
It said the Tokens section holds "what has no style-layer twin" and set
`excludeGroups = ['Colors', 'Typography']`. **The Text styles section draws no token rows at all**,
so excluding Typography made the typography tokens reachable from nowhere in the editor. Now
`['Colors']`.

### 🔴 Two things every assertion passed and only the SHOT caught (3rd + 4th time this phase)
1. The Colours section was **88 token rows** long; the nine colour styles were buried and Looks sat
   below ninety swatches. Tokens now behind a **closed** `Design tokens (88)` sub-heading.
2. The token groups drew as **PEERS** of the three ruled sections — `Colours | Text styles | Looks |
   Spacing | Borders | Effects | Animation`, seven things, four secretly a different layer. Now under
   `Other tokens`.

### 🔴 Two INSTRUMENT faults that read exactly like product defects → [[a-rect-is-not-visibility]]
- `elementFromPoint` returned `IFRAME` for every point, the rail button included. The blocker was
  the **webpack-dev-server error overlay** (full-window iframe, `z-index: 2147483647`), injected
  because a **peer's** mid-flight `VisualCanvas/PreviewChrome.tsx` was red. The drive now strips it
  and **reports that it did**.
- **A RECT IS NOT VISIBILITY.** A collapsed `CollapsableSection` is 36px with `overflow: hidden` and
  the browser lays its children out *before* clipping — eight clipped rows reported full rects inside
  the viewport, and the drive reported **8 unreachable menus in a panel where nothing was
  unreachable.** The hit test IS the visibility test. And because that predicate now *excludes* rows,
  the drive opens the collapsed section and re-measures.

### Structural facts the next session will need
- ⚠️ **`StylesModel` CANNOT be imported under jest** (`projectmodel` → `bugtracker` reads
  `platform.getUserDataPath()` in its module body). The usage walk lives in **`StylesModel.usage.ts`**
  and the row formatters in **`StylesPanel/format.ts`**, both importing NOTHING and taking the project
  as a **parameter**. Anything else that must be graded goes the same way.
- ⚠️ That move also **killed a second copy**: `views/TextStylePicker/utils.js` had its own per-name
  walk for the two delete-confirm modals and now delegates, so the modals and the panel's usage
  column cannot disagree.
- ⚠️ **A text style field has TWO shapes** — `{value:'14',unit:'px'}` in `nodegx.styles.json`,
  `'var(--text-sm)'` in node parameters. A reader that knows one draws a **blank** value line for the
  other.
- ⚠️ **The `⋯` cannot be rendered under jest**: `ContextMenu` → `MenuDialog` → `BaseDialog` reads
  `document` in a `useState` initialiser and **there is no jsdom in this repo**. It is stubbed and the
  spec says so; a CSS gate and the drive carry R6 instead.
- ⚠️ Drive fixture: a **COPY** of `cn027-drive` → `STY-005 Panel Drive`. It is the **only** project
  on this machine with 9 colour styles + 2 text styles + 1 Look at once.

---

## 4. What to do next

### 🔴 Owed by RICHARD — an agent cannot close these
1. **STY-003 AC8** — `shots/sty003-gutter-{dark,light}.png`. Does the gutter read right now?
2. **STY-005 AC8** — `shots/sty005-panel-{dark,light}.png`. Is the Styles panel WORTHY?
3. **STY-002 AC1** — is the concept called **"Look"**? Still explicitly not ruled
   (`STY-DESIGN` §9). Renaming later is cheap in code and expensive in docs, so ask before STY-007.
4. Optional, from the shot: is the **`Design tokens (88)` sub-section right closed**, or does he want
   the two layers interleaved as one flat list?

### What an agent can do alone, in order
1. **STY-006 — "where it's used".** The counts exist and are correct (`styleUsageIn` returns
   `{nodeCount, variantCount}` per name); what is missing is **taking you there**. This is the
   natural next build and it needs no ruling.
2. **The two s7 defects, still filed-not-fixed** (STY-003 §2f) — neither blocks an AC, so neither is
   the first job:
   (a) a node can hold a `VariantModel` that is **not the project's** (three disagreeing names
   measured at once); live candidate is `applyProjectLevelSlice` re-hydrating `variants` into NEW
   objects while every node keeps its cached `_variant`.
   (b) `nodegx.styles.json` **stopped being written** for a whole session while the wearer's
   component kept being — start at `saveProjectLevel`'s `hash === projectLevelHashes.get(key) →
   continue`.
3. **`test:ci`** — not run at s8. Run it before anything ships and read the eight failures **by name**.
4. **STY-004 Part B** (one shared class per Look across components) — one session, not blocking.

🔴 **Do NOT open STY-007 (the after picture) before Richard has ruled on the two shots above** — it
is the *after* picture of surfaces he has not yet approved.
