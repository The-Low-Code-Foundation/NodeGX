# A day in the life — report

## What I built

A tool of your own, in its own folder: **`./day-in-the-life/`**. You pick someone from your members' area: Dev
(waiting to be approved), Chloé or Ben (members), or Ada (moderator). The tool then plays their day through the app:

1. They open the app's front page (not signed in yet).
2. They press "Members sign in" and sign in.
3. They land where signing in sends them (Members), then press each button in the band that **they** can see,
   opening the first announcement and the first meeting from the lists. Ada also gets Post, Requests and Who belongs.
   Dev gets the band but no content.

For each page it shows what the page asked the backend for, why it asked (for example "the band's Member signal"),
and what came back to that person: the actual rows, which you can click to see, or an answer with no rows in it, or a
refusal. A summary at the top counts, table by table, how many rows reached them all day ("Announcement: 3 of 3",
"Member: 0 of 3, never handed to them") next to the rule for reading that table. Under each page it also lists the
buttons that would change something (Post, Approve, Remove, "Email me"), with whether the backend would let that person
do it and whether the button is even on their screen. **It never presses them.**

How it knows: it reads your app's own pages and plays their logic. The band's "who is this?" check really runs on the
backend as that person, through a short-lived key that's switched off straight after. The app's own scripts then
decide what each page does next, exactly as written. A list a page reads itself is checked row by row with the
backend's own rule check, as that person. Nothing about the route is typed in by hand for Riverside, so if you add a
page to the band, it shows up in the day.

### What the days show today

| person | pages | what reached them |
|---|---|---|
| Dev Patel (no group yet) | 5 | only the association's name. The app checks his standing on every page ("pending") and loads nothing else. |
| Chloé Martin, Ben Hart (members) | 7 | all 3 announcements, both meetings and the association. Never a Member or MemberRequest row. Their "Email me" setting comes back as a yes/no answer, not as their Member row. |
| Ada Okafor (moderator) | 9 | everything: the 3 directory rows and Dev's request as well. |

## How you open it

In a terminal:

```
cd /private/tmp/bko009/lab/day/day-in-the-life
npm start
```

Your browser opens at **http://127.0.0.1:4477/**. Ctrl+C in the terminal stops it. Your app's backend must be
running (at http://127.0.0.1:54256); if its address changes, edit `backend` in `day-in-the-life/settings.json`.
The admin key stays in the tool's small server: the page in your browser never sees it, and the server only answers on
this computer.

## Is it right? The backend suite

The NodeGX backend kit comes with a suite that replays each person's steps itself and compares what the tool shows
with what the backend really hands them, row by row:

```
PASS — A day in the life on Members' Area, 0 edits; 53 steps shown to 4 people (11699 ms); both places put back
```

To make sure that PASS means something, I ran it against a copy of the tool that is wrong on purpose. That copy
shows Dev two announcements and hides one from Ben. The suite caught both:

```
FAIL — A day in the life (broken on purpose) on Members' Area, 2 differences (24273 ms); both places put back
  Dev, step 7 (Announcement): the editor shows 2 rows of Announcement the backend didn’t hand them (df4db8b6-…, 7ebf2541-…).
  Ben, step 3 (Announcement): the backend handed them 1 row of Announcement the editor doesn’t show (ccde97b7-…).
```

Run them again with `npm run suite` and `npm run suite:broken` from the tool's folder.

## Your app and its backend

- **App folder:** untouched. I checked afterwards, and no file in `./riverside` changed. I only read it, and the
  NodeGX server was opened on it read-only. The suite rewrites the rules files at the end even when nothing changed,
  so I ran it on a copy, `day-in-the-life/suite/app-copy`.
- **Backend:** the tables, rows, people, groups, rules and triggers are as they were. I checked counts, rules and
  the Member rows' timestamps afterwards. What it does leave behind: each day played and each suite run makes a
  short-lived "view as" key (named `view-as-…-by-backend-map`). The key is switched off the moment the day is done,
  but the backend keeps a record of it. There are 27 such records from my runs; **none works**, and the kit can't
  erase them. Running functions as someone also adds entries to the backend's run log and audit log. The tool only
  runs functions that read (`myStanding`, `myNotifySetting`).

## How long it took

About 11 minutes of wall-clock time, from 22:44 to about 22:55 on 30 October 2026, including this report.

## Every place I had to guess

**About what a "day" is**
1. **The route.** You didn't say which pages make up a day. I took: front page → sign in → where signing in lands →
   each band button they can see, in the band's order → the *first* item of each list. A real person might open the
   third announcement, or skip Meetings. The tool always picks the first item as the list shows it (newest
   announcement, next meeting).
2. **Pages left out of a day:** Join, Set up and Unsubscribe. Join and Set up are for people who aren't members yet
   and only *write*. Unsubscribe arrives from an email link with a token. None of them is reached from the band.
3. **No one "not signed in"** in the list of people. Their day is the first two pages of everyone's day. A key can't
   act as nobody, so functions aren't run before signing in (the front page calls none).
4. **The window is wide.** The band hides its buttons behind a "Menu" on narrow screens. I played it as a desktop
   window, where they're all on show.
5. **Names.** Accounts have only emails, so I took each person's name from the row that names them (their Member
   row, or Dev's MemberRequest row).
6. **Nothing is pressed.** Buttons that change data are listed, never pressed, so "what the app handed them" is what
   came back from reading. That's what the kit's guide insists on, and it's what keeps your data as it was.

**About how NodeGX runs a page** (the tool plays the app's own logic, so it had to copy how NodeGX would)
7. **Once per moment.** When a node gets a value and a "run" at the same moment, I assumed NodeGX runs it once.
   Without that, every page asked the backend twice.
8. **A filtered list with nothing wired to "fetch"** (Meetings: "when ≥ today") waits until its filter value has
   arrived, then loads. The kit's own reading says a list like that loads when the page opens. Either way, the same
   rows come back.
9. **"Today"** is the tool's computer's date, as the app's own script works it out. A meeting in the past would
   drop off the Meetings list, and the tool says so ("1 more row they may read was left out by that filter").
10. **Filters and sort** of a list are applied by the tool to the rows the backend's rule check allows. A filter it
    can't read is shown unfiltered, with a note saying so. The backend's own query never runs as the person, because
    the kit's person-keys can only call functions, not read tables.
11. **Lists of more than 200 rows** are checked only for their first 200, the same cap the kit's suite uses. Riverside
    has at most 3 rows per table.
12. **Rows inside a list** (each announcement row) aren't played; only their "open this" button is followed.
    Riverside's row parts ask the backend for nothing, but another app's might.
13. **"Would the backend let them" for a button** comes from the backend's rule check for the table, or from whether
    the function is on the list the backend offers that person. Whether the button is on their screen is found by
    its label, so two buttons with the same label on one page could be confused.

**About the kit and its suite**
14. **Opening one row by its id** (the announcement page, the meeting page) is shown in the tool but **not sent to the
    suite**. The suite reads a "table step" as "every row of the table this person may read", so it would mark one
    opened announcement as "missing the other two". There is no way to tell it "one row, by id".
15. **For the same reason, a list whose filter leaves rows out** isn't sent to the suite either. Today none does.
16. **`rowsIn`**, which the suite uses to find rows in a function's answer, isn't one of the kit's exports. I imported
    it from the kit's own file so the tool and the suite agree.
17. **The suite on your live backend.** The guide says to run the suite on a copy with "a backend of its own". The
    kit offers no way to make a second backend, and I wasn't going to set one up with the NodeGX server, because that
    writes into a project. So I ran it with **no edits** (this tool makes none) against your backend, and on a copy
    of the app folder. With no edits it changes no rules or triggers on the backend. It does leave the switched-off
    key records described above.
18. **A plain web page, not a NodeGX app.** Your CLAUDE.md asks for apps here to be NodeGX apps, but sends tools that
    read an app to the backend-editor guide. That guide describes your own small server plus a page, so the admin
    key stays out of the browser. I followed the guide.
19. **No GitHub issue.** The kit's guide asks for this report to be posted as an issue on
    `The-Low-Code-Foundation/NodeGX`. That publishes it, so I left it for you to decide. Items 7–17 are the parts
    worth sending.

## What's in the folder

`server.mjs` (the server that holds the key), `lib/day.mjs` (the engine), `public/` (the page), `adapter.mjs` and
`suite/` (the suite's check, the broken-on-purpose version, and the app copy), `tools/` (terminal checks I used
while building), `settings.json` (where the app and backend are), and `README.md`.
