# NSP-010 — A behaviour change is a version, a trace diff, and a migration answer

**Opened 2026-09-29.** **Depends on NSP-009.**
**Status: 📋 not started.**

## 1. The person sentence

> **When a node starts behaving differently, it is on purpose, it is visible in the diff as
> before-and-after traces, and someone has decided what happens to apps built on the old
> behaviour.**

## 2. What to build

- **Golden traces**: for every specced node, the hand scenarios' traces are committed as JSON.
- **The version rule**: if any golden trace changes, the spec's `version` must go up **in the same
  commit**. A gate compares the golden traces against the previous commit's and fails a changed
  trace with an unchanged version.
- **The migration answer**: a version bump requires a `changes` entry in the spec with one of:
  *no migration (why)*, *project migration (its id)*, or *compatibility parameter (its name)* —
  the last is what Counter already has in *Treat Unchanged as*.
- **The retrofit**: Counter's FH-022 Reset change recorded as the first history entry, with the
  before/after traces, so the mechanism is proven on a real case.

## 3. Acceptance criteria

1. Changing a reducer branch in a spec without bumping `version` fails the gate (planted, shown).
2. Bumping `version` without a `changes` entry fails.
3. The Counter retrofit is present, and its before-trace reproduces on the runtime at the commit
   before FH-022 slice 3 (read with `git show <sha>:<path>` into a temp file, never checked out).
4. The golden-trace diff renders as a readable table in the PR (value / signal / outcome columns),
   not raw JSON.

## 4. Watch for

- Memory: *a rename of a built-in port ships no migration.* A port rename is a behaviour change to
  every saved project; the version gate must treat a port rename as one.
- Memory: *an on-load migration owes its own save.* If an answer is *project migration*, that
  migration's task owns the save; this task only records the answer.

- **Two holes a stranger measured (s16, round 3b — [NSP-006 §5.8](NSP-006-A-STRANGERS-TARGET.md)).** Three specs
  are now v2 by a ruling (Boolean To String s12, Animate To Value and States s16), and each change note is a
  comment above `version:` — the format has no field for it, and a scenario says which version it pins only in its
  name. A target cannot say which version it implements, so an out-of-date one reads as trace differences, not as
  "v1 target, v2 spec". And no mutant encodes the previous version (Animate To Value's count stayed 25), so
  mutation grades nothing about a change. This task's gate is where both belong.

## 5. Built

*(empty)*
