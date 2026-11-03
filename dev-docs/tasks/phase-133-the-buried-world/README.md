# Phase 133 — The buried world: the Dig grows up

**Opened:** 2026-11-03, by Richard: *"Love the rest of the plan, let's create a phase please."* **Board:** side work
Richard asks for by name (§2 of the [board](../../BOARD.md)), not a lane of the 0.5.0 walk.

> "I feel like we have a pretty mind blowing concept coming up here. Can you do the research, have a think and give me
> your idea for scoping? No cutting corners for time or usage, I want this to be perfect and launch it to the NodeGX
> community." — Richard, 2026-11-03

**What it is:** [SCOPE.md](SCOPE.md) has all of it: what he asked for in his words (§1), what exists today (§2), the
idea (§3), the pulse (§4), the ship (§5), the buried world and the nightly districts (§6), the spoiler wall (§7), the
todo app and Betr (§8), accounts (§9), the wording rules from Betr's research (§10), **his six rulings with the
question each answered (§11)**, and the rounds (§12).

In one line: you land a big ship on a planet whose people went underground long ago and vanished; a pulse from the
ship shows, fuzzily, where the rock is hollow; Claude writes one more district of their world every night for
everyone; your own todo list, with Betr's "If I ___, then ___", comes into their world as sealed chambers; Claude never
reads anyone's list.

## The tasks

| Task | What | Round | State |
|---|---|---|---|
| [DIG-001](DIG-001-A-PRIVATE-HOME.md) | The game moves to a private repository; rounds 2–6 committed there | 7 | ⬜ |
| [DIG-002](DIG-002-THE-SHIP.md) | The base becomes a big landed spaceship | 7 | ⬜ |
| [DIG-003](DIG-003-THE-PULSE.md) | The pulse: fuzzy hollows through the rock, echoes you can hear | 7 | ⬜ |
| [DIG-004](DIG-004-THE-COMPASS-AND-MORE-TO-FIND.md) | The compass stripped (R2); many more unmarked remnants | 7 | ⬜ |
| [DIG-005](DIG-005-THE-CANON.md) | The canon, written behind the spoiler wall | 8 | ⬜ |
| [DIG-006](DIG-006-THE-SETTLEMENT-ENGINE.md) | Settlements, roads, collapse, the new blocks | 8 | ⬜ |
| [DIG-007](DIG-007-THE-FIRST-DISTRICT.md) | The sandbox: one hand-made district near the ship, the record | 8 | ⬜ |
| [DIG-008](DIG-008-THE-WORLD-GROWS-AT-NIGHT.md) | The nightly district job, the checker, placement, the cost | 9 | ⬜ |
| [DIG-009](DIG-009-ACCOUNTS.md) | One account with the todo app, saving, delete and export, its own address | 10 | ⬜ |
| [DIG-010](DIG-010-THE-TODO-APP-LOOKS-FINISHED.md) | The todo app's look pass and its Dig button (R3) | any time | ⬜ |
| [DIG-011](DIG-011-PREDICTIONS-IN-THE-TODO-APP.md) | Betr's loop in the todo app, hopes and worries equal (R4) | 11 | ⬜ |
| [DIG-012](DIG-012-YOUR-LIST-IN-THEIR-WORLD.md) | Chambers from tasks, the practices, answers back, prediction moments | 12 | ⬜ |
| [DIG-013](DIG-013-LAUNCH.md) | A stranger's first five minutes, the wording, the page, the post | 13 | ⬜ |

Order: DIG-001 first (nothing lore-shaped is written before the private home exists). Then round 7, then 8, then 9.
DIG-010 can run beside any round. DIG-009 → 011 → 012 → 013.

## Rules for this phase

1. **The spoiler wall** (SCOPE §7). Richard is the player who discovers the lore. Never quote the canon, a district's
   texts or a secret to him: in chat, in a task file, in a commit message, in a screenshot caption. Report counts and
   checks only. The lore lives in the private repository, never in this one (it is public).
2. **Richard plays each round on his iPhone before the next one starts.** His list goes into the game's README word
   for word, and one pass builds every point (the play kit's loop, CANON §1–2).
3. **His tone rules stand:** no streaks, no points, no "should", nothing social, warn but never punish; and from R4,
   **hopes and worries are equal** wherever a prediction appears.
4. **No Fable**, for anything (his rule, 2026-10-24). The nightly job runs Opus 5.5 on an API key.
5. **One heavy job on the box.** Drives run outside the Bash sandbox, one at a time, niced, on a test port
   (`DIG_TEST_PORT=8811`), never on a server holding real data (PARKED-DIG-R6-TESTPORT).
6. **Every defect is a file in `dev-docs/bugs/`**, prefix `p133-dig0NN-`, run through `node scripts/bugs.js`.
7. **Measure in Node before believing a generator claim** (the caves taught it: slice pictures of `chunk()`, counts
   per depth), and look at the screen before believing a drive's count.
8. **The todo app is Richard's real list.** `/var/lib/todo` on the box is never written to by hand, rsynced into or
   deleted from; template changes go through `npm run template:todo` and the TPL-008 recipes.

## Where things live

- The game: `dev-docs/parked/the-dig/` until DIG-001 moves it to its private repository (then the path is in
  DIG-001's log).
- The live static copy: https://nodegx.io/lab/dig/ (rebuilt and re-pushed after every change; recipe in the game's
  README, "Run it").
- The todo app: todo.digitalbricks.io (TPL-008; its deploy README is
  `dev-docs/tasks/phase-78-the-templates/todo-digitalbricks/README.md`).
- Betr: `~/vscode_projects/betr-1` (read only for this phase: its research §5 and §10, and its loop's shape).
