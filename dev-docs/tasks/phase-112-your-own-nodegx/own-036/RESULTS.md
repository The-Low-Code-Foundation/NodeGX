# OWN-036 AC5 — results

Lab: `~/vscode_projects/fp-lab/{a,b,c,d}/my-apps` (`lab.mjs`; which arm has which kit is in `ARMS.json`). Claude Code
2.1.317, `claude-opus-5-5`, `--permission-mode auto`, sealed by `arm.mjs`. Richard sees the arms as App 1 (a), App 2
(c), Game 1 (b), Game 2 (d), and is not told which kit each has. That blindness is partial: arm d's first reply names
"this project's rules".

## Turn 1 (2026-11-03, 21:5x, all four in parallel; each got its brief word for word)

| arm | kit | brief | what came back | turns | min | $ |
|---|---|---|---|---|---|---|
| a | new | app | five questions in one message (feel and first screen, device, how people say who they are, voting rules, what it won't do), then "a first version you can click through … then we can improve it in rounds" | 3 | 0.2 | 0.12 |
| c | old | app | a written scope (stores, three pages, left out) and three questions; asks for "go" | 3 | 0.3 | 0.20 |
| b | old | game | **no questions: built the whole game** ("Deep Glow", a NodeGX app whose cave world is one Script node), drove it headless at desktop and phone sizes, listed its own choices and two open questions | 26 | 10.9 | 2.63 |
| d | new | game | six questions (games loved, what bored them, feel, device, how a run goes, what it won't have); says the world will be plain canvas code because NodeGX "can't yet put a moving world and its menus in one app" | 3 | 0.2 | 0.15 |

Read so far, nothing judged: the new kit asked the brief's questions in one exchange on both briefs. The old kit
asked for the app and built straight away for the game. Richard's answers are relayed word for word; nobody answers
for him.

## Turn 2 (2026-11-03, 22:38): Richard's answers, word for word (`msg/a-2.txt`, `msg/c-2.txt`, `msg/d-2.txt`)

App 1 (a): playful; phones; pick your name; several votes each, the round closes on a date, the winner becomes current
reading; no meeting scheduler. App 2 (c): pick your name; as many votes as they like; "I close the vote and choose".
Game 2 (d): Echo the Dolphin ("the atmosphere, playfulness mixed with dread"); bored by repetitiveness; cosy and
pretty; phone; levels with an exit ("descending forever isn't believable"), no refills, pockets of air underwater;
"Anything goes". Game 1 (b): no notes yet, so nothing was sent. Arms a, c and d run their turn in parallel, at
`nice -n 10` beside a peer's nodegx-export suite.

**~22:52: Richard's first reading on App 1.** Arm a's server opened `a/my-apps/book-club` in Richard's browser.
Richard, verbatim: *"There was a book club app just opened in NodeGX Studio in my browser, and it was shit"*. 🔴
Correction, read from arm a's transcript afterwards: this was **not** a half-built app. Arm a handed over at 22:53:51
("Your Book Club app is built, and it's open in your browser now"), so what he saw was the first version it delivered.
The Studio window itself comes from `~/vscode_projects/nodegx-studio` (`serve.mjs`, child of the arm's
`@nodegx/mcp@0.2.8`); a stranger without that checkout gets no Studio at all (filed: P128-S3-NOSTUDIOFORTHEEDITOR).

| arm | kit | handed over (CET) | what it says it built | turns | min | $ |
|---|---|---|---|---|---|---|
| a | new | 22:53 | "Book Club": pick your name or "Add me ✨" (animal emoji); Home = reading now + vote; Suggest; Vote rounds closing in 3 days / 1 / 2 weeks, many votes each, countdown, winner 🏆 → "Start reading it!"; Shelf with stars. Drove the loop with two pretend members, deleted the test data. Lists its own choices (closes 9pm, tie → first suggested, no admin, no live refresh). Notes in `docs/LOOK.md`, `docs/LEARNINGS.md` | — | ~16 | 9.94 |
| c | old | 22:47 | "Book Club": pick your name, as many votes as they like, live counts; only the organiser sees "Choose this book →"; Reading now; Read with stars. Names are "Member 2…8" placeholders; left *Piranesi* test data in and says so | 76 | 9.2 | 4.33 |
| d | new | 22:50 | "Glimmerdeep", plain canvas page: three caves ending in a stone gate, air drains and comes only from pockets that run dry, jellies / shy fish that flee the lamp / shells shown only by a ping, from cave 2 a large thing in the dark drawn to the lamp; bells on a rising scale. 16 headless checks at 390×844 ×3; says what a headless test can't judge. Promises the round notes go verbatim into `docs/LOOK.md` | 31 | 12.2 | 2.64 |

Arm a's `$9.94` and its process ending at 01:03 are one run: it backgrounded its preview, restarted it when the
10-minute limit killed it, and its last reply (00:03 UTC) is the wake-up when the 2-hour limit killed it again. Its
`num_turns: 1` is that wake-up only. Cost of keeping a server alive inside the agent's turn, not of building: noted,
not yet split out. Arm d left `python3 -m http.server 8765 --bind 0.0.0.0` running from `d/my-apps/glimmerdeep`
(PID 35547) for Richard's phone; kept until he has played, then stopped by PID.

To play (from each arm's folder, never the checkout: P112-OWN036-PREVIEWINREPO):
App 1 `cd ~/vscode_projects/fp-lab/a/my-apps && npx @nodegx/preview book-club --open --host 0.0.0.0` ·
App 2 `cd ~/vscode_projects/fp-lab/c/my-apps && npx @nodegx/preview book-club --open --host 0.0.0.0` ·
Game 1 `cd ~/vscode_projects/fp-lab/b/my-apps && npx @nodegx/preview deep-glow --open --host 0.0.0.0` ·
Game 2 `http://192.168.1.58:8765` on the phone (or `http://127.0.0.1:8765`).

## Richard plays all four (2026-11-04, ~01:30), word for word

> **App 1:** It changed a bit since you previewed it to me. It was less shit. I can say the functionality is there and
> working correctly. The profile at the top right showed as a JSON string instead of text. Arguably is looked a little
> better styled, nicer colours and more friendly and fun like the brief. Nice font choice and emojis. Functionality
> wise it's better over App 2 because it allows starting a vote with a specific time limit. Generally App 1 has a
> better UX, but the UI is a bit childish and looks silly on desktop (which was arguably due to the brief saying it's
> mobile first). Also the voting text has a JSON string printed out next to the voted user's name
>
> **App 2:** This one has a clean, simple design, and is mobile and desktop friendly from the start. The functionality
> is there, but you're presented at app load with 'who are you' and 8 nameless people, which I guess is just for
> testing but APp 1 had the functionality to add your name to the pile and started with nobody, which is more
> credible. Other than that the app is clean but the UX is very basic.
>
> **Game 1:** It works fine, no sound which is sad and completing the game is fairly easy. The difficulty doesn't
> appear to increase and getting air is a breeze. It becomes very repetetive after a while, which is ok for a
> prototype just to get a feel for the mechanics but it deffo wasn't that fun to play
>
> **Game 2:** This is beautiful, amazing concept with the fish running away when there's light, switching off the
> light to attract them, the help tips popping up, the ability to ping to find secret stuff, the sounds were
> beautiful, it really got the concept in the brief of making me nostalgic for Echo the Dolphin. In a second prompt
> I'd probably tell it to forget the submarine and just go for a freaking dolphin and then my life would be complete.
> Very good suggesting that levels end and new levels start. It felt like for a one shot there was a lot to discover
> and it was for sure as fun as a 'real' game. This one is a keeper, I'll get my kids to play it

**App 1's two JSON strings are App 2's saved name, not App 1's code (measured).** Both apps keep "who is on this
phone" in `localStorage['bookclub.member']`. App 2 writes `JSON.stringify({name, isOrganiser})`; App 1 writes and
reads a bare name and puts it straight into the chip (`'Hi, ' + name`) and into each vote's `member`, which the vote
row prints after 👍. `@nodegx/preview` serves every app at `http://127.0.0.1:8575` by default (`src/cli.ts:63`), so
both apps were one origin in Richard's browser and shared that storage. Arm a's own drives show `Hi, Richard` and
`👍 Richard` (17 and 6 hits in its transcript). Filed as P112-OWN036-PREVIEWSHAREDORIGIN: a stranger who previews two
apps meets the same thing. A vote cast in App 1 that evening may carry the JSON string in its row.

### AC5 verdict

Unblinded (ARMS.json): **new kit = App 1 (a) and Game 2 (d); old kit = App 2 (c) and Game 1 (b).**

- **Game: a clear win for the new kit.** Game 2 is "a keeper, I'll get my kids to play it"; Game 1 "deffo wasn't that
  fun to play". The old-kit arm built straight away with no questions; the new-kit arm asked the six questions,
  Richard answered them in one message, and the answers (Echo the Dolphin, no refills, air pockets, levels that end)
  are what he praised. Cost: Game 2 $2.79 over two turns, Game 1 $2.63 in one.
- **App: mixed, leaning new kit.** App 1 has "better UX" and better functionality (rounds with a time limit, starts
  with nobody); App 2 has the cleaner design that works on desktop as well as phones. App 1 looks "childish and silly
  on desktop". Its JSON strings were the lab's shared origin, see above. App 1 cost $10.06 to App 2's $4.53; part of
  App 1's cost is keeping its own preview alive inside its turn for two hours.
- **The kit passes AC5**: neither new-kit arm is the one he'd throw. This is one sample per brief, and it reads that
  way: say "it helped on both briefs, a lot on the game", never "a boost" in general.

Owed by the reading: (1) App 1's desktop look: the first-project skill says "copy the genre" for games only; a line
about a phone-first app still looking deliberate at desktop width is a candidate, not yet measured; (2) App 1's
background-preview spend: a line saying "hand over the start command, don't babysit the server" is a candidate.
