// The editor's words: what each kind of block is called, how it looks, and which of its settings a
// child can change. Setting names are the node specs' own port names (@nodegx/node-spec), checked
// by test/words.test.mjs, so a word here never points at a port that does not exist.

/** The four blocks a child can add. Few on purpose. */
export const PALETTE = [
  { type: 'Text', word: 'Words', emoji: '🔤', starts: { text: 'Hello!' } },
  { type: 'net.noodl.controls.button', word: 'Button', emoji: '🔘', starts: { label: 'Press me' } },
  { type: 'Group', word: 'Box', emoji: '📦', starts: { backgroundColor: 'var(--accent)', flexDirection: 'column' } },
  { type: 'Image', word: 'Picture', emoji: '🖼️', starts: {} }
];
export const PALETTE_TYPES = PALETTE.map((p) => p.type);

// Sizes and colours are the design system's own tokens, as the app writes them, so a child's
// change follows the app's theme (light and dark) and passes the server's style check. `show` is
// only for drawing the button when the running app cannot be asked for the real value.
export const SIZES = [
  { value: 'var(--text-xs)', word: 'Tiny', show: 12 },
  { value: 'var(--text-sm)', word: 'Small', show: 14 },
  { value: 'var(--text-lg)', word: 'Middle', show: 18 },
  { value: 'var(--text-2xl)', word: 'Big', show: 24 },
  { value: 'var(--text-5xl)', word: 'Huge', show: 48 }
];

/** Bright colours from the design system's palette, beside the app's own colours. */
export const BRIGHT_COLOURS = [
  { token: '--red-500', word: 'Red', show: '#ef4444' },
  { token: '--amber-400', word: 'Yellow', show: '#fbbf24' },
  { token: '--green-500', word: 'Green', show: '#22c55e' },
  { token: '--blue-500', word: 'Blue', show: '#3b82f6' },
  { token: '--purple-500', word: 'Purple', show: '#a855f7' },
  { token: '--gray-900', word: 'Black', show: '#111827' },
  { token: '--gray-50', word: 'White', show: '#f9fafb' }
];

/** The app's own colours worth offering, by design token, with a plain word for each. */
export const APP_COLOURS = [
  { token: '--primary', word: "The app's main colour" },
  { token: '--destructive', word: "The app's warning colour" },
  { token: '--foreground', word: "The app's writing colour" },
  { token: '--muted-foreground', word: "The app's quiet writing colour" },
  { token: '--accent', word: "The app's light highlight" },
  { token: '--secondary', word: "The app's soft grey" },
  { token: '--surface', word: "The app's card colour" },
  { token: '--background', word: "The app's background" }
];

const words = (param, ask) => ({ param, kind: 'words', ask });
const size = (param, ask) => ({ param, kind: 'size', ask });
const colour = (param, ask) => ({ param, kind: 'colour', ask });

/** Kinds of block. `settings` are what the "Change it" panel offers. */
export const KINDS = {
  Text: { word: 'Words', emoji: '🔤', hue: 'words', shows: 'text', settings: [words('text', 'What does it say?'), size('fontSize', 'How big?'), colour('color', 'What colour?')] },
  'net.noodl.controls.button': {
    word: 'Button',
    emoji: '🔘',
    hue: 'button',
    shows: 'label',
    settings: [words('label', 'What does the button say?'), colour('backgroundColor', 'Button colour'), colour('color', 'Colour of its words'), size('fontSize', 'How big are its words?')]
  },
  Group: {
    word: 'Box',
    emoji: '📦',
    hue: 'box',
    settings: [
      colour('backgroundColor', 'Colour behind'),
      {
        param: 'flexDirection',
        kind: 'choice',
        ask: 'How are the things inside it arranged?',
        choices: [
          { value: 'column', word: '⬇️ One under another' },
          { value: 'row', word: '➡️ Side by side' }
        ]
      }
    ]
  },
  Image: { word: 'Picture', emoji: '🖼️', hue: 'picture', settings: [words('src', 'Where is the picture? (a web address)')] },
  'net.noodl.controls.textinput': { word: 'Typing box', emoji: '⌨️', hue: 'button', shows: 'placeholder', settings: [words('placeholder', 'What does it say before you type?'), colour('backgroundColor', 'Colour behind')] },
  Page: { word: 'Page', emoji: '📄', hue: 'box', settings: [] },
  Router: { word: 'Screen changer', emoji: '🧭', hue: 'helper', settings: [] },
  'For Each': { word: 'Repeat for each', emoji: '🔁', hue: 'box', settings: [] },
  JavaScriptFunction: { word: 'Thinking machine', emoji: '🧠', hue: 'helper', settings: [] },
  'Set Variable': { word: 'Remember', emoji: '📝', hue: 'helper', settings: [] },
  Variable2: { word: 'Remembered thing', emoji: '💭', hue: 'helper', settings: [] },
  Condition: { word: 'Check', emoji: '❓', hue: 'helper', settings: [] },
  States: { word: 'Switch', emoji: '🚦', hue: 'helper', settings: [] },
  'Component Inputs': { word: 'What comes in', emoji: '📥', hue: 'helper', settings: [] },
  'Component Outputs': { word: 'What goes out', emoji: '📤', hue: 'helper', settings: [] },
  'CSS Definition': { word: 'Style sheet', emoji: '🎨', hue: 'helper', settings: [] },
  DbCollection2: { word: 'Saved list', emoji: '🗄️', hue: 'helper', settings: [] },
  SetDbModelProperties: { word: 'Save', emoji: '💾', hue: 'helper', settings: [] },
  NewDbModelProperties: { word: 'Save something new', emoji: '✨', hue: 'helper', settings: [] },
  RouterNavigate: { word: 'Go to a screen', emoji: '➡️', hue: 'helper', settings: [] },
  'Value Changed': { word: 'Notice a change', emoji: '👀', hue: 'helper', settings: [] },
  'Screen Resolution': { word: 'Screen size', emoji: '📐', hue: 'helper', settings: [] }
};

export function kindOf(type) {
  if (KINDS[type]) return KINDS[type];
  if (type.startsWith('/')) return { word: 'Piece', emoji: '🧩', hue: 'piece', settings: [], piece: type.slice(1) };
  if (type.startsWith('net.noodl.user.')) return { word: 'Sign-in helper', emoji: '🔑', hue: 'helper', settings: [] };
  return { word: 'Helper', emoji: '⚙️', hue: 'helper', settings: [] };
}

/** Plain words for the ports a child meets in "When … → do …". */
const PORT_WORDS = {
  onClick: 'is pressed',
  run: 'go',
  do: 'go',
  onEnter: 'gets Enter',
  textChanged: 'is typed in',
  didMount: 'appears',
  success: 'has finished',
  done: 'is done'
};

export function portWord(port) {
  if (!port) return '';
  return PORT_WORDS[port.name] || port.displayName || port.name;
}

/** A part's name as a child reads it: the last bit of its path. */
export function partWord(key) {
  return key.split('/').pop();
}

/** Groups of parts, in the order the list shows them. */
export function shelfOf(key) {
  if (key.startsWith('Pages/')) return 'screens';
  if (key.startsWith('Commands/') || key.startsWith('Logic/') || key.includes('#__cloud__')) return 'machines';
  return 'pieces';
}
