---
id: P18-EXP022-S4-SIGNINFIELDS
title: The Swift export printed every Text Input as a plain field, so a Sign in page showed the password in clear, named neither field and capitalised the email
status: fixed
severity: medium
area: export / Swift target (`packages/nodegx-export/src/emit/swift/view.ts`, the `input` role; `support.ts` `inputKind`)
found: EXP-022 session 4, 2026-10-22, reading todo-list's printed `SignInPageView.swift` before the simulator drive
fixed: EXP-022 session 4, 2026-10-22
commit: ad1845dc6
evidence: packages/nodegx-export/tests/the-same-graph-in-swift-s4.test.ts §A (A1–A3, mutants M1–M3 killed); dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/shots/swift-D0.png
---

The input printer read a Text Input's `placeholder` and whether it was a text area, nothing else. todo-list's Sign in page
has an Email field (`type: email`, `useLabel`, `label: Email`) and a Password field (`type: password`, the same).
Both printed as `TextField("", text: …)`: on a phone, two empty boxes; what is typed in the second shows in clear; the
first opens the ordinary keyboard, which capitalises the first letter of an address. The preflight filed `useLabel`,
`label`, `labelSpacing`, `labelfontSize` and `labelcolor` as "looks a phone has no counterpart for". A phone has labels.

**Fix:** `password` prints `SecureField`; `email`, `url` and `number` add `.inputKind(…)` (the keyboard, no
capitalisation or correction on an address; iOS only, so the package still builds on a Mac); `useLabel` draws the
label above the field (its font, colour and spacing from the label parameters) and gives the field
`.accessibilityLabel`; the five label parameters left the web-only list. A bound `placeholder` is read from its binding
(todo-list's "Add a task (it goes in at #4)"; the authored "Add a task" was printed before).

**Seen after the fix:** with a real password field, iOS offers "Save Password?" after Sign in, as it does for any app.
The drive presses "Not Now", as a person would.

**Reach:** 153 Text Inputs with `useLabel` in 7 templates, 13 password fields in 5. The React export drops the label
too: P18-EXP022-S4-LABELDROP.
