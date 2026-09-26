/**
 * The kit on a bare page, with a stand-in for the graph: Items out → Items in, the way a record
 * round-trip feeds them back. Everything the kit says is kept on `window.__nb` for the drive.
 * Built by `build-harness.mjs`; not part of the kit.
 */
import './globals.js';
import '../project/noodl_modules/nightbook-kit/index.js';
import * as React from 'react';
import { createRoot } from 'react-dom/client';

const Page = globalThis.__nbKit.reactNodes[0];
const Comp = Page.getReactComponent();
const h = React.createElement;

const nb = (window.__nb = { changes: 0, items: [], words: 0, picked: '', pickedKind: '', keys: [], photoBytes: 0, photoProblem: '', log: [] });

function App() {
  const [items, setItems] = React.useState([]);
  const [editable, setEditable] = React.useState(true);
  const [counts, setCounts] = React.useState({ addText: 0, addSticker: 0, addBubble: 0, addPhoto: 0, removePicked: 0, bringToFront: 0 });
  const [choice, setChoice] = React.useState({ font: '', color: '', effect: 'none', sticker: '★' });
  const latest = React.useRef(items);
  nb.setEditable = setEditable;
  nb.setChoice = (c) => setChoice((o) => ({ ...o, ...c }));
  nb.feed = (arr) => setItems(arr);
  const pulse = (k) => setCounts((c) => ({ ...c, [k]: c[k] + 1 }));
  const btn = (k, label) => h('button', { id: 'b-' + k, onClick: () => pulse(k), style: { minHeight: 44, margin: 4 } }, label);
  return h(
    'div',
    { style: { padding: 16, fontFamily: 'system-ui' } },
    h('div', { id: 'toolbar' }, btn('addText', 'Text'), btn('addSticker', 'Sticker'), btn('addBubble', 'Bubble'), btn('addPhoto', 'Photo'), btn('removePicked', 'Remove'), btn('bringToFront', 'Front')),
    h(
      'div',
      { id: 'host', style: { width: 800 } },
      h(Comp, {
        items,
        editable,
        background: 'radial-gradient(#FFC2DA 3px,#FFE9F2 3.5px)',
        backgroundSize: '14px 14px',
        ...choice,
        ...counts,
        onItems: (a) => {
          nb.items = a;
          latest.current = a;
          // The graph writes the record and the page reads it back: a NEW array reference.
          setTimeout(() => setItems(JSON.parse(JSON.stringify(a))), 0);
        },
        onChangedId: (id) => nb.log.push('changedId:' + id),
        onChanged: () => {
          nb.changes++;
          nb.log.push('changed');
        },
        onWords: (n) => (nb.words = n),
        onPickedId: (id) => (nb.picked = id),
        onPickedKind: (k) => (nb.pickedKind = k),
        onPicked: () => nb.log.push('picked:' + nb.picked),
        onKey: (k) => nb.keys.push(k),
        onKeyPressed: () => {},
        onPhotoBytes: (n) => (nb.photoBytes = n),
        onPhotoProblem: (p) => (nb.photoProblem = p)
      })
    )
  );
}

createRoot(document.getElementById('root')).render(h(App));
