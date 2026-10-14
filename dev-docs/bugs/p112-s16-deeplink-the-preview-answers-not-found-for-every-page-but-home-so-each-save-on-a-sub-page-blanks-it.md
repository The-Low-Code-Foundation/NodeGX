---
id: P112-S16-DEEPLINK
title: "The preview answers \"Not found\" for every address but /, so each save made while looking at a sub-page of a path-routed app blanks it"
status: fixed
severity: medium
area: preview server (`packages/noodl-preview/src/server.ts` `handle`), since SUB-009; not the deploy (Caddy `try_files {path} /index.html` on the VM)
kit: preview
found: P112 OWN-017 s16, 2026-10-12, by Richard, using the stranger's home-made editor
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-017-THE-LINGO-APP-IN-OUR-OWN-EDITOR.md §7 (s16)
---

Richard, editing the French app in the home-made editor while the app was open on the Greetings lesson: *"I tried
to save something, and then the app refreshed and says 'not found' for the greetings page I was on."*

His edit was harmless (`borderTopStyle: "solid"` on one Group). Measured without it: in the packed 0.2.0 preview,
home → tap Greetings → `/lesson/greetings` renders. Then `Page.reload` gives `Not found`, and a direct load of the
same address gives `Not found` too. Home reloads fine. The server answers `404 text/plain "Not found"` to every path
except `/`, `/index.html`, `/index.js`, bundles and real files. The app routes by path (`navigationPathType: "path"`,
`urlPath: "lesson/{lessonId}"`). The preview's live reload after every save is `location.reload()`, so any edit made
while looking at a sub-page lands on the 404. That's the edit-and-see loop OWN-017 is about, and the one a video of
it would show. lingo.nodegx.io answers `/lesson/greetings` with 200 (Caddy's fallback). Only the preview lacked one.

**Fixed:** an address that names no file, has no extension and isn't a dotfile is the app page (as `/`). A missing
asset (`/missing.png`), a file with an extension (`/lesson/greetings.json`) and a file the deploy wouldn't publish
(`/.env`, which exists) stay 404. Spec `tests/own017-deep-link.test.ts` (7). Mutant (fallback off): the 3 deep-link
cases go red, the 4 controls stay green. `preview.test.ts`'s traversal case asserted a 404 for `/../../../../etc/hosts`,
which `URL` folds to `/etc/hosts`, now the app page. It's rewritten to grade the property (the body is never the
file, it's the app page) and adds `..%2f` ×8, which survives the parser and still gets 404. Driven on the French app
from the checkout's build: reload and a direct load of `/lesson/greetings` both show the lesson.

**Owed:** the 0.2.0 preview tarball predates this, so re-pack it.
