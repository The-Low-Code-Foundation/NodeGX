# 001 — The learner's home

_Recorded 2026-09-20, TASK-L157 (sprint 45 in the Digital Bricks Training repo)._

## What changed

`/course` was the fixture LESSON's title, its steps and one button. In the product, `/course` **is**
the learner's home: their project, their scope, and their whole programme in one list. This page is
now that, and the lesson keeps one card on it.

## Decisions

**The page replaces the old Course page rather than sitting beside it.** Two pages called Course is
how a template teaches the wrong shape. The lesson's steps and its button are kept, as one card.

**The ordering, the grouping, the fold and the preview are PORTED, never re-derived.**
`Logic/Ordered timeline` carries them in one Function node, and each names the file it came from
(`server/timeline/model.ts`, `components/course/timeline-preview.ts` in the product's repo). They
were proven equal to those functions over this fixture before being pasted in — same order, same
fold state, same ahead-grouping — and then the RENDERED order was compared against the model's
again. A second spelling of the ordering would put a learner's fortnight in one order and their
coach's in another.

**One repeater over one ordered list, not four lists under four headings.** The two `ahead`
headings are carried by the FIRST row of each group, which is how the product does it, and it means
the page never re-decides an order the model owns.

**`mounted`, never `visible`.** `visible: false` is `visibility: hidden` in this runtime — it keeps
the space. Measured here first: the hidden card under each of the twelve folded rows left a 316px
hole, and the page was 7327px instead of 3806px. `mounted: false` keeps the node out of the tree,
which is also what makes the fold honest rather than cosmetic.

**Ordering is the graph's job; drawing is the kit's.** Nothing in the lesson kit decides what comes
first, what folds, or what a programme contains. That is readable, changeable graph, which is the
argument for building this in NodeGX at all.

## Rejected

- **A `state` with a fourth member** (`overdue`, `late`, `missed`) — three members, and a passed
  date lands a row in `now` with its date shown, accusing nobody.
- **Storing which rows are open** — the fold is derived from state, so a learner's page cannot
  revert to the wall it replaced, one expansion at a time.
- **A percentage, a count of what is left, or a step numeral** — `position` orders undated rows and
  is never rendered.
- **A second markdown surface for the preview line** — a folded row carries prose as TEXT; the
  kit's one sanitised path renders the card.
