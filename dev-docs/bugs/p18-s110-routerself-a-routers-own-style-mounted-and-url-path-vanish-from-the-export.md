---
id: P18-S110-ROUTERSELF
title: A Router's own Background Color, Clip, CSS class, Style, Mounted and URL Path vanish from the export
status: open
severity: medium
area: export / Router
found: P18 EXP-008 per-parameter check, session 110, 2026-10-15
evidence: packages/nodegx-export/parameter-ledger.json (measured silent by tests/parameter-coverage.test.ts); a hand-built translated context in session 110 scratch emitted byte-identical files and notes; ports: Router.backgroundColor, clip, cssClassName, styleCss, mounted, urlPath
---

An author gives the Router a background colour, a CSS class or inline style, turns Clip on, unticks Mounted, or sets a URL Path
prefix. The exported app ignores all six and says nothing.

Why: the export collapses the Router into `App.tsx` (`plan.ts` routerShellDisposition, ~:4626; `emit/scaffold.ts` :298-326),
so there is no element to carry the style the runtime draws (`router.tsx` :234-274; `react-component-node.ts` :1380-1402).
Mounted false keeps the runtime's Router out of the tree (blank app; `react-component-node.ts` :2373); the export still routes
every page. URL Path prefixes every page path in the runtime (`router.tsx` :729, :871-872); `routedPages`
(`emit/scaffold.ts` :111-135) builds `/<page urlPath>` only, so exported URLs and deep links differ.

Fix: a wrapper element for the authored style / class / clip (or a note per authored one), Mounted false refused by name, and
the prefix carried into the route table. The parameter ledger moves six rows out of `silent` when this lands.
