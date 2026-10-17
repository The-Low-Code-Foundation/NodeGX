# OWN-008 — Three strangers

**Opened 2026-10-02.** **Depends on OWN-007** (and therefore on everything before it).
**Status: 🟡 lab and graders built (s1, 2026-10-16); the three strangers run after Richard's weekly reset (R47).** The phase's thesis test.
**Model:** **Opus, on purpose, for the three strangers**: the test is whether the kit is enough for the model a person has by default. The session that runs them and reads their questions: Opus. At the start of a session on this task, and again if the work changes kind, say which model you are running on and whether this line says Richard should switch (README §0.2).

## 1. The person sentence

> **Three agents that have never seen this repo each build a different NodeGX editor from the kit and the brief alone,
> and each opens the real todo app, changes it, and saves it so the official editor opens it unchanged.**

## 2. Why

README §7 criteria 1 and 2. A kit proven only by the people who wrote it is not a kit. NSP-006 is the method: a fresh
agent, a scratch directory, a brief, the suite, a list of what it may not read, and a timed report. Here the stranger
also gets a wish, because "your own" means each editor is different.

## 3. What to build

1. **A lab directory per stranger** holding only the published kit (or, if R2 rules against publishing, a copy of the
   kit's packages), the brief, the suite, and a copy of `templates/todo-list`. No repo, no `git`, no web search.
2. **Three wishes**, chosen so the editors share nothing but the kit:
   - *"Show my project as a 3D map I can fly through, and let me rewire it there."* (the prototype's direction)
   - *"A big-block editor my children can use: few nodes, huge targets, no jargon."* (Richard's daughters and P108's
     Coding Garden are the audience; memory: *kids, no clock*)
   - *"A table: one row per node, one column per port, edit cells to change the app."* (nothing visual at all)
3. **Each stranger reports**, as NSP-006's did: start and finish time, tokens if the harness reports them, every
   question they had to answer by guessing, and the suite's output.
4. **Fold back**: every guess becomes a sentence in the brief or a fix in a package, and the run is repeated for any
   stranger whose guess changed the result.

## 4. Acceptance criteria

1. All three pass the suite on the todo template; the official editor opens each saved project with zero new validator
   diagnostics.
2. No stranger read a file outside the lab (the lab's tree is hashed before and after, as NSP-006's was).
3. Each stranger's report is in this folder, with the time taken, and the brief's change log names what each one
   added.
4. Richard has looked at the three editors (a screenshot each is enough to start).

## 5. Watch for

- NSP-006 §5.4: the hole the pilot could not see was found by a stranger whose target read outputs only at settle. The
  strangers' editors will find holes in the suite. A stranger that passes with something obviously wrong is a suite
  defect, filed in OWN-006 §6, not a pass.
- Memory: *one heavy job*. Run the strangers one after another, not three at once, and tear each lab down after.

## 6. Built

### s1 (2026-10-16 evening, Opus): the lab, the graders, and a ruling to wait

**The lab is what a person has.** `npm create nodegx@0.2.2 base` from the registry writes `.mcp.json` (the `nodegx`
server, `@nodegx/mcp@0.2.2`), `CLAUDE.md`, `AGENTS.md`, `.vibe/`, `opencode.json` and the brief
(`.claude/skills/nodegx-your-own-editor/SKILL.md`, the same file as the repo's). Each stranger gets a copy of it plus
`templates/todo-list`. The kit it installs is what npm serves: `@nodegx/project-contract`, `node-spec` and
`canvas-look` at 0.1.0, `preview` at 0.2.2. Its three open `kit: project-contract` rows (ESMSUBPATH, NOFIXTURES,
CONTRACTREADME) aren't fixed first. None of them blocks an AC, and the brief names all three, so whether the strangers
trip on them is a reading. The scripts and how to run them are in [`own-008/`](own-008/README.md).

**AC1 is graded on a script the stranger never saw.** The stranger's own `edits.json` is graded too. But the PASS
that counts is its adapter on the repo's `todo-list.edits.json` (11 edits, all eight kinds). The run uses the
stranger's own installed command, beside a control that must FAIL: the same adapter saving one number as a string.
"The official editor opens it with zero new diagnostics" is graded with the editor's own validator
(`npm run validate:project`, 2.5 s). Its output for the saved folder is diffed against the untouched template's (0
errors, 0 warnings, 1 info). Then `validate_project` runs through the published server. The grader was proved on four
arms: the kit's `referenceAdapter` → `PASS … (56 ms)`; the control → `FAIL … "parameters.paddingTop" is "8"; the
official editor saves 8.`; a clean saved copy → 0 new; a copy with one dangling wire → `error dangling-connection
/Commands/Add action`, and `validate_project` errors 1.

**AC2 is graded on what the stranger did, not only on hashes.** The round hashes the lab's todo copy and the repo's
template before and after. The grader also lists every absolute path any tool call named outside the lab, every
`../` climb, and every refused call. The round also denies reads of `/Users/**`, web tools and git, and moves the
`nodegx` server's HOME into the lab, so `list_projects` can't show this machine's projects.

**One minute of the first stranger ran, then was stopped (R47).** The table stranger started at 22:47. **Its first
tool call was `Skill nodegx-your-own-editor`**: it found the brief unprompted, as OWN-007 AC2 measured on Sonnet. It
then hashed the todo copy into `/tmp/todo-list-before.sha256` and `/tmp/todo-list-baseline`, outside its lab. That's
a write, not a read of anything that isn't its own. The isolation scan named both paths. The stream's first event
said the seven-day allowance was at **92%**, resetting Saturday 17 October at 23:00. The run was stopped at 1.2
minutes and set aside (`aborted-1/`, not graded).

**R47 (Richard, 2026-10-16, one AskUserQuestion):** *"All three after reset."* (Offered: one now and two after, which
was recommended; all three now; all three on Sonnet.) Nothing ran after the ruling. The round now guards itself: it
stops when the week reaches 90%, or when the round alone has used 15% of it. On exit it kills every process that
has its working directory in the lab. Both were proved on a stub `claude` that only prints quota lines (stopped at
0.30 → 0.46; the `sleep` it left behind was killed by its working directory). The model is pinned to
`claude-opus-5-5`, because the `opus` alias resolved to `claude-opus-5` in this CLI (2.1.251).

**Noticed, for the fold-back:** the folder's `CLAUDE.md` says *"Don't write a separate web server or hand-written
HTML and JavaScript instead"* before it says an editor request goes to the skill. A stranger building a web-page
editor reads the first sentence first. Whether it slows one down is a reading for the runs.
