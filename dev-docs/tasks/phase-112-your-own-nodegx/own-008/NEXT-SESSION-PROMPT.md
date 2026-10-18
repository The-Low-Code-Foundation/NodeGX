# Lane 2 next session: OWN-017 AC3's open, then Richard's looks

Opus. Say so at the start (README §0.2). Read [OWN-008](../OWN-008-THREE-STRANGERS.md) §6 s2–s4 first. AC1–AC3 are
met, and FORMAT4PIN was fixed in s4. The three strangers' records are in `table/`, `blocks/` and `map/` here.

1. **OWN-017 AC3, the half that's owed** ([OWN-017](../OWN-017-THE-LINGO-APP-IN-OUR-OWN-EDITOR.md) §7 s16): open
   the lingo app, after s16's edits, in the official editor (the dev build) and read its diagnostics. AC3 passes when
   there are none that are new, and nothing is rewritten on open but the known OPENWRITES. Drive a copy, never the
   folder itself (memory: drive a COPY; OPEN WRITES 3). s4 didn't start it: three Electron editors from other
   sessions were open, and a third launch hangs in AppKit's reopen prompt. Check `ps` for editors first, and launch
   only on a box with none of yours running beside a peer's.
2. **AC4 of OWN-008, and OWN-017's, are Richard's.** OWN-008: his reading of the map's third round, the Star Wars
   battle (`map/round3/`, play server `:8604`), then the table and Big Blocks (`table/table-1-saved.png`,
   `blocks/blocks-0-changed.png`). OWN-017: his edit hit DEEPLINK in s16 (fixed since), so his words on a working
   edit are still to be quoted. Quote him in each task's §6 or §7.
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
