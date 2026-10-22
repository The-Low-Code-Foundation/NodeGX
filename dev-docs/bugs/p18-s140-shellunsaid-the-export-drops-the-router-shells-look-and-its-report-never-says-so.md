---
id: P18-S140-SHELLUNSAID
title: The export drops everything beside the Router in the app shell (the page ground, the app-wide CSS) and its report never says so
status: open
severity: medium
area: export / the router shell (`packages/nodegx-export/src/analyze/plan.ts` `routerShellDisposition`; `src/emit/report.ts`, a `scaffolded` component's `refusals`)
found: P18 session 140, 2026-10-22, driving rocket-school's Lists page (EXP-021 AC4) — the runtime's page is beige, the export's white
evidence: dev-docs/tasks/phase-18-code-export-v2/s140-lists-drive/ (`shell.cts`, `shell.out`, `shot-L1-runtime.png` beside `shot-L1-export-fixed.png`)
---

Every template's `App` component is the router shell: a root Group, the Router, and usually a CSS Definition that holds
what a port cannot say (rocket-school's "The page ground and the pointer": `html, body { background: var(--background) }`,
the press and hover motion, the pointer cursor; todo-list's dark palette and which theme icon shows). The export writes
`src/App.tsx` from the Router alone. Every other node in the shell is refused as "node beside the router shell", so the
exported app opens on a white page with no press, hover or dark mode.

The refusal is recorded in the plan and carried on the shell's report row. The report never prints it: a `scaffolded`
component appears only under "Handled by the app shell", whose line is the skip reason. The headline count includes the
refusals, but no line names them. The report's promise ("where it did not, it refused and said so above") does not hold
for the shell.

**Reach** (`shell.cts`, the tree's export): 77 nodes beside the router shell in 16 templates, 15 of them whole CSS
Definitions. 13 of the 16 reports never say the sentence. digital-bricks-training, its demo and nightbook say it 23 times
in all, for 46 refusals. s137 counted the same 77 and wrote "the report says so". That was wrong: its own todo-list
report does not.

**What a fix needs:** first, the report names each refused shell node under "What needs your attention", like any
refused node, with its label. That is the honest floor and is cheap. Then the translation itself: a CSS Definition's
sheet is already emitted for page components, so the shell's sheet could ride into `base.css` or `App.tsx`. A root
Group's style could become `App.tsx`'s wrapper (the shell's `backgroundColor`, 14 templates). A Function beside the
Router ("Put back the theme the person chose") is a mounted run in `App.tsx`.
