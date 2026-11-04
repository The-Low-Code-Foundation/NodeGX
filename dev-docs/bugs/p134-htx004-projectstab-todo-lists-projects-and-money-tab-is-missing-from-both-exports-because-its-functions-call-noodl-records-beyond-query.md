---
id: P134-HTX004-PROJECTSTAB
title: "export: todo-list's Projects and money tab is missing from both exports, because its Functions call Noodl.Records beyond query"
status: open
severity: medium
area: the export plan's Function reader (`packages/nodegx-export/src/analyze/plan.ts`, the Noodl object a Function may read, EXP-020) and the client both exports print (`src/lib/noodl.ts` in React, `lib/noodl.js` in HTML)
found: P134 HTX-004 session 7, 2026-11-04, the Chrome drive of todo-list on three fresh backends
evidence: dev-docs/tasks/phase-134-the-app-in-plain-files/htx-004/side-by-side.png (D3 and D4: the running app's "Also keep track of projects and money" under the list; neither export has it)
kit: export
---

Signed in at phone width, the running app shows "Also keep track of projects and money" under the list, the way into
the Projects and money tab. The React export and the HTML export do not show it, and nothing in them opens the tab.

Why: the link is authored Mounted false and mounted by `/Logic/Projects`' `showTurnOn`. That output is not lifted
because its Function, "Read the projects and the money", reads `Noodl.Records`, and the plan refuses any Function
whose script reaches past what the export's Noodl object carries (`Records.query`, `CloudFunctions.run`,
`Users.Current`, `Files.sign`, `Variables`). Every write on the tab is refused the same way: Add project, Save project,
Move project, Save money item, End money item, Mark money, Record balance, Save next move, Set task project.

Reach, counted on the React report over every template: 130 lines, all in todo-list (68) and todo-list-demo (62). No
other template's Function reads `Noodl.Records` beyond `query`.

Fix: carry the rest of `Noodl.Records` that these scripts call in the client (written out in full they call `save` 3
times, `create` once and `query` once; the rest go through a local name for `Noodl.Records`, so read them first)
both exports share, then let the plan pass those Functions. Grade with HTX-004's drive and a step that opens the tab.
