---
id: P107-S93-NOTANAME
title: The Problems panel wraps an instruction in "did you mean" — "did you mean “Either type a name into this node's "Accessible Name" — …”?" and "did you mean “useLabel: "true"”?"
status: open
severity: low
area: editor / Problems panel row text (`packages/noodl-editor/src/editor/src/views/panels/ProblemsPanel/diagnosticText.ts`); the rules that put a sentence or a setting in `suggestion` (`dialog-without-name`, `inactive-conditional-parameter`)
found: P107 s93, 2026-10-12 — measuring the reach of P107-S93-DIDYOUMEAN
evidence: `npm run validate:project -- <copy of Erleah-2-react19> --json` — of the 2,677 diagnostics with a `suggestion`, 220 do not name it in the message, and none of the 220 is a name: dialog-without-name 128 (a whole sentence of advice), inactive-conditional-parameter 92 (a setting, `useLabel: "true"`)
---

`diagnosticText` frames every suggestion the message has not already said as `— did you mean “…”?`. For these two rules
the suggestion is an instruction, so the panel shows a question in quotes around a paragraph of advice, or a setting
written as code.

Not fixed in s93: it owes words (the content-authoring skill), not a condition — e.g. the suggestion shown as its own line
with no question, or the two rules moving their advice into the message. The agent reads these through JSON (`suggestion`)
and is not affected.
