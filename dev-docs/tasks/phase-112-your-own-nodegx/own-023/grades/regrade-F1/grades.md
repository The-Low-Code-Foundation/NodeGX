# Blind grades, two graders per app (letters only)

| | Part 1 (19): grader 1 · grader 2 · both | Part 2 (22): grader 1 · grader 2 · both | lines they disagree on |
|---|---|---|---|
| K | 19 · 19 · 19 | 19 · 18 · 18 | O8 |
| M | 18 · 19 · 18 | 19 · 18 · 17 | G11, O12, O19, O20 |
| R | 19 · 19 · 19 | 19 · 19 · 19 | — |

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
| G11 | pass | pass | fail | pass | pass | pass |
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
| O8 | pass | fail | pass | pass | pass | pass |
| O9 | pass | pass | pass | pass | pass | pass |
| O10 | pass | pass | pass | pass | pass | pass |
| O11 | pass | pass | pass | pass | pass | pass |
| O12 | fail | fail | pass | fail | pass | pass |
| O13 | pass | pass | fail | fail | fail | fail |
| O14 | pass | pass | pass | pass | pass | pass |
| O15 | pass | pass | pass | pass | pass | pass |
| O16 | pass | pass | pass | pass | pass | pass |
| O17 | pass | pass | pass | pass | pass | pass |
| O18 | pass | pass | fail | fail | pass | pass |
| O19 | pass | pass | fail | pass | pass | pass |
| O20 | pass | pass | pass | fail | pass | pass |
| O21 | pass | pass | pass | pass | pass | pass |
| O22 | fail | fail | pass | pass | pass | pass |

## The disagreements, in the graders' words

**K O8** — grader 1: *pass* — Unliking cleared the like and the count changed (0 → 1 → 0), but only after a reload; right after each tap the old number stayed.

grader 2: *fail* — Unliking works (button un-pressed, and after a reload "0 likes"). But the count on the page did not change when I tapped Like or Unlike; it changed only after a reload.

**M G11** — grader 1: *fail* — The popularity rankings (Trending and "Most popular") put Low Pressure (2 likes) first, ahead of Station Platform (4 likes, the most-liked song). Only the separate "Most liked" sort puts Station Platform first.

grader 2: *pass* — The "Most liked" sort puts Station Platform (4 likes, the most) first; the default "Most popular" sort and home "Trending" do not, and there Station Platform is 13th of 15.

**M O12** — grader 1: *pass* — On home, search, library, upload, song, artist, album, playlist and creator pages the page was 390 px wide with no sideways scroll; no text was cut off and the player bar was reachable.

grader 2: *fail* — No page scrolled sideways and all controls were reachable, but some text is cut short with "…": card titles ("Burnt Toast Anthem", "Udio Lighthouse Test") and the player's "Nothing playing" label.

**M O19** — grader 1: *fail* — Searching "graderb" found only their song, not the person. I reached their creator page through the song's "Shared by @graderb" link and followed them there, and they then appeared under "Creators you follow" in Library.

grader 2: *pass* — Searching "gradera1" or "@gradera1" showed no person; B reached the profile through "Shared by @gradera1" on a song page, followed, and @gradera1 appeared in "Creators you follow".

**M O20** — grader 1: *pass* — I liked 2 Electronic songs and disliked 2 Folk songs; "For you" then showed only Chrome Hearts (Electronic) and no Folk songs.

grader 2: *fail* — B liked 3 Electronic songs and disliked 3 Folk/Country songs; "For you" stayed empty even after a reload, and "More like this" said "Suggestions are not switched on yet: the Mistral key has not been added."
