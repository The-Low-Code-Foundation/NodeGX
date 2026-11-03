# DIG-011 — Predictions in the todo app, hopes and worries equal

**Phase:** [133](README.md). **Depends on:** DIG-010 (the new look). **Round:** 11. **Scope:**
[SCOPE §8.1–8.2](SCOPE.md). **Ruling:** R4.

> "Yeah bring the concepts into the todo app please, optional feature … But make sure it's not skewing towards negative
> feelings as it used to, positive and negative outcomes and feelings for future events are accepted and equal"
> — Richard, 2026-11-03

## What

All optional, under a fold in a task's pane; nothing changes for a person who never opens it.

- **About this task:** kind (admin, work, money, home, body, people, learning, a big change); how it feels to you
  (light, some, heavy, keeping me up at night); how much it matters (a little, a lot).
- **What do you think will happen?** *If I ___, then ___.*, locked once written (Betr's loop).
- **At close**, after the closing note: *Did it go how you expected?*
- **A Predictions tab** (opt-in, like Projects) for a hope or a worry with no task.

**Equal by design (R4).** Betr's known wrinkle (its B56 §9b): a worry that came true got the celebratory *Yeah!*.
Here:
- The prompt never assumes a worry; where an example is shown, a hope and a worry sit side by side.
- The close question is about **expectation**, not good or bad, and its three answers look alike: *Just as I thought*,
  *Partly*, *Not as I thought*. No answer is a party, none is red.
- An optional second question, *How was it?*, offers a better and a worse in the same colour and weight.
- No count, no score, no streak (Betr rule 5).

**Data:** on `Task`, `kind`, `feel`, `matters`, `prediction`, `predictedAt`, `expected`, `howWas`; a `Prediction`
collection for the tab; each owned by its creator. The first use of "how it feels" asks for the person's explicit yes
(DIG-009, GDPR).

## Acceptance

- **AC1.** A gate reads every new string and fails on a valenced default (a worry-only example, an answer drawn in a
  celebratory or alarm colour, a digit).
- **AC2.** A drive: write a prediction on a task, close it, answer both questions, reopen, read it back as written.
- **AC3.** A person who never opens the fold sees today's app (a drive compares the list's screenshot with the fold
  closed).
- **AC4.** Richard writes one hope and one worry on his phone and says whether they felt equal; his words into the log.
