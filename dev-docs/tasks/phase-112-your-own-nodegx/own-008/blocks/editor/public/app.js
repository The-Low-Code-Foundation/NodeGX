// The big-block editor's page. Everything a child does goes through the document in /src/model.js;
// this file only draws it and turns taps and drags into its methods.

import { BlockDocument } from '/src/model.js';
import { PALETTE, SIZES, BRIGHT_COLOURS, APP_COLOURS, kindOf, portWord, partWord, shelfOf } from '/words.js';

const doc = new BlockDocument();
const state = {
  key: null, // the part being edited
  picked: null, // the block picked in it
  ports: { types: {}, parts: {} },
  tokens: {},
  open: new Map(), // `${key}:${id}` → whether a box is unfolded, when a child chose
  preview: null,
  previewTimer: null,
  linking: null, // { step: 'target' } | { step: 'port', target }
  moving: false,
  dir: ''
};
window.bigBlocks = { doc, state }; // for the tests and for anyone curious

const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== undefined && c !== null && c !== false) node.append(c instanceof Node ? c : String(c));
  return node;
}

// ── talking to the server ──

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `The editor's server answered ${res.status}.`);
  return data;
}

let sayTimer;
function say(words, mood = '') {
  const m = $('message');
  m.className = 'message ' + mood;
  m.replaceChildren(...[].concat(words));
  clearTimeout(sayTimer);
  if (mood !== 'bad') sayTimer = setTimeout(() => m.replaceChildren(), 6000);
}

async function load() {
  say('Opening the app…');
  const project = await api('/api/project');
  doc.open(project);
  state.ports = project.ports;
  state.dir = project.dir;
  state.tokens = readTokens(project.files['nodegx.project.json']);
  $('app-name').textContent = project.name;
  document.title = `Big Blocks — ${project.name}`;
  const keys = doc.keys();
  state.key = keys.find((k) => k.startsWith('Pages/')) || keys[0];
  state.picked = null;
  renderAll();
  say(`Opened ${project.name}. Pick a block to change it!`, 'good');
  startPreview();
}

function readTokens(text) {
  const out = {};
  try {
    for (const t of JSON.parse(text).metadata?.designTokens?.customTokens || []) out[t.name] = t.value;
  } catch {}
  return out;
}

// ── what the document says, in the page's terms ──

const nodeOf = (id) => doc.nodes(state.key).find((n) => n.id === id);

function portsOf(node) {
  const base = node.type.startsWith('/') ? state.ports.parts[node.type] : state.ports.types[node.type];
  const inputs = [...(base?.inputs || [])];
  const outputs = [...(base?.outputs || [])];
  for (const p of node.ports || []) {
    const list = p.plug === 'input' ? inputs : outputs;
    if (!list.some((x) => x.name === p.name)) list.push({ name: p.name, type: p.type, displayName: p.displayName });
  }
  return { inputs, outputs };
}

function nameOf(node) {
  if (node.label) return node.label;
  const kind = kindOf(node.type);
  return kind.piece ? partWord(kind.piece) : kind.word;
}

function says(node) {
  const kind = kindOf(node.type);
  const v = kind.shows && node.parameters?.[kind.shows];
  return typeof v === 'string' && v && !v.startsWith('var(') ? v : '';
}

const wiresIn = (id) => doc.wires(state.key).filter((w) => w.toId === id);
const isBox = (node) => node.type === 'Group' || node.type === 'Page' || (node.children && node.children.length > 0);

function isOpen(node, depth) {
  const chosen = state.open.get(`${state.key}:${node.id}`);
  return chosen !== undefined ? chosen : depth < 3;
}

// ── drawing ──

function renderAll() {
  renderTop();
  renderParts();
  renderBlocks();
  renderHelpers();
  renderChange();
  renderPalette();
}

function renderTop() {
  const unsaved = doc.unsavedKeys();
  $('undo').disabled = !doc.canUndo();
  $('save').disabled = unsaved.length === 0;
  $('save-words').textContent = unsaved.length === 0 ? 'Saved' : `Save (${unsaved.length} ${unsaved.length === 1 ? 'part' : 'parts'} changed)`;
}

function renderParts() {
  const unsaved = new Set(doc.unsavedKeys());
  const shelves = [
    ['screens', '📱 Screens', true],
    ['pieces', '🧩 Pieces', true],
    ['machines', '⚙️ Machines', false]
  ];
  $('parts').replaceChildren(
    ...shelves.map(([shelf, title, open]) => {
      const keys = doc.keys().filter((k) => shelfOf(k) === shelf).sort((a, b) => partWord(a).localeCompare(partWord(b)));
      if (!keys.length) return '';
      const details = el(
        'details',
        { class: 'shelf', open: open || keys.includes(state.key) },
        el('summary', {}, title),
        keys.map((k) =>
          el(
            'button',
            { class: 'part-button' + (k === state.key ? ' here' : ''), title: k, 'data-part': k, onclick: () => goTo(k) },
            partWord(k),
            unsaved.has(k) ? el('span', { class: 'dot', title: 'Changed, not saved yet' }, '●') : ''
          )
        )
      );
      return details;
    })
  );
}

function goTo(key) {
  state.key = key;
  state.picked = null;
  state.linking = null;
  state.moving = false;
  renderAll();
  $('blocks').scrollTop = 0;
}

function renderBlocks() {
  const key = state.key;
  $('part-name').textContent = partWord(key);
  const note = $('part-note');
  if (key.includes('#__cloud__')) {
    note.hidden = false;
    note.className = 'cloud';
    note.textContent = "☁️ This part runs on the app's server. Saving keeps your change in the files, but the server only hears it after a grown-up sends it there (ask your helper to deploy the cloud functions).";
  } else {
    note.hidden = true;
  }
  const { roots, byId } = doc.tree(key);
  const box = $('blocks');
  if (!roots.length) {
    box.replaceChildren(el('p', { class: 'note' }, 'This part has nothing on the screen. It is all helpers — open "Helpers" below to see them.'));
    $('helpers-box').open = true;
    return;
  }
  const draw = (id, depth) => {
    const node = byId.get(id);
    if (!node) return '';
    return blockView(node, depth, (n) => (n.children || []).map((c) => draw(c, depth + 1)));
  };
  box.replaceChildren(...roots.map((r) => draw(r, 0)));
}

function blockView(node, depth, drawChildren) {
  const kind = kindOf(node.type);
  const open = isOpen(node, depth);
  const hasKids = node.children && node.children.length > 0;
  const words = says(node);
  const face = el(
    'div',
    { class: 'face', draggable: node.parent !== undefined ? 'true' : null, 'data-face': node.id },
    el('span', { class: 'emoji', 'aria-hidden': 'true' }, kind.emoji),
    el('span', { class: 'name' }, nameOf(node)),
    words ? el('span', { class: 'says' }, `“${words}”`) : el('span', { class: 'says' }),
    node.label ? el('span', { class: 'badge' }, kind.word) : '',
    node.parameters?.flexDirection === 'row' ? el('span', { class: 'badge', title: 'Side by side' }, '➡️') : '',
    kind.piece ? el('button', { class: 'fold', title: 'Open this piece', onclick: (e) => (e.stopPropagation(), openPiece(kind.piece)) }, '▶') : '',
    hasKids
      ? el(
          'button',
          {
            class: 'fold',
            title: open ? 'Fold it up' : 'Open it out',
            'aria-expanded': String(open),
            onclick: (e) => {
              e.stopPropagation();
              state.open.set(`${state.key}:${node.id}`, !open);
              renderBlocks();
            }
          },
          open ? '▾' : '▸'
        )
      : ''
  );
  face.addEventListener('click', () => pick(node.id));
  wireDrag(face, node);
  const block = el('div', { class: `block ${kind.hue}` + (state.picked === node.id ? ' picked' : ''), 'data-block': node.id }, face);
  if (hasKids && open) block.append(el('div', { class: 'inside' }, drawChildren(node)));
  else if (isBox(node) && !hasKids) block.append(el('div', { class: 'inside' }, el('div', { class: 'empty-box' }, 'Empty — drag a block in here')));
  return block;
}

function openPiece(piece) {
  if (doc.keys().includes(piece)) goTo(piece);
  else say(`I can't find the piece "${partWord(piece)}" in this app.`, 'bad');
}

function renderHelpers() {
  const helpers = doc.helpers(state.key);
  $('helper-count').textContent = String(helpers.length);
  const area = $('helpers');
  const xs = helpers.map((h) => h.x ?? 0);
  const ys = helpers.map((h) => h.y ?? 0);
  const minX = Math.min(0, ...xs);
  const minY = Math.min(0, ...ys);
  const scale = 1;
  area.replaceChildren(
    ...helpers.map((h, i) => {
      const kind = kindOf(h.type);
      const x = h.x !== undefined ? (h.x - minX) * scale : 10 + (i % 3) * 250;
      const y = h.y !== undefined ? (h.y - minY) * scale : 10 + Math.floor(i / 3) * 80;
      const face = el(
        'div',
        { class: 'face', 'data-face': h.id, title: h.label || kind.word },
        el('span', { class: 'emoji', 'aria-hidden': 'true' }, kind.emoji),
        el('span', { class: 'name' }, nameOf(h))
      );
      const card = el('div', { class: `block ${kind.hue}` + (state.picked === h.id ? ' picked' : ''), 'data-block': h.id, style: `left:${x}px;top:${y}px` }, face);
      dragHelper(face, card, h, minX, minY);
      return card;
    })
  );
  const bottom = Math.max(200, ...helpers.map((h, i) => (h.y !== undefined ? h.y - minY : 10 + Math.floor(i / 3) * 80) + 90));
  const right = Math.max(0, ...helpers.map((h, i) => (h.x !== undefined ? h.x - minX : 10 + (i % 3) * 250) + 250));
  area.style.height = bottom + 'px';
  area.style.width = right + 'px';
}

/** A helper is dragged with the pointer (mouse, finger or pen); letting go writes where it is. */
function dragHelper(face, card, h, minX, minY) {
  face.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const left = parseFloat(card.style.left);
    const top = parseFloat(card.style.top);
    let moved = false;
    face.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      moved = true;
      card.style.left = Math.max(0, left + dx) + 'px';
      card.style.top = Math.max(0, top + dy) + 'px';
    };
    const up = () => {
      face.removeEventListener('pointermove', move);
      face.removeEventListener('pointerup', up);
      face.removeEventListener('pointercancel', up);
      if (!moved) return pick(h.id);
      const x = Math.round(parseFloat(card.style.left) + minX);
      const y = Math.round(parseFloat(card.style.top) + minY);
      edit(() => doc.placeHelper(state.key, h.id, x, y));
    };
    face.addEventListener('pointermove', move);
    face.addEventListener('pointerup', up);
    face.addEventListener('pointercancel', up);
  });
}

function renderPalette() {
  const hasScreen = doc.tree(state.key).roots.length > 0;
  $('palette').replaceChildren(
    ...PALETTE.map((p) => {
      const tile = el(
        'button',
        {
          class: `tile ${kindOf(p.type).hue}`,
          draggable: 'true',
          disabled: !hasScreen,
          title: hasScreen ? `Tap to add ${p.word.toLowerCase()} next to the block you picked, or drag it into a box` : 'This part has no screen to add blocks to',
          'data-add': p.type,
          onclick: () => addFromPalette(p)
        },
        el('span', { class: 'emoji', 'aria-hidden': 'true' }, p.emoji),
        p.word
      );
      tile.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/x-new-block', p.type);
        e.dataTransfer.effectAllowed = 'copy';
      });
      return tile;
    })
  );
}

/** Where a tapped tile goes: into the picked box, or just after the picked block, or into the first box. */
function addFromPalette(p) {
  const picked = state.picked && nodeOf(state.picked);
  let parent, index;
  if (picked && isBox(picked) && picked.parent !== undefined) {
    parent = picked.id;
  } else if (picked && picked.parent !== undefined) {
    parent = picked.parent;
    index = nodeOf(parent).children.indexOf(picked.id) + 1;
  } else {
    const { roots, byId } = doc.tree(state.key);
    const root = byId.get(roots[0]);
    parent = picked && isBox(picked) ? picked.id : root && isBox(root) ? root.id : undefined;
  }
  if (parent === undefined) return say('Pick a box first, then tap a block to put in it.', 'bad');
  const id = edit(() => doc.addBlock(state.key, { type: p.type, parent, index, parameters: p.starts }));
  if (id) {
    state.open.set(`${state.key}:${parent}`, true);
    pick(id);
    say(`Added ${p.word.toLowerCase()}! Change it on the right.`, 'good');
  }
}

// ── drag and drop in the tree ──

function wireDrag(face, node) {
  face.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/x-block', node.id);
    e.dataTransfer.effectAllowed = 'move';
    face.parentElement.classList.add('dragging');
  });
  face.addEventListener('dragend', () => face.parentElement.classList.remove('dragging'));
  face.addEventListener('dragover', (e) => {
    const types = [...e.dataTransfer.types];
    if (!types.includes('text/x-block') && !types.includes('text/x-new-block')) return;
    e.preventDefault();
    const into = isBox(node) && (node.parent === undefined || e.offsetY > face.offsetHeight / 3);
    face.parentElement.classList.toggle('drop-into', into);
    face.parentElement.classList.toggle('drop-before', !into && node.parent !== undefined);
  });
  face.addEventListener('dragleave', () => face.parentElement.classList.remove('drop-into', 'drop-before'));
  face.addEventListener('drop', (e) => {
    e.preventDefault();
    const block = face.parentElement;
    const into = block.classList.contains('drop-into');
    block.classList.remove('drop-into', 'drop-before');
    if (!into && node.parent === undefined) return;
    const parent = into ? node.id : node.parent;
    const newType = e.dataTransfer.getData('text/x-new-block');
    const moving = e.dataTransfer.getData('text/x-block');
    if (newType) {
      const p = PALETTE.find((x) => x.type === newType);
      const index = into ? undefined : nodeOf(parent).children.indexOf(node.id);
      const id = edit(() => doc.addBlock(state.key, { type: p.type, parent, index, parameters: p.starts }));
      if (id) {
        state.open.set(`${state.key}:${parent}`, true);
        pick(id);
      }
    } else if (moving && moving !== node.id) {
      const siblings = (nodeOf(parent).children || []).filter((c) => c !== moving);
      const index = into ? undefined : siblings.indexOf(node.id);
      if (edit(() => doc.putInside(state.key, moving, parent, index)) !== false) state.open.set(`${state.key}:${parent}`, true), renderBlocks();
    }
  });
}

// ── changing things ──

/** Runs one change; a refusal is said to the child and changes nothing. Returns what the change returned, or false. */
function edit(fn) {
  let result;
  try {
    result = fn();
  } catch (err) {
    say(err.message, 'bad');
    return false;
  }
  if (state.picked && !doc.hasNode(state.key, state.picked)) state.picked = null;
  renderAll();
  schedulePreview();
  return result === undefined ? true : result;
}

function pick(id) {
  state.picked = id;
  state.linking = null;
  state.moving = false;
  for (const b of document.querySelectorAll('.block.picked')) b.classList.remove('picked');
  for (const b of document.querySelectorAll(`[data-block="${CSS.escape(id)}"]`)) b.classList.add('picked');
  renderChange();
  showOnScreen();
}

function renderChange() {
  const panel = $('change');
  const node = state.picked && doc.hasNode(state.key, state.picked) ? nodeOf(state.picked) : null;
  if (!node) {
    panel.replaceChildren(
      el('h2', {}, '👆 Tap a block'),
      el('p', { class: 'hint' }, 'Tap any block to change it. Drag the tiles at the bottom into a box to add new blocks. Press Save when you like what you made.')
    );
    return;
  }
  const kind = kindOf(node.type);
  const wiredIn = new Set(wiresIn(node.id).map((w) => w.toProperty));
  const parts = [el('h2', {}, el('span', { 'aria-hidden': 'true' }, kind.emoji), nameOf(node))];
  parts.push(el('p', { class: 'hint' }, `This is a ${kind.piece ? 'piece called ' + partWord(kind.piece) : kind.word.toLowerCase()} block.`));

  parts.push(el('h3', {}, 'What do you call it?'));
  const nameBox = el('input', { type: 'text', value: node.label || '', placeholder: nameOf(node), 'aria-label': 'Its name', 'data-setting': 'label' });
  const commitName = () => {
    const v = nameBox.value.trim();
    if (v && v !== (node.label || '')) edit(() => doc.rename(state.key, node.id, v));
  };
  nameBox.addEventListener('change', commitName);
  nameBox.addEventListener('keydown', (e) => e.key === 'Enter' && nameBox.blur());
  parts.push(nameBox);

  for (const s of kind.settings) parts.push(...settingView(node, s, wiredIn.has(s.param)));

  if (kind.piece) parts.push(el('h3', {}, 'Inside it'), el('button', { class: 'action', onclick: () => openPiece(kind.piece) }, '🧩 Open this piece'));

  parts.push(...linksView(node));

  if (node.parent !== undefined) {
    const siblings = nodeOf(node.parent).children || [];
    const i = siblings.indexOf(node.id);
    parts.push(
      el('h3', {}, 'Move it'),
      el(
        'div',
        { class: 'row' },
        el('button', { class: 'action', disabled: i <= 0, onclick: () => edit(() => doc.putInside(state.key, node.id, node.parent, i - 1)) }, '⬆️ Up'),
        el('button', { class: 'action', disabled: i >= siblings.length - 1, onclick: () => edit(() => doc.putInside(state.key, node.id, node.parent, i + 1)) }, '⬇️ Down'),
        el('button', { class: 'action', onclick: () => ((state.moving = !state.moving), renderChange()) }, '📦 Into another box…')
      )
    );
    if (state.moving) parts.push(boxChooser(node));
  }

  const inside = countInside(node);
  parts.push(
    el('h3', {}, 'Take it away'),
    el(
      'button',
      {
        class: 'action danger',
        'data-remove': node.id,
        onclick: async () => {
          const sure = await ask(inside ? `Take away “${nameOf(node)}” and the ${inside} ${inside === 1 ? 'block' : 'blocks'} inside it?` : `Take away “${nameOf(node)}”?`, 'Yes, take it away', 'No, keep it');
          if (sure && edit(() => doc.removeBlock(state.key, node.id)) !== false) say('Taken away. Press Undo if you want it back.', 'good');
        }
      },
      '🗑️ Take it away'
    )
  );
  panel.replaceChildren(...parts);
}

function countInside(node) {
  let n = 0;
  const walk = (id) => {
    for (const c of nodeOf(id)?.children || []) {
      n++;
      walk(c);
    }
  };
  walk(node.id);
  return n;
}

function settingView(node, s, wired) {
  const current = node.parameters?.[s.param];
  const out = [el('h3', {}, s.ask)];
  if (wired) out.push(el('p', { class: 'wired' }, '🔌 A helper changes this while the app runs, so the app may show something else.'));
  const set = (value) => edit(() => doc.setSetting(state.key, node.id, s.param, value));
  if (s.kind === 'words') {
    const box = el('textarea', { 'aria-label': s.ask, 'data-setting': s.param, rows: 2 });
    box.value = current === undefined ? '' : typeof current === 'string' ? current : JSON.stringify(current);
    const commit = () => {
      if (box.value !== (typeof current === 'string' ? current : current === undefined ? '' : JSON.stringify(current))) set(box.value);
    };
    box.addEventListener('change', commit);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        box.blur();
      }
    });
    out.push(box);
  } else if (s.kind === 'size') {
    out.push(
      el(
        'div',
        { class: 'row' },
        SIZES.map((z) => {
          const px = parseFloat(appToken(z.value.slice(4, -1))) || z.show;
          return el('button', { class: 'size' + (current === z.value ? ' on' : ''), title: z.word, 'aria-label': z.word, 'data-size': z.word.toLowerCase(), style: `font-size:${Math.min(px, 40)}px`, onclick: () => set(z.value) }, 'A');
        })
      )
    );
  } else if (s.kind === 'colour') {
    const swatches = [
      ...APP_COLOURS.filter((c) => state.tokens[c.token]).map((c) => ({ value: `var(${c.token})`, show: appToken(c.token) || state.tokens[c.token], word: c.word })),
      ...BRIGHT_COLOURS.map((c) => ({ value: `var(${c.token})`, show: appToken(c.token) || c.show, word: c.word }))
    ];
    out.push(
      el(
        'div',
        { class: 'row' },
        swatches.map((c) =>
          el('button', { class: 'swatch' + (current === c.value ? ' on' : ''), title: c.word, 'aria-label': c.word, 'data-colour': c.value, style: `background:${c.show}`, onclick: () => set(c.value) })
        )
      )
    );
  } else if (s.kind === 'choice') {
    out.push(el('div', { class: 'row' }, s.choices.map((c) => el('button', { class: 'choice' + (current === c.value ? ' on' : ''), 'data-choice': c.value, onclick: () => set(c.value) }, c.word))));
  }
  return out;
}

/** A design token's value as the running app resolves it (light or dark), or '' before the app is up. */
function appToken(name) {
  try {
    const root = state.preview?.frame?.contentDocument?.documentElement;
    return root ? getComputedStyle(root).getPropertyValue(name).trim() : '';
  } catch {
    return '';
  }
}

function boxChooser(node) {
  const inside = new Set();
  const walk = (id) => {
    inside.add(id);
    for (const c of nodeOf(id)?.children || []) walk(c);
  };
  walk(node.id);
  const boxes = doc.nodes(state.key).filter((n) => isBox(n) && !inside.has(n.id) && n.id !== node.parent);
  if (!boxes.length) return el('p', { class: 'hint' }, 'There is no other box to put it in.');
  return el(
    'div',
    { class: 'row' },
    boxes.map((b) =>
      el(
        'button',
        {
          class: 'choice',
          onclick: () => {
            if (edit(() => doc.putInside(state.key, node.id, b.id)) !== false) {
              state.open.set(`${state.key}:${b.id}`, true);
              renderBlocks();
              say(`Moved into “${nameOf(b)}”.`, 'good');
            }
          }
        },
        `${kindOf(b.type).emoji} ${nameOf(b)}`
      )
    )
  );
}

// ── "when this happens, do that" ──

function portNamed(node, plug, name) {
  const ports = portsOf(node)[plug === 'input' ? 'inputs' : 'outputs'];
  return ports.find((p) => p.name === name) || { name };
}

function linksView(node) {
  const out = [];
  const wires = doc.wires(state.key).filter((w) => w.fromId === node.id || w.toId === node.id);
  const signalOut = portsOf(node).outputs.find((p) => p.name === 'onClick' && p.type === 'signal');
  if (!wires.length && !signalOut) return out;
  out.push(el('h3', {}, 'What it does'));
  if (!wires.length) out.push(el('p', { class: 'hint' }, 'Nothing yet.'));
  for (const w of wires) {
    const from = nodeOf(w.fromId);
    const to = nodeOf(w.toId);
    if (!from || !to) continue;
    const sentence = `When ${w.fromId === node.id ? 'it' : '“' + nameOf(from) + '”'} ${portWord(portNamed(from, 'output', w.fromProperty))} → ${w.toId === node.id ? 'it' : '“' + nameOf(to) + '”'}: ${portWord(portNamed(to, 'input', w.toProperty))}`;
    out.push(
      el(
        'div',
        { class: 'link' },
        el('span', { class: 'words' }, sentence),
        el(
          'button',
          {
            title: 'Unjoin',
            'aria-label': 'Unjoin ' + sentence,
            onclick: () => edit(() => doc.unlink(state.key, { node: w.fromId, port: w.fromProperty }, { node: w.toId, port: w.toProperty })) && say('Unjoined.', 'good')
          },
          '✂️'
        )
      )
    );
  }
  if (signalOut) {
    if (!state.linking) {
      out.push(el('button', { class: 'action', 'data-link': 'start', onclick: () => ((state.linking = { step: 'target' }), renderChange()) }, '➕ When it is pressed, make something happen…'));
    } else if (state.linking.step === 'target') {
      const targets = linkTargets(node);
      out.push(el('p', { class: 'hint' }, 'What should happen? Pick a helper or a piece:'));
      if (!targets.length) out.push(el('p', { class: 'hint' }, 'There is nothing in this part that can be made to go.'));
      out.push(
        el(
          'div',
          { class: 'row' },
          targets.map(({ target, ports }) =>
            el(
              'button',
              {
                class: 'choice',
                'data-link-target': target.id,
                onclick: () => (ports.length === 1 ? joinTo(node, target, ports[0]) : ((state.linking = { step: 'port', target: target.id }), renderChange()))
              },
              `${kindOf(target.type).emoji} ${nameOf(target)}`
            )
          ),
          el('button', { class: 'choice', onclick: () => ((state.linking = null), renderChange()) }, '✖ Never mind')
        )
      );
    } else if (state.linking.step === 'port') {
      const target = nodeOf(state.linking.target);
      const ports = linkTargets(node).find((t) => t.target.id === target.id)?.ports || [];
      out.push(el('p', { class: 'hint' }, `What should “${nameOf(target)}” do?`));
      out.push(
        el(
          'div',
          { class: 'row' },
          ports.map((p) => el('button', { class: 'choice', 'data-link-port': p.name, onclick: () => joinTo(node, target, p) }, portWord(p))),
          el('button', { class: 'choice', onclick: () => ((state.linking = null), renderChange()) }, '✖ Never mind')
        )
      );
    }
  }
  return out;
}

/** Helpers and pieces in this part that a press can make go: the ones with a signal input. */
function linkTargets(node) {
  const helpers = new Set(doc.helpers(state.key).map((h) => h.id));
  return doc
    .nodes(state.key)
    .filter((n) => n.id !== node.id && (helpers.has(n.id) || n.type.startsWith('/')))
    .map((n) => ({ target: n, ports: portsOf(n).inputs.filter((p) => p.type === 'signal') }))
    .filter((t) => t.ports.length > 0);
}

function joinTo(node, target, port) {
  state.linking = null;
  if (edit(() => doc.link(state.key, { node: node.id, port: 'onClick' }, { node: target.id, port: port.name })) !== false) {
    say(`Joined! When “${nameOf(node)}” is pressed, “${nameOf(target)}” will ${portWord(port)}.`, 'good');
  }
}

// ── asking ──

function ask(words, yes = 'Yes', no = 'No') {
  const dialog = $('ask');
  $('ask-words').textContent = words;
  $('ask-yes').textContent = yes;
  $('ask-no').textContent = no;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'yes'), { once: true }));
}

// ── undo and save ──

function undo() {
  const last = doc.undo();
  if (!last) return;
  if (last.key !== state.key) {
    state.key = last.key;
    state.picked = null;
  }
  if (state.picked && !doc.hasNode(state.key, state.picked)) state.picked = null;
  renderAll();
  schedulePreview();
  say('Undone.', 'good');
}

async function save() {
  const changes = doc.changes();
  if (!changes.length) return;
  $('save').disabled = true;
  say('Saving…');
  let results;
  try {
    ({ results } = await api('/api/save', { changes }));
  } catch (err) {
    renderTop();
    return say(`Could not save: ${err.message}`, 'bad');
  }
  doc.saved(results);
  renderAll();
  const failed = results.filter((r) => !r.ok);
  if (!failed.length) return say('Saved! 🎉 Your changes are in the app now.', 'good');
  const f = failed[0];
  if (f.reason === 'drift' || f.reason === 'stale-revision') {
    say(
      [
        `Someone else changed “${partWord(f.key)}” while you were working, so I did not save over it. Your changes are still here. `,
        el('button', { class: 'small-button', onclick: () => reloadPart(f.key) }, `Use their version of ${partWord(f.key)}`)
      ],
      'bad'
    );
  } else {
    say(`“${partWord(f.key)}” was not saved: ${f.message}`, 'bad');
  }
}

async function reloadPart(key) {
  const fresh = await api('/api/component?key=' + encodeURIComponent(key));
  doc.reload(key, fresh);
  if (state.key === key) state.picked = null;
  renderAll();
  schedulePreview();
  say(`Loaded the new version of “${partWord(key)}”.`, 'good');
}

// ── the real app, beside the blocks ──

async function startPreview() {
  if (!window.NodegxPreview) {
    $('screen-state').textContent = '— the preview is missing';
    return;
  }
  $('screen-state').textContent = '— getting ready…';
  try {
    state.preview = await window.NodegxPreview.mountPreview($('screen'), { runtimeBase: '/runtime/' });
    state.preview.onTrace(glow);
    await updatePreview();
  } catch (err) {
    $('screen-state').textContent = `— it could not start: ${err.message}`;
  }
}

function schedulePreview() {
  clearTimeout(state.previewTimer);
  state.previewTimer = setTimeout(updatePreview, 500);
}

async function updatePreview() {
  if (!state.preview) return;
  $('screen-state').textContent = '— updating…';
  const result = await state.preview.update(doc.liveFiles());
  window.bigBlocks.lastPreview = result;
  if (result.status === 'ok') {
    $('screen-state').textContent = doc.unsavedKeys().length ? '— showing your changes (not saved yet)' : '';
    showOnScreen();
  } else {
    const why = result.message || (result.diagnostics || result.errors || []).map((d) => d.message).slice(0, 2).join(' ') || result.status;
    $('screen-state').textContent = `— can't show this change yet: ${why}`;
  }
}

/**
 * Draws a ring round what the picked block puts on the screen. The ring lies over the app rather
 * than in it: the app redraws its own elements and would wipe a style set on them.
 */
const ring = el('div', { class: 'ring', 'aria-hidden': 'true', hidden: true });
let ringTimer;
function showOnScreen() {
  clearInterval(ringTimer);
  ring.hidden = true;
  if (!state.preview || !state.picked) return;
  const elementsNow = () => {
    try {
      return state.preview.elementsOf(state.picked);
    } catch {
      return [];
    }
  };
  const first = elementsNow()[0];
  if (first) first.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const place = () => {
    const frame = state.preview.frame;
    const rects = elementsNow().map((e) => e.getBoundingClientRect()).filter((r) => r.width || r.height);
    if (!frame || !rects.length) return void (ring.hidden = true);
    if (ring.parentElement !== $('screen')) $('screen').append(ring);
    const left = Math.min(...rects.map((r) => r.left));
    const top = Math.min(...rects.map((r) => r.top));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    ring.hidden = false;
    ring.style.cssText = `left:${left - 4}px;top:${top - 4}px;width:${right - left + 8}px;height:${bottom - top + 8}px`;
  };
  place();
  ringTimer = setInterval(place, 300);
}

/** Blocks flash when the running app sends something from them or to them. */
function glow(batch) {
  window.bigBlocks.lastTrace = batch;
  const ids = new Set();
  for (const ev of batch.events || []) {
    if (ev.fromNode) ids.add(ev.fromNode);
    if (ev.toNode) ids.add(ev.toNode);
  }
  for (const id of ids) {
    for (const b of document.querySelectorAll(`[data-block="${CSS.escape(String(id))}"]`)) {
      b.classList.remove('glow');
      void b.offsetWidth;
      b.classList.add('glow');
    }
  }
}

// ── buttons and keys ──

$('undo').addEventListener('click', undo);
$('save').addEventListener('click', save);
$('open-other').addEventListener('click', async () => {
  if (doc.unsavedKeys().length && !(await ask('You have changes that are not saved. Open another app anyway and lose them?', 'Yes, lose them', 'No'))) return;
  const dir = window.prompt("The folder of the app to open (the one with nodegx.project.json in it):", state.dir);
  if (!dir) return;
  try {
    await api('/api/open', { dir });
    await load();
  } catch (err) {
    say(err.message, 'bad');
  }
});
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    undo();
  }
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault();
    save();
  }
});
window.addEventListener('beforeunload', (e) => {
  if (doc.unsavedKeys().length) e.preventDefault();
});

load().catch((err) => say(`Could not open the app: ${err.message}`, 'bad'));
