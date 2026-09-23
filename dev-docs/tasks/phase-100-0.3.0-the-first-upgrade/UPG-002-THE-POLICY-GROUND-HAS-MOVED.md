# UPG-002 — The compatibility policy's ground has moved

**Opened 2026-09-22** with the phase, on **R2** (✅ *"Visible report at load, migrate where
recoverable"*).
**Status: 🟡 HALF DONE s1 — the amendment is written into the policy. The surface it requires is
`⬜ never measured`.**

## 1. The person sentence

> **Someone writing a spec today reads one file and knows what a break owes the people who already
> have a project — and cannot accidentally inherit a premise that expired four releases ago.**

## 2. What was wrong, and it was not an opinion

[`COMPATIBILITY-POLICY.md`](../../reference/COMPATIBILITY-POLICY.md) is *"Binding on every task, in
every phase"* and is referenced from `.clinerules`, `CLINE-INSTRUCTIONS.md`, `TASK-TEMPLATE.md`,
`dev-docs/README.md` and `REVIVAL-PHASES-INDEX.md`. It ends: *"This file is the single source; do not
restate the policy elsewhere."*

**It stated a falsehood as its ground.** *"There are zero NodeGX projects in the wild"* and
*"Therefore the only projects that exist today are ours"* — true 2026-07-30, false since `v0.2.2`.
And the clause resting on that ground, point 2 of *"What this does NOT waive"*, said forward
compatibility *"costs nothing"* **until we ship publicly**. We have shipped four times.

🔴 **The failure mode this creates is a reflex, not a mistake.** `TASK-TEMPLATE.md` tells every task
author, under a heading called *"Not a constraint: legacy projects"*, not to write "existing projects
must keep working" and not to narrow scope to protect them. Read against a policy whose premise says
nobody has a project, that correctly waives Noodl 2.x. Read in September 2026 it also quietly waives
**our own users**, which the policy never intended and explicitly forbids.

## 3. What was built s1

✅ **A dated amendment at the top of the policy**, carrying R2's ruling verbatim, and stating what a
spec being written now owes:

1. the protected population is **`0.2.x` NodeGX projects** — other people's, in our format; pre-NodeGX
   files **stay waived**, because the fresh start was never about our own format;
2. a break **ships with its conversion where the data is recoverable**, and "recoverable" is a
   measurement;
3. where it is not, **the project opens and tells the person, on screen** — 🔴 a `console.warn`, a
   log line or a release note **does not satisfy this**;
4. *"ship the correct behaviour and record the break"* still stands. **A break is still allowed.
   Silence is not.**

✅ **And three inline markers**, because an amendment at the top does not reach a reader who lands
mid-file from a search: point 2 of *"What this does NOT waive"* now says the clause **has fired**,
and both bullets of *"Who actually has a project"* that assert an empty installed base are marked
**SUPERSEDED**, kept verbatim because the rest of that section reasons from them.

⚠️ **Nothing was repealed and nothing was rewritten.** The fresh start, the waiver list, the
best-effort import promise and the table of reversible compromises are untouched.
[[a-wholesale-write-over-a-shared-file-is-an-unperformed-merge]] — the file was clean and unmodified
since 2026-07-30 when this was written, checked before the edit.

## 4. ⬜ What is left, and it is the harder half

**⬜ never measured — the surface that shows the report.** R2 requires that a project *"opens and
says so on screen"*. Nothing in the editor does that today.

- `views/migration/MigrationWizard.tsx` and `src/editor/src/models/migration/`
  (`MigrationSession.ts`, `MigrationNotesManager.ts`, `AIMigrationOrchestrator.ts`) exist — **built
  for a different job**, the AI-assisted legacy import. `ProjectPatches/runOnValueChangeMigration.ts`
  and `services/ProjectStructure/ProjectMigrator.ts` are the closest thing to a load-time patch that
  has actually shipped.
- 🔴 **Whether any of them is the right home is a measurement this row owes, not an assumption.**
  Read what each one is triggered by and what it draws before proposing one.
  [[measure-the-artefact-before-believing-the-task-file]]
- The first consumer is **UPG-003** (text styles → Looks on load, R3). If UPG-003 builds its own
  bespoke report, R2 is satisfied once and the next break starts from nothing — so the seam matters
  more than the first use of it.

## 5. Acceptance criteria

1. ✅ The policy states what a break owes, in Richard's words, with the date and the ruling's origin.
2. ✅ A reader arriving at the superseded premise from a search is told it is superseded, at that
   spot.
3. ⬜ **Person-verifiable:** Richard opens a 0.2.x project that needs a migration in a 0.3.0 build
   and **sees on screen** what changed and what could not be carried — no console, no log, no notes.
4. ⬜ The report surface is named from a reading of the existing migration code, with the reason the
   others were rejected.
5. ⬜ Demonstrated failing: with the conversion disabled, the same project open shows the
   cannot-carry report rather than nothing.

## 6. Out of scope

- **Re-opening the fresh start.** Pre-NodeGX imports stay waived; §3 point 1.
- **Restating the policy in this phase.** The policy file is the single source and says so. This file
  records what was done to it and what remains.
