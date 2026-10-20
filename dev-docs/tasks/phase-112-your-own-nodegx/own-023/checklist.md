# The checklist — what a person does on the phone, one line each

Written 2026-10-19 (OWN-023 scoping) from `brief.txt` alone, before any arm ran. Every line is a sentence of the
brief turned into a thing a person does, so the same list grades a React app and a NodeGX app. Where the brief
is vague ("I dunno if…", "could be optional?") the line takes the brief's own lean and says so. SP1's agent wrote its
own 27-line list from the same words (`OWN-019 Mistral apps/SP1/open-music/docs/CHECKLIST.md`); it is a cross-check,
not the source — it was written by an arm.

The grader plays at phone width (390 px) in headless Chrome, reads only what a person sees, and marks each line
`pass`, `fail` or `not reached`, with a screenshot. A line whose step could not be reached fails.

## Upload and describe a song (brief: "upload their favourite music creations", "properly categorise them",
## "create fake artists and albums", "add cover art and background info", "a link back to Suno")

1. There is a way to add a song from an MP3 on my phone (a file picker; a "use a demo file" button counts if a real
   picker also exists).
2. When I add a song I can give it a title, a genre (from a list or free text), an artist and an album.
3. I can make a new artist with a name and some background text, and a new album with a title and cover art.
4. I can give the song a link back to where it was made (the brief leans Suno-first, link optional).
5. After adding, the song appears in the app's main list with its cover, title, artist and genre.

## Find music (brief: "categorising and filtering, searching, ranking a song by popularity", "find new music")

6. A search box narrows the list by title or artist as I type.
7. I can filter the list to one genre and clear the filter again.
8. I can sort by popularity and the most-liked song comes first.
9. Tapping an artist opens a page with their background text and their songs.
10. Tapping an album opens a page with its cover and track list.

## Play (brief: "their system for playing music is terrible")

11. Tapping a song plays it; a player shows the title and a pause control.
12. Pause and resume work.
13. The song keeps playing when I go to another page of the app.

## Taste and people (brief: "like or dislike songs to learn your tastes", "follow other people", "follow interesting
## creators", "share playlists with friends")

14. I can like a song and unlike it; the count changes.
15. I can dislike a song and undo it.
16. I can follow a creator and unfollow them.
17. There is a place that shows songs from the people I follow.
18. I can make a playlist, add a song to it, and open it to see the song.
19. A playlist has a link I could send to a friend; opening that link shows the playlist.

## It is an app, not a page (brief: "music sharing site", "people upload", "follow other people")

20. I can sign up and sign in; what I uploaded is still there after I sign out and in again on a second device
    (a second browser profile).
21. After a reload, what I liked and followed is still liked and followed.
22. Works at phone width: no horizontal scroll on any page, nothing cut off, controls reachable.
23. No errors in the browser console on the pages above.

## Read, not scored

- The brief's "open source music" means the code is the person's; the grader notes what the person received in
  the folder: a README, how to run it, how to deploy it.
- Where the song files and records live (browser only, a local server, a hosted service) and whether a second
  person on another device sees them (line 20 is the test).
