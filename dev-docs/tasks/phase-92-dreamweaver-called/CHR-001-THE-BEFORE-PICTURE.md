# CHR-001 — The before picture

Every ratchet in this phase needs a number it started from, and every verdict needs a picture of
what it replaced. Both have to be taken **before** anything moves, on HEAD, by a session that
changes nothing else. This task is that session.

## 1. The person sentence

**Someone opening this phase in a month can put the before and after of each surface side by side
and see, in a picture and in four numbers, what changed.**

## 2. What exists

- The audit's screenshots are of the **installed 0.2.4**, not HEAD, and were taken by hand
  ([`audit/`](./audit/)). They are the story, not the baseline.
- P23 built a screenshot corpus: `dev-docs/tasks/phase-23-visual-refresh/corpus/run.sh` +
  `gallery.html`, 14 surfaces × 2 themes. Re-read it at HEAD — it drives the dev stack, and the
  memory says a webpack compile on this box is ~5 minutes on a quiet day and much worse under load.
- P81's verdict protocol (`VIB-001-THE-JUDGE.md` §4–§5) fixes the output shape: PNGs + a manifest
  (surface, state, viewport, HEAD sha) under `verdicts/<task>/<date>/`, and a verdict written with
  the image in context. This phase uses the same shape and the same directory name.
- The four numbers the audit measured over CDP, and the eval that measured them, are in
  [[the-chrome-is-ugly-because-of-gates-not-jquery]]. They must be re-taken **on HEAD**, because
  the installed build may be a few commits either side.

## 3. Scope

1. **Pictures.** Dark and light, at the launcher's default 1368×900:
   - Launcher: Projects (with two seeded projects), Templates, Learning, Community.
   - Editor: a `Group` node selected, panel scrolled to the top; the same panel scrolled to
     Box Shadow (the seven-times hint); the node picker open (the control that already looks right).
   Written to `verdicts/CHR-001/<date>/` with the manifest. Use the packaged-app recipe if a build
   of HEAD is not already up; a `cp -R` of *Landing page test V2* is a good fixture (it has a
   Group at the root of App).
2. **Numbers**, taken by the same CDP eval, committed as `verdicts/CHR-001/<date>/numbers.json`:
   - distinct computed `font-size` values on the Templates tab, and on the Group panel
   - distinct computed button styles on the Templates tab (radius × font-size × weight × fill × border)
   - element count and inline-`style` count of `.sidebar-property-editor` for the Group
   - distinct `border-radius` values on each surface
3. **Static counts**, from the tree, into the same file: raw-px `font-size` declarations under
   `noodl-core-ui/src/preview/launcher/`, under `views/panels/propertyeditor/`, and under
   `noodl-core-ui/src/components/property-panel/`; `fa-` class uses editor-wide; files calling
   `createRoot` under `propertyeditor/`. These are the numbers CHR-002, CHR-007 and CHR-010 ratchet.
4. **A `verdicts/README.md`** that says what a verdict directory contains and how to read the
   manifest — copied from P81's and pointed here.

Out: any change to product code. If a defect is noticed, it goes in §6 of this file with an owner
in the CHR table, and nothing else.

## 4. Acceptance criteria

1. **(person)** Open `verdicts/CHR-001/<date>/` and see the eight PNGs named for what they show, in
   both themes, and a `numbers.json` whose four headline numbers match what the audit reported to
   within a build's drift (10 / 10 / 7 / 1,125 / 250) — or a note explaining each difference.
2. `git status` after the session shows **only** files under `dev-docs/tasks/phase-92-…/`.
3. The manifest carries the HEAD sha and the viewer bundle's md5 (`src/external/viewer/` is
   gitignored and rebuilt by peers — stamp it, per [[the-editor-runs-a-committed-viewer-bundle]]).
4. The PNGs are **committed**, checked with `git check-ignore -v` first — a verdict about an
   uncommitted pixel is a verdict about nothing.

## 5. Traps

- 🔴 **Do not screenshot Richard's running NodeGX.** On the audit day it had no on-screen content
  window at all; and its profile is his. A second packaged instance with `--user-data-dir` is the
  route, and `ELECTRON_RUN_AS_NODE` must be unset for the packaged binary to parse its argv
  ([[drive-a-first-run-with-nodegx-user-data-dir]]).
- 🔴 **The panel does not exist until Design mode is on** — click
  `[aria-label="Editor mode"] button[aria-pressed=false]` first; a canvas node is selected with
  `cdp drag "x,y" "x,y" 2`, not `click`.
- ⚠️ The Templates tab's contents come from the community shelf. Record how many rows it showed;
  the audit saw 7. A network-less run shows a different tab and is a different baseline.
- ⚠️ Light theme: `ThemeManager` persists `editor.theme` in the profile — write it into the
  seeded profile rather than clicking through Settings, so the two runs differ in one thing.

## 6. What was built (2026-09-15, s1)

**Captured and committed without its PNGs (Richard, 2026-09-15; §6.1 AC4).** Evidence: [`verdicts/CHR-001/2026-09-15/`](./verdicts/CHR-001/2026-09-15/):
14 PNGs (7 surfaces × dark, light), `manifest.json`, `numbers.json`, `raw/` (one tally per surface
per theme), and the two scripts that took them, `capture.js` + `measure.js`. **CHR-011 re-runs those
two scripts unchanged**, against the same fixtures at the same viewport, or its numbers do not
compare.

**Build: the packaged 0.2.4, standing for HEAD `e740727f8`.** `git diff v0.2.4..HEAD` (44 commits)
touches no file under `noodl-core-ui/src/components`, `src/styles`, `views/panels/propertyeditor`,
`assets/css` or `editor/index.html`, and one under `preview/launcher`, the new-project wizard's
`templateFilter.ts`, which is not photographed. So no webpack compile was spent. `app.asar` md5
`a9558337…`, viewer bundle inside it `732533b8…` (the checkout's differs; the preview is not a
measured surface). A later task that changes chrome **cannot** use this shortcut: the after picture
needs a build of its own HEAD.

**Recipe** (all in `manifest.json`): `cp -R` fresh copies of *Landing page test V2* and *Reading
Shelf* before each theme; a profile holding `firstRunLegal.json`, `recently_opened_project.json` and
`editorSettings.json` `{"settings":{"editor.theme":"dark"|"light"}}`, nothing else; then
`env -u ELECTRON_RUN_AS_NODE -u NODE_OPTIONS NOODLPORT=8674 NOODL_REMOTE_DEBUG_PORT=9333
/Applications/NodeGX.app/Contents/MacOS/NodeGX --user-data-dir=<profile>` and
`node capture.js <theme> <out>`. The App component has 3 nodes before and after each run.

### 6.1 Acceptance criteria

| AC | state | reading |
|---|---|---|
| 1 | ✅ with notes | 14 PNGs named for what they show. The scope lists **seven** surfaces, not eight: Projects, Community, Learning, Templates, panel top, panel at Box Shadow, node picker. The numbers match the audit, with each difference explained in §6.2 |
| 2 | ✅ | Every file this session wrote is under `phase-92-…/`. The phase directory, scoping included, was committed in s2 (`docs(p92/chr-001)`), without the 14 verdict PNGs |
| 3 | ✅ | `manifest.json` carries HEAD, `app.asar` md5, the viewer bundle md5, the build kind and a sha256 prefix per PNG |
| 4 | ⚪ **ruled out by Richard, 2026-09-15** | `.gitignore:265` ignores `dev-docs/tasks/**/verdicts/**/*.png` (commit `91b942dff`: render drives were committing 10–50 MB a run). Asked whether to `git add -f` the 14 PNGs (7.4 MB), Richard ruled **commit without the PNGs**. The instrument, `numbers.json`, `manifest.json` (a sha256 prefix per PNG) and `raw/` are committed; the pixels exist only on this disk. 🔴 CHR-011 compares against **these numbers**, and against the PNGs only if they are still on disk. Check each one against the manifest's sha256 before arguing from it |

### 6.2 The numbers, against the audit

| reading | audit | CHR-001 | why they differ |
|---|---|---|---|
| font sizes, Templates tab | 10 | **10** every element · **8** visible · **6** text-bearing | The audit counted every element in `body`, **including ones not on screen** (the 10, 15 and 20px ones). Reproduced exactly: 146–147 elements, the same 10 values, the same radii `2 3 4 7 8 50% 100%`. 🔴 **CHR-002 must say which count it ratchets.** Deleting hidden markup moves the audit's count and changes nothing a person sees |
| `13.333px` (the unstyled `<button>` default) | "leaking" | on 25 elements, **none of them text-bearing** | Each Templates row is one `<button>` whose children set their own sizes. The leak is real in the structure but not in what a person reads |
| button styles, Templates tab | 7 | **7** (19 buttons) | — |
| font sizes, Group panel | 10 | **10** (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13.33, 14) · 7 text-bearing | — |
| elements / inline-styled, Group panel | 1,125 / 250 | **1,126 / 250** | one element; both themes |
| radii, Group panel | 5 | **5** | — |
| fills, Group panel | 9 | **10** dark · **9** light | the audit's number was a single theme's |
| "applies when Shadow Enabled is on" | **7×** | **6×** | Offset X, Offset Y, Blur Radius, Spread Radius, Inset, Shadow Color: 6 text matches and 6 "Go to Shadow Enabled" buttons, in both themes |
| Templates rows | 7 | **7** | the shelf was reachable |
| files calling `createRoot` under `propertyeditor/` | 39 | **38** files, 46 calls | excluding `*.test.*` |
| `fa-` class uses, editor-wide | 32 | **36** in 17 files (22 in 12 under `propertyeditor/`) | scope in `numbers.json`; the audit's scope was not recorded |
| raw-px `font-size` | 141, 0 tokenised (launcher) | launcher **141 / 0 var** (+12 numeric JSX `fontSize`) · `propertyeditor/` **32 px, 15 var** of 48 (+3) · `property-panel/` **15 / 0** | occurrences, not lines |
| viewport | 1368×900 | **1368×781** | The display is 1440×900 with 781 available, and Electron clamps the window to that. Both themes were taken at 781. CHR-011 must use the same box, or say it did not |

### 6.3 Verdicts — written with each PNG open in context (VIB-001 §5)

Session verdicts. **Richard's look supersedes them in both directions.** A baseline is expected not to
be WORTHY, and recording that honestly is this task working.

| surface | verdict | what the picture shows |
|---|---|---|
| Launcher · Templates (both themes) | **SHITTY** | Seven bordered text rows run the full 1,300px width. Only 4½ fit above the fold, and none has a picture. Each row carries a 17px title, a 14px sentence and 11px tags in 2px-bordered boxes, with a 13px blue link pinned to the far right corner, away from the title it belongs to. The filter chips read `All (7) ✓ · Starter (1) · Data app (1) · Site (2) · game (3)`: one lowercase category among capitalised ones. The right half of the page header is empty |
| Launcher · Projects | **PASSABLE** | One title, one primary button, a clear grid. But two full-width promo cards take ~280px before any project. The project cards are a flat gradient with a giant initial **cropped by the card's own edge** ("I", "R"), which reads as a placeholder. And a 224px folder sidebar serves two projects |
| Launcher · Community | **SHITTY** | The layout is coherent. What fails is the "How the community is doing" tiles: a guest is shown `2 of 30 threads`, `0 of 3 consecutive weeks with a call` and `(n=0, 2 unreplied), target under 24h`. Those are internal KPIs, and "no replies yet" is set at the display-number size meant for a digit |
| Launcher · Learning | **PASSABLE** | A consistent three-up card grid with one blue `Start` per card. But there are four badge styles (numbered circle, `NodeGX` pill, blue `Next up` pill, filter chips), progress is a 3px grey line, `Install a lesson...` is bare text, and the hero repeats card 1's sentence word for word |
| Property panel · Group, top | **SHITTY** | Three left edges: `Add style variant` and `Neutral state` at one indent, the section rows at another, the filter box at a third. Width and Height are a label, a status dot, a field starting at an unrelated x, a separate `%` box, the word `Fixed`, then an empty swatch-sized square. Section headings are tiny letter-spaced caps behind a text `▾`. The Comment box and two tabs push the first property 420px down |
| Property panel · Box Shadow | **SHITTY** | About 60% of the section is the same two lines six times: a coloured rule, "X applies when Shadow Enabled is on.", an underlined link. They sit between dimmed rows. In **light** the dimmed Inset switch is near-invisible, a white knob on a pale track. In **dark** the link is dark blue on near-black |
| Node picker (the control) | **PASSABLE** — closest to WORTHY on either surface | One card style in one three-column grid, a counted category list, a mono key-port list and a keyboard footer. The same in both themes, and it reads as current. The tell that keeps it from WORTHY: the description paragraph is **cut off mid-line** by the Key Ports divider |

### 6.4 Defects noticed — recorded, not fixed (Out: product code)

| # | defect | seen in | owner |
|---|---|---|---|
| C1 | A dimmed switch in a gated row is near-invisible in light theme (Inset under Box Shadow) | `editor-group-panel-boxshadow-light.png` | **CHR-008** (R8 dims rows rather than hiding them, so a dimmed control must stay legible) + **CHR-004** (≥3:1 on the rendered control) |
| C2 | The per-row "Show Shadow Enabled" link is dark blue on near-black in dark theme | `editor-group-panel-boxshadow-dark.png` | **CHR-008** (the per-row hint becomes one group line) |
| C3 | Community tiles show internal KPI wording to a guest | `launcher-community-*.png` | **Ruled 2026-09-15: hide the health tiles from a signed-out reader; members still see them, and the words stay** (P67 D21's readout is graded on them, per P82 REL-019). Not chrome and not built here. The tiles are P75 FB-013's (`preview/launcher/Launcher/views/Community.tsx`), so the build belongs on P75's board |
| C4 | A project card's placeholder initial is cropped by the card edge | `launcher-projects-*.png` | **CHR-005** (R5 keeps the placeholder only for never-opened projects) |
| C5 | Node picker description clipped mid-line above Key Ports | `editor-nodepicker-*.png` | **not CHR scope**: P23 UIX-013's surface; recorded so CHR-011's control is not blamed for it |
| C6 | `category: "game"` shows lowercase in the Templates filter | `launcher-templates-*.png` | **CHR-006** (it redraws the filter from the registry's category labels) |

### 6.5 Traps this session paid for

- 🔴 **A click inside the open node picker inserts a node, and the project autosaves it.** A
  "click empty canvas" at (700,700) landed on the modal, which reaches y≈718 at this viewport, and put
  a `Page Inputs` node into the fixture. Every shot after it was of a changed project, so the run was
  thrown away and redone from fresh copies. `capture.js` now opens the picker last, never clicks
  while it is open, and checks the App node count afterwards.
- 🔴 **Hovering the preview in Design mode leaves its geometry tooltip up.** Moving the pointer out
  through CDP never delivers the webview a leave event. Selecting a canvas node shows **that node's**
  tooltip (973 × 6236.3 for the root Group); that is the real selected state and is kept. Never move
  across the preview before a shot.
- ⚠️ Escape through `Input.dispatchKeyEvent`, even with focus emulation, does **not** close the
  picker. That is harmless because it is the last shot; the instance is killed afterwards.
- ⚠️ The type chip reads `Group · Visual` in the DOM; `text-transform` uppercases it. A check for
  `GROUP` in the text finds nothing.
