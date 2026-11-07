---
id: NPMAUDIT-LICENCE-FOOTER
title: Every nodegx.io page's footer still says "Licensed GPL-3.0", against the ruled split
status: open
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
