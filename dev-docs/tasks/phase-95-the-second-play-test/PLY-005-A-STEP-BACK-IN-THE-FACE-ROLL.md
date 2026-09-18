# PLY-005 — A step back in the face roll

> "The avatar chooser. I feel like rolling works fine, but if you accidentally roll when you wanted the previous
> avatar, there should be a 'back' button. I dunno if it's too hard to let them go all the way back maybe forget it
> and just let them go one step back, but going back and then rolling forward again would be nice"
> — Richard, 2026-09-18

## 1. The person sentence

**A child rolls past the face they wanted, presses ◀ twice, and it is there.**

## 2. What is there (read 2026-09-18)

Roll writes a fresh random seed straight over the old one, and nothing keeps the one before:

```
wire('nfRoll', 'onClick', 'nfRandom', 'run'),
wire('nfRandom', 'result', 'nfSetSeed', 'value'),
wire('nfRoll', 'onClick', 'nfSetSeed', 'do'),
```
— `tpl007Components.ts:1646-1648`

## 3. Design

**The whole list, not one step.** Richard offered to settle for one, but a list costs the same as a single previous
value — one array instead of one string — and a child who rolled four times past the one they wanted is in exactly
the position he describes. `ROLL_HISTORY = 30`.

- `Logic/Roll face`, placed once per action (`Logic/Hunt move`'s shape): **set** · **roll** · **back** · **forward**.
- A roll **appends and steps to the end**. Rolling from the middle still appends at the end, so **no face already
  seen is ever discarded** — Back still reaches every one of them.
- ◀ and ▶ each show only when they lead somewhere, so a child never presses a dead arrow, and a small `3/7` between
  them says a list exists at all.
- Opening the form starts the list at one fresh face; **editing an existing player starts it at their own face**, so
  Back cannot walk off it into a stranger's.

## 4. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | ✅ (s1) **RED on today's build:** roll twice, and the first face is unreachable. Recorded. |
| AC2 | ✅ (s1) Engine gate: roll ×5 then back ×5 gives the five faces in reverse; forward ×5 returns; back at the start and forward at the end change nothing. |
| AC3 | ✅ (s1) Engine gate: a roll from the middle appends at the end and loses nothing — every earlier face is still reachable with Back. |
| AC4 | ✅ (s1) Engine gate: `set` starts the list at exactly one face, so a form that has just opened has nothing to go back to. |
| AC5 | ✅ (s1) Template gate: the form places `Logic/Roll face` once per action and nothing writes `newSeed` outside it. |
| AC6 | Drive, FR 390×844 and EN 1366×768: roll three times, press ◀ twice → the second face is drawn and the counter reads `2/4`; ▶ returns; create the player and the face created is the one shown. |
| AC7 | Drive: open Edit player on an existing child → the face shown is theirs and ◀ is not offered until they roll. |
| AC8 | Richard rolls past one on purpose and says whether getting back to it is obvious. |
