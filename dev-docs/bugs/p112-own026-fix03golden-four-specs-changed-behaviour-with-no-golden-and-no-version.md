---
id: P112-OWN026-FIX03GOLDEN
title: "`golden.js --check` is red on four specs at HEAD: Button and Text Input gained repeatWhileSaving at the same version, and DbModel2 and SetDbModelProperties are at v5 with no `changes` entry and stale goldens"
status: fixed
severity: medium
area: node-spec / NSP-010 version rule (`scripts/node-spec/golden.js --check`), the specs `src/nodes/button.ts`, `text-input.ts` (cb7e0d6e4, OWN-026 FIX-03) and the DbModel2 / SetDbModelProperties specs
found: P107-S83-SENDFORM fix, 2026-10-24, running `node scripts/node-spec/golden.js --check` at cline-dev HEAD (before any of that fix's files): 8 problems over 125 specs
evidence: "✗ net.noodl.controls.button: behaviour changed at version 5 — input repeatWhileSaving added. Bump `version` and add its `changes` entry"; the same for textinput at version 8; "✗ DbModel2: version 5 has no `changes` entry"; "✗ SetDbModelProperties: version 5 has no `changes` entry"; each of the four also "the golden file is stale"
---

NSP-010's rule is that a behaviour change is a version, a trace diff and a migration answer. Four specs moved without
one: FIX-03 added `repeatWhileSaving` to Button and Text Input at their existing versions, and DbModel2 and
SetDbModelProperties are at version 5 with no `changes` entry for it. All four golden files are stale. While the check
is red, a fifth spec that moves without a version is one more line in a red list nobody reads.

Fix: for each, run `node scripts/node-spec/golden.js --diff --type <type>`, read what moved, bump the version where
behaviour moved, write the `changes` entry (says, row, migration), and write the goldens.

**Fixed (the Beta sweep s9, 2026-10-25), as the row says.** Read each diff first: Button and Text Input moved only by
the `repeatWhileSaving` port; DbModel2 and SetDbModelProperties were already at v5 (f3d2a66e9 and cb7e0d6e4), their
history in comments with no `changes` entry. So:
- Button 5 → **6**, Text Input 8 → **9**, each with `repeatWhileSavingChange` (`src/nodes/repeat-while-saving.ts`):
  says the guard (a press that started a save takes no second one until the backend answers), commit cb7e0d6e4,
  migration `{ parameter: 'repeatWhileSaving' }` — the input that brings the old behaviour back.
- DbModel2 v5's entry (row P112-OWN026-RECORDBYIDMEMORY, commit f3d2a66e9, migration none: only an app that opened a
  record by its Id behaves differently, and it now shows it).
- SetDbModelProperties v5's entry (OWN-026 FIX-03 A, cb7e0d6e4, migration none: Add To starts unset, and an unset Add
  To saves exactly as before).
- The four goldens written (`golden.js --type …`, 289 scenarios).

Graded: `node scripts/node-spec/golden.js --check` → *"125 specs, 9614 scenarios fresh; version rule held against
HEAD; 30 spec(s) with a history"* (was 8 problems); node-spec tsc clean.
