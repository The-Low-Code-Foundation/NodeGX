---
id: P112-OWN019-PRESETFONTS
title: "From npm, set_style_preset names a typeface it cannot install — `@nodegx/mcp` ships no preset font files, so the preset sets --font-sans to a face that never loads and the page paints in the system font"
status: fixed
phase: P112
task: OWN-019
severity: medium
area: mcp / packaging (`packages/noodl-mcp/package.json` `files` + `prepack`; `src/presetFontFiles.ts` `resolvePresetFontRoot` finds `dist/preset-fonts` or a checkout)
found: P112 OWN-019 s4, 2026-10-14 (the Launch brief's Sonnet yardstick l0, on tgz27)
evidence: dev-docs/tasks/phase-112-your-own-nodegx/OWN-019-THE-VIBE-KIT.md §7 (s4)
regression: packages/noodl-mcp/tests/own019PresetFonts.test.ts "lists dist/preset-fonts in the package and makes it at prepack, removes it at postpack"
kit: mcp
---

The Launch brief asks the agent to choose the type. Sonnet (l0) applied `set_style_preset("soft")`; the answer listed
`--font-sans` among the tokens it set and `fonts: {added: [], failed: "The preset font files were not found beside
this server or in a checkout above it. Set NODEGX_PRESET_FONTS_DIR."}`. The three preset faces (DM Sans, Nunito,
Source Sans 3; 276 KB, OFL) live in `packages/noodl-editor/src/assets/preset-fonts`; the editor app ships them beside
its server (`extraResources`), the npm package never did. Every npm-kit app that took a preset's typeface painted in
the system font, with the preset's token still naming the face.

Related, not the same: P112-OWN018-NOSTARTERASSETS (`create_project` installs no starter Inter, icons or imagery).

**Fixed:** `build-preset-fonts-copy.mjs` copies the folder to `dist/preset-fonts` at `prepack` (removed at
`postpack`, like the backend and the render harness), and `files` lists it. Proven on the packed tarball (tgz28): a
preset applied from it reports its font folder added.
