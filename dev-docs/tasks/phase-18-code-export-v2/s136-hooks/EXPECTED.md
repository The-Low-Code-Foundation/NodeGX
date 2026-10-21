# s136 — the Hook Desk, predicted before either arm ran (EXP-021 slice 1)

Written before the runtime arm or the export arm saw the desk (`tests/helpers/hook-desk.ts`).

## The desk

`Pages/Home` draws, in a column: **More**, the Text **y**, the Text **label**, **Go A**, **Go B**, the Texts **total A**,
**total B** and **dones**. Beside them, not drawn: the Function **bump** (Run ← More; `this.n = (this.n || 0) + 1;
Outputs.n = this.n`), and four placements of three logic components (no visual node in any of them, registry type
`visual` and the run-on-change boxes unset, as the templates write them):

- **Double** (`/Logic/Double`, x ← bump.n): Component Inputs `x` → a Function with no Run (`Outputs.y = (Number(Inputs.x)
  || 0) * 2`) → Component Outputs `y`. The page's **y** reads `y`. The templates' commonest shape (223 of 332).
- **Label** (`/Logic/Label`, y ← Double.y): the same shape, `Outputs.text = 'y is ' + Inputs.y`. The page's **label**
  reads `text`. One logic component feeding another (813 wires in the templates).
- **Tally A** and **Tally B** (`/Logic/Tally`, authored `step` 1 and 10; `go` ← Go A / Go B): Component Inputs `step`
  and the signal `go` → a Function Run by `go` (`this.total = (this.total || 0) + (Number(Inputs.step) || 0); Outputs.total
  = 'total ' + this.total; Outputs.done();`) → Component Outputs `total` and the signal `done`. **total A** / **total B**
  read `total`; both `done`s run the page's Function **dones** (`this.k = (this.k || 0) + 1; Outputs.k = 'dones ' +
  this.k`), which **dones** reads. A signal into a logic component, a signal out, two placements.

Steps: More, Go A, Go B, Go A, More. A reading is every drawn Text in document order: y · label · total A · total B · dones.

## The runtime (predicted)

| after | y | label | total A | total B | dones |
|---|---|---|---|---|---|
| load | 0 | y is 0 | Text | Text | Text |
| More | 2 | y is 2 | Text | Text | Text |
| Go A | 2 | y is 2 | total 1 | Text | dones 1 |
| Go B | 2 | y is 2 | total 1 | total 10 | dones 2 |
| Go A | 2 | y is 2 | total 2 | total 10 | dones 3 |
| More | 4 | y is 4 | total 2 | total 10 | dones 3 |

- A Function with no Run runs once at load (the script setter), so Double reads x undefined and says 0, and Label, fed
  0, says "y is 0" (P18-S133 measured the load run on a visual component's Function; this is the same node inside a
  logic one).
- A wired Text the wire has not reached shows the word "Text" (P18-S122-TEXTDEFAULT).
- The two Tallies keep two `this`es: an instance per placement.

## The export (predicted)

- **HEAD**: every node of the three logic components and their four placements refused ("logic node (…)"); bump and
  dones exported; the five Texts drawn and empty but none of them delivered: '' throughout, "dones" too (its Run's
  senders are refused: §94's "earned by attachment").
- **Built**: each logic component a hook in `src/components/<Name>.ts(x)`, `use<Name>(props)`, the same props
  interface a visual component has (values, a `go` pulse `{ sent, taken }`, `onDone`, `onYChanged`-style lifted
  callbacks); the page calls `useDouble`, `useLabel`, `useTally` twice, before its effects, and draws nothing for them.
  Readings equal the runtime's but the authored-default cells ("Text" → ''), at every step.

## Added after the first export emit (predicted before either arm saw it): Echo

The first emit showed the planner refusing a Run-wired Function's value into Component Outputs (s122's guard: todo-list's
lists sent `add` before their `title` arrived). §96 (s127) now hands a pulse to a placed component one commit after the
values lifted with it. The desk gains that shape, todo-list's: **Echo** (`/Logic/Echo`), `said` ← Tally A's `total`,
the signal `take` ← Tally A's `done`, a Function Run by `take` (`Outputs.echo = 'echo ' + Inputs.said`), the page's Text
**echo** after dones. Readings become y · label · total A · total B · dones · echo.

| after | echo (runtime) |
|---|---|
| load | Text |
| More | Text |
| Go A | echo total 1 |
| Go B | echo total 1 |
| Go A | echo total 2 |
| More | echo total 2 |

The runtime flags a Component Outputs value before its signal, so Echo's run reads the new total. The export must read
the same; "echo undefined" or "echo total 1" after the second Go A is the s122 defect.

## What the arms read

- **Runtime, first run: missed at load** — both Tallies had run once (total 1 · total 10 · dones 2). Not the product:
  the desk left the Tally Function's run-on-change box unset, which the editor's load and the exporter's parse migrate to
  unticked where Run is wired (NDA-017), and `runtime-mounted-arm.js` does not migrate, so it read `step` ticked and ran
  the Function on its arrival. The desk now writes every box out (s121's lesson, relearned). **Second run: exactly the
  table above, all six rows.**
