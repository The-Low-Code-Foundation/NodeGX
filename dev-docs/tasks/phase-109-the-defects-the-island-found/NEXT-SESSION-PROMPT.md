# Next session — P109 session 42

**Phase:** [README](README.md) · **Audit:** [AUDIT-2026-10-01.md](AUDIT-2026-10-01.md) · scoped at `27d891bf3`.
**Session 41 (2026-10-10 → 11, on `cline-dev`, primary tree):** board **34 of 52 closed** (33 before). s41 started Track
G, which s38–s40 had called "waiting on Richard's order". It was not waiting: README marks ISL-041, 042, 043, 046 and
047 as needing no ruling, and ISL-039/040 need one only on some rows. 14 ledger rows were fixed or closed, each
re-measured first and red on the old code.

## The board (re-derived from the task files' `**Status` lines, s41)

| task | state | what is left | blocked on |
|---|---|---|---|
| ISL-039 backend data | 🟢 7 / 8 | KEYORDER | **ruling** (below) |
| ISL-040 backend access | 🟢 3 / 6 | **DEVOPEN (buildable)**; LOCKOUT half 2, SESSIONS, MCPOAUTH | rulings for three |
| ISL-042 cloud function deploys | ⬜ 5 bugs (3 high) | all | nothing (read §6 for collisions) |
| ISL-046 templates & kits | ⬜ 7 bugs (2 high) | all | nothing (P108/P78 collisions in §6) |
| ISL-047 repo install / dev stack | ⬜ 2 bugs (1 high) | all | nothing |
| ISL-043 export | ⬜ 8 bugs (2 high) | all | P18 is live in `nodegx-export` (§6) |
| ISL-044 editor a11y | ⬜ 6 bugs | all | 1 ruling inside |
| ISL-045 node inputs | ⬜ 5 bugs | all | 3 rulings inside |
| ISL-007, 008, 009, 010, 018, 022, 024, 025, 035, 037 | 🟡/🟢/⬜ | as in s40's list (AC4 → IW-010; P18's export halves; llama.cpp; DBT AC7; ISL-022 AC6 needs the rebuilt dist; ISL-024 waits a gap in P108; W4–W22; handed to P18/P108) | outside this phase |

## Do, in this order

1. **Re-read the board yourself** (`grep -m1 '^\*\*Status' ISL-0*.md`). For each open row, grep its §8 for "not built" /
   "not filed". Do not copy the table above.
2. **ISL-040 DEVOPEN.** A switch on the manager's Permissions page (*Enforce my rules on this machine*) and an admin
   route that writes `devOpen` and reloads `SecurityState` (the restore path's `reloadConfig`). Point the three
   sentences at it (`App.tsx` `DevOpenNotice`, `views/keys.tsx`, `views/permissions.tsx`). It needs a drive in the
   served manager. P104 last worked on 2026-09-26 and is not building it.
3. **ISL-042, then ISL-047, then ISL-046.** Each one: re-measure every row first, red before the fix, one commit per
   row.
4. Ask the rulings below at the END of the session, with what you built beside them.

## Rulings owed to Richard (asked in plain words at the end of s41; record the answers in the task files)

- **KEYORDER (ISL-039):** an Object field's keys come back in a different order on PostgreSQL, measured s41:
  `{zebra, apple, mid:{y,b}, a}` → `{a, mid:{b,y}, apple, zebra}`. SQLite keeps the order.
- **LOCKOUT half 2 (ISL-040):** after ten wrong tries from one address, should a RIGHT token from that address get in?
- **SESSIONS (ISL-040):** a sign-in session never expires.
- **MCPOAUTH (ISL-040):** OAuth on a backend's MCP door, so Claude on the web or a phone can connect. Is that P109 or
  a FED phase?
- Still carried from s40: `P109-S36-STALEMCPDIST` (rebuild the people's MCP door; it gates ISL-022 AC6), the `nodegx`
  bin rebuild, and s38/s39's list (in s40's handoff, `git show 223288e2e^:dev-docs/tasks/phase-109-the-defects-the-island-found/NEXT-SESSION-PROMPT.md`).

## What s41 built (commits)

- **ISL-039:**
  - BACKUP `dc4e0b51a`: the archive carries every settings file and `workflow-defs/`, and the manifest lists its
    `folders`.
  - MIGRATE `2deb380d0`: a first run refuses a target holding rows, and a refused run leaks no snapshot.
  - NOACL `f8574d6f7`: zero changed rows is "Object not found" with no ACL too. There is a contract case and a
    mutation for it.
  - ARRAYEQ + PTREQ `5bfb23cf4`.
  - ADDUNIQUE `421cfc5a6`.
  - NUL `3e18ea4cc`.
- **ISL-040:**
  - USERCOLS `6719e4a89`: `/classes/_User` and `/api/_User` refuse the admin-only columns and `password`, for every
    principal.
  - UNRULED `89b9fd339`: SB-016 on deploy and reload. The 409 also carries `success:false`.
  - LOCKOUT half `f5f65a122`.
- **ISL-041:** TYPECHANGE `e9f576618`, LASTINDEX `776125dba`, DIALECTTEST `b2b956e6b`. RENAME was closed against P116's
  `78ec0ed69`.
- **Filed:** `P109-S41-SUNDAYWEEK`. A "past 7 days" filter read back on a Sunday comes back as "this week", and
  `bmg-002`'s past7 case is red every Sunday.

## Gate readings (2026-10-11)

- **`nodegx-backend` full run** (`-w 3`, without the hanging drive `P116-S13-AC2STALL` and a peer's two untracked P116
  specs): 227 / 229 files. Red:
  - `rel002b` (`P116-S13-REL002B`, red with the old adapters too, measured).
  - `bmg-002`'s past7 case (SUNDAYWEEK).
- Every later fix ran its targeted set:
  - `_User` / BYOB specs: 52 / 53 (only the past7 case red).
  - Deploy and reload specs: 92 / 92.
  - Lockout specs: 253 / 253.
  - Retype specs: 91 / 91.
  - Promotion specs: 55 / 55.
- Conformance: SQLite 29 / 29 (the four BRG-003 files), PostgreSQL 85 / 85. `noodl-runtime` `test/adapters`:
  331 / 331. `tsc -p packages/nodegx-backend --noEmit`: exit 0.

## What s41 learned

- **"Waits on Richard's order" was a blocker nobody re-read.** The README's own 🔒 column said five Track G tasks need
  no ruling. Read the column, not the handoff's sentence.
- **Plain `grep` cannot read `packages/nodegx-backend/src/server/HttpServer.ts`.** It is treated as binary, so
  `grep -rn` finds nothing in it. Use `grep -a`. Two of s41's searches came back empty because of it before the
  route table turned up.
- **A refusal has to reach the client in the field the client reads.** The editor's and the MCP door's deploy clients
  read `success === false` and ignore the status, so a bare 409 would have told an agent a refused deploy worked.
- **A ledger's proposed fix can undo the thing it sits behind.** LOCKOUT proposed letting a right credential through
  a lockout, which turns the speed bump into an answer key. Build the safe half and ask about the other.
- **A green that rests on another arm's leftovers is not a green.** USERCOLS's "the attack does not land" passed on
  the old code because an earlier arm had disabled the same account. Each attack gets its own account and a
  known-firing control beside it.
- **Changing what `$eq` means moved a client that depended on the old meaning** (the admin's "list is empty" compared
  JSON text). The full backend suite found it, a targeted run would not have. Run the full suite after a
  query-builder change.

## Recipes

- **Commit through a temporary index:** `GIT_INDEX_FILE=$(git rev-parse --git-dir)/index-x`, `read-tree HEAD`,
  `add -- <paths>`, commit, then `git reset -q -- <paths>` on the real index.
- **A control without touching git:** copy your file to the scratchpad, `git show HEAD:<path> > <path>`, run, copy
  yours back, `cmp`.
- **PostgreSQL:** `postgres:///nodegx_brg005` answers here. The BRG-004/005 suites make their own databases.
- **A cloud function's request** is `x-parse-master-key: <adminToken>`. With `authToken: 't0k'` that is `t0k`.

## Worktrees

`p109-isl049` (branch `p109-isl052`) is unchanged. The older ones are spent.
