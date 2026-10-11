---
id: P109-S46-SITETITLERELAY
title: The site builder names a page's tab through a JavaScript relay, and its gate forbids the wire that now works
status: open
severity: low
area: templates / site builder (SB-006, `packages/noodl-mcp/tests/sb006Components.ts` node `seo`)
found: P109 s46, 2026-10-11 (fixing P109-S45-WIREDTITLE: every place that worked around it)
evidence: packages/noodl-mcp/tests/sb006Components.ts :2648-2662 (the relay); packages/noodl-mcp/tests/sb006PublicSite.test.ts `assertSeoSplit` :405-420 (pins "wires into Page.title: 0" and requires the relay)
---

The site builder's public page names its browser tab with a JavaScript node (`seo`, "The document title") that calls
`Noodl.SEO.setTitle(Inputs.title)`, fed from the record's title. Its comment gives the reason: the Router set the tab
from the exported router index and never from the Page node's Title input.

That reason is gone. Since P109-S45-WIREDTITLE the Router names the tab from the Page node's current Title, a wired one
included, and follows it when it changes (drive: `packages/noodl-mcp/tests/p109WiredPageTitle.test.ts`, 7/7). The
training template dropped its eleven relays for wires in the same session (P109-S11-DBTPAGETITLES).

What is left here is a workaround a person reads as the way to do it, and a gate that would refuse the right shape:
`assertSeoSplit` requires the relay and fails on any wire into `Page.title`.

**Proposed (small, owned by the site builder's phase):** wire `readPage.out-title` into the Page's `title`, delete the
`seo` node, and change `assertSeoSplit` to require the wire. Check the SSR render keeps its title: the Router's call
runs on the server too (`Noodl.SEO` is the server's buffer there), but this page's SSR drive has not been run against it.
