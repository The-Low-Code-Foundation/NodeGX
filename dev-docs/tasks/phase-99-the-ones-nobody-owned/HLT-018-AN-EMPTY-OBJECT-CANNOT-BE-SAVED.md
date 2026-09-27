# HLT-018 — An empty object cannot be saved

🔴 **Opened 2026-09-22 from the Digital Bricks Training stream (its sprint 49, L169), at Richard's
invitation to add what the template's backend needs to phase 99.** Found by L169's seed, recorded
there as *"worth a phase-99 row"*, and worked around by leaving empty objects off. ~~Specced, not
built.~~ Measured by reading the source and by the seed run that hit it.

✅ **BUILT 2026-09-22 (P99 s15). AC1–AC4 ✅; AC5 is the DBT stream's.** On a real socket, `{}` is
created (201), emptied by a `PUT` and imported, and reads back as `{}` each time. HEAD: 500, import
rolled back, and 🔴 **a `PUT` to `{}` answered 200 and wrote nothing**, because `node:sqlite` takes
a leading bare object as its named-parameter map. §2 missed that, and it was wrong that PostgreSQL
was affected: it never was. [Verdict](./verdicts/HLT-018/2026-09-22/VERDICT.md).

## 1. The person sentence

> **Someone saving a record whose Object field is empty — a new learner with no facts yet, a form
> with nothing ticked — gets a saved record, not a 500.**

## 2. What it is, measured 2026-09-22 (`cline-dev`)

- `serializeValue` in `packages/noodl-runtime/src/api/adapters/local-sql/QueryBuilder.ts` (~1352)
  turns an object into JSON only when `Array.isArray(value) || Object.keys(value).length > 0`.
  `{}` has no keys, so it falls through every branch and is returned **as an object**, which no
  driver can bind.
- Observed in L169: `POST /classes` answers **500** with *"Provided value cannot be bound to SQLite
  parameter"*, and an admin import containing one such row **rolls the whole import back**.
  `{"a":1}` and `[]` both save.
- **Why the key-count check exists, and why deleting it would be the wrong fix:** a `Date` has no
  own keys either. The check keeps a `Date` out of the JSON branch so it reaches the
  `instanceof Date` branch below. Dropping the check would store every `Date` as `"{}"`.
- `buildInsert` and `buildUpdate` both call it (~966, ~1005), and the PostgreSQL adapter goes
  through the same builder with its dialect, so both adapters are affected. (Not yet driven on
  PostgreSQL — AC2 does that.)
- **Why it matters beyond one template:** an empty object is the natural starting value of any map
  field. In the DBT product, a learner's `facts` map starts `{}`, so the first write of a new
  learner's context would fail.

## 3. The shape

Check `instanceof Date` before the object branch (or exclude it there), then store any remaining
plain object, empty or not, as JSON. Reading back `"{}"` must give `{}` on both adapters.

## 4. Acceptance criteria

1. **The failure, reproduced first** on SQLite: saving `{ data: {} }` answers 500 and an import
   carrying it rolls back. Recorded as the control.
2. After the fix, on SQLite **and** PostgreSQL: saving `{}` succeeds and reads back as `{}` (not
   `null`, not `"{}"`); an update from `{"a":1}` to `{}` does the same.
3. A `Date` and a `{__type:'Date'}` value still store as ISO strings. The existing `QueryBuilder`
   tests pass, and a new case for each is demonstrated failing with the key-count check simply
   deleted, which is the tempting wrong fix.
4. A phase-97 conformance case per adapter.
5. The DBT template's `tools/setup-backend.mjs` stops dropping empty objects, and its seed check
   passes with them in.

## 5. Owner and neighbours

About an hour. It is needed before the DBT template's first writes (sprint 50), beside HLT-016.
Own commit, only its own paths staged.
