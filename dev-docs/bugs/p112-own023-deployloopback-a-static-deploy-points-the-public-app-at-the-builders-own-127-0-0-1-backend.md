---
id: P112-OWN023-DEPLOYLOOPBACK
title: "A static deploy of an app bound to a local backend points the public build at `http://127.0.0.1:<port>` (the visitor's own machine) and says nothing"
status: open
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

**Ruled by Richard, 2026-10-26.** Asked: *"A deploy whose app still talks to a backend on your own computer: warn, or
refuse?"* Answer, verbatim in substance: when the project has a NodeGX backend, **deploy full stack by default** ("when
you're building locally and the DB is local, then you push to a VM, you push the DB too"). When the person opts out, or
the backend is someone else's (a local Supabase), **warn**: "Your backend is local, make sure you have a production one".
He asked for something cleverer than a bare warning for third-party backends, since "we can't push every backend in the
world to a VM": his idea, VM-side values the deployed app picks up so it stops pointing at localhost. Status reopened.

Measured for that (2026-10-26): the mechanism exists. DEP-001's `nodegx-config.json` is fetched beside the page and
merged over the baked `cloudservices` **and** `backendServices` (`noodl-viewer-react/src/deploy-config.ts:25, 91-131`);
the full-stack backend answers it per request with the request's origin (`nodegx-backend/src/server/static-app.ts`);
`serve.js` takes `NODEGX_CLOUDSERVICES_ENDPOINT`. Missing: a production address for a `backendServices` entry
(Supabase, PocketBase, Directus, custom), any route that writes one, and the default flip to full stack. A full-stack
deploy ships the backend, its functions and its rules; `data/` (records, uploads) is made on the box and never written
by a deploy, so local test rows do not travel.

**Built so far for the ruling (2026-10-26):**
- **Studio** (9ac8eaf): Publish's first question defaults to "A Server of Your Own", which ships the backend, data and
  functions, when the backend runs on this computer. The folder route keeps its "works on this computer only"
  question.
- **The editor's Deploy to folder** (097216d30): writes the front end only, so it now asks "Deploy the front end only",
  naming the routes that ship both.
- **`deploy_to_vm` and ship-to-vm.sh** were already full stack.

**Not done, on purpose:** the `nodegx-deploy` CLI's default stays static. Studio's folder publish and `nodegx deploy`
both spawn it with no flag, and an engine refuses a flag it does not know (`unexpected argument`), so flipping its
default (with a `--frontend-only` opt-out) breaks whichever of the three programs updates first. It keeps its loopback
warning.

**Still open:** the third-party half (a "live address" per Backend Services entry, written into `nodegx-config.json`,
which `deploy-config.ts` already merges as `backendServices`; a per-type sentence; a reachability check after
deploying). Studio has no third-party backends, so this is the editor's and agents' and is off the Beta walk.
