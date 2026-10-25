# This folder is for NodeGX apps

It was set up with `npm create nodegx-vibe`. When I ask for an app here, build it as a NodeGX app with the `nodegx`
server's tools: `list_projects` and `open_project` for one that exists, `create_project` for a new one. Don't write a
separate web server or hand-written HTML and JavaScript instead: that would be a different app.

## How to build it — a process, written down as you go

You build the whole app in this session, by a process: plan in notes, then build it a small part at a time, proving
each part as you go, then prove everything. Write as you go into the app's `docs/` folder — those notes are how you
keep your place in a long session, and how a new session carries on if this one has to hand over.

You're new to NodeGX, and this folder comes with three short guides from the builders before you — load them with
the `skill` tool (or read `.vibe/skills/<name>/SKILL.md`): **`nodegx-first-day`** (where everything is, how we work,
their mistakes — read it first), **`nodegx-sizing-the-work`** (how big a part is, and when to hand over), and
**`nodegx-when-stuck`** (when a line fails or a node surprises you).

**Start by finding where you are.** `grep` this folder (path `.`) for `^# Next session`. No match: a new app — start
at step 1. A match: read that `docs/NEXT.md`, `open_project` the app, and carry on from where it says. (A
`docs/NEXT.md` that starts `# Done` means that app is finished.)

### 1. Notes first — a few minutes, in plain words

Write each file as soon as you have it, one file per answer. No wiring yet: you work that out part by part, with the
node types in front of you.

1. Create the project from what I asked for. Anything I spelled out — names, lists, wording, order, timings, colours —
   is built exactly as written. A value only this device needs to keep (a best score, a setting) is not a backend: a
   Function saves it with `localStorage` — `backend: { kind: "none" }` unless people or devices share data.
2. `docs/REQUEST.md` — what I asked for, **word for word**.
3. `docs/CHECKLIST.md` — from my words alone, one line for each thing I could see or do: what is on screen, what a
   tap does, what it looks like (a colour), when it happens (a time), what is still there after a reload, and what the
   next screen looks like the moment it appears (nothing left over from the one before — a colour, a selection — on
   the new words). **Every example I gave is its own whole line, played exactly**: if I wrote "You scored 3 out of
   5", one line plays a game that gets exactly 3 — mixing right answers, wrong ones and ones left to time out — and
   reads that sentence. Each line: `- [ ] what a person sees — how to drive it`.
4. `docs/PLAN.md` — a page at most: the screens; the components on each and what each shows and does; where every
   value lives (a Variable, a component input, `localStorage`); and the build split into **parts**, in order:
   **at most four checklist lines and one or two components** each. Split by what a person sees change, not by
   screen — a screen with a timer, taps and a score is three parts.

### 2. Build it, one part at a time

For each part, in order:

1. Read the node types this part uses (`get_node_type`) — and `call_tool({ name: "get_project_info" })` once, before
   the first part: its traps are mistakes other builders made here.
2. Build the part one component at a time, and read every answer. A refused change says exactly what to fix. Keep
   each answer short: decide one component, write it with a tool, read the reply, then the next — an answer with no
   tool call in it can run on for many minutes with nothing saved. Reset state before the words change, not after.
3. Drive the part's checklist lines (below). Mark each `- [x] … — passed: <what you measured>` or
   `- [ ] … — FAILED: <what you saw>`, and fix a failure before you start the next part.
4. Add to `PLAN.md` anything you decided or learned that it doesn't say. Then the next part.

### 3. Prove it

Start the app fresh and drive **every** line of the checklist again, the whole examples as I wrote them. Update each
line. Then write `docs/NEXT.md` as `# Done` followed by the checklist, and tell me one line per item: passed or failed,
and what you measured. Never write `# Done` with a line unproven.

### Handing over

A session has a size. When it reaches about 100 tool calls, or a fix has failed twice, hand over instead of pushing
on: finish what you're on, mark the checklist, and write `docs/NEXT.md` — first line `# Next session: <the step>`,
then where things are (what is built, what passes, what is left), what you learned, and what to try. Then stop, ending
with: *Next: <the step>. Type /clear, then "continue".* A new session picks it up from that note with a clear head.
Handing over is part of the process, never a failure. Write `NEXT.md` whole, in one `write_file` — never patch it
with `edit`; to change it, write it whole again. This folder's hook (`.vibe/hooks.toml`) holds the line the way a
team's tooling does: at 100 tool calls it asks for the hand-over; once `NEXT.md` is written only the notes stay open,
and after three more writes to them those close too.

When I say "continue" (or nothing new), carry on from `NEXT.md`. When I say "just build it" or "don't wait for me",
build it without stopping to ask me questions — the process is how you build it. When I ask for a change, add its
lines to the checklist and go on.

## Driving a line

`drive_page` starts from the app's start page (leave out `page`): tap, wait, then read the text, a variable, or what a
person sees of a thing by its label — `{ "read": { "look": "Lisbon" }, "expect": { "backgroundName": "green" } }`. A
read answers what a screenshot would; each screenshot you open makes every later step of the session cost more.
Whether a person can read a thing is a look too: `"expect": { "readable": true }` passes at 3:1 contrast or more
against what is painted behind it, and `render_report` warns `low-contrast-text` on the pages it opens.
A look waits for things to settle, so it can't see the moment a screen appears. For that line, `watch` right after
the tap that changes the screen, on EVERY answer of the new screen: `{ "watch": { "look": ["Sydney", "Canberra",
"Melbourne"] }, "for_ms": 2000, "expect": { "never": { "backgroundName": "green" } } }` lists every state each one
showed and fails on a flash of green on any of them. Watch them all — a colour left over lands by position, so one
answer watched can be the one it never touches. For a reload line,
reload the screen you are on — `{ "reload": true }` — not a navigation to another one.

## Tools

Your tool list will not change in a session. Every `nodegx` tool that is not in it — `get_project_info`,
`create_plan`, `update_component`, `render_report`, `drive_page` and the rest — is called through `call_tool`:
`call_tool({ name: "drive_page", arguments: { ... } })`. `call_tool({ name, describe: true })` shows a tool's
arguments first. A new session is not bound to the project: `open_project` it first.

When the app needs an API key, don't ask me to paste it into the chat. Call `set_function_secret` without a value and
tell me where to paste it in the project's `.env` file.

To see an app: `npx @nodegx/preview <the app's folder> --open` — it starts the app's own backend too, when it has
one on this computer, so it is also how the app opens again another day. Tell me that line when you finish.
