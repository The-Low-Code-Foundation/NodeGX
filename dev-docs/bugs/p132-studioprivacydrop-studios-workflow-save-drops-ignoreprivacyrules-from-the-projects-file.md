---
id: P132-STUDIOPRIVACYDROP
title: Studio's workflow save writes the project's file without the workflow's ignorePrivacyRules, so a workflow set to obey privacy rules is back to ignoring them on any backend made from the file
status: open
phase: P132
task: BWF-008
severity: medium
area: nodegx-studio / editor/serve.mjs projectWorkflow (the file's shape of a saved workflow)
found: comparing the three writers of nodegx.automations.json for BWF-008 item 2, 2026-11-03 (s9); read, not driven
evidence: nodegx-studio editor/serve.mjs `const projectWorkflow = (w) => …{ id, name, entry, concurrency, timeoutMs, stepTimeoutMs, steps }`; nodegx-backend src/automations/shape.ts projectWorkflow keeps ignorePrivacyRules (R5, BWF-005)
launch: beta
---

R5 (2026-11-03) made *Ignore privacy rules* a per-workflow switch, on by default. The backend's and the MCP's
`projectWorkflow` keep the field; Studio's own copy in `serve.mjs` was written before R5 and lists the fields by name,
so a Studio save of a workflow an agent set to `ignorePrivacyRules: false` puts it in the file without the field. The
running backend keeps `false` (the PUT carried it), so nothing shows until a backend is made from the file (a fresh
copy, a deploy, a VM): there the default applies and the workflow reads and writes as the app again. Privacy rules
are on the Beta walk. The fix is one field in `serve.mjs` `projectWorkflow` and a line in `check:automations`;
the NodeGX editor's writer (`project-automations.js`, s9) keeps it.
