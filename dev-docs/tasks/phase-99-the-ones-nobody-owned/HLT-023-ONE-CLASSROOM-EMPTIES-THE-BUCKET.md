# HLT-023 — One classroom empties the bucket

🔴 **Opened 2026-09-23 from the Digital Bricks Training stream (its sprint 49, L170), at Richard's
ruling: *"Core fix."*** Measured twice: first as transient 400s and 429s during L170's live checks
(worked around there by raising the scratch backend's limits, which proves nothing about production),
then deliberately, on a fresh backend with the **default** data budget. Specced, not built.

## 1. The person sentence

> **Fourteen learners opening their course page at nine o'clock all get their course page — and the
> operator can still use the admin API while they do.**

## 2. What it is, measured 2026-09-23 (`cline-dev`)

Fresh backend, default `ops.json` except `admin` raised so the seed could import; the DBT template's
four read functions deployed. `course` (1 query to resolve the caller + 25 for the programme) called
30 times, **alternating two different learners**:

```
200 ×13, then 400, 500, 500, 500, 500, 500, 500, 400, 500 … (call 14 onward)
```

The server log attributes every request:

| route | principal | status | count |
|---|---|---|---|
| `classes/:collection` (the functions' own queries) | **`admin`** | 200 | 386 |
| `users/me` (the runtime resolving the caller) | **`admin`** | 200 / **429** | 15 / 15 |
| `functions/*name` | `user` | 200 / 500 / 400 | 13 / 15 / 2 |

Three findings, each from those rows:

- **Every query a deployed function makes is charged to principal `admin`, in the `data` class**
  (1200/min, burst 400). The limiter is keyed by principal (`src/ops/rate-limit.ts`, "an
  authenticated client gets its own bucket"), and every function run is the SAME principal — so there
  is **one bucket for the whole deployment**, not one per learner. Two learners alternating drained
  it as fast as one would.
- **It is the operator's bucket too.** The same `admin`/`data` bucket served the operator's own
  admin-token requests: an unrelated `POST /classes/_Session` made right after was refused 429.
- **The failure is a 500 with nobody's words in it.** Once the bucket is empty, the runtime's own
  `users/me` caller resolution is refused BEFORE the function body runs, so the function cannot answer
  with its own refusal. Only the two calls that got past it failed the function's way (400, *"This
  could not be read."*).

Arithmetic: at 26–27 data requests per page, the sustained rate is **~44 course pages a minute for
the entire deployment**, and a cold burst of **13**. One classroom.

**Why charging the function's queries at all is double-counting:** the function CALL is already
budgeted, per caller, in the `functions` class (600/min, burst 200 — CWF-017's per-function budget
sits there too). The queries inside it are the function's implementation, not a second request by
anybody.

## 3. The shape (recommended, to be ruled)

- **A function run's internal queries do not spend the `data` bucket.** They are bounded by the call
  that started them — the caller's `functions` budget and the function's own `timeoutMs` — not pooled
  under one principal.
- **The runtime's own caller resolution never spends a client bucket**, so a function answers in its
  own words or not at all, never a bare 500.
- **A runaway guard stays**: a per-run ceiling on internal queries (a loop in a function must not
  become an unbounded load on the database), with its refusal naming the function and the ceiling.
- Rejected: raising the default `data` burst. It moves the classroom from 13 to some larger number
  and keeps the operator in the same bucket.

## 4. Acceptance criteria

1. **The failure reproduced first**, as §2, on SQLite: 13 then non-200 on the default budget. The
   control.
2. After the fix, on the default budget: 100 alternating `course` calls from two learners all 200;
   the operator's admin-token requests made in the middle of them all succeed.
3. A caller who exceeds their own `functions` budget is refused 429 **with that class named**, and a
   different caller in the same instant is not.
4. A function that loops past the per-run ceiling is refused by name, and the next call from anybody
   succeeds.
5. No 500 anywhere in the run; the log shows no internal query charged to `admin`.
6. **The DBT stream's:** L171's live drive runs on the default `ops.json`, with no raised limits.

## 5. Owner and neighbours

About a day. **Blocks the DBT template's production use** (its L171 onward): as shipped, a class of
fourteen takes the product down for everyone. Own commit, only its own paths staged.
