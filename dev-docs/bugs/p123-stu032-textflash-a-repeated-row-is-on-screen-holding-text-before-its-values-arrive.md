---
id: P123-STU032-TEXTFLASH
title: "runtime: a row a list draws is on screen for a frame or two holding its Text elements' default \"Text\" before its values arrive"
status: open
severity: low
area: runtime (a repeated item component's inputs reach its Text nodes an update after the row is mounted), seen in the in-page preview
found: NodeGX Studio STU-032 (The-Low-Code-Foundation/nodegx-studio), 2026-10-20 — the run timeline's copies of the screen, taken at the next frame after each change
evidence: nodegx-studio editor/probe.js (`__studioShots`, a copy of the page's body at requestAnimationFrame after a change; `__studioScreen`, the MutationObserver log); docs/SCOPE.md "Done (STU-032)"
---

On the todo template's Todo page, opened with one task, the task list (Open tasks, the `/Todo/Task list` copy) draws
its row in two steps. Measured in NodeGX Studio's in-page preview (headless Chrome, 60 frames a second):

- 830 ms: the row is inserted. The MutationObserver's text sample of the insert is `TextTextTextLabel` (three Text
  elements reading their default "Text", and a label), and the copy of the page taken at the next frame holds them:
  its HTML has `>Text<`, its text reads "Text / Text / Text / Label".
- 853 ms: the values arrive (the task's title, its count, "✓"), the next copy shows the task.

The values arrived 23 ms after the insert, later than the next frame (16.7 ms), so a frame in between painted the row
reading "Text". An earlier run had it at 737 → 751 ms (14 ms: the same frame or the next). So a person sees the
placeholder for one or two frames, every time a list draws a row.

Not seen with eyes or in pixels: the copy is taken in a `requestAnimationFrame` callback, which is what the next paint
shows unless something later in the same frame changes the page (the runtime's own frame callback, if it has one,
could run after it). The 23 ms gap says the values came in a later frame, not later in the same one.

Reproduce: in nodegx-studio, `npm run check:timeline` with `TIMELINE_DUMP=1`; after the page opening,
`__ob.timeline.shots.list.filter((s) => />Text</.test(s.html))` is the copy at the row's insert.

Proposed direction (not measured): mount a repeated item with its first inputs already set (or keep it hidden until
its first update), so a Text's default never reaches the screen. A gate: no copy taken at a frame during a list's draw
holds a Text element's default text.
