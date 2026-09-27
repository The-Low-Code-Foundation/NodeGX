# P102 — next session

**Status (s2, 2026-09-24): ✅ CMP-001…006, 008, 009 BUILT, driven 25/25, editor jest 556/556.
Left: CMP-007 — Richard drives it and rules WORTHY. 0.3.0 waits on that ruling.**

Read [README.md](./README.md) §6 (the nine rules) and [CMP-007](CMP-007-RICHARD-DRIVES-IT.md) §4 (rows).

## Start here

1. **Has Richard driven it?** Look for rows 5+ in CMP-007 §4 and a WORTHY / NOT WORTHY line. If he
   has findings, write them as rows **before** fixing anything (§3.2), then fix, then re-drive.
2. **If he has not:** launch the editor (`npm run dev:debug -- --quiet`), open
   `NodeGX test projects/CMP-007 Richard Drive` (a copy of his *Landing page test V2*; it ships Inter
   and Lucide, has 2 shadowed nodes and gradients) and walk CMP-007 §2's six changes with him. RC-5:
   does *a mode, not a replacement* read right from the node's side?
3. **Re-run the drive after any composer change:**
   `node scripts/devtools/drive-cmp001-composer.js --shots <scratch>` against
   `NodeGX test projects/CMP-001 Composer Drive`. Pass `--shots` to a scratch dir unless you mean to
   replace the committed shots. After an edit to `nodegx-project-contract/token-codecs`, **reload the
   editor** (`npm run cdp -- reload`) — the drive otherwise grades the old codec (s2 did, once).

## What you should know

- **One codec module**: `packages/nodegx-project-contract/token-codecs/`. Every `decode` ends with
  `encode(model) === value || null`. Do not add a codec path that skips it.
- 🔴 **The font list offers only faces a visitor will see** (s2): the project's (`projectFontFaces.ts`
  reads module stylesheets, skips `iconset` modules, loads each `@font-face` into the editor as a data
  URI), the three system stacks, and `KNOWN_FONTS` marked `everywhere` — which must stay inside
  `validation/fontFaces.ts`'s no-file list (`tests-unit/cmp-005/project-font-faces.test.ts`).
- 🔴 **A port in two dynamic-port groups is refused by the gate explainer** and then HIDDEN, not
  dimmed. Express an either/or with `!=` in one group (`boxShadowSource != token`). After any
  node-port change run the WHOLE editor jest (`cd packages/noodl-editor && npx jest --maxWorkers=4`),
  not only `tests-unit/cmp-*` — s1 left five cross-phase suites red that way.
- 🔴 **MCP jest has 7 red files that are NOT P102's** — measured s2 in a clean worktree at
  `dee6e5ab8^`: identical failures (`cmp001InterfaceDoctrine`, `cmp004Parts`, `cmp004RoundTrip`,
  `cn004`, `d54ThemePresetIdentity`, `def038SettledTemplates`, `nodeIdAllocation`). Two more DEF-038
  arms (`planning`, `planning-demo`) go red only with the P78 peer's open template edits.
- 🔴 **`requestAnimationFrame` never fires in a hidden window.** The draft throttle is a 16 ms timer.
- 🔴 **MCP budgets**: prompt 4,324 / 4,400 and surface 8,255 / 8,280. A red is answered by cutting.
- `dist/noodl-mcp.cjs` rebuilt s2 with the one-group shadow condition. A catalog regen is a merge:
  run it only with no other node-source edits in the tree.
- **P103** holds everything beyond RC-1, now including the 25 web fonts (its *Font browser* row).
