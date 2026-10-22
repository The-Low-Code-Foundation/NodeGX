---
id: P18-EXP022-S5-NOROUTE
title: A Swift export of a project with no routed page did not build — an empty `Route` enum held by a `@Published` with no value crashed the Swift compiler
status: fixed
severity: low
area: export / Swift target (`packages/nodegx-export/src/emit/swift/emitSwift.ts`, `Router.swift`)
found: EXP-022 session 5, 2026-10-22, the first build of the graph scenarios' package (five probe components, no page)
fixed: EXP-022 session 5, 2026-10-22
evidence: packages/nodegx-export/tests/node-spec-graph-swift.test.ts V6; the first build's crash, `Assertion failed: (hasValidInsertionPoint())` in SILGen of `AppRouter.current` (Swift 6.2.4), is the mutant
---

`Router.swift` prints one `Route` case per routed page and starts `current` at the router's start page. A project with
no routed page (a component library, or the graph scenarios' probes) printed `public enum Route: Hashable {}` and
`@Published public var current: Route` with no value. Swift 6.2.4 did not report the missing value: SILGen asserted
and the compiler crashed (`emit-module command failed due to signal 6`). A project with pages and no start page left
`current` without a value the same way.

**Fix:** with no routed page the enum has one case, `none`, that draws nothing; `current` always starts at a case (the
router's start page, else the first). A project that has pages prints as before.
