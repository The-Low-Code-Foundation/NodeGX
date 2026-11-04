# BWF-009 — The test

**Phase:** [132](README.md). **After:** every other BWF task. One session plus Richard's sitting.

## The test

On a fresh copy of Greenhouse (its backend isolated, README rule 5), with no code box opened and no JSON typed:

1. **By Richard, in Studio:**
   - *When a watering is logged, set the plant's last-watered date* (a table change → *Change a record*).
   - *Every morning at 8, find the plants not watered for three days and email me the list* (a time → *Find records*
     with a formula → *Send an email* with the list in it), tested on sample data before it is switched on.
   - *When a form outside posts a new plant, make it* (a webhook → *Create a record*), posted to with curl.
2. **By an agent** (Claude Code through `@nodegx/mcp`, a fresh conversation), the same three briefs in words: the file
   read after. Pass = no cloud function made for any of them, and Studio draws each one with its steps editable.
3. **In the NodeGX editor:** the six workflows open in its Workflows panel; one change made there shows in Studio.

## Grade

- Richard says whether this is "something akin to Bubble's backend workflows" (his bar) and how far from n8n; his
  words recorded verbatim here.
- Each friction he meets is a `P132-*` row, `launch: beta` when it would stop the Beta walk.
- The numbers: code boxes opened (0), JSON typed (0), steps the agent wrote as functions (0), runs that failed and why.

## s22 (2026-11-04): part 2, the agent, green; parts 1 and 3 wait on Richard's sitting

**The lab** ([agent-round-bwf009.mjs](agent-round-bwf009.mjs) `--setup`): a fresh Greenhouse copy WITHOUT *The morning
check* and *When a plant is watered* and their triggers (what briefs 1 and 2 ask for; the functions *Mark watered* and
*Check thirst* kept), its backend made by Studio's `provisionFor` in a process of its own (the declared Plant and
Watering columns seeded; `attachNewBackend` seeds none), isolated in `<lab>/backends`, Studio's `serve.mjs` on it, and
three plants: Fern (5 days dry), Cactus (10), Basil (1).

**The brief**, one prompt, each said as a change: "1. When a watering is logged, set that plant's last-watered date.
2. Every morning at 8, find the plants that haven't been watered for three days and email me the list at
gardener@example.com. Try it out on sample data before it's switched on. 3. When a form outside the app posts a new
plant, make it." A fresh `claude -p` on Opus, the checkout's nodegx MCP alone: **$3.97, 6.6 min.**

**Graded on the file** (`--grade`):

| Brief | Workflow | Starts on | Steps |
|---|---|---|---|
| 1 | `watering-logged` | Watering created, on | validate → transform → update-record (the plant) → update-record (the watering's `at`) → return |
| 2 | `thirsty-digest` | 08:00 daily, **left off** | find-records (`lastWatered` before `add-to-date(now, -3, days)`, or none) → stop if none → transform (`count`, `text`, `format-date`, `pick`+`join`) → send-email → return |
| 3 | `plant-posted` | a webhook (HMAC-signed), on | validate → transform → create-record → return |

- Cloud functions made: **0**. Function steps: **0** (it chose `update-record` over the existing *Mark watered* and
  said why). Steps of a kind Studio draws as a form: **14 of 14**. No existing workflow changed.
- It tested each before saying done: brief 2 on the plants (Cactus and Fern found, Basil left out, the email's text
  quoted), brief 1 by logging a watering as the app does (a temporary workflow, deleted after), brief 3 by the
  backend's test-fire (its `curl` was fenced, so the signature check is untested). It put the sample data back.
- It left the digest's trigger **off** because the backend has no SMTP: "Set SMTP up on the backend manager's Email
  page, then enable the trigger — in that order, or every morning records a failed run."
- Unasked, it **switched off two existing triggers** (TriggerTest's *When a Plant is created*, which its webhook
  would set off on every post, and azdazd's 09:00), and said so with the reason. Disclosed and reversible; Richard may
  want an agent to ask first.
- Its one limit, in its words: "the formula language can't format two fields per row, so adding the room or the date
  per plant would need a small cloud function". Filed **P132-LISTLINETWOFIELDS** (an ask: one formula more, or say it).
- Not graded here: Studio DRAWING the three (the grade is kinds only). Part 3 (the editor opening them) cannot run on
  this lab: the editor keeps backends only in `~/.noodl/backends`, and this one is isolated (s21).

**Left for Richard's sitting** (part 1, and the editor part 3 after it): a Greenhouse copy with its backend in
`~/.noodl/backends` (Studio's `provisionFor` with no `NODEGX_BACKENDS_DIR`, so the editor adopts it), the two overlap
workflows removed as in this lab, SMTP pointed at a catcher (s8's drive has one) so brief 2 can really send.
