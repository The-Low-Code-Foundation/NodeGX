# ISL-024 — A template lives in its own folder

**Status: ⬜ not started — scoped 2026-10-01 at 27d891bf3.** **Source:** [AUDIT](AUDIT-2026-10-01.md) F34 (with F36 and
F37 as template-side notes, §3) · **Side:** repo layout and tooling. No product code. 🔒 **Ruling-heavy:** nothing moves
before R1–R3 are answered.

A NodeGX template is the folder a person is handed (`templates/<slug>/`). Everything that *makes* that folder lives
somewhere else. The generator and its gates are in `packages/noodl-mcp/tests/`, a package about the MCP server. The page
drives are in `scripts/devtools/`, the desktop shell and host provisioning are in `dev-docs/tasks/<phase>/`, and the
backend drives are in `packages/nodegx-backend/tests/`. A person looking for "the Rocket School source" finds a generated
JSON tree and no pointer to what made it.

## 1. The person sentence

**A person who wants to change a template opens one folder and finds its source, its gates, its drives and how to rebuild
it, and nothing in that folder ships to the family who installs it.**

## 2. What was measured

Census **re-read by me at HEAD `27d891bf3`** from the working tree (read only; lines counted with a line scan, files by
prefix). "src" means the generator modules a `scripts/generate-*-template.ts` imports and their siblings; "specs" means
the jest specs with the same prefix in `packages/noodl-mcp/tests/`.

| template | output | generator src (files / lines) | specs (files / lines) | page drives in `scripts/devtools/` | elsewhere |
|---|---|---|---|---|---|
| site-builder | `packages/noodl-editor/…/templates/site-builder.content.json` | `sb0*` 4 / 10,946 | 8 / 7,715 (prefix over-counts: `sb001`, `sb002` are not template specs) | — | editor's built-in template list |
| members | `templates/members-area/` + `members-area.security.json` | `tpl001*` 5 / 8,966 | 1 / 2,418 | — | 4 `nodegx-backend/tests/tpl001-*` |
| landing | `templates/landing-pages/` | `tpl003*` 3 / 3,344 | 1 / 804 | — | 1 `nodegx-backend/tests/tpl003-*`; editor's `landing-pages.template.ts` |
| pixel | `templates/pixel-game/` | `tpl005*` 3 / 2,176 | 1 / 608 | — | — |
| story | `templates/story-engine/` | `tpl006*` 3 / 2,274 + `tpl006Assets/` | 1 / 861 | `drive-tpl006-story.js` 194 | — |
| rocket | `templates/rocket-school/` | `tpl007*` 5 / 8,417 + `tpl007Assets/` | 3 / 4,617 | 19 (`tpl007`, `rkt*`, `rocket`, `ply`) / 8,586 | `library/modules/game-kit` |
| todo | `templates/todo-list/` + `-demo/` + `.security.json` | `tpl008*` 4 / 5,650 | 3 / 1,491 (1 untracked) | 2 / 648 | 5 `nodegx-backend/tests/tpl008-*`; `phase-78…/todo-digitalbricks/` (provision, push, PWA) |
| planning | `templates/planning/` + `-demo/` + `.security.json` | `tpl010*` 5 / 10,454 | 1 / 2,144 | 7 / 2,196 (3 untracked) | `phase-78…/planning-digitalbricks/` |
| nightbook | `templates/nightbook/` (untracked) | `tpl011*` 10 / 6,788 (all untracked) | 5 / 1,026 (untracked) | — | `phase-78…/nightbook-desktop/` (untracked); `.github/workflows/nightbook-desktop.yml` (untracked); `library/modules/nightbook-kit` |
| **garden** | `templates/bot-garden/` | `cg00*`, `ig00*`, `iw00*` 13 / 12,827 + `cg007Assets/` | 15 / 13,543 (incl. `p108s2Join`, `p108s4Join`) | 18 / 10,209 (`cg`, `ig`, `iw`) | `phase-105…/garden-desktop/` (shell, build, drives, tests); `phase-105…/drives/`, `phase-108…/drives/`; `library/modules/garden-kit`, `garden-3d-kit`; `.github/workflows/garden-desktop.yml` |
| shared | — | `templatePins.ts` 176, `templateArtefact.ts` 168 | `helpers.ts`, `setupEnv.js` | `cdp.js`, `drive-deployed.js` | `scripts/devtools/make-worktree.sh:139-145` links the garden's build outputs |

Totals: about **71,800 lines of generator source and 35,200 lines of specs** in `packages/noodl-mcp/tests/`, against the
server's own `src/`. The audit's F34 figure (about 12k + 13 specs / 13,339 lines) is the garden alone and agrees, within
the two join specs I counted and it did not.

Other readings, all at HEAD:

| reading | where |
|---|---|
| The generators reach into the MCP package's source: 10 imports of `../src/server`, 2 of `../src/kitOverlay`, 1 each of `../src/editor-deps` and `../src/cloud/deploy`, and a type import from `../../noodl-editor/src/editor/src/io/ProjectExporter` | `grep "from '\.\./src"` over the generator modules; `cg003Template.ts:24-25` |
| Their jest needs `noodl-mcp`'s config: `ts-jest` with `diagnostics: false`, `setupFiles: tests/setupEnv.js` (turns the render off), `maxWorkers: 2`, and the `@nodegx/export` → `src` mapper | `packages/noodl-mcp/jest.config.js:1-22` |
| CI runs these specs only because they sit in `@noodl/mcp`: `test:packages` scopes by package, and `@noodl/mcp` is in its list | `git show HEAD:package.json` line 66; `pr.yml:228` |
| 🔴 **The shelf publisher counts every file under `templates/<dir>` and refuses a mismatch.** Anything placed inside a template's folder is uploaded with it, or breaks the count | `phase-78-the-templates/publish-templates-to-shelf.sh:69-80` (expected counts), `:102-112` (`find "$path" -type f`, then the refusal) |
| A deploy copies every file no `.noodlignore` rule excludes into the public site. One template already needed one to stop `backend/`, `tools/` and `hosting/` being served | `templates/digital-bricks-training/.noodlignore:1-9` |
| Paths that name `templates/bot-garden` directly: the desktop build's default, and the garden workflow | `garden-desktop/build-app.js:66`; `.github/workflows/garden-desktop.yml:117`, `:155-156` |
| `packages/noodl-mcp/tests/` is named in 140 task files (258 mentions) as the generator's home | `grep -rho "noodl-mcp/tests/[a-zA-Z0-9]*" dev-docs/tasks` |
| Only two outputs say where they come from: `planning-demo` names `npm run template:planning` and `packages/noodl-mcp/tests/tpl010Demo.ts`, and `todo-list-demo` names `npm run template:todo`. `todo-list` mentions "the generator's source" with no path. `bot-garden`, `rocket-school`, `members-area` and `landing-pages` name neither the command nor the file | `grep -rn -i "noodl-mcp\|template:\|generator" templates/*/docs/START-HERE.md`: `planning-demo/docs/START-HERE.md:13-15`, `todo-list-demo/docs/START-HERE.md:6`, `todo-list/docs/START-HERE.md:66` |
| `templates/digital-bricks-training/` has no generator at all; it is edited by hand under its own task series | `git log -- templates/digital-bricks-training` (`dbt-template/l183`) |

## 3. Where it bites

- **Finding the source.** `templates/rocket-school/docs/START-HERE.md` does not say the folder is generated, or by what. A
  hand edit there is lost at the next `npm run template:rocket`. The same holds for the garden, members and landing.
- **Every parallel lane.** P108 runs 3-4 lanes per session. Each lane touches the generator, the kit, the drives and the
  shell, which are four trees in four places, and every merge note lists them by path.
- **The MCP package carries a game.** `noodl-mcp`'s jest, CI time and type program include 72k lines of templates. Its
  typecheck gate (`typecheck:mcp`) goes red on a template's merge mistake (ISL-023's duplicate `ENGINE`).
- **Template-side notes (the audit's F36, F37; owned by P108, recorded here because they belong in the template's folder):**
  the 3D fallback persisted per profile pins a device to 2D; `Draw world`'s whitelist drops a new kind silently. Today
  these live in P108's README. In the template's own folder they would be found by the next person who changes it.

## 4. Related work and collisions

- **P108 session 5 is next and runs lanes** (`phase-108-the-island-works/NEXT-SESSION-PROMPT.md:1-30`). A move during
  open lanes turns every lane's diff into a rename conflict. This is the main cost (R3).
- **P91** owns the product desktop shell (DSK-008, DSK-011). `garden-desktop/` and `nightbook-desktop/` are forks that P91
  is expected to replace. Moving them here would be wasted work if P91 lands first; see R2.
- **ISL-023** builds a gate over the generators' files. It must read a list, not a path, so this move does not switch it off.
- **ISL-017** (the door installs a kit) and **ISL-019** (same plan, same bytes) remove the module copies and the pins
  (`templatePins.ts`, `templateArtefact.ts`) that every generator shares. If they land first, less code moves.
- **`make-worktree.sh:139-145`** links build outputs by path for the garden lanes, including the shell's `node_modules`.
- **A peer's uncommitted work** sits in exactly these trees today: `tpl007*`, `tpl008*`, `tpl010*` modified, `tpl011*`
  and `nightbook-desktop/` untracked, the root `package.json` replaced by a Nightbook manifest, and `package-lock.json`
  modified. A new workspace package changes `package-lock.json`.
- Owner grep: `grep -rln -i "move the generator\|template source of truth\|packages/templates\|templates-src" dev-docs/tasks`
  → no owner (two hits, both about a kit's own spec folder).

## 5. Design — 🔒 rulings first

These decisions come before any code, and none of them is a coding question.

1. 🔒 **R1 — Where does a template's source live?**
   - (a) **Leave it.** Add one `templates/<slug>/docs/HOW-THIS-IS-MADE.md` (generated) that names the generator, the
     command and the gates. Costs an hour. The MCP package keeps carrying 72k lines.
   - (b) **Inside the template's folder** (`templates/<slug>/src/`). The most findable. But the shelf publisher uploads
     every file there and refuses a count mismatch, and a deploy serves anything `.noodlignore` does not exclude. So every
     template would need both an ignore file and a changed count, and one missed rule ships the generator to families.
   - (c) **A sibling tree, one package:** `packages/nodegx-templates/<slug>/` (generator, specs, drives, notes), with the
     output staying in `templates/<slug>/`. The output's path does not change, so the shelf, the editor, the workflows and
     the desktop build are untouched. One jest config serves all ten.
   - (d) One package per template (`packages/template-<slug>/`). This is (c) with ten configs and ten `package.json`s.
   - **Recommendation: (c), with (a)'s generated pointer file added in the output folder.** The output path is the one
     every consumer reads, so it stays. The source moves once, to one place.
2. 🔒 **R2 — What moves?** Recommended: the generator modules, their specs, the template-only drives and the template's
   notes. **Not** the kits (they are published modules and belong in `library/modules/`). **Not** the desktop shells until
   P91 decides the product shell; they get a pointer instead. **Not** the shared drive tools (`cdp.js`,
   `drive-deployed.js`), which other phases use.
3. 🔒 **R3 — When, and in what order?** Recommended: **the garden first, alone, at a merge point with no lane open** (after
   P108 session 5 merges, or between sessions). Do it as one `git mv` commit with no content change, so `git log --follow`
   keeps the history. Then a second commit fixes the imports and config. The other nine templates move only when a session
   next touches each one, never as a sweep.

Constraints, after the rulings:
- The new package's jest config repeats `noodl-mcp`'s four settings (diagnostics, `setupEnv.js`, `maxWorkers: 2`, the
  `@nodegx/export` mapper). It imports the server through the package (`@noodl/mcp`, whose `main` is `src/index.ts`), not by
  a relative `../../noodl-mcp/src` path. `createServer` is already exported there (`packages/noodl-mcp/src/index.ts:6`);
  whether `kitOverlay`, `editor-deps` and `cloud/deploy` are is not checked, and adding what is missing is part of this task.
- `test:packages` gains the new package's scope **in the same commit**, or the gates stop running in CI with nothing red.
- `typecheck:mcp`'s twin for the new package is added to `pr.yml` (and ISL-023's local step reads the new paths).
- `scripts/generate-*-template.ts` keep their names and `npm run template:*` names. Only their import line changes.
- Old task files keep their old paths. They are records of where a thing was; a note in this task's §8 maps old to new.

## 6. Acceptance criteria (apply after R1–R3 are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** For each of the ten templates, a reading answers "from `templates/<slug>/`, can a person find the generator?" (does any file in the folder name the command or the source file). Known-firing control: the same reading finds `tpl010Demo.ts` in `templates/planning-demo/docs/START-HERE.md:15`. Expected at HEAD (§2): yes for the two demos, no for at least four, including the garden. |
| AC2 | **Byte-identical output.** After the garden moves, `npm run template:garden` writes a `templates/bot-garden/` that is byte-identical to the one before the move (a `find … -type f -exec shasum` over both, compared). Sabotage arm: change one word in a moved content file and the comparison names that one file. |
| AC3 | **No gate is lost.** The count of garden specs and tests run before the move (jest's `Tests:` line, read from a fresh JSON with its mtime) equals the count after, in the new package. `test:packages` runs the new scope: shown by a CI-equivalent local `lerna run test --scope <new>` reading the same count. A `Tests: 0` is a red. |
| AC4 | **Nothing ships.** `publish-templates-to-shelf.sh`'s expected file counts are unchanged, and a deploy of `templates/bot-garden/` serves no file from the source tree. Sabotage arm: copy one generator file into `templates/bot-garden/`, and the count check refuses it. |
| AC5 | **The lanes still work.** `make-worktree.sh` builds a worktree in which `template:garden` and one garden drive run. Record the paths it had to change. |
| AC6 | **The pointer.** Each moved template's output folder carries the generated pointer file (if R1 includes it), and the shelf counts are updated for it in the same commit, with the reason. |
| AC7 | **The notes go with it.** F36 and F37 (and P108 README §6's other two template follow-ups) are listed in the garden's new notes file with a link back, so the next person to touch the 3D kit or `Draw world` reads them there. |

## 7. Traps

- 🔴 **A gitignored or unscoped folder makes tests vanish, and the suite stays green.** AC3's count is the guard, not a
  green tick.
- 🔴 **`git mv` plus an edit in one commit loses rename detection on large files.** Move first, edit second.
- 🔴 **A peer's uncommitted edits sit in the trees this moves.** Before the move commit, check `git status` and file mtimes
  for every path it touches, and move only files that no other session has open. A pathspec commit can sweep a peer's
  unstaged edit.
- A worktree has no gitignored build output (`dist/`, the shell's `node_modules`). `make-worktree.sh` links them by path,
  and those paths change with the move.
- The shelf publisher's counts were "measured at 3206e12e5". Changing them without re-measuring is guessing.
- Do not move the desktop shells under P91's feet. A shell moved and then replaced is two migrations, not one.

## 8. Record

None yet.
