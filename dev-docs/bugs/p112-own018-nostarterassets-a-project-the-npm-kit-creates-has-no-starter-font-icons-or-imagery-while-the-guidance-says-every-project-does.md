---
id: P112-OWN018-NOSTARTERASSETS
title: "A project the npm kit's create_project makes has no starter font, icons or imagery (no noodl_modules at all), while the guidance tells the agent every project has them — so a stranger's agent builds without icons or pictures"
status: fixed
severity: medium
area: mcp / create_project (`packages/noodl-mcp/src/tools/createProject.ts` — no starter-asset install; the editor's new-project path calls `installStarterAssets` from `STARTER_ASSETS`), guidance in `src/iconSets.ts` header and the style vocabulary
found: P112 OWN-018 round 3, 2026-10-12 (Mistral Large 4 in Vibe; project `atelier-hub` from the 0.2.0 tarballs packed at `4a18723fe`)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §10
kit: mcp
regression: packages/noodl-mcp/tests/own018StarterAssets.test.ts "create_project writes the starter set; the vocabulary lists it and the first check has no font warning"
commit: 00e569472
---

Mistral's reasoning, after `get_style_vocabulary`: *"Icons list is empty and imagery is empty (total 0) — so no starter
imagery/icons available in this project? … the doctrine said every project created has them, but this project's
vocabulary shows empty. So I should avoid Image/Icon nodes."* Measured on the project: no `noodl_modules/` and no
assets. `create_project` in `@nodegx/mcp` never installs the starter set; the editor's new-project path does
(`inter`, `lucide-icons`, `starter-imagery` from `STARTER_ASSETS`). `src/iconSets.ts` says "Every project created here
gets `inter` and `lucide-icons` from `STARTER_ASSETS`".

This is not Mistral's: every npm-kit app (s15's lingo app included) is built without the starter icons, imagery or
Inter, and the agent is told otherwise. The vocabulary did answer truthfully ("none installed"), so a careful agent
drops icons and photos; a less careful one may invent them.

**Proposed:** `create_project` installs the same starter set (the MCP ships the editor's bundle of it, or fetches it
from the shelf), or the guidance stops claiming it for projects the server made. Spec: a project made through the
door lists the starter icon set and imagery in `get_style_vocabulary`.

**Fixed 2026-10-14 (lane 1, `00e569472`).** `create_project` installs the editor's own `STARTER_ASSETS` list (imported, so the routes cannot drift): from `dist/starter-assets` on npm (a new prepack step, ~4.3 MB, the project's layout) or the editor's assets in a checkout. The result carries `starterAssets: { installed }`, or `failed` with a sentence telling the agent not to place starter icons or images. The test makes a project through the server: all 61 files, `lucide` and `starter-imagery` in `get_style_vocabulary`. Not covered: the editor app's own bundled server ships the preset fonts beside it but not this set (its `extraResources`), so a project it creates reports `failed`. That is a build-config change for 0.5.0.
