---
id: P18-EXP022-S3-BOOLTEXT
title: A Text wired from a User node's Authenticated draws nothing in the React export, where the running app draws "true" or "false"
status: open
severity: low
area: export / React target (`packages/nodegx-export/src/emit/component.ts`, a Text's bound value printed as a JSX child)
found: EXP-022 session 3, 2026-10-22, the Record Desk's first two-arm run (the Swift app read "false", the React export read "")
evidence: packages/nodegx-export/tests/the-same-graph-in-swift-s3.test.ts §D (D1, D2 pin it by name); dev-docs/tasks/phase-18-code-export-v2/exp-022/s3/record-desk-two-arms.json
---

The Record Desk wires `net.noodl.user.User`'s `authenticated` into a Text. The React export prints it as
`<p className={styles.text}>{session.authenticated}</p>`. React draws nothing for a boolean child, so the paragraph is
empty signed in and signed out.

The running app draws `String(value)` for every value but `null` and `undefined` (`renderableText`,
`noodl-viewer-react/src/components/visual/Text/Text.tsx`: "`0` and `false` are legitimate things to put in a Text node"),
so it shows `true` or `false`. The Swift export reads the same binding through `JS.show`, JavaScript's `String`, and
draws `true` / `false`, as the runtime does.

**Shape:** any Text whose bound value can be a boolean at run time and is printed bare as a JSX child. `session.authenticated`
is statically boolean, so this one is certain. A Function output or a Variable printed as `{x ?? ''}` that holds a boolean
would draw nothing too; that reach was not counted.

**Fix (for the React session, which owns `component.ts`):** print a Text's bound value through the runtime's own rule,
`value === null || value === undefined ? '' : String(value)`, at least where the source can be a boolean.
