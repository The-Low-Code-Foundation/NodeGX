---
id: P132-CREATEWFCALLSONLY
title: The MCP's create_backend_workflow says every step "invokes a cloud function in v1", eleven step kinds after it stopped being true
status: fixed
phase: P132
severity: low
area: noodl-mcp / create_backend_workflow description
found: BWF-013 AC3's preparation, 2026-11-04 (s20), reading the tool an agent writes a reusable piece with
evidence: packages/noodl-mcp/tests/p132-bwf013-pieces.test.ts (the pieces list the new sentence points at); the description itself in src/tools/backendTools.ts
launch: beta
commit: (this session's NodeGX commit)
---

The tool an agent writes a workflow with described a workflow as "a DAG of steps (each step invokes a cloud function in
v1)". The backend has served steps that run no function since CF11 (branch, transform, filter…) and P132 added record
steps, Call an API, Send an email and Run a workflow. An agent told this would reach for a cloud function to share
steps between workflows, when the product's answer is a reusable piece run with `run-workflow` (R6).

Fixed: the sentence now says each step is one of the kinds `list_backend_step_kinds` serves, and that steps wanted in
two workflows go in ONE workflow of their own, run from each with `run-workflow`, pointing at
`list_backend_workflows`' new `pieces`. Wording only, no gate grades it; the AC3 agent round is what reads it.
