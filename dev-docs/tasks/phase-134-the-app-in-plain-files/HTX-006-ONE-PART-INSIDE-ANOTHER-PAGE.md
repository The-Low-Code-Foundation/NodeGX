# HTX-006 — One part inside another page

**Phase:** [134](README.md). **AC:** AC5. **Sessions:** 1. **Needs:** HTX-001–003.

## The sentence

> "My game is three.js. Its pause menu is a NodeGX component. I made the menu wider in Studio, exported it again, and
> the game picked it up. None of the game's own files changed."

## Build

- `nodegx export --target html --component <name> --out-dir <folder>`: the component, the components it places, their
  CSS, and the `lib/` files they import, into `<folder>`. No `index.html`, no router.
- **A manifest** (`<folder>/nodegx-export.json`) lists every file the export wrote with its hash. A re-export replaces
  those files, removes the ones it no longer writes, and refuses (by name, writing nothing) if any of them was changed
  by hand since. It never touches a file it did not write. This is what makes a repeated export safe in a folder the
  game's own code shares.
- The component's inputs and outputs are its interface: `mountPauseMenu(el, { volume: 0.8 })`, its outputs a `value`
  the game subscribes to (`menu.outputs.resume.subscribe(…)`, in `lib/core.js`'s own terms). Signals out as events.
- CSS scoped to the component's root class, so the game's page styles and the menu's do not leak into each other.

## Done when

- A small three.js page in `htx-006/` (not a template, not one of Richard's games) mounts a settings menu built in
  NodeGX for it: a volume slider and a Resume button the game listens to.
- Change the menu's width in Studio, re-export: the menu is wider in the page; `shasum` over the page's own files is
  equal before and after; a hand edit to an exported file makes the next export refuse and name it.
- Then, with Richard's OK, the same on a copy of one of his games (ThreadSpace's or the Dig's menu): his choice.
