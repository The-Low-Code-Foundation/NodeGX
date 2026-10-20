# The templates' exports build (P18 session 125, 2026-10-19)

The measurements behind EXP-011 §92 (P18-S122-TPLBUILD). Run the `.ts` from `packages/nodegx-export` with
`../../node_modules/.bin/ts-node -P tsconfig.json --transpile-only <script> <exportSrc> …`; a control copy of the export at
the base is `git archive <base> packages/nodegx-export/src` unpacked beside it (remove it before the whole suite:
`hls006-every-listener` reads every package folder).

| script | what it reads |
|---|---|
| `dump.ts <src> <out.json>` | every diagnostic of every template's export (`TDIR=` another templates folder, `ONLY=` names, `EMITDIR=` writes the emitted files) |
| `emitfx.ts <src> <outDir>` | the hls001 corpus (`tests/fixtures`) emitted to files, notes and report included: what a golden move will be, before regenerating |
| `movecheck.py <before> <after>` | each `src/functions/**` file's wrapper is in the component it left, byte for byte but `export`, and the components gained imports only |
| `rmcheck.py <before> <after>` | every line a component lost belongs to a wrapper that moved |
| `nocheck.ts <emitDir>` | the emitted apps typechecked with the Function files' `// @ts-nocheck` taken off: what the directive hides |
| `../s124-deadrow/tplbuild.ts` | all 19 shipped templates (`ROOTS=` primary's `templates/` and the two written out by `../s119-fnchain-measure/materialize.ts`) |
| `../s119-fnchain-measure/dispdiff.ts` | every node's disposition, the base against the tree |

## The result

The gate, 16 tracked templates: **189 → 0**. All 19: **203 in 12 → 1 in 1** (nightbook, P18-S125-STYLENULL).
`dispdiff.ts`: templates 19 projects, 13,432 nodes, 0 changed; corpus 226 projects, 27,789 nodes, 0 changed.
`nocheck.ts`: the 55 moved template wrappers hide exactly the 7 body errors (TS7006 6, TS7053 1); the corpus's 9 hide none.
