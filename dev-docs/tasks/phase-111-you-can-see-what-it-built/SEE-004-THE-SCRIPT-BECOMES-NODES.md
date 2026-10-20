# SEE-004 — The script becomes nodes: the idioms every template wrote by hand

**Opened 2026-10-01.** **Depends on SEE-000; NSP-018's `idioms` field; coordinates with P110 PKT-002 and P109 ISL-005.**
**Status: 📋 not started.**

## 1. The person sentence

> **The things every template had to write as JavaScript, because no node did them, are nodes now, each with a spec
> that says what it does, and the honesty number of every template went up because of it.**

## 2. What is known

| template | Functions | lines | what P110 / P109 already found inside them |
|---|---|---|---|
| training | 147 | 7,796 | not yet read; SEE-000 §5 lists the three largest |
| todo | 52 | 2,620 | 10 touch the browser (a 349-line date picker, 211 lines of drag-to-reorder twice, theme, deep links, lifecycle); about 42 are plain logic (PKT-000) |
| island | 83 | 2.39 MB | 17 copies of one engine because a Function cannot share code (ISL-005); 9 of 11 Timers are guessed waits |

## 3. What to build

1. **The classification.** Every Function in the three templates read and given one idiom from a list this task grows:
   *date maths*, *string shaping*, *list reshaping*, *browser API*, *backend call shaping*, *state machine*, *engine*,
   *glue between two nodes*, *other*. Output: `idioms.json` beside the census, and a table in this file with counts.
   The reading is the work; do not sample.
2. **The rule for "becomes a node":** an idiom that appears in two or more templates, or more than five times in one,
   becomes a node spec in P107's format, batched as **NSP-022** in P107 (filed there with a pointer here, memory: *a
   finding may already be another task's acceptance criterion*; PKT-002 already owns the todo's five browser nodes, so
   this task does not re-own them).
3. **Each new spec carries `idioms`** (NSP-018): the code shape it replaces, with the template's own Function as the
   example. That is the lookup table SEE-006's import reads.
4. **The replacement in the templates**: each template's Functions that an existing or new node now covers are
   replaced, the template's drives re-run, and its honesty number recorded before and after in the ratchet.
5. **What stays script**, named: the idioms that are genuinely the person's own logic. That list is NSP-017's input.

## 4. Acceptance criteria

1. Every Function in the three templates has an idiom in `idioms.json`; "other" is under 15% of them or the list grows.
2. At least the recurring idioms are specced and conform on the runtime at 200 with every mutant killed (NSP-003's bar).
3. Each template's honesty number is higher after replacement than in SEE-000, in the ratchet, with the templates'
   existing drives green.
4. Every new spec has at least one `idioms` entry whose example is a real Function from a template.

## 5. Watch for

- Memory: *before trusting a "NodeGX has no X" memory, re-grep the product.* `Repeat` existed before the island hand-built
  its loops. Check the catalog before specifying any node.
- Memory: *the Out: line can hold the defect.* PKT-002's five nodes are out of this task's scope and in its count.
