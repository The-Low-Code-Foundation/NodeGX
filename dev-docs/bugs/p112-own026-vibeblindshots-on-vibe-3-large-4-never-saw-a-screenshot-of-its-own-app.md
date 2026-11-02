---
id: P112-OWN026-VIBEBLINDSHOTS
title: "On Vibe 3, Large 4 never saw a screenshot of its own app: the vibe profile wrote every screenshot to a file, told the model not to open one, and Vibe 3 cannot open an image file anyway"
status: fixed
severity: high
area: mcp / `--profile vibe` (`packages/noodl-mcp/src/clientProfile.ts`, `src/cli.ts`); create-nodegx's Vibe model entry (`supports_images`)
found: P112 OWN-026 Mistral, re-read 2026-11-02 (Large 4.0 on Vibe 3.0.4), from the Mistral lab's rounds of 2026-10-25
evidence: /Users/Shared/nodegx-lab/own026/mistral/t1-nodegx-1, t2-nodegx-c03..c06 (agent.jsonl); own026-mocks/vibe304-render3, vibe304-img
regression: packages/noodl-mcp/tests/own019ClientProfile.test.ts
---

**What happened.** The Mistral lab's NodeGX arm (re-run with renders working) called `render_report` 6–13 times and
`drive_page` 42–77 times a round, and opened no screenshot: no `read_file` of a `.png`, and no tool result carried an
image. Three things stacked:

1. `--profile vibe` implied `--screenshots-to-files` (`cli.ts`), so `render_report` returned a manifest of paths.
2. The same profile's `imagesCostly` worded the manifest "Each image you open makes every later request of this
   session full price … open one image only at the end" (P112-OWN018-IMAGECACHE, measured on Large 4's preview).
3. Vibe 3's `read_file` returns a PNG as its bytes in text (mock `vibe304-render3`): a file cannot reach the model as a
   picture. Only an image block in a tool result or a user message does. And the kit's Large 4 entry had no
   `supports_images`, so Vibe 3 would have shown it another model's description of an image, not the image.

So every look the arm built was judged from numbers alone. The lab's persistent look failure (number-pad digits
#FFF on #FAF5FF, 1.05:1) is the kind a picture shows at once.

**Measured 2026-11-02:** Large 4.0 (`mistral-large-4` → `mistral-large-4-0`) caches across an image (0 → 22,272 of
22,720 → 22,528, IMAGECACHE's re-measure). With the two profile lines changed in a 0.2.9 tarball, Vibe 3.0.4 hands the
screenshot to the model as an `image_url` part of the tool message (mock `vibe304-img`), and Large 4.0 reads it from a
tool message on the real API (named the page's pale lavender ground and its title).

**Fixed:** the vibe profile no longer implies `--screenshots-to-files` and is no longer `imagesCostly` (the flag
stays for OpenCode's config); create-nodegx's Vibe model entry says `supports_images = true` (43a02f29a). Reaches people
with the next `@nodegx/mcp` and `create-nodegx` release.
