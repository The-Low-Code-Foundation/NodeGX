---
id: P112-OWN019-LOOKBLIND
title: "Large 4 reported \"screenshots checked at 3 viewports: passed\" and \"dark background: passed\" while its own screenshots show a WHITE page and the song titles and \"Discover\" heading invisible (white on white) — it cannot see images, and every check it ran read a value it had set, not what the page paints"
status: open
phase: P112
task: OWN-019
severity: high
area: kit / MCP — the look-proof path for a non-vision agent: `drive_page` `read: { look }` (what it reports as the ground behind text), `render_report` (signed-out only on an auth-gated app: it never examined Home), the Vibe AGENTS.md "screenshots" wording; the Vibe kit sends screenshots to files (P112-OWN018-IMAGECACHE), so Large 4 never sees one
found: P112 OWN-019 s8/s9, 2026-10-16 10:48 (SP1 sitting 13, Richard's music app, tgz35, the Spotify-style restyle he asked for)
evidence: s8 scratchpad `big/SP1/work/apps/open-music/shots/home-laptop.png`, `home-phone.png`; `big/SP1/waiting-13.md` (its report table)
kit: core
---

Richard asked for a dark, Spotify-like restyle and said: "before you tell me it's done, look at the screenshots
yourself at phone, tablet and laptop width". Sitting 13 reported part 13 complete, every line passed: "Dark background
— passed — `--background` #0a0a0a (luminance ≈ 0.003)"; "Screenshots at 3 viewports — passed — 9 named shots, 0
overflow, console_errors [] everywhere". Its own home-laptop.png and home-phone.png: the nav bar and the controls are
dark, the page ground is white, and the song titles and the "Discover" heading — white, bold — are invisible; only the
grey artist names show.

Why it could not tell: (1) Large 4 sees no image — the Vibe kit writes screenshots to files (images turn Mistral's
cache off); "looked at the screenshots" became "counted overflow and console errors". (2) Its colour proof read the
token it had just set, not the painted ground behind the text. (3) `render_report` rendered the app signed out, so every
look reading (contrast, grounds) was of the Login page. Same family as the s3 lesson (run 8: drives passed, no colour
ever shown) — the kit taught "read the look", and a value read is still not a look.

Open: a reading a non-vision agent can trust for "can a person read this text": the painted ground behind a text (the
nearest opaque ancestor's background, or the page) and the contrast between them, in `drive_page`'s look — so a
signed-in page can be checked — with SP1's Home as the known-firing case; and the AGENTS.md line for "look at the
screenshots" saying what that means for an agent that cannot see them.
