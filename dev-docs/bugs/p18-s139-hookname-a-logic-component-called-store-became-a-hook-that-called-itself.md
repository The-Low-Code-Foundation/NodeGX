---
id: P18-S139-HOOKNAME
title: A logic component whose hook name equals a hook the emitted code imports (`/Logic/Store` → `useStore`) shadowed the import in its own file and called itself until the stack overflowed
status: fixed
severity: medium
area: export / hook naming (`src/analyze/plan.ts`, `plan.file.symbol` for `plan.hook`)
found: P18 session 139, 2026-10-22, the Store Desk's first export arm run (RangeError: Maximum call stack size exceeded)
fixed: P18 session 139, 2026-10-22; EXP-011 §109
commit: 63ed1a9bf
evidence: dev-docs/tasks/phase-18-code-export-v2/s139-persisted-store/README.md
regression: packages/nodegx-export/tests/a-persisted-store-travels.test.ts
---

EXP-021 names a logic component's hook `use<Name>`. A component called "Store" became `export function useStore(…)`
in a file that imports `useStore` from `@nodegx/core/react` to read the store. The local declaration shadows the import,
so the hook's own store read called the hook. The page crashed on its first render.

Fixed: a hook name that equals a `use…` name the emitted code imports (react, react-router, `@nodegx/core/react`, the
emitted `src/lib/*`; `IMPORTED_HOOK_NAMES`) is `use<Name>Logic`. No template was hit: their logic components are named
for what they do ("App store" → `useAppStore`). The Store Desk was the first.
