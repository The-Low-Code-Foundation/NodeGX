# DIG-007 — The first district (the sandbox)

**Phase:** [133](README.md). **Depends on:** DIG-005, DIG-006. **Round:** 8. **Scope:** [SCOPE §6](SCOPE.md).

> "You don't need to write the full lore and story all at once. let's do a sandbox level to get it started."
> — Richard, 2026-11-03

## What

- **The district format v1** (`district.schema.json` and `tools/check-district.mjs`): a settlement's style, size and
  state, its texts and where each is carved, the practices it holds, any secret, any tuning find for the pulse, and
  the portal worlds behind it. Hand-written here; DIG-008's night job writes the same format.
- **One district, by hand**, a short dig from the ship (20–40 m down, within about 60 blocks): partly ruined, partly
  whole, its road out ending in rubble.
- **The record** (menu): everything read, in the order found, readable again; no total, nothing marked missing.
- **"Where these come from"** in the menu (DIG-005's page).
- **A pulse tuning find** in the district (raises the reach; DIG-003's setting).

## Acceptance

- **AC1.** `check-district.mjs` passes the district and refuses five broken ones (a missing source, a banned word, a
  text over its length, an unknown style, a secret with no way in).
- **AC2.** The district's texts and blocks are identical on two loads and on two machines.
- **AC3.** The record keeps what was read across a reload, and shows no count.
- **AC4.** Richard plays it on the iPhone. His reactions go into the game's README verbatim (with no lore quoted back
  in the reply to him).
