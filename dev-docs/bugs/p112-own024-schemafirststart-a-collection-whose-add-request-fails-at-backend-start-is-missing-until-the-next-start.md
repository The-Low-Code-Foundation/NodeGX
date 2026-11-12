---
id: P112-OWN024-SCHEMAFIRSTSTART
title: A project collection whose add request fails at backend start is missing until the backend is started again, and only the app log says so
status: fixed
commit: (this session, the Beta sweep s6)
severity: low
area: editor main / `packages/noodl-editor/src/main/src/local-backend/project-schema.js` `applyProjectSchema` (one request per collection, no retry), called from `BackendManager.js` ~:604
found: P112 OWN-024 s1, 2026-10-20, driving the marketplace zip on the released 0.4.3 (mac-x64 DMG under Rosetta, Apple Silicon)
regression: packages/noodl-editor/tests-main/local-backend/backend-manager-project-schema.test.js "a collection whose first push fails at the network level is added on the next try, and reported as added"
evidence: OWN-024-THE-0.4.3-CUT.md §5 (S8 on 0.4.3); app log lines below
---

First start of the marketplace's new backend on 0.4.3:

```
[BackendManager] Project collections on backend_mvh0qqm66babp: 20 added, 0 already there, refused: ProductHistory (fetch failed)
```

Stopped and started again from the card:

```
[BackendManager] Project collections on backend_mvh0qqm66babp: 1 added, 20 already there
```

So it heals on the next start. A builder who starts the backend once has no `ProductHistory` made from the schema,
and nothing in the editor says so: the card reads Running, and the refusal is only in the app's log. The first product
save writes its history and so makes the collection, but without the unique indexes, checks and links
`backend/schema.json` gives it (the reason R12 adds collections before functions are pushed, `BackendManager.js` ~:600).
Not measured here: the drive restarted the backend before any product was saved.

On 0.4.2 (arm64, native) the same first start added all 21 (OWN-021 §12). This drive ran the Intel build under Rosetta,
where everything is slower, so the likeliest cause is one request failing while the backend is busy (a timeout or a
dropped connection: `fetch failed` is undici's generic network error). Not measured: whether native arm64 or Windows ever
hits it. The community app's backend, started right after, added all 13.

**Fix (small).** Retry a collection whose request failed at the network level (once or twice, short back-off) before
calling it refused; and say a refused collection on the backend card, not only in the log, with "Start the backend again
to add it". Spec: a request function that fails the first call for one table; the report lists it as created, not failed.

**Fixed (the Beta sweep s6, 2026-10-25), as proposed.** `project-schema.js` `pushTable`: a push that never got an
answer (undici's `fetch failed`, a timeout, an abort) is tried twice more, after 250 ms and 1 s; before each new try it
asks `GET /admin/schema` whether the table landed with its answer lost, so a table the backend has is never pushed
again (R12). A refusal in words is not retried. What is still missing becomes `schemaProblemSentence`, kept on the
supervisor, answered by `backend:status` as `schemaProblem` while it runs, and shown on the backend card as a notice:
"ProductHistory from backend/schema.json was not added (fetch failed). Start the backend again to add it."

**Graded.** `backend-manager-project-schema.test.js` 4 new (a first push dropped → created; a refusal in words pushed
once; still dropped after the tries → the card's sentence; a push that landed with its answer lost → pushed once): red
3/4 on HEAD's source (the words control green). Two mutants red (no look before re-pushing; retrying a refusal).
local-backend + panel specs 9 suites 117/117, editor tsc clean. NOT rendered: the card's notice (the card cannot be
loaded under jest, `tut-001/panel-render`); not re-measured on the Intel build under Rosetta.
