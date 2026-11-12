# Digital Bricks University: start here

A 1:1 coaching platform built entirely with NodeGX. A coach (Richard, in the example world) builds each learner a
plan of live sessions, homework and check-ins, reviews what they hand in, and answers their questions, all from
one inbox. A learner (Camille, say) follows the plan, hands in work in any form, keeps a portfolio of what they
made, and can message the coach at any time.

The pages are NodeGX components (`components/`), and the backend is a **NodeGX backend** running the
template's own cloud functions (`components/__cloud__/`, 49 of them) behind a security file that closes
everything else (`nodegx.security.json`). The example world is six learners and one coach, with dates counted
from today, so it always looks like a programme in progress.

## Just looking? The demo

The same app with its backend played by your browser, so it needs no server and no account: look as Camille
or as Richard, and press anything. It is built from this folder:

```bash
node tools/build-demo.mjs     # writes ../demo/ (the template, with the backend in a service worker)
node tools/serve-demo.mjs     # http://127.0.0.1:8602
```

Use Chrome, Edge, Firefox or Safari in a normal window: the demo needs service workers, which some private
windows switch off.

## From nothing to signed in as the coach (under ten minutes)

**You need** Node 22 or later, Docker (for the mail sandbox), and a NodeGX checkout: the tools run its
backend (`packages/nodegx-backend`) and its preview harness (`packages/noodl-preview`). They look for it at
`~/vscode_projects/OpenNoodl`; anywhere else, tell them first:

```bash
export NODEGX_BACKEND_BIN=<NodeGX checkout>/packages/nodegx-backend/bin/nodegx-backend.js
export NODEGX_PREVIEW_BIN=<NodeGX checkout>/packages/noodl-preview/bin/noodl-preview.js
```

Then, from this folder:

**1. The backend, with the example world in it.** One command starts the mail sandbox (Mailpit in Docker), starts
a backend on http://127.0.0.1:8595, loads the schema, the security file, the people, the files and the rows,
deploys the functions, turns on sign-in by email link, and checks the result. About a minute the first time
(Docker pulls Mailpit); it ends with `reset-demo: done.`

```bash
node tools/reset-demo.mjs
```

**2. The app.** In a second terminal, from this folder. Leave it running: it serves the project files live, so a
change you make in NodeGX shows on the next reload.

```bash
node tools/serve-app.mjs
```

**3. Sign in as the coach.** Open http://127.0.0.1:8596, type `coach@example.com` and press **Email me a sign-in
link**. Open the mail sandbox at http://127.0.0.1:8028, open the newest message ("Your sign-in link for Digital Bricks
University"), press its link, then press **Sign in** on the page it opens. You land on **Learners**, signed in as Richard: six learners, each with a plan. **Inbox (6)** is what
waits for him.

To look as a learner instead, sign out and use `camille.laurent@example.com` (or `jonas.weber@`, `ana.ruiz@`,
`sarah.oneill@`, `mei.lin@`, `tomasz.nowak@`, all `example.com`). The backend allows five sign-in links per 15
minutes from one machine; `reset-demo` clears that.

`node tools/reset-demo.mjs` again puts the whole world back, dated from today. `node tools/reset-demo.mjs --stop`
stops the backend. The admin credential, the data and the log live in `~/.nodegx/dbu-demo/`, never in this folder.

## The first things to change

- **Your name.** Signed in as the coach, open **Settings** and type the name learners should see. Every word that
  names the coach ("Ask Richard", "Richard approved version 2") then says it; left empty, they say "your coach".
  The example world sets it to Richard. The people themselves are in `backend/fixtures/learners.json` (`coach`, then
  `learners`); every word on screen is in **Strings** (`components/Strings`), where the coach's name is written
  `$t(coachName)`, or `$t(coachNameStart)` at the start of a sentence.
- **Where learner messages are emailed.** On the same Settings page. Until you set it, they go to
  `coach@example.com`, which reaches nobody.
- **The homework library** the world starts with is `backend/fixtures/library.json`, with its files in
  `backend/fixtures/files/`.
- **The look.** Colours, type and spacing are tokens in `nodegx.styles.json`; components use `var(--token)`,
  never a raw value.

## Proving it still works

Each tool says in its header what it checks. Run `reset-demo` first; the gates that need a backend of their own
build a scratch one on another port and remove it.

```bash
node tools/check-seed.mjs        # the world is whole: every relation resolves, the six stories hold
node tools/check-security.mjs    # 442 checks as real users: who can call, read and change what
node tools/check-mail.mjs        # message emails: held, grouped, sent, unsubscribed (scratch backend)
node tools/check-inbox.mjs       # the coach inbox and the morning round (scratch backend)
node tools/check-checkins.mjs    # check-ins go out when planned, answers come back (scratch backend)
node tools/check-demo.mjs        # the demo is this template, and its backend answers as the real one
node tools/drive-demo.mjs        # every flow, pressed in headless Chrome, as Camille and as Richard (serve-demo first)
```

A new cloud function needs a rule in `nodegx.security.json` (deploying refuses one without), and
`check-security` should grow a check for it.

## The demo's parts

The demo is built from this folder and never edited by hand (`tools/build-demo.mjs` lists every difference, and
`check-demo` fails on any other). The page graphs are copied as they are; the backend becomes
`demo-sw.js`, a service worker that runs the same cloud-function graphs (`tools/demo/engine.js`) against the same
example world (`tools/lib/world.mjs`), kept in the browser's IndexedDB. The intro and the strip above the app
("Look as Richard", "Reset demo") are the components in `components/Demo/`; they show only when
`window.dbuDemo` exists, which only the demo's `demo/boot.js` creates, so in this template they never appear.

## Where the decisions are

- `docs/BRIEF.md`: what the app is and who opens it
- `docs/ARCHITECTURE.md`: how it is put together, page by page and function by function
- `docs/CONVENTIONS.md`: the rules the project follows (words in Strings, tokens, how pages are built)
- `docs/decisions/`: what was considered and deliberately not done
