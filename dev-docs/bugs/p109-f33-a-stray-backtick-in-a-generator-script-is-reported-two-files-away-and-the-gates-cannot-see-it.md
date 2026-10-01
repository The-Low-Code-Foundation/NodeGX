---
id: P109-F33
title: A stray backtick or `${` in a generator's template-literal script breaks the build with an error two files away, and the backtick gates can never see it
status: scheduled
phase: P109
task: ISL-023
severity: low
area: tooling / template generator (backtick gates)
found: P105 (README:134-135), recurred P108 s4, 2026-09-30/10-01 (audit P109 F33)
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/AUDIT-2026-10-01.md §1 F33; ISL-023 §2
---

A backtick anywhere in a template-literal script, comments included, ends the generated file early, and the error
names something two files away. It recurred in P108 s4 although every brief warned of it. A `${name}` in a comment is
worse: if `name` is in scope, the generated script silently contains its value.

**Where:** the gates that claim to guard it check the **produced** string — `script.includes('`')` /
`script.includes('${')` at `packages/noodl-mcp/tests/cg002Engine.test.ts:1252` and `cg005Olive.test.ts:830` — but an
unescaped backtick in the source never reaches the produced string, and an unescaped `${x}` becomes `x`'s value. The
gates are blind to the defect they name. 184 multi-line template literals in 21 generator files are exposed.
Re-read at HEAD `d2b2f0101`.

**Proposed:** a source-level scan of the generator files (an unescaped backtick or `${` inside a script literal,
reported at its file:line), replacing the produced-string gates. Small. ISL-005 (shared code) makes it rarer.
