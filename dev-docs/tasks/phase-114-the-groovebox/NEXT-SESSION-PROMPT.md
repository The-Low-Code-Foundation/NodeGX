# Phase 114 — next session

**Written 2026-10-06, end of the scoping session (s0).** Read [README.md](README.md) first.

## Built vs driven

| task | built | driven |
|---|---|---|
| prototype GX-16 v2 | ✅ `prototype/gx-16.html` (lead synth, note grid, parts bin, inspector, dragging) | ✅ headless Chrome over CDP, 2026-10-06: plays, all 4 "Try this" tasks, drag, inspector, remove, 0 console errors, 390 px no scroll. Not heard by a person in this session. |
| GRV-000 … GRV-008 | 📋 | — |

## Gate readings

None run; this session changed no code outside the phase folder.

## Rulings

All six made 2026-10-06 (README §8): specs required for library kits, counted for personal ones; kits are npm packages
a project lists; the audio kit wraps Tone.js; the strangers keep the todo app; the name is GX-16; songs export as WAV.

## Start here

1. GRV-001 and GRV-002 do not wait for P112. Start with GRV-001: read `packages/nodegx-node-spec/src/nodes/index.ts`
   around `:100` and `:207`, then list every reader of the spec map before changing its lookup.
2. GRV-000 is small and can run beside either.
