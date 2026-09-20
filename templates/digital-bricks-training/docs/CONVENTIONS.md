# Conventions

## How this file is used

The rules below are read by the assistant on **every authoring turn**, and they
outrank its own defaults. Editing this file changes what gets built.

Write rules that are checkable. "Make it nice" is not a rule; "every page's
outermost node is a Group named `Page Root`" is.

Lines marked **(example)** are placeholders showing the shape of a good rule.
They are *not* rules for this project: **ignore every line marked (example)** —
this instruction is addressed to the assistant as much as to you. Replace them
with your own rules, or delete them.

That matters because this file reaches the assistant verbatim. A project created
from a scoping conversation that agreed three pages would otherwise ship
carrying "(example) Do not add a Router; this app is a single page".

## Structure

- (example) Every page's outermost node is a Group named `Page Root`.
- (example) Shared UI goes under `/Components/`; pages go under `/Pages/`.

## Naming

- (example) Component names are Title Case; node labels say what the node is
  *for*, not what type it is.

## Styling

- (example) Never set a raw hex or px value where a design token exists.

## Data

- (example) All reads go through a Query Records node; never fetch in a
  Function node.

## What not to do

- (example) Do not add a Router; this app is a single page.

## Established during scoping

- Every colour, spacing and font parameter is var(--token); no hex in any component parameter (this repo's invariant 9).
- The product's own token names (--paper, --ink, --thread, --edge...) are aliases of NodeGX's semantic tokens, defined once in noodl_modules/dbt-lesson/styles.css.
- Every string that reaches a model or a learner is rendered through the kit's one sanitised markdown path; no second markdown path.
- Nothing gates, nothing scores, nothing paints red: a wrong quiz answer shows feedback in ink; --warm is for encouragement and human recording only; --go means done.
- No numerals in the stepper on screen (aria-label only); every step is reachable at any time.
- The lesson is 3-5 steps indexing a flat sections array; a section id that does not resolve throws by name rather than rendering wrong.
- No fetch in any kit node: a node emits an output port and the graph decides where it goes.

_Source: `docs/decisions/000-initial-scope.md`._
