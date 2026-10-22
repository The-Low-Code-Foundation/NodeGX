# 001 — How the grown-ups' changes are kept and guarded

_2026-10-21, while building._

## Kept

- **In the backend, as changes over the game's rows**, one `GameChange` per row (`table:rowId`). Not in
  `localStorage` (gone when the browser is cleared, and per computer); not as a copy of the game's tables (a new
  version of the game would be hidden behind the old copy). The game lays them over its own rows with
  `applyRows` each time it opens.
- **A new version that no longer has a row** skips that change (`buildOverrides`); a child's save that uses a
  removed step or costume is mended (`state.js`). Neither can stop the game opening.
- **New rows** use the ids `x01`…`x20` per table: they can't collide with the game's own ids or with a future
  version's (which don't look like that), and they cap the lists at twenty.

## Guarded

- **Who**: an account becomes a grown-up by giving the household key once; the key lives in the backend's secrets,
  set from `.env`. Rejected: a PIN or password in the page (a child can read the page's code), and "the first account
  becomes the grown-up" (a child might be first).
- **What**: one allow-list (`checkChange`) on the server, the same text run again by the game. Rejected: checking only in
  the page (a child with the browser's tools could call the backend directly), and checking only on the server (a
  record that reached the database another way would still reach the screen).
- **Words**: a fixed character set (no markup, no emoji) and a French and English rude-word list, matched on words
  and, for the strongest words, inside other words, after removing accents, l33t and repeated letters. A word list is
  never complete; a grown-up who finds a gap adds it to `RUDE_WORDS` in both copies.
- **The backend enforces its rules on this computer too** (`devOpen: false`). The first backend was started dev-open,
  where a direct write to `GameChange` was accepted; it was replaced by one started from `nodegx.security.json`.

## Not done

- **A child's own save** (their plan, school and stars) is still in their browser, as in the reference game. A child
  who edits `localStorage` can cheat their own school; they can't change the game for anyone else.
- **Which other fields** grown-ups may want (number names, class sizes, furniture prices…) is left open; each one is a
  line in `checkChange` and a row in `editing.js`.
