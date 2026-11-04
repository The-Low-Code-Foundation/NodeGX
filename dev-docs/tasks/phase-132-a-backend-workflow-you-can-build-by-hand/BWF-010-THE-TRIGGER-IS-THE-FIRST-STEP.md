# BWF-010 — The trigger is the first step

**Phase:** [132](README.md). **From:** Richard's re-walk, 2026-11-03 (README, first quote). **Bug:** P132-TRIGGERROWS
(`launch: beta`). **Size:** 1 session, Studio only (the file's shape does not change).

## What he met

He opened *Every morning at 08:00* to learn what it does and where its data comes from. It is a **trigger**: Studio
lists each trigger as a row of its own (a bolt) above the workflows (`renderAutoList`, one row per trigger, then one
per workflow), and opens it to two cards (`renderTrigger`): the trigger, whose time can be moved, and *The morning
check*, which opens the workflow, listed again below. Nothing else changes there. Greenhouse's file: 4 triggers,
5 workflows, 9 rows. BWF-001 item 8 asked for this fold; its record says it was not done.

## Build

1. **One row per workflow.** No trigger rows. A workflow's row says what starts it (already: "Started by …"), on/off,
   last run. A trigger aimed straight at a cloud function (none in Greenhouse; the agent can write one) is a row
   named by the trigger, opening the same canvas with one *Run <function>* card after it.
2. **What starts it is the first card on the workflow's canvas**, left of the entry step, wired to it; two triggers on
   one workflow stack in that column. Pressing it opens its settings on the right (the panel `pickAutoStep('trigger')`
   already draws on the trigger page: time, table and actions, webhook address, on/off, delete).
3. **No trigger:** the first card says "Nothing starts it on its own: another workflow, the agent or a test runs it"
   with *Add what starts it* (time, table change, call from outside), written as the New form writes one.
4. The trigger page goes; a link that opened it (a run's "Started by", the bolt tip) opens the workflow with the
   trigger card picked. *What it can read* (BWF-003) keeps naming the trigger as "what started it".

## Acceptance

- AC1: on a Greenhouse copy, the Workflows list has 5 rows, not 9; *The morning check* opens with *Every morning at
  08:00* as its first card, its time moved there, the file and the backend agreeing.
- AC2: a workflow with no trigger gets one from its first card; a trigger is deleted from its card and the workflow
  stays.
- AC3: `check:automations` grades both in Chrome; the Electron app on a Greenhouse copy (rule 5) shows AC1.

## s13 (2026-11-04): built, AC1–AC3 green

Studio only (`editor/studio.html`); the file's shape and `serve.mjs` are unchanged. `saveWorkflow` already took a new
`trigger` with a saved workflow, so *Add what starts it* saves the workflow unchanged with the trigger beside it.

- **The list**: one row per workflow, each trigger's on/off switch on it (`.trigswitch[data-trigger]`), "Started by …"
  or "Nothing starts it on its own". A trigger keeps a row of its own only when it starts a cloud function, or a
  workflow the project does not have (`foldedTrigger`). That page is the old one, its second card now *Run <function>*.
- **The canvas**: a first column of trigger cards (`data-id="trigger:<id>"`), each wired to the entry step, on (blue)
  or off (dashed), lit when the run's entry ran. Its lines: a table and its changes, a webhook's address, or (for
  a schedule) nothing but its last fire: the title is already the time and days. A cron Studio has no words for is
  still shown.
- **A press on a trigger card** opens the old trigger panel on the right (`renderAutoStepPanel` → `triggerPanel`):
  on/off, time and **Days** (that label said "On" twice before), table and changes, webhook address,
  *Another way to start it*, *Delete the trigger*. Deleting keeps the workflow open, its first card now the no-start card.
- **No trigger**: a dashed card, "Nothing starts it on its own / Another workflow, the agent or a test runs it.",
  *Add what starts it* → `addTriggerForm`, the New form's own fields (`startFields`, shared with `newAutoForm` now),
  without "Nothing".
- **Links**: `openAuto({kind:'trigger'})` for a folded trigger opens its workflow with the card picked; "Started by"
  in the facts picks the card. *What it can read* still names the trigger as what started it.

**Gates** (one at a time, Bash sandbox off): check:automations 112/112 + 139/139 with `NODEGX_REPO` (6 new BWF-010
lines), 112/112 + 100/100 against the kit's backend; check:editor 262/262; check:app 67/67; check:hosted 46/46 on
2 of 6 runs. Its red, *Delete type*, is the backend's admin rate limit. It goes red at HEAD too (1 of 4), and the
page's own admin requests up to it are the same 18 on both: P132-HOSTEDRATELIMIT, filed with the counts.

**AC1/AC3 in the Electron app** on a Greenhouse copy ([greenhouse-drive-bwf010.mjs](greenhouse-drive-bwf010.mjs)):
5 rows (no trigger row), *The morning check* = `[["trigger:trg_-_aEbnwadgpQ"],["check"],["branch"],["done","create-record"]]`,
the trigger card left of *Mark who is thirsty today* (right 596 < left 668), wired `then`. Pressed, its panel moved
it to 07:30: the file and the backend both say `30 7 * * *`, the card, the row and the toast say 07:30. qzdzqzzq (no
trigger) opens on the no-start card with *Add what starts it*.

🔴 The card is titled **"Every day at 08:00"**, not the file's name "Every morning at 08:00": Studio heads a schedule
with the backend's words for its cron (`triggerHead`, as the list always did). The AC's words are the file's name.
If Richard wants his own name on the card, that is one line in `triggerHead`.
