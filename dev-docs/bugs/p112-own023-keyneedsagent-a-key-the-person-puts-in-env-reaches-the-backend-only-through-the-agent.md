---
id: P112-OWN023-KEYNEEDSAGENT
title: "A NodeGX app's server key: the agent tells the person to paste it into `openwave/.env` and then \"tell me. I'll then load it into the backend\" — the person can't switch the feature on by themselves, where the two code-built apps read their env file on restart"
status: open
phase: P112
task: OWN-023
severity: medium
area: kit — how a function secret gets from a file the person edits into the local backend (the agent's route is an MCP tool); the kit's guidance to the agent on what to tell the person
found: P112 OWN-023 s1, 2026-10-20 (follow-up F1 on the NodeGX arm, Opus 5.5, kit 0.2.2)
evidence: followups/B-F1 first answer (sittings/1.jsonl, result 1): "open `openwave/.env` (I've already added an empty `MISTRAL_API_KEY=` line), paste the key right after the `=` with no spaces, save, and tell me. I'll then load it into the backend, which takes one step." Its sittings 2–6 (the lab's "Continue.") each restate that the key must be loaded by the agent. The bare arm (`.env`, read by `npm start`) and the harness arm (`.env.local`, restart) need no agent. NOT measured: whether a restart of the preview (which starts the backend) reads `openwave/.env` into the function's secrets — the claim is about what the person was told, and the agent's own belief. OWN-023 TABLE.md §3–4
kit: mcp
---

The person asked for a key "I'll add myself afterwards". In the NodeGX arm adding it is half the job: the other half
is an agent call. Measure first whether the preview's backend start reads the app's `.env` (if it does, the defect is
the agent's instruction; if not, it is the kit's route). Carried in OWN-023 arm B's row (C3); not fixed during the study.
