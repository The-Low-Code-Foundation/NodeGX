---
id: NPMAUDIT-LICENCE-FOOTER
title: Every nodegx.io page's footer still says "Licensed GPL-3.0", against the ruled split
status: fixed
commit: "nodegx-web c972cda, deployed 2026-11-11"
severity: low
area: nodegx.io / licences
found: Beta sprint S6, 2026-11-07, checking that NPMAUDIT-LICENCE's line is live
evidence: curl -s https://nodegx.io/ | grep -o '[^<>]*GPL[^<>]*'
launch: beta
---

NPMAUDIT-LICENCE's line is live on the homepage. Measured 2026-11-07: `curl -s https://nodegx.io/` is byte-identical
to nodegx-web `site/index.html` (md5 `ea020f89…`, last-modified 2026-11-04 09:39 GMT), and its Source card says "The
tools are open source under GPL-3.0. The runtime your app runs on is MIT. The app itself is yours." (nodegx-web
290a7ba). The line holds no "licen", so a `grep -i licen` reports it missing.

What still says otherwise: the footer every page shares, from nodegx-web `ops/build.py` line 176 (FOOTER), live on /,
/studio/ and the rest: "NodeGX is maintained by The Low Code Foundation. Licensed GPL-3.0, a fork of Noodl." Richard's
2026-10-23 ruling is to state the split everywhere it ships. A reader who only sees the footer reads the runtime as GPL.

Proposed (not made): the footer's second sentence becomes the homepage's ruled wording, for example "The tools are
GPL-3.0, the runtime your app runs on is MIT, and NodeGX is a fork of Noodl." It is copy, so Richard's call, and the
change re-renders every page's `index.html`, including `site/start/index.html` and `site/changelog/index.html`, which
another session holds uncommitted edits to. Make it when that tree is clean, then rsync every page (or run
`ops/deploy.sh`, which is only safe from a clean tree that also carries the untracked live sections).

/studio/'s "NodeGX Studio is … licensed GPL-3.0" is right as it stands: Studio is one of the tools.

## 2026-11-07: built on Richard's yes (nodegx-web c972cda, on main, NOT deployed)

Richard: "Licence: Sure change it". `ops/build.py` FOOTER now reads "NodeGX is a fork of Noodl, maintained by The Low
Code Foundation. The tools are open source under GPL-3.0. The runtime your app runs on is MIT." (the homepage's ruled
words; the offline `written closer contract opener` checks clean, `written` fires on a control). Rendered and committed:
13 pages whose only change is the footer (3 lines each). Left to their next render: /start/ and /changelog/ (another
session's uncommitted edits sit in both). Left: the deploy, Richard's — the 13 pages by rsync, or `ops/deploy.sh` once
that tree is clean. The render also adds /help/ to `sitemap.xml` (the live one lacks it); not committed here.

## 2026-11-11: live

Deployed with `ops/deploy.sh` from a copy of nodegx-web's tree without the uncommitted `site/companies/` page and its
homepage card (co-pitch: not to go out without Richard). Before the push every built page was diffed against the live
one: only the footer moved (3 lines a page) and the changelog gained 0.2.12. After: remote `index.html` md5 =
local, both neighbours 200; `curl -s https://nodegx.io/` and `/start/` say "The tools are open source under GPL-3.0.
The runtime your app runs on is MIT."; /companies/ still 404.
