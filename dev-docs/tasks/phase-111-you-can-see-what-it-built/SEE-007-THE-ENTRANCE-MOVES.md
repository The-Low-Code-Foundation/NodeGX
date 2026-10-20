# SEE-007 — The entrance moves: nobody starts on the canvas, everybody can descend to it

**Opened 2026-10-01.** **Depends on P93 TVW-001…008 (built, three await WORTHY), P101 (WORTHY), NSP-019.** R5 asked.
**Status: 📋 not started. A look-closed task: Richard's WORTHY closes it (P81 protocol).**

## 1. The person sentence

> **Someone opens a project and sees their app running, with the two trees beside it saying what the screen is made
> of and what parts they have. They click a thing in the app and are taken to the part that draws it and the rule that
> drives it. They change a colour or a limit there and watch the app change. The canvas is one step down, and they go
> there when they want to, not because they had to.**

## 2. Why

P93 §1 is the diagnosis: the editor opens on the one tree people ask about second and never says which surface they are
looking at. P93 built the trees and the preview sentence; this task changes **where a project opens and what a click in
the preview does**, so the ladder reads top to bottom: look at the app → read the part → read the rule → try the node →
the canvas → export. RISE had only the bottom rung. NodeGX has every rung and makes you start in the middle.

## 3. What to build

1. **The entrance.** A project opens with the preview filling the centre, Layers and Components on the left (P93), the
   property panel on the right showing the project's honesty number (SEE-001) and nothing selected. The canvas is a
   tab beside the preview, not the default.
2. **The hinge from a pixel.** Alt-click (or the existing pick mode, if P101 has one) on anything in the preview selects
   its instance in Layers, shows its node's properties on the right, and shows NSP-019's *What this node does* and *Try
   this node* under them. The canvas tab lights up to say where the node is; one click goes there with the node framed.
3. **Steering without the canvas.** From the property panel reached this way: change a design token (P102's composer),
   a parameter, or re-point a wire's source from a list of the component's outputs. Each change is the same undo group
   it would be on the canvas.
4. **The script mark.** A selected instance whose node is script (SEE-001's definition) says so in the panel, with the
   code readable there and a line: "this part's behaviour is not specced; the honesty number excludes it."

## 4. Acceptance criteria

1. A fresh project and the training template both open on the running app with the trees; no canvas is drawn until
   asked (drive, screenshot).
2. Alt-click on the lesson card's title in the training template selects its Text node, shows its rules, and one click
   frames it on the canvas (drive).
3. Changing a token from the panel reached by alt-click repaints the app without the canvas tab being opened (drive;
   memory: *a theme flip does not apply in the same eval*; read after a frame).
4. The disorientation test P93 BEN-007 §C has waited on: someone who did not build it opens the training template and
   says, unprompted, what the screen is made of and where one part's logic is. Pass or fail recorded in their words.
5. Richard rules the entrance WORTHY from screenshots opened for him (memory: *open the PNGs, do not link them*).

## 5. Watch for

- Memory: *RECT≠VISIBLE; `elementFromPoint`.* The pixel hinge must resolve the element a person sees, not the first
  rect that contains the point.
- Memory: *a hash change is not a navigation.* Switching the centre tab must not reload the preview.
- Do not redraw P92/P93's panels. This task changes the default tab, adds one hinge and one panel section.
