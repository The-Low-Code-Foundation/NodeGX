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
