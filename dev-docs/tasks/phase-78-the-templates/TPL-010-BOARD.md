# TPL-010 — The planner: task board

Drafted 2026-09-20 in `nodegx-template-crm/tasks/`, **outside any repo on purpose**. When the build starts, this folder moves to
`OpenNoodl/dev-docs/tasks/phase-78-the-templates/` beside TPL-008 and TPL-009, and `mockups/envelopes-b.html` goes with it as the
approved mockup (the same mockup-first sequence TPL-008 followed).

**Sanitisation rule, non-negotiable:** nothing in these files or in the template names a real client, a real income figure, a real
household cost or a real rate. The template ships with the mockup's invented data (Bramble & Co, Northline, Salon Collective,
Founder A, The Jazz Room …). Real numbers exist only in the hosted app's database, which is private to its creator and never
leaves nexus-1.

> ### ⏸ 2026-10-05 — PLANNING IS SET ASIDE, NOT DELETED
>
> Richard: *"I don't really like the planning app and I'm not using it … retire the planning template for now (not
> delete, just set it aside)"*. Its projects, next moves and money became the todo list's **Projects tab**
> ([TPL-008-PJ](TPL-008-PJ-THE-PROJECTS-TAB.md)); the week of hour blocks and the budgets did not move. The source is
> committed (`9b9d1e90c`) and the data stays in the backend. Every row below stops here; TPL-010-MCP is not started.
> Still to do on the box: the shelf row, the homepage card, the planning.digitalbricks.io redirect (TPL-008-PJ §6).

## The board

| Task | What a person can check when it is done | Status |
|---|---|---|
| [TPL-010 — the planner](TPL-010-THE-PLANNER.md) | `npm run template:planner` writes `templates/planner/` and `templates/planner-demo/`; the demo is live at `https://nodegx.io/templates/planner/` and the week screen fits a laptop without scrolling | 🟢 **PUBLISHED 2026-09-22** — live at <https://nodegx.io/templates/planner/>, first card on the homepage, and on the community shelf as `planner` (data-app, 214 files). Driven against the public URL 25/25 + 40/40. The app calls itself **Planner** now, the name Richard ruled on 2026-09-21. **R2.7 (2026-09-22): the demo can be emptied and used for real — and the defect that found, a planner that could never write its FIRST settings row, is fixed (`Commands/Add settings`).** AC9 🟢; AC11 is still his week of real use. Earlier: **built, driven, and answered on both open questions.** Gates **30/30**; driven with real clicks in both palettes with 0 console errors; **AC4 done** (R16, the log sheet) and **the phone done** (R17, one day column and a day picker) — 0 unreachable text at 390×844, and 1280×900 unchanged at `scrollWidth` 1280 / `pageHeight` 900. |
| [TPL-010-H — hosting at planning.digitalbricks.io](TPL-010-HOST-PLANNING-DIGITALBRICKS.md) | `https://planning.digitalbricks.io` opens the signed-in planner on a phone and a PC with the same account as the todo list | 🟢 **SHIPPED 2026-09-23** — TLS verified, `/health` 200, closed routes 404, anonymous reads of the planner collections 403, todo list and every neighbour 200 after the one backend restart. AC1/2/5 green, AC3 🟡 (row counts not read — his data; he looks), **AC4 and AC6 are Richard's**: sign in with the todo account, then log a block from the phone. |
| [TPL-010-L — the link to the todo list](TPL-010-LINK-THE-TODO.md) | An overdue todo task with a deadline appears as a red block at the top of today in the planner, and a move sent from the planner appears at the bottom of the todo list with its deadline | 🟢 **built, gated and driven 2026-09-23** (L1–L7, AC6, and Richard's L3a: a task opens the block sheet and becomes a block). tpl010 77/77, tpl008 45/45, drives 27/27 + 5/5 on the production engine. 🔴 **Not on the box** — every deploy refused by the session guard; builds in `nodegx-template-crm/ship-2026-09-23/`. |
| [TPL-010-T — next actions into blocks, and a history on both sides](TPL-010-TRACE-BOTH-SIDES.md) | A todo task's next actions each become a block; the task's history in the todo list says it was planned and logged; blocks and projects in Planning have a history of their own | 🚀 **SHIPPED 2026-09-23 evening (s11), with B** (policy first: `PlanEvent` live, anonymous 403). Ruled: T1 (a) each ticked action a block, T1b yes (the action ticks in Todo with the block's note), T2 both lines, T3 one log on the block and the card. tpl010 90/90, tpl008 45/45, `drive-tpl010-l.js` 44/44, real backend 13/13. **Ship: the policy first** (§6 of the task). AC6 is his week. |
| [TPL-010-B — billing made clear](TPL-010-BILLING-MADE-CLEAR.md) | Adding a fixed €2,400 project, the form asks for the amount and the day the bill goes out and says what Save will do; the card then says *Sent the invoice? Mark it*, then *Been paid? Tick it* | 🚀 **SHIPPED 2026-09-23 evening (s11), with T** — hosted and nodegx.io demo, driven live b 20/20, money 40/40, l 44/44; shelf publish open. Richard asked for *"whatever UX changes will make this clearer"* after getting stuck on a real fixed job; B1–B9 are the builder's calls, listed for him to undo. tpl010 95/95, `drive-tpl010-b.js` 20/20, money 40/40, l 44/44. Ships with T: `ship-2026-09-23-b` supersedes `-t`. |
| [TPL-010-R2 — round two: what the first hour of use found](TPL-010-R2-FIRST-USE.md) | The fonts and spacing are the mockup's, the moves strip wraps, the page scrolls to the cash strip on a 1,423×800 window; a project, a move and a block can be added and edited in the app; a half hour is logged as an entry without closing the block and the tick asks; an earning project's card shows its next invoice with should / will / agreed and its past invoices with days-to-pay; Settings has capacity, the split with recommendations, and guardrails | 🟢 **ALL SIX BUILT.** R2.5 landed 2026-09-22 (gates 65/65, drive 25/25). Earlier: researched and written 2026-09-21. Six tasks R2.1–R2.6 from Richard's first session with the demo. **Every ruling approved 2026-09-21** (R13a, R13b, R7a, R5a, R16a, R5b and the additive R7b–d, R18–R25); **R2.6, R2.1, R2.4 and R2.3 built** (the page scrolls; the mockup's look; the three editors — block sheet with logged entries, project editor, money events; the move box with its day, *Move it* and *Take it out*, placed = a live move block from today on — driven 25/25 and 19/19 on the deployed demo, gates 48/48). Waiting on Richard: R2.1-6 ("that's the mockup") and R2.6-2, which R2.4 and R2.3 made worse (the week box now ends at 953 at 1280×900; options in the R2 doc, s2 and s4). **R2.5 built 2026-09-22**: four sections, seven day ticks, R25's recommendations, the guardrails, and L6's `todoUrl` with the bar's *Todo ↗*. Two departures from the task file are recorded in its §R2.5 — the recommendation rounds to the quarter hour (63.75 / 13.25, not 64 / 13), and a row with no `workingDays` still means Mon–Sat. |
| [TPL-010-M — the money](TPL-010-MONEY.md) | A € button opens a Money modal (Upcoming · Past · Recurring); partner, household, tax and each client's bills are money items that repeat weekly / monthly / quarterly / yearly or happen once, each repeat changeable on its own and ticked when it happens; late items come first; hoped money has a likelihood; the bottom of the week says break-even, target, how far off, what might come, and the lowest point | 🟢 **built, gated and driven 2026-09-21** (`4d806115e`): the modal, the three lines under the week, Billing on the project card, late money in the drawer, and the two billing types. Rulings M1–M9 are Richard's words; M10–M16 and M11a agreed; the mockup (`nodegx-template-crm/mockups/money.html`, v2) approved before any graph. Absorbed R2.2 and R2.5's money section. Waiting on Richard: **M-14**, his own month built from nothing. |
| [TPL-010-MCP — the coach over MCP](TPL-010-MCP-THE-COACH.md) | From Claude Code on his laptop, a key bound to his user lists find/get/create/update tools for every planner and todo collection and `plannerPosition`; changing `focusHours` over MCP changes the week on reload; a `Decision` written by the coach is in the drawer with its review date | ⬜ **researched 2026-09-21.** No server to write: the backend has served `/mcp` since `852b77545` (2026-09-19). Needs the backend redeployed, `mcp` in both Caddy matchers, one scoped key, two collections (`Decision`, `Note`), `Block.dropped` instead of delete, one cloud function. After TPL-010-H and R2.4/R2.5. |

**2026-09-23: RENAMED TO PLANNING, AND HOSTED.** Richard's rulings: the app is **Planning** (not Planner), the hour
budgets are **budgets** (not envelopes), rename everything with a redirect, ship after the rename. Template
`templates/planning` + `planning-demo` (`npm run template:planning`, gates **67/67**); demo live at
<https://nodegx.io/templates/planning/> with `/templates/planner/` redirecting; shelf row `planning` v1 published and
`planner` unpublished; **`https://planning.digitalbricks.io` is live** (TPL-010-H). Drives on the public demo: money 40/40,
r23 19/19, r24 21/22, r25 36/37 — both misses are the Billable tile reading *Month covered* on the 23rd, so its
"for the N days left" line has nothing to show; date-driven, not the rename. Next: **TPL-010-L**, then **MCP**.

**Where it stands, 2026-09-22.** TPL-010, TPL-010-M and TPL-010-R2 are all built, and the demo is published — on
nodegx.io and on the community shelf. What is left is the three that need a host:

1. **TPL-010-H**, and it is blocked on one thing only: an **A record for `planning` → `49.12.102.195` at Namecheap**
   (ruling H3). Everything else is the recipe in that file, and the merge script it names is still to write.
2. **TPL-010-L**, after H, because its first acceptance criterion needs both apps on one backend. L6 is already
   built — `Settings.todoUrl` and the bar's *Todo ↗* came with R2.5 — so what is left is the tasks going through it.
3. **TPL-010-MCP**, last: it needs the hosted backend and the round-two data.

The original order, for the record: TPL-010 first (it defines the data), then R2 (R2.6 first), then M, then H, L and MCP.

## Explicitly later, not in this board

- ~~**The coach as an MCP session.**~~ **Moved onto the board 2026-09-21** as TPL-010-MCP, on Richard's word and because the
  backend already serves `/mcp`; the `Decision` collection it needs is in that task.
- ~~**Customisable cash events**~~ **Moved onto the board 2026-09-21** as TPL-010-M.
- **Month view.** The week is the only main view by ruling; a month roll-up is a later ask.
