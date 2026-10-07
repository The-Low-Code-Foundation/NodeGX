# Next session — P109 session 29

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 28 (2026-10-07, on `cline-dev`, `fb26f251d` … the handoff commit):** ISL-038 at **7 of 14** (C82 + C84 + C85, C94, C91,
C92 landed; C88, C90, C91, C92 ruled), **ISL-013 slice 1 landed** (`requires` + `Noodl.getModule` on every loader), and
`p109-d30` (D30 + COLLECTIONCHURN) **landed** on Richard's go (`32e1856b0`, `624facf73`: rebased, re-graded, fast-forwarded). The board is **22 of 37 closed** (re-derived from the status lines; ISL-031,
ISL-038 and ISL-013 moved, none closed). Records: ISL-038 §9, ISL-013 §8 "Session 28".

## How s28 worked, and why (read before touching a shared node)

- P107 was grading the Group while ISL-038's rows sat on the Group too. A runtime fix to a shared known row turns a peer's
  in-flight run red (`conformance.test.ts` fails a `row` scenario that passes, and the runtime target reads viewer source). So
  every fix was built in a worktree (`scripts/devtools/make-worktree.sh <name> HEAD /Users/richardosborne/vscode_projects`),
  rebased onto the peer's commit, graded there, and landed with `git merge --ff-only <branch>` in the primary tree after checking
  each landing path is clean (`git diff --name-only HEAD <branch>` → `git status --short -- <path>`). Three branches landed so;
  the hashes survive. The three worktrees were removed after landing; their branches remain.
- A control whose old code kills the process (C92's out of memory) needs its own run with `NODE_OPTIONS=--max-old-space-size=1536`.

## What s28 found that the handoff did not know

- 🔴 **The state file was stale** (s23, `6128c6b4c`): the folder prompt is the handoff, not `~/.claude/next-session-state`.
- **ISL-013's docs edit flipped two tripwires on purpose:** ISL-015's trap T6 was "pending ISL-013" and fails once a surface
  carries the route (now live on the docs page and the scaffold's README), and the docs-sample gate counts uncompiled blocks (a
  sample with `Noodl.defineModule(` compiles as complete).
- `P109-S1-CN004` (`noodl-mcp/tests/cn004.test.ts` "still errors under strict", 2 for 1) is red at HEAD before and after s28;
  filed, scheduled under ISL-034. Not a regression.
- The primary `noodl-mcp/dist/kit-extract.cjs` is older than `module-inject` and `kitExtract/entry.js` now; the server rebuilds
  it on the next bind (ISL-014 (b)), and running MCP servers keep the old reader until then.
- A peer has an untracked `library/modules/nightbook-kit/` in the primary tree; if it gains a `types/node-kit.d.ts` copy,
  `nodegx-kit-scaffold/tests/types-copy.test.js` grades it.

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (22) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027, 028, 029, 030, 032, 033 |
| 🟡 Track F, building | ISL-031 (20 of 23: left the Text's drag rows C77, C78, C79), ISL-038 (7 of 15: left the Group's C86–C90 and C95, the shared C81, C83) |
| 🟡 building | ISL-013 (slice 1 landed; left AC1's deployed drive, AC3's Settings → Kits, AC4 garden kits, AC5 job table, AC6 census) |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |
| ⬜ Track G, not started (added s28) | ISL-039 … ISL-047: 51 bugs no phase owned. Blockers in ISL-039, security rows in ISL-040 |

## Do, in this order

1. **ISL-038's Group rows**, now that P107's Group v2 is committed (`99d0d2353`): C95 (as ruled: a Focus off the page is
   Unchanged), C87 (empty Tag: `as || 'div'`), C89 (Native platform scroll read as a boolean), C88 (ruled: count the cards — a node names the element its children sit in, `slots` /
   `homeIndex` / `indexAt` / `openGap` use it), C90 (ruled: let the list's taps through the blocker), C86. Check `git status` and
   mtimes on `group.ts`, `Group.json`, `conformance.test.ts` first; P107 said it is done with shared files.
2. **C81 and C83** (shared drag / file drop, change the spec on Text, Shape, Image, Group: specs bump, `changes` entries).
3. **ISL-031's Text drag rows C77, C78, C79** (C79 is a known row on all four nodes).
4. **ISL-013 slice 2:** AC4 (garden-3d-kit `requires` garden-kit, drops its copy and the `__noodl_modules` walk; retire the pin
   gates by name; regenerate the kit copies and the template, byte-compare), AC5 (the job table's one home), AC6 (every shipped
   module's injection byte-identical: none declares `requires` today, so only the adopters move), AC3's Settings → Kits, AC1's
   deployed drive. The exporter's two bootstraps (`nodegx-export/src/parse/kitSource.ts`, `emit/kits.ts`) are P18's: hand over.
5. Then ISL-018 AC5, ISL-012 AC3.
6. **Track G (ISL-039 … ISL-047, README §4):** written from the ledger, not re-measured. Its blockers (ISL-039: a restore that
   loses data, a migrate that overwrites it) and security rows (ISL-040) outrank items 3–5 by severity: ask Richard which comes
   first. Most of it sits in packages P104 (backend) and P18 (export) are working in; each task's §6 says whom to ask.
   P107-C96, C97, C98 (the Video) were left out while a P107 session filed them; take them when P107 hands them over.

## Decisions for Richard (not yours)

- **Layout of an unlabelled control (s26, measured in jsdom only)** — a real-browser check on a form template before a release.
- `P109-S24-SIGNINWITHERRORKEPT`, `P109-S22-BUILTINBOUNDARY` (recommendation: yes), `P109-S20-LISTDEFAULTTYPE`,
  `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`, publishing the Garden kits at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export):** ISL-013's `getModule` is not on the exporter's two kit bootstraps; C82/C84/C85/C91/C92/C94 were not checked
  on the exported app. Plus s26's and earlier lists (STATESRUN, FEEDZONE, BADBODY, …).
- **P107:** C95 (a Focus on a Group off the page) stays P107's unless R16's reading puts it here.
- **Release notes, add (s28):** a wired number in Accepted file types, Accept Kind, Drag Kind or Zone Name no longer stops a drop
  or a drag; an Image placed with Source Set true fetches nothing; a card dropped on a Custom SVG Shape lands at 0; a Shape's
  Points stops at 500 (Infinity or a non-number draws 5); a kit can `require` another kit and read it with `Noodl.getModule`.
  A control leaving the page (Mounted off) fires Blurred and Hover End for what was on. A Record holding a list no longer
  fires Changed when a Fetch reads the same list again.

## Gate readings taken s28 (2026-10-07)

- **ISL-038** (graded on `90b39eaa2`, landed rebased as `f2d9d349b`…`4a48f6eb7` over a docs-only commit): runtime target,
  `NSP_ONLY=Text,Circle,Image,Group`, seeds 13 and 20732: all four conform (0 divergences, every unkilled mutant declared),
  "known rows still open" green. Interpreter visual batch 13 / 13. Spec catalog-parity + schema 329 / 329. Viewer 1802 / 1802.
  Control A red on exactly the row scenarios; control B (base Circle.tsx) out of memory, exit 134.
- **ISL-013** (`9fd1b12a7`): module-inject 40 / 40, viewer 1807 / 1807, viewer-cloud 264 / 264, kit types 116 / 116, scaffold
  76 / 76, editor `tests-unit/cn-001` 6 / 6, editor tsc 0, the MCP kit suites 86 / 87 (the one red is `P109-S1-CN004`, red at
  the base too). Control: the base loader files red on all 9 reader and SSR arms.
- **p109-d30** (rebased onto `088579843`): catalog / merge / docs:nodes / cloud-library clean; spec and viewer tsc 0; stranger rounds 1–4, catalog
  parity, schema, pilot, page model, plants and world 483 passed (18 skipped); interpreter visual batch 13 / 13; viewer 1807 / 1807;
  the churn test with the backends and record suites 422 / 422; the six controls conform on the runtime at seed 13 (0 divergences).
- `bugs.js check`: 5 problems, none from s28's rows.

## Recipes

- **A CAS commit:** `GIT_INDEX_FILE=<tmp>`, `git read-tree HEAD`, `git add` the paths (or `update-index --cacheinfo` a
  blob built from `git show HEAD:<path>` + your edit, for a file with a peer's open edit), check the staged count,
  `commit-tree`, `update-ref HEAD NEW BASE`, then **reset each committed path in the real index**
  (`git diff --name-only BASE NEW | while read f; do git reset -q -- "$f"; done`).
- **Dropping a known row:** run the spec with the row still listed first (its scenarios should read "passed" and the
  attribution 0), then remove the row and its predicate from BOTH the working `conformance.test.ts` and a copy of HEAD's, diff
  the two (the peer's lines must be all that differs), commit the HEAD copy. Unmark the row scenarios in the same commit.
- **A control:** back up each file by name (`cp $f $S/${f:t}`), `git show HEAD:$f > $f`, run, restore in the same command
  and `cmp`. With zsh, put paths in an array.
- **Splitting one file's hunks across commits:** replay `git diff -U0` hunks from HEAD by stage (s26's `stages.py` idea:
  assign each hunk by a keyword, assert the full replay equals the working file).
