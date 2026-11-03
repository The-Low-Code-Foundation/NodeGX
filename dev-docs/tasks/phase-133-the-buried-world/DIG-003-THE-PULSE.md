# DIG-003 — The pulse

**Phase:** [133](README.md). **Depends on:** DIG-001. **Round:** 7. **Scope:** [SCOPE §4](SCOPE.md).

> "Maybe it could be like a screen you hold up in front of yourself and launch the sonar thing and it shows different
> coloured blobs in the area in front of you … Or it's like a HUD thing where you send out the wave and you see fuzzy
> coloured blobs in front of you where there's cavities … but only a fuzzy vague indicator." — Richard, 2026-11-03

## What

The HUD version: hold, release, a ring ripples out through the rock, fuzzy glows appear in the rock where it is
hollow. Ship kit, there from the first minute.

- **Reach:** a cone about 100° wide in front, about 28 blocks; a weak sphere of 8 blocks all round. (DIG-007's tuning
  finds raise it later; leave a `reach` setting.)
- **Glows** appear as the ring reaches them (near first), fade over about 6 s; size and wander grow with distance; no
  outlines, no labels. Five colours: plain hollow, water, lava, **built** (any of their blocks or a site's), **a
  chamber with your task** (a slow violet pulse; DIG-012 fills it; until then, today's rooms).
- **Sound:** a low ping, then an echo per glow, panned and delayed by its distance; built spaces ring, caves thud.
- **Cost:** recharges in about 12 s; loud (the brute hears it from about 40 blocks).
- **Pins:** tap a glow (E on desktop) to pin it; pins go on the compass (DIG-004).
- **Controls:** one round button above Jump on the phone, there whatever is in hand; R on desktop. Hold about 1 s to
  send.
- **Build:** sample the cone on a 2-block grid (built chunks, else the generator's `open()`), group open cells into
  blobs, class each by what borders it, draw each as a few additive soft sprites drawn over the rock.

## Acceptance

- **AC1.** A drive on a rig in the sky (as round 4's): a hollow three blocks behind the wall on your left shows no glow
  while you face ahead, and a glow once you turn to it.
- **AC2.** A hollow 40 blocks ahead shows nothing at the starting reach; one at 20 does.
- **AC3.** Colour: a built room reads gold and a plain cave of the same size reads blue (the glow's pixel hue sampled
  at its centre).
- **AC4.** It cannot be sent again for 12 s; a brute 35 blocks away goes to where it was sent.
- **AC5.** A pin shows on the compass at the glow's bearing and survives a reload.
- **AC6.** On the phone drive the button is on screen with the pick, rubble, multitool and hook in hand.
- **AC7.** The sample-and-group step, measured: under 8 ms on the laptop; the iPhone frame rate during a pulse checked
  by Richard.
- **AC8.** Richard on the iPhone: does it feel like a cheat, or like a hint? His words into the README; tune reach,
  blur and recharge from them.
