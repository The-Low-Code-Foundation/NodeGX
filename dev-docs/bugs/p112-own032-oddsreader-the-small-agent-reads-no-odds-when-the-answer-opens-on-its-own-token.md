---
id: P112-OWN032-ODDSREADER
title: The small agent's odds reader (OWN-029 lm.mjs `confidence`) finds the answer only when `": "` arrives in one or two tokens; when the space and the quote come as separate tokens it returns nothing, silently
status: open
severity: low
area: research harness, dev-docs/tasks/phase-112-your-own-nodegx/own-029/lm.mjs (`confidence`); the copy in own-032/arm.mjs is fixed
found: P112 OWN-032 s1, 2026-10-29 (the arm's move menu, options "1".."5", run w1-puppy)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-032/runs/arm-w1-puppy/ledger.json (every `move` call has options with p null); the token dump in own-032/RESULTS.md §4
phase: P112 OWN-032
---

What happens: E2B answered `{"pick": "1"}` as the tokens `{"` `pick` `":` ` ` `"` `1` `"}`. The reader looks for a token
that ends with a quote and has a colon in it or in the token just before; here the colon is two tokens back, so it
finds no answer token and returns `null`. The agent then has no odds for that question, and the "flip to the model's
second choice" repair has nothing to flip to. Nothing reports it: the call row simply has no `conf`.

OWN-029's enums (words like "centred", "heroGround") came out with ` "` as one token, which is why its ledgers have
odds. Any enum the model opens differently (digits here) loses them.

The fix, as in `own-032/arm.mjs` `dist`: accumulate the tokens' text and start at the token after the text first
matches `/:\s*"$/`. Matters if OWN-031 carries this reader into the MCP.
