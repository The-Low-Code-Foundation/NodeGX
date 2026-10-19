# What each arm should read (P18 session 128)

The Set Desk (`packages/nodegx-export/tests/helpers/set-desk.ts`), the steps Ready, Order, Play, Answer. Each reading is
every drawn Text in document order: the page's Said, Echo, Order, Told and Game, then the Banner's text when it is open
and the Game's when its box is mounted.

## The runtime (measured first, `runtime-mounted-arm.js` on its own nodes, `probe.ts`)

| step | reading |
|---|---|
| load | said nothing · echo nothing · order nothing · told nothing · game idle |
| Ready | ready · ready · order nothing · told ready · game idle · the banner |
| Order | ready · ready · second · told ready · game idle · the banner |
| Play | ready · ready · second · told game · game on · the banner · the game |
| Answer | answer yes · ready · second · told game · game on · the banner · the game |

What it says about the runtime: a Set Variable's Done runs its chain, and a reader of the variable in that chain sees the
value just written (Ready: Echo reads "ready"); Completed runs after it ("told ready"); a Done into a placed component's
signal input runs the chain inside (the Banner opens; the Game's `start` runs although the same click mounts the Game's
box); a Done chain inside a component, run from a signal input, runs there too (the Game writes "game on", then "told
game"); a Done into the component's own signal output reaches the page (Answer: the page reads the answer the Quiz just
set).

🔴 **Order was predicted wrong.** Read from the update loop (`nodecontext.ts` `updateDirtyNodes`), the prediction was
"done after": the Done's target is pulsed during the first wire's update, so it would update after the click's second
wire. Measured: **"second"**. A node flagged dirty flags its dependees dirty with it (`_performDirtyUpdate` →
`flagDependeesDirty`), so the Done's target is on the dirty list right after its sender, before the click's second wire;
and a node pulls its inputs' nodes first (`_updateDependencies`). The chain runs first, then the click's next wire: first,
done after, completed after, second. That is the order the export prints a chain in (depth first, in wire order).

**The first draft** was measured on both arms before the variants were written, and read three things that are not this
bug's; each is filed and the fixture moved off it:

- The Game held its own Variable, authored "game idle". The export stores a seeded Variable on every mount of its
  component, and under StrictMode the second mount's store landed after the `start` pulse's write: "game idle" where the
  runtime reads "game on" (P18-S121-SEEDTWICE, and P18-S128-SEEDREMOUNT: the runtime stores it once, at the instance's
  creation). The Variable is the page's now.
- The Condition variant, its box left ticked, ran its arm **at load** in the runtime (the Condition tests its value as it
  arrives), not in the export: P18-S128-CONDLOAD. The variant unticks the box; it is about the click.
- The control's Game Text, wired from a Variable with no value, read "Text" in the runtime and nothing in the export
  (P18-S122-TEXTDEFAULT). The Game's Text is a literal now.

## The export at the base (`8b5382a17`, measured)

Ready: "echo nothing", "told nothing" and no banner; Play: "told nothing", "game idle" (the box is mounted, the Game's
`start` never sent); Answer: "ready" (the Quiz's `answered` never fires). 4 of 5 readings differ. Order agrees: the one
write after the chain, "second", wins in both.

## The export after the change

Exactly the runtime's readings, under StrictMode, 5 of 5. The variants, predicted before they ran, and all matched:

- **the click's wires the other way round** (Order's second wire first): second, then first, done after, completed after:
  Order reads **"completed after"**, in both arms.
- **a Condition between** the Ready click and its Set (its box unticked, Evaluate from the click, the condition the
  literal true): the same readings as the desk.
- **the control**: every wire out of a Set Variable's Done and Completed removed: Ready "ready · echo nothing · order
  nothing · told nothing · game idle", no banner; Order "second"; Play the Game drawn, "told nothing", "game idle"; Answer
  leaves "ready". Both arms.
- **a field cleared on the click's first wire, read in the Done chain** (added after the mutant arms found the snapshot
  ungraded): Wipe clears a field authored "note Ann" and then sets `said` to "wiped", whose Done sets `echo` from the field's
  text: "wiped · (empty)" in both arms. The export prints `setNote(''); said.set('wiped'); echo.set('');`.

# The Sibling Desk (P18-S127-SIBLINGVALUE, EXP-011 §96)

`packages/nodegx-export/tests/helpers/sibling-desk.ts`, the steps Pick A, Pick B, Pick A, Choose C, Pick A. Each reading is
the page's Said, then the Shower's literal text.

## The runtime (measured first, `sibling-probe.ts`)

| step | reading |
|---|---|
| load | said nothing · the shower |
| Pick A | task a · the shower |
| Pick B | task b · the shower |
| Pick A | task a · the shower |
| Choose C | task c · the shower |
| Pick A | task a · the shower |

A placed component's value output wired into another's input has arrived when a signal sent after it runs the chain that
reads it, from the sibling (the Picker's `chose`) and from the page's own click (Choose C sets the Variable the Picker's
output reads, then pulses `show`).

## The export at the SETDONE commit (`ffd3d7179`, measured)

Every reading after load is "(empty) · the shower": the wire into `which` is dropped ("has no static binding"), and the
chain writes `undefined`.

## The first build, measured: the value one pulse late

Binding `which` to the parent's lifted row (CONTROLLED-STATE §4d) and nothing else, predicted from the effect order to read
the previous value: Pick A "(empty)", Pick B "task a", Pick A "task b". Measured exactly that. The child pushes a lifted
value from its effect, in the commit the pulse lands in, and the sibling's chain runs from its own effect in that same
commit, before the parent has re-rendered with the value.

## The export after the change

The count handed to the Shower follows the count sent from the parent's own effect (a parent's effects run after its
children's), so the lifted value and the pulse land in one render: exactly the runtime's readings. The variants, predicted
before they ran:

- **the page's two wires into the Shower the other way round** (`chose → show` listed before `picked → which`): the same
  readings, in both arms.
- **the control**: both wires into `show` removed: "said nothing · the shower" at every step, in both arms.
