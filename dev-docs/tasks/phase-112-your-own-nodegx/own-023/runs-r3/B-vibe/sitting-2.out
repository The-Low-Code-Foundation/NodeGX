Answering from memory, no tools.

**1. What the game is.** *Le Gala de danse* is a French/English game for children of about 8 to 13, built as a NodeGX v2 (OpenNoodl) app. The player is the teacher of a dance school putting on its annual gala: they arrange the running order, place the dancers, pick costumes, furnish the dressing room, set the snack and the car park, buy things with stars, then run a rehearsal or the gala night itself on a 3D stage and read the results. A typical session is a few minutes of arranging and buying, then watching a performance play out and collecting the stars it earns.

*Sureness: sure.*

**2. Main screens and tabs.** Eight tabs: Programme (running order), Formation, Goûter (snack table), Costumes, La loge (dressing room), Parking, Boutique (shop), Carnet (notebook). Around them: an intro / season letter, the prep screen, the live run screen, the results screen, and a separate grown-ups' settings page (`/Pages/Grownups`).

*Sureness: sure on the eight tabs and the grown-ups page; fairly sure on the exact set of surrounding screens.*

**3. What is saved, where, when, under what key.** One JSON object per device: `{ v: 2, lang, season, galaDone, seenIntro, plan, school, notebook, sound, seed }`. It lives in the browser's `localStorage`, through a persisted Global Store named `gala` under the key `save`, with storage key `gala-game-v2`. It is written on every press — the dispatcher returns a new save and the graph writes the whole thing back — and once at startup when the opened save is mended.

*Sureness: sure.*

**4. Server, backend, accounts.** Yes, defined but not running here. `nodegx.security.json` declares one collection, `GameChange`, and three cloud functions: `saveChange` and `removeChange` (call rule `role:grownup`) and `claimGrownup` (`authenticated`). The grown-ups' page has Log In, Sign Up, Log Out and User nodes, so sign-in is username and password. It is for the grown-up editing shared content — renaming steps, changing prices, adding costumes, setting starting stars — not for child progress. Anyone can sign up (signup is public), but only the first account can claim the `grownup` role. The project points at `127.0.0.1:8585`, but no backend exists on this machine, so today the game opens with the tables as they ship.

*Sureness: sure on the declarations and the roles; fairly sure on "anyone can sign up" being the practical effect.*

**5. Who can change settings, and how it is decided.** A grown-up, on `/Pages/Grownups`. It is decided by the `grownup` role: `claimGrownup` grants it to the first account only (it lists the users in the role and grants if empty), and `saveChange`/`removeChange` carry the call rule `role:grownup`, checked server-side with Get User Roles. The browser also re-checks every change with `settings/check.js` before laying it over the game, so a bad row that reached the database another way never reaches the screen.

*Sureness: sure.*

**6. From pressing "gala night" to the results.** The button sends an event on the `gala-act` channel; `Game/Dispatcher` calls `dispatch('go', 'gala', ...)` in `scripts/game/dispatch.js`, whose `begin()` calls `stage.beginRun('gala')` and sets the screen to `run` with a `live` object. The 3D stage (`Game/Stage 3D`, backed by `scripts/stage/world.js`, `people.js`, `play.js`, `music.js`) plays the evening out, and `Game/Live` shows the running sheet. When it finishes the stage reports `runDone`; the dispatcher sets the screen to `results` and, for a gala not yet done, calls `finishGala(save, ui.res)` in `scripts/game/actions.js`, which adds the points to the school's stars, sets `galaDone`, and unshifts a notebook entry. The graph writes the new save back and `Game/Results` draws it.

*Sureness: fairly sure on the flow and the named pieces; guessing on the stage's internals — I read the dispatcher's calls to the stage, not `stage.js` or `play.js` themselves.*

**7. Earning and spending points.** The points are stars. They are earned by finishing a gala: `finishGala` adds the result's points to `school.stars` (and `school.earned`). They are spent in the Boutique and the tabs on outfits, hairstyles, shoes, accessories, furniture pieces, snacks and upgrades, each with a price in stars; a grown-up can also set the starting stars for a new school.

*Sureness: sure.*

**8. Seasons.** The save starts at season 1. `nextSeason` increments the season, clears `galaDone`, draws a new seed, and calls `addSeasonNumbers`, which brings in the new classes' numbers and slots them into the running order. New classes join and the dice change. I know the arrivals table names `ados` (A1, A2) and `mamans` (F1), but I did not read `seasonRules`, so I do not know exactly which season brings which class.

*Sureness: fairly sure that a season adds classes and numbers and changes the seed; don't know which season brings which class.*

**9. French and English.** The language is `save.lang`, flipped by the dispatcher's `lang` case. The words themselves are a `Static Data` node in `Logic/Start Up` — a JSON array of `{ key, fr, en }` — fed into a shared `words` variable; `scripts/game/text.js` turns that into a lookup, and the view functions call `w('some_key')`. The grown-ups' page adds its own `grownupWords` from the `Grownups/Words` component. The `tools/words.json` and `words.csv` files are the author's extraction for checking, not what the app reads.

*Sureness: fairly sure.*

**10. An older save loaded by a newer game.** `mend(input)` in `scripts/game/save.js` handles it. If the input is not version 2 or has no `plan`/`school`, it starts fresh. Otherwise it deep-copies, fills in any top-level, plan or school keys the newer version added, adds the season's numbers, migrates each number (an old `moves` + `repeats` becomes one block chained that many times), drops unknown numbers from the order, and repairs hair. There is also `fromRound1` for the very first round's save. So it repairs forward and keeps what it can, and starts fresh only when the save is unreadable.

*Sureness: sure.*

**11. Pure rules versus screen.** Pure, no screen: `gala-rules/src` (`data.js`, `plan.js`, `engine.js`, `tunes.js`) and their copies in `app/scripts/rules/`; `game/save.js`, `game/actions.js`, `game/dispatch.js`, `game/text.js`; the `view/*` view models; and `settings/check.js` and `settings/apply.js`. Screen-touching: the components (the `nodes.json` graphs), and `scripts/stage/*`, which drives three.js and the canvas. The view models produce data for the screen but do not touch it themselves.

*Sureness: fairly sure.*

**12. The riskiest thing in my plan.** Changing the shape of the persisted `gala` store. Every screen subscribes to `gala.save`, the startup graph writes it back, and the whole game reads it as one blob — so the migration from a bare save to a profiles envelope touches the single thing everything depends on, and a mistake loses the device's progress with no server copy to fall back on (the backend is not even running here). That is why I put the migration late in the order and kept the old `gala-game-v2` key in place as a fallback.

*Sureness: fairly sure this is the riskiest; sure that the store is the thing everything depends on.*
