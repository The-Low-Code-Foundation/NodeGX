# P103 — next session

**Written 2026-09-24**, when the phase opened from Richard's drive of P102.

## Where it stands

P102's token composer is built. Richard drove it and found twelve things, all about the **touch
points**: between the Styles panel and the nodes, and inside the panel itself. They are CMG-001…010
here, in [README §3](README.md#3-the-tasks)'s order, and CMG-011 is his drive. Nothing is built yet.
Every task file has the measured code pointers (file:line, read on 2026-09-24 at `1a35902c0`),
what to build and the ACs. Re-measure a pointer before you rely on it
([[measure-the-artefact-before-believing-the-task-file]]).

## Do this

1. Read the README (§1 person sentences, §2 findings, §7 rules), then the task you're taking.
2. Build in §3's order. CMG-001, 003, 004, 007 and 008 have no dependencies. CMG-005 unlocks
   002, 006 and 010, so do it early. **CMG-004 first if you only do one**: it's the finding that
   lost work.
3. Every task ends in a drive on a **copy** of a real project, with the person sentence in front of
   you. Green specs don't close a row.
4. Anything Richard has to decide goes to him in plain words, with a recommendation. The only
   open one is **RC-8** (does 0.3.0 wait on these?).

## Traps already known

- 🔴 The index on `cline-dev` had **512 staged deletions** on 2026-09-24 (P102's docs, the token
  codecs and composer, `templates/…`), with the files still on disk. That is not this phase's
  change. **Commit only with pathspecs**, and ask before touching the index
  ([[staged-files-get-swept-by-a-siblings-commit]]).
- *Landing page test V2* is the fixture for CMG-004 (142 stored tokens, 46 real). The drive copy
  `CMP-007 Richard Drive` lost its tokens to *Reset all*; `CMP-007 Richard Drive.before-0.3` has
  them.
- Opening a project writes files into it: drive copies ([[opening-a-project-now-writes-three-files-into-it]]).
