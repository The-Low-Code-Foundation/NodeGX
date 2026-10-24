---
id: P112-OWN026-FIX03GOLDEN
title: "`golden.js --check` is red on four specs at HEAD: Button and Text Input gained repeatWhileSaving at the same version, and DbModel2 and SetDbModelProperties are at v5 with no `changes` entry and stale goldens"
status: open
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
