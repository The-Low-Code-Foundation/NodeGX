---
id: P18-S110-ROUTERSELF
title: A Router's own Background Color, Clip, CSS class, Style, Mounted and URL Path vanish from the export
status: fixed
commit: (s112)
regression: packages/nodegx-export/tests/the-router-itself.test.ts
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

**Fixed, session 112: one carried, five said.** Counted first: of 227 Routers in the fixtures, the templates and the test
projects, one authors any of the six with a value that does anything (a Mistral-built `capital-quiz`, Background Color
`var(--background)`). So a wrapper element, which would move every exported page's layout and needed a render, was
not built. **Url Path is carried**: `routedPages` puts the runtime's `_trimUrlPart(urlPath) + '/'` in front of every
page, so the route table and every exported `navigate(…)` wear it (blank is none, see P18-S112-BLANKURLPATH). **Mounted**
unticked or wired, a wired Url Path, and the four style ports are **said**, one sentence each in the app notes and the
report (`emit/scaffold.ts` `routerNotes`); the style sentence names every authored port, and a value that paints
nothing (`transparent`, `contentHeight`, blank, the comment-only CSS Style default) leaves the export byte-identical.
Graded: `tests/the-router-itself.test.ts` (24). Mutant controls: dropping the prefix turns exactly the 2 predicted
cases red; emptying the notes, exactly the 12 predicted. HLS-001 did not move.
