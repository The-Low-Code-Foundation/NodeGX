---
id: P133-DIG002-HOOKAFTERDEATH
title: In The Dig, a grappling hook still in flight when you died caught on arrival and pulled you out of where you came round
status: fixed
commit: richardosborne14/dig 74c948d (private repository; the game moved there in DIG-001)
severity: medium
area: the Dig (private repo) — `public/src/weapons.mjs` (`stepHook`, new `dropHook`), `public/src/game.mjs` (`respawn`, `__dig.teleport`, `__dig.toRoom`)
found: P133 DIG-002 s1, 2026-11-03, the phone drive's "looking at the lectern, Use appears (Read)" failing twice after the ship moved the spawn
evidence: Before: a 30 s wait for the Use button still failed; the screenshot showed the player against rune stone 62 m down instead of at the lectern. The drive had fired the hook just before teleporting into the room; `stepHook` calls `player.grapple(target)` when a hook in its 'out' phase reaches its end, wherever the player is by then, and `respawn()`/`teleport` only cleared `player.hook` (a hook already caught), not `hand.hk` (one in flight). After: ship drive 7/7 with the new check; with `respawn()` put back to `player.hook = null` alone, that check FAILS (6/7); phone 20/20.
---

The hook flies at 110 blocks a second, so the window is short (a throw at something 20–48 blocks off, then death
within half a second), but in play it is a fall or a lava death mid-climb, and then you come round in the med bay and
get yanked back across the map towards the rock you were climbing. The same hole let a drive's teleport be undone by a
hook thrown in the step before. `hand.dropHook()` lets any hook go, flying or caught, on coming round and on every
drive teleport.

The regression lives in the private repository (`tests/ship.json`, "a hook still in flight when you die does not pull
you out of the med bay"), so it is named here rather than in a `regression:` header, which this ledger resolves to a
path in NodeGX.
