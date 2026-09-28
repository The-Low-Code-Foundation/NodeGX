# IG-000 — The mockup: the island as a 3D world, the robots, the three modes

**Opened 2026-09-28**, from the ruling "go 3D and a bit more open world". **Status: ⬜ not started.** Depends on
nothing. Lane M (its own worktree is not needed: it writes only under `tpl-012-mockups/` and an artifact).

## 1. The person sentence

> **Richard opens one page, sees his daughters' island from above in flat-shaded 3D, pans to a plot where a
> robot is still watering, taps an islander, and drives a second robot in a Workshop that has Drive, Teach
> and Play — and says yes or no to the look before a kit node is written.**

## 2. What it is

A playable HTML artifact in the shape of P105's mockup (`../phase-78-the-templates/tpl-012-mockups/bot-garden.html`
and https://claude.ai/artifact/Bu4ZBYvh1PenHzAtLQTCJq), with the same palette, fonts and copy, and three new screens:

- **Island (3D).** A 24×16 tile island in three.js (from cdnjs in the artifact; vendored in the kit later),
  flat-shaded primitives only: boxes for tiles with a little height, cone-on-cylinder trees, an icosahedron
  rock, a box-and-prism house, stem-and-bulb tulips, the robots as a box body with a visor. One directional
  light, one hemisphere light, no shadow maps. A 35° camera that pans with one finger or a drag, zooms with a
  pinch or a wheel, and a "find my robots" button. Three plots: one won (its robot loops a watering program
  live), one open (an islander with a speech bubble), one locked (a fence and a padlock).
- **Workshop (3D scene, same blocks).** The plot's 8×6 seen through the same camera, the block panel as
  today, and the bar **Drive · Teach · Play · One step · Start over**; Drive moves the robot with the pad and
  records nothing; Teach records. The running block gets the new ring (IG-001 D5).
- **My robots.** A card per robot: name (editable), colour, hat slot, its abilities as its palette, its
  upgrade slot (bigger can / bigger basket), where on the island it works. Locked robots show who lends
  them.
- **Olive reads.** The three blocks (`read`, `is it a…?`, `say`) with their cards, and one played example:
  a note on a plot, Olive reads "the red ones", the `if Olive read` block steers.

## 3. Acceptance criteria

1. The artifact runs in Chrome on the Mac and in Edge on Windows 10 (the tablet's browser) with no console
   error; the island scene holds 30 fps or better on the tablet with the three plots animating — the first
   frame-time reading this phase has (a `stats` line in the corner, hidden by a key).
2. Every screen is in EN and FR from the P105 word table; no new string is untranslated.
3. The three plots, the three modes and the robot cards are clickable, not pictures; the won plot's robot
   actually steps its program in a loop.
4. The 3D look is graded by Richard against nothing (it is the first): his words go into this file verbatim,
   and IG-007 builds to this mockup, not to a description.
5. A screenshot of each screen sits in `tpl-012-mockups/island-3d/` beside the HTML, for IG-007's side-by-side.

## 4. How to build it

One file, no build step, three.js from `cdnjs.cloudflare.com/ajax/libs/three.js/` pinned to one version; the
P105 mockup's CSS and word table copied in, not linked. Keep the scene builder in one function that takes the
engine's world shape (`{map, things, robots}`) so IG-007 can lift it into the kit node.

## 5. Gates

The artifact opens on the tablet (Richard, by hand) and the stats line is read there; that number is written
in §7 before IG-007 starts.

## 6. Traps

A working wireframe is not the mockup: the palette, fonts and copy are the P105 mockup's, or the look is not
graded. No shadow maps, no post-processing, no textures: the tablet's HD 615 and the model on the same CPU.
`OrbitControls` is a separate file on cdnjs; pin both to the same version.
