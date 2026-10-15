---
id: P18-S112-BLANKURLPATH
title: A Router whose Url Path is blank ('') matches no URL, including the ones it pushes itself
status: open
severity: low
area: runtime / Router
found: P18 session 112, 2026-10-15, reading router.tsx for P18-S110-ROUTERSELF, then measured
evidence: the nda-012 harness (tests/corpus/nda-012-page-router-path-and-reset.test.ts makeRouter({ useRealMatch, urlPath })), one page `home`, hash routing — urlPath undefined: #/home matches Home, pushes #/home; urlPath 'shop': #/shop/home matches, pushes #/shop/home; urlPath '': #/home, #//home and #/ all match nothing, and it pushes #/home. Corpus: 1 Router of 227 saves urlPath '' (NodeGX test projects/test/project.json)
---

An author types a Url Path into a Router and then clears it. The editor saves `''`, and the setter keeps it: P107-C116
made `null` mean none (`router.tsx` `urlPath.set`), but `''` is not `null`. From then on every page pattern is
`_trimUrlPart('') + '/' + pattern`, i.e. `/home`, which splits to `['', 'home']`; the location `#/home` splits to
`['home']`, and `_matchPathParts` compares `''` with `'home'` and gives up. The URL the Router pushes for that page is
`#/home` (`getNavigationAbsoluteURL` drops the doubled slash), so in-app navigation looks right and a reload, a shared
link or the browser's back button lands on whatever an unmatched URL shows.

Fix (runtime, small): treat a blank Url Path as none in the setter, as `null` already is, and in the node spec
(`nodegx-node-spec/src/nodes/page-router.ts` `init` and the `urlPath` input, whose examples list `''`). The export
already reads blank as none (`emit/scaffold.ts` `routerPrefix`, pinned by `tests/the-router-itself.test.ts`
"blank is none").
