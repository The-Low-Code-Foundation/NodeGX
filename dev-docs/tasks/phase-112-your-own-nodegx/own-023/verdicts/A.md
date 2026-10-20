# My verdict: I'd choose R

I'm writing this as the person in the brief. I'm not a developer, Claude Code built me an app six months ago, it's online, and nothing has gone wrong. I read the brief, the paragraph, all 18 grader reports, the final scores, the four requests and the closing message from each follow-up agent. Then I opened the three running apps on a 390 px phone-width screen. Two things I checked myself turned out to matter more than anything the graders reported.

## 1. Would I have been happy with each app as delivered?

The graders scored all three about the same: 19/19 on the shared list for each, and 19, 21 and 19 on the rest (`grades/final.md`). From the scores alone I couldn't tell them apart.

- **K ("Hum")**
  - **What I'd have noticed:** the upload form is busy, with about 15 fields, and Home has 7 sections (`grades/as-built/grader-1/K/report.md`, O22). I'd have shrugged at that.
  - **What I'd never have noticed from a computer:** on a phone, song lists show no titles, and tapping a song does nothing. I opened `localhost:5101/charts` at 390 px. Each row shows only a cover, a heart and "…" (`my-screenshots/K-charts-390.png`). The title link is zero pixels wide, and tapping the row didn't navigate or start any audio.
  - Both graders passed K's phone and play lines (G12, G19) because they pressed Play on the song's own page. Only the later line-by-line agent caught it (`followups/K/F4/transcript.jsonl` turn 435).
  - My users are on phones, so they'd have found this before I did.
- **M ("OpenWave")**
  - **What I'd have noticed:** it's clean and plain. One grader noted the top-bar icons have no labels (`grades/after-F1/grader-1/M/report.md`, O22). I'd probably have been happy.
  - **What I'd never have noticed:** anyone can download the full list of user accounts with their email addresses. The line-by-line agent reported this (`followups/M/F4` turn 369). I checked it myself: an anonymous request to `127.0.0.1:8584/classes/_User` returned usernames and emails, and `/classes/Reaction` returned who liked what.
  - That is the one problem here that could actually hurt my users, and no grader tested for it.
- **R ("OpenSound")**
  - **What I'd have noticed:** search only updates after you tap "Go" (O4). There's also an "Open Next.js Dev Tools" button covering the Home tab (`grades/as-built/grader-1/R/report.md`, O12). That button probably only appears in development mode, but I'd have asked about it.
  - **What I'd never have noticed:** anyone can add fake plays to push a song up the charts. The line-by-line agent pushed one song to #1 with 200 plays in a few seconds (`followups/R/F4` turn 249).
  - That's annoying, but it doesn't put anyone's data at risk.

## 2. Where did the API key end up, and would I have known?

- **K:** in a `.env` file in the project folder, kept out of git. Only the server reads it, and the agent added a test checking that the key never reaches the browser (`followups/K/F1` turn 101).
  - The message told me this clearly. But K's README says nothing about putting the app online, so I wouldn't know how to get that file onto my live server without asking an agent again.
- **R:** in `.env.local`. The agent left an empty `MISTRAL_API_KEY` line for me to fill in, and the Settings screen shows the key only as "set" or "not set" (`followups/R/F1` turn 497).
  - This is the only one where I could open the app and see whether my key was in.
- **M:** I paste the key into `openwave/.env`, but then an agent has to "load it into the backend" before the button works. On my own, the agent said I'd have to edit `~/.noodl/backends/backend_mvfkn0qqxd7no/secrets.json` (`followups/M/F1` turns 329 and 403).
  - In the same change, without being asked, the agent moved some of the backend's files into a backup folder (turn 329).
  - The agent's tool connection also dropped partway, and it took four more "continue" rounds to end up still waiting for me (turns 342–403).
  - I'd have known where the key was meant to go. I wouldn't have known whether it was working.

## 3. What broke when a later agent changed each app, and how would I have found out?

As the final scores note, the two graders often disagree, so a line that moves between stages may just be a different grader (`grades/final.md`).

- **K:** nothing new after either change, apart from noise between graders.
- **M:**
  - After the settings change, one grader saw a new console error when using the genre filter, coming from a part the settings agent had just reworked (`grades/after-F2/grader-1/M/report.md`, O13).
  - "For you" stayed empty after likes and dislikes in both later rounds (O20). But one grader had already seen it stay empty as built until an extra like, so I can't blame the changes for that.
  - I'd only have found out if a user complained.
- **R:**
  - After the settings change, one grader failed it because the Home rows scroll sideways (`grades/after-F2/grader-2/R/report.md`, O12). They look like intentional swipeable rows to me, not a breakage.
  - The settings agent also stopped the Top chart cutting off at 50 songs, and it told me so.

## 4. Which settings panel would I actually use?

- **R**, without question. It's inside the app, on my phone, behind the admin login, and it has preview, save and reset (`my-screenshots/R-settings.png`).
  - It already existed as built: the app name and many switches were on it before the settings request (`followups/R/F2` turn 382, `followups/R/F1` turn 497).
  - Would I have opened it before being asked? Yes. "Settings" sits in the top bar when I'm logged in as admin, and it has sensible controls like "Let new people sign up" and points per like.
- **M's** panel is the nicest-looking, with the form on the left and the live app on the right (`my-screenshots/M-panel.png`). But it only runs on my computer. The agent said it stops after about two hours or when the chat ends, and to keep it running I'd need a terminal (`followups/M/F2` turn 672). I'd stop using it after the first time it disappeared.
- **K's** is inside the app too, owner-only (`followups/K/F2` turn 287). That agent had no browser and never saw the screen it built, so I'd be the first person to look at it. I didn't open it myself.

## 5. Where could I see where a like count came from without an agent?

- **R** is the only one. The agent's answer was "log in as lee@example.com, password demo1234, and look at your Library" (`followups/R/F3` turn 41). I can do that on my phone. It only works because the likes come from sample accounts, though; for real users I couldn't log in as them.
- **K's** answer is terminal commands (`sqlite3`) (`followups/K/F3` turn 26). That's useless to me.
- **M's** agent couldn't confirm the number because the backend wasn't running (`followups/M/F3` turn 86).

Honestly, it didn't matter to me. I'd trust the number.

## 6. Which line-by-line report would I trust?

- **K's**, and it beat the graders. It found the phone song-list bug that both graders passed, and I confirmed that bug myself. It also found that Suno link import fails and that the Remix button can't be switched off. It tested on a copy of my data.
- **M's** also beat the graders. It found the email leak, which I confirmed, and it noted that everything points at `127.0.0.1`, which only works on the computer the app runs on. But it left a test account, a song and a playlist in my real app (turn 369). I wouldn't like that.
- **R's** agrees with the graders on almost everything. It added two real security problems: fake plays, and an admin-takeover risk once the site is live. It said "nothing scrolls sideways", which is true for the page as a whole. It also tested on a copy.

I'd trust all three reports over the grades. The graders scored all three the same, and they missed the two worst problems in the whole study.

## 7. Which setup would I choose for my next app?

**R.** These are the things in the folders that decided it:

- It's the only one that gave me controls I can use myself, on my phone, without an agent or a terminal: settings, a key status that says "set" or "not set", and a like count I can check.
- Its README tells me how to put the app online (Render, `ADMIN_EMAIL`/`ADMIN_PASSWORD`). K's README says nothing about it.
- Its worst hidden problem is chart cheating, not a broken phone experience (K) or leaked user emails (M).

What gives me pause:

- R's search doesn't update as you type, and it's missing shuffle and repeat.
- If I picked R, I'd ask an agent right away to block the fake plays and set the admin password before going live.

M is the one I'd rule out, and not for how it looks. It's the one where I couldn't tell whether things were working without an agent, and it's the one that leaked emails.

Everything I checked myself is in `my-screenshots/`.
