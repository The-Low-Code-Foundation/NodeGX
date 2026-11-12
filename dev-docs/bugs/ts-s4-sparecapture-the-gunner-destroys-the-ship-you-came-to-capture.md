---
id: TS-S4-SPARECAPTURE
title: The Kestrel's gunner shot the Carrion apart before you could board her, and kept firing on a hull you were hacking or standing in
status: fixed
severity: high
area: threadspace / crew AI (`public/src/ai.mjs` `crew`; `game.wontShoot`; `orders.mjs` `prey`)
found: Threadspace s4, 2026-10-22, Richard: "I had to make my gunner stand down because otherwise they just fire on the ship and blow it up before I can take it over"
fixed: Threadspace s4, 2026-10-22 (uncommitted)
evidence: tests/command.json — with the capture job the Carrion arrives spared; 500 m off, the gunner picks nothing; stop sparing her on the map and the gunner opens up; "hold fire" picks nothing
regression: dev-docs/parked/threadspace/tests/command.json "with the capture job…", "the Carrion 500 m off…", "'hold fire' on the Kestrel's plan…"
---

What a person sees: you fly to Cinder Reach to take the Carrion and Dag destroys her; the only way to stop him is to take him off the turret.

Why: the gunner fired at your target or the nearest hostile, with no notion of a ship you wanted whole, nor of the hull you were hacking
or standing in.

Fix: a weapons stance per ship on the command map (fire at will, return fire, fire on one ship only, hold fire), a "spare her" mark no gun
of yours fires on, and three defaults: the ship of an active capture job arrives spared, and the hull you are hacking or boarding is never
fired on.
