---
id: P127-BKO006-RUNONCHANGEGUESS
title: A Function node takes a run-on-change setting under a name it does not have, without a word, and keeps running on every change
status: open
severity: medium
area: "editor validation as the MCP door runs it: unknown parameters on a Function (`JavaScriptFunction`, dynamic ports) are not reported; the real names are `runOnChange-in-<input>` (`run-on-value-change.ts` `runOnChangePortName`, `simplejavascript.ts:852`)"
found: P127 BKO-006, 2026-10-27, the book club brief (REPORT.md item 5)
evidence: "MEASURED in the transcript: update_component wrote `runOnChange-title`, `-author`, `-rating`, `-status` on a Function with inputs title/author/rating/status; the write was accepted with no diagnostic, and the node still ran on every keystroke (the agent saw a false 'type the title' hint and replaced it with a Condition). READ: the runtime's port is runOnChange-in-title."
kit: mcp
owner: none
---

What a person sees: an Add form that loses what was typed, and an agent that gives up on the Function node. The
docs say "untick each input under Run On Value Change" and name no parameter. Two fixes, either enough: report an
unknown `runOnChange-*` on a Function (suggesting `runOnChange-in-<name>`), and name the parameter in the node's docs.

**2 of 3 briefs.** The shared-expenses agent met it too (REPORT.md item 12) and also replaced the Function with a Condition.
