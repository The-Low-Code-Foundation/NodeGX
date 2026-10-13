# This folder is for NodeGX apps

It was set up with `npm create nodegx-vibe`. When I ask for an app here, build it as a NodeGX app with the `nodegx`
server's tools: `list_projects` and `open_project` for one that exists, `create_project` for a new one. Don't write a
separate web server or hand-written HTML and JavaScript instead: that would be a different app.

## You build it in sittings — this is a process

An app is not built in one go. It is built over several sittings, and each sitting does ONE step of the process
below, writes down where it got to, and stops. **In this folder, the task of a sitting is its step**: when you are
told to finish the whole task in one pass, that means this sitting's step, finished and written down. When I say
"just build it" or "don't wait for me", I mean don't stop to ask me questions — not skip the sittings: the sittings
are how it gets built, and each one still stops after its step. The next sitting starts fresh: it remembers nothing except what is
written in the app's `docs/` folder, so write there everything the next one needs. Stopping is part of the work —
every step of a long sitting re-sends the whole conversation, so a long sitting gets slow and expensive, and what
you worked out only in your head is lost when it ends.

**Every sitting starts by finding where it is.** `grep` this folder (path `.`) for `^# Next sitting`.
- No match: this is **sitting 1 — plan**. If the app's project is already here, an earlier sitting 1 was cut off:
  `open_project` it and write the notes it is missing. (A `docs/NEXT.md` that starts `# Done` means that app is
  finished.)
- A match: read that `docs/NEXT.md` first. It says which step you are on and what to read. Do that step, nothing more.

When I say "continue" (or nothing new), do the next step. When I ask for a change, add its lines to the checklist and
go on through the process. Every sitting that stops ends with the line: *Next: <the step>. Type /clear, then
"continue".*

### Sitting 1 — plan (build nothing yet)

This sitting writes notes in plain words, not wiring. Don't read node types or examples here: each build sitting
reads what its own part needs and works out the wiring then, with the node types in front of it. Write each file as
soon as you have it — one file per answer — in this order:

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
   value lives (a Variable, a component input, `localStorage`); and the build split into **parts**, in order, each
   small enough for one sitting (one or two components and the checklist lines they make possible).
5. `docs/NEXT.md` — first line `# Next sitting: build part 1 — <its name>`, then what to read first.
6. Stop: tell me in two lines what you planned and what the next sitting does.

### Sittings 2 … n — build one part

1. Read `NEXT.md`, `PLAN.md` and `CHECKLIST.md` (and `REQUEST.md` when a word matters), then
   `call_tool({ name: "get_project_info" })`: its traps are mistakes other builders made here. Read the node types
   this part uses.
2. Build that part, one component at a time, and read every answer. Reset state before the words change, not after. A refused change says exactly what to fix. Keep
   each answer short: decide one component, write it with a tool, read the reply, then the next. An answer with no
   tool call in it can run on for many minutes with nothing saved.
3. Drive every checklist line this part makes possible (below). Mark it `- [x] … — passed: <what you measured>` or
   `- [ ] … — FAILED: <what you saw>`, and fix a failure in this part before you stop.
4. Anything you decided or learned that `PLAN.md` doesn't say, add to it.
5. Rewrite `NEXT.md`: `# Next sitting: build part <n> — <its name>`, or `# Next sitting: prove` when every part is
   built. Then stop: two lines, what is built and what is next.

### The last sitting — prove

Start the app fresh and drive **every** line of the checklist again, the whole examples as I wrote them. Update each
line. If all pass, `NEXT.md` becomes `# Done` followed by the checklist, and you tell me one line per item: passed or
failed, and what you measured. If any fail, `NEXT.md` becomes `# Next sitting: fix — <the lines>`; that sitting fixes
them and ends with `# Next sitting: prove` again. Never write `# Done` with a line unproven.

## Driving a line

`drive_page` starts from the app's start page (leave out `page`): tap, wait, then read the text, a variable, or what a
person sees of a thing by its label — `{ "read": { "look": "Lisbon" }, "expect": { "backgroundName": "green" } }`. A
read answers what a screenshot would; each screenshot you open makes every later step of the sitting cost more.

## Tools

Your tool list will not change in a sitting. Every `nodegx` tool that is not in it — `get_project_info`,
`create_plan`, `update_component`, `render_report`, `drive_page` and the rest — is called through `call_tool`:
`call_tool({ name: "drive_page", arguments: { ... } })`. `call_tool({ name, describe: true })` shows a tool's
arguments first. A new sitting is not bound to the project: `open_project` it first.

When the app needs an API key, don't ask me to paste it into the chat. Call `set_function_secret` without a value and
tell me where to paste it in the project's `.env` file.

To see an app: `npx @nodegx/preview <the app's folder> --open`
