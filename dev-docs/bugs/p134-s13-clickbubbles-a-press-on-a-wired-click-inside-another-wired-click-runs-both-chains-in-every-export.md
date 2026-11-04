---
id: P134-S13-CLICKBUBBLES
title: "export: a press on an element whose Click is wired, inside another whose Click is wired, runs both chains in the React and HTML exports, where the running app stops the click at the first (FH-015 slice 2, Click Bubbling \"auto\"), so planning's Save on the block sheet also runs the sheet's backdrop close"
status: open
severity: medium
area: export / the React printer's `onClick` (`packages/nodegx-export/src/emit/component.ts`), copied by the HTML printer (`src/emit/html/printComponent.ts` `listenFor`); neither reads `clickBubbling` or the runtime's rule (`packages/noodl-viewer-react/src/pointerlisteners.ts` `stopsClickPropagation`)
found: P134 session 13, 2026-11-04, grading Close Popup on landing-pages' CaseStudy in jsdom
evidence: packages/nodegx-export/tests/html-a-drag.test.ts §E E1 (three calls of onClose for two presses, pinned as React's)
---

The running app stops a click where it is used: with Click Bubbling on its default ("auto"), an element whose Click port is
wired calls `stopPropagation` after its handler, so an ancestor's Click does not run too ("never" always stops, "always"
never does; `stopsClickPropagation`, FH-015 slice 2). Neither export carries this. The React export prints
`onClick={() => …}` with no stop, and the HTML export a `click` listener with none, so a press runs its own chain and then
every wired ancestor's.

Measured on landing-pages' CaseStudy, mounted alone in jsdom with an `onClose` handed to it: a press on Close calls
`onClose('close')` twice (its own, then "Over the page", the backdrop holding the panel), and a press on the backdrop
once. The React export's JSX has the same shape (`<div onClick={() => onClose?.('close')}>` around the button), so it
calls twice too. Both exports agree with each other; the running app calls once.

Reach, counted on 2026-11-04 (a wired Click inside an ancestor with a wired Click, the ancestor's Click Bubbling not
"always"): 45 across the templates, HiveClip 0. planning 20 and planning-demo 20 (the block sheet: Save, "Open its task in
the todo list" and "Close the sheet" sit inside "Behind the sheet", whose Click closes the sheet, so in both exports a Save
also runs the close chain), marketplace 4 (a seller's name inside its card, a way to pay inside its row, a product's name
inside its card), landing-pages 1 (CaseStudy's Close). Not counted: a Click Bubbling "never" with no wired Click (it stops
in the app, and bubbles in both exports).

Fix, shared by React and HTML (and Swift, where a tap has its own rule): the plan says, per node with a wired Click,
whether the runtime would stop the click (the node's `clickBubbling`, else "auto" = stop); each printer adds the stop after
the handler (React `event.stopPropagation()`, HTML the listener's `event.stopPropagation()`). The React lane is paused
(BOARD §2), so it waits for the order: do both together, or an HTML-only fix that the desks would then grade as a
difference from React.
