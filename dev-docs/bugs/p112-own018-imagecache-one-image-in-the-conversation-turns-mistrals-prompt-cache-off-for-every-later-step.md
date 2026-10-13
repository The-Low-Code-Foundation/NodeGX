---
id: P112-OWN018-IMAGECACHE
title: "One image anywhere in a request turns Mistral's prompt cache off for the whole request, and render_report put screenshots inline — so after a Mistral agent's first render every step was full price until a compaction dropped the image"
status: fixed
severity: high
area: mcp / render_report + drive_page screenshot delivery (`packages/noodl-mcp/src/tools/renderTools.ts`, `--screenshots-to-files`); create-nodegx's OpenCode and Vibe configs; the Mistral behaviour itself is not ours
found: P112 OWN-018 s2, 2026-10-13 (Mistral Large 4 in OpenCode, quiz runs 1, 4, 6; requests recorded by own-018/record-proxy.mjs)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-018-A-STRANGER-ON-MISTRAL.md §14
regression: packages/noodl-mcp/tests/own018ScreenshotsToFiles.test.ts
---

**Measured against api.mistral.ai** with run 6's recorded requests replayed (`max_tokens: 1`, a fresh nonce at the
top of the system prompt so nothing was cached before):

| pair (each extends the one before exactly) | 2nd request cached |
|---|---|
| req-13 → req-14 (no image in the history) | 26,092 of 43,320 |
| req-22 → req-23 as sent (two screenshots in one tool result) | **0** of 96,465 |
| the same with the 19 revealed tools removed | 0 |
| the same with each image replaced by a text line | **93,676 of 96,100** |
| the same with each image replaced by a 1×1 PNG | **0** |

So it is any image part, not size, tools, timing or OpenCode: the requests extend each other exactly (checked by
character), carry a stable `prompt_cache_key`, and the tool list is identical from request to request.

**What it explains:** run 1's misses began at the step after its full-screenshot `render_report`, not at 128k
tokens (P112-OWN018-CACHE128K was that misreading); run 4 lost its cache after looking at screenshots; run 6 got it
back after a compaction dropped the images and lost it again at the next screenshot.

**Fixed (kit, mitigation):** `noodl-mcp --screenshots-to-files` — `render_report` with no `out_dir` writes into
`<project>/.previews/render` and returns the manifest instead of inline images; `drive_page` screenshot steps default to
`<project>/.previews/drive`; the manifest says that each image opened stays in the conversation and, with some models,
leaves every later request uncached until a compaction. `create-nodegx` puts the flag on the server in
`opencode.json` and `.vibe/config.toml` only: Claude caches across images, so `.mcp.json` keeps the inline default.
Tests: own018ScreenshotsToFiles (5; sabotage → the with-flag test fails), fld011OutDir and renderTools unchanged.

**Not ours, still true:** an agent that opens a screenshot puts it back in its history. The manifest asks it to open
only the ones it needs; OpenCode's compaction is what clears it.
