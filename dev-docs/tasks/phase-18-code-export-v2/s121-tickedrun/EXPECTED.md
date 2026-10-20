# What the drive should read (written before the export arms ran, session 121)

The runtime arm was driven first, on the fixture as generated before its boxes were written out (unset, which
`render-from-disk` reads as ticked). These are its readings. The two export arms are predicted from the emitted code
(`out-fixed/src/pages/Home.tsx`, `out-control/src/pages/Home.tsx`), in development mode, so under StrictMode's second mount.

Each cell is Holding · Runs · Ready at · Done at · Said, blank where the Text shows nothing.

| step | runtime (measured) | export-fixed (predicted) | export-control, HEAD `2419c0897` (predicted) |
|---|---|---|---|
| S0 load | a · 2 · 2 · 2 · 1 | a · 2 · 2 · 2 · 1 | blank · blank · blank · blank · blank |
| S1 Pick b | b · 3 · 3 · 2 · 1 | b · 3 · 3 · 2 · 1 | unchanged |
| S2 Pick b again | unchanged | unchanged | unchanged |
| S3 Run | b · 4 · 4 · 4 · 1 | b · 4 · 4 · 4 · 1 | unchanged |
| S4 Pick c and run | c · 5 · 5 · 5 · 1 | c · 5 · 5 · 5 · 1 | unchanged |
| S5 Again | c · 5 · 5 · 5 · 2 | c · 5 · 5 · 5 · 2 | blank · blank · blank · blank · 1 |

Why the fixed arm should read that:

- **S0.** The Variable's seed effect stores `a`; the ticked effect reads `item.get()`, sees an arrival, and runs (1, ready
  1, no Done); "Say the word"'s effect sees its literal arrive and runs (said 1); the page's Did Mount effect records `a`,
  runs (2, ready 2), and Done writes 2. StrictMode's second mount: the held values match and the mount ref is set, so
  nothing runs again; the re-render with `item` = `a` is not an arrival. The runtime reads the same: the arrival at
  creation, then Did Mount's Run.
- **S1.** A new value: one run without Done. **S2.** The same value: no re-render, no run.
- **S3.** Run: the Run's own run, with Done.
- **S4.** One click sets `c` and sends Run. The handler records `c` before the run, so the effect after the re-render
  finds nothing new: one run, with Done. The runtime coalesces the two into one run the same way.
- **S5.** Again: said 2, the node's count kept across runs.

The control: HEAD refuses "Hold the item" whole (its `runs` output feeds a Set Variable inside a signal chain refused for
the ticked box, so the read counts as outside the Run chain), and drops the page's Did Mount ("no DOM event
equivalent"). "Say the word" exports on Again only.
