---
id: TS-S4-WRENDEATH
title: A raider killing the Wren on the hull you were boarding killed you too — you woke in the medbay, the boarding lost
status: fixed
severity: high
area: threadspace / `public/src/game.mjs` `wrenLost`, `unboard`
found: Threadspace s4, 2026-10-22, Richard: "I was fighting baddies when a pirate ship blew up the small ship and I died for no reason"
fixed: Threadspace s4, 2026-10-22 (uncommitted)
evidence: tests/command.json — the Wren destroyed while you are aboard the Carrion leaves you aboard with your hp; keeping her then sends you out of her airlock in your suit; a Wren shot apart under you ejects you in your suit where she was
regression: dev-docs/parked/threadspace/tests/command.json "a raider kills the Wren on the hull…", "seized and kept: with no Wren…", "a new Wren from the yard; shot apart under you…"
---

What a person sees: mid-firefight aboard, the screen says WREN LOST and you are back on the Kestrel; the fight, and the ship, are gone.

Why: `wrenLost` sent you to the Kestrel's medbay from every phase (fighter or board) and patched the Wren for 300 cr.

Fix (Richard's mechanic): the Wren dying is the Wren gone. In her, you eject in your suit where she was; aboard a hull, you are stranded
there and leave by its airlock in your suit. Either way you jet back, or order the Kestrel to pick you up from the command map. The bay
stays empty until a shipyard builds a new Wren (1,500 cr).
