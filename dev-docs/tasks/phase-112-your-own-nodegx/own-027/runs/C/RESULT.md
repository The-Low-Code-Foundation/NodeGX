# OWN-027 arm C (ceiling): Opus by hand through the normal door

**Run 2026-10-28, 13:38–13:41 CET.** The builder was Opus 5.5, this session. It used the session's `nodegx` MCP server, which
runs this checkout's `packages/noodl-mcp/dist/noodl-mcp.cjs` (built 2026-10-27 22:19, the same code as arm T's
`bin/noodl-mcp.js`).
**Prompt:** *"Make me a puppy adoption landing page please, blue colour theme, modern style."*
**Project:** `~/vscode_projects/NodeGX test projects/own-027-C/`, fresh from `create_project`.

## What was done, in the order the server instructions give

1. `create_project`. It returned 18 more tools and the guidance.
2. `get_style_vocabulary`, which returned tokens, element looks, 30 compositions, 5 presets, the glyphs and the imagery.
3. `call_tool` describe for `set_style_preset` and `set_project_tokens`, then `set_style_preset modern`, which set 0 tokens.
   The default `--primary` is already blue (`#3b82f6`).
4. `get_component Pages/Home` and `get_node_type` for 6 types.
5. `create_plan` with 3 operations: `Components/PuppyCard` (4 inputs), `Components/StepItem` (3 inputs) and `Pages/Home`.
6. Three `stage_plan_operation` calls, then `apply_plan` with `render: summary`.
7. One `update_component` to fix the only warning, then `render_report` (first refused, see below).

## Measures

| Measure | Value |
|---|---|
| Wall clock | about 3 minutes (create_project 13:38:15 → screenshots 13:40:50) |
| MCP calls | 14 (counted from the transcript) |
| Model calls | Opus, one conversation; not comparable call for call |
| Validator rejections (errors) | 0 |
| Validator warnings | 1: `text-cannot-wrap` on the hero badge's sentence. Fixed by shortening the text to "Now adopting" |
| Tool refusals | 1: `render_report out_dir` outside the project is refused, and the refusal names the fix |
| Nodes | Page 51 (info `oversized-page`), PuppyCard 7, StepItem 6 |
| Render | clean: desktop 1280×2710, phone 390×4457, 0 overflowing, scrollWidth 390 = layout width, 0 console errors, 0 low contrast, 0 broken images |
| `grade-url.mjs` | see `TABLE.md` (run once for both arms, after arm T, one heavy job at a time) |

Screenshots: `shots/pages-home-desktop.png`, `shots/pages-home-phone.png`.

## The credible checklist (Opus, from the screenshots)

| Item | Read |
|---|---|
| The headline says what the page is for | ✅ "Find the puppy who's been waiting for you" |
| One palette, one type pairing, read as a choice | ✅ a blue gradient for the hero and the closing band, slate neutrals, Inter throughout |
| The sections follow a sensible order | ✅ hero → meet the puppies → how it works → testimonial → CTA → footer |
| A call to action exists and reads as one | ✅ "Meet the puppies" in the hero, "Start your application" in the closing band |
| Nothing overflows at phone width | ✅ (render_report: 0 overflowing) |
| No console errors | ✅ (render_report) |
| "Would I put my name on it as a first draft?" | ✅, with one visible miss: **the same dog photo appears four times** (hero + three cards), because the starter imagery has exactly one dog. Filed as `P112-OWN027-ONEDOG` |

**Richard's eye decides.**
