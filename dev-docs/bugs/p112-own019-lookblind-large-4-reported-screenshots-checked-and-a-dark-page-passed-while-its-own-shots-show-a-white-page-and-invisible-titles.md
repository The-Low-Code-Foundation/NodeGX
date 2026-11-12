---
id: P112-OWN019-LOOKBLIND
title: "Large 4 reported \"screenshots checked at 3 viewports: passed\" and \"dark background: passed\" while its own screenshots show a WHITE page and the song titles and \"Discover\" heading invisible (white on white) — it cannot see images, and every check it ran read a value it had set, not what the page paints"
status: fixed
phase: P112
task: OWN-019
severity: high
area: kit / MCP — the look-proof path for a non-vision agent: `drive_page` `read: { look }` (what it reports as the ground behind text), `render_report` (signed-out only on an auth-gated app: it never examined Home), the Vibe AGENTS.md "screenshots" wording; the Vibe kit sends screenshots to files (P112-OWN018-IMAGECACHE), so Large 4 never sees one
found: P112 OWN-019 s8/s9, 2026-10-16 10:48 (SP1 sitting 13, Richard's music app, tgz35, the Spotify-style restyle he asked for)
evidence: s8 scratchpad `big/SP1/work/apps/open-music/shots/home-laptop.png`, `home-phone.png`; `big/SP1/waiting-13.md` (its report table)
kit: core
commit: fix(p112-own019-lookblind), 2026-10-25
regression: packages/nodegx-render-measure/tests/lowContrastText.test.js "🔴 OWN-026's number pad (white digits on #FAF5FF) is named once on HEAD — the reverted arm is silent"
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

## Fixed (2026-10-25, with OWN-026's case)

OWN-026 met it again: Large 4's number pad set white digits on a `#FAF5FF` button (1.07:1; the lab's note said about
1.05) and kept them through five changes, because it tapped the keys and read "Correct!".

- **`render_report`:** a `low-contrast-text` warning (`@nodegx/render-measure`). Every visible text's ink, faded by its
  ancestors' opacity, against the ground composited from the text outwards (white under all, as a browser paints);
  WCAG's ratio; under 3:1 is reported, once per report, by colour pair. It abstains (counted) over a background image or
  gradient, a text shadow, an SVG text; a disabled or aria-hidden control is exempt. Known limit, named in the code: a
  sibling positioned over the text is not an ancestor, so it is not seen.
- **`drive_page`'s look** (a page behind a sign-in): two new fields, `contrast` and `readable` (≥ 3:1; both null over a
  picture), so `"expect": { "readable": true }` is the check.
- The Vibe AGENTS.md says so in the "Driving a line" section.

Measured in real Chrome on a scratch copy of t2-nodegx-c07's app with its `BigKeypad` placed on a reachable page:
`low-contrast-text` named `"1" #ffffff on #faf5ff, 1.07:1 (and 11 more like it)`, and the page's other 6 texts (the
white-on-purple Sign in among them) were silent; the drive read `{contrast: 1.07, readable: false}` on the key "5" and
`{contrast: 5.7, readable: true}` on "Sign in". The old `background` field said `rgb(255, 255, 255)` for the key: the
same white as its ink, with nothing saying so. render-measure 45/45 (7 new, with a reverted arm); noodl-mcp's recorded
render goldens 92/92 (the recorded reports lack the field, and an absent field is unknown, not zero).
Not done: a Chrome test for the look fields (measured by hand above).
