---
id: P109-S20-LONGTOAST
title: A long toast grows past the top of the window, so its title and first sentences cannot be read
status: fixed
commit: 12a971c32
phase: P109
task: ISL-044
severity: medium
area: editor / ToastLayer (ToastCard.module.scss)
found: P109 ISL-006 s20, 2026-10-06
evidence: dev-docs/tasks/phase-109-the-defects-the-island-found/ISL-006-A-FUNCTION-SAYS-WHAT-ITS-PORTS-ARE.md §8 s20
regression: read in the running editor (no spec can lay out CSS here): ISL-044 §8 s43
---
The toast stack is anchored at the bottom right, and a card has no maximum height and no scroll (`.Root` sets
`overflow: hidden`). Opening a copy of SuntappedX showed the 0.3 upgrade report, with two sections and the
backup path, as one toast taller than the window. The title "This project was upgraded for NodeGX 0.3" and the start
of the text-styles section were above the window's top edge, and the card cannot be scrolled. That toast stays until
it is closed (`duration: Infinity`).

ISL-006 s20 shortened its own section (one sentence per place, six places then a count), which helps on this project
but does not fix the card. The upgrade report (P100 UPG-002) is the likeliest long toast. A fix belongs to the toast
card: a maximum height under the window with the body scrolling.

**Fixed (P109 s43, 2026-10-11).** The card is never taller than `100vh − 90px` (the stack sits 58 px above the
bottom, react-hot-toast keeps 16 px at the top), and its message scrolls. The title, close button and actions stay.
**Read in the running editor** (a 784 px window, a 3,500-character warning raised through `ToastLayer.showWarning`
with a title, as the upgrade report raises it): the card is 32–726, the title at y 46, the message scrolls 1,704 px in
629. **Control, same page:** an injected style that takes the three rules back out puts the card at −988 and the
title at −974, off the window, as on HEAD. With the override removed, the readings are back.
