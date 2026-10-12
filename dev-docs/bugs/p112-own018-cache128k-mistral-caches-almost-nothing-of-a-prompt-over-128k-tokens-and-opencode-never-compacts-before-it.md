---
id: P112-OWN018-CACHE128K
title: "Mistral Large 4 caches 70% of a prompt under ~128k tokens and 5% of one over it; OpenCode takes Large 4's context as 1,048,576 (models.dev) and never compacts, so most of a build's steps are paid at the uncached price"
status: open
severity: medium
area: harness / OpenCode + Mistral (not ours); kit mitigation candidate in create-nodegx (an opencode.json carrying the limit, as it carries .vibe/config.toml)
found: P112 OWN-018 s2, 2026-10-12 (quiz run 1, OpenCode 1.19.0, mistral-large-4; recording proxy record-proxy.mjs)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
---

Run 1 cost $2.26 for 28 billed steps. Split by prompt size (input + cache read, OpenCode's database):

| prompt | steps | steps with a cache hit | input cached |
|---|---|---|---|
| under 128k tokens | 12 | 8 | 70% |
| over 128k tokens | 16 | 1 | 5% |

The largest hit of the round was 128,492 tokens. A recording proxy between OpenCode and api.mistral.ai showed three
consecutive requests over 128k where each body extends the previous one exactly (no prefix change): cached 0, 1,516,
1,516 tokens. So the miss is Mistral's, by size, not OpenCode changing the prompt. (Separately, a tool-list change
does move the prefix: the request after `open_project` re-listed 15 → 40 tools and diverged at character 4,340 —
one miss per reveal, see LISTCHANGED.)

OpenCode compacts a session near the model's context limit, which models.dev gives as 1,048,576 for
`mistral-large-4`; a build never gets there, so it never compacts. The person's `opencode.json` can override it
(`provider.mistral.models["mistral-large-4"].limit`, read by `opencode models --verbose`). OpenCode 1.19.0 sends
`max_tokens = min(limit.output, 32000)` and compacts once a step's total reaches `context − that`; the first value
tried, `{context: 128000, output: 16384}`, cut Mistral's long steps off at 16,384 (finish `length`) and ended two runs.
The kit now writes `{context: 150000, output: 32000}`.

Not ours to fix in Mistral or OpenCode. Ours to decide: whether `create-nodegx` writes that `opencode.json`, as it
writes `.vibe/config.toml` for Vibe.
