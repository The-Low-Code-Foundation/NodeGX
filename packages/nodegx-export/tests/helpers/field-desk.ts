import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Field Desk" (P18 session 129, EXP-011 §97, P18-S128-FIELDSET and P18-S127-CLEAROUT): a page whose chains send a text
 * field's Set, Clear, Focus and Blur, built in a temporary folder so the corpus golden (hls001) does not move.
 * `the-field-does-what-it-is-told.test.ts` grades it against the runtime's own nodes (`runtime-mounted-arm.js`, its
 * `fields` reading: each field's text by placeholder, then the focused one).
 *
 * The page's Texts read the Variables `typed` (what the name field's text writes, through its Value), `changed` (what its
 * Value Changed writes), `noted` and `blurred`, and one reads the Form's lifted text. The shapes are the templates':
 *
 * - **name** (rocket-school's Lists Editor and Moon Adopt): its Value is wired from the Variable `draft` (nothing at load);
 *   its text goes to `typed`; its Value Changed sets `changed` to "changed yes". **Fill** sets `draft` to "Bob", and that
 *   Set's Done sends the field's Set (`leSetName.done → leName.set`); **Fill Eve** sets `draft` to "Eve" and sends nothing. **Reset** sends Set from the click (the Value put
 *   back after typing). **Wipe** sends Clear (P18-S127-CLEAROUT: the empty text goes on to `typed`). **Focus** and
 *   **Blur** send Focus and Blur.
 * - **note** (todo-list's Note dialog): typed-in Value "draft note", its text to `noted`; its own Did Mount sends Clear
 *   and Focus, so at load it is empty and holds the cursor.
 * - **title** (todo-list's rows): its Enter sends its own Blur; its Blurred sets `blurred`. **Focus title** focuses it.
 * - **form**, inside the placed Form (rocket-school's New player form, nightbook's Field): its Value is the Form's input
 *   `name0` (the page passes "Cleo"), its text the Form's output `name`; the Form's signal inputs `fill` and `focus` send
 *   the field's Set and Focus. **Form fill** and **Form focus** pulse them.
 */

const button = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent, parameters: { label } });
const text = (id: string, label: string, parent = 'shell'): RawNode => ({ id, type: 'Text', label, parent, parameters: {} });
const field = (id: string, placeholder: string, parameters: Record<string, unknown> = {}, parent = 'shell'): RawNode => ({
  id,
  type: 'net.noodl.controls.textinput',
  label: placeholder,
  parent,
  parameters: { placeholder, ...parameters }
});
const variable = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Variable2', label: name, parameters: value === undefined ? { name } : { name, value } });
const setVar = (id: string, name: string, value?: string): RawNode => ({ id, type: 'Set Variable', label: id, parameters: value === undefined ? { name } : { name, value } });

const homeGraph = (): Graph => {
  const shell = [
    'fillBtn', 'fillEveBtn', 'resetBtn', 'wipeBtn', 'focusBtn', 'blurBtn', 'titleFocusBtn', 'formFillBtn', 'formFocusBtn',
    'typedText', 'changedText', 'notedText', 'blurredText', 'formNameText',
    'nameField', 'noteField', 'titleField', 'form'
  ];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Field Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    button('fillBtn', 'Fill'),
    button('fillEveBtn', 'Fill Eve'),
    button('resetBtn', 'Reset'),
    button('wipeBtn', 'Wipe'),
    button('focusBtn', 'Focus'),
    button('blurBtn', 'Blur'),
    button('titleFocusBtn', 'Focus title'),
    button('formFillBtn', 'Form fill'),
    button('formFocusBtn', 'Form focus'),
    text('typedText', 'Typed'),
    text('changedText', 'Changed'),
    text('notedText', 'Noted'),
    text('blurredText', 'Blurred'),
    text('formNameText', 'Form name'),
    // Ticked, as the templates' fields with a Set state it: a file at format 4 whose Set is wired and whose box is unstated
    // is read unticked by the editor's own load migration (and by the export's settle), and ticked by a reader of the file.
    field('nameField', 'name', { 'runOnChange-startValue': true }),
    field('noteField', 'note', { startValue: 'draft note' }),
    field('titleField', 'title', { startValue: 'a title' }),
    { id: 'form', type: '/Components/Form', label: 'Form', parent: 'shell', parameters: { name0: 'Cleo' } },
    // Unseeded: what the fields announce as they mount writes these, and a Variable seeded on the same page is read by the
    // exported announcement before its seed lands (P18-S129-SEEDANNOUNCE) and seeded again over it under StrictMode
    // (P18-S121-SEEDTWICE). `blurred` is written by a click only.
    variable('draftVar', 'draft'),
    variable('typedVar', 'typed'),
    variable('changedVar', 'changed'),
    variable('notedVar', 'noted'),
    variable('blurredVar', 'blurred', 'blurred never'),
    setVar('sdFill', 'draft', 'Bob'),
    setVar('sdFillEve', 'draft', 'Eve'),
    setVar('sdChanged', 'changed', 'changed yes'),
    setVar('sdBlurred', 'blurred', 'title blurred')
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'draftVar', fromProperty: 'value', toId: 'nameField', toProperty: 'startValue' },
      { fromId: 'nameField', fromProperty: 'onTextChanged', toId: 'typedVar', toProperty: 'value' },
      { fromId: 'nameField', fromProperty: 'textChanged', toId: 'sdChanged', toProperty: 'do' },
      { fromId: 'fillBtn', fromProperty: 'onClick', toId: 'sdFill', toProperty: 'do' },
      { fromId: 'sdFill', fromProperty: 'done', toId: 'nameField', toProperty: 'set' },
      { fromId: 'fillEveBtn', fromProperty: 'onClick', toId: 'sdFillEve', toProperty: 'do' },
      { fromId: 'resetBtn', fromProperty: 'onClick', toId: 'nameField', toProperty: 'set' },
      { fromId: 'wipeBtn', fromProperty: 'onClick', toId: 'nameField', toProperty: 'clear' },
      { fromId: 'focusBtn', fromProperty: 'onClick', toId: 'nameField', toProperty: 'focus' },
      { fromId: 'blurBtn', fromProperty: 'onClick', toId: 'nameField', toProperty: 'blur' },
      { fromId: 'noteField', fromProperty: 'onTextChanged', toId: 'notedVar', toProperty: 'value' },
      { fromId: 'noteField', fromProperty: 'didMount', toId: 'noteField', toProperty: 'clear' },
      { fromId: 'noteField', fromProperty: 'didMount', toId: 'noteField', toProperty: 'focus' },
      { fromId: 'titleFocusBtn', fromProperty: 'onClick', toId: 'titleField', toProperty: 'focus' },
      { fromId: 'titleField', fromProperty: 'onEnter', toId: 'titleField', toProperty: 'blur' },
      { fromId: 'titleField', fromProperty: 'onBlur', toId: 'sdBlurred', toProperty: 'do' },
      { fromId: 'formFillBtn', fromProperty: 'onClick', toId: 'form', toProperty: 'fill' },
      { fromId: 'formFocusBtn', fromProperty: 'onClick', toId: 'form', toProperty: 'focus' },
      { fromId: 'form', fromProperty: 'name', toId: 'formNameText', toProperty: 'text' },
      { fromId: 'typedVar', fromProperty: 'value', toId: 'typedText', toProperty: 'text' },
      { fromId: 'changedVar', fromProperty: 'value', toId: 'changedText', toProperty: 'text' },
      { fromId: 'notedVar', fromProperty: 'value', toId: 'notedText', toProperty: 'text' },
      { fromId: 'blurredVar', fromProperty: 'value', toId: 'blurredText', toProperty: 'text' }
    ]
  };
};

const formGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'fmRoot', type: 'Group', label: 'Form', children: ['fmField'], parameters: {} },
    field('fmField', 'form', { 'runOnChange-startValue': true }, 'fmRoot'),
    {
      id: 'fmIn',
      type: 'Component Inputs',
      label: 'Inputs',
      parameters: {},
      ports: [
        { name: 'name0', plug: 'output', type: 'string' },
        { name: 'fill', plug: 'output', type: 'signal' },
        { name: 'focus', plug: 'output', type: 'signal' }
      ]
    },
    { id: 'fmOut', type: 'Component Outputs', label: 'Outputs', parameters: {}, ports: [{ name: 'name', plug: 'input', type: 'string' }] }
  ]),
  connections: [
    { fromId: 'fmIn', fromProperty: 'name0', toId: 'fmField', toProperty: 'startValue' },
    { fromId: 'fmIn', fromProperty: 'fill', toId: 'fmField', toProperty: 'set' },
    { fromId: 'fmIn', fromProperty: 'focus', toId: 'fmField', toProperty: 'focus' },
    { fromId: 'fmField', fromProperty: 'onTextChanged', toId: 'fmOut', toProperty: 'name' }
  ]
});

/** The desk, before any variant's edit. */
export const fieldDesk = (): Desk => ({
  components: {
    'Pages/Home': homeGraph(),
    'Components/Form': formGraph()
  }
});

/** The desk written as a v2 project, into `dir` (or a new temporary folder), after `edit`. */
export const writeFieldDesk = (edit?: (d: Desk) => void, dir?: string): { dir: string; desk: Desk } => {
  const desk = fieldDesk();
  edit?.(desk);
  return { dir: writeDeskProject(desk, { name: 'Field Desk', idBase: 'b8d20e00-0000-4000-8000-0000000014', prefix: 'field-desk-' }, dir), desk };
};
