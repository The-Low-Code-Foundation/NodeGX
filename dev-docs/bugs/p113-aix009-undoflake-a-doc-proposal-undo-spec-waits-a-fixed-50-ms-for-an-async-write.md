---
id: P113-AIX009-UNDOFLAKE
title: "The spec \"AIX-009 doc proposals accepting applies it and is one undo step\" waits a fixed 50 ms for the undo's file write, and failed once on CI"
status: open
severity: low
area: "`packages/noodl-editor/tests/ai/project-docs.test.ts`, the spec \"accepting applies it and is one undo step\" (`setTimeout(resolve, 50)` after `UndoQueue.instance.undo()`)"
found: COMMUNITY-CFSECRETS session, 2026-11-27, on The-Low-Code-Foundation/NodeGX#58 (a docs-script-only change), run 46012659714, job "Test (editor)", seed 59638
evidence: "`Jasmine: 3083 specs, 1 failures`. `FAILED: AIX-009 doc proposals accepting applies it and is one undo step — Expected '# Architecture\\n\\nRewritten.\\n' to be '# Architecture\\n\\n## Data model\\n\\nOne Books collection.\\n'.` The same suite passed on #57 against the same `main` minutes earlier (another seed). The PR changed only `scripts/bubble-phrasebook/check.js`, which the editor suite does not load."
---

The spec accepts a doc proposal, undoes it, then waits a fixed 50 ms for the undo's asynchronous write before it reads
the file. Once, on a GitHub runner, the file still held the proposed text when it was read. Undo did fire:
`undone` was defined.

The comment above the wait says what it guesses: "give it the microtask + IO turn". On a loaded runner, 50 ms is not
always that.

**Proposed fix:** wait for the write itself, not a duration. Poll `read()` until it equals `ARCHITECTURE` with a
deadline of a few seconds, or have the undo action return its write's promise and await it. Then run the spec under
seed 59638 to confirm that it holds there.
