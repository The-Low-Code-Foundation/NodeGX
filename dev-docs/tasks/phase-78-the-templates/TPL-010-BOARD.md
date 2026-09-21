# TPL-010 — The planner: task board

Drafted 2026-09-20 in `nodegx-template-crm/tasks/`, **outside any repo on purpose**. When the build starts, this folder moves to
`OpenNoodl/dev-docs/tasks/phase-78-the-templates/` beside TPL-008 and TPL-009, and `mockups/envelopes-b.html` goes with it as the
approved mockup (the same mockup-first sequence TPL-008 followed).

**Sanitisation rule, non-negotiable:** nothing in these files or in the template names a real client, a real income figure, a real
household cost or a real rate. The template ships with the mockup's invented data (Bramble & Co, Northline, Salon Collective,
Founder A, The Jazz Room …). Real numbers exist only in the hosted app's database, which is private to its creator and never
leaves nexus-1.

## The board

| Task | What a person can check when it is done | Status |
|---|---|---|
| [TPL-010 — the planner](TPL-010-THE-PLANNER.md) | `npm run template:planner` writes `templates/planner/` and `templates/planner-demo/`; the demo is live at `https://nodegx.io/templates/planner/` and the week screen fits a laptop without scrolling | 🟡 **built, driven, and answered on both open questions.** Gates **30/30**; driven with real clicks in both palettes with 0 console errors; **AC4 done** (R16, the log sheet) and **the phone done** (R17, one day column and a day picker) — 0 unreachable text at 390×844, and 1280×900 unchanged at `scrollWidth` 1280 / `pageHeight` 900. **Still not published to nodegx.io** — Richard's call, 2026-09-21 — so AC9 stays half and AC11 is his week of real use. |
| [TPL-010-H — hosting at planning.digitalbricks.io](TPL-010-HOST-PLANNING-DIGITALBRICKS.md) | `https://planning.digitalbricks.io` opens the signed-in planner on a phone and a PC with the same account as the todo list | ⬜ never built |
| [TPL-010-L — the link to the todo list](TPL-010-LINK-THE-TODO.md) | An overdue todo task with a deadline appears as a red block at the top of today in the planner, and a move sent from the planner appears at the bottom of the todo list with its deadline | ⬜ never built |
| [TPL-010-R2 — round two: what the first hour of use found](TPL-010-R2-FIRST-USE.md) | The fonts and spacing are the mockup's, the moves strip wraps, the page scrolls to the cash strip on a 1,423×800 window; a project, a move and a block can be added and edited in the app; a half hour is logged as an entry without closing the block and the tick asks; an earning project's card shows its next invoice with should / will / agreed and its past invoices with days-to-pay; Settings has capacity, the split with recommendations, and guardrails | ⬜ **researched and written 2026-09-21, nothing built.** Six tasks R2.1–R2.6 from Richard's first session with the demo. **Every ruling approved 2026-09-21** (R13a, R13b, R7a, R5a, R16a, R5b and the additive R7b–d, R18–R25); **R2.6, R2.1, R2.4 and R2.3 built** (the page scrolls; the mockup's look; the three editors — block sheet with logged entries, project editor, money events; the move box with its day, *Move it* and *Take it out*, placed = a live move block from today on — driven 25/25 and 19/19 on the deployed demo, gates 48/48). Waiting on Richard: R2.1-6 ("that's the mockup") and R2.6-2, which R2.4 and R2.3 made worse (the week box now ends at 953 at 1280×900; options in the R2 doc, s2 and s4). Next TPL-010-M (its rulings M10–M16 first). |
| [TPL-010-M — the money](TPL-010-MONEY.md) | A € button opens a Money modal (Upcoming · Past · Recurring); partner, household, tax and each client's bills are money items that repeat weekly / monthly / quarterly / yearly or happen once, each repeat changeable on its own and ticked when it happens; late items come first; hoped money has a likelihood; the bottom of the week says break-even, target, how far off, what might come, and the lowest point | ⬜ **written 2026-09-21, nothing built.** Rulings M1–M9 are Richard's words; **M10–M16 proposed, need his yes.** Step 0 is a mockup (`nodegx-template-crm/mockups/money.html`), approved before any graph. Absorbs R2.2 and R2.5's money section. |
| [TPL-010-MCP — the coach over MCP](TPL-010-MCP-THE-COACH.md) | From Claude Code on his laptop, a key bound to his user lists find/get/create/update tools for every planner and todo collection and `plannerPosition`; changing `focusHours` over MCP changes the week on reload; a `Decision` written by the coach is in the drawer with its review date | ⬜ **researched 2026-09-21.** No server to write: the backend has served `/mcp` since `852b77545` (2026-09-19). Needs the backend redeployed, `mcp` in both Caddy matchers, one scoped key, two collections (`Decision`, `Note`), `Block.dropped` instead of delete, one cloud function. After TPL-010-H and R2.4/R2.5. |

Order: TPL-010 first (it defines the data). **Then TPL-010-R2**, R2.6 first, because Richard is using the demo now and the round-two
changes alter the data (`Invoice`, `Block.entries`, the Settings columns) that H deploys and MCP exposes. TPL-010-H and TPL-010-L can
run in the same session after it; H before L, because L's first acceptance criterion needs both apps on one backend. TPL-010-MCP
last: it needs the hosted backend and the round-two data. **TPL-010-M** after R2.3 and before R2.5 (it changes Settings, which R2.5 then builds on); it
changes the data H deploys, so before H too.

## Explicitly later, not in this board

- ~~**The coach as an MCP session.**~~ **Moved onto the board 2026-09-21** as TPL-010-MCP, on Richard's word and because the
  backend already serves `/mcp`; the `Decision` collection it needs is in that task.
- ~~**Customisable cash events**~~ **Moved onto the board 2026-09-21** as TPL-010-M.
- **Month view.** The week is the only main view by ruling; a month roll-up is a later ask.
