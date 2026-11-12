---
id: P121-TWO003-GROUPKEYBOARD
title: A Group (or Text, or Image) that answers a click can't be reached from the keyboard, so a whole card that opens something works only with a pointer
status: fixed
commit: ae80457b3
regression: packages/noodl-viewer-react/tests/two003-groupkeyboard.test.tsx "Enter sends Click once, and the keydown is cancelled"
severity: medium
area: runtime / Group (and every visual node with Click: Text, Image); `noodl-viewer-react/src/components/visual/Group/Group.tsx`
found: P121 TWO-003 s5, 2026-10-14
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §8.5
---

A product card is the common case: the whole card opens the product. In NodeGX the card is a Group, and a Group has a
Click output, so wiring Click → Router Navigate works with a mouse or a finger. A person on a keyboard, or a switch
or screen-reader user, can't reach it: Tab skips it, and Enter or Space on it does nothing.

Measured on 2026-10-14:

- `Group.tsx` renders a `div` (or the tag picked under **as**) with no `tabIndex`, no `role` and no key handler;
  `grep -i tabindex` in `components/visual/Group/` finds nothing.
- The catalog's Group **as** offers `div, section, article, aside, nav, header, footer, main, span`: no `button`
  and no `a`, so no tag choice gives it a keyboard either. No port sets a tab stop.
- Text and Image have the same Click output and the same gap.

What the marketplace template did instead (P121 TWO-003 slice 2): each card keeps its Group Click for pointers AND
puts the product's name in a Button styled as text, wired to the same navigate, with Click Bubbling `never` so a click
on the name doesn't fire twice. The seller chips and the seller line on a product's page do the same. It works, but
every builder making a card has to know to do it, and nothing tells them.

Fix, proposed: when a visual node's Click output is wired, give its element `tabIndex=0`, `role="button"` (unless a
role or tag says otherwise) and fire Click on Enter and Space; or a **Focusable** setting that does it. A validation
warning ("Click wired on a Group: a keyboard can't reach it") would be the cheap first half.

**Met again, P121 TWO-005 s13 (2026-10-15), where the workaround above doesn't fit:** a profile's grid of photos. A
photo tile has no name to put in a Button. The community template lays a Button over each photo (`position:
absolute; inset: 0`, transparent, its label the photo's description drawn in transparent ink), so Tab reaches the tile
and a screen reader names it. The drive checks each tile holds a `BUTTON` with `tabIndex` 0 and clicks the photo's by
its label (`two-005-profile-drive.test.ts`). It takes four lines of CSS a builder would have to invent; a
focusable Group, or an Image with Click that is a button, would need none.

**Ruled 2026-10-26 (Richard), asked:** *"Should a Group with Click wired become keyboard-reachable by itself (Tab stops on
it, Enter or Space clicks it), or should it be a setting the builder turns on?"* **Answer:** *"For accessibility yes,
absolutely, we must have interactive elements available to screen readers that tab through the page."* So automatic.

**Fixed 2026-10-26 (the Beta sweep s12, ae80457b3), as ruled.** `noodl-viewer-react/src/keyboard-click.ts`: while a visual
node's Click output has a wire, its element gets `tabindex="0"` and `role="button"` (only where it has neither already,
and never on a native `<button>`, link, field or `<video controls>`), Enter clicks it and Space clicks it on the way up,
through the element's own `click()` so Click Bubbling and the rest apply unchanged. A key something else already
cancelled is left to it (a Draggable keeps Space: `drag-drop.ts` runs first, capture phase); a key on a field inside the
element is the field's. Taking the last wire off gives back only what was added. Kept in step by the Click output's
first/last-connection hooks (a wire made while the preview runs, no repaint) and by `setDOMElement` (a new element).
The controls' focus ring (`[data-ndl-keyboard-click]:focus-visible`, `--ring`). One shared Click, so Group, Text,
Image, Circle and Video all have it.

Found on the way: **`defineNode` dropped a SIGNAL output's `onFirstConnectionAdded` / `onLastConnectionRemoved`**
(`nodedefinition.ts`, the signal branch registered a bare getter); a value output kept them. No signal declared one
before, so nothing else moves.

Graded: `tests/two003-groupkeyboard.test.tsx` 17/17 on real Text and Image nodes (corpus harness, the runtime's own
`connectInput`, React into jsdom, real `KeyboardEvent`s); seven mutants each red on their own row (no sync on a new
element 6 red; signal hooks dropped 2; own role overwritten 1; `defaultPrevented` ignored 1; key target ignored 1;
native treated as plain 1; Space on keydown 1). Not graded here: the ring painting and the Tab order (a browser reading).

Left: **a card that is a button with a Button inside it** is "nested interactive" (axe `nested-interactive`): both
are reachable, but some screen readers read the inner one poorly. The marketplace's Button-over-name workaround has the
same shape. A build-time note is the candidate if it matters. The node specs model no wired Click (the conformance
harness intercepts signals, it wires nothing), so they still say a Group takes the keyboard only when Draggable.

**The "Left" above, ruled and built (2026-10-27): P121-TWO003-NESTEDBUTTON (01554fe3e).** Richard ruled "inner
controls win": an element whose Click is wired is not made a button while it holds a control or another Tab stop, and
a validator info (`click-area-holds-a-control`) tells the maker. On the way, a Click wired only into a component output
the placement never uses no longer counts (rocket-school's "The face" picture was a dead Tab stop).
