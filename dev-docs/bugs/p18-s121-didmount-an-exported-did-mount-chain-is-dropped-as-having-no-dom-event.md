---
id: P18-S121-DIDMOUNT
title: An exported element's Did Mount chain was compiled and then dropped as having "no DOM event equivalent"
status: fixed
commit: aaef09c6e
severity: medium
area: export / Did Mount (every visual node)
found: P18 session 121, 2026-10-17, emitting ticked-desk for P18-S119-TICKEDRUN (a Page's Did Mount into a Function's Run)
evidence: dev-docs/tasks/phase-18-code-export-v2/EXP-011-PICKER-COVERAGE.md §88; packages/nodegx-export/src/emit/component.ts `handlerAttrs` (HEAD: `EVENT_ATTRS` has no `didMount`, so the handler the attach pass compiled was dropped, reported) and `mountChains`; tests/the-ticked-input-runs-it-again.test.ts
---

The attach pass treats Did Mount as an element event and compiles its chain as the element's handler; the target is
marked exported. The emitter then finds no DOM attribute for `didMount` and drops the chain ("signal page.didMount has
no DOM event equivalent — dropped, reported"). The running app sends Did Mount once per mount from the element's own
`componentDidMount`, children before their parent. A Group that is a Page's only child (merged into the page div,
TARGET-OUTPUT §2) lost its Did Mount without even that note: 3 in the corpus.

**Reach, measured on HEAD:** 23 dropped Did Mount handler sets in 5 shipped templates (nightbook 7, rocket-school 7,
star-class 7, planning 1, todo-list 1). After the fix: 20 mount effects print, 4 are refused by name (nightbook: the
element is mounted by a value), 0 dropped. todo-list's Sign in now sends a signed-in person on to the list, as the
running app does.

**Fixed in session 121:** each such chain is a once-guarded mount effect (the ref keeps StrictMode's second mount from
sending it twice), in post-order, after the ticked runs (the viewer runs an arrival's run before a Did Mount's Run).
Refused by name where the element or one above it is mounted by a value; dropped with a note where one is authored
Mounted false.
