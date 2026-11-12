# DIG-001 — A private home for the game

**Phase:** [133](README.md). **Ruling:** R5, *"Yeah I guess we need one to keep it hidden"*. **Round:** 7, first.

## Why

The lore must stay hidden from the player who discovers it, and from every other player. The NodeGX repository is
public on GitHub, and the game's rounds 2–6 are still uncommitted in its working tree. Nothing lore-shaped is written
until the game lives somewhere private.

## What

- A **private** GitHub repository for the game (name to confirm with Richard when it is made, e.g. `the-dig`;
  making a repository is an outward step, so ask first), cloned at `~/vscode_projects/the-dig`.
- Move the game there: `public/`, `server.mjs`, `tools/`, `tests/`, `package*.json`, the README, the handoff. `data/`
  stays out of git as now. History: start fresh from the current files (round 1, `a87fde77e`, is already public and
  holds no lore, so nothing needs scrubbing).
- A `lore/` folder with a README that states the wall (SCOPE §7) at the top.
- In OpenNoodl: `dev-docs/parked/the-dig/` shrinks to a one-paragraph pointer README; the removal is committed with
  pathspecs (the checkout is shared; read `git status` and the mtimes of the folder first, in case a peer is in it).
  The `PARKED-DIG-*` bug files stay in the ledger here.
- `tools/build-static.mjs` and the README's "Run it" point at the new home; the live copy is rebuilt from it.
- The phase files (this folder) stay in OpenNoodl: they hold no lore.

## Acceptance

- **AC1.** The private repository exists, holds rounds 1–6, and `npm start` serves the game from a fresh clone.
- **AC2.** All six drives run from the new home (one at a time, `DIG_TEST_PORT=8811`) with their round-6 results:
  smoke 13/13, phone 20/20, views, round3, round4 and round5 as last recorded.
- **AC3.** OpenNoodl's `git status` shows no game files left under `dev-docs/parked/the-dig/` except the pointer.
- **AC4.** The live copy at nodegx.io/lab/dig/ is rebuilt from the new home and the phone drive passes on it.

## Note

What the browser fetches can always be read by a determined player. The wall's aim is that nobody stumbles on the
lore (in a repository, a bundle, a chat), not that it is secret from someone reading network traffic. Texts are
fetched as data per district, never baked into the code.

## Log

**2026-11-03, s1: done, AC1–AC4 green.** Richard named it `dig` (he first took `the-dig`, then "just call it 'dig'").

- **AC1.** `github.com/richardosborne14/dig`, **private** (`gh repo view`: `PRIVATE`), cloned at `~/vscode_projects/dig`.
  One commit holds rounds 1–6 as they stood (`858f554`), a second notes the new home in its README and handoff. A
  fresh clone into a scratch folder installed three.js on its own and served `/`, `/vendor/three/three.module.js`,
  `/src/game.mjs` and `/sfx/CREDITS.md` with 200 on port 8811 (served without `--open`, so nothing opened on his screen).
- **`lore/`** exists with a README stating the wall at its top; empty until DIG-005.
- **AC2.** `DIG_TEST_PORT=8811 sh tools/run-all.sh` from the new home, outside the sandbox, after the peers' check
  runs ended: smoke 13/13, phone 20/20, views 3/3, round3 12/12, round4 13/13, round5 12/12, the round-6 numbers.
- **AC3.** NodeGX `90ed094e4` (committed through a temporary index; a peer's staged `parked/README.md` untouched):
  30 game files out, `dev-docs/parked/the-dig/README.md` is now the pointer, `.gitignore` kept. `git status` on the
  folder is empty. Still on disk there, ignored: `node_modules/`, `shots/` (3 GB of old drive screenshots) and
  `data/` (his round-1–6 answers and trophies; **copied** to the new home's `data/`, the original left in place).
- **AC4.** `tools/build-static.mjs` from the new home gives the same 59 files the live folder held (`diff -rq`
  empty; `rsync -n` lists only timestamps and owners), so nothing needed pushing. The phone drive on
  `https://nodegx.io/lab/dig/`: 20/20.
- The localStorage keys (`the-dig-save-v1`, …) and the package name keep their old names on purpose: renaming the
  keys would lose every browser's save.
