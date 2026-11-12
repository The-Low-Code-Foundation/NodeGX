# HST-015 — The three Durable Object reds

**Opened 2026-11-05.** **Depends on HST-006 §6.** **Status: ✅ done, session 13 (2026-11-06), §5: the suite 103/103 in a Durable Object on workerd (was 99/102), none declared away; PostgreSQL 103/103; node:sqlite 103/103.** Kind: product.

## 1. The person sentence

> **A filter that works on the computer either works on Cloudflare or says, before it runs, why it will not.**

## 2. Why

Session 5's conformance run in a Durable Object was 99/102: a regex filter (no JS function in the object's SQL), and
two five-hop path filters (P115-HST006-EXPRDEPTH: the object caps an expression tree at depth 100). Separately the
object refuses BEGIN/COMMIT/SAVEPOINT in SQL (only `transactionSync`), and no conformance case notices a dropped
transaction (P115-HST006-NOROLLBACKCASE).

## 3. What to build

1. Regex declared unsupported by the Durable Object engine, with a sentence, through the contract's capability flags.
2. The path filter's SQL flattened so five hops stay under depth 100 (EXPRDEPTH).
3. A conformance case that grades atomicity, then the engine's transactions through `transactionSync`.

## 4. Acceptance criteria

1. The conformance suite in the object: 102/102 or every red refused by a declared capability.
2. The new atomicity case red on today's DO engine and green after; green in Node throughout.

## 5. Session 13 — 2026-11-06 (Opus 5.5)

### 5.1 The instrument

`packages/nodegx-backend/tests/p115-hst015-durable-object-reds.test.ts` runs the contract's suite through the
PRODUCT engine (`cloudflare/durableObjectSql.ts`) over a stand-in object on `node:sqlite` that refuses what Cloudflare
refuses (transaction statements as SQL, the journal PRAGMAs; no JavaScript from SQL). Cloudflare's expression-depth cap
cannot be set on `node:sqlite`, so every statement a run sends is replayed in order through Python's `sqlite3` with
`SQLITE_LIMIT_EXPR_DEPTH` = 100. **The control reproduced session 5 exactly:** 101/102 in Node with `filters/regex` red
(*no such function*), and the replay found exactly three statements too deep, the two five-hop path cases'. Ledger as
§6 of HST-006: SAVEPOINT 23, RELEASE 23, BEGIN 2, COMMIT 2 dropped; 17 `transactionSync`.

### 5.2 Regex — not declared away: the everyday filters were inside it (P115-HST015-STRINGFILTERS, high, fixed)

The plan was to declare regex unsupported. Read first: `contains`, `startsWith`, `endsWith` and their `IgnoreCase` /
`not` forms are lowered onto `$regex` on the built-in backend's wire (the contract's `lowerToRegex`), and so are a
workflow's record steps and the Data Browser's "starts with". So every everyday text filter failed on Cloudflare, and
the suite saw one case. Built (`noodl-runtime/src/api/adapters/local-sql/plainRegex.ts`): the seven shapes those
lowerings write, over an escaped literal, as plain SQL (`instr`; `substr` against `length`) on a column with TEXT
affinity (`ColumnScope.texts`, from `PRAGMA table_info`), on every engine; anything else goes to the function, and on an
engine without it (`refuseMissingSqlFunctions`, `sqlFunctions.ts`) is refused before SQLite reads it, in words the
backend answers 400: *"The built-in backend cannot filter on a pattern (a regular expression) on Cloudflare: the
database there cannot run JavaScript. "Contains", "starts with" and "ends with" on a text field still work."* Map
filters the same (*"… a distance or an area of a map on Cloudflare …"*).

Why only TEXT columns: a REAL column holds 42.0, which JavaScript reads as "42" and SQL as "42.0". Why only ASCII for
"ignore case": without `u`, JavaScript never folds a non-ASCII character onto an ASCII one, and `lower()` is ASCII-only
(measured on workerd: `lower('ÄKİ')` = `ÄKİ`, no ICU).

Graded value by value against the JavaScript function (`tests/helpers/hst015-cases.ts`): 24 stored values (newlines,
`ß`, `ſ`, KELVIN SIGN, `İ`, `%`, `_`, metacharacters, empty), 16 literals, the nine operators plus equals, `m`, `iu`:
**184 asks plain SQL, the same rows as the function, on node:sqlite, the stand-in and workerd; 42 not plain, answered
by the function on node:sqlite and refused in words in the object.** Mutants killed: `instr >= 0`; the end offset by
one; no `lower()`; no refusal wrapper; no text columns.

### 5.3 EXPRDEPTH — paths as joined steps (fixed)

Measured in Python at depth 100 with the hops' real SQL (row rule at every hop): nested `IN (SELECT …)` holds **3**
hops (SQLite adds up the heights of every WHERE still open while it resolves a subquery: the square of the hops);
fencing the previous hop into a FROM-clause subquery, **7**; a CTE chain read through `IN`, **7**; one named step per
hop, each JOINING the previous step in its own FROM, **over 60**. Built the last: `WITH RECURSIVE "_pN_h0" AS (…),
"_pN_h1" AS (SELECT DISTINCT … FROM "_pN_h0" JOIN …) … SELECT "objectId" FROM "_pN_hK"`; the repeated hop's walk is a
step of the same list; same parameter order, both dialects. Graded: the replay finds no statement over 100 for the
whole suite and for an eight-hop path (the contract's most) with the rule at every hop. The per-path step names are not
load-bearing (that mutant survives; said in the code).

### 5.4 NOROLLBACKCASE — the case, then the transactions (fixed)

New contract case `schema/a-change-that-fails-halfway-changes-nothing`: a text field with a unique index holding "1"
and "1.0" retyped to Number is refused (the clash is found at the last step, after the old column has gone) and the
field is still text, both values and the index as they were; a control retype goes through. **Red on the engine as it
was** (Node: the stand-in with `atomic` taken away; workerd: the spike's own `doEngine.ts`, *"a refused change
converted a value: it was half done: expected "1", got 1"*), green after. The fix: SchemaManager's six hand-written
blocks (drop column, rename collection, make required, retype, indexes, checks) go through `_atomically(fn)`: the
engine's own `atomic` when it has one (`EngineDatabase.atomic?`, the object's `transactionSync`), else a named
SAVEPOINT (which nests, and starts a transaction when none is open). Measured on workerd: `transactionSync` nests, and
an inner block that throws rolls back alone. Ledger after: **no transaction statement dropped** (was 50 a run), 42–46
`transactionSync`. Mutant: the Node atomic block doing nothing, killed by the node:sqlite conformance run.
`changeColumnType` moved off the coverage gate's uncovered list (the gate turned red until it did: a declaration no
longer matched what the suite does). On PostgreSQL the refusal arrives at the next data-plane call (its schema queue):
the case waits for it as `set-required` does.

### 5.5 Readings

| arm | reading |
|---|---|
| node:sqlite, the contract suite (`brg-003-conformance-sqlite`) | 103/103 |
| stand-in object in Node (`p115-hst015…`, 7 tests) | 103/103, none declared; depth replay 0 too deep; 8 hops ✓; ledger 0 dropped |
| **workerd** (`spike-records` under `wrangler dev`, `GET /__hst015`, the product engine) | **suite 103/103**, 0 failed-as-declared, 0 dropped, 46 `transactionSync`; HST-015 cases 3/3 (184 plain, 42 refused); the atomicity case on the spike's engine as it was: red |
| PostgreSQL 16 (`brg-005`, local) | 103/103 |
| runtime adapter tests (`noodl-runtime/test/adapters`, `queryutils`) | 361/361 |
| backend suites around paths, filters, schema, conformance (42 suites) | green after the coverage declaration |
| typecheck: noodl-runtime, nodegx-backend-contract, nodegx-backend | 0 errors each |

Not run live: a live `/__conformance` reads ~752,000 rows (15% of the Free day) and workerd is the same runtime; the
product change reaches `hst-campus` with its next redeploy (§5.6). Code: `adb3aa92a`.

### 5.6 Live: the bug on Richard's account, and the redeploy that carries the fix

Read on `hst-campus` BEFORE the redeploy (2026-11-06, ~21:50 UTC; `scratchpad contains-live.mjs`: `GET /classes/Reader`
as the admin): `$regex: 'da'` (contains), `'^Gr'` (starts with), `'ADA'` + `i`, `'^.r'` (a real pattern): **all four
500, `no such function: nodegx_regexp`**. So every "contains" filter in a deployed app was broken on Cloudflare, not
only in the suite. The Campus check without seeding: every rule as before.

The redeploy (`deploy.mjs … --name hst-campus --viewer <a copy of the deployed production viewer>`) was REFUSED to this
session by the auto-mode classifier (session 12 ran the same command). It is Richard's terminal; the command and the
readings to expect are in NEXT-SESSION-PROMPT §0. Expected after it: the first three 200 with `["Ada"]`, `["Grace"]`,
`["Ada"]`; the real pattern 400 with *"The built-in backend cannot filter on a pattern (a regular expression) on
Cloudflare …"*; the Campus check unchanged (nothing re-seeded, the accounts, role, answers and file kept).

