# SEE-008 — The companion door: the MCP a vibe coder's agent actually meets

**Opened 2026-10-01.** **Depends on SEE-001, SEE-002.**
**Status: 📋 not started.**

## 1. The person sentence

> **A person whose agent has never seen NodeGX connects it, and the agent is told in one page what NodeGX is for, writes
> components in the text form with two tools, sees the honesty number in every answer, and spends a fraction of the
> tokens a template build spends today.**

## 2. What is measured (README §1 reading 4)

105 tool names in `toolGroups.ts`, 26 tool modules, a surface budget gate, a briefing pinned character for character.
The P109 audit found every template generator goes through `create_plan → stage_plan_operation → apply_plan` and writes
the rest by hand. SEE-000 records what each build cost through the door.

## 3. What to build

1. **The briefing, rewritten for the companion.** The bound briefing keeps every paragraph that answers a measured
   failure (they are pinned for a reason) but leads with the four reasons (README §2) and SEE-002's grammar page.
   Length measured in tokens before and after; the surface budget gate reads it.
2. **What is advertised.** For a bound project: `get_project_info`, `get_style_vocabulary`, `write_component_text`,
   `check_component_text`, `render_report`, `explain_component`, `find_tools`. Everything else behind `find_tools`
   (AWP-006's mechanism). The plan tools stay reachable for the generators until SEE-004's replacements land.
3. **The number everywhere.** Already SEE-001's job; this task checks it is in every advertised tool's result and reads
   the same.
4. **The measurement.** The todo template rebuilt by an agent through the new surface from its brief (`docs/BRIEF.md`),
   tokens and tool calls recorded, against SEE-000's row for the same template. One run, one row, no estimate.
5. **The unbound briefing** says the companion sentence and nothing about authoring, because the unbound server cannot
   revise it later (the `instructions.ts` header's warning).

## 4. Acceptance criteria

1. The advertised surface for a bound project is the seven tools in §3.2, under the budget gate.
2. The todo rebuilt through the door costs fewer tokens on the MCP surface than SEE-000's row, and the result's drives
   pass and its honesty number is not lower than the shipped template's.
3. `tests/instructions.test.ts` is updated in the same commit as the briefing, with a paragraph-by-paragraph note of
   which measured failure each kept paragraph answers (so nobody trims one later).
4. A stranger agent given only the briefing authors a two-component page green, and its questions are recorded here as
   the next briefing edits (NSP-006's method).

## 5. Watch for

- Memory: *MCP: 5 budgets, 8 free.* Read the budget tests before adding a tool to the advertised set.
- Memory: *an opt-out flag on a loader must be censused by caller.* `find_tools` deferral has callers (the generators);
  list them before moving a tool behind it.
