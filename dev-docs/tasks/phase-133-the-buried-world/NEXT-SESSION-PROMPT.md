# Phase 133: next session

Read [README.md](README.md), then [SCOPE.md](SCOPE.md) §11 (Richard's six rulings). The game lives in the private
repository `richardosborne14/dig`, cloned at `~/vscode_projects/dig`: its README ("Round 8") and its
`NEXT-SESSION-PROMPT.md` carry the detail. Memory: `richards-motivation-app`.

## Where it stands (2026-11-03, s3)

- **DIG-001 ✅, DIG-005 ✅** (the canon, behind the wall: counts only).
- **Round 7 live** (the ship, the pulse, the compass, the remnants); his first play gave round 7b and round 8's asks
  (the cutter's voice three times over, single/auto, the tracer, bullet holes): built, private `917fcbd`.
- **DIG-006** the settlement engine: built, Node checks green; safe rooms honoured now; AC5 in part, AC6 (shots of
  each style's whole room for his look) not yet.
- **DIG-007** the first district: built, private `bee07f6`. The format v1 + checker (AC1 ✅), the same texts and blocks
  in Node and the browser and across a reload (AC2 ✅), the record with no count, kept (AC3 ✅), the tuning find
  (reach 28 → 40), the secret's sealed chamber, Where these come from. All ten drives green, 121 checks. The district's
  texts were written and reviewed by agents; nothing of them reached the main session.
- **Not live yet:** the static copy is built in `~/vscode_projects/nodegx-web/site/lab/dig/` (district drive 16/16 on
  it, served under `/lab/dig/`). The push is Richard's (the auto-mode classifier refuses a production deploy):
  `rsync -az ~/vscode_projects/nodegx-web/site/lab/dig/ nexus:/srv/nodegx/site/lab/dig/` and the `chown caddy` line in
  the game's README "Run it".

## Next action

1. **Richard pushes and plays round 8 on the iPhone** (DIG-007 AC4): his words verbatim into the game's README, no lore
   quoted back to him. Ask him three things only (none of them lore): does the place feel found or placed; does the
   record feel like a keepsake or a checklist; does the tuned pulse feel like a reward. One pass builds his list.
2. **P133-DIG007-LINTELSTACK** (open, low): decide before DIG-008 writes nightly (spill only onto shelves and have the
   engine leave more spots, or refuse a second text on a carved line).
3. Then DIG-006's leftovers (the stone door's roll; AC6 shots for his look; mural motifs by a lore-side agent), then
   **DIG-008** the night job (its writer and reviewer brief: `tools/nightly-district.md` in the private repo).
4. DIG-010 (the todo app's look) can run beside any of it.

## Live traps

- 🔴 **The spoiler wall.** Never quote lore to Richard, in chat or in any file in this repository (it is public). Lore
  work goes to an agent whose brief says "report counts only"; even then an agent's report can carry an in-world word:
  never repeat it. Never `grep` or `cat` a lore file broadly in the main session (s3 leaked one line of STYLE.md into
  its own tool output that way); read shapes with key-only scripts.
- Drives run outside the Bash sandbox, one at a time, niced, `DIG_TEST_PORT=8811`; never against a server holding real
  `data/`. Every drive logs a headless "WrongDocumentError … pointer lock" exception: old, harmless.
- `tests/district.json`'s Node cross-check runs `tools/check-district.mjs --print-seed` from the drive's `expect`
  (through `process.getBuiltinModule`), so the drive must run from the game's folder.
- The live copy is a copy: rebuild and re-push after any change.
- No Fable. The night job (DIG-008) runs Opus 5.5 on an API key Richard creates.
- `/var/lib/todo` on the box is Richard's real list: never written by hand.
