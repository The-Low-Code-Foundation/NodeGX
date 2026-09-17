# GAM-028 — An app knows it is on a touch screen

**Status: ⬜ not started.** Written session 23 (2026-09-17) on Richard's ask, from GAM-011 AC7's record.
**Source:** GAM-011 AC7 (s23) · found by P87 [RKT-005](../phase-87-the-first-play-test/RKT-005-THE-ANSWER-PAD.md) · **Side:** product
(runtime, a node or a port that reports the pointer)

## 1. The person sentence

**A person building an app can ask "is this a touch screen?" and change what the app does — keep the soft keyboard shut and the
answer box display-only on a tablet, while the same app on a laptop lets the child type.**

## 2. What was measured

- **GAM-011 s22, in Chromium:** `Input Mode = none` on a Text Input does stop the soft keyboard opening, and R12 ruled that is
  enough — but it is a **fixed** choice in the graph. The field still takes focus and shows a caret.
- **GAM-011 AC7 (s23):** Rocket School focuses the answer box as each question arrives (GAM-010's `didMount → focus`, graded by the
  keyboard drive's `focusIn`). On a tablet that focus is what a display-only box exists to avoid — and **nothing in the product
  reports the pointer**, so the graph cannot focus on a laptop and not on a tablet. Meeting RKT-005 AC1's own clause
  ("`document.activeElement` is never an `<input>`") needs that fact.
- **The kit has it and the product does not:** `game-kit`'s `AnswerPad` reads `(pointer: coarse)` in JavaScript (`coarsePointer`,
  `padFieldMode`) and that is the whole reason the pad is a kit node rather than ordinary parts.
- **Not measured:** whether anything else in the shipped templates hand-rolls the same media query, and how many would use it.
  That census is AC1 here.

## 3. Where it bites a person

Any app that should behave differently under a finger — a keypad, a drag handle, a hover-only tooltip, a "tap and hold" hint — can
only do it by writing a kit node in JavaScript. RKT-008 already put an on/off/auto choice in Rocket School's player menu, and
"auto" is the one setting it cannot honour.

## 4. Related work and collisions

- **GAM-011** (`Input Mode`, `Insert Text`) and **GAM-027** (a Button that keeps the cursor) are the other two halves of the same
  person sentence; with both, GAM-011 AC7's answer changes.
- **GAM-013** added a `Repeat` node, and its §8 is the worked example of what a **new built-in node owes**: 14 surfaces, 15 export
  floor pins, `ssr.compat` decided on purpose. If this lands as a node, that list is the shape of the work.
- 🔴 **Server rendering:** a media query has no answer on the server. GAM-013 s20 measured what a node that never settles does to a
  server render (`settle` never goes quiet). Whatever this reports at render time must be decided, not discovered.
- **P41 accessibility:** `prefers-reduced-motion` is the same kind of fact and is already read by the drives
  (`Emulation.setEmulatedMedia`). Deciding one port shape for "what the device is like" may cover both — say so or rule it out.

## 5. Design

- 🔒 **Ruling for Richard, and it is the whole scope question:** which shape?
  - **(a) One node**, working name `Device`, with boolean outputs (`Coarse Pointer`, maybe `Reduced Motion`, `Dark Mode`), each
    updating when the media query changes. Costs a new node's 14 surfaces (GAM-013 §8).
  - **(b) A general `Media Query` node** taking any query string and reporting `Matches`. One node, every future fact, and the
    author has to know CSS.
  - **(c) A port on Text Input only** ("no soft keyboard on a touch screen"), which solves the keypad and nothing else.
- Whatever lands must update live (a tablet with a mouse attached, a window moved between screens) rather than be read once.
- 🔒 **Ruling:** what does it report during a server render — `false`, or nothing until the client takes over?

## 6. Acceptance criteria

| AC | Clause |
|---|---|
| AC1 | **Census before designing:** every place in `library/`, `templates/` and the library modules that reads a pointer, hover or motion media query today, by name and file, with what it does with the answer. |
| AC2 | **RED at HEAD, recorded:** a graph cannot answer "is this a coarse pointer?" — the attempt is recorded (no node, no port), beside a known-firing control showing the same page's JavaScript reading it correctly. |
| AC3 | **The person sentence, driven twice in one build:** a page whose answer box is display-only under a coarse pointer and a real input otherwise. With `Emulation.setTouchEmulationEnabled` + reload: `(pointer: coarse)` true (the armed instrument), no soft keyboard, `document.activeElement` never the `<input>`. Without it: the field focuses and types. |
| AC4 | **It updates live:** flip the emulated pointer while the page is open and the reported value follows, graded in the same run. |
| AC5 | **Server render decided and graded:** a `settle` of a page holding the node goes quiet within the usual turns, and the value it renders is the ruled one. |
| AC6 | Every surface a new node owes (GAM-013 §8's list of 14, plus the export floor pins) is done, or the chosen shape is not a node and §8 says which surfaces applied instead. |
| AC7 | **Reverted arms:** remove the listener and AC4 goes red; remove the query and AC3's touch arm goes red. |
| AC8 | **Workaround:** with this and GAM-027 in, record whether `game-kit.AnswerPad` could be ordinary parts (GAM-011 AC7 re-run, clause by clause). Do not remove the kit node here. |

## 7. Traps

- 🔴 **An instrument must be armed before it measures:** the page must itself report `(pointer: coarse)` before any touch clause is
  read (GAM-011 AC2's pattern) — otherwise a pass means the emulation never took.
- 🔴 **A new built-in node owes 14 surfaces**, and the export floor pins were 15 where a survey said 7 (GAM-013 s20). Count them
  from that record, not from memory.
- ⚠️ `(pointer: coarse)` is not "is a phone": a touchscreen laptop reports coarse **and** has a keyboard. The sentence is about the
  pointer, and the node's name and description must not promise a device.
- ⚠️ A media query read once at mount looks correct in every drive that never changes the emulation.

## 8. Record

_(empty — nothing built yet)_
