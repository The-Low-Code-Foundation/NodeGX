---
id: P112-OWN023-DEPLOYLOOPBACK
title: "A static deploy of an app bound to a local backend points the public build at `http://127.0.0.1:<port>` (the visitor's own machine) and says nothing"
status: fixed
commit: (this session, the Beta sweep s5)
severity: medium
area: deploy / `@nodegx/preview` 0.2.4 `nodegx-deploy` (the project's `metadata.cloudservices.endpoint` is copied into the bundle as written; `projectExport.ts` `LOOPBACK` is used only for the preview's export options)
kit: preview
found: P112 OWN-023 round 2b, 2026-10-21, publishing arm B2 (the gala converted) to nodegx.io
regression: packages/noodl-preview/tests/p112-own023-deploy-loopback.test.ts
evidence: `nodegx-deploy <B2>/app <out> --base-url /gala/nodegx/` → `{"ok":true,…}`, stderr has no word about the backend; the bundle `index-96f37413597b855d.js` holds `"cloudservices":{"instanceId":"backend_mvi4i1s8eudt8","endpoint":"http://127.0.0.1:8585",…}`. B2's run: dev-docs/tasks/phase-112-your-own-nodegx/own-023/runs-r2b/B2
---

A person whose app has a backend runs the deploy, gets `ok: true`, and puts the folder on a public host. Every
visitor's copy then asks `http://127.0.0.1:8585` for its records, which is the visitor's own computer. From an https
page the browser blocks it (mixed content / private network access); the app shows whatever it does with no backend.
On the builder's own machine, where that backend is running, the same public URL works, so the builder is the one person
who can't see the fault.

Reproduce: provision a local backend for any project (`provision_backend`), then `nodegx-deploy <project> <out>`; grep
the bundle for `127.0.0.1`.

Fix, small: the deploy reads the endpoint it is about to ship; a loopback one is either refused (with the sentence
"this app talks to a backend on this computer; deploy the backend first or pass --backend-url"), or shipped with a
warning on stderr and a field in the JSON outcome. Same family as P123-STU008-BACKENDPUBLIC (the deploy publishes the
backend's policy file); not the same defect.

**Fixed (Beta sweep s5, 2026-10-25), the warning half of the fix.** A static deploy whose project names a backend on
this computer (`127.0.0.1`, `localhost`, `[::1]`: the test `projectExport.ts` already used) still deploys, and now
says so three ways: the outcome's `localBackend` is the address, its sentence is in `warnings` (what it means for a
visitor, and `deploy_to_vm` / `nodegx-deploy --full-stack` as the way to ship both), and the CLI writes that sentence
on stderr after the report. A full-stack deploy says nothing: it carries its backend, which serves the app with its
own address. Refusing instead (the row's other option) would change what a working command does: left for Richard.
The shipped `templates/digital-bricks-training` names `http://127.0.0.1:8577`, so a static deploy of it now warns.

**Graded.** `tests/p112-own023-deploy-loopback.test.ts` 3/3 against a rebuilt `dist/nodegx-deploy.cjs` (loopback and
localhost warn on all three channels; a reachable endpoint and none deploy with no such sentence); the mutant with no
warning computed, rebuilt, red 2/3. Preview suite 17 suites 104/104, tsc clean.
