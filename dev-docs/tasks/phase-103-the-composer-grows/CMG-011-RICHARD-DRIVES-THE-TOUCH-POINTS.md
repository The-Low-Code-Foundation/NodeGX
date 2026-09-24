# CMG-011 — Richard drives the touch points

**Opened 2026-09-24.** Depends on CMG-001…010.
**Status: 📋 READY TO DRIVE (s2, 2026-09-24)** — CMG-001…010 are built and committed. AC1 is Richard's; AC3 ✅ ruled.

## 1. The person sentence

README §1's second sentence:

> **Someone manages their styles from one place. From any node they can reach the style it
> wears, and from any style they can reach the nodes that wear it and change it. Nothing they
> press loses work they cannot see or get back.**

## 2. The drive

On a **copy** of one of his projects ([[open-a-copy-of-a-real-project-in-the-editor]]). Use
*Landing page test V2*, whose 142 stored tokens (46 real changes) are the finding-7 fixture.
**The copy (s2):** `NodeGX test projects/CMG-011 Richard Drive` (`cp -R` of *Landing page test V2*, `name` renamed; 142
overrides, `--primary` `#c2410c`; the original's `nodegx.project.json` SHA unchanged). It is first in the launcher list.
Without Show CSS:

1. Open the easing composer at the bottom of the window and press Show CSS (CMG-001).
2. Add a spacing token and a shadow token; copy one and paste it into a field (CMG-002).
3. Make a new colour and pick it straight away; change an old colour style's colour (CMG-003).
4. Read what the *N tokens changed* count means, reset one token, then one section; read the
   confirm before a multi-token reset and cancel it (CMG-004).
5. Find Typography and Motion without opening anything called *Other* (CMG-005).
6. Save a Look from a Group, deselect, and edit the Look from Styles. Then, from a node wearing
   it, *Show in Styles* (CMG-006).
7. Open the Look popup, a context menu and the composer in light mode (CMG-007).
8. Change the alignment, one padding side and one corner of a Group wearing a Look, and put each
   back (CMG-008).
9. Read the padding of a Group wearing a spacing token without hovering; pick a token on padding
   without being told where the button is (CMG-009).
10. From a Group's shadow token: edit it in place, then *Show in Styles*; from the token's row,
    *Used by* back to the Group (CMG-010).

Then re-read README §2's touch-point table on what he drove.

## 3. Acceptance criteria

1. 🔴 **Richard rules WORTHY or NOT WORTHY.** Every other task can be green while managing styles
   is still, in his words, *"a nightmare"* ([[correct-and-usable-were-never-the-same-criterion]]).
2. Whatever he finds is written below as rows, **before** anything is fixed.
3. ✅ RC-8 (does 0.3.0 wait on this?) — **ruled s2: *"Wait for my drive."*** 0.3.0 waits on AC1 (README §4).

## 4. Rows

| # | Found by | What | Status |
|---|---|---|---|
| 1 | Richard, s2 | *"In dark mode, the values of the input fields in the styles tab are light grey on a white background."* Measured: all **83** token value inputs (`TokenCategorySection`, the text box the nine non-composer types edit in) painted `rgb(196,206,219)` on their own `rgb(255,255,255)`, the only class on screen that did. `.TokenValue` was written for a span; P102 (`dee6e5ab8`) put it on an `<input>`, which kept the browser's white box | ✅ **FIXED s2** — `input.TokenValue` is transparent with a transparent border at rest (reads as text on the row), a border on hover, and `bg-1` + `fg-default` + a `primary` border on focus. Re-measured: `rgb(196,206,219)` on the row's `rgb(46,44,54)` at rest; `rgb(221,228,236)` on `rgb(35,33,41)`, border `rgb(77,163,255)` focused. Richard, on the result: *"it looks kind of cool, you have to click on the value to open the input"* — kept that way, same in light mode. (Not done: the value text starts 5px right of the token name — padding + border; he did not ask) |
