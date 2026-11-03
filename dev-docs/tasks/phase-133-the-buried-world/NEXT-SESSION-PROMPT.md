# Phase 133: next session

Read [README.md](README.md), then [SCOPE.md](SCOPE.md) §11 (Richard's six rulings, with the question each answered).
The game's own history and traps: `dev-docs/parked/the-dig/README.md` and its `NEXT-SESSION-PROMPT.md` (until DIG-001
moves them), and the memory `richards-motivation-app`.

## Where it stands (2026-11-03, s0: scoped and opened)

Nothing built. Scoped from Richard's message of 2026-11-03 and its P.S. (the ship), ruled the same day, opened as a
phase the same day. Thirteen tasks, all ⬜.

## Next action

**DIG-001, a private home.** Ask Richard for the private repository's name before making it (an outward step). Then
move the game there, commit rounds 2–6 in it, leave a pointer in `dev-docs/parked/the-dig/`, rebuild the live copy
from the new home. Before touching `dev-docs/parked/the-dig/`, read `git status` and the folder's mtimes: the rounds
are uncommitted there and a peer may be in it.

Then round 7: DIG-002 (the ship), DIG-003 (the pulse), DIG-004 (the compass and more to find). Richard plays it on the
iPhone before round 8 starts.

## Live traps

- 🔴 **The spoiler wall.** Never quote lore to Richard, in chat or in any file in this repository (it is public).
- Drives run outside the Bash sandbox, one at a time, niced, `DIG_TEST_PORT=8811`; never against a server holding
  real `data/`.
- The live copy at nodegx.io/lab/dig/ is a copy: rebuild and re-push after any change (the game's README, "Run it").
- No Fable. The night job (DIG-008) runs Opus 5.5 on an API key Richard creates.
- `/var/lib/todo` on the box is Richard's real list: never written by hand.
