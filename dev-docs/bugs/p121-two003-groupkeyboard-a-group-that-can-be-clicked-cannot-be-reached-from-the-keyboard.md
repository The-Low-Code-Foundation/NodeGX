---
id: P121-TWO003-GROUPKEYBOARD
title: A Group (or Text, or Image) that answers a click can't be reached from the keyboard, so a whole card that opens something works only with a pointer
status: open
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
