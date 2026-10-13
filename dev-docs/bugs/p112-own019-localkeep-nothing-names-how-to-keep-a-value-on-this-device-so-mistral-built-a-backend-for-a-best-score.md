---
id: P112-OWN019-LOCALKEEP
title: "Nothing in the kit names how to keep a value on this device across a reload — the Variable notes point at 'the cloud database or browser storage nodes' (there is no browser storage node), and create_project's `backend` field has no rule for 'none' — so Mistral built a backend for a single-phone best score"
status: fixed
commit: a8511d032
severity: medium
area: kit / node notes (`docs/node-catalog/enrichment/variable2.json` antiPatterns) and create_project's `backend` field (`packages/noodl-mcp/src/tools/createProject.ts`); the Vibe kit's AGENTS.md
found: P112 OWN-019 s1, 2026-10-13 (the Vibe baseline v1b, Mistral Large 4 in Vibe 2.26.1, plain kit tgz12)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s1)
---

The quiz asks for a best score "still there after I reload the page". In the Vibe baseline, Mistral scoped it as
`create_project({ backend: { kind: "nodegx", collections: [{ name: "Score", fields: [{ name: "best" }] }] } })`; the
plan it got back opened with "provision backend", and it spent the first third of its run there — three
`provision_backend` calls, a `Score` collection, its permissions — then built the best score on a live query, never
drove the page, and graded 0/12. In OpenCode (runs 9, 10) the same model scoped `backend: { kind: "none" }` and kept
the score with a Function calling `localStorage`, as Sonnet did. Which way it goes is a coin the kit leaves to the model.

What the kit says: the Variable node's notes — *"persist important data in the cloud database or browser storage
nodes"* — name the backend first and a node kind that does not exist (the catalog has no browser-storage node; the
working way is a Function with `localStorage.setItem`/`getItem`, written nowhere). `create_project`'s `backend` field
says what "nodegx" does, not when to choose "none".

**Fixed (notes):** the Variable anti-pattern now says a value one person keeps on their own device needs no backend —
a Function saves it with `localStorage.setItem` and reads it at load — and that a backend is for data shared between
people or devices. The Vibe kit's AGENTS.md says the same at the create step, with `backend: { kind: "none" }`.
**Fixed (field), OWN-019 s2 (2026-10-13):** `create_project`'s `backend` description now says a backend is for data
shared between people or devices, and what one person keeps on their own device is kind "none", saved by a Function
with localStorage (`tests/bootstrap.test.ts`, read off the unbound surface's `tools/list`). s1's reason for leaving it
was wrong: measured, `create_project` is NOT on the resident surface AWP-006 budgets — it is deferred once a project is
bound (21 resident tools, none of them create_project) and listed only on the unbound six-tool surface, which has no
token gate. The resident count is 8,277/8,280 before and after.
