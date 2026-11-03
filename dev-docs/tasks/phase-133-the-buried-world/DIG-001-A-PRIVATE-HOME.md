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
