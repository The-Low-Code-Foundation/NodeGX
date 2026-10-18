---
id: P121-S19-PLACEHOLDERTYPE
title: A committed line in the export's Dropdown placeholder stops the editor's dev build from starting Electron
status: fixed
severity: high
area: nodegx-export `src/emit/style.ts` (Dropdown placeholder opacity); the editor's renderer webpack
found: P121 s19, 2026-10-16
evidence: .logs/dev.log of the s19 launch; commit 97162ee8c
regression: packages/nodegx-export/tests/the-dropdown-placeholder.test.ts
kit: core
---

`97162ee8c` (P18 EXP-008 s112, "an exported Dropdown's placeholder fades as the runtime's does") reads
`raw?.value` where `raw` is a `ParamValue` the `if` above has not narrowed to a literal for the compiler. The
package's own `tsc --noEmit -p packages/nodegx-export` passes, but the editor's renderer build (ts-loader, stricter
config) reports

```
TS2339: Property 'value' does not exist on type 'ParamValue'.
  Property 'value' does not exist on type '{ kind: "expression"; source: string; }'.
```

and `npm run dev` / `dev:debug` prints "Webpack compilation has errors - not starting Electron": **no editor starts
from source at HEAD.** Measured twice on 2026-10-16 (73 s and 80 s compiles, same error, then the stack exited).

Same family as `the-editor-test-ci-webpack-typechecks-a-sibling-packages-tests` in memory: the package's own gate
is not the gate the editor runs.

**Fixed (working tree, s19):** the line reads the literal the way the rest of the file does,
`raw?.kind === 'literal' ? raw.value : undefined`. Behaviour unchanged (the `else` branch only runs for an
undefined or literal `raw`).
