# OWN-000 — The prototype, measured

**Opened 2026-10-02.** **Depends on nothing.** Shares its second half with P107 NSP-021 §3.1 (build once, cite twice).
**Status: 🟢 built, s1 (2026-10-03). The NSP-021 census (§3.3) is being written in P107's folder; see §6.**
**Model:** Built. A follow-up (re-running the census) is Opus work. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Before anything is built, we know exactly what an editor needed that it could not get from a package, and how much
> of every template a home-made editor could run, measured the same way P107 counts nodes.**

## 2. Why

README §1 is one evening's reading and reading 6 is a rough count by a quick classifier
(`prototype/tools/rough-census.ts`: component instances detected by a guess at the type string, "other" a catch-all).
Every later task cites these numbers, so they must come from a script with a rule, not from a conversation.

## 3. What to build

1. **The prototype's needs, as a table** (`NEEDS.md` in this folder). One row per question the prototype answered
   (README §3's six parts, broken down: "list a node's ports", "know if an output is a signal", "the category colour",
   "seed a new wire with the current value", "is this input wired"…). Columns: where the prototype got the answer
   (file and line), whether that place is a package an outsider can install, and which OWN task moves it. Read
   `prototype/page.html` and `prototype/src/` line by line; every `NGX.*` call and every constant copied from the editor
   is a row.
2. **The runnable census, done properly** (`scripts/own/census.js`). For every template: total nodes, counted with the
   P107 census rule (`scripts/node-spec/census.js` decides what a node is; reuse it, do not re-derive), split into:
   runnable in a page with the clock, randomness and time zone only; specced but needing a store, backend, router,
   popup or viewport; visual; script (Function, Script, Expression); component instances; unspecced other, **by type
   name**. Output `census.json` and a markdown table. Reproduce README §1 reading 6 or explain every difference.
3. **The editor-knowledge census, once.** NSP-021 §3.1 asks for a table of every question the Electron editor asks
   about a node and where the answer comes from today. Build that table in P107's folder as NSP-021 specifies, and
   have `NEEDS.md` link its rows instead of copying them. If NSP-021 has been built by then, read it instead.

## 4. Acceptance criteria

1. `NEEDS.md` has a row for every `NGX.*` call and every editor constant in the prototype; a reviewer reading
   `page.html` finds none missing.
2. `scripts/own/census.js` runs in under a minute, writes `census.json`, and its todo and planning rows either match
   README §1 reading 6 or the README is corrected with the reason.
3. The "unspecced other" bucket is a list of type names with counts, so OWN-003's R1 measurement knows what the real
   engine would have to run.
4. The NSP-021 census exists once, in P107's folder.

## 5. Watch for

- Memory: *count the request, not the node that would make it*, and *a census over two project formats*: templates
  carry nodes nested in `children` and component instances whose type is a component path. Read the census rule's
  own handling before trusting a count.
- The spec count moves while you work (76 → 78 during scoping). Read it from the package at run time; never type it.

## 6. Built

**s1, 2026-10-03, on `c25fb8ee5`.**

1. **[NEEDS.md](NEEDS.md)**: 40 rows over two prototypes, not one. Richard's second prototype, *Under the Lid* (the
   artifact `9tAKJ2QcxSqPJadkj7ssfR`, 2026-10-03), is kept byte for byte in
   [`prototype-under-the-lid/`](prototype-under-the-lid/README.md) and measured in §2 of the table; Orbit is §1. Every
   `NGX.*` call (7 names, `page.html`), every `entry.ts` export, every editor constant (`SCHEMES`, `WIRE`, `GROUND`, the
   card metrics, the lane, the fonts) and every hand-typed table in Under the Lid has a row with file and line. §3
   counts the rows per task and names **two needs no task owned**: a machine-readable conformance ledger (Under the Lid
   typed the P107 progress and it was stale within a day) and the deployed shape of the format (`sourceId` /
   `sourcePort`, which the runtime reads, beside the v2 files the editor writes; OWN-001 must carry the transform).
2. **`scripts/own/census.js`** (+ `spec-needs.ts`, bundled with esbuild at run time because the spec package's `main`
   is TypeScript): every template under `templates/` with a `components/` folder, 13 of them, every node counted once
   (v2 `nodes` arrays are flat; `children` are ids, which is why the prototype's `rough-census.ts`, which walked a
   nested `nodes` field, is retired). Rule in the header; population and tiers read from P107's catalog rule and
   `census.json`; the spec list and each spec's `needs` read from the package. Runs in **0.6 s**; `--check` exits 1
   when stale. Output: [CENSUS.md](CENSUS.md), `census.json`.
3. **README §1 reading 6 reproduced** to the node: todo 531 = 19 / 92 / 199 / 53 / 71 / 2 / 95, planning 972 = 16 / 141 /
   521 / 93 / 67 / 2 / 132. The three cells that moved are explained in the README (two `Page` nodes the rough count
   called visual; `CSS Definition`, which the tier table calls an escape hatch). AC2 taken as "corrected with the reason".
4. **The unspecced bucket, by name** (AC3): 1,229 nodes over every template, of which **1,071 are `Component Inputs` and
   `Component Outputs`** (NSP-015 has them as graph scenarios, not as specs in the package yet), 132 are cloud-only
   request / response / secret nodes (NSP-022), 12 are the Global Store family. So R1's "what the real engine would have
   to run" is, for a browser app, almost only the component interface.
5. **The world-need split** (AC3's second half): of 1,133 specced-but-world nodes, `registry` is 950, `backend` 147,
   `router` 135, `network` 42, `project` 42. One shared `World` per graph is the first lever by a wide margin.
6. **The NSP-021 census** (§3.3, AC4): written once, in P107's folder, from a research pass over the editor; linked
   from NEEDS.md §4.

**Not done:** the `--check` is not yet in a CI script (`npm run` has no `own-census:check`); add it with OWN-002's build
so the two land in the fast suite together.
