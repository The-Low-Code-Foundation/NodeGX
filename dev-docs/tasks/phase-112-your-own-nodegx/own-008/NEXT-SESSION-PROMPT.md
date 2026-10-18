# OWN-008 next session (lane 2): FORMAT4PIN, then Richard's look

Opus. Say so at the start (README §0.2). Read [OWN-008](../OWN-008-THREE-STRANGERS.md) §6 s2 first: AC1–AC3 are met,
and the three strangers' records are in `table/`, `blocks/` and `map/` here.

1. **P112-OWN008-FORMAT4PIN** (`dev-docs/bugs/p112-own008-format4pin-…`, medium). In a project below format 5, the
   suite's reference must tick run-on-value-change on the nodes it writes, as the `nodegx` server does
   (`packages/noodl-mcp/src/project/runOnChangePins.ts` `pinAuthoredRunOnChange`, ISL-018). Move that plan into
   `@nodegx/project-contract` once, and have the MCP import it. A second copy drifts. Use it in the reference's
   save. Add a fixture script that wires a Run on a format-4 project (`templates/todo-list` is format `"4"`). The
   regression pair: an editor that ticks PASSes, one that doesn't FAILs. Then rewrite the brief's format-4 bullet
   (`packages/create-nodegx/profiles/core/skills/nodegx-your-own-editor/SKILL.md`): today it says to write no key
   until this is fixed. Run the MCP's own `editorSuite.test.ts` and `test:main` before you claim it (memory: an
   export edit can turn the editor's typecheck red).
2. **AC4:** Richard looks at the three editors. Screenshots: `table/table-1-saved.png`, `blocks/blocks-0-changed.png`,
   `map/map-1-rewired.png` and `map/its-own-shots/`. Quote his words in OWN-008 §6.
3. **The next npm cut (lane 1, OWN-021 or after) must carry:** `dffbeee00` (NPXPREVIEW: `npx @nodegx/preview` has
   failed since 0.2.0, the command every page gives a person), `12cfc6cf3` (FILESONLY + the brief), and FORMAT4PIN
   once it's done. The root `package-lock.json` still lists two bins for `@nodegx/preview`. That's harmless for
   `npm ci`, and it follows at the next lock refresh.
4. The other rows the strangers found (EDITGAPS, LIBRARYFIRST, PREVIEWPAGE, NODESPECBARE, CATEGORY, AUDIT) are low.
   Each is taken when its package is touched (OWN-010).

**To run strangers again** (a fourth wish, or after the brief changes): `own-008/README.md`. Give each lab its own
root this time: in s2 the three shared one, and the finished labs had to be moved out of the next stranger's reach.
Start an editor with `--no-open` where it has one. Big Blocks opens the default browser on Richard's screen
otherwise. The terminal's `claude` is 2.1.251, too old for Opus 5.5: set `CLAUDE_BIN` to the VS Code extension's
`resources/native-binary/claude`.
