---
id: P108-IW7-WSRESET
title: The Workshop on her land wipes her program at every "Got it" (and at the win)
status: fixed
severity: high
area: template bot-garden / Workshop on her land (Read family → Land request → Start world)
found: P108 IW-007 s6, 2026-10-01 (drive-iw007-touch.js, the first time anyone taught on the land by touch)
evidence: dev-docs/tasks/phase-108-the-island-works/IW-007-BUILDING-AND-ANIMALS.md §4 "Session 6"
---

A child opens the Workshop on her land and taps a block in the drawer. The block is placed and its first-use card
opens; she taps "Got it" and the block is gone. Every later block that has a card goes the same way, and the win
card would have reset under her too. On a request plot the same taps keep the block.

Why: "Got it" writes her cards seen to her profile, so Read family runs again. Its `land` output is a NEW object on
every read (a request plot's is `null`, and `null === null` publishes nothing). The Workshop's `Logic/Land request`
re-ran on it, published a new requests list, and `Logic/Start world` (which re-runs on `requests`) ran its reset:
the program cleared, the world laid again, the mode back to Drive.

Fixed: Read family also outputs `landText` (the land as JSON text); the Workshop wires that into Land request, which
parses text or takes an object. A text the same as before is not published again, so a write that leaves her land as
it was restarts nothing. Row: `iw007Touch.test.ts` "Read family gives her land as TEXT …"; drive: `drive-iw007-touch.js` PIP/COBBLE.
