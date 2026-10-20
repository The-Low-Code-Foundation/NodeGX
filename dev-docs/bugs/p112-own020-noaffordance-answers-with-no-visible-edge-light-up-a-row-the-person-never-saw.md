---
id: P112-OWN020-NOAFFORDANCE
title: "Quiz answers drawn with no border or fill look like plain text until tapped, then a whole green row appears that the person never saw; the kit doesn't teach that a tap target must look tappable, and render_report doesn't measure it"
status: open
phase: P112
task: OWN-020
severity: low
area: kit — style guidance and render_report (a pressable with no visible boundary)
found: P112 OWN-020 s1, 2026-10-16 (Richard on CMQ1, MiMo-V2.6 Pro in Cline: "the answers don't have any outline … it makes it weird when you click them and the whole row turns green when you didn't see that there even was a row to begin with")
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-020-THREE-HARNESSES.md §12 (CMQ1); CMQ1 in the OWN-020 gallery
kit: core
---

What a person sees: the three answers read as plain lines of text. Tapping one turns a full-width green (or red)
band on, the first sign that each answer was a button.

The model's choice, not a runtime defect: the answers are pressable Groups with no border and a background equal to
the page's. The quiz grader can't see it (taps land; colours change correctly).

Fix (kit): the style guidance says a tap target needs a visible boundary (border, fill or shadow) before it's tapped;
render_report gains a finding for a pressable element whose box is indistinguishable from its parent's background
with no border. Cheap, and it helps every agent.
