---
id: P112-S13-CONTROLKEY
title: "The OWN-015 driver's control arm planted the REAL Gemini key in a page under --real, and a ship to nexus-1 carried it into the site folder"
status: fixed
severity: high
area: test harness (`scripts/own/stranger-backend.mjs`, AC2's control arm); not a product defect
regression: scripts/own/stranger-backend.mjs "AC2 control: a canary in a page is found" (the control now plants a random canary and searches for it)
found: P112 OWN-016 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-016-SHIP-IT.md §8
---

AC2's control proves that the key search can see a key: it puts "the same key" in an HTTP Request node in a page
and checks that the search finds it. With the stand-in, the key is a random string. Under `--real` (added the same day)
it is Richard's real `GEMINI_TTS_API_KEY`. The `--real` run's project was then shipped to nexus-1 as the OWN-016
fixture, and OWN-016's own key search on the box found it in `/srv/lingo/site/noodl_bundles/b2-…json` (373 bytes),
the control page's bundle. **The search worked as designed. It caught a key the test itself had planted.**

**Exposure:** none public. nexus-1 had no Caddy block for `lingo` and no other site serves `/srv/lingo`. The key was
never in git (`git log --all -S` finds nothing). It sat in that file on the box for about 10 minutes, and in the
local temp project.

**Fixed:** the file was deleted on the box (0 hits under `/srv`, `/opt` and `/var/lib/lingo` afterwards, with
`secrets.env` still holding it as the control). The control component was removed from the local test project
(0 hits). The control arm now plants `own015-canary-<random>` and searches for that: same search, different needle,
so a real credential never enters a page. Re-run: 11/11, and the control finds the canary.
