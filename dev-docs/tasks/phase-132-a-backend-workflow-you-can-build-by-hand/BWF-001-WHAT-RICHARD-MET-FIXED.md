# BWF-001 — What Richard met, fixed

**Phase:** [132](README.md). **Repo:** nodegx-studio (`editor/studio.html` Backend mode, `editor/automations.mjs`,
`editor/serve.mjs`); NodeGX `packages/nodegx-backend` only for the validate warning (AC6).
**Bugs:** P132-STEPPANEL, P132-STARTSONFORM, P132-NOROUTELABELS, P132-BRANCHNEXT. **Order:** first; one session.

## Why

Richard's points 1–4 (README). The Backend tab draws backend workflows but, for him, cannot edit one. STU-092 built a
step panel, *Add a step after*, *Add on Yes*, and its gates are green (`check:automations` 52/52 + 42/42), so the first
job is to find out why the panel he needed never opened. "The gate is green" is not the answer to "I clicked and
nothing happened".

## What to build

1. **Measure point 1 before touching it.** On a copy of Greenhouse in the Electron app (`npm start -- <copy>`, the copy
   bound to an isolated backend, README rule 5), open *TriggerTest* and click each card. Record: does `pickAutoStep`
   run, is `#wfinspect` un-hidden, is it on screen (`getBoundingClientRect` against the window, and
   `document.elementFromPoint` on the card's centre: is the card the element hit?). Richard's screenshot shows no right
   panel at all and the canvas to the window's edge. Suspects, unproven: s35's P123-GH-LISTHIDDEN layout change (the
   list kept beside what it opened) landing after STU-092's gate; an overlay taking the click; the app's window width.
   Write the cause into P132-STEPPANEL before the fix. Then a gate that would have gone red: in the Electron app
   (`app/check.mjs` style), not only in Chrome.
2. **The Starts-on form follows the choice.** One form per trigger kind, rebuilt on change: *A change to a table*
   (table, made / changed / deleted), *A time* (time of day, and which days: cron underneath, written as words),
   *A call from outside* (the webhook: its name, the URL it will answer on, Secret or HMAC; the URL copyable), *Nothing,
   I start it myself*. Webhook is new in Studio (STU-092 "not built").
3. **Routes drawn.** A branching step gets one out-port per route, each labelled in `ROUTE_WORDS` (Yes / No, a switch's
   case labels and *Otherwise*, *None* / *Some* for filter and for-each, *Done* / *Skipped*), and the failure route in
   red as today. The legend says the route words. Wires leave from their own port, not all from `out`.
4. **A + on every wire and on every open port** (an unconnected Yes or No): inserts a step there, the step menu
   grouped by the catalog's categories. *Add a step at the start* stays.
5. **A branch is never given a hidden `next`.** *TriggerTest*'s branch has `routes.ontrue → call-function-3` and
   `next → call-function-2`, so Check thirst runs whatever the If says and the No is not a No. Find which Studio action
   wrote `next` on a branch (*Add a step after* on a routed step is the suspect) and make it add on a route instead.
   A workflow already carrying one (written by an agent or an older Studio) is drawn with an *Always, as well* wire and
   a sentence in the panel saying so, never silently.
6. **The backend says it too.** `POST /admin/workflow-defs/validate` and a save return a **warning** (not an error:
   the definition stays valid) when a step has both `routes` and `next`, and when the entry step reads `previous`
   (empty at the entry: *TriggerTest*'s first step does). The MCP's write result passes warnings through, so the agent
   is told in the same turn.
7. **Any first step.** New workflow's first step is chosen from the whole catalog, not "a function or an end".
8. **R1's words in the list.** The Backend list reads: *Workflows* (each with what starts it, on/off, last run) and
   *Reusable pieces* (the cloud functions: "a workflow or a screen can run these"), and the one line saying how they
   meet. A workflow is never offered under the functions, and the panel of a workflow says it is one.

## Acceptance

- AC1: P132-STEPPANEL's cause written down from a measurement in the Electron app; a gate in the app that fails at the
  pre-fix commit and passes after.
- AC2: each Starts-on choice shows only its fields; a webhook trigger made in Studio answers a POST at the URL it shows
  (on the copy's backend) and the run appears.
- AC3: *TriggerTest*'s If draws Yes and its wire labelled; a switch with three cases draws four labelled ports.
- AC4: a step inserted with + on the wire between two steps lands between them, in the file and on the backend.
- AC5: *Add a step after* on a branch adds on a route; no Studio action produces a step with both `routes` and `next`
  (a gate walks every add/move/delete path on a branching step and reads the file).
- AC6: validate's two warnings, a backend test each, and the MCP result carrying them.
- AC7: Richard re-walks his points 1–4 on a copy of Greenhouse and says they hold.

## Out

Data between steps (BWF-002/003), formulas (BWF-004), new step kinds (BWF-005..007), the NodeGX editor (BWF-008).

## s1 (2026-11-02): built, all but AC1's app gate and AC7

Commits: nodegx-studio `1cc7aa5`, NodeGX `f14e46fe8`. Measured in the Electron app on a Greenhouse copy with its own
backend (`NODEGX_BACKENDS_DIR`), then gated in Chrome.

| AC | state |
|---|---|
| AC1 | **not reproduced.** P132-STEPPANEL holds the measurement: the panel opens on every path tried in the app (six, incl. Richard's New → Add at the start, human-paced presses, 1000–1600 px). His file shows *Add on Yes* was used, so the panel opened for him at least once. No app gate written: there is no failing state to gate yet. Settled by AC7 |
| AC2 | ✅ one set of fields per choice (cause: `.field { display: grid }` beat `[hidden]`, P132-STARTSONFORM); a webhook made in Studio answers a POST with its key at the address it shows (200, the run `success`), 401 without; the key is shown once and never in the file |
| AC3 | ✅ ports named where they leave (`stepPorts`): TriggerTest's If draws Yes, an open No, and its next as *Always*; a three-case switch has four named ports (automations-check) |
| AC4 | ✅ the + on a wire (`insertBetween`) lands the step on that wire only, file and backend (drive); a + on every open way on |
| AC5 | ✅ cause: *Add a step at the start* gave a branch `next`; fixed; add / insert / move / delete around a branch never yield routes + next (automations-check, mutant fails 2); a branch already carrying one is drawn *Always* and put on a side in a click |
| AC6 | ✅ on the backend (`definitionWarnings.ts`, validate + create + update, 2 tests); the MCP passes the answer through unchanged (not covered by an MCP test). Studio shows them above the canvas, **once its backend is a release with `f14e46fe8`** (Studio runs the kit's backend) |
| AC7 | open: Richard re-walks points 1–4 on a copy of Greenhouse |

Also built: any kind as the first step (the New form's *First step*), R1's words in the list (*Workflows*,
*Reusable pieces*: "cloud functions: a workflow or a screen can run these"). Not done from item 8: the list still shows
triggers as rows of their own above the workflows, rather than folded into each workflow's row.

Gates at `1cc7aa5`: check:automations 63/63 + 62/62 (11 new drive lines), check:editor 259/259, check:functions
695/695 + 50/50, check:hosted 46/46 (one red on "Delete type" in Data, green on rerun: a flake, not this change),
check:app 67/67. Backend: 30 suites, 400/400.

Polish seen in the app, not done: on a short card with three ports (TriggerTest's If) the port words and the wire
"+" buttons crowd the column gap at 71 %.
