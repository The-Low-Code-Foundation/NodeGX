# Session 139 — predicted before either arm ran

The Store Desk (`packages/nodegx-export/tests/helpers/store-desk.ts`): rocket-school's write idiom, smallest.

- `/Logic/Store` — App store without its kit node: a Global Store `desk` with Persist on, Storage Key `store-desk`; a
  Subscribe of `app` into the output `app`; a Set of `app` (merge off) from the input `app`, on the input `write`.
- `/Logic/Add` (`app`, `word`, `run` → `app`, `done`): appends the word to `app.items`.
- `/Logic/Drop` (`app`, `run` → `app`, `done`): drops the first item.
- `/Logic/Show` (`app` → `line`): no Run; `none` with no app, `empty` with no items, else the items joined by commas.
- `/Logic/Word` (`n` → `word`): no Run; `'w' + n`.
- `/Form/Editor` (drawn): a Function counts its **Next** presses into Word's `n`; Word's `word` goes straight to the
  Editor's own output `word` (the pass-through, the Editor's `items` in rocket-school); **Save** sends `save`.
- The page: Store's `app` into Add, Drop and Show; Editor's `word` and `save` into Add's `word` and `run`; **Drop** runs
  Drop; Add's and Drop's `app` both into Store's `app` (two feeds: last-writer-wins) and their `done` into Store's `write`;
  Show's `line` on the page's one Text.
- Variant **Bad** adds `/Form/Bad` (drawn): **Bad write** runs two Functions whose `app` both feed its output `app` (two
  wires into one output port, as the Header's three) and the second's `done` sends `write`; its `app` and `write` go into
  Store's.

A reading is the page's Texts, then `storage=<the stored JSON, or null>` for `noodl_store_store-desk`.

## Scenario 1 — nothing stored. Steps: Save, Next, Save, Drop, Save

| step | line | storage | why |
|---|---|---|---|
| load | `none` | `null` | no initial state, nothing stored: no commit, nothing saved (both arms) |
| Save | `w0` | `{"app":{"items":["w0"]}}` | Word said `w0` at load; Add's app, then its done; the Set writes it; saved next turn |
| Next | `w0` | same | the word moves to `w1`; nothing writes |
| Save | `w0,w1` | `{"app":{"items":["w0","w1"]}}` | |
| Drop | `w1` | `{"app":{"items":["w1"]}}` | Drop's app is the input's last arrival, not Add's |
| Save | `w1,w1` | `{"app":{"items":["w1","w1"]}}` | Add's app arrives last again |

## Scenario 2 — stored `{"app":{"items":["kept"]}}`. Steps: Save

| step | line | storage |
|---|---|---|
| load | `kept` | `{"app":{"items":["kept"]}}` (the runtime re-saves the loaded copy: its keys changed in the configure commit) |
| Save | `kept,w0` | `{"app":{"items":["kept","w0"]}}` |

## Variant Bad, nothing stored. Steps: Save, Bad write, Save

| step | runtime | export | why |
|---|---|---|---|
| load | `none`, `null` | same | |
| Save | `w0`, `…["w0"]…` | same | |
| Bad write | `bad`, `…["bad"]…` | `w0`, `…["w0"]…` | the export does not lift Bad's `app` (two wires feed it); its `write` is refused by name, not run on the input's last value |
| Save | `bad,w0` | `w0,w0` | the arms have parted at Bad write, and say why |

## Variant Bad, stored `{"app":{"items":["kept"]}}`. Steps: Bad write (added after the first runs, predicted before running it)

The mount over a stored copy, as a page is opened: the store input's row has been written by nobody yet.

| step | runtime | export |
|---|---|---|
| load | `kept`, `…["kept"]…` | same |
| Bad write | `badA`, `…["badA"]…` (the first Bad scenario read badA) | `kept`, `…["kept"]…` — refused; without the refusal it would write the row's `undefined` and the stored copy would be `{}` |

Before this session (HEAD's export) the store was refused whole: Store's `app` was never lifted and the Set never ran, so
every line read `none` and nothing was stored.
