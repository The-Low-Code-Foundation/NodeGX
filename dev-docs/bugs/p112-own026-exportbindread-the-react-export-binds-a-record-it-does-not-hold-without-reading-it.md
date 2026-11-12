---
id: P112-OWN026-EXPORTBINDREAD
title: An exported Record with Fetch unwired binds the client's copy for its Id and never reads, so an exported page opened by its own URL shows an empty record — the runtime now reads a record it does not hold
status: open
severity: medium
area: export / Record (`packages/nodegx-export/src/analyze/plan.ts` the Record's effect form; `tests/record.test.ts` "Fetch unwired: the Id binds the row to the app's copy of the record — no request")
found: P112 OWN-026 FIX-02, 2026-10-22, beside P112-OWN026-RECORDBYIDMEMORY
evidence: packages/nodegx-export/tests/record.test.ts:136 emits "binding reads nothing (dbmodelnode2.ts setModelID)", which is no longer the runtime's behaviour
---

P18-S113-IDBINDREAD made the export's effect form a bind with no request, to match the runtime of the day. The
runtime now reads a record nothing in memory holds (P112-OWN026-RECORDBYIDMEMORY): on an Id change, a held copy binds
at once; an unheld one is read, `Fetched` on the answer, no `Done`, a failure on `Error`. The faithful effect form is
therefore "bind the held copy; if the client holds none, fetch it by id". Not changed here: it is the P18 export
lane's file (another session was editing `plan.ts` while this was found), and it re-grades `record.test.ts`'s effect
rows and the four corpus fixtures IDBINDREAD names.
