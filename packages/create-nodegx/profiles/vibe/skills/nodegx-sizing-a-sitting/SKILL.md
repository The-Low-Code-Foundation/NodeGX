---
name: nodegx-sizing-a-sitting
description: "How big a part and a sitting should be, how to tell you're going past your limits, and how to cut cleanly with a good NEXT.md. LOAD when you split the build into parts (sitting 1), at the start of every build sitting, and whenever a part feels bigger than you thought."
user-invocable: false
---

# Sizing a sitting

The most capable builders on this team work in small sittings, and they still do after hundreds of them — one phase
of NodeGX itself has taken over a hundred sittings so far. That isn't a lack of ability. Small steps are how good work gets done
reliably: each one is short enough to think about clearly, check properly, and hand over cleanly. So when you cut a
sitting short to write a good note, you're doing it right.

## How big a part is

A part is small enough for one sitting when **all** of these are true:

- it makes **at most four checklist lines** possible;
- it builds or changes **one or two components**;
- you can say in one sentence what it does, and name the first tool call you'll make.

Split by what a person can *see* change, not by screen. A screen with a timer and taps and a score is three parts,
not one: the timing logic and the tap logic each have their own bugs, and each deserves a sitting with a clear head.
For example, a reading log (add a book, mark it finished, give it stars, see totals) splits like this:

1. The list page: the title, the empty-list sentence, the books from a fixed sample (2 lines).
2. Adding a book: the field, the button, the refusal when empty (3 lines).
3. Marking finished: the checkbox, the crossed-out look, what the count says (3 lines).
4. Stars: tapping a star sets the rating; the rating stays after a reload (2 lines).
5. Totals: "3 of 7 finished", updating as you tick (2 lines).
6. Prove: every line again, from a fresh start.

Six sittings for a small app is normal and fine.

## Signs you're past your limits — cut here

Stop building, finish the part you're on or write down how far you got, and write `NEXT.md` when any of these happens:

- **You've made about 30 tool calls** this sitting, or the part's lines all pass — whichever comes first.
- **You've read for ten calls in a row** without writing anything. That means the part is too big to hold: split it,
  build the first half, leave the rest in `NEXT.md`.
- **You're designing more than one component in your head** before writing any of them. Write the first one now;
  the server checks it, and a written component is worth more than a planned one.
- **A fix has failed twice.** Write down what you tried and what you saw (see `nodegx-when-stuck`), and stop — a
  fresh sitting with that note will see it straight away.
- **A thought runs on and on.** If an answer is turning into a long design, stop thinking and make one small tool
  call instead: write a component, or drive one tap. Answers with no tool call in them can run for many minutes and
  save nothing.

Cutting early is never a failure. A part finished small beats a part half-done big, every time.

## A good NEXT.md

Write it for a colleague who has never seen this conversation — because that's who reads it. First line is the step;
then what to read, what to build, which lines prove it, and where to stop:

```markdown
# Next sitting: build part 3 — marking finished

Read docs/REQUEST.md, docs/CHECKLIST.md (the three "finished" lines), docs/PLAN.md (part 3).
open_project the reading-log row; get_project_info; get_node_type Checkbox, For Each.

Where things are: the BookRow component exists (part 1) with Component Inputs title, author, id.
Parts 1–2 pass (see CHECKLIST). Nothing about "finished" is built yet.

Build: a `finished` field on each book; a checkbox in BookRow that sets it; the crossed-out,
greyed title when finished; "2 of 7 finished" under the list.
Learned last sitting: the Add button's refusal needed a signal beside the value (same-value rule).

Drive the three "finished" lines, mark them, add to PLAN.md what you learned, then rewrite this
file for part 4 — stars — and stop.
```

The line "Where things are" is the one people forget and the next sitting needs most: what exists, what passes,
what doesn't yet.
