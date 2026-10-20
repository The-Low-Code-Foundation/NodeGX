---
id: P112-OWN018-NOLIBRARY
title: "The npm kit reveals list_library, get_library_entry and install_prefab, which only find the library by walking up to a repo checkout — from npm every call fails with 'No library/ directory found … set NODEGX_LIBRARY_DIR', so an agent looking for icons after NOSTARTERASSETS has nowhere to go"
status: fixed
severity: medium
area: mcp / library tools (`packages/noodl-mcp/src/libraryShelf.ts` `resolveLibraryRoot`, revealed by the `toolGroups.ts` group that `find_tools` opens with drive_page)
found: P112 OWN-018 s2, 2026-10-12 (Mistral Large 4 in OpenCode 1.19.0, quiz run 1, sitting 2; tarballs packed at 5754e993e)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
kit: mcp
regression: packages/noodl-mcp/tests/own018NoLibrary.test.ts "a server with no library offers none of the four, even with the group revealed"
commit: 23ea136b9
---

Mistral's render said the quiz "measures as a default template: no-imagery, single-ground, no-display-type". It went
looking for icons: `glob noodl_modules/**` (nothing: NOSTARTERASSETS), then `list_library {query: "lucide icons glyph
module"}`, answered:

> No library/ directory found walking up from the server. This server reads library content from a checkout
> (library/ at the repo root); set NODEGX_LIBRARY_DIR to point at one.

`resolveLibraryRoot` walks up from the bundle's `__dirname` for a `library/` folder. Under `npx @nodegx/mcp` that is
the npm cache; there is never one. The tools are still revealed: they share a `find_tools` group with `drive_page`, so
a model that asks how to press a button (Mistral: "press drive page steps") gets them too.

Not Mistral's: any agent on the npm kit gets the same answer, and a person has no checkout to point the variable at.

**Proposed:** the npm MCP reads the published shelf (the templates are published there already), or carries the
starter modules, or the library tools say up front in their descriptions that they need a checkout and are not
revealed when none is found. Spec: from the packed tarball in an empty folder, `list_library {query: "icons"}`
answers with entries, or the tool is not offered.

Related: P112-OWN018-NOSTARTERASSETS (the project has no icons to start with).

**Fixed 2026-10-14 (lane 1, `23ea136b9`), the smallest of the three proposals:** the four shelf tools (`list_library`, `get_library_entry`, `install_prefab`, `export_to_library`) are registered only when a library resolves. From npm the explore group arrives without them, and `call_tool` says there is no such tool. Not done: reading the published shelf from npm (LBR-008's follow-up).
