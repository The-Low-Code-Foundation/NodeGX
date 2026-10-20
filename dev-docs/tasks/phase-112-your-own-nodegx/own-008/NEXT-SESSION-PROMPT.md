# Lane 2 next session: Richard's looks (OWN-008 AC4, OWN-017 AC4)

Opus. Say so at the start (README §0.2). Read [OWN-008](../OWN-008-THREE-STRANGERS.md) §6 s2–s4 first. AC1–AC3 are
met, and FORMAT4PIN was fixed in s4. The three strangers' records are in `table/`, `blocks/` and `map/` here.

1. ✅ **OWN-017 AC3 is met (s5, 2026-10-18)**: [OWN-017](../OWN-017-THE-LINGO-APP-IN-OUR-OWN-EDITOR.md) §7 "Lane 2
   s5". The edited copy opens in the dev editor with 0 warnings, the same as a pristine control, and opening wrote
   only `.mcp.json`, `CLAUDE.md` and `AGENTS.md`. s16's edited copy had been lost from its scratchpad, so s5 made
   the edits again through the stranger's editor (`own-017/ac3/`). 🔴 In s4, the "three Electron editors" that
   held this item back were probably MCP servers: every `noodl-mcp.cjs` runs from `node_modules/electron/dist`. Read
   the full command (`ps -o command= -p <pid>`) before you call a process an editor.
2. ✅ **AC4 of OWN-008 and OWN-017 are met (s6, 2026-10-18).** His words are quoted in OWN-008 §6 s6 and OWN-017 §7
   "Lane 2 s6". Big Blocks he'd keep; the map is "visually impressive", the ships "a bit silly looking"; the table
   is "Nope" and isn't carried forward. **Next in the lane: [OWN-012](../OWN-012-THE-SCREEN-FROM-THE-DESCRIPTIONS.md)**,
   the screen drawn from the node specs (Opus for step 1, Fable for steps 2–3; say which you're on). 🔴 Ports: Le
   Chonk's game (OWN-022) holds `127.0.0.1:4871–4874`. Express binds `*:P` beside it without an error, and a `curl`
   to 127.0.0.1 then answers from the game (s6 lost one of Richard's tries that way). Check the one port with
   `lsof -nP -iTCP:<p> -sTCP:LISTEN`, not a cut-off list.
3. **The next npm cut (lane 1, OWN-021 or after) must carry:** `dffbeee00` (NPXPREVIEW: `npx @nodegx/preview` has
   failed since 0.2.0, the command every page gives a person), `12cfc6cf3` (FILESONLY and the brief), `3f62e9643`
   (ESMADAPTER: the suite command loads an `.mjs` adapter on Node before 20.19), and FORMAT4PIN (s4: the reference
   pins on format 4, and the brief's bullet says to). Until then a stranger on kit 0.2.x gets the old reference and
   the old bullet. The root `package-lock.json` still lists two bins for `@nodegx/preview`. That's harmless for
   `npm ci`, and it follows at the next lock refresh.
4. **`test:main` is red at 8 suites** that don't read lane 2's code (P112-OWN008-TESTMAINRED, an inventory with a
   first reading of each). Not lane 2's to fix. Re-run it before you claim a change that the editor imports, and
   compare against those eight by name.
5. The other rows the strangers found (EDITGAPS, LIBRARYFIRST, PREVIEWPAGE, NODESPECBARE, CATEGORY, AUDIT) are low.
   Each is taken when its package is touched (OWN-010).

**To run strangers again** (a fourth wish, or after the brief changes): `own-008/README.md`. Give each lab its own
root this time: in s2 the three shared one, and the finished labs had to be moved out of the next stranger's reach.
Start an editor with `--no-open` where it has one. Big Blocks opens the default browser on Richard's screen
otherwise. The terminal's `claude` is 2.1.251, too old for Opus 5.5: set `CLAUDE_BIN` to the VS Code extension's
`resources/native-binary/claude`.
