---
id: P128-S3-SIGNBROKEN
title: "`@anthropic-ai/mcpb` 2.1.2 (the latest) `sign` appends the signature after the zip's end record while declaring a zero-length comment, so a signed `.mcpb` is a malformed zip that strict readers refuse, and its own `verify` says \"Extension is not signed\" about the file it just signed"
status: open
severity: medium
area: "upstream `@anthropic-ai/mcpb` 2.1.2 (`sign`, `verify`); ours: nodegx-studio `scripts/mcpb.mjs` (pins `MCPB_CLI = '@anthropic-ai/mcpb@2.1.2'`, signs nothing today)"
found: P128 S3 follow-up, 2026-10-27, Richard asked to try signing the `.mcpb` after his AC8 run showed Desktop's "not verified by Anthropic" warning
evidence: "MEASURED on a copy of `nodegx-0.2.8-darwin-arm64.mcpb`: `mcpb sign test.mcpb --self-signed` → \"Successfully signed\"; `mcpb verify test.mcpb` → \"ERROR: Extension is not signed\"; the end-of-central-directory record declares a 0-byte comment and 2,264 bytes follow it (Python's zipfile and `unzip -l` still open it; a strict reader refuses). `npm view @anthropic-ai/mcpb version` → 2.1.2 (modified 2026-10-07). Community reports of the same: \"Invalid comment length\" from Claude Desktop on a signed bundle, `verify` unimplemented (modelcontextprotocol/mcpb #277, #278 open)."
launch: none
owner: none
---

Signing is not a route today. A signed bundle risks Desktop refusing the install, and nothing measured says a
signature would change the install sheet: its sentence, *"Any developer information shown has not been verified by
Anthropic"*, is about Anthropic's verification, which a signature of ours cannot give, and the directory no longer
lists `.mcpb` extensions (`claude.com/docs/directory/publish`: "Desktop extension listings in the directory are
deprecated").

**Proposed.** Do not sign until the CLI writes a declared comment (re-measure: sign, then check the EOCD comment
length equals the bytes after it, then `verify`). Then one experiment before any certificate is bought or exported:
a self-signed build double-clicked in Desktop, to see what the sheet says for a signed extension. Until then the
trust work is the copy: /start says what the warning means before the person sees it.
