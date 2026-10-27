---
id: P128-BETA-HOSTEDCLICKRACE
title: check:hosted aborted at "See it on the map" (TypeError reading 'click' of null) when the panel re-rendered between the gate's wait for an element and its separate click
status: fixed
severity: low
area: "nodegx-studio `editor/hosted-check.mjs` `click(sel)`: `until(!!querySelector(sel))`, then a second `querySelector(sel).click()` in another evaluate"
found: P128 Beta round, Track A, 2026-10-27, running check:hosted on the backend-map 0.1.4 pin
evidence: "MEASURED: run hosted-10 (nodegx-studio 8afa284's tree before the fix) ended after 8 checks: `FAIL the gate ran to the end — TypeError: Cannot read properties of null (reading 'click') at <anonymous>:1:96`, right after the BKO-002 map section; the next run on the same tree PASS 36/36. P127 s9's commit b6d0331 reports the same once in thirteen runs (\"a click whose element re-rendered between the wait and the click\"). One of twelve runs this session."
regression: none (a gate's own race; every hosted check run after the fix goes through the new click)
owner: P128 Beta round, Track A (fixed, nodegx-studio 8afa284)
launch: none
---

What a person sees: nothing. The gate's helper waited for the element in one evaluate and clicked it in a second;
a panel that redraws itself in between (the map's frame replaced, Privacy's rows drawn again) left the second query
empty, and the whole gate stopped with every later section unrun.

Fixed in the gate: `click(sel)` finds and clicks the element inside the same evaluate, retried until it is there.
`check:hosted` 36/36 on the next run with the fix (`hosted-12`).
