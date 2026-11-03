# HTX-003 — Lists, show and hide, pages, inputs

**Phase:** [134](README.md). **AC:** AC2 (screens). **Sessions:** 2. **Needs:** HTX-002.

These are the four jobs React did without anyone writing them. They are where the bugs will be.

## The sentence

> "I added three tasks, deleted the middle one, opened a task's page and came back. The list was right, the field I was
> typing in kept its cursor, and nothing ran twice."

## Build, in `lib/dom.js`, each small enough to read in one sitting

1. **A keyed list** (For Each, Repeater): items keyed by their id (a record's id, or the plan's key); a new item mounts
   its row, a removed one calls `destroy()`, a moved one moves its element. No row is rebuilt when its item did not change.
2. **Show and hide with clean-up** (States, a condition, a page stack): mount on true, `destroy()` on false. Every
   `effect` made while mounting is disposed by that `destroy()`. A test counts live effects before and after a hundred
   toggles: the same number.
3. **Pages**: the History API; a path opens its page component in the router's element; Back works; a reload on a
   page's path opens that page when the server falls back to `index.html` (README for hosts says how).
4. **Inputs**: a Text Input bound both ways keeps focus and cursor position while its value round-trips through state;
   a Checkbox and Options likewise.

Animations (States' transitions): CSS transitions where the plan's states carry them; anything more is refused by the
preflight, by name, in this phase.

## Done when

- todo-list's screens work in jsdom specs for each of the four (keyed reorder, effect count after toggles, path
  routing, focus kept), and in Chrome once by hand-driven script beside the runtime: add, tick, delete, open, back.
- The effect-count spec runs in the suite, since a leak there is invisible until an app has been open for an hour.

## Traps already known

- 🔴 A repeated row sends one signal per update (memory: a-repeated-row-sends-one-signal-per-update): the runtime's
  rule, not a guess.
- 🔴 `opacity:0` still animates and still takes clicks unless `pointer-events` says otherwise: hide with the plan's own
  rule, then test the click.
