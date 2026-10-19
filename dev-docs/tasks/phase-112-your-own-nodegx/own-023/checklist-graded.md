# The graded checklist

Made 2026-10-19 (OWN-023 s1, before any arm ran) from two lists written from the same paragraph: `checklist.md`
(written by the repo's scoping session, 23 lines, marked **repo**) and `checklist-outside.md` (written by a fresh Opus
5.5 outside the repo from `brief.txt` alone, 22 lines, marked **outside**). Control C4: the lines both lists have are
reworded only to merge their wording, never to add. Every line one list has and the other doesn't is graded too,
below the rule, marked with who wrote it. The two parts are reported separately.

Play every line at phone width (390 px). Some lines need two accounts or a second browser profile ("person A",
"person B"). Mark each `pass`, `fail` or `not reached`. A line you couldn't get to counts as a fail.

## Part 1: lines both lists have

| # | the line | repo | outside |
|---|---|---|---|
| G1 | I can create an account and sign in. | 20 | 1 |
| G2 | I can add a song from an MP3 file on my phone, and it then shows up in the app as a song. (A "use a demo file" button counts only if a real file picker also exists.) | 1, 5 | 2 |
| G3 | I can give a song a genre (a category), and the song then shows it. | 2 | 3 |
| G4 | I can add cover art, and it shows with the song. | 3, 5 | 4 |
| G5 | I can add background info (free text), and someone who opens it can read it. | 3 | 5 |
| G6 | I can give a song a link back to where it was made (Suno), and tapping the link opens that page. | 4 | 6 |
| G7 | I can create a made-up artist, put a song under that artist, and open the artist's page to see the song there. | 2, 3, 9 | 7 |
| G8 | I can create an album, put a song in it, and open the album to see the song in it. | 2, 3, 10 | 8 |
| G9 | Searching for a word from a song's title or its artist's name shows the matching song. | 6 | 12 |
| G10 | I can filter to one genre, and only songs in that genre are shown. | 7 | 13 |
| G11 | There is a ranking by popularity, and the most-liked song comes first. | 8 | 14 |
| G12 | Tapping a song plays it, and I can pause it and resume it. | 11, 12 | 11 |
| G13 | I can like a song, and the like is still there when I leave and come back (including a reload). | 14, 21 | 19 |
| G14 | I can dislike a song, and the dislike is still there when I leave and come back. | 15 | 19 |
| G15 | I can follow someone who uploads songs, and unfollow them. | 16 | 17, 18 |
| G16 | Songs from the people I follow appear in one place, without my searching for them. | 17 | 18 |
| G17 | I can make a playlist, add songs to it, and open it to see (and play) them. | 18 | 15 |
| G18 | I can share a playlist so another person (person B) can open it and see its songs. | 19 | 16 |
| G19 | It can be used on a phone. | 22 | 1, 22 |

## Part 2: lines only one list has

Graded and reported apart from Part 1.

| # | the line | who wrote it |
|---|---|---|
| O1 | When I add a song I can give it a title, an artist and an album in the same step. | repo (2) |
| O2 | An artist has a name and background text; an album has a title and cover art. | repo (3) |
| O3 | After adding, the song appears in the app's main list with its cover, title, artist and genre. | repo (5) |
| O4 | The search narrows the list as I type. | repo (6) |
| O5 | I can clear the genre filter again. | repo (7) |
| O6 | The player shows the song's title. | repo (11) |
| O7 | The song keeps playing when I go to another page of the app. | repo (13) |
| O8 | Unliking a song works, and the like count changes when I like or unlike. | repo (14) |
| O9 | I can undo a dislike. | repo (15) |
| O10 | What I uploaded is still there after I sign out and sign in again on a second device (a second browser profile). | repo (20) |
| O11 | After a reload, the people I follow are still followed. | repo (21) |
| O12 | No horizontal scrolling on any page, nothing cut off, controls reachable at 390 px. | repo (22) |
| O13 | No errors in the browser console on the pages above. | repo (23) |
| O14 | Background info and cover art can be added to the song itself (not only to its artist or album). | outside (4, 5) |
| O15 | Pausing and resuming carries on from the same point, and I can hear the song. | outside (11) |
| O16 | I can add a song made with an AI tool other than Suno, and the app doesn't block it. | outside (9) |
| O17 | I can save a song without a link back to a platform, and its page then shows no broken link. | outside (10) |
| O18 | The popularity ranking also moves when person B plays a song more than the others, not only when they like it. | outside (14) |
| O19 | I can find another person (not only an artist) and follow them, and they then appear in my following list. | outside (17) |
| O20 | After I like several songs in one genre and dislike several in another, the songs the app suggests lean toward the liked genre and away from the disliked one. | outside (20) |
| O21 | There is a place in the app to discover songs I haven't uploaded, liked or played yet. | outside (21) |
| O22 | A first-time user can play a song, search, make a playlist and follow a creator without help and without getting stuck, and the screens are plain, not elaborate. | outside (22) |

## Read, not scored (repo)

- What the person received in the folder: a README, how to run it, how to deploy it.
- Where the song files and records live (only in the browser, a local server, a hosted service) and whether a second
  person on another device sees them (G18 and O10 test it).
