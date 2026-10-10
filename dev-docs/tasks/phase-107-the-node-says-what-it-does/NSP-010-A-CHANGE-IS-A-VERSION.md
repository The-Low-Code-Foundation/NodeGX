# NSP-010 — A behaviour change is a version, a trace diff, and a migration answer

**Opened 2026-09-29.** **Depends on NSP-009.**
**Status: ✅ s78 — all four ACs (§5).**

## 1. The person sentence

> **When a node starts behaving differently, it is on purpose, it is visible in the diff as
> before-and-after traces, and someone has decided what happens to apps built on the old
> behaviour.**

## 2. What to build

- **Golden traces**: for every specced node, the hand scenarios' traces are committed as JSON.
- **The version rule**: if any golden trace changes, the spec's `version` must go up **in the same
  commit**. A gate compares the golden traces against the previous commit's and fails a changed
  trace with an unchanged version.
- **The migration answer**: a version bump requires a `changes` entry in the spec with one of:
  *no migration (why)*, *project migration (its id)*, or *compatibility parameter (its name)* —
  the last is what Counter already has in *Treat Unchanged as*.
- **The retrofit**: Counter's FH-022 Reset change recorded as the first history entry, with the
  before/after traces, so the mechanism is proven on a real case.

## 3. Acceptance criteria

1. Changing a reducer branch in a spec without bumping `version` fails the gate (planted, shown).
2. Bumping `version` without a `changes` entry fails.
3. The Counter retrofit is present, and its before-trace reproduces on the runtime at the commit
   before FH-022 slice 3 (read with `git show <sha>:<path>` into a temp file, never checked out).
4. The golden-trace diff renders as a readable table in the PR (value / signal / outcome columns),
   not raw JSON.

## 4. Watch for

- Memory: *a rename of a built-in port ships no migration.* A port rename is a behaviour change to
  every saved project; the version gate must treat a port rename as one.
- Memory: *an on-load migration owes its own save.* If an answer is *project migration*, that
  migration's task owns the save; this task only records the answer.

- **Two holes a stranger measured (s16, round 3b — [NSP-006 §5.8](NSP-006-A-STRANGERS-TARGET.md)).** Three specs
  are now v2 by a ruling (Boolean To String s12, Animate To Value and States s16), and each change note is a
  comment above `version:` — the format has no field for it, and a scenario says which version it pins only in its
  name. A target cannot say which version it implements, so an out-of-date one reads as trace differences, not as
  "v1 target, v2 spec". And no mutant encodes the previous version (Animate To Value's count stayed 25), so
  mutation grades nothing about a change. This task's gate is where both belong.

## 5. Built (s78, 2026-10-10)

### 5.1 What is there

| piece | where |
|---|---|
| `changes?: Change[]` on a spec — `{ version, says, row?, commit?, migration }`, the migration exactly one of `{ none: why }`, `{ project: id }`, `{ parameter: name }` | `packages/nodegx-node-spec/src/spec.ts` (`Change`, `Migration`) |
| The golden traces: every spec's hand scenarios played on the interpreter, one file per spec, **108 specs, 9,204 scenarios, 18 MB**, one scenario per line so a PR diff shows only the scenarios that moved. Each scenario carries a hash of what it PLAYS (params, steps, world, wired) | `packages/nodegx-node-spec/golden/<type>.json` |
| The rule, the history's shape, the diff table | `src/runner/golden.ts` (`goldenOf`, `goldenChange`, `versionProblems`, `changesProblems`, `formatGoldenChange`), exported from the Node entry only — nothing in a page needs it, so the browser bundle does not grow |
| The CLI: write / `--check [--base <ref>]` / `--diff [--base <ref>]` / `--type` | `scripts/node-spec/golden.js`; `npm run spec-golden`, `npm run spec-golden:check` |
| The PR gate: after `spec-ledger:check`, `--base` the PR's base (or the commit before a push), fetched first because the checkout is shallow. An unreadable base is exit 1, never a pass | `.github/workflows/pr.yml` (node-catalog job) |
| Counter's history: FH-022 slice 3 as its first entry, the before / after traces | `src/nodes/counter.ts` `changes`; `golden/changes/Counter@1.json` |

**What the rule counts as a change.** A scenario that plays the SAME input and traces differently; a port added, removed
or renamed (§4's port-rename hazard — the port names are in the golden file, so a rename moves it even when no trace
names the port). **What it does not:** a scenario added, removed or renamed (no before, or no after), and a scenario whose
params or steps were edited (its input hash moved). A version bumped with no trace moved passes the rule — it is a
change no scenario shows yet; the stranger's hole below is about exactly that.

**The existing histories stay comments.** 62 specs are above v1 with their change notes written as comments above
`version:` (Page Stack's 18). The rule starts from the version each spec has at the base, so those owe nothing; a
retrofit would have to invent a migration answer for each, and those were rulings to fix the runtime, not decisions
about saved apps. Every version from now on needs its entry.

**Determinism:** `--check` gives the same files under `TZ=America/New_York LC_ALL=de_DE.UTF-8` and under `TZ=UTC LC_ALL=C`
(the gate runs on Linux in CI). The whole check is about 6 s.

### 5.2 The ACs

1. **AC1 — a changed reducer at an unchanged version fails** (`tests/golden.test.ts`). The plant is Counter's Reset put back
   to its pre-FH-022 self (every Reset Done and a Count Changed pulse): it moves exactly the two Reset scenarios, and the rule
   says `Counter: behaviour changed at version 1 — "the NSP-001 script: …"; "Reset when already at Start Value: …". Bump
   \`version\` and add its \`changes\` entry`. Control: today's Counter against the same file, no problems. Bumped to v2 with its
   entry, the same change passes. Also shown through the CLI against the commit (§5.3).
2. **AC2 — a bumped version without an entry fails**, with the traces moved and with nothing moved; two versions at once owe
   two entries; a version that falls fails; a spec new at the base owes nothing.
3. **AC3 — Counter's retrofit.** FH-022 slice 3 (`328a025dc`) came before the spec, so the entry is `version: 1` — the change
   that made the behaviour v1 describes — with `commit: '328a025dc'` and the migration answer `none` (the old pulse said the
   count moved when it had not; Counter has no *Treat Unchanged As* to keep it — the commit found §2's premise wrong: counter.ts
   spreads `outcomeOutputs`, never `outcomeInputs`; and the change shipped alone so one revert brings it back). The before-traces
   are REPRODUCED by `packages/noodl-runtime/test/node-spec/nsp-010-counter-history.test.ts`: `git show 328a025dc^:…/counter.ts`,
   compiled in memory (conformance.test.ts's `copyOfCounterWith` pattern — never checked out, nothing written to the tree),
   registered on a fresh runtime target. Of Counter's 7 hand scenarios, 2 moved, and the old runtime's traces equal the file's
   `before`; the `after`s equal today's golden file. A shallow CI clone skips that one test by name (`CI` set and the commit
   absent); anywhere else a missing commit fails.
4. **AC4 — the diff reads as a table.** `golden.js --diff` (or `formatGoldenChange`): per node the version line and each new
   entry with its migration, then per moved scenario a row per frame — stimulus, value, signal, outcome (and a world column
   when a frame made a request) — the moved frames marked ●, `~~before~~ → **after**` in the cells that changed. Counter's
   history rendered:

**Reset when already at Start Value: unchanged, Count Changed silent**

|  | frame | stimulus | value | signal | outcome |
|---|---|---|---|---|---|
|  | 1 | startValue ← 3 | currentCount=3 | countChanged |  |
| ● | 2 | ▶ reset |  | ~~countChanged~~ → **(none)** | ~~reset: done~~ → **reset: unchanged** |

### 5.3 Gates (s78)

- **The CLI plants, against the commit `36e08e29e`** (`counter.ts` copied to the scratchpad first, restored after, `--check`
  exit 0 again and the tree clean): (a) Reset's unchanged arm turned to `done`, golden NOT rewritten → exit 1, two lines: the
  golden file is stale, and behaviour changed at version 1; (b) Reset put back to its pre-FH-022 self and the golden file
  rewritten, version 1 → exit 1, `Counter: behaviour changed at version 1 — "the NSP-001 script: …"; "Reset when already at
  Start Value: …"`; (c) the same at version 2 with no entry → exit 1, `Counter: version 2 has no \`changes\` entry — say what
  changed and what happens to apps built on v1`, and `--diff` rendered the two tables.
- `npm run spec-golden:check`: 108 specs, 9,204 scenarios fresh, exit 0 (also under two other time zones and locales). An
  unreadable `--base` exits 1.
- node-spec `tests/golden.test.ts` 22 / 22; `tsc --noEmit` (node-spec) 0; `tsc -p packages/noodl-editor --noEmit` 0.
- **Stranger suite** (spec.ts and counter.ts are guarded; hashes rewritten): 46 passed, 18 skipped, exit 0, 440 s.
- noodl-runtime, `NSP_ONLY=Counter`: `conformance.test.ts` + `runtime-target.test.ts` + `nsp-010-counter-history.test.ts`:
  24 passed, 1 skipped (Counter at 0: the deep run), exit 0.
- `catalog:check`, `catalog:merge:check`, `docs:nodes:check`, `spec-ledger:check` exit 0.
- Not run: the full node-spec suite, the full runtime conformance batch, `test:main`, `test:ci`.

### 5.4 Left, and not this task's

- **NSP-006's two holes** (§4): the change note has its home now (`changes`). Still open: a TARGET cannot say which version
  it implements (an out-of-date stranger reads as trace differences, not "v1 target, v2 spec"), and no mutant encodes the
  previous version. The golden files at the base are the previous version's traces, so the second could be built on them: a
  "previous version" mutant that replays the base's golden traces and must be killed by a scenario. Not built.
- **The Frappe question above** is still owed to Richard before the first `changes` entry answers `project`. Counter's is
  `none`; no entry names a project migration yet.
- **The 62 comment histories** could be moved into `changes` if Richard wants each old version's migration answer written
  down; each one needs a reason, not a default.
