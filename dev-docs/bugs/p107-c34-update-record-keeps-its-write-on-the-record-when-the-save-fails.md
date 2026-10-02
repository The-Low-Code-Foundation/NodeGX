---
id: P107-C34
title: Update Record keeps its write on the record when the save fails — including when nothing was ever sent
status: needs-ruling
severity: medium
area: runtime / Record family — Update Record (`SetDbModelProperties`), `scheduleSave`
found: P107 (the node says what it does) s22, 2026-10-02
evidence: dev-docs/tasks/phase-107-the-node-says-what-it-does/NSP-014-BATCH-DATA-AND-CLOUD.md §6.5 (row C34); scenarios `SetDbModelProperties.json` "a Backend the project lacks … stay written" and "the backend refuses: the property ports stay written"
---

Update Record keeps its write on the record when the save fails — including when nothing was ever sent.

**Where:** `packages/noodl-runtime/src/nodes/std-library/data/setdbmodelpropertiesnode.ts` `scheduleSave`: the property
ports are written onto the in-memory record (:184-188) BEFORE the backend is resolved (:191-192) and before the save
goes out (:194). Only a refused precondition puts them back (:208-216, "Nothing was written, so the record must not
keep showing what was refused"); every other failure — the backend not configured (no request at all), a network
error, a 4xx/5xx — leaves the record showing values the backend does not hold.

**What the trace shows (measured s22 on the runtime target, now two conforming scenarios):** Class `Lesson`, Id `r1`
(holding `title: 'x'`), Backend `nope`, `prop-title` = `z`, Do → Error "The backend this node is set to ("nope") is not
configured…", Failure; then Backend `_active_`, Only If Unchanged `title`, Do → the save's `ifMatch` is `{ title: 'z' }`
— a precondition built from a value no backend ever held, which a NodeGX backend will refuse.

**Plain words:** *"If saving a record fails, the app still shows the new values as if they'd been saved — even when it
never tried to send them. Anything that reads the record afterwards believes the change happened."*

**Proposed:** put back what the write replaced on EVERY failure, not only a refused precondition — take `before` for
every save (today only when `ifMatch` is set) and restore it in `error` and on the not-configured return. The local
branch (`Store to` = Local only) is unaffected. A behaviour change; ships alone.

**Ruling:** P107's rule R3 (a) — the runtime wins until Richard rules. The spec (`update-record.ts`) states the
runtime's behaviour today; a ruled fix is a spec version.
