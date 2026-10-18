---
id: P121-TWO003-SCROLLINTOVIEW
title: A row that scrolls natively can't bring one of its children into view — Scroll To Index and Scroll To Element exist only on the non-native scroller
status: open
severity: low
area: runtime / Group (`packages/nodegx-node-spec/src/nodes/group.ts` :291-296, the `scrollToElement.*` and `scrollToIndex.*` ports' `when`: `scrollEnabled === true && nativeScroll === false`)
found: P121 TWO-003 s8, 2026-10-15
evidence: dev-docs/tasks/phase-121-a-marketplace-and-a-community/TWO-003-THE-SHOP.md §11.6
---

The marketplace's admin has six tabs (Sellers, Orders, Enquiries, Ways to pay, Rates, Shelves). On a 390 px phone they
are wider than the screen, so the bar scrolls sideways, and on the Rates or Shelves page that page's own tab starts
off screen. The usual answer is a scrolling tab bar that brings the current tab into view.

Group offers **Scroll To Index** and **Scroll To Element**, but only when Scroll is on and Native Platform Scroll is
**off** (read from the node spec's `when` clauses, 2026-10-15; not run). The non-native scroller is the one with open
layout defects (P107-C152 drops its gap, P107-C153 clips nothing, P109-S37-ISCROLLALIGN loses its alignment), and a tab
bar on a tablet doesn't scroll at all. A row that scrolls with the browser's own scrolling, the one a phone user
expects, has no node or port to say "show this child".

The template does it in the tabs' Function script instead: it finds the current tab in the DOM and sets its bar's
`scrollLeft` (`two003Admin.ts` `TABS_LOOK`, `bringIntoView`, retried every 100 ms until the tab is drawn). Driven at
390 px: the Shelves page's tab is on screen (`two-003-enquire-drive.test.ts`). It works, but it is DOM code in a
template, the kind a builder can't be expected to write.

Fix, proposed: offer Scroll To Index / Scroll To Element with native scrolling too (`element.scrollIntoView({ block:
'nearest', inline: 'center' })` on the child, scoped to that Group so the page itself doesn't move), or a "Keep in
view" input on a child.
