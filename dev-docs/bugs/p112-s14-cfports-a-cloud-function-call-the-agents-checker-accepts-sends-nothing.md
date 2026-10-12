---
id: P112-S14-CFPORTS
title: "A Call Cloud Function wired the way the published example and the agent's checker accept sends no parameters and returns no result — the runtime's ports are `in-<param>` / `out-<param>`"
status: open
severity: high
area: mcp / validation of `CloudFunction2` ports (no derivation from the project's `#__cloud__` component; instance-declared `ports` accepted); catalog example `docs/node-catalog/examples/fn-cloud-function-roundtrip.json` (P107-S89-CFEXAMPLES); runtime `packages/noodl-viewer-react/src/nodes/std-library/data/cloudfunction2.ts` `registerInputIfNeeded` / `registerOutputIfNeeded` :219-248
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
---

OWN-015's second stranger round built `PhraseRow` with a `CloudFunction2` calling `Functions/Speak`, whose Request
declares `text` and whose Response declares `audioDataUrl`. The agent:

1. wired `Component Inputs.french → call_speak.text`, and the checker refused it: *"CloudFunction2 has no input named
   "text". → available: call"*. The checker doesn't derive the call's ports from the cloud component it names.
2. re-staged with a `ports` array on the node instance (`text` input, `audioDataUrl` output). The checker accepted it,
   `validate_project` reported 0 errors, and it was applied.

In the page (npm preview, the backend up, the function deployed) the runtime logs, once per row:
*"Invalid connection, input doesn't exist. Trying to connect from Component Inputs output french to CloudFunction2
input text"* and *"Node CloudFunction2 doesn't have a port named audioDataUrl"*. `CloudFunction2` registers only
`in-<param>` (sent as the body) and `out-<param>` (read from the result). So the call goes out with no `text`, and
nothing reads the audio.

The published example the agent fetched (`get_example fn-cloud-function-roundtrip`) wires the call as `a`, `b`, `sum`,
the same wrong shape. It's already filed as P107-S89-CFEXAMPLES (low, *"catalog:examples is red"*), but that is the
same defect seen from the catalog. Seen from the person, every cloud function an agent wires from that example fails
silently.

**Fix, in order of reach:**
1. The checker derives a `CloudFunction2`'s ports from the named `#__cloud__` component (Request `params` →
   `in-<p>`, Response `params` → `out-<p>`), as the editor does. It suggests them in the refusal ("did you mean
   `in-text`?"), and refuses an instance `ports` declaration that names a port the runtime won't register.
2. The two examples wire `in-a`, `in-b`, `out-sum` (and `out-taskCount`).
3. `get_node_type CloudFunction2` says the prefix rule in one sentence.
