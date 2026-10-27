---
id: P128-S1-PREVIEWCUT
title: "In Claude Code, `get_project_info` (61.6 KB) is saved to a file and the agent is shown its first 2 KB: `readFirst.mustKnow` lines 8–11 and the `sections` index never reach it, and in the measured round it never opened the file"
status: open
severity: high
area: "noodl-mcp `src/guidance.ts` (`readFirst`, built for Cline's 4,000 + 4,000 cut, P112-OWN026-GUIDANCECUT), `src/tools/read.ts` (`get_project_info` carries all six doctrines whole); Claude Code 2.1.251's large-result handling (`<persisted-output> … Preview (first 2KB)`)"
found: P128 S1 (CCN-009) AC2/AC3, 2026-10-27, two Sonnet 5.5 rounds in Claude Code on the Muddy Paws brief
evidence: "/private/tmp/p128-s1-lab2/out/muddy/agent.jsonl — MEASURED: the `call_tool get_project_info` result the agent received is 2,275 characters, `Output too large (61.6KB)`, the preview ending inside MUST_KNOW line 8 (`A value several devices change … wired in`); the agent made no call to read the saved file; `get_style_vocabulary`'s 39,716-character result in the same session arrived inline, so the limit sits between 40 KB and 61 KB. Same cut in /private/tmp/p128-s1-lab/out/muddy (round 1)."
owner: none
task: P112 OWN-026 (the guidance-cut design) / P125 CCN-009
regression: packages/noodl-mcp/tests/p128CanonPin.test.ts "surfacesDoctrine quotes the canon sections whole, and readFirst says the MUST_KNOW line and the section" (pins the surfaces line second, inside the preview; the general fix has none yet)
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
