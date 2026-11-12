---
id: P18-EXP022-S4-LABELDROP
title: The React export drops a Text Input's label (useLabel), so a Sign in page shows two unnamed boxes — 153 fields in 7 templates
status: open
severity: medium
area: export / React target (`packages/nodegx-export/src/emit/component.ts`, a Text Input's `useLabel`/`label` parameters, "no style or content mapping in this slice")
found: EXP-022 session 4, 2026-10-22, the three-arm drive of todo-list (the runtime drew "Email" and "Password" above the fields; the React export drew neither)
evidence: dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/readings-react.json (D0 `fields`: `text::`, `secure::`), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/side-by-side.png (D0), dev-docs/tasks/phase-18-code-export-v2/exp-022/s4/work/react/src/pages/SignIn.tsx (the TODO comment)
---

todo-list's Sign in fields are authored `useLabel: true`, `label: "Email"` / `"Password"`, with `labelSpacing`,
`labelfontSize` and `labelcolor`. The running app draws each label above its field. The React export writes
`<input>` and a TODO comment ("the authored "label" parameter has no style or content mapping in this slice"), so the page
shows two empty boxes and nothing says which is which. A screen reader has no name for either.

**Reach (counted 2026-10-22):** 153 Text Inputs with `useLabel: true` in 7 templates: planning 38, planning-demo 36,
marketplace 35, members-area 19, gram 17, digital-bricks-training 6, todo-list 2.

**Fix (for the React session, which owns `component.ts`):** a `<label>` holding the text, tied to the input, with the label
parameters as its style, as the runtime's Text Input draws it. The Swift export does this since S4 (P18-EXP022-S4-SIGNINFIELDS).
