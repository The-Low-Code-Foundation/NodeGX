# Blind grades, two graders per app (letters only)

| | Part 1 (19): grader 1 · grader 2 · both | Part 2 (22): grader 1 · grader 2 · both | lines they disagree on |
|---|---|---|---|
| K | 19 · 19 · 19 | 18 · 19 · 18 | O15 |
| M | 19 · 19 · 19 | 19 · 19 · 18 | O20, O22 |
| R | 19 · 19 · 19 | 20 · 18 · 18 | O12, O13 |

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
| O12 | fail | fail | pass | pass | pass | fail |
| O13 | pass | pass | fail | fail | pass | fail |
| O14 | pass | pass | pass | pass | pass | pass |
| O15 | not reached | pass | pass | pass | pass | pass |
| O16 | pass | pass | pass | pass | pass | pass |
| O17 | pass | pass | pass | pass | pass | pass |
| O18 | pass | pass | pass | pass | pass | pass |
| O19 | pass | pass | fail | fail | pass | pass |
| O20 | pass | pass | pass | fail | pass | pass |
| O21 | pass | pass | pass | pass | pass | pass |
| O22 | fail | fail | fail | pass | pass | pass |

## The disagreements, in the graders' words

**K O15** — grader 1: *not reached* — Pause and resume carried on from the same point (662 → 688), but a headless browser can't play sound, so I couldn't confirm the song is audible.

grader 2: *pass* — Resume carried on from the paused point (127 paused, 140 just after resuming). I couldn't listen to the sound; what I saw was the seek bar of the real file moving.

**M O20** — grader 1: *pass* — After B liked two Electronic songs and disliked both Hip-Hop songs, Home "For you" showed one suggestion, Slow Motion Exit (Electronic), and no Hip-Hop.

grader 2: *fail* — After liking 3 Electronic songs plus my Jazz song and disliking 2 Rock songs, Home "For you" still said "Give a few songs a thumbs up and this fills with music like them." and showed no songs, also after a reload.

**M O22** — grader 1: *fail* — The four nav icons and two header icons have no text, so I had to tap each one to find out what it did. On a song page, "Add" with "＋ New playlist" showing still said "Pick a playlist first" until I picked that option again. Search found no people to follow.

grader 2: *pass* — I could play, search, make a playlist and follow a creator without getting stuck, and the screens are plain lists. The top menu buttons are icons with no text labels, and finding a person to follow meant going through one of their songs.

**R O12** — grader 1: *pass* — On all 21 pages I checked, the page stayed 390 px wide with no controls off-screen. The home page's song rows swipe sideways inside their row, but the page itself does not scroll sideways.

grader 2: *fail* — None of the 16 pages I checked scrolls sideways as a whole, but the home page's "Made for you", "Trending this week" and "New releases" rows scroll sideways inside the page.

**R O13** — grader 1: *pass* — The only console errors were "Failed to load resource: 404" for /favicon.ico, logged on almost every page load in both profiles. There were no other errors or warnings.

grader 2: *fail* — Every page load logged `Failed to load resource: 404 (Not Found) @ /favicon.ico` as an error (3 times for A, 12 for B); there were no other errors.
