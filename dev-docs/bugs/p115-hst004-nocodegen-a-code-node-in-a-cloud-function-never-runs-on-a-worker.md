---
id: P115-HST004-NOCODEGEN
title: A code node (Function, Expression, Script) in a cloud function never runs on a Cloudflare Worker, and the call either answers a default or waits 30 s for a 504
status: fixed
commit: 10510764b
severity: high
area: cloud runtime / JavaScriptFunction, Expression, Script nodes, Workers deploy target only
found: P115 HST-004 s1, 2026-11-04 (Expression answers 0 with 200); measured again HST-006 s6 (JavaScriptFunction → 504 after 30 s)
evidence: dev-docs/tasks/phase-115-online-on-your-own-account/HST-004-A-WORKFLOW-ON-A-WORKER.md §6.4; HST-006-THE-CONTRACT-ON-D1.md §7.3; HST-013-CODE-NODES-PRINTED-AT-DEPLOY.md §5
regression: packages/nodegx-backend/tests/p115-hst013-code-nodes-printed.test.ts; packages/noodl-runtime/test/p115-hst013-printed-code.test.ts
---

**What a person sees, on a Worker:** a cloud function with a code node in it does not do what the code says.
- An **Expression** (`1 + 2`) answers `0` with status 200 (HST-004 §6.4).
- A **Function** node whose output leads to the Response node never reaches it: the caller waits for the function
  timeout and gets **504 after 30 s** (HST-006 s6, `p127-no-roles`'s `list-jobs*`, local and on Cloudflare).
- Where the function reports the node's error, the error says *"Code generation from strings disallowed for this
  context"* (`impersonate-session`, 0 / 3).

**Why.** Workers refuse `new Function` and `eval` (no code generation from strings). The runtime compiles a code
node's text at run time; the console carries `[function/script-not-compiled]`, and the graph goes on without the node.

**Measured.** HST-006 s6: 9 of the 76 cases in nine backend suites are red on a Durable Object for this reason alone
(6 in `p127-no-roles`, 3 in `impersonate-session`), the same 9 locally under `wrangler dev` and on Richard's account.
All 9 are green in Node.

**The way through (HST-004 §6.4).** Print a cloud function's code nodes as `.js` modules before deploy, the way the
HTML exporter already prints a page's Function nodes into `functions/`. Then the runtime looks the compiled function up
instead of compiling text. Until then a Workers deploy should refuse a project with a code node in a cloud function, by
name, rather than deploy one that waits 30 s.

**Fixed (P115 HST-013, 2026-11-05).** Every compile site of the five code nodes the cloud runtime carries (Function,
Expression, Logic Builder, REST's two scripts, Map Collection) goes through `noodl-runtime/src/printedcode.ts`
`compileCode`, which answers from a table of functions printed at deploy (`printcode.ts`) when the host installed one,
and compiles the string as before when not. On `wrangler dev`, the nine suites of HST-006 §7.3: **76/76** (was 67/76),
`p127-no-roles` 11/11, `impersonate-session` 3/3. A code node that cannot be printed refuses the build by name; a
function upload whose code was not printed is refused (400) by name. Not covered: project script files
(P115-HST013-SCRIPTFILES).
