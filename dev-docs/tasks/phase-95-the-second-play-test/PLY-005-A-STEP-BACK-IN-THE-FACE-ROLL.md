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
| AC6 | ✅ (s2) **DRIVEN GREEN, both arms — after the drive found ▶ could never appear at all.** `--scenario ply005`, 28/28, exit 0. Three rolls give four distinct faces and `4/4`; ◀◀ redraws the second face and reads `2/4`; ▶ returns to the third; the created player wears the face that was on the form. See §5. |
| AC7 | ✅ (s2) **DRIVEN GREEN, both arms.** Edit player opens on the child's own face and offers no ◀ until they roll. |
| AC8 | Richard rolls past one on purpose and says whether getting back to it is obvious. |

## 5. 🔴 The defect the drive found, and the gate that was green over it

**▶ could never appear, in any circumstance, since the day PLY-005 shipped.**

`nfCanFwd` was an Expression `at >= 0 && at < n - 1`, and `n` was wired from `nfHistVar.value` — the history
**array**. An array minus a number is `NaN`, every comparison against `NaN` is false, so `nfForward.mounted` was
never once true. ◀ worked only because `at > 0` needs nothing but `at`. A child could walk back and never walk
forward again.

**The template gate was green the whole time.** Its clause read "the two arrows show only when they lead
somewhere", but all it asserted was that a wire ran from `nfCanBack` to `nfBack.mounted` and from `nfCanFwd` to
`nfForward.mounted`. Both wires existed. It graded the topology and never the value — a hole the exact shape of
the defect.

**The fix** is RKT-007's own rule: `Logic/Roll face` already publishes `canBack` and `canForward`, and nothing was
using them. Both arrows now mount from the script's own outputs and the two Expressions are gone, so there is no
second copy to drift. The gate now asserts the arrows' `mounted` comes from all four `Logic/Roll face` placements'
`canBack`/`canForward` and that **nothing else** feeds it; armed with a sabotage (wrong port ⇒ RED, restored ⇒
GREEN) on 2026-09-18. 344/344 tpl007 gates green after the change.
