# s141 — predicted before either arm ran

The Header Desk (`packages/nodegx-export/tests/helpers/header-desk.ts`): Store and Show as the Store Desk's; **Header**
places Mark (tag `a`), Mark (tag `b`) and Drop, each run by its own button, all three `app`s into its one output `app`,
all three `done`s into `write` (rocket-school's Header); **Solo** places one Mark (tag `s`), its `app` passed through to
the output, its `done` the output `write`. The page hands both the store's `app` and wires each one's `app` and `write`
into the store's. A reading is the line (Show's), then `storage=` the stored JSON.

Read from HEAD's emitted desk (`work/desk-head`) before predicting the export:

- Header: its Component Outputs is refused ("two wires feed value output "app""), and the page drops `header:app` and
  `header:write` (STALEPULSE). Its presses change nothing.
- Solo: lifted as s139's pass-through. Mark's `app` lands in Solo's row (`app2`), Solo's push effect hands it on one
  commit later, the page's row one commit after that. Mark's `done` calls `onWrite` in the run effect; the page counts
  the pulse and hands it to the store one commit later (P18-S127-SIBLINGVALUE). Traced commit by commit: the store's
  write effect runs in the commit where Solo's push fires, with the page's row from the render before it, so it is
  **one commit short** and writes what the row held: `undefined` on the first press, the previous press's value after.

## The runtime (and the export, after the fix)

Scenario 1, nothing stored: Mark A, Mark B, Header drop, Mark A, Solo, Mark B.

| step | line | stored |
|---|---|---|
| load | none | null |
| Mark A | a | `{"app":{"items":["a"]}}` |
| Mark B | a,b | `{"app":{"items":["a","b"]}}` |
| Header drop | b | `{"app":{"items":["b"]}}` |
| Mark A | b,a | `{"app":{"items":["b","a"]}}` |
| Solo | b,a,s | `{"app":{"items":["b","a","s"]}}` |
| Mark B | b,a,s,b | `{"app":{"items":["b","a","s","b"]}}` |

Scenario 2, `{"app":{"items":["kept"]}}` stored: Header drop, Solo.

| step | line | stored |
|---|---|---|
| load | kept | as stored |
| Header drop | empty | `{"app":{"items":[]}}` |
| Solo | s | `{"app":{"items":["s"]}}` |

Scenario 3, nothing stored: Solo, Solo → none / null; s; s,s.

Least certain: that the runtime hands the Header's `app` across its component boundary before its `write` (s139 measured
it for a placed logic component's own outputs into the store, not through a second Component Outputs).

## HEAD's export

| scenario | readings |
|---|---|
| 1 | none / null; then none / null for Mark A, Mark B, Header drop, Mark A; **Solo: none / `{}`** (the write ran on `undefined`); Mark B: none / `{}` |
| 2 | kept; Header drop: kept, as stored; **Solo: none / `{}`** — the stored copy written over with `undefined` |
| 3 | none / null; **Solo: none / `{}`**; Solo: s / `{"app":{"items":["s"]}}` (the first press's value, one press late) |

If scenario 2 reads as predicted, a single pass-through whose pulse comes from the same run is a live defect on HEAD,
separate from the Header's refusal: it writes over a persisted store with the value before.

## The drive (rocket-school, written before building)

`/lists`, Ada (`p1`, active) and Bob (`p2`) stored. H1 press the player's name (the menu opens); H2 Edit player (the form,
its name box holding `Ada`); H3 type `Ada Lovelace` over it; H4 Save; H5 Edit player again; H6 Delete this player (the
ask, "Delete Ada Lovelace? …"); H7 Yes, delete; H8 reload.

| step | runtime and export-fixed | export-head |
|---|---|---|
| H4 | the bar says Ada Lovelace; stored `p1.name` = `Ada Lovelace`, every other field as seeded; the menu is open again | the menu is open again (Update settings ran, its Done closes the form) but nothing is written: the bar and the store still say Ada |
| H7 | on `/profiles`; stored profiles = [Bob], `activeId` = `p2` | on `/profiles` (the Header's `deleted` is its own wire); the store still holds Ada and Bob, `activeId` `p1` |
| H8 | as H7 (the stored copy) | as H7 |

Least certain: what `/profiles` draws after a delete (not graded, read only), and whether the form's name box is a field
the drive can find by its value.

## Found by the drive: P18-S141-MOUNTEDIN, the desk (written before either arm ran)

The drive's first run: in both export arms Edit player closed the menu and drew no form. The New player form gates its
root on its own `mounted` input (`m === true`), and the export spent the Header's `mounted` wire on the render wrapper
alone, never handing it in. The desk: s126's Root Desk with two more placements on the page. **Ask** (Component Inputs
`mounted` → Expression `m === true` → its root's Mounted; a Text "the ask") placed with Mounted wired from the Variable
`open`; **Unless** (the same with `m !== false`, the Choice row's and the Editor's form; a Text "the unless") placed with
nothing wired. Readings are every drawn Text; only the two new ones are predicted here (s126's rows grade the rest).

| step | runtime | HEAD's export | fixed export |
|---|---|---|---|
| load (`open` unset) | the unless; no ask (nothing delivered over the wire, so `m` is unset and `m === true` false) | the unless; no ask | the unless; no ask |
| Open | the ask, the unless | the unless only: the ask's root reads `undefined` | the ask, the unless |
| Close | the unless | the unless | the unless |

Least certain: the runtime at load (whether an instance with a wired Mounted hands its default `true` to the port before
the wire delivers anything).
