---
id: P121-TWO003-SCRIPTCOMPILE
title: The MCP door writes a Function whose script does not compile, and says nothing until the function runs
status: open
severity: medium
area: mcp / authoring validation (Function's `functionScript`; `packages/noodl-editor/src/editor/src/validation/`, which the door runs on every write)
found: P121 TWO-003 s4, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §7.5
---

An agent that writes a Function node with a syntax error in its script is told the write succeeded. The first
person to run that function gets "That could not be done."; the reason is only in the runtime's console, as
`function/script-not-compiled`.

Measured building the marketplace template (`npm run template:marketplace`, which writes every component through the
door's `create_plan` / `apply_plan`): `saveSeller`'s script held `/^https?:\/\//` inside a TypeScript template
literal, which reached the script as `/^https?:///`, so the rest of the line became a comment and the next `if` was a
syntax error. The door raised exactly the same diagnostics as for the version that compiles (89 info
`dynamic-port-skipped`, 2 info `gate-starts-shown`, 12 info `unknown-type-check-skipped`, 6 warning
`variable-in-repeated-component`, nothing else). The drive found it: the backend logged
`[noodl] JavaScriptFunction (/#__cloud__/saveSeller): The script could not be compiled: Unexpected token 'if'
[function/script-not-compiled]` on the first save.

The door already compiles a script FILE before writing it (`packages/noodl-mcp/src/tools/scriptTools.ts`
`scriptSyntaxError`, `new Function(...)`, "Nothing was written."). An inline Function script gets no such check:
`functionScript` appears in the editor's validation only for its ports (`validation/functionPorts.ts`).

Reproduce: through the door, create a component with a `JavaScriptFunction` whose `functionScript` is
`if (/^a:///.test(x)) y();` followed by a line `if (x) {}` (the `//` comments out the
rest of the first line, leaving `if (/^a:/` open); the write is accepted. Run it in a preview: `function/script-not-compiled`.

Fix, proposed: one validation rule that compiles each Function's script the way the runtime does
(`new AsyncFunction('Inputs', 'Outputs', 'Noodl', 'Component', script)`, `simplejavascript.ts` :944-945, which is
already a parse-only check) and raises an error with the line, on every write and in `validate_project`. Small.
