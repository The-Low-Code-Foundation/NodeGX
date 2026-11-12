---
id: P18-S139-MACHINELOCAL
title: A States machine's local was not reserved before the store-key locals were named, so bot-garden's `renderer` machine and its persisted store's `renderer` key both became `const renderer` (TS2451 ×4)
status: fixed
severity: low
area: export / the emitter's local names (`src/emit/component.ts`, `reserved` before `storeKeyLocals`)
found: P18 session 139, 2026-10-22, `tplbuild` after bot-garden's persisted store was emitted
fixed: P18 session 139, 2026-10-22; EXP-011 §109
commit: 63ed1a9bf
evidence: dev-docs/tasks/phase-18-code-export-v2/s139-persisted-store/README.md, tplbuild.json
regression: packages/nodegx-export/tests/a-persisted-store-travels.test.ts
---

A store-key read's local is the key itself, unless that name is reserved. The state rows and the props are reserved
before it. A States machine's local (`plan.statesMachines[].local`, allocated in the plan) was not, so bot-garden's
Island World and Play declared `renderer` twice: once for the machine labelled "renderer", once for `useStore(garden,
(s) => s.renderer)`. The collision was unreachable while the store was refused (it persists); session 139 emitted it.

Fixed: the machines' locals are reserved with the state rows. `tplbuild`: bot-garden 4 → 0.
