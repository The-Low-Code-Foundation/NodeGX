# Phase 96 — next session

Shaped per [PHASE-EXECUTION.md §3](../../guidelines/PHASE-EXECUTION.md): the board, the next task,
the end condition, the register.

## 1. The board (re-derived from the task FILES, 2026-09-19 after s4)

| task | state |
|---|---|
| FED-001 Parse XML / Parse Feed | ✅ **CLOSED (s1).** Six ACs green; bundle delta +14.8 KB gzipped vs a 50 KB budget |
| FED-002 Indexes a collection declares | ✅ **CLOSED (s2).** Seven ACs green; 40 specs; `EXPLAIN QUERY PLAN` names the index and 20k rows answer in 0.04 ms against a control's 8.92 ms |
| FED-003 A function calls a model | ✅ **CLOSED (s3).** Nine ACs green; 24 specs across two suites |
| FED-004 A schedule does not trip over itself | ✅ **CLOSED (s4).** Seven ACs green; 26 specs across three suites; `nodegx-backend` WHOLE at 149/149 suites / 1758 tests; `test:main` 504/504 suites / 8065 tests |
| FED-005 A backend speaks MCP | ⬜ never built |
| FED-006 The drive | ⬜ never built |

**All four rulings are in** (README §4). **Nothing is gated on a ruling.**

## 2. The next task to build

**FED-005 — a backend speaks MCP.** Nothing is outstanding from FED-004, and no register entry
carries `BLOCKS <AC>`: build it.

🔴 **Richard's ruling R3 in README §4 already settled how to treat its size:** *"Keep it here,
build it last."* ⚠️ Not to be confused with **register R3 below**, which is the `id` reserved-name
defect — the phase carries two R-numbering spaces, the RULINGS in README §4 and the REGISTER
here, and they are unrelated. It is the largest
task in the phase and the one with the widest blast radius — **a new auth surface** — and it
**stays liftable into phase 97 if it grows**. That is a decision you already have; you do not
need to re-ask it. What you do owe is saying, in the handoff, whether it grew.

**Read first, in this order:**

1. **FED-005 §3.3 — the one genuine design question in the task**, and it is about
   authorisation, not MCP: *whose rows does an API key see?* The task already picks option 1
   (`_ApiKey.actsAsUserId`, a key acting as one user for ACL purposes while rate limits and
   audit still name the key) and records option 2 as future work. Re-read it before writing
   anything: it is the half that can be got quietly wrong, because a key that sees too much
   passes every functional test there is.
2. **FED-005 §3.2 — `tools/list` is computed per request from the key's scopes.** That is the
   shape that makes the endpoint safe by construction rather than by a check, and it is also the
   shape that makes the MCP tool-surface budget a live concern (see R8 below).
3. 🔴 **FED-004 §5.1 decision 7, because FED-005 is its mirror.** The overlap policy guards the
   scheduler's fires and *nothing else* — a webhook, a manual fire and a db-change trigger all
   reach `dispatcher.fire` without passing it. FED-005 adds a **fourth** door into the same
   machinery. Ask, for each new entry point, which gates it passes and which it does not, and
   say so in the file rather than leaving it to be discovered.
4. **README §7 rule 5 does not apply unless FED-005 adds a node type.** It almost certainly does
   not: `/mcp` is a route, not a node. If it turns out to need one, the checklist is EIGHT steps,
   and FED-004 measured what the cheaper case — a new PORT on an existing type — actually costs
   (rule 5's new ✅ paragraph).

## 3. The phase's end condition

README §8: FED-006 green on a fresh backend with one `nodegx-backend` process and nothing beside
it, and Richard has ruled the execution record legible. Distance: FED-005, then FED-006.

⚠️ **FED-006 inherits three things by name:**

- **From FED-003 §5.5** — the model-cost sum is on the wire as JSON and deliberately **not**
  formatted, because §8's close condition is Richard ruling the record *legible*. Guessing the
  presentation before that ruling means building it twice.
- **From FED-004** — the feed poll FED-006 drives should carry `overlapPolicy` and `Conditional`
  explicitly rather than by default. The whole point of the drive is that a person can see the
  decisions; two of them are now sayable and a graph that says nothing takes both silently.
- **Register R7** — `noodl.cloud.modelrequest`'s enrichment lists no examples, and FED-006 is
  the worked example it should point at. A row to close there, not a defect to farm now.

## 4. The register

| | finding | owner |
|---|---|---|
| R1 | **A feed graph that wires only the parser's `Failure` hangs for the full function timeout when the FETCH is what failed** (CWF-018). Found by FED-001's drive suite: 30 s, then 504. Not a FED-001 defect — CWF-018 owns the missing function timeout — but it is the shape every feed graph will be drawn in. ✅ *s4 paid it forward again:* every fixture graph in all three FED-004 suites wires `Failure` beside the path it expects, and the reason is written at the top of each file. **FED-004 was also R1 seen from the other end** — a run that has not finished is the reason the next fire has something to trip over — and `overlapPolicy` is what makes that hang survivable rather than compounding | CWF-018 |
| R2 | The scoping session's `fast-xml-parser` figure was wrong at every version. Corrected in place in FED-001 §3.1. **No action.** | — |
| R4 | ✅ **RULED AND PAID, 2026-09-18.** A new node type owes `packages/noodl-mcp`, which neither a per-package run nor `test:main` sees. **Richard's ruling:** *"I'll likely convert all nodes to code export, so you can add them to the list of exportable ones to work on."* 🔴 **The wider reach is still P18's open question** — it makes the ledger's twelve remaining *"deliberately out of scope"* picker rows provisional, `Parse CSV` in particular. **Still not put to Richard.** ✅ *s4 confirms the floor again:* `noodl-mcp` at **7 suites / 8 tests**, the same seven names, `nodeDocBudget` still reding on **`Group` at exactly 14,315** — R4's own figure, unmoved by two new ports | P18 (the wider ruling) · the seven: unattributed |
| R3 | 🔴 **`id` is a reserved property name at the adapter layer, in three places and nowhere written down.** (a) never AUTO-created as a column; (b) cannot be CHANGED — `QueryBuilder.buildUpdate` deletes `data.id`, so a `PUT` with a new `id` answers **200 and writes nothing**. Both pinned as specs in `fed-002-indexes.test.ts`. **Does not block FED-006**, but **re-measure before FED-006 writes items into a collection it created on the fly.** ⚠️ FED-004's `_HttpCache` declares every column it uses, so it does not trip on (a) — which is evidence about declared tables, not about the defect | unowned — file against the adapter if FED-006 trips on it |
| R5 | ✅ **CLOSED 2026-09-18** by its owner (`opennoodl-ec`, P94/STY-003, at `13d60a921`) and this phase's snapshot commit. `test:main` has been 504/504 since. *Kept for its two attribution lessons: presence in `git status` is not authorship and neither is `git log`; mtime is.* | ✅ closed |
| R6 | **The `list_node_types` ratchet had 327 bytes of headroom left and nobody knew.** ~3,000 bytes were spent between FLD-013 and s3 by changes that each fitted underneath and therefore never had to say so — **which is the one thing a ratchet cannot catch**. Ceiling moved to 66,000 with the measurement in the docstring. **No action beyond awareness.** | — |
| R7 | **`docs/node-catalog/enrichment/noodl.cloud.modelrequest.json` lists no examples**, which `catalog:merge` warns about (`--require-coverage` still passes). Every other documented node carries one. **The natural home is FED-006** | FED-006 |
| R8 | 🔴 **NEW (s4) — R6's shape a second time, on a different ratchet.** The `noodl-mcp` **tool-surface** budget reads **8,274 tokens against 8,280 — six tokens of headroom.** Found while confirming R4's floor, not by a red. ✅ **It is not FED-004's:** a one-variable control (HEAD's `backendTools.ts` against this branch's, same listing) reads **8,274 both ways**, because only 20 tools are resident and the trigger tools are not among them. 🔴 **It is FED-005's problem directly:** §3.2 computes `tools/list` per request, and anything that grows the resident surface by a single description tips it. A session that finds itself a few tokens under a ratchet should read that as the surface needing a diet, not the ceiling needing a nudge — which is R6's own lesson, unlearned | FED-005 to watch; the ratchet itself unowned |

## 5. What s4 measured, including the run s3 explicitly asked for

- 🔴 **`nodegx-backend` WHOLE: 149/149 suites, 1758 passed, 10 skipped, 0 failed**, 506 s at
  `--maxWorkers=2` on a quiet box. This is the run s3 could not finish (three attempts: two
  straddled a peer's commit, one died at exit 144 on a load-40 box) and explicitly asked a later
  session to do. Nothing was suspected and nothing was found — the point is that the claim is now
  "the package" rather than "the eight most likely".
- **`test:main` 504/504 suites, 8065/8065 tests.**
- `noodl-runtime` **2833** · `noodl-viewer-cloud` **234** · `noodl-mcp` at R4's floor.
- `export-ledger:check`, `picker-coverage --check`, `catalog:merge:check`, `docs:nodes:check` all
  clean; CHR-007's snapshot regenerates to a **zero delta**.
- Two dashboard assertions **mutant-checked** rather than trusted (FED-004 §5.2).

### 🔴 A recorded trap that is WRONG, corrected in place

The shared harness notes said *"`npx jest` in `packages/nodegx-backend` NEVER TERMINATES — it sits
at 142 of 143 suites indefinitely"*, naming `tests/ac2-page-editor-drag-drive.test.ts`, and
concluded **"never a bare `npx jest` in that package"**. That advice is why the whole-package run
went undone for two sessions.

**Measured 2026-09-19:** the package runs **149/149 in 506 s** at `--maxWorkers=2`, and the named
straggler **passes standalone in 284 s** — eleven specs, all green. It is a real editor drive, and
284 s is what that costs. The rule of thumb attached to it ("no `Tests:` line after ~2 min is hung")
is simply the wrong threshold here.

⚠️ The original observation was probably still real, but the likely mechanism is **contention, not
a dead suite**: that spec drives a real editor, and a peer holding the CDP port would stall it
indefinitely. So: **check no peer is driving an editor, budget ten minutes, and run it.**

⚠️ **And the instrument nearly produced the opposite finding.** `timeout` does not exist on macOS:
`timeout 300 npx jest …` exits instantly with `command not found`, and a `| grep` swallows it —
which reads exactly like a hang. Use `time npx jest …` and read the duration.

**Nothing is outstanding.** No suite was skipped, no gate was waved at, and no defect was left
unfiled.
