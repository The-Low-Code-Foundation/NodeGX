---
id: P18-S126-PROPUNDEF
title: An exported parent passes `false` for a boolean input whose source has no value yet, where the runtime delivers nothing
status: open
severity: low
area: export / an instance's boolean input fed by an untyped source (`src/emit/component.ts`, the instance's props)
found: P18 session 126, 2026-10-19, the Root Desk's first variant (EXPECTED.md, predicted, then measured)
evidence: dev-docs/tasks/phase-18-code-export-v2/s126-mounted/arms.ts (variant "the Sheet's root authored Mounted true"); EXP-011 §93.4
---

A component's root authored Mounted true, wired from its `shown` input, placed with `shown` wired from a Variable nothing
has set yet. The running app draws the component at load: a wire never delivers `undefined` (`Node.sendValue`), so the
instance's input stays unset and the root keeps its own Mounted. The exported parent prints `<Sheet shown={!!openValue} />`,
which passes `false`, so the exported component is hidden at load. After the Variable is first set, both agree.

Measured with the runtime's own nodes against the exported page (`s126-mounted/arms.ts`): the one reading of 24 that
differs after session 126, the load reading of that variant. The child's own rule is right since session 126 (an input
that is `undefined` keeps the root's authored Mounted); the parent turns `undefined` into `false` before it gets there.

Fix, its size: where a boolean prop is coerced from a source that may be undefined, keep the undefined
(`x === undefined ? undefined : !!x`), at least where the child reads that prop into a Mounted authored true. Small in
code, but it touches every boolean prop passed from an untyped Variable; read the emitted diff of the templates first
(planning's sheets are the shape, though their parent's feed is a refused Function today).
