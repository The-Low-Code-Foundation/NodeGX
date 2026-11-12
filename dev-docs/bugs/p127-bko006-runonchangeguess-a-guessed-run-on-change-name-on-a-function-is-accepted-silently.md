---
id: P127-BKO006-RUNONCHANGEGUESS
title: A Function node takes a run-on-change setting under a name it does not have, without a word, and keeps running on every change
status: fixed
severity: medium
area: "editor validation as the MCP door runs it: unknown parameters on a Function (`JavaScriptFunction`, dynamic ports) are not reported; the real names are `runOnChange-in-<input>` (`run-on-value-change.ts` `runOnChangePortName`, `simplejavascript.ts:852`)"
found: P127 BKO-006, 2026-10-27, the book club brief (REPORT.md item 5)
evidence: "MEASURED in the transcript: update_component wrote `runOnChange-title`, `-author`, `-rating`, `-status` on a Function with inputs title/author/rating/status; the write was accepted with no diagnostic, and the node still ran on every keystroke (the agent saw a false 'type the title' hint and replaced it with a Condition). READ: the runtime's port is runOnChange-in-title."
kit: mcp
owner: Beta sweep s17 (2026-10-27)
regression: packages/noodl-editor/tests-unit/p127/run-on-change-guess.test.ts "names each guessed key, says the right one, and blocks a write the agent just made"
commit: 30cb6671c
launch: beta
---

What a person sees: an Add form that loses what was typed, and an agent that gives up on the Function node. The
docs say "untick each input under Run On Value Change" and name no parameter. Two fixes, either enough: report an
unknown `runOnChange-*` on a Function (suggesting `runOnChange-in-<name>`), and name the parameter in the node's docs.

**2 of 3 briefs.** The shared-expenses agent met it too (REPORT.md item 12) and also replaced the Function with a Condition.

## Fixed 2026-10-27 (Beta sweep s17, 30cb6671c)

The door half. New rule `function-run-on-change-unknown`: a `runOnChange-` parameter on a Function that is not
`runOnChange-in-…` is reported with the name to write (`"Check new book" has no setting "runOnChange-title", so
nothing reads it and a new "title" still runs it. … write "runOnChange-in-title".`), or the nearest script input when
the name is not one. Warning, in `AUTHORED_BLOCKING_WARNINGS`: an agent's write is refused until it writes the right
name. No benign case: the runtime builds a Function's boxes from its `in-` inputs only. Calibrated over 2,718 Function
nodes (local projects + templates): 2,805 right, 5 wrong, all five agent-written (OWN-019 Mistral driftwood).
Graded: editor spec 3/3 (2 red with the rule unregistered); `noodl-mcp/tests/p127RunOnChangeGuess.test.ts` drives
create_component, refused with both names, the corrected write taken.

Not done: the `run` input's description ("untick an input under Run On Value Change") still names no parameter.
Changing it is a node-spec sentence (spec version, both catalogs regenerated) for the half the row calls optional;
the door is where both agents went wrong. Reaches an agent with the next `@nodegx/mcp` dist.
