---
id: P112-OWN024-SCHEMAFIRSTSTART
title: A project collection whose add request fails at backend start is missing until the backend is started again, and only the app log says so
status: open
severity: low
area: editor main / `packages/noodl-editor/src/main/src/local-backend/project-schema.js` `applyProjectSchema` (one request per collection, no retry), called from `BackendManager.js` ~:604
found: P112 OWN-024 s1, 2026-10-20, driving the marketplace zip on the released 0.4.3 (mac-x64 DMG under Rosetta, Apple Silicon)
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
