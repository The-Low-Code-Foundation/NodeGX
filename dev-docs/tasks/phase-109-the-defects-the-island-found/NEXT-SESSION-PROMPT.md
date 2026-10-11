# Next session — P109 session 43

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 42 (2026-10-11, on `cline-dev`, primary tree):** board **38 of 52 closed** (34 before). ISL-039, ISL-040,
ISL-042 and ISL-047 closed; ISL-046 at 2 of 7. Every row was re-measured at HEAD first and red on the old code.

## The board (re-derived from the task files' `**Status` lines, s42)

| task | state | what is left | blocked on |
|---|---|---|---|
| ISL-046 templates & kits | 🟢 2 / 7 | D81, METERS3D (buildable); MOVEARROW, INSTALLER, TPL011UNREADID | see §8 of the task: a ruling, the tablets, P78's untracked Nightbook pile |
| ISL-043 export | ⬜ 8 bugs (2 high) | all | P18 is live in `nodegx-export` (uncommitted edits there today) |
| ISL-044 editor a11y | ⬜ 6 bugs | all | 1 ruling inside |
| ISL-045 node inputs | ⬜ 5 bugs | all | 3 rulings inside |
| ISL-007, 008, 009, 010, 018, 022, 024, 025, 035, 037 | 🟡/🟢/⬜ | as in s40's list (AC4 → IW-010; P18's export halves; llama.cpp; DBT AC7; ISL-022 AC6 needs the rebuilt dist; ISL-024 waits a gap in P108; W4–W22; handed to P18/P108) | outside this phase |

## Do, in this order

1. **Re-read the board yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`). Do not copy the table above.
2. **ISL-046 D81.** First measure whether a `JavaScriptFunction` re-runs when an input is set to the value it already
   holds (the picker's `''` → `''`). If it re-runs, the fix is in the script and must not wipe a pick when *another*
   input re-runs it. If it does not, the fix is a `Clear` signal the templates wire. Then regenerate the five templates
   and the library prefab with their own generators. Check P78's state first: `publish-templates-to-shelf.sh` and
   `DEFECTS-THE-TEMPLATES-FOUND.md` were uncommitted all of s42.
3. **ISL-046 METERS3D**, with `drive-iw007-touch.js --mode 3d` before and after.
4. **ISL-044, then ISL-045.** Ask their rulings at the end of the session, in plain words, with what you built beside them.
5. **ISL-043** only once P18 has no open edits in `packages/nodegx-export` (`git status`, then the mtimes).

## Human decisions owed

- **MOVEARROW (asked at the end of s42; if unanswered, ask again in plain words).** Planning is set aside (Richard,
  2026-10-05). Opening a project in it adds a "→ " to the project's stored next move every time. The todo list's
  Projects tab already repairs that text and does not have the bug. Fix the shelved planner now (half a day, it is not
  deployed anywhere), or close the bug until Planning comes back?
- 🔴 **The working copy's `package-lock.json` is a stale 2026-09-24 file.** It shows as modified by *removing*
  `@nodegx/node-spec`'s entries (`a9c10ff8c`). Committing it would break `npm ci` on Windows again. Nobody has touched it
  since 24 September. It wants restoring to HEAD, by its owner or on Richard's say-so. s42 left it alone.
- **`templates/nightbook/` is untracked**, with `library/modules/nightbook-kit/` and 14 `tpl011*` specs in
  `packages/noodl-mcp/tests/`. A P78 pile last worked on 2026-09-30. INSTALLER and TPL011UNREADID sit on it.
- **Still owed from s40/s41:** `P109-S36-STALEMCPDIST` (rebuild the people's MCP door; it gates ISL-022 AC6, and the
  shipped door's cloud bundler and kit extractor are now behind D84's fix), the `nodegx` bin rebuild, and s38/s39's
  list (`git show 223288e2e^:dev-docs/tasks/phase-109-the-defects-the-island-found/NEXT-SESSION-PROMPT.md`).

## What s42 built (commits)

- **ISL-040 ✅:**
  - SESSIONS `082802923`: a sign-in ends after 30 days unused (Sign-in page, `auth.json` `sessions.idleDays`). One
    `auth/sessions.ts` for five minting doors and three readers; fixed-end rows are not stretched; a restart gives old
    rows an end.
  - Found with it, `P109-S42-ENDEDREADS` (high): the access check and Verify Session Token never read `expiresAt`, so an
    ended session still read `/classes`.
  - DEVOPEN `bb34e8206`: *Enforce my rules on this machine* on Permissions. Driven in the served manager.
- **ISL-039 ✅:** KEYORDER's docs `5a2af3644` (data concept page and the Query Records / Record node reference).
- **ISL-042 ✅:**
  - SECRETSCAN `ac78efb4b`: the packaged backend passes its own scan; a spec bundles to a temp dir and runs it.
  - D84 `ba530fd11`: the cloud bundler and the kit extractor keep logs off their stdout answer. The 2026-09-26 pile was
    adopted.
  - SUCCESS `b978cf353`: a Cloud Function port the runtime can never mint (`success`) is refused.
  - BUNDLEWIRES `65394174a`: a bundle with on-disk wire spelling is refused at deploy; an undeclared helper port is
    named.
  - R10 `535bd63d0`: a cloud function's description reaches its MCP tool.
- **ISL-047 ✅:**
  - LOCKFILE `61694bc27`: canvas-look's lock entries, by hand on HEAD's lock; `npm run lockfile:check`.
  - DEVSWEEP + found `P109-S42-SHELLSEED` `d20dd013f`: a dev launch spares a hand-started backend, and the shell a
    suite runs in.
- **ISL-046:** BKFONT `4af47a07a`, DEMOSTUBWIRES `6d8323ef4`.

## Gate readings (2026-10-11)

- **Full `nodegx-backend`** (`-w 3`, without `ac2-page-editor-drag-drive`) at `61694bc27` + the s42 backend work:
  2961 / 2963 tests, 238 of 241 files (1 skipped). Red: s41's two, `bmg-002` past7 (SUNDAYWEEK, a Sunday) and
  `rel002b` (REL002B). The PostgreSQL suites ran (`brg-005-service-postgres` 3/3, conformance 20/20).
- Targeted, each after its change:
  - `tests/admin-app` + session specs: 244 / 244.
  - Deploy-touching backend suites: 686 passed.
  - FED-005: 34 / 34.
  - noodl-mcp template generators (sb005/6/7, tpl001/3, sbr010): 341 / 341.
  - hls013, isl017, cn004, packaging completeness: 22 / 22.
  - Editor unit specs on `nonexistentPort`: 143 / 143. DEF-002: 49 / 49. dev-tools: 19 / 19.
  - Kit suite `cg001`: 64 / 64.
- `tsc` (backend, admin app): exit 0. `typecheck:mcp`: exit 0. `catalog:merge --check`, `docs:nodes --check`: clean.

## What s42 learned (and where the handoff was wrong)

- **DEVOPEN's server half already existed.** `PUT /admin/permissions` writes `devOpen` live, with the public-bind
  refusal. The handoff asked for a new route and a reload. Only the page was missing.
- **SUCCESS's resolving half was DEF-002's already** (`connection-unknown-derived-port`, write path). A first version
  re-resolved it in `nonexistentPort`, and was cut as a second pipeline for one fact.
- **R10 belongs in the cloud bundle, not `exportComponent`.** That one also builds the public frontend, where a page's
  description would have shipped to every visitor.
- **D84 did not reproduce on its named fixture.** d40's load rewrites nothing, so it never logged. A format-4 project
  that the migration rewrites did reproduce it.
- **A dry list of the sweep named this session's own suite shell.** That became SHELLSEED. Run
  `dev:stop -- --list` while your own suite is live; it is a cheap census of what a peer's launch would kill.
- **A demo builder's own output is the control before regenerating.** HEAD's builder differed from the committed demo in
  one file (the template's later privacy text). That proved nothing hand-made would be lost.

## Recipes

- **Commit through a temporary index:** `GIT_INDEX_FILE=$(git rev-parse --git-dir)/index-x`, `read-tree HEAD`,
  `add -- <paths>`, commit, then `git reset -q -- <exact paths>` on the real index (exact paths, never a directory: a
  directory reset unstages a peer's staged file too). For a file holding a peer's hunks, or one whose working copy
  must stay as it is, build the blob (`git hash-object -w`) and `update-index --cacheinfo`.
- **The served manager from source:** `build:admin`, then a scratch `*.drive.ts` run with
  `npx jest --roots <scratch> --testMatch '**/*.drive.ts'` (jest has the module mapping). It writes a ready file and
  stops on a stop file. The bundle is `require`d at load, so restart the server after a rebuild. A `#hash` goto does not
  reload the page.
- **A child process from source:** `node packages/noodl-mcp/build-cloud-bundle.mjs <out>` and
  `build-kit-extract.mjs <out>`. Run the cloud bundler with cwd `packages/noodl-mcp` (it reads a `package.json`).
- **A corpus over real projects:** `grep -rlE '"type": ?"CloudFunction2"' --include=nodes.json` over `templates/` and
  `NodeGX test projects/`; six are legacy format and the door refuses them.

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged. The older ones are spent.
