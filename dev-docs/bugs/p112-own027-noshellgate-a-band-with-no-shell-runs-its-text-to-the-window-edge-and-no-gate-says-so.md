---
id: P112-OWN027-NOSHELLGATE
title: A band with no shell runs its text and photos to the window edge, and neither the validator nor render_report says so
status: fixed
severity: medium
area: mcp / validate + render_report (nodegx-render-measure)
found: P112 OWN-027 arm T r1+r2, 2026-10-28
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-027/runs/T/r1/RESULT.md, runs/T/r2/ledger.json (render, rejections), runs/T/r2/shots/pages-home-desktop.png
kit: mcp
phase: P112 OWN-028
commit: a475b0683
regression: packages/noodl-editor/tests-unit/p112-own028-gates/bandWithoutShell.test.ts "fires on r2's hero (a section root holding its words directly), naming what sits outside"
---

What a person sees: a landing page whose body text starts at x = 0 of a 1280 px window, and whose photos are
full-bleed strips in every section. It reads as nobody's design. r2 of OWN-027 (Gemma 4 E2B) built 7 sections and
r1 built 6. **None of the 13 had a shell**, and both pages came back from `stage_plan_operation`, `apply_plan` and
`render_report` with no finding that names the cause:

- the validator: r2 0 errors, 0 warnings;
- render_report: `elements-overflowing` (a Columns in a full-bleed band is 48 px wider than the window, clipped)
  and `alignment-drift`, but nothing about text touching the viewport edge. `text-against-edge`
  (`packages/nodegx-render-measure/src/index.js:626`) only measures text inside an outlined or filled frame.

The rule exists only as prose, in the `band` composition's description (`get_style_vocabulary`): *"a band always
holds exactly one shell, and a band whose content is not inside one runs edge to edge"*. A strong model reads it.
A 2B model building the tree does not see it, because that call is about node types, not looks. Prose advises,
gates bind (DIRECTION §0 pillar 2), and this one has no gate.

Reproduce: `node dev-docs/tasks/phase-112-your-own-nodegx/own-027/harness.mjs --run x --tuning tuning1.json` (Ollama +
gemma4:e2b-it-qat), or by hand: a page whose section root Group (width 100%) holds a Text directly.

Proposed fix (small): a render_report finding `text-at-viewport-edge`: a Text whose box starts within ~8 px of the
viewport's left edge at desktop width, in a band that is not a full-bleed image. Plus a validator warning
`band-without-shell`: a Group carrying the band/bandSurface/heroGround/ctaBand/footerBand parameter signature
whose children include anything but one Group with a maxWidth.

Fixed (OWN-028 AC3): validator warning `band-without-shell` (`rules/bandWithoutShell.ts`, in `ALL_RULES`) and render_report `text-at-viewport-edge` (desktop, words' ink within 8 px of the window edge). Calibrated: the rule fires on 7/7 sections of own-027-T-r2 and 6/6 of r1, 0 on own-027-C, 0 on the 17 templates, 22 hits over 34 local projects (all no-shell bands). The render finding names 12 texts at x = 0 on r2 and is silent on C. Render regression: `packages/nodegx-render-measure/tests/own028Gates.test.js`.
