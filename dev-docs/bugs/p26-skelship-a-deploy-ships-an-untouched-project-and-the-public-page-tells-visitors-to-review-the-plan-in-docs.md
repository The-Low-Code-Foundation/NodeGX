---
id: P26-SKELSHIP
title: A deploy ships a project nobody has built, and its public page tells visitors "Review the plan in docs/ and start when you are ready"
status: fixed
commit: a27fc8977
severity: low
area: preview / nodegx-deploy (and deploy_to_vm, ship-to-vm.sh)
found: P26 DEP-002 s4, 2026-10-23 (Richard, looking at https://lingo.nodegx.io)
regression: packages/noodl-editor/tests-unit/p26-skelship/deploySkeleton.test.ts "an unbuilt one is asked about, deploys nothing until the answer, and deploys on \"Deploy anyway\""
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

**Engine half built 2026-10-25 (the Beta sweep s7), as a warning.** `nodegx-deploy` (so `nodegx deploy` and
ship-to-vm.sh) reads the published model with the same exact rule (noodl-preview `src/skeleton.ts`: the marker is a
copy, held equal to createProject.ts's by the spec, since the two packages do not import each other). When every page is
the untouched placeholder the outcome carries `skeletonPages`, `warnings` carries "Nothing is built in this project yet:
Home is still the placeholder create_project wrote, whose sentence is addressed to the agent, and it is what every
visitor will see. It was published as it is; build the app, then deploy again.", and the CLI says it on stderr.
ship-to-vm.sh now prints every engine warning (this and DEPLOYLOOPBACK's) before it touches the box. Graded on the built
engine (`tests/p26-skelship-engine.test.ts`): red on HEAD's engine (`skeletonPages` undefined), 3/3 after, with two
known-firing arms (the fixture as written; the placeholder with one more node); a mutant without the exact two-node rule
reddens the second. Preview 19 suites 109/109.

**Still open:** Studio's own Deploy to folder tab calls `deployToFolder` directly, not this engine, so it says nothing
(the row's area line was wrong about that). For Richard: whether the engine should **refuse** as `deploy_to_vm` does
(built as a warning, like DEPLOYLOOPBACK), and the placeholder's wording for a visitor.

**Ruled by Richard, 2026-10-26.** Asked: *"Should the deploy refuse a project nobody has built yet, or warn?"* Answer:
"refusing is the wrong tactic, in case someone wants to deploy just to health check or test … a loud warning everywhere
but the option to push ahead anyway". So: every route warns loudly and ships — `deploy_to_vm` stops refusing
(`allow_empty` goes, or becomes a no-op), the engine keeps its warning, and Studio's Deploy to folder tab (which says
nothing today) warns with a way to go ahead. The visitor wording ("This app is being built.") was asked in the same
message and not answered.

**Fixed as ruled (a27fc8977; Studio 6030a59).** Every route warns and ships; none refuses.
- **Wording:** create_project's Home reads "Lingo — this app is being built.". The earlier sentence is still read as the
  placeholder (`LEGACY_SKELETON_PLACEHOLDER_MARKERS`).
- **One reading:** `deploy-skeleton.ts` in the editor; the engine re-exports it; create_project and Studio hold copies
  that their tests compare by text.
- **`deploy_to_vm`:** `allow_empty` is gone. The result carries the engine's `warnings`, and `next` tells the agent to
  say them first.
- **Editor Deploy to folder:** asks "Deploy anyway" before the folder is chosen (`deployOrAsk`).
- **Studio Publish:** asks "Publish Anyway" before either route, and both done windows show the warnings.
- **Engine CLI:** prints the sentence it made. It matched the old words, so the new sentence would have been silent.

Graded: editor `tests-unit/p26-skelship` 8/8; preview engine 7/7 on a rebuilt dist (with the earlier sentence); mcp
dep002 + skeletonCreate + toolDisclosure 45/45; Studio `check:unbuilt` 14/14; editor and preview tsc clean. Not driven:
the editor's confirm and Studio's windows on screen (both read from source by their checks).
