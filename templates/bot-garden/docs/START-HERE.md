# Bot Garden

A coding game for 7–12 year olds, in English and French, built entirely out of NodeGX nodes. A child drives a
small robot by hand, watches her steps appear as blocks, and lets the game fold the repetition into a loop.
Nothing is timed, scored or streaked; the reward is a hat.

There is no backend and no account. The family lives on this computer (localStorage, key `bot-garden`), and
the Grown-ups screen shows a save code that carries the whole garden to another computer.

## The first thing to change

Open **Data/Requests** and find the node labelled **"EDIT — the requests: this list IS the island"**. It is a
`Static Data` node holding a JSON array; one entry is one islander asking for help: its map (rows of letters),
the things on it, where the robot starts, the goal (a named check, never code), the blocks offered, and the
reward. Add one and it is on the island. Every word is one row in **Data/Words**, English and French.

## How it works, in the graph

- **`Logic/*` are the named utilities.** The engine (`Logic/Step`, `Logic/Fold`, `Logic/Choose hint` …) and the
  glue between it and the screen (`Logic/Record step`, `Logic/Draw world` …) — each a `Component Inputs` → one
  Function → `Component Outputs`. `Logic/Step` runs one step of a program and returns what changed;
  `Logic/Apply delta` is the only thing that ever changes the world.
- **`Workshop/Runner` is the loop:** one step, a Timer, the next step, until the run is done.
- **The Teach pad drives the robot with the engine’s own step**, so what the child drives is exactly what
  Play will do. The fold is only ever offered; the child taps "Fold it".
- **The owl’s hints are a table** (`Data/Hints`). The game picks the line; Olive, the offline model, may only
  say it in her own words (the desktop shell’s `/__garden/olive`). With no model, the written line is shown.

## Library modules travel with this project

`noodl_modules/garden-kit` draws the blocks and the garden; `noodl_modules/game-kit` draws the faces.
`noodl_modules/bot-garden-fonts` is Fredoka (SIL OFL 1.1, the licence beside it). Nothing is fetched at runtime.
