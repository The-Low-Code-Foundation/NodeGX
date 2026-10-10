# ONT-008 — Your own data manager

**Opened 2026-10-08.** **Depends on ONT-001, ONT-003 and P112 OWN-007** (the brief). **Status: 📋 not started.**

> **Model check, before anything (Richard, 2026-10-08):** this task wants **Opus 5.5 is sufficient** — it runs P112's stranger method, which exists. Your system prompt says which model you are. If it is not the one named here, stop before any work and say so in one line ("this task is marked for Opus 5.5; you are on <model> — switch with /model, or say go"), and wait for Richard's word. Do not start on the wrong model because the check felt like a formality.


## 1. The person sentence

> **My agent built me a page for my data in my own words, from a kit, and a suite told it when it was right. Richard
> opens the same files in the backend manager and sees the tables. Nothing was translated between us.**

## 2. Why

Richard: *"A seasoned dev can wrap their heads around the NodeGX inbuilt SQLite backend explorer we built, but I can't
present that to the [ops] team."* P112 proved the method: a kit, a brief, a suite and strangers. The ontology is a
graph, so the canvas look already draws it. The dev's view (P104) and the ops view are the same files at different
reach, which is NSP-005's word.

## 3. What to build

1. **The kit's data half.** The ontology files and `describe()` (ONT-001), the projection (ONT-003), the backend's admin
   routes already used by the manager, and `@nodegx/canvas-look` for the picture. No new package if the P112 kit can
   carry it; measured.
2. **The brief's chapter.** What a data manager is in NodeGX terms: it reads the sentences, shows nouns as cards and
   relations as wires with their questions and answers, lists and edits records through the admin routes in the
   person's field names, and runs verbs (ONT-006) as buttons with the sentence under them.
3. **The suite.** An adapter (`open(project)`, `show(noun)`, `edit(record)`, `run(verb)`), fixtures, and checks: every
   noun and relation in the files is reachable on the page by its sentence; a record edited through the page is the
   record the backend holds; a verb run through the page takes the arm the engine records; nothing on the page names a
   storage type unless the view declares full depth.
4. **The picture.** The ontology drawn with the canvas look: cards for nouns, wires for relations labelled with the
   kind's sentence, the answers on the wire's panel, and the collection each card became one click away in the
   backend manager (a deep link, as BMG-012's are).
5. **Strangers.** Three fresh agents, the kit and a persona each (a two-person ops team; a shop owner; a teacher), each
   building the view from the brief alone and passing the suite on the ONT-009 fixture. Their questions become
   sentences in the brief.

## 4. Acceptance criteria

1. Three strangers pass the suite on the same fixture; the official backend manager opens the project and shows the
   projected schema unchanged.
2. On the ops persona's view, `grep` of the rendered page for the storage type names finds none; on the dev view, the
   badges are there.
3. A verb run from a stranger's page and the same verb run from the backend manager produce the same run record.

## 5. Watch for

- **ONT-011 hands this view two hints (opened 2026-10-10):** what a person calls one record in a list, and a detail
  shown only when its case holds. If ONT-011's step 5 has landed, the suite reads both from the files. If it has
  not, say in the brief that a home-made manager guesses them, and how.

- **ONT-001 AC4 lands here (moved 2026-10-08).** The backend manager's `KindPicker` renders its tiles inline from its own
  `KINDS` constant, with three text slots and no long text, so no relation kind shows there without an edit. `describe()`
  (`@nodegx/project-contract/world`) returns the tile's fields under the same names (`label`, `line`, `icon`) plus the long
  text (sentence, ranked questions with what each prevents, `projectsTo`, evidence in words). This task's surface is
  where "`describe()` of every kind renders as a tile's long text" is shown.

- **What ONT-006 and ONT-007 hand this view (s9–s10), built and graded, nothing to re-derive:**
  `migrationWords(plan)` is the "before anything moves" panel; `plan.reach` rows with `how: 'renamed'` and `was` are
  "both names until then" (ONT-007 AC3's manager half); `verbReach()` rows say which verbs a change reaches and what a
  step must be re-said on (`rebind`); a button per verb with `verbWords()` under it; a run's steps sorted by the verb's
  order — the engine records them topologically, a skipped arm can come first (ONT-006 §6.6) — and the arm's `sees`
  read from the arm step's output; the runner's record shows an answer an arm gave with `by` (ONT-006 §6.7).
  `validate_world` already returns the verbs' words and functions, so a stranger's agent reads them from the MCP.

- **A working wireframe is not the mockup** (memory). The suite grades reach and correctness; Richard grades whether he
  could put it in front of the ops team, in ONT-009.
- **The project token paints nothing on an editor surface** (memory). A home-made page draws with the canvas look's
  tokens, not the app's.
- **Two surfaces called the bench** (memory). Name the view by what it is for; "manager" is taken by P104.

## 6. Built

*(empty)*
