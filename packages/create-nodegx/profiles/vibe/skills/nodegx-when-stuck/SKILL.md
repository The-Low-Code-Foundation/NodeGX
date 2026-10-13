---
name: nodegx-when-stuck
description: "What to do when a drive fails, a change is refused, or you're unsure how a NodeGX node behaves — how to find out quickly instead of reasoning in circles. LOAD when a checklist line fails, when a fix doesn't work, or when you catch yourself wondering what a node does."
user-invocable: false
---

# When you're stuck

Everyone gets stuck — it's part of the job, not a sign you're doing it wrong. What matters is getting unstuck
quickly. The builders before you found that long thinking is the slowest way out: one builder thought for half an
hour about why a value read 0 and went round the same loop again and again. A one-tap drive would have shown it in a
minute. So here's the order that works.

## 1. Read what you measured

When a `drive_page` line fails, read its result slowly. It tells you what was on screen, which variable held what,
which colour a thing had. Write the surprise down in a sentence: "after tapping Bern the score stayed 2". A clear
sentence about what happened is half the fix.

## 2. Ask the notes

`get_node_type` for the nodes involved, and read their notes and anti-patterns — most surprises are written there,
because someone hit them before. `get_project_info` lists the traps for this project. A refused change says exactly
what to fix: do that first, before anything else.

## 3. Try it small

If the notes don't settle it, don't reason it out — test it. Make a tiny page (or drive the real one) that does only
the thing you're unsure about, drive it, and read the values. "Does this Condition fire when its input changes?" is a
two-node page and one drive. Two minutes, and you *know*.

Don't go looking for the runtime's source code, and don't try to work out the whole timing of an app in your head:
the drive is faster and it's never wrong about what happened.

## 4. Look at the moment between

Many bugs aren't in either screen; they're in the instant between them — a value cleared one step too late, a gate
that fires while things are half-reset, the last screen's colour on the new words. Drive the transition and read
right after it, not only once things have settled.

## 5. Two tries, then hand over

If your second fix doesn't make the line pass, stop there. That's not giving up; it's the right moment to hand over.
In `NEXT.md` write:

- the line that fails, and what you measured (the exact values);
- what you tried, and what each try changed;
- what you suspect, marked as a guess.

Start that note with `# Next session: fix — <the line>`, mark the line `FAILED` in the checklist, and stop. A fresh
session reading that note starts with everything you learned and none of the tiredness — it very often sees it at
once.
