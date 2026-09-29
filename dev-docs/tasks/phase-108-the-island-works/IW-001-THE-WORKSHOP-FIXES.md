# IW-001 — The Workshop fixes

**Opened 2026-09-29** from README §1.3. **Status: ⬜.** Depends on nothing. Lane A. **First job of session 1.**

## 1. The person sentence

> **A run that goes round and round can be stopped. A block tapped in the drawer lands in the program, and its `?` is
> in the drawer. Tapping a placed block no longer throws it away. The program has room, and the pad has every action
> the mission uses.**

## 2. What it is (each measured in README §1.3)

| # | Fix | Where | Survives IW-004? |
|---|---|---|---|
| F1 | **Stop** on the bar while a run plays (Play hides, Stop shows); fires the Runner's existing `stop` (K3:717-721) | K3:870-875, 1181-1184 | yes (the bar) |
| F2 | **A run cap** in the page Runner: `MAX_TICKS` (E:73) applies to a played run too; hitting it stops the run and Olive says "Pip is going round and round — is there a loop that never ends?" (new hint key, EN/FR) | E:486, the Runner | yes (engine) |
| F3 | **The first drawer tap places the block.** The card opens beside it, not instead (`CARD_GATE_SCRIPT` stops undoing, S3:797-826); closing it leaves the block | S3:797, K3:899-907 | card logic yes |
| F4 | **`?` on the drawer blocks**, not on placed ones (KIT:650-663, 747); the "? <block>" chips row goes (S3:850-861) | KIT | the rule yes |
| F5 | **A tap on a placed simple block selects it, never deletes it**; delete is the `✕` only (KIT:609-615) | KIT | replaced by drag-to-drawer |
| F6 | **The program area:** the drawer and the program in two boxes; the program box takes the column's height down to the bar (not `min(52vh, 460px)`, LOOK:318-319) | LOOK | layout replaced |
| F7 | **The pad = the drawer's actions:** every action block in the mission's palette gets a key (adds `say`, `read`) | `cg003Content.ts:163-171`, S3:269-274 | yes |
| F8 | **Cards seen are saved** per profile (the save's profile row, optional field — no version bump), not the page Variable `gardenCardsSeen` (K3:962) | cg002 save, K3 | yes |

Drag from the drawer is **not** built here: IW-004's Blockly has it. F5 and F6 are the cheapest change that stops the harm.

## 3. Acceptance criteria

1. F1: a drive starts `until wall_ahead { left }` (never ends before the guard) inside `repeat 9`, presses Stop, and
   the robot stops within one tick; the bar returns to its idle state; Start over works after.
2. F2: the same program with no Stop hits the cap and shows the new line (EN/FR).
3. F3: a fresh profile's first tap on `fill` places it **and** opens its card; "Got it" closes it; the block stays.
4. F4/F5: placed blocks carry no `?`; the drawer's do; a tap on a placed `fwd` leaves the program unchanged.
5. F6: at 1024 × 768 a 12-block program is visible without scrolling; at 1368 × 900 a 20-block one.
6. F7: on `letter-say` the pad has pick, put and say; on `mamie-note` it has read; each key does what its block does.
7. F8: cards seen survive a reload and are per profile (a sibling still sees the card).
8. Garden specs, page drive, modes drive, template byte-identical, 0 console errors; screenshots looked at.

## 4. Gates

As P106 IG-001 §5.

## 5. Traps

- The Runner's `stop` path also resets `rnWait` (Olive's parked ask) — Stop during "Olive is thinking" must clear it too
  (P106 D1 was this family).
- F8 writes a profile field: an on-load migration owes its own save (the page writes the migrated profile back at once, as the v4 load does, `cg002Scripts.ts:877`).

## 6. Notes

(empty)
