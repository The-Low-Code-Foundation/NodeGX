# ISL-007 — An app speaks two languages without a script

**Status:** 🟡 **s11: AC6 ruled "Warn if app translates" and BUILT (`typed-word-not-translated`, §8 s11). Open: AC4 (→ IW-010).** Ruled s4 (2026-10-02): **"Adopt the add-on"** — `library/modules/i18next-translation`, its gaps fixed and taught to agents (README §8). s7: AC1 read (288 of 334 texts switch, 0 braces, the route costs 16 placements + 342 KB); the module's source recovered from its map. **s8: BUILT — module 1.1.0 rebuilt from its recovered sources (no install, root lock untouched); AC2, AC3, AC5 ✅ (spec 5/5, imported module 1/5; deployed drive 16/16, control 5/5); AC8 recorded in P47. Open: the "words for this page" clause, AC4 (the island moves), AC6 (the door). s9: AC7's catalog half ✅ (each node says what it does to an agent; was a dead URL).** Scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F10](AUDIT-2026-10-01.md) · the island's 693-row word table and `Logic/Translate words` · the same need met by [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md) §2.6 (Static Data route) and [TPL-011](../phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md) (i18next route)
**Side:** product (a translation primitive, or the shipped i18next module) — and a scope ruling against [P47](../../tasks-archive/phase-47-internationalisation/README.md)

Olive's Island is in French and English. Every word on screen is a row `{ key, en, fr }` in one Static Data table. A Function
with 695 generated output lines turns the table into one output per word, and that Function is placed 16 times. NodeGX
already ships two other answers (a translation module, and a whole phase specced for this), and the template used neither.

## 1. The person sentence

**An author adds French to an English app by filling in a table of words, and every word on screen changes when the
person picks Français, with no script. A word with a name in it ("Well done, {name}!") shows the name, never the braces.**

## 2. What was measured

HEAD `27d891bf3`, 2026-10-01. Every row was re-read by this task's author at HEAD unless it says otherwise.

| reading | where |
|---|---|
| `Data/Words` holds one Static Data node whose `json` is **693 rows** of `{ key, en, fr }`, **89,117 bytes** (the file is 101,771). Re-read at HEAD | `templates/bot-garden/components/Data/Words/nodes.json` (parse) |
| `TRANSLATE_ALL_SCRIPT` builds `map[key]` from the rows for the chosen language, fills **only `{b}`** (the robot's name), then writes one literal `Outputs.<key> = map.<key> \|\| ''` per key. Re-read at HEAD | [`cg003Scripts.ts:856-866`](../../../packages/noodl-mcp/tests/cg003Scripts.ts); the older `TRANSLATE_SCRIPT` at [`cg002Scripts.ts:2310-2324`](../../../packages/noodl-mcp/tests/cg002Scripts.ts) |
| `"/Logic/Translate words"` appears **16** times across the template's components (placements). Re-counted at HEAD | `grep` over `templates/bot-garden/components/**/nodes.json` |
| The table uses **25 distinct placeholders**: `{b}`, `{n}`, `{m}`, `{name}`, `{who}`, `{trick}`, `{plot}`, `{reward}` and 17 more. Translate words fills `{b}` only. The others are filled downstream by two copies of one helper, `fill()` (`cg003Scripts.ts:90`) and `fillIn()` (`:1029`), inside other Functions. 🔴 **The audit's "any other placeholder renders as raw braces" is not measured.** Whether any word with a non-`{b}` placeholder reaches a Text unfilled was not checked here; AC1 checks it | parse of the table; `cg003Scripts.ts:90, 1029` |
| **Existing solution 1: the `i18next Translation` module** ships in the library (`library/modules/i18next-translation`, v1.0.4, imported 2026-07-25). Three nodes: `i18next` (Language in, Change Language, Language Changed out, Current Language out), `Language Bundle` (a JSON bundle per language and namespace, or an external bundle path, plus single resource adds) and `Translation` (Key, Namespace, Variables list → Translation). It detects the browser language. Re-read at HEAD | `library/modules/i18next-translation/project/noodl_modules/i18next-noodl/index.js` (minified; node definitions read by grep) |
| It is **measured working** by TPL-011 s3: through the door, exported, in headless Chrome, French at load (*"contente", "1 pomme", "3 pommes"*), then English live after a switch. Its own caveats, recorded there: i18next v19 plurals are `key` / `key_plural`, a context needs its base key, and **interpolations escape HTML unless written `{{- x}}`**. Its placeholder syntax is `{{x}}`, not `{x}`. As recorded 2026-09-27; not re-driven here | [TPL-011 lines 276-283](../phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md); `packages/noodl-mcp/tests/tpl011I18nSpike.ts` |
| Who uses it at HEAD: `templates/nightbook` (**22 `Translation`**, 2 `Language Bundle`, 4 `i18next` nodes, about 250 strings through a `UI/T` component) and `templates/digital-bricks-training` (English only). Re-counted at HEAD | `grep` over `templates/*/components` |
| Its cost shape: **one `Translation` node per word on screen.** A page showing 40 words places 40 nodes (or 40 instances of a `UI/T` wrapper). Translate words was the opposite trade: one node, 695 outputs | read from the node definitions |
| **Existing solution 2, specced, not started: [P47 Internationalisation](../../tasks-archive/phase-47-internationalisation/README.md)** (9 tasks, about 7 weeks, "Post-alpha"). INT-001: a `nodegx.strings.<locale>.json` string table keyed by component, node and port, never by the string. INT-002: translatable parameters at the `Ports.renderParams` seam. INT-005: a runtime locale, `<html lang>`, resolution order. INT-009: MCP `list_strings` / `set_translations`. Richard's words there: the old module's UX was poor ("you had to maintain your own JSON file") | P47 README lines 1-20, 62-80 |
| P65 left *"the i18next-translation vs phase-47 check"* undone: *"nobody was assigned"*. Re-read at HEAD | [P65 TASKS.md lines 80, 145](../../tasks-archive/phase-65-the-library/TASKS.md) |
| `intl-format` (Relative Time, Format Number and two more, all on `Intl.*`) covers formatting, not words. Re-read at HEAD | `library/modules/intl-format/README.md` |

## 3. Where it bites a person

- Every French-speaking family the templates are made for (P95, P105, the girls' journal). Three templates in a row built
  their own translation: Static Data plus a String Mapper (TPL-007), i18next (TPL-011), and Static Data plus a generated Function
  (the island).
- An agent asked for "a bilingual app" has no single answer to give, so each one invents a route, and the door has no tool
  that lists strings.
- A placeholder filled in one Function but not another is invisible until a person reads the screen in the second language.

## 4. Related work and collisions

- **[P47](../../tasks-archive/phase-47-internationalisation/README.md)** owns the whole design (string table, translatable parameters, locale,
  panel, agent contract). **This task must not build a rival to INT-001.** Ruling 1 decides whether P109 delivers a slice of
  P47 or adopts the shipped module.
- **[P41 ACC-005](../../tasks-archive/phase-41-accessibility/README.md)** (the document shell's hardcoded `lang="en"`) meets INT-005. A language
  switch should set `<html lang>`.
- **ISL-006** (F09): the 695-output Function exists only because ports come from text. If this task removes Translate words,
  ISL-006 loses its largest consumer. Sequence: this ruling first.
- **ISL-005** (F08): the duplicated `fill` / `fillIn` helpers.
- **P88 [GAM-018](../../tasks-archive/phase-88-the-defects-the-games-found/GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)**:
  `i18next-noodl` is one of the 13 modules that assign `Noodl.defineNode=` unconditionally. Any adoption of the module inherits
  that finding.
- **P93 vocabulary gate memory** ("WORDS: gate by CONTEXT"): a gate over visible strings must read context, not text.
- Owner grep: `grep -rn -i "i18n\|i18next\|translat\|internationali" dev-docs/tasks --include='*.md' -l` → P47 (owner of the
  design), P65 (the unassigned check), TPL-007, TPL-011 (consumers), GAM-018 (registration). Nobody owns "the island's words".

## 5. Design — 🔒 rulings first

1. 🔒 **Which answer does NodeGX give today?**
   (a) **Build P47's first slice now:** INT-001's string table plus the runtime-locale half of INT-005, enough for a Text to show
   a keyed string in the chosen language. It would be built *as* P47 tasks, recorded there.
   (b) **Adopt the shipped i18next module** as the answer: fix what TPL-011 measured (HTML escaping, `{{x}}` placeholders),
   teach it in the door and the catalog, and make a "words for this page" pattern cheaper than one node per word.
   (c) **A small built-in node:** a word table, a Language input, one typed output per key (from the table, not a script).
   *Recommendation: (a).* It is the position Richard already endorsed in P47 ("a property of what the tool emits"), and (b)
   is the module he called poor UX. (c) is a third design to retire later. If (a) is too large for P109, the fallback is (b) with
   the module's gaps fixed, and the island moved onto it as the measurement.
2. 🔒 **Placeholder syntax.** `{name}` (what the island, String Format and TPL-007 use) or `{{name}}` (i18next)? And who fills it,
   the translation primitive or the author? *Recommendation: `{name}`, filled by the primitive from named inputs. A brace left
   unfilled is a visible warning in the editor, not a silent `{n}` on screen.*
3. 🔒 **Where the chosen language lives.** In the app's storage (as the island's family model holds it), in the browser's
   language, or in the URL (INT-007)? *Recommendation: P47 INT-005's order (explicit, route, browser, project default), with
   "explicit" persisted.*

Constraints: a switch updates every visible word without a reload. A missing translation falls back to the base language and
is counted. The door can list and set strings in one call each (INT-009's shape), not N.

## 6. Acceptance criteria (apply after the rulings are recorded in §8)

| AC | Clause |
|---|---|
| AC1 | **RED at HEAD, recorded in §8.** On the deployed island, switch EN → FR and read every visible Text on the five main pages. Record: (i) the count of words that changed; (ii) every string that still contains `{…}`, which tests the audit's inferred brace claim either way; (iii) the number of nodes and bytes that produce the words (Translate words × 16 plus the table). Known-firing control: a page where a `{b}` word shows the robot's name in both languages. |
| AC2 | **The person sentence, in a browser.** A new project: three Texts in English, a table with French, and a language switch made of nodes only. Drive it: the three Texts change on switch with no reload, and `<html lang>` follows (if ruling 3 includes it). A word with `{name}` shows the name in both languages. |
| AC3 | **Braces never reach the screen.** A word whose placeholder has no value shows a warning in the editor (named by key), and the deployed page shows the ruled fallback, never `{name}`. Sabotage arm: drop the check and AC3's page shows braces; the spec goes red. |
| AC4 | **The island moves onto it.** `Logic/Translate words` and `TRANSLATE_ALL_SCRIPT` are deleted (or reduced to what the ruling keeps). The garden gates and the FR/EN drives are green. Record the bytes and node counts beside AC1(iii). |
| AC5 | **Escaping, measured.** A word containing `&`, `<` and an apostrophe (French: *l'île*) shows as typed in a Text, in both languages. This is TPL-011's escaping finding made into a gate. |
| AC6 | **The door.** An agent lists the strings of a project and sets a French column in one call each. `validate_component` warns on a hard-coded literal in a translatable port only on a project that has opted in (INT-009's rule). |
| AC7 | **If a new node type or module surface is made:** catalog entry, picker placement, docs page, enrichment and a `coverage-ledger.json` row (translated, or deferred with a reason), as P88 GAM-013 did. If ruling 1 is (b), the module's docs page and its catalog entries are checked instead. |
| AC8 | **Record in P47.** Whatever is built is recorded in P47's README against INT-00x, so that phase does not rebuild it. P65's unassigned check is answered there. |

## 7. Traps

- **Two shipped answers already exist.** Building a fourth without ruling 1 repeats what the three templates did.
- **i18next escapes interpolations by default** (TPL-011). An `&` in a name becomes `&amp;` on screen. AC5 is there for it.
- **Placeholders live in two places at HEAD** (Translate words fills `{b}`, and `fill` / `fillIn` fill the rest elsewhere). A
  migration that keeps only one filler breaks the others silently. AC1(ii) is the before-reading.
- **A drive that reads one language grades nothing about the switch.** Read both, and read after a switch with no reload.
- **A vocabulary gate over visible strings must read context** (P93 memory: 1192 false hits against 20 real ones).

## 8. Session log

### Session 7 — 2026-10-03: AC1 read; the module read from its own source

**AC1 (the before-reading), on a `nodegx deploy` of `templates/bot-garden` at `faafbcdd4` (exit 0).** New drive
[`drive-isl007-words.js`](../../../scripts/devtools/drive-isl007-words.js) (AC4 re-runs it): a new player, then on five
pages every visible text keyed by its DOM path, read in English, FR pressed live (no reload), read again; every press
checked with `elementFromPoint`. Exit 0.

| page | texts in both | changed on FR | unchanged (all names, symbols, band and language buttons) |
|---|---|---|---|
| Island | 66 | 45 | 7–9, 10–12, EN, FR, Ada, Sami, Mamie Rose, Biscuit, → |
| Workshop (free play) | 39 | 31 | 7–9, 10–12, EN, FR, Ada, +, −, ⤢ |
| My robots | 118 | 112 | 7–9, 10–12, EN, FR, Ada, Cobble |
| Skills | 70 | 65 | 7–9, 10–12, EN, FR, Ada |
| Grown-ups | 41 | 35 | 7–9, 10–12, EN, FR, Ada, — |

- (i) **288 of 334** texts change; no English is left on screen in French.
- (ii) **0** strings show a `{…}` placeholder, in either language. On these five pages, for a new player, the audit's
  inferred brace leak does not happen: whatever of the other 24 placeholders these states show was filled downstream
  (`fill` / `fillIn`). This does not reach states a new player never sees (a robot at work, a win card, Olive's lines).
  Control: Pip's name (a `{b}` word) is on screen in both languages on all five pages.
- (iii) The route: `/Logic/Translate words` placed **16** times (one per page or panel: Top bar, Profiles form, the six
  pages, four Grown-ups panels, Shop, Robot options, Olive lessons, Workshop Play); its component file **243,961 bytes**
  (762 `Outputs.` lines); `Data/Words` **760 rows**, the table **98,491 bytes** (693 rows / 89,117 when scoped on 10-01).
- Two false readings on the way, both from the probe: a create button looked for as "Create" (it is "Let's go!") read
  every page with no player and 0 changed; `/my-robot` is not a route (the tab goes to `/robot`) and read the Profiles
  page. Both are now failures in the drive (the landing check, the per-page changed > 0).

**The module, read from its own source.** `index.js` is a webpack bundle; its map carries `sourcesContent`, and
`src/i18next-module.js` (471 lines) is recoverable from it. What it does (i18next v19 + the browser language detector):

- `i18next` node: Language in, Change Language signal, Language Changed / Current Language out. **The detector picks
  the browser's language at start**; nothing persists a person's choice (ruling 3's "explicit, persisted" is the app's).
  🔴 **Wrong, corrected in s8:** the detector's defaults (`caches: ['localStorage']`, order `querystring, cookie,
  localStorage, sessionStorage, navigator, htmlTag`) store every change under `i18nextLng` and read it first on the
  next load. Measured on the deployed module AS IMPORTED: French kept across a reload (`stored fr`).
- `Language Bundle`: a JSON bundle (or a fetched file) per language and namespace, `addResourceBundle(…, deep, overwrite)`.
- `Translation`: **one node per word.** Key (a `{x}` in the KEY builds the key from an input), Variables (a list; each a
  port; `count` parsed as a number), one Translation output. A **missing key sets nothing**: the output keeps its last
  value, silently (no warning; the line that would say so is commented out).
- **Escaping is on** (`escapeValue: true` in both copies of the defaults in the bundle): an interpolated `&` becomes
  `&amp;` on screen (TPL-011's finding). The fix is one init option, `interpolation: { escapeValue: false }`: a Noodl Text
  renders text, so escaping is a double encoding there, as react-i18next sets it.
- A placeholder in a TRANSLATION is i18next's `{{name}}`, fed through Variables. A missing variable: not yet measured
  (AC3).

**Ruling 2 (placeholder syntax), settled by the existing mechanism, not re-asked:** the add-on's own `{{name}}`. Changing
its interpolation to `{name}` would break every string already written for it (nightbook's ~250, the DBT template) and
every i18next page a person or an agent reads. The island's 25 `{x}` placeholders convert mechanically when it moves
(AC4). Recorded here so a later reader sees it was a choice.

**The build route, and why it is not started this session.** Fixing the module means rebuilding the bundle from the
recovered source with i18next as a dependency, and i18next is in no `node_modules` in the tree. Adding it touches the root
`package-lock.json`, which holds a peer's uncommitted edit today (2026-10-03). Next: (1) put the recovered source in the
repo beside the module with a build script; (2) the escaping option and a missing-key warning; (3) AC2's new-project drive
with AC3 and AC5's cases in it (`&`, `<`, *l'île*, a missing variable); (4) a "words for this page" shape cheaper than one
node per word, the ruling's third clause; (5) then AC4, the island moved, with `drive-isl007-words.js` re-run beside
this table.

### Session 8 — 2026-10-03: built (module 1.1.0); AC2, AC3, AC5 driven

**The build route that does not touch the root lock.** `package-lock.json` still held the peer's edit (mtime Sep 24;
its diff is the REVERSE of `a9c10ff8c`'s node-spec entries plus an editor version, so not mine to touch). Nothing had
to be installed: the map carries every file the bundle was built from, so all 14 are recovered into
[`src/`](../../../library/modules/i18next-translation/src) (the module) and `src/vendor/` (i18next 19, the detector,
ten Babel helpers, the Noodl SDK; one import path fixed; [vendor README](../../../library/modules/i18next-translation/src/vendor/README.md)),
and [`build.mjs`](../../../library/modules/i18next-translation/build.mjs) bundles them with the repo's esbuild through
aliases. Deterministic (built twice, `cmp` equal). ⚠️ `dist` is gitignored repo-wide, so the vendor paths are flat.
Parity: the verbatim source rebuilt reads exactly as the imported bundle in the spec below (the same 3 red, the same
1 green) before any edit.

**What changed in the module** (`src/i18next-module.js`, version 1.0.4 → 1.1.0):
1. `interpolation: { escapeValue: false }`.
2. `translate()`: a `{{variable}}` with no value → `''` in its place and a warning naming the word and the variable
   (i18next's per-call `missingInterpolationHandler`); a key in no bundle → `''` and a warning naming it; an EMPTIED key
   → `''`, no warning (P78-TPL011-TRANSLATION, open since 09-26: the last word stayed on screen).
3. `<html lang>` follows `languageChanged` (P41 ACC-005's hard-coded `lang="en"`, for these apps).
4. `onNodeDeleted` unhooked `added` from i18next instead of its store (a listener leak).

**Measured, i18next v19 as imported, before the fix:** a missing variable is replaced by `''` silently (the logger warns
only with `debug`), so braces never reached a screen — the risk was silence, not braces. An `&` in a WORD is shown as
typed; only interpolated VALUES were escaped.

| AC | reading |
|---|---|
| AC2 | ✅ **A new project, deployed.** [`isl007-two-languages/`](isl007-two-languages) built through the door by [`isl007TwoLanguages.ts`](../../../packages/noodl-mcp/tests/isl007TwoLanguages.ts) (0 errors; no Function node; the switch is Button → Set Variable → i18next). `nodegx deploy … --allow-development-engine` exit 0. [`drive-isl007-two-languages.js`](../../../scripts/devtools/drive-isl007-two-languages.js), browser `en-GB`, nothing stored: a name typed, EN read, FR pressed (reach by `elementFromPoint`), FR read in the same document (marker kept: no reload), reloaded (still French), EN pressed. **16/16**; console errors 0. `<html lang>` `en-GB` → `fr` → (reload) `fr` → `en`. |
| AC3 | ✅ **By spec, through the runtime** ([`isl-007-i18next-module.test.js`](../../../packages/noodl-runtime/test/isl-007-i18next-module.test.js): the BUILT `index.js` loaded by `NoodlRuntime.registerModule`, a stub editor connection recording warnings): a bare `{{name}}` shows `Hello ` and warns `"common:greet" … {{name}}`; a key in no bundle shows `''` (not the last word) and warns naming it; the warning goes when the word is found. On the deployed page the bare word reads `Hello` / `Bonjour`, no brace in any of 4 reads. ⚠️ The warning was read through the stub, not in a running editor. |
| AC5 | ✅ `Tom & <Jerry>` typed → `Hello Tom & <Jerry>` / `Bonjour Tom & <Jerry>`; the word `l'île & <mer>` / `the island & <sea>` as typed; `&amp;`/`&lt;` nowhere. |
| control | The module AS IMPORTED (HEAD's `index.js` in a copy of the project): spec **1/5** (fallback green — the known-firing case), drive `--control` **5/5**: `Hello Tom &amp; &lt;Jerry&gt;` on the page, `<html lang>` stays `en` in French. |
| AC7 | 🟡 The module's docs pages carry the new behaviour (`docs-site/imported-prose/modules/i18next/`, regenerated: only the two i18next pages moved, `docs:library:check` clean). ⚠️ A re-import of the prose (`docs:library:import`, pinned) would put the old text back. The node catalog's descriptions were not checked. |
| AC8 | ✅ Recorded in the [P47 README](../../../tasks-archive/phase-47-internationalisation/README.md) status (nothing built as an INT task); P65's unassigned check answered. |

Gates: `library:check` i18next OK (the run's one FAIL is the peer's untracked `nightbook-kit`, no `library.json`);
`tpl011Template.test.ts` 35/35 (the journal template copies this module). Templates that carry their OWN copy of 1.0.4
(`nightbook`, untracked; `digital-bricks-training`) get 1.1.0 when they are next regenerated; not touched here.

Met on the way: the runtime calls `editorConnection.isConnected()` on every signal, so a stub without it throws inside
i18next's event emitter and silently stops every later listener (the switch "happened" with no node told). Recorded in
the spec's stub; a test-harness trap, not a product defect.

**Next:** the ruling's third clause ("words for this page" cheaper than a node per word: the cost is a Translation per
Text, and a Text is there anyway, so first measure what a `T` component costs against Translate words' 16 placements);
then AC4 (the island moves, `drive-isl007-words.js` re-run beside the AC1 table), AC6.

**Later in s8 — the third clause and AC4, measured.** The cheaper page pattern already exists: nightbook's `UI/Say`
(Component Inputs `key` + variables → Translation → Text, placed **152** times where a Text would be). Its third node, a
Function that blanks an emptied key, was the P78-TPL011-TRANSLATION workaround and is no longer needed in 1.1.0. So a page
pays one component instance per word, not a node pair, and no new node is designed. Not taught by the door yet: the door's
examples come from the built-in catalog (AC6). **AC4 cannot be done apart from the island rebuild:** only **94** wires leave
the 16 Translate words (48 Text, 18 Button label, 28 component inputs), while **69 of 88** Functions make words themselves
(fill / fillIn / lookups over the table, placed 6 times). AC4 therefore moves to
[IW-010](../phase-108-the-island-works/IW-010-THE-ISLAND-IN-NATIVE-NODES.md) AC4, the island's own rebuild.

### Session 9 (2026-10-03) — AC7's catalog half, and AC6 read

**What the door said, measured** (`get_node_type` / `list_node_types` through an in-process server on a scratch copy of
`isl007-two-languages/`, read-only): each of the three nodes came back as a port list and a `summary` that was the
**dead URL** `https://docs.noodl.net/modules/i18next/…`. A kit node's `docs` is read as the author's sentence (CN-009,
`noodl-mcp/src/catalog.ts` `summaryOf`), and this module's author wrote a URL, so an agent got nothing about `{{x}}`,
escaping or the warnings. And `list_node_types` `query: "translate"` matched **nothing** ("Translation" does not contain
"translate"); `translation`, `language` and `i18n` matched all three; `french`, `bilingual`, `locale` matched none.

**Built:** the three `docs` in `src/i18next-module.js` are sentences (rebuilt by `build.mjs`; version stays 1.1.0 —
s8's 1.1.0 has not left this machine). Translation's opens with *"Translates"*, names `{{name}}` → Variables, "shown
exactly as typed (… not escaped)", and the warning; Language Bundle gives the JSON shape and both defaults (`en`,
`common`); i18next names `<html lang>` and the browser/last-choice default. After: `query: "translate"` → `Translation`.

| reading | before | after |
|---|---|---|
| `get_node_type` summary, all three | `https://docs.noodl.net/…` | the sentence |
| `list_node_types` `translate` | `[]` | `["Translation"]` |
| [`isl-007-i18next-module.test.js`](../../../packages/noodl-runtime/test/isl-007-i18next-module.test.js) new AC7 test | — | 6/6; **s8's build (HEAD) reddens AC7 only** (`Received "https://docs.noodl.net/modules/i18next/i18next-node"`) |
| `library:check` | — | i18next OK (the one FAIL is still the peer's untracked `nightbook-kit`) |

**AC6 read, not built.** (i) *Set a French column in one call:* with the add-on, a language's words are ONE parameter
(`Bundle`, JSON) on a Language Bundle node, so one `update_component` operation sets them all — already one call.
(ii) *List the project's words in one call:* the same bundle, read by one `get_component`, IS the list when the words
live in bundles. What the door cannot do in one call is list the **keys pages use**: `search_project` returns
locations only (`SearchMatch` = component, nodeId, type, label — no parameters), so finding a key used on a page but
missing from French costs one `get_component` per component. The runtime warning (AC3) names it once the page runs.
(iii) *Warn on a typed word on an opted-in project* (INT-009's rule) is a new validator rule, and the question it needs
is what counts as opted in and what a word is (the island has 334 visible texts and s7 read 46 that did not switch, not classified
by kind). Put to Richard with this session's other questions.

### Session 11 (2026-10-03) — AC6's question classified, asked and ruled

**The 46 that did not switch (s7), classified** from s7's saved reading (`unchangedSample` is the de-duplicated set,
not a sample: 16 distinct strings across the five pages). Every one is right to stay: the language buttons `EN` `FR`,
the age bands `7–9` `10–12`, the player's own typed name `Ada`, characters `Sami` `Mamie Rose` `Biscuit` `Cobble`, and
symbols `→` `+` `−` `⤢` `—`. **0 missed words among what the drive reads.**

**What the drive cannot read.** A census of the GRAPH (both project formats; `text` / `label` / `placeholder` strings with
a letter; "wired" = a connection into that node's port): the island types **43** words, **31** overridden by a wire from
`Translate words`, **12** not: 4 language names (`EN`, `FR`, `English`, `Français`, right to stay) and **8 screen-reader
names** on kit nodes (`Garden` / `Garden3D` / `Divider` `label` → `aria-label`: "The island", "The garden", "My robot",
"Her robot", "The robot", "Drag to make the steps wider or narrower"). They stay English in French and no visible-text
drive sees them. Filed [`P109-S11-ARIALABELWORDS`](../../bugs/p109-s11-arialabelwords-the-islands-screen-reader-names-stay-english-in-french.md)
(→ IW-010, which re-does every word).

**The population a warning would serve** (the same census on every project on this machine that carries the add-on):

| project | Translation nodes | typed words | wired | unwired (would warn) |
|---|---|---|---|---|
| `templates/nightbook` | 22 (+ `UI/Say` ×152) | 0 | — | 0 |
| `templates/digital-bricks-training` | 131 | 1 | 0 | 1 (`Section` on a dbt-lesson Section) |
| `isl007-two-languages` (AC2's fixture) | 4 | 2 | 0 | 2 (`EN`, `FR` buttons) |
| Tailr (`Noodl projects/30d29729…`, Richard's) | 16 | 234 | 72 | **162**: mostly real (`Password` ×7, `Cancel`, `Forgot Password?`, 23 placeholders, 18 input labels); some not words (`AA` ×9, `MMM DD, YYYY` ×6, `V1.13`, `g/m2`) |
| hsseq ×2 (`Noodl projects/83bd13a2…`, `hsseq-test-main`) | **0** | 59 / 66 | 33 / 33 | 26 / 33 |
| `templates/bot-garden` (no add-on) | 0 | 43 | 31 | 12 |

The two hsseq copies CARRY the add-on and never place a Translation node, so "the add-on is installed" is the wrong
opt-in. The existing mechanism for "what this project carries" is the catalog's read of `noodl_modules`; the existing
signal for "this app translates" is a placed `Translation` node.

**Ruled (Richard, 2026-10-03, in one click, as recommended): "Warn if app translates".** The validator warns on a typed
word only in a project that places at least one `Translation` node; a word is a string with a letter; a port with a wire
into it is skipped. Expected on the population above: Tailr 162, DBT 1, the fixture 2, hsseq 0, nightbook 0.
AC6's other two clauses were met in s9 (one call each, through the bundle). Next: build the rule (AC6) — census-first
gate with the table above as its expected counts, the hsseq pair as the silent arm, Tailr as the firing arm.

**AC6 built (s11).** New warning **`typed-word-not-translated`**
([`typedWordNotTranslated.ts`](../../../packages/noodl-editor/src/editor/src/validation/typedWordNotTranslated.ts)),
in `authoredPreconditionDiagnostics`, the one pipeline the editor's AI gate, the MCP write tools, `validate_component`
and `validate_project` all call. Opt-in: a placed `Translation` node in any component (or the candidate). Ports: the
visual built-ins' word inputs, **read from the shipped catalog** (12: Text, Button / Checkbox / Dropdown / Radio Button
/ Text Input labels and placeholders, the three deprecated originals, and **Page `title`**, the browser tab's name);
data/cloud `text` ports and kit ports abstain (a kit's `label` is the island's aria-label, an id, or a caption: only its
author knows). A word = a letter in any script; a wired port is skipped. Advisory, blocks nothing.

**What it says, measured** (the built rule bundled with esbuild and run over each project; both formats):

| project | warnings | by port |
|---|---|---|
| Tailr | **149** | Text 90, Button 13, Text Input placeholder 23 / label 18, Dropdown 2, Page title 3 |
| hsseq ×2 (add-on installed, no Translation) | 0 | — |
| `templates/digital-bricks-training` | 11 | Page title 11 (10 English words + the brand) → filed [`P109-S11-DBTPAGETITLES`](../../bugs/p109-s11-dbtpagetitles-the-training-apps-tab-titles-stay-english-in-french.md) |
| `templates/digital-bricks-training-demo` | 6 | Page title 6 |
| `templates/nightbook` (untracked) | 11 | Page title 11, every one "Nightbook" (the app's name: the message says to leave a name typed) |
| AC2's fixture | 3 | EN, FR buttons (right to stay) + Page title "Two languages" (a real miss in our own fixture) |
| `library/modules/i18next-translation/project` | 0 | — |
| `templates/bot-garden` (control: 12 typed, unwired, no Translation) | 0 | — |

Tailr's 162 (s11 census, text/label/placeholder on ANY node) became 146 on the ruled ports (16 were component and
Avatar ports, which abstain) + 3 page titles. ⚠️ My first scratch census read Tailr as 221: it mapped the legacy
format's wires to `targetId`, but `project.json` stores `toId`/`toProperty` too — the rule was right, the probe saw
no wires. Recounted directly: 155 Text words, 65 wired.

**Graded:** [`tests-unit/isl-007/typedWordNotTranslated.test.ts`](../../../packages/noodl-editor/tests-unit/isl-007/typedWordNotTranslated.test.ts)
**16/16** — the firing arm with each silent arm beside it on the same candidate (no Translation placed; a wire into
THAT port, and not into another; symbols/numbers/age bands; a kit label, a CSV and an email text; views omitted), every
table port fires, through the pipeline (warning, `isBlockingForAuthoredOutput` false), the table pinned to the catalog
both ways (each entry a string input; no visual built-in word port left out), and the census of the repo's three
tracked translating projects. **Mutant** (opt-in check removed, on a backed-up copy, restored and `cmp`-checked):
**3 red** — the hsseq arm, the pipeline's silent arm, the island control. **Through the door:** `buildTwoLanguages`
re-run into the scratchpad with the in-process server: `create_component` returns the three warnings to the agent.
`tsc` on the rule clean; `typecheck:mcp` shows exactly s10's 8 spec-file errors, none here. No spec gates on the
fixture's or the templates' warnings (searched: `tpl011Template.test.ts` collects and does not assert).

⚠️ A live agent (Claude Code on `noodl-mcp/dist`) sees this only after the MCP `dist` is rebuilt — and that rebuild
waits on the peer's uncommitted `src/cloud/bundleEntry.js` (ISL-019 AC6's note): build it in a worktree. **AC6 ✅.**
