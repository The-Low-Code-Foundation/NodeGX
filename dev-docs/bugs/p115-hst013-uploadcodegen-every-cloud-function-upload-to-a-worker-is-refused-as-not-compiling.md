---
id: P115-HST013-UPLOADCODEGEN
title: On a Cloudflare Worker every cloud-function upload with a code node is refused, "its code does not compile: Code generation from strings disallowed", so the deployed app has pages and collections but no cloud functions
status: fixed
severity: high
kind: product
area: cloud runtime / the upload check `unprintedCodeOnThisHost` (`noodl-runtime/src/printcode.ts`), run by `PUT /admin/workflows/:name` (`nodegx-backend/src/server/byob-admin.ts`); Workers deploy target only
found: 2026-11-27, The Money Printer's `hub/` (four cloud functions, each with a Function node), `npx @nodegx/backend deploy cloudflare ./hub --local` on 0.1.3; its task notes T02 "Blocker"
evidence: a copy of fixture B plus one function `double` (Request → Function → Response), `deploy.mjs … --local` on workerd. With printcode.ts as at 214fd44d0, step 6 ends "The cloud functions were not pushed: Not deployed: The Function node "d_fn" in the cloud function "double" cannot run on Cloudflare: its code does not compile: Code generation from strings disallowed for this context". With the fix: "Cloud functions deployed: /#__cloud__/subscribe, /#__cloud__/double"; POST /functions/double {a:21} → {"result":{"total":42}}; PUT /admin/workflows/probe with the deployed text → 200, with `* 3` instead of `* 2` → 400 "…has code that was not part of this app's last deploy… Deploy the whole app again to change its code.", and double still answers 42.
regression: packages/noodl-runtime/test/p115-hst013-upload-without-codegen.test.ts
---

**What a person sees.** The deploy gets through the site and the Worker, then step 6 stops: *"The cloud functions
were not pushed: Not deployed: The Function node … cannot run on Cloudflare: its code does not compile: Code
generation from strings disallowed for this context"*, once per code node. The code compiles; it is the Worker that
refuses to compile anything. The app is up with its pages and collections and no cloud functions, so every call to
one fails.

**Why.** Before a function upload is loaded, the backend asks `unprintedCodeOnThisHost` which code texts this host
cannot run. It called `collectCode`, which checks each text with `whyNotPrintable`, and that check runs
`new Function` / `new AsyncFunction`. On workerd that throws for every text, so every text came back as a refusal,
printed or not. The check is for the deploy (in Node, where it decides what can be printed); on the Worker the
printed table is the check.

**Why the tests missed it.** `nodegx-backend/tests/p115-hst013-code-nodes-printed.test.ts` has an upload arm with the
table installed, but it runs in Node, where `new Function` works, so the compile check passed there. (Why no
earlier workerd run caught it was not measured.)

**Fix.** `collectCode(components, { compile: false })` skips `whyNotPrintable`; `unprintedCodeOnThisHost` uses it and
refuses only the texts the table does not hold. A text that would not compile cannot be in the table (the deploy
refused it), so it is refused too, with the "Deploy the whole app again" sentence. The deploy
(`deployCloudflare.ts`) keeps the full check.

**The test.** The printer and the seam, bundled with esbuild as the Worker carries them, run in a V8 context made
with `codeGeneration: { strings: false }`: workerd's refusal, with its message (its first test shows the context
refuses both constructors). Sabotage, both run: printcode.ts as at 214fd44d0 → 3 of 4 red; only dropping
`{ compile: false }` → the 2 refusal tests red.
