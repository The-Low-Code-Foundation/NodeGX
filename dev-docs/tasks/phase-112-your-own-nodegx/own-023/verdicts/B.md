I'd start my next app with **R**. Of the three folders, it's the only one where a non-developer can find out what to do, what was built and what's still wrong without someone to explain it.

I had no terminal, so I couldn't install or start anything myself. All three apps were already running, and I used them in the browser at phone width, plus a desktop-width window for M's settings panel.

## 1. What told me what to do next, and could I get it running?

- **R** has the best instructions. `README.md` starts at "Install Node.js… pick the LTS download", then two commands, a table of sample logins, and how to put it online with costs (about $10 a month). As a beginner I'd guess 15–30 minutes to get it running. The only stumble would be "open a terminal in this folder."
- **K** gives three commands in `README.md`. It assumes I already know what Node 22.13 is and how to check which version I have. That's maybe 30–60 minutes for me, mostly stuck on Node.
- **M** has no instructions written for me. `CLAUDE.md` is addressed to the agent, and the one command it gives, `npx @nodegx/preview openwave --open`, is wrong. Two later agents each found it fails (`followups/M/F2`, `followups/M/F4`); the working form is `npx -p @nodegx/preview noodl-preview openwave --open`. I'd have been stuck there with no way forward.

## 2. Could I follow the transcripts?

Not really, for any of them. They're thousands of lines of raw JSON. The only part I could read was the closing summary in each one, and all three summaries are clear. R's points me to `REPORT.md`, `README.md` and `DECISIONS.md`.

M's settings follow-up (`followups/M/F2`) was hard to watch: the agent kept restarting the panel every two hours and its cost grew to about $12.70. For comparison, the full builds cost about $8.56 for R, $9.25 for K and $16.48 for M.

## 3. Which line-by-line report could I read, and did I believe it?

- **R's `REPORT.md`** is the one I could read. It quotes my own sentences, gives a ✅ or ⚠️ for each, and links a phone screenshot; all 40 screenshots are in `verification/`. It also has an honest "What doesn't work yet" section. A later checking agent (`followups/R/F4`) called it accurate, except that plays can be faked to push a song up the charts. The graders mostly agreed: 35/41 and 38/41 passes. I believe it, with that one exception.
- **K has no report of its own.** The later check (`followups/K/F4`) says that on a phone, song lists show no titles and tapping a row doesn't play it. I checked the charts page at phone width, and the rows really are just a cover, a heart and "…". Both graders passed K on phone use (G19) and missed this. That made me trust the grader scores less.
- **M's later check** (`followups/M/F4`) found several things both graders passed over:
  - Seeking in a song is broken.
  - Anyone can read every user's email address.
  - The app only works on the computer it runs on.
- **The grader reports contradict themselves in places:**
  - R grader-1 marks O19 "fail", but its own description reads like a pass.
  - K's after-F2 grader-1 report gives two different totals.

## 4. Which settings panel could I use without help?

- **R:** yes. Log in as admin, tap **Settings** at the top. It has plain section names, a preview that changes as you type, a "Reset to defaults" button, and secrets explained in everyday words.
- **K:** yes, mostly. It's under the avatar menu as **App settings**, sitting next to a separate **Settings** entry, which confused me. Picking Violet changed the colour at once, and "Discard changes" undid it.
- **M:** it's the nicest to look at, with the form on the left and the live app on the right. But it's a separate program at its own address that I'd have to start myself with `npm start`. And it saves to the app's files as you type, with no Save button.

## 5. What did each folder leave me that I understand?

- **R:** instructions, a sentence-by-sentence report with pictures, a list of the 26 choices made for me and how to change each one, and a table explaining what each folder is.
- **K:** a good feature list and a "before going public" list, but written for a developer.
- **M:** documents written for the next agent (a brief, architecture notes, conventions). Nothing tells me how to run it, and there's no picture of the app.

## 6. Which would I start with?

**R.** It isn't the app with the most features; K's has more. I'm choosing R because it tells me how to run it, what it did, what it guessed, and what's broken, in words I understand. The things I'd ask the agent to fix first are the faked plays and the Next.js dev button that covers the Home tab.

My second choice would be K. The app is strong, but I'd need someone to explain the setup, and its phone lists are broken. I'd skip M for now: its run instructions are wrong, it leaks user emails, and it's written for agents rather than for me.

My screenshots from this check are in `my-screenshots/` in this folder.
