# NSP-006 — A stranger's target

**Opened 2026-09-29.** **Depends on NSP-004.**
**Status: 📋 not started.**

## 1. The person sentence

> **An agent that has never seen the NodeGX runtime builds the pilot five for a brand-new target
> from the spec, the suite and the adapter interface alone — and the suite, not the agent, says
> when it is done.**

This is the phase's thesis, tested directly. If it fails, the batches are a documentation
exercise; if it passes, every future target (framework-free web, native, a cloud runtime in
another language) is a mechanical, parallel job.

## 2. What to do

1. **The target:** plain JavaScript, no framework, no `@nodegx/core` — a tiny signal library the
   agent writes itself. Deliberately different from both existing implementations.
2. **The brief** handed to a fresh subagent contains only: the five spec files, their JSON
   scenarios, the trace schema, the `TargetAdapter` interface, and the runner command. **It is
   not given** the runtime source, the exporter, or this phase's README. (A worktree with those
   paths removed is the simplest way to be sure — memory: use `make-worktree.sh`.)
3. The agent loops until the runner is green, then writes up what was ambiguous.
4. **The suite is read-only to the agent.** The runner hashes the spec and scenario files before
   and after; a changed hash fails the run regardless of the result.

## 3. Acceptance criteria

1. The stranger's target conforms on all five at the **deep** budget, with the suite's hashes
   unchanged.
2. The mutants (NSP-003 AC3) are also run against the stranger's target's own adapter to show the
   suite is not trivially satisfied by it.
3. §5 records: the agent's questions (every place the spec was ambiguous), time and tokens spent,
   and how many runner iterations it took. **Each ambiguity becomes a spec fix** before the batches
   start.
4. The target is **not** kept as a product. It stays in the repo as a test fixture (a second
   independent implementation catches spec bugs the runtime shares with its own spec).

## 4. Watch for

- **A stranger who reads the runtime anyway is not a stranger.** Check the brief and the worktree,
  and ask the agent in its final report which files it opened.
- If it passes easily, suspect the suite before celebrating (memory: *a green gate pins nothing if
  the hole is shaped like the defect*). AC2 is there for that.

## 5. Built

*(empty)*
