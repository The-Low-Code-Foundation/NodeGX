# Next session — P109 session 46

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 45 (2026-10-11, on `cline-dev`, primary tree):** the board stays at **40 of 52 closed**, but two tasks moved.
ISL-046 went from 5 to 7 of 9 (SECONDVISIT, MOVEARROW). ISL-037 was started (the s44 handoff called it "outside this
phase"; it is not) and reached 4 of 7. Richard ruled twice, both times in one round.

## The board (re-derived from the task files' `**Status` lines, s45)

| task | state | what is left | blocked on |
|---|---|---|---|
| ISL-037 templates carry no warned shape | 🟢 4 / 7 | DBTPAGETITLES; NIGHTBOOKHOME; ROWWRAP's 3 Nightbook rows | DBTPAGETITLES on **P109-S45-WIREDTITLE** (buildable); the rest on P78's untracked Nightbook pile |
| ISL-046 templates & kits | 🟢 7 / 9 | INSTALLER, TPL011UNREADID | the tablets; P78's Nightbook pile |
| ISL-043 export | ⬜ 8 bugs | all | P18 is live in `nodegx-export` (26 files open there in s45) |
| ISL-007, 008, 009, 010, 018, 022, 024, 025, 035 | 🟡/🟢/⬜ | read each one's §8 | **check, do not copy:** ISL-024 waited for "a gap with no P108 lane open", and P108 has had no commit since 2026-10-04 |

## Do, in this order

1. **Re-read the board yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`). Do not copy the table above.
2. **P109-S45-WIREDTITLE** (medium, found s45, read but not driven): drive it first. Two pages, one Title typed and
   one wired from a String; read `document.title` on each. If it is red, fix it so the Router sets the tab from the
   Page node's current title (`getTitle()`), on mount and when the Title changes while the page shows, with the typed
   title as the fallback. Its file has the line numbers.
3. **ISL-037 DBTPAGETITLES** on top of it: a `t_<page>_title` Translation per page in
   `templates/digital-bricks-training` (keys beside each page's namespace in `Data/Strings` `str_graph`; the pattern
   and its comment are on every other Translation there). Then `node tools/build-demo.mjs` and `tools/check-demo.mjs`.
   The template is in production: run HEAD's builder first as the control, as s42 and s45 did.
4. **ISL-024**: read its §8 and decide whether "no P108 lane open" now holds. If it does, it is ruled and buildable.

## Human decisions owed

- 🔴 **The working copy's `package-lock.json`** is still the stale 2026-09-24 file that removes `@nodegx/node-spec`'s
  entries. s45 left it alone.
- **`templates/nightbook/` is untracked** (P78's pile). Four P109 rows now wait on it: TPL011UNREADID, NIGHTBOOKHOME,
  ROWWRAP's three rows, and DEF038's gate, which reads it red from the working tree.
- **`planning-demo` on nodegx.io** carries MOVEARROW's bug until it is republished. s45 regenerated it but did not
  publish (outward-facing).
- **Still owed:** `P109-S36-STALEMCPDIST`, the `nodegx` bin rebuild, the viewer runtime build
  (`npm run build:editor:_viewer`, for BUILTINBOUNDARY), and s38/s39's list.

## What s45 built (commits)

- **ISL-046 SECONDVISIT `eafa1b4af`:** the diagnosis was wrong. A probe on the second visit found no Garden 3D on the
  page: under software GL the island falls back to the flat Garden and keeps that choice. The flat Garden never kept
  chips apart. `chipLifts` moved into garden-kit (one copy), and the Garden node lifts a plot chip that would cover
  another. Touch drive: 3D mode 29/31, flat 28/31 at the time (the rest were TOUCHBUILD's).
- **ISL-046 MOVEARROW `96059a380`:** asked a third time with the cost, **ruled "fix the old planner now"**. Run on the
  runtime's own Model and Collection for the first time: `→ → Offer the add-on`. Every planner list gives a row its own
  id (card, day columns, carry list, and the block sheet's next actions, found by a census). The guard strips prefixes
  on save. No store clean-up, because TPL-008-PJ's carry-over empties `Project.move`. 101/101 with arms.
- **ISL-037 DEF038 `f7d3bcc2b`:** the demo's responders pin run-on-change `true` (`build-demo.mjs`).
- **ISL-037 TOUCHBUILD `5778f4b1c`:** the drive watched the island for building that P108 s9 moved into the Workshop.
  Underneath, building had paid nothing since 3 Oct. **Ruled "Building pays nothing".** The drive reads the product as
  it is: **31/31**, its first green since 2026-10-01.
- **ISL-037 ARIALABELWORDS `822081831`:** the eight screen-reader names are in her language (four `a11y*` words; each
  robot card named by its robot). The words drive gained ARIA, red on HEAD.
- **ISL-037 OLIVEDRIVE `07392a4ed`:** the Olive drive picks the can up first, as since R7: 19/3 → 22/22.
- **Docs:** `2aa39864c`, plus this handoff's commit.

## Gate readings (2026-10-11)

- `drive-iw007-touch.js` flat **31/31** (garden at `822081831`'s tree). `drive-isl007-words.js` all passed (ARIA:
  8 read). `drive-cg005-olive.js pages` **22/22**.
- noodl-mcp: `tpl010Template` 101/101, `editorSuite` + `tpl008Template` green; `isl046Meters3d`, `ig007Garden3d`,
  `p108s7`, `cg001GardenKit` 144/144; `cg003Template` + `isl037AriaLabels` green; `def038SettledTemplates` 30/31 (the
  1 is Nightbook); nodegx-project-contract template checks 29/29.
- Not run in s45: the editor's `test:ci` / `test:main` (nothing in the editor changed).

## What s45 learned

- **A probe that lists the engines on the page beats reading the engine you expect.** SECONDVISIT's s43 diagnosis read a
  3D-only field off 2D chips. The first probe found no 3D root at all.
- **A drive that goes red after a ruled product change can hide a second change nobody ruled.** TOUCHBUILD looked like
  a stale drive, and it was, but PAY had silently dropped to zero with it. Richard ruled it once it was put in plain words.
- **Before building a "wire it" fix, read whether the wire is read.** DBTPAGETITLES' proposal wires a Page's Title,
  and the Router never reads a wired title (WIREDTITLE).
- **A rename made in the fix sinks a naive arm.** MOVEARROW's arm reverted the id but not `move` → `moveText`, so it
  wrote `moveText` and looked green. The fixed arm reverts both, and a second arm reverts the id only.
- 🔴 **`pgrep -f <pattern>` inside a waiting loop matches the loop itself.** Anchor on the binary's path:
  `ps -Ao command | grep -c '^/Applications/Google Chrome.app/…--headless'`.
- A drive killed with exit 144 and no error, mid-run, while a peer was tearing down. Re-run alone: green.

## Recipes

- **Commit through a temporary index**, then `git reset -q -- <paths>` so the real index matches the new HEAD.
- **Before a regen**, run the generator unchanged and confirm `git status` shows nothing (planning, garden and the
  training demo all held in s45).
- **The touch drive needs a deploy:** `drive-cg003-pages.js assemble <dir>/project`, then
  `nodegx deploy <dir>/project <dir>/deploy --allow-development-engine`.

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged. The older ones are spent.
