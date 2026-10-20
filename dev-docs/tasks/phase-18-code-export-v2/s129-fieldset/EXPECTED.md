# The Field Desk: what each arm should read (P18 session 129, written before the variants ran)

The desk is `packages/nodegx-export/tests/helpers/field-desk.ts`. A reading is the page's Texts in document order
(`typed`, `changed`, `noted`, `blurred`, the Form's lifted text), then each field's text by placeholder (`[name]`, `[note]`,
`[title]`, `[form]`), then `focus=` the field that holds focus. Both arms read it the same way (`fields: true`).

## What the runtime does, read from source first

`noodl-viewer-react/src/nodes/controls/text-input.ts` and `components/controls/TextInput/TextInput.tsx`:

- **Set** (`set.valueChangedToTrue`, after inputs update): `setText(this._internal.text)`. `_internal.text` is the Value as
  last delivered (the `startValue` setter: `undefined` is never delivered, `null` is `''`), or `''` after a Clear (the
  Clear writes it, NDA-012 A1). It is not what a person typed (`_typed` writes only the start value). Mounted and not
  focused: the component's `setText` writes its state and calls `onTextChanged` with the text, so the Value's sinks get
  it and Value Changed fires (`addPrimitiveOutputPropHandler` calls the output's `onChange` on every call, whether or not
  the text changed). **Focused: nothing** (`hasFocus()`, "must not fight the typist"). Off the page: the start value is
  written, the Value flagged if it differs, no Value Changed.
- **Clear**: `_internal.text = ''`, then mounted `setText('')` unconditionally (focused or not), so the empty text goes on
  and Value Changed fires (P18-S127-CLEAROUT).
- **Focus / Blur**: through the viewer's focus tracker, `_focus()` / `_blur()` on the `<input>` (`innerReactComponentRef`).
  A Focus while the field is not on the page does nothing and is not held (GAM-012 R13).
- **Enter**: `onKeyDown` with `Enter` sends On Enter.

## The desk, measured on the runtime arm before the export was changed (steps `probe.ts`'s default)

Measured (`probe.ts`, base `1d4adc615`):

| step | runtime |
|---|---|
| load | `'' · changed yes · '' · blurred never · Cleo · [name]= · [note]= · [title]=a title · [form]=Cleo · focus=[note]` |
| Fill | typed Bob, `[name]=Bob`, focus stays on note |
| type:name:Zed | typed Zed, `[name]=Zed`, focus none |
| Reset | typed Bob, `[name]=Bob` (the Value put back over the typing) |
| Wipe | typed `''`, `[name]=` |
| Focus | `focus=[name]` |
| Reset (focused) | unchanged: `[name]=`, typed `''` |
| Blur | `focus=none` |
| Focus title | `focus=[title]` |
| enter:title | blurred "title blurred", `focus=none` |
| Form fill | `[form]=Cleo` |
| type:form:Dee | the Form's text Dee |
| Form fill | Cleo again |
| Form focus | `focus=[form]` |

The export at the base: the name field never takes the Value back (Reset does nothing), Wipe empties the field and not
`typed` (CLEAROUT), the note's Did Mount Clear leaves `noted` at "draft note" and focuses nothing, Focus and Blur do
nothing, Form fill does nothing.

🔴 **Three things the first drafts read that are not this bug's**, each moved off the desk and filed:

1. A field at format 4 whose Set is wired and whose Run On Value Change box is unstated is unticked to the export (it
   settles the file with the editor's own load migration) and ticked to the runtime arm (it reads the file). The desk
   states the box, as the templates do.
2. A Variable seeded on the page that also holds a field reading it: the exported announcement reads the Variable before
   the seed's effect lands ("" for "Ann"), and the runtime announces the seed (P18-S129-SEEDANNOUNCE, filed). The desk
   seeds nothing a field announces.
3. **A ticked Value arriving sends the text on in the runtime and not in the export** (P18-S129-VALUEARRIVAL, filed): the
   control (no wire into any Set) read typed "Bob" after Fill in the runtime, `''` in the export. The startValue setter
   calls `setText`, which sends `onTextChanged` and Value Changed; the export's sync effect writes the field only
   ("Changed never fires"), and writes it over a focused field too. The Fill row of the ticked desk agrees after the fix
   only because the Set sends the same text right after. The variants below grade the Set alone on an unticked field.

## Predicted, before running: the variants on the runtime arm

The base desk with `Blur` followed by `Reset`, `Fill`: both leave `[name]=` and typed `''`: the Clear wrote
`_internal.text = ''` and nothing has been delivered since (Fill writes "Bob" over "Bob", no change, no delivery).

🔴 **Measured: the Reset leaves `[name]=`, as predicted, and the Fill reads Bob, not `''`.** A Set Variable that writes the
value a Variable already holds still delivers it: it notifies every Variable of the name (`forceChange`), the Variable
sends its output again, and the field's setter takes "Bob" over the cleared `''`. So "delivered since the Clear" means
"written since", the same value too. The export's mark is cleared by the store's own `subscribe` (it calls every
listener on every `set`, `nodegx-core/src/value.ts`), which is that rule; an effect keyed on the value would be the
predicted one, and wrong.

**Unticked** (the name field's box unticked, marketplace's search box): the Value is delivered to `_internal.text` and
only a Set puts it in the field.

| step | runtime, predicted |
|---|---|
| load | typed `''`, `[name]=`, focus=[note] |
| Fill | typed Bob, `[name]=Bob` (the Set alone) |
| type:name:Zed | Zed |
| Reset | Bob |
| Wipe | `''` |
| Reset | `''` (cleared, nothing delivered since) |
| Fill Eve | `''` still (delivered, not applied: unticked, no Set) |
| Reset | Eve (delivered after the Clear) |
| Focus | focus=[name] |
| Fill | Eve still: Bob is delivered, the Set is absorbed (focused) |
| Reset | Eve still (focused) |
| Blur | focus none |
| Reset | Bob |

**The control** (unticked, and no wire into any Set on the page or in the Form): Fill leaves `[name]=` and typed `''`;
Reset does nothing; after `type:form:Dee`, Form fill keeps Dee.

**The export, after the fix: every reading equal to the runtime's**, in every variant.
