# HST-013 — Code nodes printed at deploy

**Opened 2026-11-05.** **Depends on HST-010.** **Status: ✅ done (session 11, 2026-11-05).** Kind: product. Fixes P115-HST004-NOCODEGEN
(high).

## 1. The person sentence

> **A cloud function with a Function, Expression or Script node in it answers on Cloudflare as it does on the
> computer.**

## 2. Why

A Worker refuses `new Function` and `eval` (*Code generation from strings disallowed*). The cloud runtime compiles
each code node's text when the function loads, so on a Worker the node answers a default with 200 (Expression) or the
call waits out the 30 s timeout and answers 504 (Function). All 6 reds left in `p127-no-roles` after HST-010 are this.

## 3. What to build

At deploy, every code node's text in every cloud function is printed as a real function into the Worker's bundle,
keyed by node id; the runtime looks there before compiling a string. A code node whose text cannot be printed refuses
the deploy by name, never at a visitor's call.

## 4. Acceptance criteria

1. `p127-no-roles` 11/11 in the Durable Object.
2. A cloud function with each of the three code nodes answers the same on `wrangler dev` as in Node.
3. Node: unchanged (nothing printed, the runtime compiles as today).
4. (added) A function UPLOAD to a host whose code was printed (a Worker) with code that was not printed is refused by
   node and function, never left to a visitor's call.

## 5. Session 11 (2026-11-05): built and measured

### 5.1 What was built

- **The seam**, `packages/noodl-runtime/src/printedcode.ts`: `compileCode(params, body, {async})` answers from a table
  the host installed (`installPrintedCode(rows, { refuseOthers })`, on `globalThis` under `Symbol.for`, so a second copy
  of the runtime in a bundle sees it), else `new Function` / `new AsyncFunction` with the same arguments as before. With
  `refuseOthers` a text not in the table throws *"This code was not printed when the app was deployed, and code cannot
  be compiled here. Deploy the app again."* instead of workerd's *Code generation from strings disallowed*.
- **The five compile sites** go through it, each from the same helpers the printer uses (`FUNCTION_NODE_PARAMS` +
  `functionNodeBody`, `expressionNodeBody` (the preamble moved there, unchanged), `LOGIC_BUILDER_PARAMS`,
  `REST_REQUEST/RESPONSE_PARAMS`, `MAP_COLLECTION_PARAMS`): Function, Expression, Logic Builder, REST (both scripts),
  Map Collection. "Script" in §1 had no cloud node of its own (`Javascript2` is the browser's), so all five were done.
- **Expression binds by the printed names.** Its parameter list in Node is its scope's keys, whose order depends on
  how its ports were registered; the printer prints `[...expressionPorts(text), 'Noodl']`, and the node, finding the
  body printed, binds values by the names the printed function declares (`findPrintedBody`).
- **The printer**, `packages/noodl-runtime/src/printcode.ts`: `collectCode(components)` → one entry per distinct text
  (with every site) + refusals; `printCodeModule(print)` → `export default [[async, params, body, fn], …]`;
  `refusalSentence`; `unprintedCodeOnThisHost(components)`. A text is refused when it does not compile as a function
  body (which also guarantees it cannot close the printed function early) or compiles only outside strict mode.
- **The upload refusal**, `nodegx-backend/src/server/byob-admin.ts` `updateWorkflow`: with a table installed, a bundle
  whose code was not printed is a 400 `Not deployed: The Function node "fn" in the cloud function "double" has code
  that was not part of this app's last deploy …`, and the deployed function keeps answering.
- **The spike**: `build.mjs` prints `dist/printed-code.mjs` from `HST_PRINT_FROM` (`*.workflow.json` files or folders,
  `:` between) and refuses the build on any refusal; the module is its OWN Worker module (esbuild external +
  wrangler.toml `find_additional_modules`, `base_dir = "dist"`, an `ESModule` rule), so printed code sees none of the
  bundle's top-level names, as `new Function` code never did. `src/worker.ts` installs it with `refuseOthers` at
  startup. `remote/BackendService.js` copies each suite's `workflows/*.workflow.json` to `HST_CAPTURE_DIR` as it boots.

### 5.2 The grade

| arm | result |
|---|---|
| noodl-runtime `p115-hst013-printed-code.test.ts` | 7/7; sabotage (drop the table hit) → 2 red; (rename one Logic Builder param) → 1 red |
| nodegx-backend `p115-hst013-code-nodes-printed.test.ts`, Node | 5/5: no table = the literal answers (AC3); printed + `refuseOthers` = the same (so every code node ran its printed function); upload refusal; sabotage (Expression's row left out → only `sum` stops) |
| upload refusal sabotage (the `throw` disabled) | the upload test red |
| HST-006 §7.3's nine suites + this test, Node control | **80/80** |
| the same on `wrangler dev`, Worker built with an EMPTY table (pass 1) | p127-no-roles 5/11 (six 30 s waits), impersonate 0/3, this test's code functions time out |
| the same on `wrangler dev`, Worker built from the captured functions (pass 2) | **79/80, the 1 = the sabotage arm, skipped** (a jest-side table cannot reach the Worker): the nine suites **76/76** (was 67/76), **p127-no-roles 11/11 (AC1)**, impersonate-session 3/3, Function/Expression/Logic Builder = Node's answers (**AC2**) |
| noodl-runtime whole suite | see §5.4 |

Not run live on `hst-backend-spike`: the backend's suites boot FRESH and wipe Campus, and Campus has no code node.
The live Worker still runs the build before this session; its next deploy (HST-014) carries the seam.

### 5.3 Traps

- 🔴 **The Expression's process-wide compile cache hid a missing row.** The sabotage arm first still answered 14: the
  Node arm had cached the compiled function under `expression + args`. Under a table the cache is now skipped (the
  printed function or a refusal). On a Worker the cache would be empty, but a test running arms in one process is not.
- 🔴 **Under the remote config every arm is the Worker.** The "printed = Node arm" equality passed in pass 1 with both
  arms broken; both now assert the literal answers.
- 🔴 a variable `require(path)` in the printer was not bundled by esbuild (45 KB, REST defaults would throw at build);
  literal requires (149 KB).
- 🔴 zsh: `ls $SUITES` with a space-separated string does not split, and `$(cat missing-file)` then ran the WHOLE
  backend suite; stopped within a minute. Use an array, or write the list out.

### 5.4 Known differences, not refused

- **Strict mode at run time.** `new Function` compiles sloppy code; a printed function sits in an ES module. What
  only parses sloppy is refused at build; what only BEHAVES differently is not visible in the text: an assignment to an
  undeclared name throws instead of making a global, and `this` in a plain call is `undefined`. AI-written code
  declares its names; a person's old code may not.
- **Project script files** (`Scripts.x`) compile through `scriptfiles.ts`'s own `new Function`: P115-HST013-SCRIPTFILES
  (low, reach unmeasured).
- **Code arriving at run time** (a script wired in rather than typed) cannot be printed; the five nodes' code ports
  are `allowEditOnly`, so it cannot arrive that way from the editor.
