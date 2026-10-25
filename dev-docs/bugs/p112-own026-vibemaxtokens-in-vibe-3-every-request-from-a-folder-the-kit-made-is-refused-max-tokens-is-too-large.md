---
id: P112-OWN026-VIBEMAXTOKENS
title: in Vibe 3, every request from a folder the kit made is refused ("max_tokens is too large")
status: fixed
severity: high
area: create-nodegx / .vibe/config.toml (renderVibeConfig, the Large 4 model entry)
found: P112 OWN-026 Mistral lab, 2026-10-24 (the first real chain: 11 rounds, all refused on their first request)
evidence: /Users/Shared/nodegx-lab/own026/mistral/t1-nodegx-1.infra-broken-maxtokens/sittings/1/out/export.json; dev-docs/tasks/phase-112-your-own-nodegx/own-026/MISTRAL-PLAN.md §6
commit: fix(p112-own026-vibemaxtokens) on cline-dev, 2026-10-25 — 16efb1b30 + ab9546ad0 from own026-all0107-pack
regression: packages/create-nodegx/test/create.test.js "P112 OWN-018: Mistral Vibe gets Large 4, the same pinned server, and permission for the bootstrap tools"
---

A person runs `npm create nodegx -- <folder> --vibe`, opens the folder in Mistral Vibe 3.0.2 and asks for anything.
Vibe ends at once, before the model says a word:

```
API error occurred: Status 400. Body: {"message":"max_tokens is too large: 985127. This model supports at most
262144 completion tokens, whereas you provided 985127.","type":"invalid_request_max_tokens","code":"3058"}
```

Cause: the kit's Large 4 entry says `max_context_length = 1000000` and sets no output cap. Vibe 3 then asks for
the whole leftover context as `max_tokens` (1,000,000 − the prompt), and Mistral's API allows at most 262,144
completion tokens. Measured with one-word prompts: that entry gives the 400; the same entry plus
`max_output_tokens = 32768` answers ($0.007). Vibe 2.26.1, which the kit was written against, didn't send it this way.

Where: `packages/create-nodegx/bin/create-nodegx.js` `renderVibeConfig()`, the `[[models]]` lines.

Fix, one line: `max_output_tokens = 32768` (Vibe 3's `ModelConfig.max_output_tokens`; a model entry for 2.26.1 with
an unknown key should be checked first). Plus a create.test.js line that pins it.

**Fixed on the pack branch, not yet on cline-dev:** `16efb1b30` on `own026-all0107-pack` (Richard 2026-10-24: "fix the kit"); the lab kit is `/Users/Shared/nodegx-lab/kits/ALL-0107-VIBECFG-16efb1b30/`. To close this: cherry-pick it onto cline-dev, then set status `fixed` with that commit.

**Corrected the same night:** 32,768 was too small. Large 4 on `thinking = high` spent it all reasoning and stopped on `finish_reason: "length"` before its first tool call. The value is now the API maximum, 262,144: `ab9546ad0` on `own026-all0107-pack` (kit `ALL-0107-VIBECFG-ab9546ad0`). Cherry-pick both `16efb1b30` and `ab9546ad0` onto cline-dev to close this.

## Fixed on cline-dev (2026-10-25)

Both pack-branch commits applied to cline-dev: the Large 4 entry says `max_output_tokens = 262144`, and create.test.js
pins it. The worry above about 2.x is answered: Vibe 2.26.1's `ModelConfig` has the same field
(`max_output_tokens: int | None`, read by its Unified Harness only), so the entry is valid on both versions. Reaches
people with the next `create-nodegx` / `create-nodegx-vibe`.
