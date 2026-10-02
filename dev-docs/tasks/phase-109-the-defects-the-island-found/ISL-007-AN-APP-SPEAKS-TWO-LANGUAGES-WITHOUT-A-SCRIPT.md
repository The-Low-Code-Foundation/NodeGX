# ISL-007 — An app speaks two languages without a script

**Status:** 🔒→✅ ruled s4 (2026-10-02): **"Adopt the add-on"** — `library/modules/i18next-translation`, its gaps fixed and taught to agents (README §8). Not built. Scoped 2026-10-01 at `27d891bf3`
**Source:** [audit F10](AUDIT-2026-10-01.md) · the island's 693-row word table and `Logic/Translate words` · the same need met by [TPL-007](../phase-78-the-templates/TPL-007-THE-MATHS-AND-TYPING-GAME.md) §2.6 (Static Data route) and [TPL-011](../phase-78-the-templates/TPL-011-THE-EVENING-JOURNAL.md) (i18next route)
**Side:** product (a translation primitive, or the shipped i18next module) — and a scope ruling against [P47](../phase-47-internationalisation/README.md)

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
| **Existing solution 2, specced, not started: [P47 Internationalisation](../phase-47-internationalisation/README.md)** (9 tasks, about 7 weeks, "Post-alpha"). INT-001: a `nodegx.strings.<locale>.json` string table keyed by component, node and port, never by the string. INT-002: translatable parameters at the `Ports.renderParams` seam. INT-005: a runtime locale, `<html lang>`, resolution order. INT-009: MCP `list_strings` / `set_translations`. Richard's words there: the old module's UX was poor ("you had to maintain your own JSON file") | P47 README lines 1-20, 62-80 |
| P65 left *"the i18next-translation vs phase-47 check"* undone: *"nobody was assigned"*. Re-read at HEAD | [P65 TASKS.md lines 80, 145](../phase-65-the-library/TASKS.md) |
| `intl-format` (Relative Time, Format Number and two more, all on `Intl.*`) covers formatting, not words. Re-read at HEAD | `library/modules/intl-format/README.md` |

## 3. Where it bites a person

- Every French-speaking family the templates are made for (P95, P105, the girls' journal). Three templates in a row built
  their own translation: Static Data plus a String Mapper (TPL-007), i18next (TPL-011), and Static Data plus a generated Function
  (the island).
- An agent asked for "a bilingual app" has no single answer to give, so each one invents a route, and the door has no tool
  that lists strings.
- A placeholder filled in one Function but not another is invisible until a person reads the screen in the second language.

## 4. Related work and collisions

- **[P47](../phase-47-internationalisation/README.md)** owns the whole design (string table, translatable parameters, locale,
  panel, agent contract). **This task must not build a rival to INT-001.** Ruling 1 decides whether P109 delivers a slice of
  P47 or adopts the shipped module.
- **[P41 ACC-005](../phase-41-accessibility/README.md)** (the document shell's hardcoded `lang="en"`) meets INT-005. A language
  switch should set `<html lang>`.
- **ISL-006** (F09): the 695-output Function exists only because ports come from text. If this task removes Translate words,
  ISL-006 loses its largest consumer. Sequence: this ruling first.
- **ISL-005** (F08): the duplicated `fill` / `fillIn` helpers.
- **P88 [GAM-018](../phase-88-the-defects-the-games-found/GAM-018-A-KIT-REGISTERS-THE-SAME-WHATEVER-IS-INSTALLED-BESIDE-IT.md)**:
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

None yet.
