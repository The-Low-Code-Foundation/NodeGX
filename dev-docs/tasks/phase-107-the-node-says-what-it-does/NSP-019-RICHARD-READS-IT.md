# NSP-019 — Richard reads it: the inspector shows a node's rules, and *Try this node*

**Opened 2026-09-29.** **Depends on NSP-018.**
**Status: 📋 not started. The phase's only surface a person sees; Richard's drive closes it.**

## 1. The person sentence

> **Someone looking at a node on the canvas can read, in plain words, exactly what it will do —
> and try it on its own, with values they type, without building a test page.**

## 2. What to build

- **The rules** (NSP-018's generated list) in the property panel for a specced node, folded under
  a *What this node does* heading.
- **Try this node:** a small panel that runs the node's spec in the interpreter (NSP-001) — set
  its inputs, press its signals, and watch its outputs and outcomes as a readable trace. It runs
  the **spec**, not the project, so it works on a node with nothing wired to it.
- For a node whose spec and runtime ever disagreed (a §6 row anywhere in the phase), the panel
  says so, with the ruling.

## 3. Acceptance criteria

1. The rules show for every specced node and are absent (not empty) for an unspecced one.
2. *Try this node* on Counter reproduces the pilot's hand scenarios step by step (drive).
3. Richard drives it and his verdict is recorded here in his words.

## 4. Watch for

- Memory: *correct and usable were never the same criterion.* A trace is correct; a person may
  still not understand it. Show it as a timeline of plain events, not JSON.
- Memory: *a `Select` inside a `Modal` closes it*, and the editor has two `BaseDialog`s — use the
  panel patterns the inspector (phase 101) already uses.

## 5. Built

*(empty)*
