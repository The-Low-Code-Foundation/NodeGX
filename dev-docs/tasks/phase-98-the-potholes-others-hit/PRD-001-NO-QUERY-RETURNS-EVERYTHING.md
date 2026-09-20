# PRD-001 — No query returns everything

**Status: ✅ Built and gated, s3 (2026-09-20).** 19 specs, three mutants caught. §7 below is what was measured and what the task file got wrong.

## 1. The person sentence

**A query that forgot its filter returns a page and says it was a page — instead of returning
four hundred thousand rows and taking the backend with it.**

## 2. What is there (read 2026-09-19, HEAD `aa5d00e2a`)

| reading | where |
|---|---|
| `LIMIT` is emitted **only** when the caller supplied one — `if (options.limit !== undefined)` | `local-sql/QueryBuilder.ts:699` (and `:1016` for the aggregate path) |
| The route sets `limit` only when present in the request — `if (src.limit !== undefined) options.limit = parseInt(...)` | `server/parse-wire.ts:65` |
| No `MAX_LIMIT`, `DEFAULT_LIMIT`, `MAX_PAGE` or `MAX_ROWS` exists anywhere in `src/` | grep, no hits |
| An empty `where` produces an empty clause, so filter-absent and filter-empty are the same query | `QueryBuilder.ts:330` |
| 🔴 The behaviour is **asserted by the suite** — a plain query's count, commented *"all rows, plain query"* | `tests/search-http.test.ts:153` |

**So the failure needs no bug in the backend at all.** A cloud function that builds a filter from an
optional value, and omits the key when the value is missing, produces an empty `where` — and an
empty `where` with no `limit` is `SELECT * FROM table`. That is Richard's incident, exactly.

## 3. Design

### 3.1 Two numbers, not one

- **`defaultLimit`** — applied when the caller supplies none. Makes the common accident bounded.
- **`maxLimit`** — clamps a caller who asks for more. Makes the deliberate case bounded too.

Both live in a new `ops.json` section, so they inherit the unknown-keys-are-errors refusal and the
live `PUT /admin/ops` patching. Suggested defaults to argue about in review, **not** settled here:
`defaultLimit: 1000`, `maxLimit: 10000`.

### 3.2 🔴 A capped result must say so

Rule 1 of the phase. Silent truncation converts an outage into a **correctness** bug — a list that
looks complete and is not is worse than an error, because it is believed.

The Parse wire format is fixed and shared with unchanged clients (`cloudstore.js`, `userservice.ts`),
so **a new body field is the wrong place**. Prefer a response header —
`X-NodeGX-Result-Capped: true` plus the effective limit — which every route can set and no existing
client can trip over. The BYOB `/api/*` routes are ours and *may* carry it in the body; decide once
and do it the same way in both, or the two surfaces drift.

### 3.3 🔴 What must NOT be capped

`backup/dataio.ts` reads whole tables by design, and a backup that silently stops at
`defaultLimit` rows is a **catastrophic** regression — a restore that looks fine and has lost data.
The cap therefore belongs where *request-shaped* queries pass, and internal/system readers must have
an explicit, greppable bypass rather than relying on happening to pass a large limit.

Export, backup, the orphan sweep and the search indexer all read broadly. **Enumerate every internal
caller before choosing the layer.**

### 3.4 ✅ Where the clamp goes — answered by the phase 97 session, 2026-09-19

This task originally deferred the placement question to phase 97, since BRG-001/002 were rewriting
the persistence seam underneath it. **The answer came back, and it is better than the guess:**

> **Put it above the adapter, in `AdapterFacade` — not in `QueryBuilder`.**
>
> BRG-002 landed (`f31da7042`) and `security/state.ts` no longer reaches the raw handle, so
> **`AdapterFacade` is now genuinely the only door.** A clamp there is honoured by every adapter
> **including ones nobody has written yet**; a clamp in `QueryBuilder` is SQLite-only and BRG-005
> would have to reimplement it — which is how two implementations of one rule get to disagree.
> — `opennoodl-0b`, the phase 97 session

⚠️ **Re-read `AdapterFacade` at HEAD before writing this.** It changed twice on 2026-09-19 (the
facade stopped being synchronous in `637217156`, then §3.3 in `f31da7042`). The line numbers in §2
were re-verified at `aa5d00e2a`, but the facade itself is the fastest-moving file in the repo.

### 3.5 What BRG-003 already covers, and what it deliberately does not

**Covered:** the conformance suite's `records/limit-skip-and-count-compose`
(`nodegx-backend-contract/conformance/cases/records.ts:109` — verified present at `aa5d00e2a`)
asserts that `limit` is applied and that `count` describes the **matching set** rather than the page. So wherever this clamp
lands, **an adapter that ignores `limit` fails BRG-003 today** — the portable half of the behaviour
is already gated and this task does not need to add to it.

**Deliberately not covered, and the reasoning is worth keeping:** a page *cap* is not a conformance
case. Conformance asks *"do two adapters behave the same"*, not *"does the product have a limit"* —
if neither SQLite nor Postgres clamps, the suite is green **and right**. Encoding the cap there would
make a product decision into a portability one, and this task could then not change its own default
without editing a portability gate. **The cap is a product rule enforced in one place; the suite's
job is to prove `limit` is honoured once the rule sets it.**

## 4. Acceptance criteria

1. A query with **no** `limit` returns at most `defaultLimit` rows.
2. A query asking for **more than** `maxLimit` returns `maxLimit` rows, and does not error.
3. Both cases are **detectable by the client** without diffing against an expected count.
4. A query whose result is smaller than the cap is **not** marked as capped.
5. Backup, restore and export still read **complete** tables — proven by a round-trip whose table is
   larger than `defaultLimit`.
6. Both numbers are configurable in `ops.json`, and an unknown key in the new section refuses start.
7. The aggregate path (`QueryBuilder.ts:1016`) is capped too, or its exemption is written down.

## 5. Tests

- Provision a backend, insert `defaultLimit + 1` rows, query with no limit over HTTP: assert the
  count **and** the cap signal.
- Ask for `maxLimit * 2`: assert clamped, not errored.
- Round-trip a backup of a table larger than `defaultLimit`: assert every row survives. **This is the
  test that would catch the worst possible version of this change.**
- A sub-cap query carries no cap signal.

## 6. Out of scope

- Cursor pagination. `limit`/`skip` already exist; this task bounds them and does not redesign them.
- Rate limiting — a different question, already answered by `ops/rate-limit.ts`.
- The editor's Data Browser paging UI.

---

## 7. What was built, and where §2–§6 were wrong (s3, 2026-09-20)

### 7.1 The shape

| piece | where |
|---|---|
| the clamp | `AdapterFacade.resolveLimit()` / `markCapped()` — §3.4's ruling, honoured |
| the bypass | **`IStorageFacade.rawQueryAll`**, a separate METHOD (see 7.2) |
| the two numbers | `ops.json` → `queries.defaultLimit` (1000) / `queries.maxLimit` (10000) |
| the signal | `X-NodeGX-Result-Capped: true` + `X-NodeGX-Result-Limit: <n>`, set by `splitCapped()` in `server/http-util.ts` |
| the routes | `parse-wire` POST-tunnel find, `parse-wire` GET `/classes/:collection`, `byob-admin` `/api/:table` |
| the spec | `tests/prd-001-no-query-returns-everything.test.ts` — 19, all green |
| the docs | `docs/runtime/BACKEND-OPERATIONS.md` § *No query returns everything* |

### 7.2 🔴 §3.3's bypass had to be a method, not a flag — and the reason is not style

The obvious implementation is `rawQuery(c, {…, unbounded: true})`. It is
**wrong, and reachable by an attacker.** `toQueryOptions()` and `byob-admin.query()`
both build query options out of client-supplied fields; any flag that turns the cap
off is one careless `{...req.query}` away from being settable over the wire. A method
cannot be reached from a request body at all, and `rawQueryAll` greps to the exact
list of readers that opt out. The same argument is written into the interface docstring
so the next person to "simplify" it finds the reason there.

### 7.3 Two bounds §2 did not name, both of which would have defeated it

- 🔴 **`limit: -1`.** SQLite reads `LIMIT -1` as *no limit*, so a negative limit is
  this outage spelled as a query parameter. `resolveLimit` catches it and applies
  `defaultLimit`; a clamp that only tested `limit > maxLimit` would have shipped with
  a one-character bypass in it.
- 🔴 **`limit: 0` must survive as 0.** `limit=0&count=1` is how every Parse client asks
  "how many?". Folding a missing limit and a zero limit together would answer a
  count-only request with a thousand records — a performance bug introduced by a
  performance fix. Both are specs.

### 7.4 The cap signal is narrower than "the page is full"

`capped` is stamped only when the CAP decided the limit — no limit given, or one above
the ceiling — **and** the page came back full. A client paging with its own `limit: 50`
is never marked, or the header would be true on every well-behaved request and mean
nothing. The one honest imprecision is recorded in the code: an exactly-full last page
reads as capped, because telling "1,000 rows exactly" from "1,000 of 400,000" needs a
second count query on every plain read, and a false *"there may be more"* is the safe
side of that trade.

### 7.5 The thirteen internal readers that had to be moved (§3.3, enumerated)

`backup/dataio.ts` `readAll` (export + backup), `storage/MetadataStore.listAll` (the
orphan sweep — where a page cap does not truncate a listing but **deletes files**),
`roles/RoleStore.list`, `security/state.ts` `listApiKeys`, `auth/identities.ts`
`listForUser` and `revokeAllSessions`, `server/users.ts` (password-change revocation),
`users/SystemUsers.ts` ×2 (admin reset, user delete), `server/email-routes.ts`
`deleteAllSessions`, and `AdapterFacade.existingIds`. Four of those are session
revocation: a row missed by a cap there is a stolen token that survived the
revocation meant to kill it.

Plus two that §3.3 does not describe and that are the subtlest of the set: **`HttpCacheStore`'s
eviction and `AuditLog.prune`**. Both pass an explicit batch size — 5,000 — which looks like a
caller choosing a page and is not. It is a MAINTENANCE loop's own decision about how much work
one pass does, and a request cap that could shorten it would make the loop slower than the writes
that trigger it: eviction checks every 500 writes, so a clamped batch means the HTTP cache this
exists to bound grows without limit, and the audit table falls behind a busy backend. Neither
would have shown up as a failing test; both would have shown up as a disk filling.

Every other caller already passed an explicit small limit and is unaffected. §3.3 was
right that "happening to pass a large limit" is not a bypass: `MetadataStore` passed
`limit: 1000000` and would have been clamped to `maxLimit`.

### 7.6 AC7 — distinct is capped, the grouped aggregate's exemption is written down

`rawDistinct` is clamped at `maxLimit` (at the ceiling, not the default: a distinct is
an aggregate by intent and its route has no `limit` parameter to raise). `rawAggregate`
runs a single-group aggregate — `$avg`/`$sum`/`$max`/`$min` each return one scalar, so
the response is one object of fixed size whatever the table holds. **The residual is
`$addToSet`**, which `QueryBuilder` maps to `distinct` *inside* that object: an
unbounded array in a bounded response. Filed as **PRD-D7** rather than clamped here —
the honest fix is a limit on the aggregate path, not a reach into an accessor map.

### 7.7 The three mutants

| mutant | caught by |
|---|---|
| `dataio.readAll` reads through `rawQuery` | AC5's round trip (1 failed) |
| a missing limit is left unbounded | 6 specs across both halves |
| `splitCapped` leaves `capped` in the body | AC3 (1 failed) |

### 7.8 What it cost elsewhere

A new `IStorageFacade` member pays BRG-003's coverage ratchet: `FACADE_COVERAGE` gains
a `through` entry (so `uncovered` does not grow) and `brg-001-storage-interface.test.ts`'s
hand-kept `FACADE_MEMBERS` list gains a name. §3.5's reasoning — that a page cap is a
product rule and not a portability one — is written into that coverage entry, where the
next person deciding whether to add a conformance case will read it.
