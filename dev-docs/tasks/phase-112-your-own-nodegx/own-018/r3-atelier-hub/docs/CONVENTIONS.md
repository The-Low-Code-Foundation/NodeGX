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

- Every Mistral API call happens only inside a server-side function; the API key lives in the MISTRAL_API_KEY function secret and is never present in client-side code, pages, or components.
- Project status is one of: Backlog, In progress, In review, Done. Setting a project to Done triggers an automatic system post in the team feed.
- Feed posts are append-only: nobody edits or deletes a post; automatic posts have kind "system" and no human author.
- Wiki pages are addressed by a unique slug (e.g. /wiki/onboarding) and record their last author and update time on every edit.
- All dates are stored as ISO strings; the UI formats them for display.

_Source: `docs/decisions/000-initial-scope.md`._
