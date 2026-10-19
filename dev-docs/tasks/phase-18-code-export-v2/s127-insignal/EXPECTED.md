# What each arm should read (P18 session 127)

The Signal Desk (`packages/nodegx-export/tests/helpers/signal-desk.ts`), the steps Show, Change, Wipe, Hide, Ask, Ask,
Pick, Show. Each reading is every drawn Text in document order: the page's Said and Picked, the Banner's text and its
field's text when the Banner is drawn, the Lamp's text and the Relay's count, the Picker's text when it is drawn.

## The runtime (measured first, `runtime-mounted-arm.js` on its own nodes)

| step | reading |
|---|---|
| load | said nothing · picked nothing · lamp dark · 0 |
| Show | hello one · picked nothing · the banner · note Ann · lamp dark · 0 |
| Change | hello two · picked nothing · the banner · note Ann · lamp dark · 0 |
| Wipe | hello two · picked nothing · the banner · (empty) · lamp dark · 0 |
| Hide | said hidden · picked nothing · lamp dark · 0 |
| Ask | said hidden · picked nothing · lamp lit · 1 |
| Ask | said hidden · picked nothing · lamp lit · 2 |
| Pick | said hidden · picked filled · lamp lit · 2 · the picker |
| Show | hello two · picked filled · the banner · (empty) · lamp lit · 2 · the picker |

What it says about the runtime: a signal into a component runs the chain inside once per pulse (the count goes 1, 2);
nothing runs at load; a value the parent sets on the click's first wire (Change: `msg`) has arrived when the chain the
click's second wire sends in reads it ("hello two", not "hello one"); a signal input passed straight on into a child's
signal input arrives there (the Lamp); a field's Clear sent in from outside empties it; a pulse sent to a component the page draws only from that same
click (Pick: the Picker's box mounted by `pickerOn`) still runs the chain inside ("picked filled"), because the
runtime's instance exists while it is not drawn.

The Picker was added after the first build, which booted the child's ref with the count at mount: that build reads
"picked nothing" at Pick (measured as mutant D, `mutants.py`: A6 and A7 fail) (14 of the 29 pulsed placements in the templates are drawn under a condition in their parent, s127
`condpulse.py`). Both arms were read on it in one probe, after the change below; the base reads "picked nothing".

The fixture's first draft had two shapes the export does not carry for reasons of their own, found by this probe and
filed, not built: Change's pulse sent from a Set Variable's Done (P18-S127-SETDONE: a Set Variable's Done chain is not
translated at all), and the field's text written to a page Variable (P18-S127-CLEAROUT: a Clear empties the exported
field and does not send the empty text on, where the runtime's does). The fixture now sends both pulses off the click
and shows the field's text on a Text beside it.

## The export at the base (`a59d3e4d5`, measured)

Every reading after load is the load reading: nothing a signal sends into a component runs (8 of 9 readings differ).

## The export after the change

Exactly the runtime's readings, under StrictMode (its double mount runs nothing): measured equal, 9 of 9, before the
variants below were written. The variants, predicted before they ran:

- **a Condition between**: the Hide click goes through a Condition (Evaluate, the condition the literal true), its On
  True into `hide`: the same readings.
- **the control**: every wire into a component's signal input removed (the page's six, the Asker's into the Relay
  among them, and the Relay's pass-through into the Lamp): every reading is the load reading, in both arms.
