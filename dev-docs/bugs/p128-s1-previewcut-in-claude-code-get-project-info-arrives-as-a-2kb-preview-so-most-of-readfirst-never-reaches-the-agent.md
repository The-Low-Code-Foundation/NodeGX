---
id: P128-S1-PREVIEWCUT
title: "In Claude Code, `get_project_info` (61.6 KB) is saved to a file and the agent is shown its first 2 KB: `readFirst.mustKnow` lines 8–11 and the `sections` index never reach it, and in the measured round it never opened the file"
status: fixed
severity: high
area: "noodl-mcp `src/guidance.ts` (`readFirst`, built for Cline's 4,000 + 4,000 cut, P112-OWN026-GUIDANCECUT), `src/tools/read.ts` (`get_project_info` carries all six doctrines whole); Claude Code 2.1.251's large-result handling (`<persisted-output> … Preview (first 2KB)`)"
found: P128 S1 (CCN-009) AC2/AC3, 2026-10-27, two Sonnet 5.5 rounds in Claude Code on the Muddy Paws brief
evidence: "/private/tmp/p128-s1-lab2/out/muddy/agent.jsonl — MEASURED: the `call_tool get_project_info` result the agent received is 2,275 characters, `Output too large (61.6KB)`, the preview ending inside MUST_KNOW line 8 (`A value several devices change … wired in`); the agent made no call to read the saved file; `get_style_vocabulary`'s 39,716-character result in the same session arrived inline, so the limit sits between 40 KB and 61 KB. Same cut in /private/tmp/p128-s1-lab/out/muddy (round 1)."
owner: P128 Beta round, Track B (2026-10-27)
commit: 0b4898515
task: P112 OWN-026 (the guidance-cut design) / P125 CCN-009
regression: packages/noodl-mcp/tests/p128PreviewCut.test.ts (Claude Code gets the key on get_project_info and call_tool; no other client does; the answer is over 50,000 and under 80% of the raised 120,000)
---

GUIDANCECUT measured Cline (it keeps ~8,000 characters, start and end) and put the rules that cost a rebuild in the
first 4,000. Claude Code, the client a stranger from `npm create nodegx` uses, keeps less: a result over its inline
limit becomes a file and a 2 KB preview of the JSON-escaped text, about 1,800 characters of the answer. What reaches
the agent is the note and MUST_KNOW lines 1–7; the backend rules after them (`addTo`, a press taken once, a page
opened by its own URL) and the `sections` index do not, and nothing in the preview says the section names.

P128 S1 moved only its own line (the surfaces one) to second, because its AC was blocked by the cut. The general fix
is not made: `get_project_info` under the inline limit for Claude Code (the doctrines are each one `section` call
already; the answer could carry their index and not their bodies for a client that cuts), or a `readFirst` that fits
1,800 characters. Measure the limit first (between 40 KB and 61 KB in 2.1.251).

## 2026-10-27, P128 Beta round Track B: measured, and fixed through Claude Code's own door (0b4898515)

**The limit, measured.** Claude Code 2.1.251's code: a text result is persisted when its length (the sum of its text
blocks) is over the tool's threshold, `min(maxResultSizeChars, ceiling)`; for an MCP tool with no annotation that is
`min(100,000, Az=50,000)` = **50,000 characters**, and the preview is the first `$De=2,000` characters of the
JSON-serialised content array (cut back to a newline). Its MCP docs say the same ("MCP output limits and warnings"),
and name the door: `_meta["anthropic/maxResultSizeChars"]` on the tool's `tools/list` entry raises that tool's
threshold, to a hard ceiling of 500,000 (`QDe`), and replaces `MAX_MCP_OUTPUT_TOKENS` for its text.

**Neither of the two choices above was needed.** `get_project_info` and `call_tool` carry the key at 120,000, set at
`initialize` only for a client named `claude-code` (`clientApps.ts` `applyResultSizeMeta`). Cline, Claude Desktop
(`claude-ai`, `local-agent-mode-*`) and Vibe get a `tools/list` without it and otherwise identical (the spec compares
them), and the answer itself is unchanged for every client. Resident surface 8,276 / 8,280 (the gate bills name,
description and schema; `_meta` is read by Claude Code, not sent to the model).

**Measured on the product** (`claude -p --model haiku`, `--strict-mcp-config`, a copy of `templates/todo-list`, the
same prompt both arms): before (the 20:05 dist), `Output too large (61.9KB)`, 2,362 characters delivered; after (dist
rebuilt 22:02), inline, the whole 62,079-character answer. Spec on the fixture: 61,796 characters.

**Reaches a stranger** with the next `@nodegx/mcp` (0.2.9, published, does not carry it) and the `.mcpb` built from
it. If the answer passes 96,000 characters the spec goes red first: decide then (a doctrine body behind `section`, or a
raised limit with its reason).

