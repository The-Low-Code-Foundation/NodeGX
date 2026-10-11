# ONT-013 — The rule is a sentence

**Opened 2026-10-10**, from a chat with Richard (Fable 5.1, outside the numbered sessions) that started as "what is
*settled*?" and ended as "is it worth building a plain-language → database-rule system, with templates but also the
freedom to invent?". The answer is **yes, and most of it is already this phase**: the kinds are the templates,
`projectWorld()` is the compiler, the claims and mutants are the proof. What is missing is the half where a person says
a rule **no kind asks for** and it still ends up kept by the database on every engine, or honestly shown as not kept.
**Depends on** ONT-003 (claims graded on both engines), ONT-005 (the honesty number), ONT-012 (`onlyWhile`, the first
rule on a value of the record). **Feeds** ONT-014 (the old-and-new atom), ONT-015 (the series atom), ONT-008 (a rule
is shown in the view in its own words). **Status: 🟡 — R-d, R-e, R-f ruled 2026-10-10 (§6), each the recommendation; step 4 built s21 (§9.1); steps 1–3 built s25 (§9.2: `rules.json`, the validator, the projection, the read-back, the brief); step 5 (Opus) owed.**

> **Model check (Richard, 2026-10-08 rule):** steps 1–3 want **Fable 5.1**: the frame ("what may be invented, and what
> stops an invented rule from being a lie") is the kind of wrong turn no suite catches. Step 4 (the census of
> across-record rules) and step 5 (the honesty accounting) want **Opus 5.5**: fixed shape, graded.

## 1. The person sentences

> **"Invoice numbers look like INV-2026-0042. The number goes up by one every time, never skips, and is never used
> twice. Once an invoice is issued, its number and its amount never change."**
>
> **"An assignment goes from draft to issued to withdrawn. It never goes back. Only a coach may issue one."**
>
> **"A cohort holds at most twenty learners."**

None of these is a relation between two nouns, so none of them is a kind. The first is three rules on one noun. The
second is a rule on how a value may move. The third is a rule across records. Today the first two are workflows in
every app that has them, and the third is a check in a screen.

## 2. Why

### 2.1 The half that exists

Mapping Richard's sentence onto what this phase has built (measured 2026-10-10 against the working tree):

| Richard's words | what exists |
|---|---|
| templates | the 14 kinds in `kinds.hand.json`, each with `questions`, `projection`, `mutants`; *settled* is the fifteenth (ONT-011 step 2, R-c) |
| Claude writes the rule | `projectWorld()`: a `ProjectedRule` is `{ on, says, holds }` — the sentence, and a `RuleHold` shape the store keeps or says plainly it cannot (`world/kind.ts:136-161`, `world/project.ts:193-204`) |
| the atoms | `unique` (with `whileEmpty`), `required`, `defaultValue`, the declared checks (`exactlyOne`, `allOrNone`, `min`/`max`, `oneOf`, `maxLength`, `looksLike`, `whole` — `storage.ts:306-317`), `creatorOwns`, the `{ path }` ACL atom (ONT-004), `onlyWhile` and `fields.<f>.read` (ONT-012) |
| proof it does what you said | every held claim fails on its mutant, on SQLite and PostgreSQL |

No product in the survey Richard asked for grades the rule it generates against the mistake it is meant to prevent.
Supabase's assistant and Firebase's tooling generate the rule (Firebase also generates tests for it); PocketBase and
Gel keep a small rule language a sentence can compile to; Frappe keeps the richest catalogue with no sentence in
front of it. The mutant is this phase's own.

### 2.2 The half that is missing, and the number that says so

Three `RuleHold` shapes the vocabulary already writes are **unkept by the engine** (`project.ts` `WHY`): `setOnce`
("the schema has no rule against changing a field once the record is made"), `neverEdited` and `neverDeleted` ("who
may change a record is its collection's permissions, which the projection does not write yet"). They are three of
ONT-005's **16 of 38** on the fully answered world. A person who says "once issued, the amount never changes" today
gets the sentence written into the collection's description and nothing in the database.

That is the danger in "just tell Claude the rule", and it is not that Claude writes a wrong rule. It is that Claude
writes a plausible one, it is enforced on one path (a function, a workflow, the form) and not on the others, and the
person reads the sentence back and believes it is a law. That is the workflow-shaped hole Richard has lived in, with a
confident sentence on top.

### 2.3 The line between inventing and Frappe's hooks

ONT-011 §8 rejected Frappe's Python document hooks: logic in free code cannot be graded, shown back in the person's
words, or carried to another engine. Free **rules over a fixed set of atoms** can be all three. So the rule for
invention is the one this phase already applies to kinds:

> **An invented rule enters the world files only as a sentence with a claim and a mutant. It projects onto atoms the
> contract keeps on both engines, or it is shown as *unkept*, in that word, never as a law.**

The catalogue grows the way ONT-011 grew: an invented rule that recurs across projects earns a kind with its own
questions. Frappe gave the idea, the rows are the warrant; the same for rules.

## 3. What to build

### 3.1 The fifth file: `docs/world/rules.json`

`nouns.json`, `relations.json`, `vocabulary.json`, `verbs.json` (ONT-006) and now `rules.json`: a rule a person said
that no kind's question produced. One entry:

```json
{
  "id": "invoice-amount-settled",
  "on": "Invoice",
  "says": "Once an invoice is issued, its amount never changes.",
  "holds": { "frozen": ["amount"], "unless": { "status": "draft" } },
  "mutant": "an issued invoice's amount is changed in place",
  "from": "oral"
}
```

- `says` is the person's sentence, read back to them and shown in the view (ONT-008).
- `holds` is a `RuleHold`. The union in `kind.ts` is the whole atom set; a sentence that fits no shape is **not
  written** — the validator says which shapes exist, in words, and the agent asks the person a narrower question.
- `mutant` is the mistake, in words. `gradeStatically()` and `worldMutants()` (ONT-005) take it like a kind's.
- `from` is `oral`, `note` or `census`, as for a question (ONT-000's rule). "Claude" is not a source.

`validate_world` reads it; `write_world` keeps it under the `if_revision` rule; `diffWorld()` sees a changed rule as a
migration step (ONT-007) — a rule put on records that already break it is refused before the backup, as s9 found.

### 3.2 The atoms the sentences in §1 need, and do not have

| sentence | needs | today | goes to |
|---|---|---|---|
| "never goes back", "once issued never changes", "only a coach may issue" | **old and new**: a rule that reads the record before and after the change, and who makes it | `onlyWhile` reads the old record only, and never who; `setOnce` / `neverEdited` / `neverDeleted` are unkept | **ONT-014** |
| "INV-2026-0042, goes up by one, never skips, never reused" | **a series**: a number the backend hands out, formatted, gap-free, never reused after a delete | nothing; ONT-011 §3.3 found one read-aloud row and no invoice-style numbering in the corpus | **ONT-015** |
| "at most twenty learners" | **across records**: a count, a sum or a no-overlap over a set, held inside the write | nothing; needs a lock or a transaction per engine | **measure first** (step 4); earns a task only with rows |

Each atom is one `RuleHold` shape, one `StorageAclOption` or declared-check entry, one enforcement inside the write on
both engines, one HTTP refusal in `says`'s words, and a flip of some unkept claims to held.

### 3.3 The honesty accounting

Every atom built is counted against ONT-005's pinned number on the fully answered world, and the task that adds the
atom must move it **down** (fewer survivors). An atom that adds `RuleHold` shapes without flipping any existing
survivor adds claims and mutants of its own, so the denominator grows with the numerator. The pin in
`ont-005-mutants.test.ts` is the gate: a task that leaves it unchanged has not kept anything.

## 4. Steps

1. **The frame** (Fable). §2.3 as a paragraph in the brief (`worldBrief()`), so the agent knows: a rule that fits no
   shape is asked narrower, never written as free text; an unkept rule is said as unkept. Two sentences in the brief,
   measured on both MCP arms (R5's budget; ONT-002 measured 8,261 tokens).
2. **`rules.json`** (Fable, then Opus for the plumbing). The schema (`world.schema.json`), the validator's refusals (a
   `holds` naming a field the noun does not have; a shape the union does not hold; a rule with no `mutant`; a `from`
   of anything but the three), the writer, `validate_world`/`write_world`, `diffWorld`'s reach. The projection takes
   a `rules.json` rule as it takes a kind's: through `projectWorld()`, graded by `runClaim` on both engines.
3. **The read-back** (Fable). `says` is the only thing the person sees. A held rule's refusal over HTTP carries it
   (ONT-012's 409 pattern); an unkept rule's `says` is written into the collection's description prefixed *not kept:*
   so the Schema card and ONT-008's view show it in that word. **The mutant of this step:** a projection that writes
   an unkept rule's `says` without the prefix — the view then shows a law that is not one, and the spec catches it by
   reading the description.
4. **The census of across-record rules** (Opus). Three detectors in `scripts/ontology/census.js`, by meaning like
   ONT-011's: a count checked before a create (`length >=`, `count <` beside a create call), a sum checked against a
   field on a parent (allocations against a total), two date ranges compared for overlap. Over all 8 sources with the
   private paths. The result is rows and counts in `KINDS.md`'s borrows section, or zero rows recorded here. A task
   for the atom opens only with rows.
5. **The accounting** (Opus). ONT-005's pin re-measured after ONT-014 and ONT-015, with the shapes that flipped named
   in ONT-005 §6, and this file's §6 updated with the number.

## 5. Acceptance criteria

1. A rule in `rules.json` that fits a shape the engine keeps is held on SQLite and PostgreSQL through the same
   `runClaim` a kind's rule uses, and fails on its own mutant. A rule whose shape the engine does not keep is in the
   collection's description prefixed *not kept:*, and `ont-005-mutants.test.ts` counts it as a survivor `as: 'unkept'`.
2. The validator refuses, in words, a rule whose `holds` fits no shape, names a field the noun lacks, has no `mutant`,
   or whose `from` is not one of the three. The agent's brief says what to do instead (ask narrower). Mutant: a rule
   with `holds: { sql: "…" }` is refused, not written.
3. The three sentences in §1 are each either projected (via ONT-014, ONT-015) or recorded as unkept with the
   atom they wait for named, and the person's read-back is the same sentence in both cases, with *not kept:* in the
   second. **This is graded by reading what the person would see**, not by reading `rules.json`.
4. ONT-005's pinned number on the fully answered world is lower after ONT-014 and ONT-015 than before, and the flipped
   shapes are named. A task that reports the atom built with the pin unchanged has not met this.
   **ONT-014 (s17): 16 → 13 of 38; flipped: `setOnce`, `neverEdited`, `neverDeleted` (ONT-014 §6.2).**
5. `world.test.ts`, `ontology-census:check`, `test:ci` green, the kinds still pinned to the hand file.

## 6. Rulings to ask (plain words)

| # | the question | recommended |
|---|---|---|
| R-d | **May the agent write a rule no kind asked for?** Two choices. Yes from the start, gated only by "kept on both engines or shown as unkept". Or no: a sentence that fits no kind is recorded as a *wish* in the person's words and earns a kind only when the census finds it in three projects. | **Yes from the start, gated.** The gate is the honesty, not the catalogue; a rule the engine keeps and a mutant kills is as safe as a kind's. The census still grows the catalogue from the rules that recur. |
| R-e | **When a person's rule cannot be kept by the engine, does the write of the world go through?** It can be refused ("say it another way"), or written with the rule marked *not kept* and shown that way everywhere. | **Written, marked, shown.** Refusing loses the sentence, and the sentence is the spec. What must never happen is a marked rule shown as a law — AC3 grades that. |
| R-f | **Does a rule's refusal name the rule, or just refuse?** A 409 that carries `says` tells a caller who may not know the rule exists that it does, and what it says. | **Name it**, as ONT-012 does. The caller already passed the row ACL to get a 409 rather than a 404, so the rule's existence is not a secret from them. |

**Ruled 2026-10-10 (Richard, in chat, plain words; README §9):** R-d **yes, from the start** ("it needs the flexibility to
invent new things for niche apps"); R-e **written, marked, shown**; R-f **named**. All three the recommendation, so §3 and §5
stand as written.

## 7. Not this task

- **The atoms themselves.** ONT-014 (old and new) and ONT-015 (the series) build them; step 4 measures the third.
- **Who may change a field** (a per-field `update` rule). ONT-012 §7 named it and it is unruled; ONT-014's "who makes
  the change" is on the record's transition, not on a field.
- **A rule-builder surface.** The home is the files and ONT-008's view. A second surface drifts.
- **Parsing sentences in the backend.** The sentence lives in the files; the agent compiles it at authoring time; the
  backend sees the compiled shape and the `says` text only.
- **Frappe's hooks**, or any `holds` that carries code or SQL text (AC2's mutant).

## 8. Watch for

- **A claim written into a doc grades the code it describes** (memory). `says` in a description is a claim. Step 3's
  *not kept:* prefix is what keeps an unkept rule from grading the engine as if it held.
- **A gate can have a hole shaped like the defect.** The spec for AC3 must read the Schema card's description text,
  not `rules.json`; a green gate that reads the file pins nothing about what the person sees.
- **Two catch-alls swallowed a 409 in s16** (ONT-012 §6.2). A new refusal through an old door needs its own mapping,
  per door, counted in ONT-012 §4's table.
- **Count the reach before the benefit.** Step 4's detectors run over the private corpora, which hold 195 of 303
  rows. An across-record atom designed from the five in-repo sources is a hypothesis.
- **The MCP surface budget** (R5). `rules.json` rides on `validate_world`/`write_world`; no new tool.
- **Count the request, not the node.** The invoice sentence is three rules (series, frozen amount, frozen number),
  not one; the view must show three, each with its own held/unkept word.

## 9. Built

### 9.1 Step 4 — the census of across-record rules (s21, 2026-10-11, Opus 5.5)

`scripts/ontology/census.js` `detectAcross()`: the first detectors that read the apps' **code**, not their schemas,
over the four templates that are sources (the scripts inside their components' node parameters) and the three private
corpora (acme `src` + `scripts`, tirion `api` + `pipelines` + `ui/src` + `db`, sentinel `backend`) — 265,639 lines,
never tests, fixtures, seeds, sandboxes, data generators or vendored code. Four detectors: a row count compared with a
limit near a create (**count**), a field that holds a limit (`capacity`, `max_<x>`, `<x>_limit`, `seats`, `quota`;
**count**), a sum compared with a total (**sum**), two date ranges compared or a range type (**overlap**). Every
candidate is classified by meaning (`kinds.hand.json` borrows, the private `borrows.json`), as ONT-011's are; the rows
are in `KINDS.md` § *Rules across records*.

| rule | yes | no | neighbour | yes per source |
|---|---|---|---|---|
| **count** — at most so many | 2 | 2 | 1 | nightbook 1, acme 1 |
| **sum** — never more than the total | 0 | 0 | 0 | · |
| **overlap** — no two at the same time | 0 | 0 | 0 | · |

- **The two count rows are both unkept today, in two different ways.** Nightbook's keep function refuses a 201st kept
  thing by counting the rows it was handed before it creates — the classic race (two saves at 199 both pass). Acme
  declares the limit as a field on the parent record, and the field's own note says it is not enforced. That second
  shape is §2.2's danger exactly: the rule is said, shown, and kept by nothing.
- **The zeros are measured zeros.** Each detector runs first on a line it must catch and a near-miss it must not
  (`ACROSS_CONTROLS`), and the census fails otherwise; five mutants (each code detector's regex made dead, and the
  date/hex guard removed) each turn the census red.
- **A task for the count atom may open** (§3.2: "earns a task only with rows"): 2 rows over 2 sources, both of the
  per-parent shape ("at most N per person", "at most N per account"). Sum and overlap stay unopened, with zero rows.
  Opened as ONT-016.
- **The same pass found ONT-015's warrant** (read-aloud family, counted under *facts*): a number an app hands out
  itself — a sequence, a counter formatted into text, the highest plus one. 1 → 3 rows over 2 sources (acme 1,
  sentinel 2); todo-list's three hits are drag-sort positions (neighbour), tirion's are import stand-in keys
  (neighbour). ONT-015 §6.

### 9.2 Steps 1–3 — the frame, the fifth file, the read-back (s25, 2026-10-11, Fable 5.1)

**The frame, as code.** A rule enters the world files only as `{ id, on, says, holds, mutant, from }` in
`docs/world/rules.json` (`RULES_FILE`, `WorldRule`, `RulesFile`; `WorldFiles.rules`, optional like the verbs).
`world/rules.ts` is the validator, run after the verbs' over a world the three files already describe:

- `holds` is **one shape by its naming member**, from `RULE_SHAPES` (nine: `unique`, `setOnce`, `neverEdited`,
  `neverDeleted`, `frozen`, `moves`, `onlyOne`, `atMost`, `onlyBy`), its members only. A `holds` that fits none —
  AC2's mutant `{ "sql": … }` — is refused with every shape in words and "ask the person a narrower question", and
  **not written** (`planWorldWrite` → `invalid`, the MCP's `write_world` → `invalid-argument`, measured). Two shapes
  at once are two rules. A shape with a home of its own (`secret`, `history`, a read-aloud number, `onlyWhen`, a
  pair's or a link's rule) is refused naming the home (`RULE_HOMES`).
- every detail a shape names is one of `on`'s, by the person's name (a read-aloud noun's `number` counts); a link
  is a relation, and a rule about one is the relation's kind's. `moves` names a choice and only its values; a `by`
  on a move is refused and pointed at `onlyBy`. An `unless` is a choice or yes/no detail with one of its values — so
  the projection can make a row the rule binds and one it frees — and never an operator.
- no `mutant` → "a rule nobody can grade is a sentence"; `from` is `oral` / `note` / `census` — "An agent is not a source".
- `on` is a noun or a relation with records of its own (`verbSubjects`).

**Two shapes joined `RuleHold`**, each said and never held, each naming its home: `{ atMost, of, per? }` (ONT-016,
`WHY.atMost`) and `{ onlyBy, changes, to? }` ("only a coach may issue one": a world names no role, so the backend's
`moves … by` in the manager keeps it — ONT-014; `WHY.onlyBy`). They are the §1 sentences' third rule and the "who"
clause, recorded as unkept with the atom they wait for named (AC3).

**The projection** takes a rule exactly as a kind's: into `ruled` under `{ rule: id }` (`WorldClaim.from` grew the
third source), its details renamed to the fields they became, and — for a `frozen` / `neverDeleted` with `unless` —
the row hints derived from the condition (`asProjected`). A held shape is a claim under the rule's id
(`invoice-amount-settled/frozen-once-issued`, `assignment-never-back/status-never-goes-back`), graded on SQLite and
PostgreSQL with every other world's in `ont-003-claims` (31/31) and failing on its `dropOnlyWhile` mutant. **R-f**:
a rule's `says` rides the backend's rule (`WorldOnlyWhile` `frozen.says`, each move arm's `says`, a delete's
`{ where, says }`), through the migration's `rules` step, so the 409 IS the sentence — measured over HTTP on both
engines (`ont-013-rules.test.ts`, 8/8): the amount of an issued invoice, an assignment put back to draft; the same
write on a draft, and the move the rule allows, go through. The migration's words carry it too (`keptWords`).

**The read-back (step 3).** An unkept rule's `says` is in `notHeld` with its `why` and in the collection's
description under the existing prefix *Not kept by the database yet:* (one list per collection; a sentence's own
full stop is stripped so the list reads as one). AC3 is graded **on what the person sees**: the contract spec's
reader (`readBack`) and the backend spec read `GET /admin/schema`'s descriptions — a held rule's sentence nowhere,
an unkept one after the prefix and never before it — and the reader reports the step-3 mutant (the sentence written
without the prefix) as `law`. On the MCP arm, `validate_world` returns `rules: [{ id, on, says, kept, why? }]`
beside the verbs report (`ont002WorldTools`, 17/17), and the schema it returns carries the descriptions.

**The mutants (ONT-005).** `worldMutants()` makes one per rule, `<id>/never-said`, with the rule's own `mutant` as
the mistake and the rule's sentence as the killer: the world without the rule, projected. A held rule's mutant
differs in what is held and is run (its own claim first, `own()`); an unkept rule's is the right schema, as a
kind's unkept rule's is (`retype`), and survives `unkept` (`gradeStatically`). The fixture `world-rules` joined the
four pinned worlds; its pin is in `ont-005-mutants.test.ts`: **3 of 11** on both engines — the two rules the store
only says, unkept, and the invoice's amount as text, unclaimed; the other eight killed, seven by a claim at the rule's
step (the two rules' own claims among them) and one by a question.

**The brief (step 1)** gained "What the person insists on": the fifth file, "A sentence that fits no shape is not
written. Ask the person a narrower question; never write a rule as free text, code or a query.", and "shown as *not
kept*, in those words … never as a law"; the write section says rules left out are kept. 8,895 → 9,839 chars; the
spec's budget moved from 9,000 to 10,000 with the measurement beside it.

**Also:** `write.ts` keeps and grades a left-out `rules.json` as it does the verbs (one `OPTIONAL` list; the revision
takes each optional file under its own name, so a rules file and a verbs file of the same text are not one world);
`world.schema.json` has `rulesFile`, `rule` and `ruleHold` (the nine shapes, `additionalProperties: false`);
`world.test.ts`'s engine-name gate still walks every new file.

**Watch for, found while building:** the store keeps **one** `frozen` condition per collection (ONT-014 §7), so a
rule's conditional freeze on a list of fields binds a kind's unconditional `setOnce` on the same collection to the
same condition — a read-aloud invoice's `number` is "set once, once issued". The series refuses a person's number
at every door anyway, so nothing a person sees changed; the `setOnce` claim now makes its row one the freeze binds
(it read the bound row only under `frozen: "*"` before). A second conditional freeze on one collection is still the
§7 limit.

**Measured (2026-10-11, working tree over `ec116ed5a`):** project contract 16 suites **332/332**, `tsc` (tests)
clean (`rules.test.ts` 38 cases new); MCP `ont002WorldTools` **17/17**; backend `ont-013-rules` **8/8** and
`ont-003-claims` **31/31**, `ont-005-mutants` **23/23** (200 s), both engines; backend tests `tsc`: only P107's `DRAWN_PORT_TYPES` (not P116's).
**Owed:** step 5 (Opus — the honesty accounting; `world-rules` is a fifth pinned world, so the fully answered
world's 14 of 51 did not move); the MCP tool-surface measurement on both arms (no new tool, one optional argument on
`write_world`); ONT-008's view shows `kept` / *not kept* per rule from the report.
