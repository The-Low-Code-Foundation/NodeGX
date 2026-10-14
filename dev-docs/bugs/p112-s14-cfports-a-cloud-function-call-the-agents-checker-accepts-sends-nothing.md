---
id: P112-S14-CFPORTS
title: "A Call Cloud Function wired the way the published example and the agent's checker accept sends no parameters and returns no result — the runtime's ports are `in-<param>` / `out-<param>`"
status: fixed
severity: high
area: mcp / validation of `CloudFunction2` ports (no derivation from the project's `#__cloud__` component; instance-declared `ports` accepted); catalog example `docs/node-catalog/examples/fn-cloud-function-roundtrip.json` (P107-S89-CFEXAMPLES); runtime `packages/noodl-viewer-react/src/nodes/std-library/data/cloudfunction2.ts` `registerInputIfNeeded` / `registerOutputIfNeeded` :219-248
found: P112 OWN-015 s14, 2026-10-12
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-015-THE-BACKEND-FROM-NPM.md §7 (round 2)
regression: packages/noodl-mcp/tests/own015CloudPorts.test.ts (four right ends beside five wrong ones, as the round wired them; red before the fix); `npm run catalog:examples` 109/109
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

**Fixed (s15, 2026-10-12).** Measured first. The checker already derived a caller's `in-`/`out-` names from the
function (DEF-002's `derivedPortTargets`) and already refused a bare `text` (ISL-042). It let the round through in two
places:

- **The instance's own `ports` came first.** `nonexistentPort` step (2) accepts any port the node declares on itself,
  and ISL-042's "the runtime can never make this name" check ran after it. The agent had declared `text` and
  `audioDataUrl` on the instance to get past the first refusal. The mint check now runs before (2)
  (`cloudPortMissingPrefix`).
- **The function's own ends were never checked.** The Request mints only `pm-` outputs and the Response only `pm-`
  inputs (`request.ts` / `response.ts`), but both have runtime ports, so a bare name was skipped. They're in
  `cloudPortMissingPrefix` now.

The refusal names the right port: *"…Its other inputs exist only as "in-<name>", so a name without the prefix is never
made and nothing goes through this wire. If "text" is a parameter of the function (…), wire "in-text"."* The
suggestion is `in-text`. On the round's unrepaired `bonjour`, `validate_project` now reports 4 errors (`req.text`,
`ok.audioDataUrl`, `call_speak.text`, `call_speak.audioDataUrl`); the repaired copy reports 0.

The examples were wrong on both sides, not just the caller: 10 of 109 (34 wires) wired the Request and Response bare
too. All are fixed, each new `pm-` name is checked against its node's `params` (30/30), and the enriched catalog is
regenerated (diff = those wires + 3 descriptions). Request, Response and Cloud Function now say "wire `pm-text`, never
`text`" in the description `get_node_type` returns. Census: templates and library hold 635 cloud endpoints and 0 bare.

**Not this bug:** the round's `speak.success → ok.send` on a `JavaScriptFunction` is a valid wire. `success` is the
node's built-in "the script finished" signal, which also fires on the script's early return. The script's own
`Outputs.success` is `out-success`. That's the wrong meaning but a real port, so no checker can refuse it.
