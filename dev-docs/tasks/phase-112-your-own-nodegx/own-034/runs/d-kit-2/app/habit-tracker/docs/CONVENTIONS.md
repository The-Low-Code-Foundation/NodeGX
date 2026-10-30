# Conventions

## How this file is used

The rules below are read by the assistant on **every authoring turn**, and they outrank its own
defaults. Editing this file changes what gets built. Write rules that are checkable — "make it nice"
is not a rule.

## Structure

- A page is built around a `Page` node, then one full-width band, then one shell Group at `maxWidth`
  640px. Content never touches the viewport edge.
- Everything a page places lives under `/Components/`. The store, the row and the day dot are all there.
- A named section is a component: the empty state is `/Components/Empty State`, not a Group subtree
  inside the page.

## Naming

- Component names are Title Case (`Habit Row`). Node labels say what the node is *for*, not what type
  it is.
- Component ports are Title Case (`Habit Id`, `Toggle`).
- The inputs a Repeater fills from a row's data use the row's own field names, lower case, because that
  is the contract the Repeater matches on: `name`, `streak`, `tickedToday`, `days`.

## Styling

- Never set a raw hex where a design token exists. Spacing and type come from `var(--space-*)`,
  `var(--text-*)`, `var(--radius-*)` and the semantic colours.
- A control's look is set once for its type with `set_element_style`, never per node. A node that needs
  to differ sets only the parameters that differ.

## Data

- Every habit and tick lives in one JSON object under the single localStorage key `habit-tracker:v1`,
  read and written whole. Nothing else in the app touches storage.
- The rules over that data — what a day string is, what a streak counts, what the view holds — live in
  `scripts/habits.js`. Every Function that needs them lists the file under `uses` and calls
  `Scripts.habits`. Nothing re-implements them in a second place.
- A Function's value inputs are unticked under Run On Value Change when a signal is what should run it,
  or the habit is added once per keystroke.

## What not to do

- Do not describe the graph in these docs, or in `docs/ARCHITECTURE.md`. The graph is the spec, and a
  description of it goes stale the moment a node moves.
- Do not hold per-row state in a `Variable`. A Variable is one value for the whole app by name, so two
  rows would share it — which looks fine with one row on screen.
- Do not write a day other than today. A habit tracker that lets you fill in yesterday is a diary.

## Established during scoping

- All stored data lives under one localStorage key holding a single JSON object; a Function reads and writes it whole, so there is no partial state to reconcile.
- A day is a local-date string 'YYYY-MM-DD' — never a timestamp and never a UTC-derived date — so a tick belongs to the day the person was actually living in.
- The seven days shown are computed from today backwards, oldest first and today last; a day with no tick renders as an empty day rather than being omitted.
- A streak counts consecutive ticked days ending today, or ending yesterday when today is not ticked yet: an unticked today never breaks a streak that was alive yesterday, so a streak is not lost just by not having opened the app yet.
- Habit ids are generated in a Function (timestamp plus a random suffix), never derived from the habit's name, so two habits can share a name.
- Deleting a habit removes its ticks with it, and asks for confirmation first.
- A blank or whitespace-only habit name is refused, and a habit name is trimmed before it is stored.

_Source: `docs/decisions/000-initial-scope.md`; build-time decisions are in `docs/decisions/001-store-and-confirmation.md`._
