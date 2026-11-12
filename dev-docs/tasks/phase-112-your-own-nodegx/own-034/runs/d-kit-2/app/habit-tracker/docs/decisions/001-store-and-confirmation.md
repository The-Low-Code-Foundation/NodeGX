# 001 — Where the habits live, and how a delete asks

Decided while building the first version. Each one had a real alternative, and each is the kind of
decision a later reader would otherwise undo by accident.

## The store is one file and four Functions, and still no backend

**Decision.** Every habit and every tick is one JSON object in this browser's localStorage, under the
single key `habit-tracker:v1`, read and written whole. The rules — what a day string is, what a streak
counts, what the screen is handed — live in `scripts/habits.js`. The component `/Components/Habit Store`
holds four Functions, one per action (load, add, toggle, delete); each reads the whole store, makes its
one change, writes the whole store back, and publishes the view.

**Rejected — one Function with a signal input per action.** It looks tidier, and it cannot work: a
Function's body is given its inputs, not which of its signal inputs fired. Anything that has to branch
on "which one was it" would have to guess, and the guess fails silently.

**Rejected — the store as a shared named Array with one writer.** A live Array would remove the
publish wires, but localStorage would still need a Function to read and write it, so the app would hold
two sources of truth for the same habits. The Array is the store only when nothing is persisted.

**Rejected — a backend after all.** The scope rejected it and the build did not change the reason: one
person, one device, nothing shared.

## A delete asks inside the row, not in a dialog over the page

**Decision.** The delete control swaps the row's own content for the question, with Delete and Keep.
The state is a `Switch`, so each row instance asks independently.

**Rejected — a modal over the page.** It needs an overlay, a scrim, focus handling and a component of
its own, and what is about to be deleted is the thing the person just pointed at. A question that
appears where the thing was does not need a panel to say which thing.

**Rejected — a `Variable` holding the id awaiting confirmation.** A Variable is one value for the whole
app by name, so opening the question on one row would open it on every row at once. This is the trap
that ships, because it looks right with one habit on screen.

**Rejected — no confirmation.** Ticks are the only data here that cannot be reconstructed from
memory, and deleting a habit takes all of them with it.

## A blank name is refused by a disabled button, not by an error message

**Decision.** The Add button is disabled until the field holds something that is not just whitespace,
and the store refuses a blank name as well.

**Rejected — an error message under the field.** It is a second thing to build, it goes stale while
the person types, and it tells someone off for pressing a button that could simply not have been
pressable. The store still refuses, so the rule holds even if the button is ever rewired.

## Known limits, written down rather than discovered later

- **The tick disc has no accessible name.** It is a `Group` with a click, styled as a 44px disc, and
  the check inside it is an icon. A `Button` would give a screen reader a name, but only by drawing a
  visible label on every row, which is not the control this screen wants. It is the one place in this
  app where the look won over the label.
- **`cssClassName: "habit-tick"` on that disc exists only so a test can press it.** Nothing styles it.
  It is not decoration and should not be removed as though it were.
- **The app reads `today` when it loads or when something changes.** Left open across midnight, the
  header still describes the day it was opened on until the next action. The tick itself always uses
  the real current day.
- **The seven days are read from ticks, never written.** Nothing here can edit a past day, by design:
  a habit tracker that lets you tick yesterday is a diary.
