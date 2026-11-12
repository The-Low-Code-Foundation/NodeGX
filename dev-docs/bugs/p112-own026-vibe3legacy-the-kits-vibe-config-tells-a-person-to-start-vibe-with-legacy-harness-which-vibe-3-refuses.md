---
id: P112-OWN026-VIBE3LEGACY
title: the kit's Vibe config tells a person to start Vibe with `--legacy-harness`, which Vibe 3 refuses
status: fixed
severity: medium
area: create-nodegx / .vibe/config.toml (renderVibeConfig)
found: P112 OWN-026 Mistral lab setup, 2026-10-24
evidence: dev-docs/tasks/phase-112-your-own-nodegx/own-026/MISTRAL-PLAN.md §1 (the $0 mocks mistral1–3 and the Vibe 3.0.2 checks)
commit: fix(p112-own026-vibe3legacy), 2026-10-25
regression: packages/create-nodegx/test/create.test.js "P112 OWN-018: Mistral Vibe gets Large 4, the same pinned server, and permission for the bootstrap tools"
---

A person who runs `npm create nodegx -- <folder> --vibe` gets a `.vibe/config.toml` whose first lines say:

```
# Mistral Vibe settings for this folder, written by `npm create nodegx`. Start Vibe here with:
#
#   vibe --legacy-harness
```

Mistral Vibe 3.0.0 (2026-10-19) and later have no such flag. Vibe 3.0.2 answers `vibe --legacy-harness` with
`error: unexpected argument '--legacy-harness' found`, so the one command the kit gives a Vibe user fails. The
reason the header gives is also out of date. Vibe 2.26.1's default harness handed the model "The MCP tool returned
an error" in place of the server's text (P112-OWN018-OPAQUEERRORS). In 3.0.2 the Unified Harness is the only one, and
it passes the server's own error text through. Measured in the mistral3 mock: a `call_tool` with a wrong argument name
came back as `get_component has no argument "componentName" … Its arguments are: path, include_usages.`

Where: `packages/create-nodegx/bin/create-nodegx.js` `renderVibeConfig()` (the header lines and the docblock above
`VIBE_CONFIG`), and wherever the kit's Vibe docs repeat the flag.

Also seen in 3.0.2, beside this bug (not separate bugs yet):

- MCP tools are no longer direct tools. The model finds them with `search_tool_functions` and calls them inside
  `run_typescript` as `tools.mcp_nodegx.<tool>(…)`.
- The config's `[tools.nodegx_<tool>] permission = "always"` entries name the 2.x tool names. Whether 3.x still
  reads them wasn't measured (the lab runs `--auto-approve`).

Fix, small: a header that works on both versions, e.g. `vibe` (3.x) / `vibe --legacy-harness` (2.x only). Or check
`vibe --version` at create time. Plus one line in create.test.js that pins the header.

## Measured, then fixed (2026-10-25)

**The permission entries still work on Vibe 3.0.2** (read from its source, $0). A call the model makes inside
`run_typescript` as `tools.mcp_nodegx.<tool>` reaches the Runtime as the route `mcp_nodegx.<tool>`; the MCP catalogue
registers each route against the name Vibe publishes, `{server}_{remote name}` (`_published_mcp_names`,
`app_server/_unified_harness_backend_adapter.py`), and the per-call resolver reads that name's config
(`_resolve_provided_tool` → `get_tool_config("nodegx_<tool>")`, `app_server/_unified_permissions.py`): `always` is
allowed, anything else asks. So `[tools.nodegx_call_tool] permission = "always"` is honoured, and the seven names are
still the whole list: in t2-nodegx-c01 (Vibe 3.0.2, Large 4) every NodeGX call was one of the seven (5,719 `call_tool`,
246 `find_tools`, 104 `list_projects`, 91 `open_project`, 67 `get_example`, 8 `list_examples`, 8 `create_project`).
Not measured: an interactive session (the lab runs `--auto-approve`), so this rests on the source.

**Fixed:** the config's header, both "Next:" sentences and the Vibe kit's README now say `vibe`, with
`vibe --legacy-harness` as a note for Vibe 2.x (whose default harness still hides the server's errors). The NodeGX
agent profile's comment says the same. create.test.js pins the header (`#   vibe`) and the stdout in three tests; on
the old `create-nodegx.js` those three fail.
