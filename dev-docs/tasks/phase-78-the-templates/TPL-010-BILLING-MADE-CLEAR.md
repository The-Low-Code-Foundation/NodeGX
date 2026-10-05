# TPL-010-B — Billing made clear: a project's bill is typed where the project is

**Opened 2026-09-23 (s11).** Richard added a real fixed-price job to hosted Planning and got stuck:

> *"I went to add a project which is like a one-shot task that'll bring in about 2400 euros over the space of a few
> weeks. It's a fixed term project, and once it's done there's no more money to be made from that for the moment. […]
> even though I selected Fixed billing, it's still talking about agreed hours a month but no way for me to actually
> write how much money this project will be paid. Or is the idea to add that in 'next move' for example? When I've done
> the project, no matter how many hours it took, I'll bill 2400. How does that work for generating the invoice and
> adding to the system that I've finished and asked for payment?"*

The model was right (M21: a fixed project's money is its bills; M5: the user types each bill). **The screens never said
so.** The €2,400 had one home — *+ Add a bill* on the card, after saving — and nothing on the form pointed at it, while
three things on it pointed elsewhere: an hourly rate on a fixed project, *Agreed hours a month* on a one-off, and a
*What it is worth* box in the next move.

Then, answering the explanation: *"Yes can you build whatever UX changes will make this clearer so people don't get lost
and frustrated please."* That is the brief, so the calls below were made by the builder and are listed for him to undo.

## 1. What changes, as behaviour

**B1 — The form asks for the bill.** A Billable project's form has a **Billing** box (the same tinted box as *Next
move*): how it's billed and the payment terms, then **the rate** (hourly only) or **agreed hours** (fixed only,
optional), then **When do you bill?** — *One bill, when the work is done* · *A bill every month* · *Not now: I'll add
bills on the card* — with the **amount** (fixed only) and the day **the bill goes out** (and, for a monthly bill, the
optional last one).

> Richard's job: Fixed · 14 days · *One bill* · €2,400 · goes out Fri 16 Oct. The form says, under the fields:
> *"Saving adds the bill: €2,400, goes out Fri 16 Oct, due Fri 30 Oct. The hours you log are a record and never change
> it. When the work's done, send your invoice as usual and mark the bill sent on the card."* He presses Save; the card
> opens on the project with that bill under Billing, and Money has it on 16 Oct and 30 Oct.

**B2 — The sentence under the billing fields always says what Save will do**, as the fields change: the bill it adds,
what is still missing (*"Type the amount and pick the day the bill goes out, and saving adds the bill"*), or that it adds
none (*"No bill yet. Until it has one, the month doesn't count this project's money."*).

**B3 — Only a project with no bills is offered one.** A project that has bills shows them in words instead (*"Its bills
are on the card under Billing: one bill, €2,400, goes out Fri 16 Oct, due Fri 30 Oct."*); bills are changed where they
are. Editing a project with none (Richard's, if he saved it before this) opens on *Not now*, so a rename never adds a
bill by accident.

**B4 — Only Billable work has Billing.** Building, Hobby, Dormant and Admin projects show no rate, terms or bills. What
they had stored is kept.

**B5 — The card says what to do next with a bill.** No bills: *"None yet. Add the bill, so the month counts its money."*
(hourly: *"… it fills from the hours you log."*). A bill not sent yet adds a line — *"Planning doesn't make the invoice.
Send yours as usual, then mark the bill sent. Tick the payment when the money arrives."* — and a button, **Sent the
invoice? Mark it**, that opens Money on that bill. Once sent, the button is **Been paid? Tick it**, opening the payment.

**B6 — Money's bill pane says the same:** *"Goes out Fri 16 Oct. Planning doesn't make the invoice: send yours as usual,
then mark it sent here. The payment is its own tick, due Fri 30 Oct."*

**B7 — A bill that should have gone out is the evening's concern**, after late money (M15) and before the building move:
*"One thing: Linguaid Training's bill (€2,400) was to go out Fri 16 Oct and isn't marked sent. Send it and mark it sent,
or change its day."* *Open it in Money* opens that bill.

**B8 — The next move says what it is for:** *"The next thing to do on it. What it's worth is a note in words; the money
agreed goes in Billing."* (Billable) or *"The next thing to do on it, and what it could lead to, in words."* (others).

**B9 — Slot and Rung leave the form.** Nothing in the app reads or shows either (the card's *Slot* is a fact, typed
separately); they were two unlabelled boxes of jargon. Stored values are kept and no longer written.

## 2. Builder's calls (Richard can undo any of these)

- A new project defaults to *One bill*, with no day picked: the day is always chosen, never assumed (month end is
  common, but not for a one-off like this one).
- A monthly bill from the form goes out on the day picked each month and is due the project's terms later; a last day
  is optional (M-rulings: *"with a set start and end date so it's not billing forever"* is offered, not forced).
- *Mark it sent* does **not** move the due date to the sent day + terms. That would change a money rule he ruled on (the
  terms only pre-fill); if a bill goes out late, *Change the date or amount* in Money moves it. Worth asking him.
- The project's history line names the bill: *"Project started as "Linguaid Training", with its bill: €2,400, goes out
  Fri 16 Oct"*; an edit that adds one says *"bill added: …"*.

## 3. The build

- `Week/Project editor`: the Billing box, B1–B4, B8; `peShape` (a Function reading what is picked NOW, like the Money
  editor's `edShape`) owns what is shown, the sentence, and the effective `billWhen` (`later` whenever no bill is
  offered). Slot/Rung boxes removed.
- `Commands/Add project` and `Commands/Edit project` write the bill themselves: the guard works out the bill at the
  press (so a closing form cannot race it); after the project is written, a gate writes the `MoneyItem` (project id
  from the write, or the input) and only then the history line. One press, one project, at most one bill.
- `Logic/Money pane`: B5's rows and the button's label and target; B6. `Logic/Money`: B7 through `lateConcern` /
  `lateKey` (a bill's key carries `|bill`).
- The Planning page: the card's *open bill* → the pane on that repeat (its own Set Variable, trap 5).

## 4. Acceptance

| # | Check | How |
|---|---|---|
| B-1 | New Billable project, Fixed, One bill, €2,400, a day: Save writes the project and ONE money item (+€2,400, once, bill day, due = day + terms, the project's id) and the card shows it | gate + drive |
| B-2 | Fixed with no amount, or no day, or *Not now*: no money item, and the sentence says why | gate |
| B-3 | Hourly, monthly: one repeating item that fills from the hours, lead days = terms | gate |
| B-4 | Editing a project that has bills never adds one; editing one without opens on *Not now* | gate |
| B-5 | A Building project's form has no Billing box and its save writes no bill | gate + drive |
| B-6 | The card's *Sent the invoice? Mark it* opens Money on that bill with *Mark as sent*; after marking, the card says *Been paid? Tick it* | drive |
| B-7 | An unsent bill whose day has passed is the drawer's concern and *Open it in Money* opens it | gate |
| B-8 | 1280×900, 1423×680 and 390×844: the form fits its pane, nothing sideways | render |

## 5. Record

**🚀 SHIPPED 2026-09-23 evening (s11), with TPL-010-T.** Richard: *"push to the nodegx demo page, and the digital bricks
page"*. In order: live policy read (11 collections), `merge-policy.js` → *added 1: PlanEvent*, `provision.sh` installed it
(backup kept, backend restarted, `/health` ok, `security.enforced: true`); `ship-2026-09-23-b/planning-host` rsynced;
`nodegx-web` `ops/deploy.sh` (homepage byte-identical to live, so only the demo changed; neighbours 200 before and after).
**Checked from outside:** planning.digitalbricks.io serves `index-37fdd56340d842b8.js`; anonymous `PlanEvent`, `MoneyItem`,
`Project` → **403**; todo 200; manifest 200. nodegx.io/templates/planning serves `index-c9259e6cf9a05c6d.js`, driven live:
**b 20/20, money 40/40, l 44/44**. ⬜ Not done: the shelf publish (not asked; 229 files, command in T §6). ⬜ Not observed:
the hosted app signed in as Richard.

**Built, gated and driven 2026-09-23 (s11)** — on top of TPL-010-T.

- **Gates** `tpl010Template.test.ts` **95/95** (90 + B-6 in §6 and four in the new §9). Updated on the way: M-6 now expects
  B7's concern once Salon is ticked (the fixture's Northline bill was due out yesterday and is not sent) and then none
  once it is marked sent; the demo's write count is 3 for Add project and Edit project. `typecheck:mcp` 0.
- **Drives, production engine** (`noodl.deploy.js` 1,674,807 bytes, the live one): **`drive-tpl010-b.js` 20/20** (new:
  Richard's €2,400 from + New project to *Been paid? Tick it*, the rename that must not add a bill, a Building project,
  the day-picker trap, 390 wide, 0 console errors); money **40/40**, l **44/44**, r23 **19/19**, r24 21/22 and r25 36/37
  (the two known date misses, same as s10). Screens read at 1280×900, 1423×680 and 390×844.
- **Found on the way:** a project with no one-line description showed *"Add a project and it appears here."* under
  its own name (`Logic/Card rows`); now only a planner with no projects says it. **D81** (the Date picker keeps a
  picked day when the next record's is empty too) recorded and worked around.
- ⚠️ `tpl008Template.test.ts` **does not load** in this checkout, and that's not this task: a peer session is
  mid-way through TPL-008-RC (routines) in `tpl008Components.ts` (modified 21:51 while this ran). Nothing here
  touches TPL-008.
- **Ready to ship:** `~/vscode_projects/nodegx-template-crm/ship-2026-09-23-b/planning-host` (T and B together,
  `index-37fdd56340d842b8.js`, PWA applied) **supersedes `ship-2026-09-23-t`**; `nodegx-web/site/templates/planning` is
  rebuilt; the shelf stays **229** files. The policy step is TPL-010-T's, unchanged (B adds no collection).
