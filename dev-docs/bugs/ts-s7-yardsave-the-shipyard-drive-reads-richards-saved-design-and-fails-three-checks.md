---
id: TS-S7-YARDSAVE
title: tests/shipyard.json fails 3 of 15 since Richard saved a design on 2026-10-30; its first step backs the design file up but never moves it aside, so the drive opens on his ship, not the model's
status: open
severity: low
kind: kit
area: threadspace / the shipyard drive (`dev-docs/parked/threadspace/tests/shipyard.json`, steps 2 and 51)
found: 2026-11-04, putting Threadspace on nodegx.io; measured against `node server.mjs`, the unchanged source
evidence: `public/ships/kestrel.json` savedAt 2026-10-30T07:22:24Z (beam 19.9, 4 drives, sweep -5). The drive against `node server.mjs --port 8799` read 12/15, failing "the checks run on the ship as drawn", "the changes card and the status count what differs" and "with the drive's file gone, the shipyard opens on the model's defaults". The same drive against a copy WITHOUT that file read 14/15 (the 15th fails there because of where the copy keeps a save, not this). s6 read 15/15, before the save.
regression: none yet
---

What a person sees: nothing; the shipyard and the game are fine. The drive goes red the moment anyone saves a design,
which reads as a broken shipyard.

Why: step 2 copies `public/ships/kestrel.json` to `.drive-backup` and leaves the original in place. Every check before
the drive's own save then runs on the saved design: its rooms and airlock read differently, and the changes card counts
ten changes the drive never made. Step 51 renames the backup back, so the file survives; only its mtime moves.

Fix (not done, the folder is parked): step 2 should move the file aside (`renameSync`), not copy it, so the drive starts on
the model as declared and step 51 puts Richard's design back.

Also seen in both runs, not a failure: `setPointerCapture` throws `NotFoundError` on the drive's synthetic wing drag (CDP
pointer events carry no active pointer id). The drag check passes regardless.
