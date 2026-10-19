---
id: P18-S125-STYLENULL
title: An Expression's answer bound to a style colour keeps its load-time null and 0, and the exported app's tsc refuses it
status: open
severity: low
area: export / a style sink fed by an Expression (`src/emit/component.ts`, the inline `style={{ … }}` binding)
found: P18 session 125, 2026-10-19, typechecking all 19 template exports after P18-S122-TPLBUILD's classes reached 0
evidence: dev-docs/tasks/phase-18-code-export-v2/s124-deadrow/tplbuild.ts over primary's templates/ (nightbook); EXP-011 §92.4
---

The last type error in the 19 shipped templates' exports, in nightbook only (not tracked, so not in the gate):

`TS2322 src/components/Day2.tsx:52: Type '0 | "transparent" | "var(--primary)" | null' is not assignable to type
'BackgroundColor | undefined'.`

The page binds `style={{ backgroundColor: Lit_when_pickedOut }}`, and `Lit_when_picked` is an Expression wrapper: it keeps
`null` for a NaN at load and answers `0` for a throw (the runtime's own `expression.ts`), so its static type carries both.
React drops a `null` style value as it drops `undefined`, and the browser ignores a `0` colour, so the running page draws
what the runtime draws; only the build stops (`tsc -b && vite build`).

Fix, its size: at a style sink, fold an Expression's answer the way a text sink folds it (`?? undefined`, and a number
answer into a colour as the runtime's style setter would take it), or cast it to the CSS property's type as the lifted
push does since session 125 (`castTo`). Read the runtime's style setter for a `0` first. Small; one template.
