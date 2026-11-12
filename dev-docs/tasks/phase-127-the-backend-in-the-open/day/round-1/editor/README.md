# A day in the life

Pick someone from the Riverside members' area, and this tool walks them through the app the way it sends them:
the front page, signing in, then every page the band at the top offers *them*, opening the first item of each list.
At each page it shows what the page asked the backend for, and what the backend handed back to that person.

## Open it

```
cd day-in-the-life
npm start
```

It opens http://127.0.0.1:4477/ in your browser. Press Ctrl+C in the terminal to stop it. The app's backend has to be
running (it is at http://127.0.0.1:54256). If it moves to another address, change `backend` in `settings.json`.

## What it does and doesn't do

- It reads the app's pages from `../riverside` and plays their own logic: the band's "who is this?" check, each
  page's lists, each script. A list a page only loads for members is only loaded when the backend says they are one.
- A function runs on the real backend **as that person**, through a short-lived key that's switched off as soon as the
  day is played. A list the page reads itself is checked row by row with the backend's own rule check.
- It never runs anything that changes data. Buttons that would (Post, Approve, Remove, "Email me") are listed under
  each page with whether the backend would let that person do it, but never pressed.
- The admin key stays in the tool's server (`server.mjs`). The page in your browser never sees it, and the server
  answers only on this computer.

## Is it right?

`npm run suite` runs the NodeGX backend suite against the tool (on a copy of the app, `suite/app-copy`): it plays
each person's day again itself and compares, row by row. `npm run suite:broken` runs it against a version broken on
purpose, which must FAIL.

## Files

| file | what it is |
|---|---|
| `server.mjs` | the small server: holds the key, serves the page, plays a day when asked |
| `lib/day.mjs` | the engine: reads the app's pages, plays one person's day on the backend |
| `public/` | the page |
| `adapter.mjs`, `suite/` | how the backend suite checks the tool |
| `tools/` | checks used while building it (terminal versions of the day, and the page's render) |
