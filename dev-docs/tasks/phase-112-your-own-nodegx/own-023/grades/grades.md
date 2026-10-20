# Blind grades, two graders per app (letters only)

| | Part 1 (19): grader 1 · grader 2 · both | Part 2 (22): grader 1 · grader 2 · both | lines they disagree on |
|---|---|---|---|
| K | 19 · 19 · 19 | 19 · 20 · 19 | O22 |
| M | 19 · 19 · 19 | 20 · 21 · 20 | O12 |
| R | 19 · 19 · 19 | 16 · 19 · 16 | O12, O19, O21 |

## Every line

| line | K g1 | K g2 | M g1 | M g2 | R g1 | R g2 |
|---|---|---|---|---|---|---|
| G1 | pass | pass | pass | pass | pass | pass |
| G2 | pass | pass | pass | pass | pass | pass |
| G3 | pass | pass | pass | pass | pass | pass |
| G4 | pass | pass | pass | pass | pass | pass |
| G5 | pass | pass | pass | pass | pass | pass |
| G6 | pass | pass | pass | pass | pass | pass |
| G7 | pass | pass | pass | pass | pass | pass |
| G8 | pass | pass | pass | pass | pass | pass |
| G9 | pass | pass | pass | pass | pass | pass |
| G10 | pass | pass | pass | pass | pass | pass |
| G11 | pass | pass | pass | pass | pass | pass |
| G12 | pass | pass | pass | pass | pass | pass |
| G13 | pass | pass | pass | pass | pass | pass |
| G14 | pass | pass | pass | pass | pass | pass |
| G15 | pass | pass | pass | pass | pass | pass |
| G16 | pass | pass | pass | pass | pass | pass |
| G17 | pass | pass | pass | pass | pass | pass |
| G18 | pass | pass | pass | pass | pass | pass |
| G19 | pass | pass | pass | pass | pass | pass |
| O1 | pass | pass | pass | pass | pass | pass |
| O2 | pass | pass | pass | pass | pass | pass |
| O3 | fail | fail | pass | pass | fail | fail |
| O4 | pass | pass | pass | pass | fail | fail |
| O5 | pass | pass | pass | pass | pass | pass |
| O6 | pass | pass | pass | pass | pass | pass |
| O7 | pass | pass | pass | pass | pass | pass |
| O8 | pass | pass | pass | pass | pass | pass |
| O9 | pass | pass | pass | pass | pass | pass |
| O10 | pass | pass | pass | pass | pass | pass |
| O11 | pass | pass | pass | pass | pass | pass |
| O12 | fail | fail | fail | pass | fail | pass |
| O13 | pass | pass | fail | fail | fail | fail |
| O14 | pass | pass | pass | pass | pass | pass |
| O15 | pass | pass | pass | pass | pass | pass |
| O16 | pass | pass | pass | pass | pass | pass |
| O17 | pass | pass | pass | pass | pass | pass |
| O18 | pass | pass | pass | pass | pass | pass |
| O19 | pass | pass | pass | pass | fail | pass |
| O20 | pass | pass | pass | pass | pass | pass |
| O21 | pass | pass | pass | pass | fail | pass |
| O22 | fail | pass | pass | pass | pass | pass |

## The disagreements, in the graders' words

**K O22** — grader 1: *fail* — I could play, search, make a playlist and follow without getting stuck. The screens are not plain: the upload form has about 15 inputs, including voice profile, mood, track #, tags, style/prompt, lyrics and a remix toggle, and the signed-in Home has 7 sections.

grader 2: *pass* — I played a song, searched, made a playlist and followed a creator without help or getting stuck. For the "plain" part: Home has 8 sections, the upload form has about 15 fields, and search has 6 filter controls.

**M O12** — grader 1: *fail* — No page scrolls sideways (page width stayed 390 on all 11 pages checked), but the player bar cuts text short: "Nothing play…" and "Zephyr Mar…".

grader 2: *pass* — No page was wider than 390 px, and no button or field sat off-screen. I checked 10 pages: home, search, library, upload, two songs, artist, album, playlist and creator.

**R O12** — grader 1: *fail* — No page scrolled sideways (page width 390 on all 14 pages), but the middle of the Home tab is covered by the "Open Next.js Dev Tools" button, so a tap there didn't go through; only its edges could be tapped.

grader 2: *pass* — No page scrolled sideways at 390 px; only the Home song rows slide sideways, inside their own row. The last controls are reachable above the fixed bars.

**R O19** — grader 1: *fail* — Searching "Grader" listed people under "Creators", and B followed Grader A; Grader A then appeared under "People you follow" in B's Library.

grader 2: *pass* — Searching "Grader" showed a "Creators" section with people; person B followed Grader Alpha, who then appeared under "People you follow".

**R O21** — grader 1: *fail* — "Made for you" left out the songs B had liked, but still included Zebrafish Sunrise, which B had played many times; I found no place that shows only unplayed songs.

grader 2: *pass* — "Made for you" left out person B's liked songs and included songs B had never played, such as Sleepy Tram. It still included Zebra Lighthouse, which B had played 6 times.

## Richard's rulings on the disagreements (R5, 2026-10-19 ~22:40, asked in plain words, letters only)

| line | ruled | Richard's words where he gave any |
|---|---|---|
| K O22 (first-timer, plain screens) | **fail** | |
| M O12 (nothing cut off at 390 px; the player bar shortens to "Nothing play…") | **fail** | "I'd say fail, making a side scrolling text like in Spotify can't be that hard as a simple solution" |
| R O12 (Next.js's dev button over the Home tab) | **pass** | |
| R O19 (find and follow a person) | **pass** | |
| R O21 (a place to discover unplayed songs; "Made for you" still showed a song played 6×) | **fail** | |

## Final blind grade

| | Part 1 — lines both lists have (19) | Part 2 — lines one list has (22) | scripted: routes · console errors (not favicon) · pages scrolling sideways at 390 px · like after reload |
|---|---|---|---|
| K | **19** | **19** (fail: O3, O12, O22) | 25 · 0 · 0 · not reached (no like control signed out) |
| M | **19** | **20** (fail: O12, O13) | 11 (its pages from its project; it has no `<a>` links) · 0 · 0 · not reached |
| R | **19** | **18** (fail: O3, O4, O13, O21) | 25 · 0 · 0 · not reached |

Note on O13 (console errors): M's and R's fails are a missing `/favicon.ico` (404) and nothing else, by both their graders and the script (0 errors not favicon). K's graders passed O13 on the same kind of reading. The two graders of each app agreed, so it is not a disagreement and stays as graded; the table carries the reason.
