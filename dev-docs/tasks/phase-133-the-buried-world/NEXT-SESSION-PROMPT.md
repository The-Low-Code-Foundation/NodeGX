# Phase 133: next session

Read [README.md](README.md), then [SCOPE.md](SCOPE.md) §11 (Richard's six rulings). The game lives in the private
repository `richardosborne14/dig`, cloned at `~/vscode_projects/dig`: its README ("Round 7") and its
`NEXT-SESSION-PROMPT.md` carry the detail. Memory: `richards-motivation-app`.

## Where it stands (2026-11-03, s1)

- **DIG-001 ✅** the game moved to the private repo; NodeGX keeps a pointer at `dev-docs/parked/the-dig/`.
- **Round 7 built** (DIG-002 the ship, DIG-003 the pulse, DIG-004 the compass and the remnants), committed and pushed
  to the private repo (`74c948d`, `ed67fb7`, `9c95c3f`). All eight drives green (smoke 13, phone 22, views 3, round3
  12, round4 13, round5 12, ship 7, pulse 12) and the Node checks (`check-ship`, `check-remnants`, `census-finds`,
  `time-pulse`, `time-spawn`). Each task file's log has the numbers.
- **LIVE 2026-11-03** at nodegx.io/lab/dig/ after Richard's look at the ship sheet ("Yeah the ship looks cool, push
  it so I can test please"): DIG-002 AC3 met. Phone drive on the live URL 22/22.

## Next action

1. He plays round 7 on the iPhone: his words into the game's README; DIG-003 AC7 (frame rate during a pulse) and AC8
   (a cheat or a hint?), DIG-004 AC4 (long stretches with nothing?). One pass builds every point of his list.
2. Then round 8: DIG-005 (the canon, behind the wall, in `lore/` of the private repo), 006, 007. DIG-010 (the todo
   app's look) can run beside any round.

## Live traps

- 🔴 **The spoiler wall.** Never quote lore to Richard, in chat or in any file in this repository (it is public).
- Drives run outside the Bash sandbox, one at a time, niced, `DIG_TEST_PORT=8811`; never against a server holding
  real `data/`. A peer's headless Chrome or check run on the box: wait for it (by its pid).
- The live copy is a copy: rebuild and re-push after any change.
- No Fable. The night job (DIG-008) runs Opus 5.5 on an API key Richard creates.
- `/var/lib/todo` on the box is Richard's real list: never written by hand.
