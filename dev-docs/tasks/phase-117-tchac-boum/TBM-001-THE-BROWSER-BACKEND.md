# TBM-001 — The browser backend

**Opened 2026-10-11, from Richard's ask the same morning** (README §0, third quote). **Status: 📋 READY once R1 is ruled
(recommended: a kit for every app).** **Model: Fable** — an `IDataAdapter` graded by the contract's conformance suite is
reasoning over a wire contract with many clauses; a wrong reading becomes every offline app's wrong answer.

## 1. The person sentence

> **An app whose record nodes point at the "browser" backend saves and queries records in the browser's own storage,
> with no server, and finds them again tomorrow — the same nodes, the same specs, the same project files.**

## 2. What was measured (README §1.5–§1.7)

- Rocket School persists with `Global Store` + `Persist: true`, not the record nodes. This is new.
- Every record node reaches a backend through `IDataAdapter` (`@noodl/backend-contract` `data.ts:526`: `query`,
  `count`, `distinct`, `aggregate`, `fetch`, `create`, `save`, `delete`, increments, relations, `uploadFile`,
  `signFileUrl`); `CloudStore` constructs `RestDataAdapter` or `ParseWireAdapter` by `target.isParseWire`
  (`cloudstore.js:61-84`); `CloudStore.forBackend` resolves a `backendServices` entry by id (`:520-560`).
- The preview's page export keeps `backendServices` verbatim and blanks only `cloudservices`
  (`exporter/json.ts:25-26`, `:115-126`). So a project can carry the entry.
- `BackendType` is `'nodegx' | 'parse' | 'directus' | 'supabase' | 'pocketbase' | 'custom'` (`backends.ts:24`).
- The only local adapter is `node:sqlite` (`local-sql/engine.ts`): Node, not a page.
- The spec's World already answers the same operations in memory for the graph target (`world.ts` BACKEND), with the
  contract's event surface after a write (`AdapterEvents`).

## 3. What to build

1. **`BrowserDataAdapter`** in `packages/noodl-runtime/src/api/backends/` (beside `RestDataAdapter`): `IDataAdapter`
   over IndexedDB (one database per `backend.id`, one object store per collection, `objectId` keys, `createdAt` /
   `updatedAt` as the nodegx wire writes them), the neutral filter translated in JavaScript over the rows (reuse the
   spec World's filter if it is exported; else the contract's `where` grammar, measured), `save` honouring the
   precondition (`detail.reason === 'precondition-failed'`), the event surface after each write (`AdapterEvents`), files
   refused with `CAPABILITY_UNAVAILABLE`.
2. **Selection**: a `backendServices` entry `{ id, type: 'custom', adapter: 'browser', name: 'Dans ce navigateur' }`;
   one branch in `CloudStore` where the adapter is constructed, keyed on `entry.adapter === 'browser'`. Measure first
   whether `custom` reaches `RestDataAdapter` today and what `queryutils.backendType()` does with it.
3. **The conformance suite** (`nodegx-backend-contract/conformance/`) run against it, in a page (jsdom's IndexedDB is a
   fake; use headless Chrome as OWN-003 did) — every row green or excluded with a reason.
4. **The editor's picker** lists it (the backend picker, BCN-009) so an official-editor user can choose it too.
5. **A sentence in the brief** (OWN-007): how a home-made editor points a project at the browser backend.

## 4. Acceptance criteria

1. The conformance suite is green on `BrowserDataAdapter` in headless Chrome, with every exclusion named.
2. A project carrying the entry runs Create / Query / Update / Delete Record in the in-page preview with no network
   request (asserted: zero fetches to any backend URL during the drive).
3. The records survive a reload of the page (IndexedDB, not memory).
4. The official editor opens the project, shows the backend in its picker, and validates the record nodes clean.
5. The regression is the suite; the kit ledger row is `kit: runtime`.

## 5. Not this task

Auth (a browser-local user is a different question), files, realtime. Mission 4's wall work is TBM-002.
