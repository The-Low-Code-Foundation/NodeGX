---
id: P26-SKELSHIP
title: A deploy ships a project nobody has built, and its public page tells visitors "Review the plan in docs/ and start when you are ready"
status: open
severity: low
area: preview / nodegx-deploy (and deploy_to_vm, ship-to-vm.sh)
found: P26 DEP-002 s4, 2026-10-23 (Richard, looking at https://lingo.nodegx.io)
evidence: curl https://lingo.nodegx.io/ — the page is create_project's skeleton; noodl-mcp/src/tools/createProject.ts SKELETON_PLACEHOLDER_MARKER
---

Richard opened lingo.nodegx.io and read "Lingo — nothing built yet. Review the plan in docs/ and start when you are
ready." and was not sure the deploy had worked. It had: lingo is the OWN-016 test fixture (Richard, 2026-10-12: "use
the test fixture rather than a real app"), an empty project made by `create_project` plus one cloud function, and the
box serves it correctly (health 200, rules enforced, visitor `_User` 403, measured 2026-10-23 18:30).

The defect is that nothing between the project and the public says so. The placeholder sentence is addressed to the
agent that is about to build the app, and a deploy puts it in front of every visitor as if it were the app.
`createProject.ts` already has `isUntouchedSkeletonPage` (the marker exists so the skeleton can be recognised); the
deploy engine does not ask it.

Fix (small): `nodegx-deploy` reports `skeleton: true` when every page is the untouched skeleton, and `deploy_to_vm` /
`ship-to-vm.sh` refuse it ("this project has nothing built yet; build it first, or pass allow_empty") or at least say it
in the result. Separately, the placeholder text could speak to a visitor ("This app is being built.") with the
agent's instruction kept in docs/ — that is a wording ruling.

**`deploy_to_vm` half fixed 2026-10-23 (opennoodl-d7).** `untouchedSkeletonPages(store)` lists the pages (components
with a `Page` node) when every one is still `isUntouchedSkeletonPage`; `deploy_to_vm` then refuses before it touches
the box: "Nothing is built in this project yet: Pages/Home is still the placeholder create_project wrote, whose
sentence is addressed to the agent and would be every visitor's first page. Build the app first; nothing was sent.
(A test fixture can ship as it is with allow_empty.)". `allow_empty` is a new optional argument (a deferred tool: the
resident surface stays 8,277 / 8,280). Regression: `tests/dep002DeployToVm.test.ts` "P26-SKELSHIP" (3 rows: refused
with no call made; allow_empty and a built project ship; the reader on a real `writeProjectSkeleton` project, then
with the text changed). 🔴 Reshipping lingo with `deploy_to_vm` now needs `allow_empty: true`.

**Still open:** the engine (`nodegx-deploy`, which Studio's Publish and `ship-to-vm.sh` use) ships it without a word;
and whether the placeholder should speak to a visitor ("This app is being built.") is Richard's wording ruling.
