---
name: nodegx-sizing-the-work
description: "How big a part should be, how to tell you're going past your limits, and how to hand a session over cleanly with a good NEXT.md. LOAD when you split the build into parts, whenever a part feels bigger than you thought, and when a session is getting long."
user-invocable: false
---

# Sizing the work

The most capable builders on this team work in small steps, and they still do after hundreds of sessions — one
phase of NodeGX itself has taken over a hundred so far. That isn't a lack of ability. Small steps are how good work
gets done reliably: each one is short enough to think about clearly, check properly, and pick up again later. So when
you keep a part small, or hand a session over to write a good note, you're doing it right.

## How big a part is

A part is the right size when **all** of these are true:

- it makes **at most four checklist lines** possible;
- it builds or changes **one or two components**;
- you can say in one sentence what it does, and name the first tool call you'll make.

Split by what a person can *see* change, not by screen. A screen with a timer and taps and a score is three parts,
not one: the timing logic and the tap logic each have their own bugs, and each deserves a clear head. For example, a
reading log (add a book, mark it finished, give it stars, see totals) splits like this:

1. The list page: the title, the empty-list sentence, the books from a fixed sample (2 lines).
2. Adding a book: the field, the button, the refusal when empty (3 lines).
3. Marking finished: the checkbox, the crossed-out look, what the count says (3 lines).
4. Stars: tapping a star sets the rating; the rating stays after a reload (2 lines).
5. Totals: "3 of 7 finished", updating as you tick (2 lines).
6. Prove: every line again, from a fresh start.

Build them in order, and prove each one before the next. A small part that passes is solid ground for the next.

## Signs you're past your limits

Slow down and make the next step smaller when:

- **You've read for ten calls in a row** without writing anything. The part is too big to hold: split it, build the
  first half now.
- **You're designing more than one component in your head** before writing any of them. Write the first one now;
  the server checks it, and a written component is worth more than a planned one.
- **A thought runs on and on.** If an answer is turning into a long design, stop thinking and make one small tool
  call instead: write a component, or drive one tap. Answers with no tool call in them can run for many minutes and
  save nothing.

And **hand the session over** when:

- **It has made about 100 tool calls.** By then the conversation is long, and every step re-sends all of it — a new
  session starting from a good note thinks faster and costs less. This folder's hook will ask you at 100.
- **A fix has failed twice.** Write down what you tried and what you saw (see `nodegx-when-stuck`) and hand over — a
  fresh session with that note will often see it straight away.

Handing over is never a failure. It's how long work stays good.

## A good NEXT.md

Write it for a colleague who has never seen this conversation — because that's who reads it. First line is the step;
then where things are, what to read, what to do next, and what you learned:

```markdown
# Next session: build part 3 — marking finished

Where things are: parts 1–2 are built and pass (see CHECKLIST). The BookRow component exists with
Component Inputs title, author, id. Nothing about "finished" is built yet.

Read docs/REQUEST.md, docs/CHECKLIST.md (the three "finished" lines), docs/PLAN.md (part 3).
open_project the reading-log row; get_node_type Checkbox, For Each.

Next: a `finished` field on each book; a checkbox in BookRow that sets it; the crossed-out,
greyed title when finished; "2 of 7 finished" under the list. Then parts 4–5, then prove.
Learned: the Add button's refusal needed a signal beside the value (same-value rule).
```

The "Where things are" line is the one people forget and the next session needs most: what exists, what passes,
what doesn't yet.
