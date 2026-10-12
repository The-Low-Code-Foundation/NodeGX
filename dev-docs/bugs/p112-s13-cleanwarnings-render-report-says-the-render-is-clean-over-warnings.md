---
id: P112-S13-CLEANWARNINGS
title: "`render_report`'s first line says \"the render is clean\" over a page that cannot lay out at phone width"
status: fixed
severity: medium
area: MCP / render verdict (`packages/noodl-mcp/src/renderVerdict.ts` `verdictFor`)
kit: mcp
regression: packages/noodl-mcp/tests/vib007PovertyFindings.test.ts "never says \"clean\" over a warning that is not a tell (P112-S13-CLEANWARNINGS)"
found: P112 OWN-014 s13, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-014-THE-AGENT-SEES-ITS-APP.md §7
---

**What an agent reads.** OWN-014 AC2 planted a 3000px-wide Text on a phone page, in a project made by an npm install.
`render_report` measured it exactly: `minimum-layout-width` (*"The page cannot lay out below 1560px … div.ndl-visual-text
at 3000px"*) and `text-wider-than-its-box`, with a summary of *"0 errors, 2 warnings"*. But the first line, the one
sentence an agent reads, was **"DONE — Rendered, and the render is clean."**

**Why.** `verdictFor` already treats done and clean as two claims for the poverty tells (VIB-007 M3: *"Saying only the
first is what every gate in the product did"*). Every other warning fell through to the clean sentence. Warnings don't
block, by design (VIB-007 M1), and that stays: `done` is still true.

**Fix.** A done verdict with non-tell warnings names them (*"Rendered, and nothing is broken — but it warns:
minimum-layout-width, text-wider-than-its-box. Nothing here blocks; read the warnings before calling it finished."*).
With tells as well, both are named. The clean sentence is kept for a page with neither (the WORTHY control still says
it).
