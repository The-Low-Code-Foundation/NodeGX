---
id: P112-OWN030-PRIMARYCONTRAST
title: A green or warm primary at its 600 shade puts every button's white label at 3.2–3.3:1, and no tool checks the pair; set_project_tokens' own example teaches the 600
status: open
severity: medium
area: mcp / set_project_tokens (description) + validate_project / render_report (no contrast check anywhere)
found: P112 OWN-030 lanes, 2026-10-29 (look checks, both graph and emit)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-030/runs/graph-running/look/checks.json (13 texts at 3.30, desktop and phone), runs/graph-bakery/look/checks.json (9 texts); the same counts in runs/emit-running and runs/emit-bakery, which share the token sheet
kit: mcp
phase: P112 OWN-030
---

What a person sees: on the running-club page ("Energetic, green.") every button label ("RUN NOW", "Sign Up Today",
"Submit Your Details") is white on green-600, and the green accent lines on white are green-600 on white. Both read at
3.30:1, under WCAG AA's 4.5 for text this size. The bakery page (warm, amber-600) is at 3.19:1 the same way.

Measured (WCAG relative luminance, white against the shade): blue-600 5.17, purple-600 5.38, gray-900 17.74 pass;
green-600 3.30 and amber-600 3.19 fail; green-700 and amber-700 both 5.02 pass.

What the agent wrote: `--primary: var(--green-600)` with the kit's default `--primary-foreground: #ffffff`. The OWN-029
harness picks the 600 of every hue (agent.mjs, `set_project_tokens`), and `set_project_tokens`' description teaches the
same shade: 'a reference to another token ("var(--blue-600)")'. That example passes for blue and fails for green and
amber, so an agent that follows it with another hue gets a failing pair.

Not seen by: set_project_tokens, validate_project, render_report. The kit has no contrast check of any kind.

Fix candidates: a contrast finding on the `--primary` / `--primary-foreground` pair (and `--primary` on
`--background`) in validate_project or as a set_project_tokens warning, naming the darker shade that passes; and the
description's example made hue-neutral, or saying "the 700 for green and warm".

**Seen again, 2026-10-29 (OWN-032 s3, `runs/arm-w9s-bakery`):** a stylish hero on the bakery theme puts white words
on `--gradient-spotlight`. Its bright end is the primary, so the small line, the sentence and the button all measure
3.16–3.19. That is the same pair from the other side: white on amber-600. The arm cannot reach it (no token is on its
menu), so a 2B builder spent 15 turns making settings that changed nothing. The same fix covers both: a darker
primary, or a contrast finding on the primary pair.

**Seen again, 2026-10-29 (OWN-032 s4, `runs/arm-w14m-running`, `runs/arm-w14s-running`, held out):**
- the green running theme gives the same pair at 3.30 in both looks: the minimal button ("Run Now", white on green),
  and in the stylish hero the small line, the sentence and the white pill's green words;
- the bench reads a gradient by its worst stop, so the sentence's 3.30 is cautious: it sits over the gradient's dark
  end. The small line really sits on the bright green.

That makes two of six briefs (bakery and running, in both looks) where the arm ends with only this open.
