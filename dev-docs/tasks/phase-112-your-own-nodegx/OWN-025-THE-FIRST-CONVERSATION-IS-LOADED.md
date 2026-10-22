# OWN-025 — The first conversation is loaded

**Scoped:** 2026-10-21, from [DIRECTION.md §0](../../DIRECTION.md) pillar 2 and §4 item 6 (Richard, the same day:
*"what if all of the above was cooked into the npm package? So when you do `npm create nodegx`, the user's project folder
gets filled up with a library of starting stuff, such that the first conversation they have with their LLM is loaded
with the entire knowledge base, blueprint and techniques"*). **Status: ⬜ ready: D4 ruled yes, as scoped (Richard, 2026-10-22).** Lane 1 (apps with npm).
**Was waiting on:** D4, ruled 2026-10-22 ([DIRECTION §5](../../DIRECTION.md)).

## 1. The person sentence

> "I ran `npm create nodegx` and opened Claude Code in the folder. Before it built anything it scoped the app with me
> and wrote the brief down. It play-tested the first screen before polishing it. Every bug it found is a row in a
> ledger I can read. The plan, the tasks and what it learnt are in folders I can find. I never told it to do any of
> that."

## 2. What was measured first (2026-10-21)

| what the seed writes today | where |
|---|---|
| `.mcp.json` with the pinned server, in bootstrap mode | `create-nodegx.js` |
| `CLAUDE.md` / `AGENTS.md`: build NodeGX apps here, don't paste keys, how to see the app, build in small steps, drive from the start page, the editor-building skill, how to leave (EXP-023) | `AGENT_NOTE` |
| `.claude/skills/nodegx-your-own-editor/SKILL.md` | `profiles/core/skills/` |
| the Vibe kit only: `nodegx-first-day`, `nodegx-sizing-the-work`, a hand-over hook | `profiles/vibe/` |
| on `create_project`: the brief and the build plan, written into the project from the scoping conversation | `@nodegx/mcp` |

What it does not write: a play-test step, a bug ledger, a tasks folder, a memory or learnings folder, a roadmap, the
order of work. 🔴 **And what the stranger rounds measured about prose** (OWN-023 r1–r2, OWN-018): agents skipped
instructions that were in front of them; a Gala round copied the original game into a NodeGX shell and called it done
with the kit's guidance in its context, and converted for real only when told plainly, with a conversion rule and a
log (B2, `own-023/ROUND-2-THE-GALA.md` §9.4) — the rule, stated as a rule, is what worked. **Prose advises; gates bind.**

The knowledge to distil is in this repo: `dev-docs/bugs/` (177 rows), the memory index's judgement traps, the
templates' `DEFECTS-THE-TEMPLATES-FOUND.md`, the play-tests (P95, P108, P113), the stranger recipes
(`a-stranger-agent-round-recipe`), the first-day skill. It is not in a shape a person's project can carry yet.

## 3. The rule

The seed has four parts, and the thinnest possible first one:

1. **A thin note.** `CLAUDE.md` says the order of work in a dozen lines — scope and write the brief; play-test the
   first screen with the person before polishing; plan; build in small steps; render and look; ship — and names
   where each thing lives. It points at the skills; it does not contain them.
2. **A folder shape the tools read and write.** `docs/brief.md`, `docs/plan.md`, `docs/tasks/`, `docs/bugs/`,
   `docs/playtests/`, `docs/memory/`, `docs/learnings.md`, `docs/roadmap.md`. The server writes the brief and the
   plan there (it does already); a `file_bug` tool writes the ledger row; `render_report` writes its play-test note
   there. A folder the tools use is a folder the agent keeps using.
3. **Skills loaded on trigger**, not a dump: the first day (exists), sizing the work (exists), play-test first, the bug
   ledger, the hand-over between sessions, leaving (export), and the distilled traps: one file each, short, each line
   cited to the case it came from, in the content skill's style (rule 0: the fact first).
4. **Every rule that matters as a refusal in the server.** The first: a page whose whole content is one HTML blob
   (the Gala shell-copy) is refused by the validator with the reason and the way to do it in nodes. Then the ones the
   bug ledger shows agents repeating.

## 4. Acceptance criteria

- **AC1 — unprompted.** A stranger round (OWN-023's harness) with the seed and a one-paragraph brief: the agent
  writes the brief, runs a play-test of the first screen and asks the person about it, and keeps the task list and
  the bug ledger, with none of those asked for in the brief. Control arm: the same brief on the bare seed of 0.2.4.
- **AC2 — the shell-copy is refused.** The Gala round-2 shape (a page that is one HTML blob) is refused by name, and
  the refusal says what to build instead; the round's agent builds it in nodes on the second try.
- **AC3 — the folder is used, not decorated.** After the round, every folder in §3.2 has a file the agent or a tool
  wrote during the build; none is empty, none is a template left as shipped.
- **AC4 — a person can read it.** Richard opens `docs/` after a round he did not watch and says what the app is,
  what is broken and what is next, from the files alone.
- **AC5 — the skills carry their sources.** Every line in a distilled skill cites the row, memory or play-test it
  came from, so a wrong lesson can be traced and removed.

## 5. Not this task

The editor-building skill (OWN-007, built); the honesty number (SEE-001); the security report (SEE-012). The
knowledge bank as a public document for people who do not use NodeGX (a later decision; DIRECTION §0 says the half
that is runtime-agnostic is copyable and the moat is where it is tied to the format).
