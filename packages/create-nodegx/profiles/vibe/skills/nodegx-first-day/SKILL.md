---
name: nodegx-first-day
description: "Your first day building NodeGX apps here — where everything is, how this team works, and the mistakes other builders made so you don't have to. LOAD at the start of a plan sitting (sitting 1), and any time you are unsure where to look for how something in NodeGX works."
user-invocable: false
---

# Welcome — your first day on NodeGX

Hello, and welcome. You're new to NodeGX, and that's completely fine: nobody is born knowing it. The builders who
came before you made plenty of mistakes, and the useful part of every one of them was written down. This page is the
walk around the office — where things are, how we work, and the stories worth knowing. Read it once now; come back
to it whenever you're unsure.

## Where everything is

NodeGX is a visual app builder: an app is a graph of nodes saved as files. You never edit those files by hand — the
`nodegx` server does it for you, and it checks every change. Think of the server as the team's shared drive and its
manual in one:

| You want to know… | Ask |
|---|---|
| the mistakes builders keep making in this project | `call_tool({ name: "get_project_info" })` — its traps come first |
| what a node does, its ports, its quirks | `call_tool({ name: "get_node_type", arguments: { type_names: [...] } })` — the node's own notes |
| what a working piece of graph looks like | `list_examples`, then `get_example` — read one close to what you're about to build |
| the colours, spacing and fonts this app has | `call_tool({ name: "get_style_vocabulary" })` |
| whether it renders, and how it looks | `call_tool({ name: "render_report" })` |
| whether it *works* the way a person would use it | `call_tool({ name: "drive_page", ... })` — tap, wait, read |

Your own notes live in the app's `docs/` folder: `REQUEST.md` (what the person asked, word for word),
`CHECKLIST.md`, `PLAN.md`, `NEXT.md`. Those four files are your memory between sittings — you won't remember this
conversation tomorrow, but you will read them.

## How we work here

These habits came from many projects, most of them learned the hard way:

- **Small steps, written down.** We don't build a whole app in one go — not you, not the most capable model on the
  team. One part per sitting, then a note for whoever picks it up next. (The skill `nodegx-sizing-a-sitting` says
  how big a part is.)
- **A graph is a claim; a drive is evidence.** "I wired it" isn't "it works". Every checklist line is proven by
  `drive_page` doing what a person would do — and reading what a person would see.
- **Measure before you believe.** When something looks wrong, drive it and read the actual value before you decide
  why. When something looks right, drive the moment *between* two screens too — that's where bugs hide.
- **The notes are the manual.** When you wonder how a node behaves, read its notes (`get_node_type`), then try it
  on a tiny page with `drive_page`. Don't go looking for the runtime's source, and don't try to work it out in your
  head for long — a two-node experiment answers in a minute what a long think can't.
- **Stuck is normal; spinning is not.** When a fix fails twice, stop, write down what you saw, and leave it for a
  fresh sitting. (The skill `nodegx-when-stuck` walks you through it.)

## Stories other builders left behind

Each of these cost someone a failed app. Every one was something a person would have seen and the builder's own
checks didn't look at.

- **The best score that needed a server.** A builder made a backend to keep a best score. A value only this device
  needs (a best score, a setting) is `localStorage` in a Function — no backend. Create the project with
  `backend: { kind: "none" }` unless people or devices share data.
- **The message that never came back.** A Function set `error = "Type an item first"` on every empty Add. The second
  time, nothing showed: an output is sent only when its value *changes*. When something must happen every time, send
  a signal beside the value.
- **The colours that flashed on the next question.** For a moment, each new question showed the last one's green and
  red, because the answer state was cleared *after* the new words appeared. Reset what belongs to one screen
  *before* the next screen's words arrive — and give the checklist a line about the moment a screen appears.
- **The right answer that didn't count.** After a question timed out, the next right answer scored nothing. Moving
  on cleared "answered" while the countdown still read 0, so the timeout gate fired again on the new question. Reset
  the value that makes a gate fire (the countdown) before the one that holds it off ("answered"). The brief's own
  example — right, wrong, right, *time out*, right — would have caught it; that's why the checklist plays examples
  whole.
- **The rows that kept rebuilding.** A list fed by a fresh array of objects with no `id` redrew every row each time.
  Give every item a stable `id`. And there's no row-index port: if a row needs its position, put it on the item.
- **The screenshots that made everything slow.** Each screenshot you open makes every later step of the sitting cost
  more. `drive_page` can read a colour, a size, whether something is visible — use that; open a picture only when a
  read can't answer.

## One last thing

Ask the server, not your memory of other tools. NodeGX looks a bit like other app builders, and that's exactly when
old habits mislead: its notes are written for this runtime. You're doing fine. Take it one part at a time.
