---
id: P128-S1-FENCEDRESULTS
title: "A stranger round's fence `Read(//Users/**)` takes the agent's own long tool results from it: Claude Code saves a result over its limit to `~/.claude/projects/<lab>/<session>/tool-results/` and shows a 2,000-character preview, so `get_project_info` (61.5 KB) reached the agent cut inside `readFirst.mustKnow`"
status: fixed
severity: medium
area: "dev tooling: `dev-docs/tasks/phase-127-the-backend-in-the-open/briefs/round.mjs` (BKO-006's three strangers) and P124's `stranger/round.mjs` it came from; fixed in the copy `dev-docs/tasks/phase-128-the-canon-everywhere/s1/round.mjs`"
found: P128 S1 (CCN-009) AC3, 2026-10-27, reading the Sonnet 5.5 round's transcript
evidence: "/private/tmp/p128-s1-lab/out/muddy/agent.jsonl — MEASURED: the `call_tool get_project_info` result is `<persisted-output> Output too large (61.5KB)` with a 2,274-character preview that ends inside MUST_KNOW line 8 (the `[surfaces]` line is line 11); the agent's next call reads the saved file (`cd ~/.claude/projects/-private-tmp-p128-s1-lab-lab-muddy/…/tool-results && python3 …`) and is refused by the round's permissions; it never reads it another way"
owner: P128-S1
task: CCN-009
---

The rounds fence the stranger from the repo and the other labs with `Read/Glob/Grep/Edit/Write(//Users/**)`. That
also covers where Claude Code puts a tool result too long to inline, which the agent is told to read. A person's
Claude Code lets it; the round did not, so every reading of a long answer in a round (`get_project_info` is the first
call of every build) measured the fence, not the product. BKO-006's three strangers ran with the same fence: their
transcripts are worth one grep for `persisted-output` before their readings of the guidance are quoted.

Fixed in P128's copy: the fence names the repo, the person's folders and the other projects' transcripts, not all of
`/Users`, and `python3` joins the shell allowlist (`cat` was already on it, so the seal is no weaker). BKO-006's and
P124's runners keep the old fence until their next round; whoever runs one copies the block from P128's.
