# 000 — Initial scope

_Recorded 2026-11-07T20:22:55.818Z, from the scoping conversation held before this project was created._

## What was asked for

> From docs/dbu/SCOPE.md, scoped with Richard on 2026-11-07: "A trainer Richard is coaching opens Digital Bricks University and always knows what's next, hands in whatever they made in whatever form it takes, and can ask Richard a question at any time. Richard, from one inbox, never misses a question, a hand-in or a learner who has gone quiet." Pitch: "You're learning AI and NodeGX on a platform built with NodeGX."

## What was decided

**The app.** A 1:1 coaching platform: each learner follows a plan of live sessions, homework and check-ins that their coach controls, hands in work in any form, keeps a portfolio of what they made, and can message the coach at any time. The coach runs everything from one inbox.

**Who it is for.** Learners: trainers being coached 1:1 in AI and NodeGX, who want to know what's next, hand in work and ask questions. Coach: Richard, who builds each learner's plan, reviews hand-ins and answers messages from one inbox.

**Pages.**

- Sign in — Email magic-link sign-in. No public sign-up; the coach adds learners.
- Home — Learner home: up next, the programme timeline, progress X of N steps, latest from Richard, 'Stuck? Ask Richard', things you've made.
- Homework — Learner: one homework step: brief, resources, your work and its versions, hand in by file, link or text, and its message thread.
- My creations — Learner portfolio: anything they made, of any type, optionally saved from a hand-in.
- Messages — Learner's general thread with Richard.
- Learners — Coach: the roster, and each learner's plan builder.
- Inbox — Coach: every learner question, hand-in waiting for review, and learner who has gone quiet, in one list.
- Plan templates — Coach: reusable plan shapes to start a learner's plan from.
- Homework library — Coach: reusable homework; adding one to a plan copies it.
- Settings — Coach: notification address and email sender.

**Records.**

- Plan — One learner's programme — learner, title, status (active, paused, finished), meetingLink, bookingLink, startedOn, fromTemplate
- Step — One item in a plan: a live session, homework or a check-in — plan, learner, position, kind (live, homework, checkin), title, shared, status, startsAt, durationMin, attended, recordingUrl, summary, dueAt, brief, handInChecklist, resources, fromLibraryItem, form, sendsAt
- Submission — One version of a hand-in — step, learner, version, kind (file, link, text), file, url, text, note, review (pending, approved, changes), reviewedAt
- Message — Learner-coach conversation, optionally attached to a homework — learner, step, author, body, attachments, readAt
- Creation — Portfolio item — learner, title, kind, file, url, text, madeWith, fromStep, submission, usedInClass
- LibraryItem — Reusable homework — title, brief, handInChecklist, resources, tags, estimatedMinutes
- PlanTemplate — Reusable plan shape — title, description, items
- CheckinResponse — A learner's check-in answers — step, learner, answers
- CoachNote — The coach's private notes on a learner — learner, body

**Backend.** NodeGX backend. One-gate security: every collection closed to clients; every read and write goes through a role-checked cloud function (pattern copied from the digital-bricks-training template). Schema, security and seed arrive in DBU-01.

**Rules for this project.**

- Every colour, spacing, radius and font parameter is var(--token); no raw hex or px in any component parameter.
- The look is the mockup: Inter, ground #F9FAFB, white cards with a #E5E7EB border and radius 14, one indigo accent #4F46E5. Plain, pedagogy first, no showing off.
- Plain words on screen. Empty states say what will appear and when, in a sentence.
- Clients never read or write a collection directly: every read and write goes through a role-checked cloud function (nodegx.security.json closes everything else).
- Who is the coach is the backend's staff role, never an email address in the graph.
- Learners never see a Step that is not shared.
- Learner pages sit inside the learner shell (Home, Homework, My creations, Messages); coach pages sit inside the coach shell (COACH badge; Learners, Inbox, Plan templates, Homework library).

## What was considered and rejected

This is the section with the longest shelf life. It is what stops the next reader — or the next
assistant — helpfully rebuilding something that was deliberately left out.

- **Keep the React + PocketBase Learning Hub** — rejected: Richard chose NodeGX end to end, to dogfood it and to publish this as a NodeGX template and demo.
- **Evolve the live digital-bricks-training template** — rejected: It is built around the AI lesson engine; we reuse only its platform pieces (sign-in, one-gate security, messages + mail, hosting, backups), not its pages or data model.
- **Cohorts in v1** — rejected: Coaching is mostly 1:1; a plan per learner is the unit.
- **Scores on hand-ins** — rejected: The only verdict is approve or ask for changes.

## Deliberately out of scope

- Cohorts and groups
- Payments
- Built-in calendar booking (a booking link is enough)
- AI lessons
- Draft with Claude in the inbox
- Employer reports
- A mobile app
- Multiple coaches
- Scores or grades: review is approve or ask for changes

## Still open

> TODO: Domain: university.digitalbricks.io, or replace training.digitalbricks.io? Needed by DBU-12.
> TODO: Interface language: English at launch with i18n wired in (recommended), or French from day one?

## Proposed build plan

Produced from the scope above and handed over unexecuted — no components were authored during
scoping. Review it before building.

1. **provision `App backend`** — Give this project a built-in backend that runs on this computer. Collections: Plan, Step, Submission, Message, Creation, LibraryItem, PlanTemplate, CheckinResponse, CoachNote. People sign in, so it keeps user accounts. The conversation said: NodeGX backend. One-gate security: every collection closed to clients; every read and write goes through a role-checked cloud function (pattern copied from the digital-bricks-training template). Schema, security and seed arrive in DBU-01.
2. **create `Pages/Sign in`** — Email magic-link sign-in. No public sign-up; the coach adds learners. Sibling pages in this app: Home, Homework, My creations, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
3. **create `Pages/Homework`** — Learner: one homework step: brief, resources, your work and its versions, hand in by file, link or text, and its message thread. Works with the Step and Message records described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, My creations, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
4. **create `Pages/My creations`** — Learner portfolio: anything they made, of any type, optionally saved from a hand-in. Works with the Creation record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
5. **create `Pages/Messages`** — Learner's general thread with Richard. Works with the Message record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
6. **create `Pages/Learners`** — Coach: the roster, and each learner's plan builder. Works with the Plan record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
7. **create `Pages/Inbox`** — Coach: every learner question, hand-in waiting for review, and learner who has gone quiet, in one list. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
8. **create `Pages/Plan templates`** — Coach: reusable plan shapes to start a learner's plan from. Works with the Plan record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Inbox, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
9. **create `Pages/Homework library`** — Coach: reusable homework; adding one to a plan copies it. Works with the Plan record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Inbox, Plan templates, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
10. **create `Pages/Settings`** — Coach: notification address and email sender. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Inbox, Plan templates, Homework library. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.
11. **update `Pages/Home`** — Learner home: up next, the programme timeline, progress X of N steps, latest from Richard, 'Stuck? Ask Richard', things you've made. Works with the Step record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Homework, My creations, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do.

<!-- The same plan, for the editor to read back if it is offered again. Safe to delete. -->

```json nodegx-plan
{
  "version": 1,
  "plan": {
    "request": "From docs/dbu/SCOPE.md, scoped with Richard on 2026-11-07: \"A trainer Richard is coaching opens Digital Bricks University and always knows what's next, hands in whatever they made in whatever form it takes, and can ask Richard a question at any time. Richard, from one inbox, never misses a question, a hand-in or a learner who has gone quiet.\" Pitch: \"You're learning AI and NodeGX on a platform built with NodeGX.\"",
    "operations": [
      {
        "id": "op-1",
        "kind": "provision",
        "target": "App backend",
        "intent": "Give this project a built-in backend that runs on this computer. Collections: Plan, Step, Submission, Message, Creation, LibraryItem, PlanTemplate, CheckinResponse, CoachNote. People sign in, so it keeps user accounts. The conversation said: NodeGX backend. One-gate security: every collection closed to clients; every read and write goes through a role-checked cloud function (pattern copied from the digital-bricks-training template). Schema, security and seed arrive in DBU-01.",
        "provision": {
          "name": "App backend",
          "collections": [
            {
              "name": "Plan",
              "columns": []
            },
            {
              "name": "Step",
              "columns": []
            },
            {
              "name": "Submission",
              "columns": []
            },
            {
              "name": "Message",
              "columns": []
            },
            {
              "name": "Creation",
              "columns": []
            },
            {
              "name": "LibraryItem",
              "columns": []
            },
            {
              "name": "PlanTemplate",
              "columns": []
            },
            {
              "name": "CheckinResponse",
              "columns": []
            },
            {
              "name": "CoachNote",
              "columns": []
            }
          ],
          "needsAuth": true
        }
      },
      {
        "id": "op-2",
        "kind": "create",
        "target": "Pages/Sign in",
        "intent": "Email magic-link sign-in. No public sign-up; the coach adds learners. Sibling pages in this app: Home, Homework, My creations, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-4",
        "kind": "create",
        "target": "Pages/Homework",
        "intent": "Learner: one homework step: brief, resources, your work and its versions, hand in by file, link or text, and its message thread. Works with the Step and Message records described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, My creations, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-5",
        "kind": "create",
        "target": "Pages/My creations",
        "intent": "Learner portfolio: anything they made, of any type, optionally saved from a hand-in. Works with the Creation record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-6",
        "kind": "create",
        "target": "Pages/Messages",
        "intent": "Learner's general thread with Richard. Works with the Message record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-7",
        "kind": "create",
        "target": "Pages/Learners",
        "intent": "Coach: the roster, and each learner's plan builder. Works with the Plan record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-8",
        "kind": "create",
        "target": "Pages/Inbox",
        "intent": "Coach: every learner question, hand-in waiting for review, and learner who has gone quiet, in one list. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-9",
        "kind": "create",
        "target": "Pages/Plan templates",
        "intent": "Coach: reusable plan shapes to start a learner's plan from. Works with the Plan record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Inbox, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-10",
        "kind": "create",
        "target": "Pages/Homework library",
        "intent": "Coach: reusable homework; adding one to a plan copies it. Works with the Plan record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Inbox, Plan templates, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-11",
        "kind": "create",
        "target": "Pages/Settings",
        "intent": "Coach: notification address and email sender. Sibling pages in this app: Sign in, Home, Homework, My creations, Messages, Learners, Inbox, Plan templates, Homework library. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      },
      {
        "id": "op-3",
        "kind": "update",
        "target": "Pages/Home",
        "intent": "Learner home: up next, the programme timeline, progress X of N steps, latest from Richard, 'Stuck? Ask Richard', things you've made. Works with the Step record described in docs/ARCHITECTURE.md. Sibling pages in this app: Sign in, Homework, My creations, Messages, Learners, Inbox, Plan templates, Homework library, Settings. Follow docs/CONVENTIONS.md; docs/BRIEF.md says what this app deliberately does not do."
      }
    ],
    "scroll": "page"
  }
}
```

## Transcript

_(no transcript was captured)_
