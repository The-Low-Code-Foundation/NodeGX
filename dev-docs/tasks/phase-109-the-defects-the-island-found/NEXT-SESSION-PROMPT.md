# Next session — P109 session 25

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 24 (2026-10-06, on `cline-dev`, `225542f5b` … the handoff commit):** **ISL-029 closed (12 of 12)** and
**ISL-030 closed (18 of 18)**, 21 fix commits, each with a control (HEAD's runtime file red on exactly the rows it should
be). The board is **20 of 37 closed**, re-derived from the task files' status lines.

## What s24 found that s23's handoff did not know

- 🔴 **D24 was a security row.** On a real `nodegx-backend` under `backendServices` with no endpoint, an Owner access rule
  was silently dropped: with the collection's creator-owns off, a second signed-in user read the record. Fixed
  (`225542f5b`): the access rules ask the record's own backend who is signed in. The probe method is in ISL-029 §10.
- **No ISL-030 row was a known row.** The task's §5 said the conformance table re-measures each row; it holds none of
  them. The CONTROLS re-measured. Expect the same for ISL-031 … 033: read each spec's "ROWS" / "NOT GRADED" block first.
- 🔴 **The world can hide a runtime half.** The runtime target answers auth calls with the world's adapter model, so a fix
  in `RestAuthAdapter` (D23) left the spec's control GREEN. Grade such a half with a unit test on the real adapter
  (`test/backends/rest-auth-adapter.test.ts`). The world also plays only REST backends: a Parse-wire half needs its own
  test (C45 → `noodl-viewer-react/tests/isl-030-the-page-load-check.test.ts`; D24 → `isl-029-access-rules-…`).
- 🔴 **A control chained after a jest that hangs is never restored.** D23's red run skipped `adapter.dispose()`, a timer
  kept jest alive, and the `cp` back never ran — while a peer's conformance chain was starting. Run the restore as its
  OWN step; `--forceExit` on control runs; dispose in `finally`.
- **Two files with one basename** (`agent/sse.ts`, `nodes/sse.ts`): a backup by basename overwrote one with the other.
  Back up by full path.
- **Index drift:** a temp-index commit leaves the PRIMARY index on the old blobs; `git reset -q -- <paths>` after every
  `update-ref`, or `git diff` shows your committed lines as still to commit.
- **Guarded spec files** (`world.ts`, `spec.ts`, `canonical.ts`, `adapter.ts`): any edit → `node -e
  "require('./tests/stranger-suite-hashes.helper.js').write()"` in `nodegx-node-spec`, `npx jest tests/stranger.test.ts`,
  hashes in the same commit. Done five times s24.
- **The viewer typechecks against `noodl-runtime/dist-types`** (gitignored): a new runtime export needs
  `npm run build:types` in `noodl-runtime` before the viewer's tsc sees it.
- **Scenario JSON files are not all one format:** some `json.dumps(indent=2)`, some compact, some `\u`-escaped. Check
  `raw == json.dumps(json.loads(raw), indent=2, ensure_ascii=False) + '\n'` before a load/dump; otherwise edit as text.
- **C52's ruling card and its recommendation differ** (the card: "show the stored name whole"; the recommendation it
  accepted: "the prefix rule only on the Parse wire"). Built as the recommendation; said so in the commit and §9.
- **A scenario whose reconnect came from a same-value write** lost what it graded when C55 landed: reworked to make a
  real change rather than only renamed. Names that went false: renamed (eight this session).

## The board (re-derive it from each task file's status line; never copy this table)

| state | tasks |
|---|---|
| ✅ closed (20) | ISL-001, 002, 003, 004, 005, 006, 011, 014, 015, 016, 017, 019, 020, 021, 023, 026, 027, 028, 029, 030 |
| 🟡 ruled, one reading owed | ISL-012 (AC3's full server render with hydration) · ISL-018 (AC5: the agent round) |
| 🟢 ruled, not built | ISL-013 ("A kit says what it needs") · ISL-024 ("Own package + a note", quiet gap only) |
| 🟡 built here, one half elsewhere | ISL-008 (AC7 → P18) · ISL-010 (AC4, Richard) · ISL-009 (export → P18) · ISL-007 (AC4 → P108) |
| 🟡 one case open | ISL-022 (AC6 inconclusive) · ISL-025 (the closing task) |
| ⬜ Track F, ruled, buildable | ISL-031 (15 — P107 NSP-023 closed at `c5fa21cc2`, so no longer blocked) · ISL-032 (17) · ISL-033 (5) |
| ⬜ Track F, no rulings | ISL-034 … ISL-037 |

## Do, in this order

1. **The closing gates s24 could not run** (a peer's 10,000-sequence chain held the box): the runtime jest without the
   conformance file, the viewer's whole suite, and every spec touched by s24 at seed 20732 — records (Create, Update,
   Query Records), HTTP, User family, Sign File URL, Upload File, Cloud File, Open File Picker, Subscribe To Changes, SSE,
   Cloud Function — in groups. Read §"Gate readings" below for what WAS run.
2. **ISL-032** (17 rows) then **ISL-033** (5), then **ISL-031** (15). Same method: each spec's "ROWS"/"NOT GRADED" block
   first; red first; one commit per ruling with a control; ledger closed in a batched docs commit.
3. **`P109-S22-COLLECTIONCHURN`** (low, open).
4. ISL-013 build; ISL-018 AC5; ISL-012 AC3.

## Decisions for Richard (not yours)

- `P109-S24-SIGNINWITHERRORKEPT` (new) — Sign In With clears Error the way D25 used to (to nothing); probably unreachable
  (one return per page load). Change it to blank text, or close it?
- `P109-S22-BUILTINBOUNDARY` — built-in nodes get the kit nodes' error boundary? Recommendation: yes.
- `P109-S20-LISTDEFAULTTYPE`, `P109-S18-REFRESHROWSTATE`, ISL-010 AC4 and the Effort port, pushing `cline-dev`,
  publishing the Garden kits at the origin.

## Handed over (owed by another phase; say so where you meet it)

- **P18 (export):** `P109-S24-EXPORTBADBODY` filed (D11's twin: the exported HTTP Request reports an unreadable JSON body
  as `http/network-error`). Not checked for the export: D24 (does an exported access rule read the record's own
  backend?), the rest of ISL-030 (C7 is fine there — it reads `auth-authToken`; D12 n/a — Cancel defers; C47 probably
  clears through React state). Plus s23's and earlier lists.
- **P107:** `node-spec-target.ts` (P107's open edit) — its `installUser` docblock still says the access rules read the
  legacy store; the code needs no change. Correct the sentence when the file is free.
- **Release notes, add (s24):** an Owner access rule works on a NodeGX backend configured under Backend Services (it was
  dropped); on Directus / PocketBase the "ACL ignored" warning appears again. HTTP Request: Authentication sends the
  credential; an unreadable JSON body fails as `http/bad-body`; Cancel stops every request. Sign-in: a backend blip at
  page load keeps the person signed in and says nothing; an expired session says Session Lost once; after sign-out the
  User node's Id / Email / Username go blank and Roles / properties empty; a cancelled provider sign-in fails once.
  Files: Error Status Code is the real HTTP status (an app that checked 119 checks 403); Error is always a sentence;
  Cloud File's Name is the uploaded name; Sign File URL clears Expires At / TTL for a public link; Open File Picker's
  cleared Capture no longer opens the camera. Set User Properties refuses a Username on Directus / PocketBase. Streams:
  Subscribe To Changes and Query Records' realtime ignore repeated values; SSE's status outputs stay current and it says
  idle after a URL change with Auto Connect off. Cloud Function's Error is always text. Request Magic Link clears Error.

## Gate readings taken s24 (2026-10-06)

- **Per fix:** its specs at seeds 20732 and 13 conform with 0 divergences, every mutant killed but the declared
  equivalents; its control red on exactly its rows. Numbers in each commit and each task's §9 / §10.
- After D24: runtime jest without the conformance file 3174 passed, 0 failed; viewer 1772 / 1772; graph 87 → 89.
- After C47, C55, D23, C52: graph 89 / 89 (twice each time it moved); spec subset (records batch, catalog parity, graph,
  world, schema) 558 → 611 with the canonical tests; stranger rounds 46 passed after each guarded edit; runtime and spec
  and viewer tsc 0; `bugs.js check` 5 problems, none P109's.
- **Not run after the last fixes:** the whole runtime and viewer suites (see Do 1), the editor, the stranger 10,000 runs.

## Recipes

- **A CAS commit:** `GIT_INDEX_FILE=<tmp>`, `git read-tree HEAD`, `git add` the paths (or `update-index --cacheinfo` a
  blob built from `git show HEAD:<path>` + your edit, for a file with a peer's open edit), check the staged count,
  `commit-tree`, `update-ref HEAD NEW BASE`, then **`git reset -q -- <paths>`**.
- **A control:** back up by FULL path, `git show HEAD:<path> > <path>`, run with `--forceExit` to a file, then restore
  in a SEPARATE command and `cmp`. Never while a peer's run that loads that package is starting; a peer's
  interpreter-only step (`nodegx-node-spec/tests/…`) does not load the runtime.
- **Closing a ledger row:** status fixed, `commit:`, `kit: node-spec`, `regression:`, and a "Fixed <sha>" paragraph —
  s24's helper was a 20-line python script (regex on the header); rebuild it.
