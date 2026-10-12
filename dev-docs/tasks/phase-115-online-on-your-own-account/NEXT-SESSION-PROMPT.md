# Phase 115 — next session prompt

**Written 2026-10-07 at the end of the scoping session, at HEAD `d8a9f0069`.** The phase is **parked**: Richard said
to come back to it after phase 107 closes and phase 110's Swift runtime experiment has run. Do not start it before
then unless he says so.

## 1. Built vs driven, per task

| task | built | driven | note |
|---|---|---|---|
| HST-000 … HST-009 | 📋 | 📋 | scoped only; ten task files and the README exist |

Built-but-undriven: 0. Nothing is built.

## 2. Gate readings

None run this session; the session wrote documents only. P107 stood at 116 of 147 conforming at `b5daeaa0d`.

## 3. What this session settled

- **The phase is research, not a product.** Three shapes of app (front end; front end plus server-side workflows and
  no database; full stack) by two routes (Cloudflare Workers with no VM; a box you own), twelve runs, six measurements
  each, then a ruling on the default route per shape. Richard's expectation to test: most vibe-coded sites are shape B
  and Workers is the elegant case there.
- **Phase 26 already designed the plumbing** (DEP-003 Pages direct upload, DEP-004 secrets, DEP-005 SSH and Caddy,
  DEP-006 Hetzner) for the editor and never started it. This phase lifts those designs into the CLI and MCP; it does
  not redesign them.
- **Two readings corrected the conversation:** `nodegx deploy` writes a static folder with the interpreter, not React
  (the React artefact is `nodegx export`); and the deploy engine is not in the npm package on purpose (C72), so
  "deploy from the install" waits on P112 R2.
- **Two vendor facts to re-measure before anyone relies on them** (web search, 2026-10-07): Hetzner's cost-optimised
  tier, the "€4 box" DEP-006 priced, reported unavailable since 2026-09-07; and D1 is not inside Cloudflare's $5 Workers
  Paid plan, though Containers are.
- **Cloudflare alone covers what Vercel would.** Vercel is out, as DEP-003 already argued.

## 4. What to do next, in order

1. **HST-000** first, and it is Richard's step: ask the ex-client for the list of evenings he lost. The phase's
   acceptance criteria are rewritten from it.
2. **HST-001** in parallel: the campus flow through the MCP and preview, no editor. Its finding (which nodes the
   vocabulary lacks) goes to P107 whether or not the phase continues.
3. Then HST-002, then the two plumbing tasks and the two experiments in parallel, per README §6.

### Rulings owed by Richard (ask in plain words, recommendation first, numbers measured on the day)

- R1 default route per shape (after HST-008). R2 may the connector spend money or only guide. R3 is the D1 adapter a
  product or a spike. R4 the Team organisation for the directory, or the open registry. R5 is 14.9 MB an acceptable
  first load (after HST-003's phone measurement).
- Also owed from elsewhere and blocking here: **P112 R2** (publish the kit at 0.x), without which the deploy engine
  stays in the checkout.
