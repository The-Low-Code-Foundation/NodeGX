# Phase 100 — next session (written end of s6, 2026-09-23)

Read the [board](README.md) status line and [UPG-001](UPG-001-THE-BREAK-CENSUS.md) §3 first. 0.3.0 still
**waits on P101** (R7, the properties panel move) — nothing here cuts the release.

## Where s6 left it

**Done and verified — UPG-001, the break census, has no `⬜ never measured` left.** Every row is in §3 with
what was read. The whole release carries **two breaks, both already migrated** (3.1 text styles → tokens,
3.6a idempotency keys); three rows are one line each in the notes (3.3, 3.4, 3.7); two are *what's new*
(3.5b, 3.8). Method for all of it: **both releases' code run side by side** on the same projects —
v0.2.4 from `git archive` into scratch, `@nodegx/*` aliased to the archived copies, identity checked by a
token only HEAD has.

- **§3.2 ports (catalog diff):** `catalog:check` exit 0 at HEAD; v0.2.4 → HEAD **0** of 3,310 ports removed,
  **0** types removed, **0** port types / 322 enum lists / 1,061 defaults changed.
- **§3.3 rules:** 5 `DiagnosticCode`s added since v0.2.4, every emitter `'warning'`; **0** `'error'` lines
  added or removed anywhere under `validation/`.
- **§3.5 newly red:** the **217 NodeGX-format projects** → 6 clean-on-0.2.4/red-on-HEAD, **every one a fixture
  built with a broken kit port** (kit types are now recognised, so their ports get checked). GAM-019's narrowing
  → **0** on that population. Both authoring gates baseline pre-existing errors; nothing else gates on them.
- **§3.4 `_variant`:** read by **no** runtime, viewer or exporter file in either release (grep + control), so it
  renders identically; the drive was not needed. What's gone is the *Preset / Size* picker. 28 nodes, 14 projects.
- **§3.8 exporter:** complete 57→62 of 217, refusals 18,272→18,157, **0** nodes newly refused. The 3 projects
  whose count rose now *report* things v0.2.4 lost silently (checked in the emitted source, one by one).

**Readings taken 2026-09-23 at `ea7f712dd`:** everything above; `catalog:check` exit 0; the whats-new feed
`200`, 463 bytes (control path `404`). **No product code changed this session** — docs only, so no test suite
was run and none was owed.

**Where the handoff chain was wrong:**
- s5 called §3.4 "the one remaining row that could turn a 🟡 into a 🔴" and said it needed the editor. It
  needed a grep: nothing reads the marker at render time.
- 🔴 **UPG-003's corpus list (built from `project.json`) holds only 22 of the 217 NodeGX projects.** Any
  census of 0.2.x projects starts from `find … -name nodegx.project.json`.
- The rule's own docblock says GAM-019 un-skipped 18 types; the catalog says **20** of 88.

**Found on the way, not ours:** `nodegx export` crashes — `Cannot access 'snapActionList' before
initialization` (`nodegx-export/src/analyze/plan.ts`, `const` at `:15450`, called at `:12613`/`:12810`/`:13011`)
— on *Landing page test V2* and three copies of it, **in v0.2.4 too**, and on the repo's own `dist/cli.mjs`.
**P18's**, not filed there yet (its board has no defects section and its handoff is its own lane's).
Also P18's: a Component Input signal forwarded into a kit node's signal is still dropped (reported now);
`_variant` shows up as a dropped parameter (noise — `PRESET_MARKERS` names the markers).

## Ordered next steps

1. **UPG-006, the part that does not wait for P101:** draft the release notes' *"your existing project"*
   section straight from UPG-001 §3 — the two migrations (with what the toast says and the `.before-0.3`
   copy), the three note-lines, the two what's-new lines. Written for someone upgrading, not for us.
   R5 is moot (board §6), so nothing blocks it.
2. `scripts/renderer-errors/budget.json` `network/whats-new-feed-404` budget `2` → `0`. The feed is live
   (re-measured above), but **run the renderer-errors gate before committing the change** — own dev stack,
   alone. A peer's `dev` stack was up all of s6 (`npm run dev:stop -- --list` first).
3. UPG-006 remainder, UPG-007 (shelf), UPG-008 (the cut) once P101 lands.

## Richard's, not the agent's

- **UPG-001 AC3:** read UPG-001 §3 (the table alone) and say, per row, whether it needs a migration, a note
  or nothing. s6's recommendation is in each row's *decision* column.
- **UPG-002 AC3:** open one of his own 0.2.x projects (a copy) in a 0.3.0 dev build and say whether the
  toast tells him what he needs.
- Whether the **20 of 193** legacy projects with a *wired* text style port keeping all their text styles is
  acceptable for 0.3.0 (not put to him as a ruling).
- 📝 Worth a look, not a ruling: a style's tokens land in two Styles-panel groups (family/size/leading under
  *Typography*, colour among the colours), not grouped by style.
