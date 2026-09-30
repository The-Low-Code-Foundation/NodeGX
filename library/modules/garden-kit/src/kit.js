// @ts-check
/**
 * Garden Kit — a NodeGX node kit for Bot Garden (Phase 105, CG-001).
 *
 * Two React nodes, and each one exists because the graph cannot draw the thing itself:
 *
 * | node | kind | why it is not nodes |
 * |---|---|---|
 * | `Block List` | React | a nested, draggable program a child holds with a finger, a pen or a mouse — no standard node draws one |
 * | `Garden`     | React | a tile world with sprites that glide, bump and pop — a For Each grid cannot animate a move |
 *
 * Hand-written in the shape of `game-kit`: no SDK, no npm install, no bundler for THIS file. `build.mjs` copies it
 * verbatim under a banner into `project/noodl_modules/garden-kit/index.js`, the file a project installs.
 *
 * ── The rule this file follows ───────────────────────────────────────────────
 *
 *   The kit draws. The engine (CG-002) interprets.
 *
 * Nothing here runs a program. `Block List` does not know what "repeat" does — it draws the block the palette
 * describes, lets a child add, move, count and remove it, and emits the program as JSON on every edit. `Garden`
 * does not know what a wall is — it draws the tiles the map names and the robots where the graph says they are.
 * Which block is running, whether a tulip is watered, where a puddle appeared: all of it arrives on a port.
 *
 * ── The JSON contract (CG-001 §2 and CG-002 §2 say this in the same words; the mockup's shapes where they are silent) ──
 *
 * Palette entry:   { id, kind, icon, label: { en, fr }, hasBody, hasCount, slots }
 *                  kind: motion | action | control | ask (the colour); icon: one of ICONS below;
 *                  slots: [{ key, label: { en, fr }, options: [{ value, label: { en, fr } }], text?, max? }]
 * Block:           { id, t, n?, body?, slots? }   t is a palette id; n the count of a hasCount block;
 *                  body the children of a hasBody block; slots { key: value } for an ask block.
 * Program:         Block[]  — emitted as JSON TEXT (a Variable keeps it byte-identical); read back as text or an object.
 * Map:             { rows: ["GGTGGGTH", ...], legend: { G: "grass", ... } }  or just the rows (the mockup's legend).
 *                  Kinds: grass path water tree rock house bed. A bed draws a dry tulip; a Thing waters it.
 * Things:          [{ kind: tulip | puddle | letter | bowl | label, x, y, watered?, colour? (red | yellow), full?, text? }]
 * Robots:          [{ x, y, d, colour, eyes, hat, name, bump? }]   d 0..3 clockwise from up; bump is a COUNT that
 *                  rises once per bump, so the same robot can bump twice in a row (the Boost-count pattern).
 * Bubble:          { robot, text, style: plain | olive, ms }
 */
(function () {
  // ✅ React is a global the runtime installs before this file runs. Read it bare; never window.React.
  var h = typeof React !== 'undefined' ? React.createElement : null;

  /** An unset boolean port reads as its documented default, not as undefined. */
  function flag(value, whenUnset) {
    if (value === undefined || value === null) return whenUnset;
    return value === true;
  }

  /** A JSON port: an object as it is, text parsed, anything else (or bad text) as the fallback. */
  function readJson(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    if (typeof v === 'string') {
      try {
        return JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    }
    return v;
  }

  /** A label in the language asked for, English when it is missing, the key when there is no label at all. */
  function word(label, lang, whenNone) {
    if (label && typeof label === 'object') return label[lang] || label.en || whenNone || '';
    if (typeof label === 'string') return label;
    return whenNone || '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The icons — the mockup's <symbol>s, drawn inline (an <Icon> or a <use> would be an empty span, README §7)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Each icon: a list of [tag, attrs] in a 24 × 24 box, white on the block's colour. */
  var ICONS = {
    fwd: [['path', { d: 'M12 4l7 8h-4v8H9v-8H5z', fill: 'currentColor' }]],
    left: [['path', { d: 'M9 6L3 11l6 5v-3h6a4 4 0 010 8h-2v-3h2a1 1 0 000-2H9v3z', fill: 'currentColor', transform: 'scale(1,-1) translate(0,-24)' }]],
    right: [['path', { d: 'M15 6l6 5-6 5v-3H9a4 4 0 000 8h2v-3H9a1 1 0 010-2h6v3z', fill: 'currentColor', transform: 'scale(1,-1) translate(0,-24)' }]],
    water: [
      ['path', { d: 'M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z', fill: 'currentColor' }],
      ['path', { d: 'M9.5 15.5a2.5 2.5 0 002 2.4', stroke: '#fff', strokeWidth: 1.6, strokeLinecap: 'round', fill: 'none' }]
    ],
    // IG-002 (P106 s2): fill — a drop falling into the can.
    fill: [
      ['path', { d: 'M4 11h12l-1.4 9.2a1 1 0 01-1 .8H6.4a1 1 0 01-1-.8z', fill: 'currentColor' }],
      ['path', { d: 'M16 13h2.2a1.8 1.8 0 010 3.6H15.6', stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' }],
      ['path', { d: 'M10 1.5s3.2 3.6 3.2 5.6a3.2 3.2 0 01-6.4 0c0-2 3.2-5.6 3.2-5.6z', fill: 'currentColor' }]
    ],
    loop: [['path', { d: 'M17 4l3 3-3 3V8H8a3 3 0 000 6h1v2H8a5 5 0 010-10h9zM7 20l-3-3 3-3v2h9a3 3 0 000-6h-1V8h1a5 5 0 010 10H7z', fill: 'currentColor' }]],
    'if': [
      ['path', { d: 'M12 2l10 10-10 10L2 12z', fill: 'currentColor' }],
      ['path', { d: 'M10 8h4v5h-4zm0 6.5h4v2h-4z', fill: '#fff' }]
    ],
    wall: [
      ['path', { d: 'M3 5h18v4H3zm0 5h18v4H3zm0 5h18v4H3z', fill: 'currentColor', opacity: 0.9 }],
      ['path', { d: 'M11 5v4m-4 5v4m8-4v4M7 10v4m8 0V9', stroke: '#fff', strokeWidth: 1.5 }]
    ],
    say: [
      ['path', { d: 'M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2h-8l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z', fill: 'currentColor' }],
      ['circle', { cx: 8, cy: 10.5, r: 1.4, fill: '#fff' }],
      ['circle', { cx: 12, cy: 10.5, r: 1.4, fill: '#fff' }],
      ['circle', { cx: 16, cy: 10.5, r: 1.4, fill: '#fff' }]
    ],
    pick: [['path', { d: 'M12 3l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8z', fill: 'currentColor' }]],
    put: [['path', { d: 'M4 14h16v6H4zM11 3h2v7h3l-4 4-4-4h3z', fill: 'currentColor' }]],
    count: [['path', { d: 'M5 4h3v16H5zm5.5 0h3v16h-3zM16 4h3v16h-3z', fill: 'currentColor' }]],
    owl: [
      ['ellipse', { cx: 12, cy: 13, rx: 8, ry: 9, fill: 'currentColor' }],
      ['circle', { cx: 9, cy: 11, r: 3, fill: '#fff' }],
      ['circle', { cx: 15, cy: 11, r: 3, fill: '#fff' }],
      ['circle', { cx: 9.4, cy: 11.4, r: 1.4, fill: '#2E2A3D' }],
      ['circle', { cx: 14.6, cy: 11.4, r: 1.4, fill: '#2E2A3D' }],
      ['path', { d: 'M12 14l-1.5 2h3z', fill: '#FFB347' }]
    ]
  };

  function iconEl(name, key, className) {
    var shapes = ICONS[name] || ICONS.pick;
    return h(
      'svg',
      { key: key, className: className || 'gd-ic', viewBox: '0 0 24 24', 'aria-hidden': 'true', 'data-icon': ICONS[name] ? name : 'pick' },
      shapes.map(function (s, i) {
        var p = {};
        for (var k in s[1]) p[k] = s[1][k];
        p.key = i;
        return h(s[0], p);
      })
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The program — pure helpers, exposed on the node so the gate grades them without a DOM
  // ═══════════════════════════════════════════════════════════════════════════

  /** The mockup's eight blocks, the say block's slot filled from the garden's people. The page sends its own. */
  var DEFAULT_PALETTE = [
    { id: 'fwd', kind: 'motion', icon: 'fwd', label: { en: 'forward', fr: 'avancer' }, hasBody: false, hasCount: false, slots: [] },
    { id: 'left', kind: 'motion', icon: 'left', label: { en: 'turn left', fr: 'tourner à gauche' }, hasBody: false, hasCount: false, slots: [] },
    { id: 'right', kind: 'motion', icon: 'right', label: { en: 'turn right', fr: 'tourner à droite' }, hasBody: false, hasCount: false, slots: [] },
    { id: 'water', kind: 'action', icon: 'water', label: { en: 'water', fr: 'arroser' }, hasBody: false, hasCount: false, slots: [] },
    { id: 'repeat', kind: 'control', icon: 'loop', label: { en: 'repeat', fr: 'répéter' }, hasBody: true, hasCount: true, slots: [] },
    { id: 'until', kind: 'control', icon: 'wall', label: { en: 'until the wall', fr: "jusqu'au mur" }, hasBody: true, hasCount: false, slots: [] },
    { id: 'if', kind: 'control', icon: 'if', label: { en: 'if a tulip is ahead', fr: 'si une tulipe devant' }, hasBody: true, hasCount: false, slots: [] },
    {
      id: 'say',
      kind: 'ask',
      icon: 'say',
      label: { en: 'say thanks to', fr: 'dire merci à' },
      hasBody: false,
      hasCount: false,
      slots: [
        {
          key: 'to',
          label: { en: 'who', fr: 'à qui' },
          options: [
            { value: 'mamie-rose', label: { en: 'Mamie Rose', fr: 'Mamie Rose' } },
            { value: 'sami', label: { en: 'Sami', fr: 'Sami' } },
            { value: 'biscuit', label: { en: 'Biscuit', fr: 'Biscuit' } }
          ]
        }
      ]
    }
  ];

  var COUNT_MIN = 1;
  var COUNT_MAX = 9;
  var TEXT_SLOT_MAX = 40;

  /** The palette port as a list of entries; junk is the default palette. */
  function parsePalette(v) {
    var list = readJson(v, null);
    if (!Array.isArray(list) || !list.length) return DEFAULT_PALETTE;
    return list.filter(function (e) {
      return e && typeof e === 'object' && typeof e.id === 'string';
    });
  }

  function paletteEntry(palette, t) {
    for (var i = 0; i < palette.length; i++) if (palette[i].id === t) return palette[i];
    return null;
  }

  /**
   * One block in its canonical shape: the keys in the order id, t, n, body, slots; n an integer; body only when it
   * is a list; slots only when it has a key; slot keys sorted. Everything else is dropped. The canonical shape is
   * what makes the round trip byte-identical: emit(parse(emit(p))) is emit(p), whatever key order the engine wrote.
   */
  function normalizeBlock(b) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
    var out = { id: typeof b.id === 'number' || typeof b.id === 'string' ? b.id : 0, t: String(b.t || '') };
    if (typeof b.n === 'number' && isFinite(b.n)) out.n = Math.round(b.n);
    if (Array.isArray(b.body)) out.body = normalizeList(b.body);
    if (b.slots && typeof b.slots === 'object' && !Array.isArray(b.slots)) {
      var keys = Object.keys(b.slots).sort();
      if (keys.length) {
        out.slots = {};
        for (var i = 0; i < keys.length; i++) out.slots[keys[i]] = String(b.slots[keys[i]]);
      }
    }
    return out;
  }

  function normalizeList(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      var b = normalizeBlock(list[i]);
      if (b) out.push(b);
    }
    return out;
  }

  /** The Program port as a canonical list. */
  function parseProgram(v) {
    return normalizeList(readJson(v, []));
  }

  /** The program as the JSON text the node emits. */
  function emitProgram(list) {
    return JSON.stringify(normalizeList(list));
  }

  function findBlock(list, id) {
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.id === id) return b;
      if (b.body) {
        var f = findBlock(b.body, id);
        if (f) return f;
      }
    }
    return null;
  }

  /** Is `id` the block `insideId` or one of its descendants? A container cannot be moved into itself. */
  function contains(list, insideId, id) {
    var host = findBlock(list, insideId);
    if (!host) return false;
    if (host.id === id) return true;
    return !!(host.body && findBlock(host.body, id));
  }

  /** Every id, depth first, in the order the list draws them. */
  function walkIds(list, out) {
    out = out || [];
    for (var i = 0; i < list.length; i++) {
      out.push(list[i].id);
      if (list[i].body) walkIds(list[i].body, out);
    }
    return out;
  }

  function countBlocks(list) {
    var n = 0;
    for (var i = 0; i < list.length; i++) n += 1 + (list[i].body ? countBlocks(list[i].body) : 0);
    return n;
  }

  /** The next free numeric id: one more than the largest numeric id in the tree (the mockup's uid). */
  function nextId(list) {
    var ids = walkIds(list);
    var max = 0;
    for (var i = 0; i < ids.length; i++) {
      var n = Number(ids[i]);
      if (isFinite(n) && n > max) max = n;
    }
    return max + 1;
  }

  /** A fresh block for a palette entry. */
  function newBlock(entry, id) {
    var b = { id: id, t: entry.id };
    if (entry.hasCount) b.n = 3;
    if (entry.hasBody) b.body = [];
    return b;
  }

  /** The list with `block` appended to the container's body, or to the top when there is no such container. */
  function addBlock(list, block, containerId) {
    var next = normalizeList(list);
    var host = containerId === null || containerId === undefined ? null : findBlock(next, containerId);
    var b = normalizeBlock(block);
    if (!b) return next;
    if (host && host.body) host.body.push(b);
    else next.push(b);
    return next;
  }

  function removeFrom(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list.splice(i, 1)[0];
      if (list[i].body) {
        var got = removeFrom(list[i].body, id);
        if (got) return got;
      }
    }
    return null;
  }

  /** The list without the block (and its body). An unknown id changes nothing. */
  function removeBlock(list, id) {
    var next = normalizeList(list);
    removeFrom(next, id);
    return next;
  }

  /**
   * The block moved into the container's body (or the top when containerId is null) at `index`, counted in that list
   * AFTER the block has left it. A move into itself or into its own body is refused and changes nothing; an index
   * past the end lands at the end.
   */
  function moveBlock(list, id, containerId, index) {
    var next = normalizeList(list);
    var into = containerId === null || containerId === undefined ? null : containerId;
    if (into !== null && contains(next, id, into)) return next;
    var taken = removeFrom(next, id);
    if (!taken) return next;
    var target = into === null ? next : (findBlock(next, into) || {}).body;
    if (!target) target = next;
    var at = typeof index === 'number' && isFinite(index) ? Math.max(0, Math.min(Math.floor(index), target.length)) : target.length;
    target.splice(at, 0, taken);
    return next;
  }

  /** The count of a hasCount block, clamped 1..9 and whole. */
  function setCount(list, id, n) {
    var next = normalizeList(list);
    var b = findBlock(next, id);
    if (!b) return next;
    var v = Math.round(Number(n));
    if (!isFinite(v)) v = COUNT_MIN;
    b.n = Math.max(COUNT_MIN, Math.min(COUNT_MAX, v));
    return next;
  }

  /**
   * One slot of a block set to a value. TYPED text is cut to `max` (the text field's limit, at most 40 characters); a
   * value PICKED from the slot's options is kept whole — it is one of the list's own words (P105 s3 drive: a 45-character
   * flower list cut to 40 was no longer on the list, and 15 options of five Olive rungs could never be sent).
   */
  function setSlot(list, id, key, value, max) {
    var next = normalizeList(list);
    var b = findBlock(next, id);
    if (!b || !key) return next;
    if (!b.slots) b.slots = {};
    var text = String(value === undefined || value === null ? '' : value);
    var cut = Number(max) > 0 ? Math.min(TEXT_SLOT_MAX, Number(max)) : 0;
    b.slots[String(key)] = cut ? text.slice(0, cut) : text;
    return normalizeList(next);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Block List — a React node
  // ═══════════════════════════════════════════════════════════════════════════

  /** The blocks' stylesheet: the mockup's .blk / .prog / .rep rules, prefixed gd-. The colours are CSS variables the ports set on the root. */
  var BLOCKS_CSS =
    '.gd-blocks{position:relative;font-family:inherit;color:#2E2A3D;-webkit-tap-highlight-color:transparent}\n' +
    '.gd-palette{display:flex;flex-wrap:wrap;gap:6px 8px;margin:0 0 12px;padding-bottom:12px;border-bottom:2px dashed #EBDFC4}\n' +
    '.gd-blk{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:12px;color:#fff;font-weight:800;font-size:15px;line-height:1.2;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18);user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;border:0;font-family:inherit;cursor:pointer;position:relative;text-align:left}\n' +
    '.gd-blk .gd-ic{width:20px;height:20px;flex:none}\n' +
    '.gd-motion{background:var(--gd-motion)}.gd-action{background:var(--gd-action)}.gd-control{background:var(--gd-control)}.gd-ask{background:var(--gd-ask)}\n' +
    '.gd-palette .gd-blk:hover{filter:brightness(1.06)}\n' +
    '.gd-band1 .gd-blk{padding:10px 12px;flex-direction:column;gap:3px}.gd-band1 .gd-blk .gd-ic{width:26px;height:26px}.gd-band1 .gd-blk .gd-n{font-size:11px}\n' +
    '.gd-band1 .gd-hd .gd-blk{flex-direction:row;gap:7px}\n' +
    '.gd-band2 .gd-blk .gd-n{font-size:15px}\n' +
    '.gd-prog{display:flex;flex-direction:column;gap:6px;min-height:120px}\n' +
    '.gd-row{display:flex;align-items:center;gap:6px}\n' +
    '.gd-prog .gd-blk{touch-action:none}\n' +
    // IG-001 D5 (P106 s1): the running block wears the ink ring (3 px) outside a 4 px white halo, so the ring reads on the
    // white steps panel, inside a repeat (#FFF0DA) and against every block fill; the sun outline was 1.44:1 on white.
    '.gd-blk.gd-run{outline:3px solid var(--gd-run);outline-offset:4px;box-shadow:0 0 0 4px #fff,inset 0 -3px 0 rgba(0,0,0,.18);transform:scale(1.04)}\n' +
    '.gd-x{margin-left:4px;font-size:13px;background:none;border:0;color:inherit;font-weight:800;cursor:pointer;padding:0 2px;font-family:inherit;touch-action:manipulation}\n' +
    // P108 IW-001 F4: the ? on a DRAWER block (Show Help) — the block's card. Violet ink on white, 24 px, tucked against
    // the block's right edge (never over its word), a white ring so it reads on every block colour.
    '.gd-pal-item{display:inline-flex;align-items:center}\n' +
    '.gd-pal-item .gd-help{margin-left:-4px;position:relative;z-index:1;box-shadow:0 0 0 2px #fff,0 1px 3px rgba(0,0,0,.25)}\n' +
    '.gd-locked .gd-pal-item .gd-help{pointer-events:auto}\n' +
    // F5: a tapped simple block is selected (a ring), never removed.
    '.gd-row[data-sel="1"]>.gd-blk{outline:3px solid var(--gd-control);outline-offset:2px}\n' +
    '.gd-help{margin-left:2px;width:24px;height:24px;flex:none;border-radius:50%;border:0;background:#fff;color:#4A2FA6;font-weight:800;font-size:14px;line-height:24px;padding:0;font-family:inherit;cursor:pointer;touch-action:manipulation;text-align:center}\n' +
    '.gd-rep{border-radius:14px;background:#FFF0DA;padding:6px;display:flex;flex-direction:column;gap:6px;border:2px solid transparent}\n' +
    '.gd-rep[data-sel="1"]{border-color:var(--gd-control)}\n' +
    '.gd-hd{display:flex;align-items:center;gap:6px}\n' +
    '.gd-body{margin-left:22px;display:flex;flex-direction:column;gap:6px;border-left:4px solid var(--gd-control);padding-left:8px;min-height:16px}\n' +
    '.gd-dots{font-size:13px;color:#6E6784;font-weight:700}\n' +
    '.gd-nctl{display:inline-flex;gap:2px;margin-left:2px;align-items:center}\n' +
    '.gd-nctl button{width:26px;height:26px;border-radius:8px;background:rgba(0,0,0,.2);color:#fff;font-weight:800;border:0;font-size:16px;font-family:inherit;cursor:pointer;touch-action:manipulation}\n' +
    '.gd-count{min-width:22px;text-align:center}\n' +
    '.gd-empty{color:#6E6784;font-weight:700;padding:18px 10px;border:2px dashed #EBDFC4;border-radius:14px;text-align:center}\n' +
    '.gd-drag{opacity:.85;z-index:5;pointer-events:none;box-shadow:0 8px 18px rgba(0,0,0,.2)}\n' +
    '.gd-dropline{height:4px;border-radius:2px;background:var(--gd-drop);margin:-3px 0}\n' +
    '.gd-slot{background:rgba(0,0,0,.2);border:0;border-radius:8px;color:#fff;font-weight:800;font-family:inherit;font-size:13px;padding:3px 8px;cursor:pointer;touch-action:manipulation}\n' +
    '.gd-picker{display:flex;flex-wrap:wrap;gap:6px;padding:8px;border-radius:12px;background:#EEE8FF}\n' +
    '.gd-opt{border:0;border-radius:999px;background:#fff;color:#4A2FA6;font-weight:800;font-family:inherit;font-size:14px;padding:7px 12px;cursor:pointer;touch-action:manipulation}\n' +
    '.gd-opt[aria-pressed="true"]{background:#4A2FA6;color:#fff}\n' +
    '.gd-slot-text{font:inherit;font-weight:700;font-size:14px;padding:6px 10px;border-radius:10px;border:2px solid #EBDFC4;flex:1 1 160px;min-width:0}\n' +
    '.gd-locked .gd-palette,.gd-locked .gd-x,.gd-locked .gd-nctl,.gd-locked .gd-slot{opacity:.5;pointer-events:none}\n' +
    '.gd-blk:focus-visible,.gd-x:focus-visible,.gd-help:focus-visible,.gd-opt:focus-visible{outline:3px solid #5FB4E8;outline-offset:2px}';

  /** How far a pointer travels before a press is a drag and not a tap, in CSS px. A finger wobbles. */
  var DRAG_SLOP = 6;

  /**
   * Where a drag at (x, y) would drop, read off the DOM: before or after the block under the pointer, into an empty
   * body, at the end of the list, or nowhere (outside the list, so the block goes back). The index is counted in the
   * target list after the dragged block has left it, which is what moveBlock takes.
   */
  function dropAt(root, list, dragId, x, y) {
    if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') return null;
    var el = document.elementFromPoint(x, y);
    if (!el || !root.contains(el)) return null;
    var blk = el.closest ? el.closest('.gd-prog .gd-blk[data-id]') : null;
    if (blk) {
      var overId = idOf(blk.getAttribute('data-id'), list);
      if (overId === dragId || contains(list, dragId, overId)) return { containerId: null, index: null, same: true };
      var body = blk.parentElement && blk.parentElement.closest ? blk.parentElement.closest('.gd-body[data-body]') : null;
      var containerId = body ? idOf(body.getAttribute('data-body'), list) : null;
      var siblings = containerId === null ? list : (findBlock(list, containerId) || { body: [] }).body;
      var r = blk.getBoundingClientRect();
      var after = y > r.top + r.height / 2;
      var index = 0;
      for (var i = 0; i < siblings.length; i++) {
        if (siblings[i].id === dragId) continue;
        if (siblings[i].id === overId) {
          index += after ? 1 : 0;
          break;
        }
        index++;
      }
      return { containerId: containerId, index: index };
    }
    var bodyEl = el.closest ? el.closest('.gd-body[data-body]') : null;
    if (bodyEl) {
      var into = idOf(bodyEl.getAttribute('data-body'), list);
      if (into === dragId || contains(list, dragId, into)) return { containerId: null, index: null, same: true };
      return { containerId: into, index: 999999 };
    }
    if (el.closest && el.closest('.gd-prog')) return { containerId: null, index: 999999 };
    return null;
  }

  /** A data-id attribute back to the id the program holds (numbers stay numbers). */
  function idOf(attr, list) {
    var ids = walkIds(list);
    for (var i = 0; i < ids.length; i++) if (String(ids[i]) === String(attr)) return ids[i];
    return attr;
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var BlockList = {
    name: 'garden-kit.BlockList',
    displayNodeName: 'Block List',
    docs:
      'The program editor a child holds. A vertical list of blocks from a Palette: tap a palette block to add it (into ' +
      'the selected container, or at the end), drag a block to move it with a finger, a pen or a mouse, tap a placed ' +
      'block to select it, tap its cross to drop it. Containers nest with a left rail; a repeat carries a count with minus and plus; an ask block opens a picker ' +
      'of garden words (band 1 never opens a keyboard; band 2 may type up to 40 characters). Running Id glows one block. ' +
      'Program is emitted as JSON text on every edit and read back the same. It draws; the engine decides what a block does.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,

    /** The pure parts, for the kit gate: the program helpers and the stylesheet. */
    program: {
      parse: parseProgram,
      emit: emitProgram,
      normalize: normalizeList,
      find: findBlock,
      contains: contains,
      walk: walkIds,
      count: countBlocks,
      nextId: nextId,
      newBlock: newBlock,
      add: addBlock,
      move: moveBlock,
      remove: removeBlock,
      setCount: setCount,
      setSlot: setSlot,
      parsePalette: parsePalette,
      DEFAULT_PALETTE: DEFAULT_PALETTE,
      COUNT_MIN: COUNT_MIN,
      COUNT_MAX: COUNT_MAX,
      TEXT_SLOT_MAX: TEXT_SLOT_MAX,
      DRAG_SLOP: DRAG_SLOP
    },
    icons: ICONS,
    css: BLOCKS_CSS,

    getReactComponent: function () {
      return function BlockListComponent(props) {
        var root = React.useRef(null);
        var palette = parsePalette(props.palette);
        var lang = props.language === 'fr' ? 'fr' : 'en';
        var band = Number(props.band) === 1 ? 1 : 2;
        var locked = flag(props.locked, false);
        var runningId = props.runningId === undefined || props.runningId === null ? '' : String(props.runningId);

        var progState = React.useState(function () {
          return parseProgram(props.program);
        });
        var prog = progState[0];
        var selState = React.useState('');
        var sel = selState[0];
        var pickerState = React.useState(null);
        var picker = pickerState[0];
        var dragState = React.useState(null);
        var drag = dragState[0];

        // The listeners are registered once; they read the latest of everything through this ref.
        var live = React.useRef({});
        live.current = { prog: prog, sel: sel, locked: locked, band: band, onProgram: props.onProgram, onChanged: props.onChanged, onSelected: props.onSelected, onHelp: props.onHelp, onHelpBlock: props.onHelpBlock };
        var lastEmitted = React.useRef(null);

        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(root.current);
        }, []);

        // Program in: what the graph sends wins, unless it is the very text this node just emitted (a wire back to itself).
        var incoming = props.program;
        React.useEffect(
          function () {
            var text = typeof incoming === 'string' ? incoming : emitProgram(readJson(incoming, []));
            if (text === lastEmitted.current) return;
            var parsed = parseProgram(incoming);
            if (emitProgram(parsed) !== emitProgram(live.current.prog)) progState[1](parsed);
          },
          [incoming]
        );

        var publish = function (next) {
          var text = emitProgram(next);
          lastEmitted.current = text;
          live.current.prog = next;
          progState[1](next);
          if (typeof live.current.onProgram === 'function') live.current.onProgram(text);
          if (typeof live.current.onChanged === 'function') live.current.onChanged();
        };
        var select = function (id) {
          var next = id === undefined || id === null ? '' : String(id);
          if (next === live.current.sel) return;
          live.current.sel = next;
          selState[1](next);
          if (typeof live.current.onSelected === 'function') live.current.onSelected(next);
        };
        var selectedId = function () {
          var s = live.current.sel;
          return s === '' ? null : idOf(s, live.current.prog);
        };

        var add = function (entry) {
          if (live.current.locked) return;
          var p = live.current.prog;
          var b = newBlock(entry, nextId(p));
          var into = selectedId();
          var host = into === null ? null : findBlock(p, into);
          publish(addBlock(p, b, host && host.body ? into : null));
          if (b.body && entry.id !== 'if') select(b.id);
        };
        var remove = function (id) {
          if (live.current.locked) return;
          publish(removeBlock(live.current.prog, id));
          if (String(id) === live.current.sel) select('');
          pickerState[1](null);
        };
        var bump = function (id, by) {
          if (live.current.locked) return;
          var b = findBlock(live.current.prog, id);
          if (!b) return;
          publish(setCount(live.current.prog, id, (b.n || COUNT_MIN) + by));
        };
        var pickSlot = function (id, key, value, max) {
          if (live.current.locked) return;
          publish(setSlot(live.current.prog, id, key, value, max));
        };

        // ── Pointers: one gesture at a time, touch, pen or mouse alike ────────
        var gesture = React.useRef(null);
        var onPointerDown = function (e) {
          if (live.current.locked) return;
          var t = e.target;
          if (!t || !t.closest) return;
          if (t.closest('[data-x],[data-help],[data-dec],[data-inc],[data-slot],.gd-picker,.gd-palette')) return;
          var blk = t.closest('.gd-prog .gd-blk[data-id]');
          if (!blk) return;
          if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
          e.preventDefault();
          var id = idOf(blk.getAttribute('data-id'), live.current.prog);
          gesture.current = { id: id, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, drop: null, type: e.pointerType };
          try {
            root.current.setPointerCapture(e.pointerId);
          } catch (err) {
            /* capture is a nicety; the document listeners still see the moves */
          }
        };
        var onPointerMove = function (e) {
          var g = gesture.current;
          if (!g || e.pointerId !== g.pointerId) return;
          var dx = e.clientX - g.x0;
          var dy = e.clientY - g.y0;
          if (!g.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
          g.moved = true;
          g.drop = dropAt(root.current, live.current.prog, g.id, e.clientX, e.clientY);
          dragState[1]({ id: g.id, dx: dx, dy: dy, drop: g.drop && !g.drop.same ? g.drop : null });
        };
        var onPointerUp = function (e) {
          var g = gesture.current;
          if (!g || e.pointerId !== g.pointerId) return;
          gesture.current = null;
          dragState[1](null);
          try {
            root.current.releasePointerCapture(e.pointerId);
          } catch (err) {
            /* not captured */
          }
          if (e.type === 'pointercancel') return;
          if (!g.moved) {
            // A tap. A container's header picks it as the place new blocks go. P108 IW-001 F5: a tap on a simple block
            // selects it (a second tap lets go) and NEVER takes it away — a child deleted by accident; the cross does that.
            var b = findBlock(live.current.prog, g.id);
            if (!b) return;
            select(String(g.id) === live.current.sel ? '' : g.id);
            return;
          }
          // A drag. Inside the list it moves; outside, or onto itself, the block simply goes back.
          if (g.drop && !g.drop.same) publish(moveBlock(live.current.prog, g.id, g.drop.containerId, g.drop.index));
        };
        React.useEffect(function () {
          if (typeof document === 'undefined') return undefined;
          document.addEventListener('pointermove', onPointerMove);
          document.addEventListener('pointerup', onPointerUp);
          document.addEventListener('pointercancel', onPointerUp);
          return function () {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
          };
        }, []);

        // ── Drawing ───────────────────────────────────────────────────────────
        var blockEl = function (b, entry, extra, isHead) {
          var kind = entry ? entry.kind : 'motion';
          var isRun = runningId !== '' && String(b.id) === runningId;
          var isDrag = drag && drag.id === b.id;
          var cls = 'gd-blk gd-' + kind + (isRun ? ' gd-run' : '') + (isDrag ? ' gd-drag' : '');
          var style = isDrag ? { transform: 'translate(' + drag.dx + 'px,' + drag.dy + 'px)' } : undefined;
          var children = [iconEl(entry ? entry.icon : 'pick', 'ic'), h('span', { key: 'n', className: 'gd-n' }, entry ? word(entry.label, lang, entry.id) : b.t)];
          if (extra) children = children.concat(extra);
          return h(
            'span',
            { className: cls, 'data-id': String(b.id), 'data-t': b.t, 'data-run': isRun ? 'true' : undefined, role: 'button', tabIndex: 0, style: style, 'aria-label': entry ? word(entry.label, lang, entry.id) : b.t },
            children
          );
        };
        var xEl = function (b) {
          return h('button', { key: 'x', type: 'button', className: 'gd-x', 'data-x': String(b.id), 'aria-label': lang === 'fr' ? 'enlever' : 'remove', disabled: locked, onClick: function () { remove(b.id); } }, '✕');
        };
        // P108 IW-001 F4: the ? sits on the DRAWER's blocks (Show Help), never on a placed one — it was backwards: the
        // question "what does this block do?" is asked before placing it. Help Block is the block's kind, then Help
        // fires; it places nothing and is never locked (a card can be read while a run plays).
        var showHelp = flag(props.showHelp, false);
        var helpEl = function (entry) {
          if (!showHelp) return null;
          return h('button', {
            key: 'help', type: 'button', className: 'gd-help', 'data-help': String(entry.id), 'aria-label': (lang === 'fr' ? 'que fait ce bloc ? ' : 'what does it do? ') + word(entry.label, lang, entry.id),
            onClick: function () {
              if (typeof live.current.onHelpBlock === 'function') live.current.onHelpBlock(String(entry.id));
              if (typeof live.current.onHelp === 'function') live.current.onHelp();
            }
          }, '?');
        };
        var slotEls = function (b, entry) {
          if (!entry || !entry.slots || !entry.slots.length) return [];
          return entry.slots.map(function (s) {
            var value = b.slots && b.slots[s.key] !== undefined ? b.slots[s.key] : '';
            var shown = '…';
            if (value !== '') {
              shown = value;
              for (var i = 0; s.options && i < s.options.length; i++) if (s.options[i].value === value) shown = word(s.options[i].label, lang, value);
            }
            var open = picker && picker.id === b.id && picker.key === s.key;
            return h(
              'button',
              { key: 'slot-' + s.key, type: 'button', className: 'gd-slot', 'data-slot': s.key, 'data-value': value, 'aria-expanded': open ? 'true' : 'false', disabled: locked, onClick: function () { pickerState[1](open ? null : { id: b.id, key: s.key }); } },
              shown
            );
          });
        };
        var pickerEl = function (b, entry) {
          if (!picker || picker.id !== b.id || !entry || !entry.slots) return null;
          var s = null;
          for (var i = 0; i < entry.slots.length; i++) if (entry.slots[i].key === picker.key) s = entry.slots[i];
          if (!s) return null;
          var value = b.slots && b.slots[s.key] !== undefined ? b.slots[s.key] : '';
          var items = (s.options || []).map(function (o) {
            return h('button', { key: 'o-' + o.value, type: 'button', className: 'gd-opt', 'data-opt': o.value, 'aria-pressed': o.value === value ? 'true' : 'false', onClick: function () { pickSlot(b.id, s.key, o.value); pickerState[1](null); } }, word(o.label, lang, o.value));
          });
          // Band 2 may type; band 1 never sees a keyboard, whatever the palette says.
          if (s.text && band === 2) {
            items.push(h('input', { key: 'text', className: 'gd-slot-text', type: 'text', maxLength: Math.min(TEXT_SLOT_MAX, Number(s.max) || TEXT_SLOT_MAX), value: value, 'aria-label': word(s.label, lang, s.key), autoComplete: 'off', onChange: function (e) { pickSlot(b.id, s.key, e.target.value, Math.min(TEXT_SLOT_MAX, Number(s.max) || TEXT_SLOT_MAX)); } }));
          }
          return h('div', { key: 'picker', className: 'gd-picker', 'data-picker': String(b.id) }, items);
        };
        var dropline = function (key) {
          return h('div', { key: key, className: 'gd-dropline', 'data-dropline': 'true' });
        };
        var renderList = function (list, containerId) {
          var out = [];
          var mark = drag && drag.drop && ((drag.drop.containerId === null && containerId === null) || String(drag.drop.containerId) === String(containerId)) ? drag.drop.index : null;
          var place = 0;
          for (var i = 0; i < list.length; i++) {
            var b = list[i];
            var entry = paletteEntry(palette, b.t);
            var isDragged = drag && drag.id === b.id;
            if (mark !== null && !isDragged && place === mark) out.push(dropline('dl-' + place));
            if (b.body) {
              var head = [];
              if (entry && entry.hasCount) {
                head.push(
                  h(
                    'span',
                    { key: 'nctl', className: 'gd-nctl' },
                    h('button', { key: 'dec', type: 'button', 'data-dec': String(b.id), 'aria-label': lang === 'fr' ? 'moins' : 'fewer', disabled: locked, onClick: function (id) { return function () { bump(id, -1); }; }(b.id) }, '−'),
                    h('b', { key: 'n', className: 'gd-count', 'data-count': String(b.n) }, String(b.n)),
                    h('button', { key: 'inc', type: 'button', 'data-inc': String(b.id), 'aria-label': lang === 'fr' ? 'plus' : 'more', disabled: locked, onClick: function (id) { return function () { bump(id, 1); }; }(b.id) }, '+')
                  )
                );
                head.push(h('span', { key: 'times', className: 'gd-n gd-times' }, lang === 'fr' ? 'fois' : 'times'));
              }
              head = head.concat(slotEls(b, entry));
              head.push(xEl(b));
              var body = renderList(b.body, b.id);
              if (!body.length) body = [h('span', { key: 'dots', className: 'gd-dots' }, '…')];
              out.push(
                h(
                  'div',
                  { key: 'b-' + b.id, className: 'gd-rep', 'data-rep': String(b.id), 'data-sel': String(b.id) === sel ? '1' : '0' },
                  h('div', { key: 'hd', className: 'gd-hd' }, blockEl(b, entry, head, true)),
                  pickerEl(b, entry),
                  h('div', { key: 'body', className: 'gd-body', 'data-body': String(b.id) }, body)
                )
              );
            } else {
              out.push(h('div', { key: 'b-' + b.id, className: 'gd-row', 'data-sel': String(b.id) === sel ? '1' : '0' }, blockEl(b, entry, slotEls(b, entry).concat([xEl(b)]), false), pickerEl(b, entry)));
            }
            if (!isDragged) place++;
          }
          if (mark !== null && mark >= place) out.push(dropline('dl-end'));
          return out;
        };

        var paletteEls = palette.map(function (entry) {
          var tile = h(
            'button',
            { key: 'b', type: 'button', className: 'gd-blk gd-' + entry.kind, 'data-pal': entry.id, title: word(entry.label, lang, entry.id), disabled: locked, onClick: function () { add(entry); } },
            iconEl(entry.icon, 'ic'),
            h('span', { key: 'n', className: 'gd-n' }, word(entry.label, lang, entry.id))
          );
          // IW-001 F4: the drawer block and its ? side by side (a button inside a button is not a button).
          return h('span', { key: 'p-' + entry.id, className: 'gd-pal-item', 'data-pal-item': entry.id }, tile, helpEl(entry));
        });
        var rows = renderList(prog, null);
        var emptyText = lang === 'fr' ? 'Pas encore de pas. Touche un bloc.' : 'No steps yet. Tap a block.';

        return h(
          'div',
          {
            ref: root,
            className: 'gd-blocks gd-band' + band + (locked ? ' gd-locked' : ''),
            'data-gd-blocks': 'true',
            'data-band': String(band),
            'data-lang': lang,
            'data-count': String(countBlocks(prog)),
            onPointerDown: onPointerDown,
            onContextMenu: function (e) { e.preventDefault(); },
            style: Object.assign(
              { '--gd-motion': props.motionColor, '--gd-action': props.actionColor, '--gd-control': props.controlColor, '--gd-ask': props.askColor, '--gd-run': props.runColor, '--gd-drop': props.dropColor },
              props.style
            )
          },
          h('style', { key: 'css' }, BLOCKS_CSS),
          flag(props.showPalette, true) ? h('div', { key: 'palette', className: 'gd-palette', role: 'group', 'aria-label': lang === 'fr' ? 'blocs' : 'blocks' }, paletteEls) : null,
          h('div', { key: 'prog', className: 'gd-prog', role: 'list', 'aria-label': lang === 'fr' ? 'programme' : 'program' }, rows.length ? rows : h('div', { key: 'empty', className: 'gd-empty' }, emptyText))
        );
      };
    },

    defaultCss: { display: 'block' },

    inputProps: {
      palette: {
        type: 'object',
        displayName: 'Palette',
        group: 'Program',
        description: 'The blocks this band may use, as a list or its JSON: each with id, kind (motion, action, control, ask), icon, label { en, fr }, hasBody, hasCount and slots. Empty draws the mockup’s eight.'
      },
      program: {
        type: 'object',
        displayName: 'Program',
        group: 'Program',
        description: 'The current program, as JSON text or a list of blocks { id, t, n, body, slots }. What the graph sends replaces what is drawn; the node’s own output is not read back as a change.'
      },
      band: { type: 'number', displayName: 'Band', group: 'Program', default: 2, description: '1 draws icon-first blocks with the word as a small caption and never opens a keyboard; 2 draws icon and word. The switch is live: the same elements, restyled.' },
      language: { type: { name: 'enum', enums: [{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }] }, displayName: 'Language', group: 'Program', default: 'en' },
      runningId: { type: 'string', displayName: 'Running Id', group: 'Program', default: '', description: 'The id of the block to glow. Empty glows none.' },
      locked: { type: 'boolean', displayName: 'Locked', group: 'Program', default: false, description: 'True while a run plays: no add, move, remove or count change.' },
      showPalette: { type: 'boolean', displayName: 'Show Palette', group: 'Program', default: true },
      showHelp: { type: 'boolean', displayName: 'Show Help', group: 'Program', default: false, description: 'A ? on every block in the palette (never on a placed one). A tap sets Help Block to the block’s kind and fires Help; it places nothing.' },
      // White words on these reach 4.5:1 (P105 s3 ruling 5: the mockup's hues, darker — the template's tokens are the same).
      motionColor: { type: 'color', displayName: 'Motion Blocks', group: 'Style', default: '#3170E0' },
      actionColor: { type: 'color', displayName: 'Action Blocks', group: 'Style', default: '#058149' },
      controlColor: { type: 'color', displayName: 'Control Blocks', group: 'Style', default: '#A86501' },
      askColor: { type: 'color', displayName: 'Ask Blocks', group: 'Style', default: '#8059EC' },
      // The ring around the running block: the ink, over a white halo the sheet draws (IG-001 D5). The drop-line, drawn
      // while a block is dragged, keeps the sun in a colour of its own.
      runColor: { type: 'color', displayName: 'Running Ring', group: 'Style', default: '#2E2A3D', description: 'The 3 px ring around the block that is running, outside a 4 px white halo.' },
      dropColor: { type: 'color', displayName: 'Drop Line', group: 'Style', default: '#FFD166', description: 'The line that shows where a dragged block will drop.' }
    },

    outputProps: {
      onProgram: { type: 'string', displayName: 'Program', group: 'Program', description: 'The program as JSON text, after every edit. Read back through Program, it draws the same.' },
      onChanged: { type: 'signal', displayName: 'Changed', group: 'Program', description: 'An edit happened. Program already holds it.' },
      onSelected: { type: 'string', displayName: 'Selected', group: 'Program', description: 'The id of the container a palette tap inserts into, or empty for the end of the list.' },
      onHelpBlock: { type: 'string', displayName: 'Help Block', group: 'Help', description: 'The kind (palette id) of the palette block whose ? was tapped (Show Help).' },
      onHelp: { type: 'signal', displayName: 'Help', group: 'Help', description: 'A block’s ? was tapped. Help Block already holds its kind.' }
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Garden — a React node
  // ═══════════════════════════════════════════════════════════════════════════

  /** The mockup’s map characters. A page sends its own legend beside its rows. */
  // P108 IW-002 (lane D): L is the wall tile (WALL_TILE, below; the engine blocks it) — drawn by both kits.
  var DEFAULT_LEGEND = { G: 'grass', P: 'path', W: 'water', T: 'tree', R: 'rock', H: 'house', F: 'bed', B: 'postbox', L: 'wall', '.': 'grass', ' ': 'grass' };
  var KINDS = ['grass', 'path', 'water', 'tree', 'rock', 'house', 'bed', 'postbox', 'wall'];

  /**
   * The Map port as a grid: { w, h, rows, legend, cells }. Rows or { rows, legend } or newline-separated text; a
   * ragged row is padded with grass to the widest, an unknown character is grass, nothing (or a non-list object) is
   * a 0 × 0 world.
   */
  function parseMap(v) {
    // Text that is not JSON is the rows themselves, one per line (the TPL-005 grid form).
    var m = v;
    if (typeof v === 'string') {
      try {
        m = JSON.parse(v);
      } catch (e) {
        m = v;
      }
    }
    var rows = null;
    var legend = DEFAULT_LEGEND;
    if (typeof m === 'string') rows = m.split('\n');
    else if (Array.isArray(m)) rows = m;
    else if (m && typeof m === 'object') {
      if (typeof m.rows === 'string') rows = m.rows.split('\n');
      else if (Array.isArray(m.rows)) rows = m.rows;
      if (m.legend && typeof m.legend === 'object') {
        legend = {};
        for (var k in DEFAULT_LEGEND) legend[k] = DEFAULT_LEGEND[k];
        for (var c in m.legend) legend[c] = m.legend[c];
      }
    }
    if (!rows) rows = [];
    rows = rows.map(function (r) {
      return String(r === undefined || r === null ? '' : r);
    });
    var w = 0;
    for (var i = 0; i < rows.length; i++) if (rows[i].length > w) w = rows[i].length;
    var cells = [];
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < w; x++) {
        var ch = x < rows[y].length ? rows[y].charAt(x) : 'G';
        var kind = legend[ch];
        if (KINDS.indexOf(kind) === -1) kind = 'grass';
        cells.push({ x: x, y: y, ch: ch, kind: kind });
      }
    }
    return { w: w, h: rows.length, rows: rows, legend: legend, cells: cells };
  }

  function parseThings(v) {
    var list = readJson(v, []);
    if (!Array.isArray(list)) return [];
    return list.filter(function (t) {
      return t && typeof t === 'object' && typeof t.kind === 'string' && isFinite(Number(t.x)) && isFinite(Number(t.y));
    });
  }

  function parseRobots(v) {
    var list = readJson(v, []);
    if (list && !Array.isArray(list) && typeof list === 'object') list = [list];
    if (!Array.isArray(list)) return [];
    return list
      .filter(function (r) {
        return r && typeof r === 'object';
      })
      .map(function (r, i) {
        var d = Math.round(Number(r.d));
        if (!isFinite(d)) d = 0;
        d = ((d % 4) + 4) % 4;
        var o = {
          x: isFinite(Number(r.x)) ? Number(r.x) : 0,
          y: isFinite(Number(r.y)) ? Number(r.y) : 0,
          d: d,
          colour: typeof r.colour === 'string' && r.colour ? r.colour : typeof r.color === 'string' && r.color ? r.color : '#FF7A59',
          eyes: r.eyes === 'happy' || r.eyes === 'wink' ? r.eyes : 'round',
          hat: r.hat === 'cap' || r.hat === 'sun' || r.hat === 'crown' ? r.hat : 'none',
          name: typeof r.name === 'string' ? r.name : i === 0 ? 'Pip' : '',
          bump: isFinite(Number(r.bump)) ? Number(r.bump) : 0,
          can: isFinite(Number(r.can)) && r.can !== null && r.can !== '' ? Math.max(0, Math.floor(Number(r.can))) : null,
          canMax: isFinite(Number(r.canMax)) && Number(r.canMax) > 0 ? Math.floor(Number(r.canMax)) : 3,
          carry: Array.isArray(r.carry) ? r.carry.map(String) : [],
          // P106 IG-005 (brief s4 §4.3): what the robot wears for its job. Missing = the can (every robot before IG-005 was
          // Pip with his can); '' or anything unknown = none.
          accessory: r.accessory === undefined || r.accessory === null ? 'can' : ['can', 'hod', 'satchel', 'bell'].indexOf(r.accessory) !== -1 ? r.accessory : ''
        };
        // P108 IW-002 (lane D): a robot that holds the can (the engine's `holds: 'can'`) carries it whatever it wears; the
        // field is there only when it holds it, so a robot row without it parses exactly as before.
        if (r.holds === 'can') o.holds = 'can';
        return o;
      });
  }

  /**
   * P95 AC9’s lesson, applied before the pages exist: a robot is never drawn smaller than this, in CSS px, however
   * small a tile is — at 390px wide a 12-column tile is about 30px, and a face on a 30px robot is 11px. The visor is
   * FACE_W × FACE_H of the sprite’s 64 units, drawn at ROBOT_SVG_PCT of the box. 🔴 Session 1’s drive measured the
   * FIRST visor (28 × 16) at 12px on a 56px box: a robot facing right is rotated 90°, so the visor’s HEIGHT is the
   * width on screen. The face fraction is therefore the visor’s SMALLER side, and the visor is 34 × 28 so that side is
   * 0.40 of the box: 22.5px at the floor, whichever way the robot faces.
   */
  var ROBOT_MIN_PX = 56;
  var ROBOT_SVG_PCT = 92;
  var FACE_X = 15;
  var FACE_Y = 13;
  var FACE_W = 34;
  var FACE_H = 28;
  var FACE_FRACTION = (Math.min(FACE_W, FACE_H) / 64) * (ROBOT_SVG_PCT / 100);

  /** The robot, the mockup’s botSVG in a 64 × 64 box, facing up. */
  function robotSvg(r, key) {
    var ink = '#2E2A3D';
    var eyes;
    if (r.eyes === 'happy') eyes = [h('path', { key: 'e', d: 'M19 28q5-6 10 0M35 28q5-6 10 0', stroke: ink, strokeWidth: 3, fill: 'none', strokeLinecap: 'round' })];
    else if (r.eyes === 'wink') eyes = [h('circle', { key: 'e1', cx: 24, cy: 27, r: 4, fill: ink }), h('path', { key: 'e2', d: 'M35 27h10', stroke: ink, strokeWidth: 3, strokeLinecap: 'round' })];
    else
      eyes = [
        h('circle', { key: 'e1', cx: 24, cy: 27, r: 4, fill: ink }),
        h('circle', { key: 'e2', cx: 40, cy: 27, r: 4, fill: ink }),
        h('circle', { key: 'e3', cx: 25.3, cy: 25.7, r: 1.4, fill: '#fff' }),
        h('circle', { key: 'e4', cx: 41.3, cy: 25.7, r: 1.4, fill: '#fff' })
      ];
    var hat = null;
    if (r.hat === 'cap') hat = h('g', { key: 'hat' }, h('path', { d: 'M16 11h32v6H16z', fill: '#3E63C8' }), h('path', { d: 'M12 17h40v3H12z', fill: '#3E63C8' }));
    else if (r.hat === 'sun')
      hat = h(
        'g',
        { key: 'hat', transform: 'translate(48,8)' },
        [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) {
          return h('ellipse', { key: a, rx: 3, ry: 6, cx: 0, cy: -10, fill: '#FFD166', transform: 'rotate(' + a + ')' });
        }),
        h('circle', { key: 'c', r: 7, fill: '#7A4B1F' })
      );
    else if (r.hat === 'crown') hat = h('path', { key: 'hat', d: 'M16 13l6 6 10-10 10 10 6-6v8H16z', fill: '#FFD166' });
    return h(
      'svg',
      { key: key, viewBox: '0 0 64 64', className: 'gd-robot', 'data-robot-svg': 'true', 'aria-hidden': 'true' },
      h('ellipse', { key: 'sh', cx: 32, cy: 58, rx: 18, ry: 4, fill: 'rgba(0,0,0,.12)' }),
      h('rect', { key: 'body', x: 10, y: 8, width: 44, height: 48, rx: 16, fill: r.colour }),
      h('rect', { key: 'face', className: 'gd-face', 'data-face': 'true', x: FACE_X, y: FACE_Y, width: FACE_W, height: FACE_H, rx: 10, fill: '#fff' }),
      eyes,
      h('rect', { key: 'mouth', x: 24, y: 46, width: 16, height: 5, rx: 2.5, fill: 'rgba(0,0,0,.18)' }),
      h('rect', { key: 'a1', x: 4, y: 26, width: 6, height: 16, rx: 3, fill: r.colour, stroke: 'rgba(0,0,0,.15)' }),
      h('rect', { key: 'a2', x: 54, y: 26, width: 6, height: 16, rx: 3, fill: r.colour, stroke: 'rgba(0,0,0,.15)' }),
      h('path', { key: 'ant', d: 'M32 8V3', stroke: ink, strokeWidth: 2 }),
      h('circle', { key: 'bulb', cx: 32, cy: 2.5, r: 2.5, fill: '#FFD166' }),
      accessorySvg(r.accessory),
      // P108 IW-002: the can a robot holds (the engine's holds: 'can') is in its hand whatever else it wears.
      r.holds === 'can' && r.accessory !== 'can' ? h('g', { key: 'held', 'data-holds': 'can' }, accessorySvg('can')) : null,
      hat
    );
  }

  /**
   * P106 IG-005: what a robot wears for its job, drawn on the robot (it turns with it): Pip's can on his right arm,
   * Cobble's hod (a wooden trough on a pole, a stone in it) on his left, Pocket's satchel (a strap across, the bag at
   * the hip), Echo's bell on his left arm. '' draws nothing.
   */
  function accessorySvg(kind) {
    var a = { key: 'acc', className: 'gd-acc gd-acc-' + kind, 'data-accessory': kind };
    if (kind === 'can') return h('g', a, h('path', { d: 'M52 44l6 2v6l-6 2z', fill: '#4FA7DC' }), h('path', { d: 'M58 46l4-3', stroke: '#4FA7DC', strokeWidth: 2, strokeLinecap: 'round' }));
    if (kind === 'hod')
      return h('g', a, h('path', { d: 'M6 34v20', stroke: '#7A4B1F', strokeWidth: 3, strokeLinecap: 'round' }), h('path', { d: 'M0 24h14l-3 10H3z', fill: '#A9773F', stroke: '#7A4B1F', strokeWidth: 1.5 }), h('circle', { cx: 7, cy: 23, r: 3.5, fill: '#9C9AA6' }));
    if (kind === 'satchel')
      return h('g', a, h('path', { d: 'M16 10L50 46', stroke: '#8B5A2B', strokeWidth: 3.5, strokeLinecap: 'round' }), h('rect', { x: 44, y: 40, width: 17, height: 14, rx: 3, fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 1.5 }), h('path', { d: 'M44 45h17', stroke: '#8B5A2B', strokeWidth: 1.5 }));
    if (kind === 'bell')
      return h('g', a, h('path', { d: 'M1 50q6-14 12 0z', fill: '#FFD166', stroke: '#C98A00', strokeWidth: 1.5 }), h('circle', { cx: 7, cy: 51.5, r: 1.8, fill: '#C98A00' }), h('path', { d: 'M7 37v3', stroke: '#C98A00', strokeWidth: 1.5 }));
    return null;
  }

  /** The tile and thing sprites, the mockup’s symbols inline. */
  var SPRITES = {
    tulip: { box: '0 0 48 64', shapes: [
      ['path', { d: 'M24 62V30', stroke: '#3FA66B', strokeWidth: 4, strokeLinecap: 'round' }],
      ['path', { d: 'M24 48c-6-2-10-8-12-14 6 0 11 4 12 8-1-4 6-8 12-8-2 6-6 12-12 14z', fill: '#3FA66B' }],
      ['path', { d: 'M10 12c0 14 6 22 14 24 8-2 14-10 14-24-4 4-8 6-14 2-6 4-10 2-14-2z', fill: '#FF6B9A' }],
      ['path', { d: 'M24 14v22', stroke: '#E04E7E', strokeWidth: 2 }]
    ] },
    // IG-006: Mamie's note says "the red ones, not the yellow" — the second colour a row can be (the 3D kit's yellow).
    tulipYellow: { box: '0 0 48 64', shapes: [
      ['path', { d: 'M24 62V30', stroke: '#3FA66B', strokeWidth: 4, strokeLinecap: 'round' }],
      ['path', { d: 'M24 48c-6-2-10-8-12-14 6 0 11 4 12 8-1-4 6-8 12-8-2 6-6 12-12 14z', fill: '#3FA66B' }],
      ['path', { d: 'M10 12c0 14 6 22 14 24 8-2 14-10 14-24-4 4-8 6-14 2-6 4-10 2-14-2z', fill: '#FFD166' }],
      ['path', { d: 'M24 14v22', stroke: '#C98A00', strokeWidth: 2 }]
    ] },
    tree: { box: '0 0 64 64', shapes: [
      ['rect', { x: 28, y: 40, width: 8, height: 18, rx: 3, fill: '#A9773F' }],
      ['circle', { cx: 32, cy: 26, r: 16, fill: '#3E9B62' }],
      ['circle', { cx: 20, cy: 34, r: 11, fill: '#48AF70' }],
      ['circle', { cx: 44, cy: 34, r: 11, fill: '#48AF70' }],
      ['circle', { cx: 26, cy: 20, r: 3, fill: '#FFD166' }],
      ['circle', { cx: 40, cy: 30, r: 3, fill: '#FFD166' }]
    ] },
    rock: { box: '0 0 64 64', shapes: [
      ['path', { d: 'M12 48l6-18 14-8 16 6 6 16-8 6H20z', fill: '#9C9AA6' }],
      ['path', { d: 'M20 40l6-10 12-2 8 8-4 8H24z', fill: '#B7B5C2' }]
    ] },
    house: { box: '0 0 64 64', shapes: [
      ['path', { d: 'M8 30L32 8l24 22v28H8z', fill: '#FFE3B3' }],
      ['path', { d: 'M4 32L32 6l28 26-4 4L32 14 8 36z', fill: '#E86A5E' }],
      ['rect', { x: 26, y: 38, width: 12, height: 18, rx: 2, fill: '#8B5A2B' }],
      ['rect', { x: 12, y: 36, width: 9, height: 9, rx: 2, fill: '#7CC6F0' }],
      ['rect', { x: 43, y: 36, width: 9, height: 9, rx: 2, fill: '#7CC6F0' }]
    ] },
    letter: { box: '0 0 64 64', shapes: [
      ['rect', { x: 8, y: 18, width: 48, height: 32, rx: 4, fill: '#FFF7E8', stroke: '#C79A63', strokeWidth: 2 }],
      ['path', { d: 'M8 20l24 18 24-18', fill: 'none', stroke: '#E86A5E', strokeWidth: 3, strokeLinejoin: 'round' }]
    ] },
    bowl: { box: '0 0 64 64', shapes: [
      ['path', { d: 'M8 30h48c0 14-10 22-24 22S8 44 8 30z', fill: '#7CC6F0' }],
      ['ellipse', { cx: 32, cy: 30, rx: 24, ry: 6, fill: '#4FA7DC' }]
    ] },
    bowlFull: { box: '0 0 64 64', shapes: [
      ['path', { d: 'M8 30h48c0 14-10 22-24 22S8 44 8 30z', fill: '#7CC6F0' }],
      ['ellipse', { cx: 32, cy: 30, rx: 24, ry: 6, fill: '#4FA7DC' }],
      ['ellipse', { cx: 32, cy: 27, rx: 16, ry: 5, fill: '#C79A63' }],
      ['circle', { cx: 26, cy: 25, r: 2.5, fill: '#A9773F' }],
      ['circle', { cx: 36, cy: 26, r: 2.5, fill: '#A9773F' }]
    ] },
    // IG-001 D9 (P106 s1): the things the pages drew as emoji in a white pill — a stone a robot lays, the post box
    // (a tile of its own, on path), the Predict flag, an egg, the cat's food — each a sprite in the mockup's palette.
    stone: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 52, rx: 17, ry: 3.5, fill: 'rgba(0,0,0,.12)' }],
      ['path', { d: 'M15 46l5-14 12-7 15 4 6 11-6 8H21z', fill: '#8E8B9A' }],
      ['path', { d: 'M23 40l4-9 10-3 8 5-2 9H27z', fill: '#B3B0BE' }]
    ] },
    postbox: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 58, rx: 16, ry: 3, fill: 'rgba(0,0,0,.12)' }],
      ['rect', { x: 20, y: 14, width: 24, height: 42, rx: 6, fill: '#E04E4E' }],
      ['rect', { x: 17, y: 9, width: 30, height: 9, rx: 4.5, fill: '#B93A3A' }],
      ['rect', { x: 25, y: 25, width: 14, height: 3.5, rx: 1.75, fill: '#2E2A3D' }],
      ['rect', { x: 26, y: 34, width: 12, height: 9, rx: 1.5, fill: '#FFF7E8' }],
      ['rect', { x: 16, y: 54, width: 32, height: 4, rx: 2, fill: '#B93A3A' }]
    ] },
    flag: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 22, cy: 58, rx: 8, ry: 2.5, fill: 'rgba(0,0,0,.12)' }],
      ['path', { d: 'M20 57V7', stroke: '#2E2A3D', strokeWidth: 3.5, strokeLinecap: 'round' }],
      ['path', { d: 'M22 9h28l-8 9 8 9H22z', fill: '#FFD166' }],
      ['path', { d: 'M22 18h20l-4 4.5 4 4.5H22z', fill: '#E86A5E' }]
    ] },
    egg: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 55, rx: 13, ry: 3, fill: 'rgba(0,0,0,.12)' }],
      ['path', { d: 'M32 12c9 0 15 12 15 24a15 15 0 01-30 0c0-12 6-24 15-24z', fill: '#FFF7E8', stroke: '#C79A63', strokeWidth: 2 }],
      ['ellipse', { cx: 27, cy: 30, rx: 2.5, ry: 5, fill: '#fff' }]
    ] },
    food: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 50, rx: 18, ry: 3, fill: 'rgba(0,0,0,.12)' }],
      ['path', { d: 'M17 40a5 5 0 01-3-9 5 5 0 013-9c2 0 4 1 5 3h20c1-2 3-3 5-3a5 5 0 013 9 5 5 0 01-3 9c-2 0-4-1-5-3H22c-1 2-3 3-5 3z', fill: '#FFF0DA', stroke: '#C79A63', strokeWidth: 2, strokeLinejoin: 'round' }]
    ] },
    // IG-002 (P106 s2, the s2 brief §4's vocabulary): a mineable rock at three sizes by what is left (≥ 3 big, 2 medium,
    // 1 small), a sign on a post and a paper note on the ground (their text is never drawn on the tile), and the parcel
    // a robot carries when its load has no sprite of its own.
    rockBig: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 55, rx: 25, ry: 4, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M6 53l5-21 14-15 18 2 13 15 2 19z', fill: '#8E8B9A' }],
      ['path', { d: 'M14 45l5-15 11-8 13 3 7 10-3 10z', fill: '#B3B0BE' }],
      ['path', { d: 'M23 26l8-5 8 2', stroke: '#fff', strokeWidth: 2.5, strokeLinecap: 'round', fill: 'none', opacity: 0.6 }]
    ] },
    rockMid: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 55, rx: 19, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M13 53l4-15 11-10 13 2 9 11 2 12z', fill: '#8E8B9A' }],
      ['path', { d: 'M20 47l4-10 8-6 10 2 5 8-2 6z', fill: '#B3B0BE' }]
    ] },
    rockSmall: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 55, rx: 13, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M20 54l3-10 8-6 9 2 5 8 1 6z', fill: '#8E8B9A' }],
      ['path', { d: 'M25 50l3-6 6-3 6 2 2 5z', fill: '#B3B0BE' }]
    ] },
    sign: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 58, rx: 12, ry: 3, fill: 'rgba(0,0,0,.12)' }],
      ['rect', { x: 29, y: 26, width: 6, height: 32, rx: 2, fill: '#A9773F' }],
      ['rect', { x: 9, y: 10, width: 46, height: 24, rx: 4, fill: '#E8C48A', stroke: '#8B5A2B', strokeWidth: 3 }],
      ['path', { d: 'M17 19h30M17 26h20', stroke: '#7A4B1F', strokeWidth: 2.5, strokeLinecap: 'round' }]
    ] },
    note: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 51, rx: 19, ry: 3, fill: 'rgba(0,0,0,.10)' }],
      ['path', { d: 'M14 23l31-7 5 27-31 7z', fill: '#FFFDF6', stroke: '#C79A63', strokeWidth: 2, strokeLinejoin: 'round' }],
      ['path', { d: 'M21 29l19-4.2M22.2 35.4l19-4.2M23.4 41.8l12-2.6', stroke: '#6E6784', strokeWidth: 2, strokeLinecap: 'round' }]
    ] },
    parcel: { box: '0 0 64 64', shapes: [
      ['rect', { x: 13, y: 20, width: 38, height: 30, rx: 3, fill: '#D9A566', stroke: '#8B5A2B', strokeWidth: 2 }],
      ['path', { d: 'M32 20v30M13 33h38', stroke: '#8B5A2B', strokeWidth: 2 }]
    ] },
    // P106 IG-003 (the s3 brief §4.4): the tick on the tile a child predicted right — "You were right!".
    tick: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 56, rx: 16, ry: 3, fill: 'rgba(0,0,0,.12)' }],
      ['circle', { cx: 32, cy: 30, r: 21, fill: '#3FA66B', stroke: '#fff', strokeWidth: 3 }],
      ['path', { d: 'M21 30l8 8 15-16', fill: 'none', stroke: '#fff', strokeWidth: 6, strokeLinecap: 'round', strokeLinejoin: 'round' }]
    ] },
    // P106 IG-004 (lane E): the islanders standing by their plots (the mockup's: Mamie Rose in violet with white hair,
    // Sami in his blue cap with a satchel, Biscuit the cat), and the padlock on a locked plot.
    islMamie: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 60, rx: 13, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M20 60l4-26h16l4 26z', fill: '#8F6BFF' }],
      ['circle', { cx: 32, cy: 22, r: 10, fill: '#F7D3B5' }],
      ['path', { d: 'M21 20a11 11 0 0122 0c-3-4-7-5-11-5s-8 1-11 5z', fill: '#E9E4EF' }],
      ['circle', { cx: 32, cy: 9, r: 5, fill: '#E9E4EF' }],
      ['circle', { cx: 28.5, cy: 23, r: 1.6, fill: '#2E2A3D' }],
      ['circle', { cx: 35.5, cy: 23, r: 1.6, fill: '#2E2A3D' }]
    ] },
    islSami: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 60, rx: 13, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M20 60l4-26h16l4 26z', fill: '#3E63C8' }],
      ['rect', { x: 38, y: 38, width: 9, height: 12, rx: 2, fill: '#C98A5E' }],
      ['circle', { cx: 32, cy: 22, r: 10, fill: '#F7D3B5' }],
      ['rect', { x: 21, y: 10, width: 22, height: 7, rx: 2, fill: '#3E63C8' }],
      ['rect', { x: 18, y: 15, width: 28, height: 3, rx: 1.5, fill: '#2F4FA8' }],
      ['circle', { cx: 28.5, cy: 23, r: 1.6, fill: '#2E2A3D' }],
      ['circle', { cx: 35.5, cy: 23, r: 1.6, fill: '#2E2A3D' }]
    ] },
    islBiscuit: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 30, cy: 58, rx: 20, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M10 44q-6-8 0-16', stroke: '#F3B76A', strokeWidth: 4, fill: 'none', strokeLinecap: 'round' }],
      ['rect', { x: 12, y: 38, width: 30, height: 18, rx: 7, fill: '#F3B76A' }],
      ['rect', { x: 34, y: 26, width: 20, height: 18, rx: 6, fill: '#F3B76A' }],
      ['path', { d: 'M36 28l2-8 5 6zM52 28l-2-8-5 6z', fill: '#F3B76A' }],
      ['circle', { cx: 40.5, cy: 34, r: 1.6, fill: '#2E2A3D' }],
      ['circle', { cx: 47.5, cy: 34, r: 1.6, fill: '#2E2A3D' }],
      ['path', { d: 'M42.5 38h3l-1.5 2z', fill: '#E06B8A' }]
    ] },
    padlock: { box: '0 0 64 64', shapes: [
      ['path', { d: 'M20 30V21a12 12 0 0124 0v9', fill: 'none', stroke: '#8E8CA0', strokeWidth: 6 }],
      ['rect', { x: 12, y: 28, width: 40, height: 30, rx: 6, fill: '#FFD166', stroke: '#C98A00', strokeWidth: 2 }],
      ['circle', { cx: 32, cy: 40, r: 4, fill: '#2E2A3D' }],
      ['rect', { x: 30, y: 42, width: 4, height: 8, rx: 1, fill: '#2E2A3D' }]
    ] },
    // P108 IW-002 AC6 (lane D): the job model's things, in the mockup's palette (island-jobs.html): the wall tile (L) a
    // dry-stone wall, the hen, the wicker basket (eggs peeking once it holds one), the store crate (stones on top). The
    // watering can on the map is drawn per thing (canThingEl: its water at level/max).
    wall: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 58, rx: 31, ry: 4, fill: 'rgba(0,0,0,.14)' }],
      ['rect', { x: 1, y: 19, width: 62, height: 38, rx: 5, fill: '#8E8B9A' }],
      ['path', { d: 'M4 23h26v10H4zM33 23h27v10H33zM4 36h13v9H4zM20 36h24v9H20zM47 36h13v9H47zM4 48h26v7H4zM33 48h27v7H33z', fill: '#B3B0BE' }],
      ['rect', { x: 0, y: 13, width: 64, height: 9, rx: 4.5, fill: '#C9C6D2' }]
    ] },
    hen: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 31, cy: 57, rx: 17, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M27 51v6M34 51v6', stroke: '#FFB347', strokeWidth: 2.5, strokeLinecap: 'round' }],
      ['path', { d: 'M17 44l-7-16 12 7z', fill: '#EDE7DC', stroke: '#D9D2C4', strokeWidth: 1.5, strokeLinejoin: 'round' }],
      ['ellipse', { cx: 30, cy: 40, rx: 16, ry: 12.5, fill: '#FFFFFF', stroke: '#D9D2C4', strokeWidth: 1.5 }],
      ['path', { d: 'M22 39q8 7 15-1', stroke: '#E1D9CB', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }],
      ['circle', { cx: 44, cy: 25, r: 8, fill: '#FFFFFF', stroke: '#D9D2C4', strokeWidth: 1.5 }],
      ['path', { d: 'M39 18q1-6 4-2 2-5 4 0 4-3 3 3z', fill: '#E0463A' }],
      ['path', { d: 'M51 23l7 2.5-7 3z', fill: '#FFB347' }],
      ['path', { d: 'M49 29q3 4-1 6', stroke: '#E0463A', strokeWidth: 2.5, fill: 'none', strokeLinecap: 'round' }],
      ['circle', { cx: 46, cy: 23.5, r: 1.7, fill: '#2E2A3D' }]
    ] },
    basket: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 56, rx: 22, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M13 31a19 19 0 0138 0', fill: 'none', stroke: '#8B5A2B', strokeWidth: 3.5, strokeLinecap: 'round' }],
      ['path', { d: 'M7 31h50l-7 23H14z', fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 2, strokeLinejoin: 'round' }],
      ['path', { d: 'M9 38h46M11.5 46h41M20 31l3 23M32 31v23M44 31l-3 23', stroke: '#A9773F', strokeWidth: 1.6 }]
    ] },
    basketEggs: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 56, rx: 22, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M13 31a19 19 0 0138 0', fill: 'none', stroke: '#8B5A2B', strokeWidth: 3.5, strokeLinecap: 'round' }],
      ['ellipse', { cx: 23, cy: 29, rx: 6.5, ry: 8, fill: '#FFF7E8', stroke: '#C79A63', strokeWidth: 1.5 }],
      ['ellipse', { cx: 41, cy: 29, rx: 6.5, ry: 8, fill: '#FFF7E8', stroke: '#C79A63', strokeWidth: 1.5 }],
      ['ellipse', { cx: 32, cy: 26, rx: 6.5, ry: 8, fill: '#FFFDF6', stroke: '#C79A63', strokeWidth: 1.5 }],
      ['path', { d: 'M7 31h50l-7 23H14z', fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 2, strokeLinejoin: 'round' }],
      ['path', { d: 'M9 38h46M11.5 46h41M20 31l3 23M32 31v23M44 31l-3 23', stroke: '#A9773F', strokeWidth: 1.6 }]
    ] },
    store: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 57, rx: 25, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['rect', { x: 8, y: 25, width: 48, height: 31, rx: 3, fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 2 }],
      ['path', { d: 'M8 35.5h48M8 45.5h48M18 25v31M46 25v31', stroke: '#8B5A2B', strokeWidth: 1.8 }]
    ] },
    storeFull: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 57, rx: 25, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M12 27l4-9 10-4 8 4 2 9z', fill: '#8E8B9A' }],
      ['path', { d: 'M29 27l5-10 11-3 8 6 1 7z', fill: '#B3B0BE' }],
      ['rect', { x: 8, y: 25, width: 48, height: 31, rx: 3, fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 2 }],
      ['path', { d: 'M8 35.5h48M8 45.5h48M18 25v31M46 25v31', stroke: '#8B5A2B', strokeWidth: 1.8 }]
    ] },
    // P108 IW-003 (lane P): a front door with a letterbox — its owner's name is a plate under it (the page's words);
    // with a letter through it (count > 0), the letter's corner shows in the slot.
    door: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 60, rx: 20, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['rect', { x: 9, y: 55, width: 46, height: 6, rx: 2, fill: '#C8B79A' }],
      ['rect', { x: 13, y: 4, width: 38, height: 53, rx: 6, fill: '#6E4A26' }],
      ['rect', { x: 17, y: 8, width: 30, height: 47, rx: 4, fill: '#A9773F' }],
      ['rect', { x: 21, y: 34, width: 22, height: 16, rx: 2, fill: 'none', stroke: '#8B5A2B', strokeWidth: 2 }],
      ['rect', { x: 22, y: 22, width: 20, height: 5, rx: 2.5, fill: '#2E2A3D' }],
      ['circle', { cx: 41, cy: 31, r: 2.6, fill: '#FFD166' }]
    ] },
    doorMail: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 60, rx: 20, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['rect', { x: 9, y: 55, width: 46, height: 6, rx: 2, fill: '#C8B79A' }],
      ['rect', { x: 13, y: 4, width: 38, height: 53, rx: 6, fill: '#6E4A26' }],
      ['rect', { x: 17, y: 8, width: 30, height: 47, rx: 4, fill: '#A9773F' }],
      ['rect', { x: 21, y: 34, width: 22, height: 16, rx: 2, fill: 'none', stroke: '#8B5A2B', strokeWidth: 2 }],
      ['rect', { x: 22, y: 22, width: 20, height: 5, rx: 2.5, fill: '#2E2A3D' }],
      ['rect', { x: 24, y: 13, width: 16, height: 11, rx: 1.5, fill: '#FFF7E8', stroke: '#E86A5E', strokeWidth: 1.6 }],
      ['path', { d: 'M24.5 14l7.5 5 7.5-5', fill: 'none', stroke: '#E86A5E', strokeWidth: 1.4, strokeLinejoin: 'round' }],
      ['circle', { cx: 41, cy: 31, r: 2.6, fill: '#FFD166' }]
    ] },
    // P108 IW-003 (lane B): Biscuit's ball (red with a white seam), his basket with the ball in it, and a store of food
    // (the food sack, the treat jar): the crate with biscuits on top instead of stones.
    ball: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 56, rx: 14, ry: 3, fill: 'rgba(0,0,0,.14)' }],
      ['circle', { cx: 32, cy: 40, r: 14, fill: '#E04E4E' }],
      ['path', { d: 'M19 36q13 9 26 0', fill: 'none', stroke: '#FFF7E8', strokeWidth: 3, strokeLinecap: 'round' }],
      ['circle', { cx: 27, cy: 34, r: 3, fill: '#fff', opacity: 0.55 }]
    ] },
    basketBall: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 56, rx: 22, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M13 31a19 19 0 0138 0', fill: 'none', stroke: '#8B5A2B', strokeWidth: 3.5, strokeLinecap: 'round' }],
      ['circle', { cx: 32, cy: 27, r: 10, fill: '#E04E4E' }],
      ['path', { d: 'M23 25q9 6 18 0', fill: 'none', stroke: '#FFF7E8', strokeWidth: 2.5, strokeLinecap: 'round' }],
      ['path', { d: 'M7 31h50l-7 23H14z', fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 2, strokeLinejoin: 'round' }],
      ['path', { d: 'M9 38h46M11.5 46h41M20 31l3 23M32 31v23M44 31l-3 23', stroke: '#A9773F', strokeWidth: 1.6 }]
    ] },
    storeFood: { box: '0 0 64 64', shapes: [
      ['ellipse', { cx: 32, cy: 57, rx: 25, ry: 3.5, fill: 'rgba(0,0,0,.14)' }],
      ['path', { d: 'M13 25a4 4 0 01-2-7 4 4 0 012-7c2 0 3 1 4 2h10c1-1 2-2 4-2a4 4 0 012 7 4 4 0 01-2 7c-2 0-3-1-4-2H17c-1 1-2 2-4 2z', fill: '#FFF0DA', stroke: '#C79A63', strokeWidth: 1.8 }],
      ['path', { d: 'M33 26a4 4 0 01-2-7 4 4 0 012-7c2 0 3 1 4 2h10c1-1 2-2 4-2a4 4 0 012 7 4 4 0 01-2 7c-2 0-3-1-4-2H37c-1 1-2 2-4 2z', fill: '#FFF0DA', stroke: '#C79A63', strokeWidth: 1.8 }],
      ['rect', { x: 8, y: 25, width: 48, height: 31, rx: 3, fill: '#C98A4B', stroke: '#8B5A2B', strokeWidth: 2 }],
      ['path', { d: 'M8 35.5h48M8 45.5h48M18 25v31M46 25v31', stroke: '#8B5A2B', strokeWidth: 1.8 }]
    ] }
  };
  /** P108 IW-002: the watering can lying on the map, its water drawn at level/max inside it (none at 0). */
  function canThingEl(t, key) {
    var m = meterOf(t);
    var share = m && m.need > 0 ? Math.max(0, Math.min(1, m.have / m.need)) : 0;
    var water = share > 0 ? h('rect', { key: 'w', x: 17, y: 30 + 21 * (1 - share), width: 26, height: 21 * share, rx: 2, fill: '#BFE7FF' }) : null;
    return h(
      'svg',
      { key: key, viewBox: '0 0 64 64', className: 'gd-sprite gd-thing gd-canthing', 'data-sprite': 'wateringCan', 'data-level': m ? m.text : '', 'aria-hidden': 'true' },
      h('ellipse', { key: 'sh', cx: 30, cy: 56, rx: 19, ry: 3, fill: 'rgba(0,0,0,.14)' }),
      h('path', { key: 'sp', d: 'M44 36l14-13', stroke: '#2B7FC0', strokeWidth: 5, strokeLinecap: 'round' }),
      h('path', { key: 'ha', d: 'M20 27a10 9 0 0120 0', fill: 'none', stroke: '#2B7FC0', strokeWidth: 3.5 }),
      h('rect', { key: 'b', x: 13, y: 26, width: 34, height: 29, rx: 5, fill: '#4FA7DC' }),
      h('rect', { key: 'in', x: 17, y: 30, width: 26, height: 21, rx: 2, fill: '#2B7FC0', opacity: 0.35 }),
      water
    );
  }
  /** P108 IW-003 (lane B): a meter's share in tenths (0–10), for the compact bar a wide world (the island) draws. */
  function fillOf(m) {
    return String(m && m.need > 0 ? Math.max(0, Math.min(10, Math.round((10 * m.have) / m.need))) : 0);
  }
  /** P108 IW-002: a meter chip (the mockup's): its icon, a pip per unit up to METER_PIPS_MAX, and the numbers. */
  function meterEl(m, key, watched, top) {
    var pips = [];
    for (var i = 0; i < m.pips; i++) pips.push(h('i', { key: i, className: 'gd-pip' + (i < m.have ? ' gd-on' : '') }));
    return h(
      'span',
      { key: key, className: 'gd-meter gd-m-' + m.icon + (m.full ? ' gd-full' : '') + (watched ? ' gd-watch' : '') + (top ? ' gd-meter-top' : ''), 'data-meter': m.text, 'data-kind': m.kind, 'data-full': m.full ? 'true' : undefined, 'data-watch': watched ? 'true' : undefined, 'data-fill': fillOf(m) },
      h('i', { key: 'ic', className: 'gd-mi gd-mi-' + m.icon }),
      m.pips ? h('span', { key: 'p', className: 'gd-pips' }, pips) : null,
      h('span', { key: 't', className: 'gd-mt' }, m.text)
    );
  }
  /** IG-004: the islander a thing's `who` names, as its sprite. */
  var ISLANDER_SPRITES = { mamie: 'islMamie', sami: 'islSami', biscuit: 'islBiscuit' };
  /** The thing kinds drawn as a sprite of the same name (a tulip, a puddle, a bowl and a rock have rules of their own). */
  var THING_SPRITES = { letter: 1, stone: 1, postbox: 1, flag: 1, egg: 1, food: 1, sign: 1, note: 1, tick: 1 };

  /** IG-002: a rock's size by the stones left in it — ≥ 3 big, 2 medium, 1 small; 0 (used up) draws nothing. A rock that names no count is a whole one. */
  function rockSize(left) {
    var n = Number(left);
    if (left === undefined || left === null || left === '' || !isFinite(n)) n = 4;
    return n >= 3 ? 'big' : n >= 2 ? 'mid' : n >= 1 ? 'small' : '';
  }
  var ROCK_SPRITE = { big: 'rockBig', mid: 'rockMid', small: 'rockSmall' };
  /** IG-002: the loads that are drawn as themselves on a robot's back; anything else carried is the generic parcel. */
  var LOAD_SPRITES = { stone: 1, letter: 1, egg: 1, food: 1, ball: 1 };
  /** The load on a robot's back: the LAST thing it carries (what the next put lays down), or null when it carries nothing. */
  function loadOf(carry) {
    if (!Array.isArray(carry) || !carry.length) return null;
    var k = String(carry[carry.length - 1]);
    return LOAD_SPRITES[k] ? k : 'parcel';
  }

  // ── P108 IW-002 AC6 (lane D): the job model, drawn ─────────────────────────────────────────────────────────────
  // COPIES of the ONE table in packages/noodl-mcp/tests/cg002Content.ts (JOB_VOCABULARY, SITE_STAGES, WALL_TILE): the
  // engine writes these names, both world kits draw them, and ig007Garden3d pins every copy (garden-kit's and
  // garden-3d-kit's) to the table, and the helpers below to each other. A thing with none of the job fields (every thing
  // of the 13 requests) is drawn exactly as before; so is a world with Watch empty and Picking off.
  var WALL_TILE = 'L';
  var SITE_STAGES = ['dirt', 'gravel', 'cobbles', 'path'];
  var JOB_VOCABULARY = [
    { kind: 'tulip', role: 'target', fields: ['have', 'need', 'watered', 'droop'], blocks: true, wear: 'tulip' },
    { kind: 'site', role: 'target', fields: ['have', 'need', 'item', 'stage', 'walked', 'build'], item: 'stone', blocks: false, wear: 'site' },
    { kind: 'basket', role: 'container', fields: ['count', 'capacity', 'item'], item: 'egg', blocks: true, wear: 'basket' },
    { kind: 'bowl', role: 'container', fields: ['count', 'capacity', 'item', 'food'], item: 'food', blocks: true, wear: 'bowl' },
    { kind: 'store', role: 'container', fields: ['count', 'capacity', 'item'], item: 'stone', blocks: true, wear: 'store' },
    { kind: 'can', role: 'carrier', fields: ['level', 'max'], blocks: true },
    { kind: 'rock', role: 'source', fields: ['left', 'max'], blocks: true, wear: 'rock' },
    { kind: 'hen', role: 'source', fields: ['pen', 'capacity'], blocks: true, wear: 'hen' },
    { kind: 'postbox', role: 'source', fields: [], blocks: true, wear: 'postbox' },
    { kind: 'door', role: 'container', fields: ['count', 'capacity', 'item', 'owner'], item: 'letter', blocks: true, wear: 'door' }
  ];
  /** The most pips a meter draws (the mockup's); a bigger need shows its numbers only. */
  var METER_PIPS_MAX = 8;
  /** The items a meter has an icon for (the mockup's 💧 🪨 🥚, drawn in CSS); anything else wears a plain dot. */
  var METER_ICONS = { water: 1, stone: 1, egg: 1, food: 1, letter: 1, ball: 1 };

  function jobRow(kind) {
    for (var i = 0; i < JOB_VOCABULARY.length; i++) if (JOB_VOCABULARY[i].kind === kind) return JOB_VOCABULARY[i];
    return null;
  }
  /** A whole number ≥ 0, or null when the field is absent or junk (absent is not 0: a thing with no meter keeps its old look). */
  function wholeOf(v) {
    if (v === undefined || v === null || v === '' || typeof v === 'boolean') return null;
    var n = Number(v);
    return isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }
  /**
   * A thing's meter as both kits draw it (the mockup's chip over the thing), or null when it carries none:
   *   tulip with `need` or `have`: drinks have/need (a tulip with neither is the 13 requests' one-pour tulip: no meter);
   *   site: stones have/need; basket · bowl · store with a `capacity`: count/capacity, the icon its `item` (else the
   *   table's); can with `level` or `max`: level/max; rock with `max`: left/max.
   * `full` (drawn green) is a target's or a container's; a carrier and a source are never "done".
   */
  function meterOf(t) {
    if (!t || typeof t !== 'object') return null;
    var row = jobRow(t.kind);
    if (!row) return null;
    var have = 0;
    var need = 0;
    var icon = 'dot';
    if (t.kind === 'tulip') {
      if (wholeOf(t.need) === null && wholeOf(t.have) === null) return null;
      need = wholeOf(t.need) || 1;
      have = wholeOf(t.have);
      if (have === null) have = t.watered === true ? need : 0;
      icon = 'water';
    } else if (t.kind === 'site') {
      need = wholeOf(t.need) || 1;
      have = wholeOf(t.have) || 0;
      icon = String(t.item || row.item);
    } else if (row.role === 'container') {
      // Only a job's container has a capacity: a bowl the engine fed carries `count` beside `food` but no capacity
      // (the bowl requests' bowls, never full) — it keeps its old look, no meter.
      if (!wholeOf(t.capacity)) return null;
      need = wholeOf(t.capacity);
      // P108 IW-003 (lane B): the engine's rule — a bowl's count, else its food (a seeded bowl names only its food).
      have = wholeOf(t.count) !== null ? wholeOf(t.count) : wholeOf(t.food) || 0;
      icon = String(t.item || row.item);
    } else if (t.kind === 'can') {
      if (wholeOf(t.level) === null && wholeOf(t.max) === null) return null;
      need = wholeOf(t.max) || 0;
      have = wholeOf(t.level) || 0;
      icon = 'water';
    } else if (t.kind === 'rock') {
      if (!wholeOf(t.max)) return null;
      need = wholeOf(t.max);
      have = wholeOf(t.left) || 0;
      icon = 'stone';
    } else return null;
    if (need > 0 && have > need) have = need;
    return {
      kind: t.kind,
      icon: METER_ICONS[icon] ? icon : 'dot',
      have: have,
      need: need,
      pips: need > 0 && need <= METER_PIPS_MAX ? need : 0,
      text: need > 0 ? have + '/' + need : String(have),
      full: (row.role === 'target' || row.role === 'container') && need > 0 && have >= need
    };
  }
  /** A path site's look: its `stage` when the engine wrote one, else the engine's own rule by have/need (0 · under half · under full · full). */
  function siteStage(t) {
    if (t && SITE_STAGES.indexOf(t.stage) !== -1) return t.stage;
    var need = (t && wholeOf(t.need)) || 1;
    var have = (t && wholeOf(t.have)) || 0;
    return SITE_STAGES[have <= 0 ? 0 : have * 2 < need ? 1 : have < need ? 2 : 3];
  }
  /** A hen's pen `[x0, y0, x1, y1]` (corners, inclusive) as { x, y, w, h } in tiles, or null. */
  function penOf(t) {
    if (!t || t.kind !== 'hen' || !Array.isArray(t.pen) || t.pen.length !== 4) return null;
    var p = t.pen.map(Number);
    for (var i = 0; i < 4; i++) if (!isFinite(p[i])) return null;
    var x0 = Math.floor(Math.min(p[0], p[2]));
    var y0 = Math.floor(Math.min(p[1], p[3]));
    return { x: x0, y: y0, w: Math.floor(Math.max(p[0], p[2])) - x0 + 1, h: Math.floor(Math.max(p[1], p[3])) - y0 + 1 };
  }
  /** The Watch port as chip refs { id?, kind, x, y } (a list, one ref, or its JSON; anything without a kind is dropped). */
  function watchRefs(v) {
    var list = readJson(v, []);
    if (list && !Array.isArray(list) && typeof list === 'object') list = [list];
    if (!Array.isArray(list)) return [];
    return list.filter(function (r) {
      return r && typeof r === 'object' && typeof r.kind === 'string' && r.kind !== '';
    });
  }
  /**
   * What each watched chip rings (brief §4.4, resolved the way the engine resolves a chip): the thing with its `id`, else
   * the first thing of its kind on its tile, else — a `can` — the robot that holds the can (or, when no robot says
   * `holds`, the first with a can level), else the tile itself (an "ahead" chip). Indexes into things and robots, and
   * "x,y" tiles, each once.
   */
  function resolveWatch(v, things, robots) {
    var out = { things: [], robots: [], tiles: [] };
    var add = function (list, k) {
      if (list.indexOf(k) === -1) list.push(k);
    };
    watchRefs(v).forEach(function (ref) {
      var i;
      if (ref.id !== undefined && ref.id !== null && ref.id !== '')
        for (i = 0; i < things.length; i++)
          if (things[i].id !== undefined && things[i].id !== null && String(things[i].id) === String(ref.id)) return add(out.things, i);
      for (i = 0; i < things.length; i++) if (things[i].kind === ref.kind && Number(things[i].x) === Number(ref.x) && Number(things[i].y) === Number(ref.y)) return add(out.things, i);
      if (ref.kind === 'can') {
        for (i = 0; i < robots.length; i++) if (robots[i].holds === 'can') return add(out.robots, i);
        for (i = 0; i < robots.length; i++) if (robots[i].can !== null && robots[i].can !== undefined) return add(out.robots, i);
      }
      var x = wholeOf(ref.x);
      var y = wholeOf(ref.y);
      if (x !== null && y !== null) add(out.tiles, x + ',' + y);
    });
    return out;
  }
  var JOB_LOOK = { JOB_VOCABULARY: JOB_VOCABULARY, SITE_STAGES: SITE_STAGES, WALL_TILE: WALL_TILE, METER_PIPS_MAX: METER_PIPS_MAX, meterOf: meterOf, siteStage: siteStage, penOf: penOf, watchRefs: watchRefs, resolveWatch: resolveWatch };

  function spriteEl(name, key, extraClass, extraProps) {
    var s = SPRITES[name];
    if (!s) return null;
    var props = { key: key, viewBox: s.box, className: 'gd-sprite' + (extraClass ? ' ' + extraClass : ''), 'data-sprite': name, 'aria-hidden': 'true' };
    if (extraProps) for (var ek in extraProps) props[ek] = extraProps[ek];
    return h(
      'svg',
      props,
      s.shapes.map(function (sh, i) {
        var p = {};
        for (var k in sh[1]) p[k] = sh[1][k];
        p.key = i;
        return h(sh[0], p);
      })
    );
  }

  /** The world’s stylesheet: the mockup’s .world / .cell / .bot / .bubble rules, prefixed gd-. */
  var WORLD_CSS =
    '.gd-world{position:relative;width:100%;max-width:640px;margin:0 auto;border-radius:16px;overflow:hidden;background:#BFE8CC;display:grid;gap:0;border:4px solid #A8D9B4;box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-family:inherit}\n' +
    '.gd-cell{position:relative;min-height:0;overflow:visible;padding:0;border:0;background:none;cursor:pointer;touch-action:manipulation}\n' +
    '.gd-grass{background:linear-gradient(0deg,#BDE6C9,#C8EBD2)}.gd-grass:nth-child(odd){background:linear-gradient(0deg,#B6E2C3,#C3E8CE)}\n' +
    '.gd-path{background:#F1DFB5}.gd-postbox{background:#F1DFB5}.gd-water{background:radial-gradient(circle at 40% 40%,#9AD6F5,#6ABBE6);border-radius:10px}.gd-bed{background:#C79A63;border-radius:8px}\n' +
    '.gd-cell>.gd-sprite{position:absolute;inset:11%;width:78%;height:78%}\n' +
    '.gd-bed>.gd-tulip{transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .4s}\n' +
    '.gd-tulip.gd-dry{opacity:.55;transform:rotate(18deg) translateY(6%)}\n' +
    '.gd-puddle{position:absolute;inset:auto 12% 10% 12%;height:30%;border-radius:50%;background:rgba(124,198,240,.7);animation:gd-pop .3s ease-out}\n' +
    '@keyframes gd-pop{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}\n' +
    '.gd-label{position:absolute;left:50%;bottom:4%;transform:translateX(-50%);background:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15);z-index:2;pointer-events:none}\n' +
    '.gd-bot{position:absolute;z-index:3;display:grid;place-items:center;pointer-events:none;transform:translate(-50%,-50%);transition:left var(--gd-step) ease,top var(--gd-step) ease}\n' +
    '.gd-turn{width:100%;height:100%;display:grid;place-items:center;transition:transform .3s ease;transform:var(--gd-rot)}\n' +
    '.gd-turn>svg{width:' + ROBOT_SVG_PCT + '%;height:' + ROBOT_SVG_PCT + '%;overflow:visible}\n' +
    '.gd-bump{animation:gd-bump .35s}\n' +
    '@keyframes gd-bump{30%{transform:var(--gd-rot) translateX(-8%)}60%{transform:var(--gd-rot) translateX(6%)}}\n' +
    '.gd-cheer .gd-turn{animation:gd-cheer .7s ease 2}\n' +
    '@keyframes gd-cheer{50%{transform:var(--gd-rot) translateY(-12%)}}\n' +
    '.gd-can{position:absolute;left:-3%;top:50%;transform:translateY(-50%);display:flex;flex-direction:column-reverse;gap:1px;padding:3px 2px;background:#fff;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.22);z-index:4;pointer-events:none}\n' +
    '.gd-can>svg{width:11px;height:14px;display:block}\n' +
    '.gd-load{position:absolute;right:-6%;top:50%;width:36%;height:36%;transform:translateY(-50%);box-sizing:border-box;padding:2px;background:#fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.22);z-index:4;pointer-events:none}\n' +
    '.gd-load>svg{width:100%;height:100%;display:block;overflow:visible}\n' +
    '.gd-name{position:absolute;top:92%;left:50%;transform:translateX(-50%);background:#fff;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15);z-index:4;color:#2E2A3D}\n' +
    '.gd-bubble{position:absolute;z-index:5;background:#fff;border-radius:14px;padding:8px 12px;font-weight:800;font-size:14px;box-shadow:0 6px 18px rgba(72,52,20,.10);max-width:230px;pointer-events:none;transform:translate(-30%,-115%);color:#2E2A3D}\n' +
    '.gd-bubble:after{content:"";position:absolute;left:34%;bottom:-8px;border:8px solid transparent;border-top-color:#fff;border-bottom:0}\n' +
    '.gd-bubble.gd-olive{background:#EEE8FF;color:#4A2FA6}.gd-bubble.gd-olive:after{border-top-color:#EEE8FF}\n' +
    '.gd-bubble small{display:block;font-weight:700;color:#6E6784;font-size:11px}.gd-bubble.gd-olive small{color:#6A5AA8}\n' +
    '.gd-cell>.gd-islander{inset:-45% -25% 0 -25%;width:150%;height:145%;z-index:2}\n' +
    '.gd-isl-say{position:absolute;left:50%;bottom:150%;transform:translateX(-30%);z-index:2;background:#fff;border-radius:12px;padding:5px 9px;font-weight:800;font-size:12px;line-height:1.25;box-shadow:0 6px 18px rgba(72,52,20,.12);width:max-content;max-width:min(170px,700%);pointer-events:none;color:#2E2A3D;text-align:left}\n' +
    '.gd-isl-say:after{content:"";position:absolute;left:30%;bottom:-6px;border:6px solid transparent;border-top-color:#fff;border-bottom:0}\n' +
    '.gd-cell>.gd-padlock{inset:auto;left:-80%;top:-80%;width:160%;height:160%;z-index:3}\n' +
    '.gd-fence{position:absolute;z-index:1;box-sizing:border-box;border:3px dashed #A9773F;border-radius:6px;background:rgba(46,42,61,.10);pointer-events:none}\n' +
    // P108 IW-002 AC6 (lane D): the job model drawn — the mockup's (island-jobs.html) meter chips over a thing (a pip per
    // unit, green when a target or a container is full), the wall tile, the path site by stage, the hen's pen, a letter in
    // the post box, a tulip part-watered or drooping (worn); Watch rings a thing and draws its meter large; Picking
    // frames the world in violet and lifts the things under the pointer.
    '.gd-wall{background:linear-gradient(0deg,#BDE6C9,#C8EBD2)}\n' +
    '.gd-cell>.gd-wallart{inset:4% 0 8% 0;width:100%;height:88%}\n' +
    '.gd-site{position:absolute;inset:3%;border-radius:6px;pointer-events:none}\n' +
    '.gd-site-dirt{background:radial-gradient(circle at 28% 34%,#86603A 0 7%,transparent 8%),radial-gradient(circle at 70% 66%,#86603A 0 6%,transparent 7%),#9E7248}\n' +
    '.gd-site-gravel{background:radial-gradient(circle,#8E8B9A 0 22%,transparent 26%) 0 0/34% 34%,#B8AE9C}\n' +
    '.gd-site-cobbles{background:radial-gradient(ellipse,#C9C6D2 0 52%,#8E8B9A 56% 64%,transparent 66%) 0 0/50% 50%,#A3A0AB}\n' +
    '.gd-site-path{background:#F1DFB5;box-shadow:inset 0 4px 0 #E4CD97,inset 0 -4px 0 #E4CD97}\n' +
    '.gd-cell.gd-in-pen{background:#F2DE9E}.gd-cell.gd-in-pen:nth-child(odd){background:#EBD58F}\n' +
    '.gd-penfence{position:absolute;z-index:1;box-sizing:border-box;border:3px solid #A9773F;border-radius:4px;pointer-events:none}\n' +
    '.gd-cell>.gd-letter-in{inset:-8% -4% auto auto;width:52%;height:52%;transform:rotate(-12deg);z-index:1}\n' +
    '.gd-tulip.gd-part{opacity:.8;transform:rotate(9deg) translateY(3%)}\n' +
    '.gd-tulip.gd-droop{opacity:.7;transform:rotate(28deg) translateY(10%)}\n' +
    '.gd-boulder.gd-used{opacity:.4}\n' +
    '.gd-meter{position:absolute;left:50%;top:0;transform:translate(-50%,-70%);z-index:2;display:flex;align-items:center;gap:3px;background:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:800;line-height:1.35;white-space:nowrap;color:#2E2A3D;box-shadow:0 2px 6px rgba(0,0,0,.18);pointer-events:none}\n' +
    '.gd-pips{display:inline-flex;gap:2px}.gd-pip{display:block;width:6px;height:9px;border-radius:3px;background:#E6DCC6}\n' +
    '.gd-pip.gd-on{background:#7CC6F0}.gd-m-stone .gd-pip.gd-on{background:#8E8CA0}.gd-m-egg .gd-pip.gd-on{background:#FFD166}.gd-m-food .gd-pip.gd-on{background:#C79A63}.gd-m-letter .gd-pip.gd-on{background:#E86A5E}\n' +
    '.gd-meter.gd-full{background:#3FA66B;color:#fff}.gd-meter.gd-full .gd-pip{background:rgba(255,255,255,.35)}.gd-meter.gd-full .gd-pip.gd-on{background:#fff}\n' +
    '.gd-mi{display:block;flex:none;box-sizing:border-box;width:8px;height:8px}\n' +
    '.gd-mi-water{background:#2B7FC0;border-radius:0 50% 50% 50%;transform:rotate(45deg);margin:2px 1px 0}\n' +
    '.gd-mi-stone{background:#8E8B9A;border-radius:45% 55% 40% 50%;width:10px;height:8px}\n' +
    '.gd-mi-egg{background:#FFF7E8;border:1.5px solid #C79A63;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;width:8px;height:10px}\n' +
    '.gd-mi-food{background:#C79A63;border-radius:50%;width:10px;height:7px}\n' +
    '.gd-mi-letter{background:#FFF7E8;border:1.5px solid #E86A5E;border-radius:1px;width:10px;height:7px}\n' +
    '.gd-mi-dot{background:#6E6784;border-radius:50%;width:7px;height:7px}\n' +
    '.gd-meter.gd-watch{outline:3px solid #8F6BFF;outline-offset:1px;font-size:15px;gap:5px;padding:2px 11px;z-index:3;transform:translate(-50%,-85%)}\n' +
    '.gd-meter.gd-watch .gd-pip{width:9px;height:14px;border-radius:4px}.gd-meter.gd-watch .gd-mi{width:11px;height:11px}.gd-meter.gd-watch .gd-mi-egg{width:10px;height:13px}.gd-meter.gd-watch .gd-mi-stone,.gd-meter.gd-watch .gd-mi-food,.gd-meter.gd-watch .gd-mi-letter{width:14px;height:10px}\n' +
    '.gd-meter.gd-meter-top{transform:translate(-50%,6%)}.gd-meter.gd-watch.gd-meter-top{transform:translate(-50%,4%)}\n' +
    '.gd-ring{position:absolute;inset:-4%;box-sizing:border-box;border:3px solid #8F6BFF;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.9),inset 0 0 0 2px rgba(255,255,255,.9);z-index:2;pointer-events:none}\n' +
    '.gd-bot>.gd-ring{inset:-6%}\n' +
    '.gd-bot.gd-watch>.gd-can{outline:3px solid #8F6BFF;outline-offset:1px;transform:translateY(-50%) scale(1.4)}\n' +
    '.gd-world[data-wide="1"] .gd-meter:not(.gd-watch){font-size:9px;padding:0 4px;gap:2px}.gd-world[data-wide="1"] .gd-meter:not(.gd-watch) .gd-pips{display:none}\n' +
    // P108 IW-003 (lane B): on the island a tile is ~14 px, so a chip with numbers covered its neighbour's; the compact
    // meter is a bar narrower than one tile (its share filled, green when full), and a watched one stays the full chip.
    '.gd-world[data-wide="1"] .gd-meter:not(.gd-watch){width:min(12px,82%);height:5px;padding:0;gap:0;font-size:0;border-radius:3px;background:linear-gradient(90deg,var(--c,#2B7FC0) 0 var(--f,0%),#E6DCC6 var(--f,0%));box-shadow:0 0 0 1.5px #fff,0 1px 3px rgba(0,0,0,.3);transform:translate(-50%,-160%)}\n' +
    '.gd-world[data-wide="1"] .gd-meter:not(.gd-watch)>*{display:none}.gd-world[data-wide="1"] .gd-meter.gd-full:not(.gd-watch){--c:#3FA66B;--f:100%}\n' +
    '.gd-world[data-wide="1"] .gd-meter.gd-meter-top:not(.gd-watch){transform:translate(-50%,40%)}\n' +
    '.gd-world[data-wide="1"] .gd-meter.gd-m-stone{--c:#6E6B7A}.gd-world[data-wide="1"] .gd-meter.gd-m-egg{--c:#E0A800}.gd-world[data-wide="1"] .gd-meter.gd-m-food{--c:#A9773F}.gd-world[data-wide="1"] .gd-meter.gd-m-letter,.gd-world[data-wide="1"] .gd-meter.gd-m-ball{--c:#E04E4E}\n' +
    '.gd-world[data-wide="1"] .gd-meter[data-fill="1"]{--f:10%}.gd-world[data-wide="1"] .gd-meter[data-fill="2"]{--f:20%}.gd-world[data-wide="1"] .gd-meter[data-fill="3"]{--f:30%}.gd-world[data-wide="1"] .gd-meter[data-fill="4"]{--f:40%}.gd-world[data-wide="1"] .gd-meter[data-fill="5"]{--f:50%}.gd-world[data-wide="1"] .gd-meter[data-fill="6"]{--f:60%}.gd-world[data-wide="1"] .gd-meter[data-fill="7"]{--f:70%}.gd-world[data-wide="1"] .gd-meter[data-fill="8"]{--f:80%}.gd-world[data-wide="1"] .gd-meter[data-fill="9"]{--f:90%}.gd-world[data-wide="1"] .gd-meter[data-fill="10"]{--f:100%}\n' +
    '.gd-mi-ball{background:#E04E4E;border-radius:50%;width:8px;height:8px;box-shadow:inset 0 -2px 0 rgba(255,255,255,.6)}.gd-m-ball .gd-pip.gd-on{background:#E04E4E}\n' +
    '.gd-world.gd-picking{border-color:#8F6BFF;box-shadow:0 0 0 3px #EEE8FF;cursor:crosshair}.gd-picking .gd-cell{cursor:crosshair}\n' +
    '.gd-picking .gd-cell>.gd-thing,.gd-picking .gd-cell>.gd-tulip{transition:transform .15s ease,filter .15s ease}\n' +
    '.gd-picking .gd-cell:hover,.gd-picking .gd-cell:active{box-shadow:inset 0 0 0 3px rgba(143,107,255,.6)}\n' +
    '.gd-picking .gd-cell:hover>.gd-thing,.gd-picking .gd-cell:active>.gd-thing,.gd-picking .gd-cell:hover>.gd-tulip,.gd-picking .gd-cell:active>.gd-tulip{transform:translateY(-12%) scale(1.1);filter:drop-shadow(0 5px 3px rgba(46,42,61,.28))}\n' +
    // P108 IW-003 (lane P): the door's name plate — under the door, over the tile's foot; hidden on the island (a wide world).
    '.gd-cell>.gd-door{inset:0 6% 8% 6%;width:88%;height:92%}\n' +
    '.gd-plate{position:absolute;left:50%;bottom:-2%;transform:translateX(-50%);z-index:2;background:#FFF7E8;color:#2E2A3D;border:1.5px solid #8B5A2B;border-radius:6px;padding:0 5px;font-size:10px;font-weight:800;line-height:1.35;white-space:nowrap;pointer-events:none}\n' +
    '.gd-world[data-wide="1"] .gd-plate{display:none}\n' +
    '@media (prefers-reduced-motion: reduce){.gd-puddle{animation:none}.gd-bump{animation:none}.gd-cheer .gd-turn{animation:none}.gd-bot{transition:none}.gd-turn{transition:none}}';

  /** A rising count is a new event; a mount, the same value, a fall or junk is not (the Boost-count rule). */
  function rose(before, after) {
    var a = Number(before);
    var b = Number(after);
    if (!isFinite(b)) return false;
    return b > (isFinite(a) ? a : 0);
  }

  /**
   * Where each robot is drawn, as percentages of the world, and how two on one tile share it (D2: a sibling’s robot
   * is on the island; two robots never overlap). Sharing robots are drawn smaller, one up-left, one down-right,
   * far enough apart that their boxes do not touch.
   */
  function robotPlaces(robots, w, h) {
    var byTile = {};
    robots.forEach(function (r, i) {
      var k = r.x + ',' + r.y;
      (byTile[k] = byTile[k] || []).push(i);
    });
    return robots.map(function (r, i) {
      var mates = byTile[r.x + ',' + r.y];
      var share = mates.length > 1 ? mates.indexOf(i) : -1;
      // With scale(.78) about the box centre a robot spans centre ± 0.39 box: at −90% and −10% the two centres sit
      // 0.8 box apart, so the boxes never meet (a 0.02 box gap); the drawn bodies are narrower still.
      var offsets = [
        [-90, -90],
        [-10, -10],
        [-50, -50]
      ];
      var o = share === -1 ? [-50, -50] : offsets[Math.min(share, 2)];
      return {
        left: w ? ((r.x + 0.5) * 100) / w : 0,
        top: h ? ((r.y + 0.5) * 100) / h : 0,
        share: share,
        transform: 'translate(' + o[0] + '%,' + o[1] + '%)' + (share === -1 ? '' : ' scale(.78)')
      };
    });
  }

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Garden = {
    name: 'garden-kit.Garden',
    displayNodeName: 'Garden',
    docs:
      'The tile world: a CSS grid of tiles from a Map of rows and a legend (grass, path, water, tree, rock, house, ' +
      'bed, postbox), Things on tiles (tulips dry or watered, puddles, letters, bowls, stones, eggs, food, a flag, labels, a rock drawn by the stones left in it, a sign, a note) and one or two Robots that glide ' +
      'to where the graph puts them in Step Ms, turn to face d (0 up, clockwise), bump in place when their bump count ' +
      'rises, and speak a Bubble. Every sprite is inline SVG; nothing is fetched. A tapped tile reports its x and y. ' +
      'The job model (P108) is drawn from the same Things: a wall tile (L), a tulip’s drinks, a path site by stage, a basket, bowl or store count, the can on the map and in a hand, a rock’s stones, the hen and her pen, a letter in the post box — each with a meter; Watch rings the things a program asks about and draws their meters large; Picking frames the world while a child picks a thing. ' +
      'It draws; the engine decides where a robot may go.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,

    /** The pure parts, for the kit gate. */
    world: { parseMap: parseMap, parseThings: parseThings, parseRobots: parseRobots, robotPlaces: robotPlaces, rose: rose, DEFAULT_LEGEND: DEFAULT_LEGEND, KINDS: KINDS, rockSize: rockSize, loadOf: loadOf, job: JOB_LOOK },
    sprite: { minPx: ROBOT_MIN_PX, svgPct: ROBOT_SVG_PCT, face: { x: FACE_X, y: FACE_Y, w: FACE_W, h: FACE_H }, faceFraction: FACE_FRACTION, robotSvg: robotSvg, sprites: SPRITES },
    css: WORLD_CSS,

    getReactComponent: function () {
      return function GardenComponent(props) {
        var root = React.useRef(null);
        var grid = parseMap(props.map);
        var things = parseThings(props.things);
        var robots = parseRobots(props.robots);
        var stepMs = Math.max(0, Number(props.stepMs));
        if (!isFinite(stepMs)) stepMs = 380;

        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(root.current);
          if (typeof props.onReady === 'function') props.onReady();
        }, []);

        // A bump count that rose since the last render restarts that robot’s bump; the counts a world mounts with do not.
        var bumps = React.useRef(null);
        if (bumps.current === null) bumps.current = { seen: robots.map(function (r) { return r.bump; }), n: robots.map(function () { return 0; }) };
        robots.forEach(function (r, i) {
          if (bumps.current.seen[i] === undefined) {
            bumps.current.seen[i] = r.bump;
            bumps.current.n[i] = 0;
            return;
          }
          if (bumps.current.seen[i] !== r.bump) {
            if (rose(bumps.current.seen[i], r.bump)) bumps.current.n[i]++;
            bumps.current.seen[i] = r.bump;
          }
        });

        // Celebrate is a signal: a count that rises. The world cheers for a moment.
        var cheers = React.useRef(null);
        if (cheers.current === null) cheers.current = { seen: props.celebrate, n: 0 };
        if (cheers.current.seen !== props.celebrate) {
          if (rose(cheers.current.seen, props.celebrate)) cheers.current.n++;
          cheers.current.seen = props.celebrate;
        }
        var cheerN = cheers.current.n;
        var cheerState = React.useState(0);
        React.useEffect(
          function () {
            if (!cheerN) return undefined;
            cheerState[1](cheerN);
            var t = setTimeout(function () {
              cheerState[1](0);
            }, 1500);
            return function () {
              clearTimeout(t);
            };
          },
          [cheerN]
        );

        // The bubble: shown when a new one arrives, gone after its ms. Cleared on unmount.
        var bubble = readJson(props.bubble, null);
        var bubbleKey = bubble && typeof bubble === 'object' && bubble.text ? JSON.stringify(bubble) : '';
        var bubbleState = React.useState('');
        React.useEffect(
          function () {
            bubbleState[1](bubbleKey);
            if (!bubbleKey) return undefined;
            var ms = Number(bubble.ms);
            if (!isFinite(ms) || ms <= 0) ms = bubble.style === 'olive' ? 3200 : 1100;
            var t = setTimeout(function () {
              bubbleState[1]('');
            }, ms);
            return function () {
              clearTimeout(t);
            };
          },
          [bubbleKey]
        );
        var shownBubble = bubbleState[0] && bubbleState[0] === bubbleKey ? bubble : null;

        var tap = function (x, y) {
          if (typeof props.onTileX === 'function') props.onTileX(x);
          if (typeof props.onTileY === 'function') props.onTileY(y);
          if (typeof props.onTileTapped === 'function') props.onTileTapped();
        };

        var thingsAt = {};
        things.forEach(function (t) {
          var k = Number(t.x) + ',' + Number(t.y);
          (thingsAt[k] = thingsAt[k] || []).push(t);
        });

        // P108 IW-002 AC6 + the two world inputs (brief §4.4): what Watch rings, a hen's pen, whether Picking is on.
        var watched = resolveWatch(props.watch, things, robots);
        var watchedThings = watched.things.map(function (i) {
          return things[i];
        });
        var picking = flag(props.picking, false);
        var pens = [];
        things.forEach(function (t) {
          var p = penOf(t);
          if (p) pens.push(p);
        });
        var inPen = function (x, y) {
          for (var i = 0; i < pens.length; i++) if (x >= pens[i].x && x < pens[i].x + pens[i].w && y >= pens[i].y && y < pens[i].y + pens[i].h) return true;
          return false;
        };

        var cellEls = grid.cells.map(function (c) {
          var here = thingsAt[c.x + ',' + c.y] || [];
          var kids = [];
          var tulip = null;
          var extras = [];
          // IW-002: the ground a path site lays (under everything on its tile), the meters and rings (over it).
          var ground = [];
          var marks = [];
          // A letter the post box THING received (IW-002's source) peeks from its slot; a letter on the map's B tile is
          // drawn as before (the letters request ends with one there).
          var boxHere = here.some(function (t) {
            return t.kind === 'postbox';
          });
          here.forEach(function (t, i) {
            var m = meterOf(t);
            var seen = watchedThings.indexOf(t) !== -1;
            // The world clips at its edge (overflow hidden): on the top row the chip sits just inside its tile.
            if (m) marks.push(meterEl(m, 'meter-' + i, seen, c.y === 0));
            if (seen) marks.push(h('span', { key: 'ring-' + i, className: 'gd-ring', 'data-ring': t.kind }));
            if (t.kind === 'tulip') tulip = t;
            else if (t.kind === 'puddle') extras.push(h('div', { key: 'puddle-' + i, className: 'gd-puddle', 'data-puddle': 'true' }));
            else if (t.kind === 'letter') extras.push(spriteEl('letter', 'letter-' + i, 'gd-thing' + (boxHere ? ' gd-letter-in' : '')));
            else if (t.kind === 'bowl') {
              var fed = !!t.full || (m !== null && m.have > 0);
              extras.push(spriteEl(fed ? 'bowlFull' : 'bowl', 'bowl-' + i, 'gd-thing gd-bowl' + (fed ? ' gd-full' : '')));
            }
            else if (t.kind === 'rock') {
              var size = rockSize(t.left);
              if (size) extras.push(spriteEl(ROCK_SPRITE[size], 'rock-' + i, 'gd-thing gd-boulder gd-boulder-' + size, { 'data-left': String(t.left === undefined ? '' : t.left) }));
              // IW-002: a rock with a max is a source that regrows: used up, it stays as a faint stub.
              else if (m) extras.push(spriteEl('rockSmall', 'rock-' + i, 'gd-thing gd-boulder gd-used', { 'data-left': '0' }));
            }
            else if (t.kind === 'site') ground.push(h('div', { key: 'site-' + i, className: 'gd-site gd-site-' + siteStage(t), 'data-site': siteStage(t) }));
            else if (t.kind === 'basket') extras.push(spriteEl(m && m.have > 0 ? (t.item === 'ball' ? 'basketBall' : 'basketEggs') : 'basket', 'basket-' + i, 'gd-thing gd-basket'));
            // P108 IW-003 (lane B): a store of food (Biscuit's sack, his treat jar) shows food on top, not stones.
            else if (t.kind === 'store') extras.push(spriteEl((m ? m.have > 0 : wholeOf(t.count) > 0) ? (t.item === 'food' ? 'storeFood' : 'storeFull') : 'store', 'store-' + i, 'gd-thing gd-store'));
            else if (t.kind === 'ball') extras.push(spriteEl('ball', 'ball-' + i, 'gd-thing gd-ball'));
            else if (t.kind === 'can') extras.push(canThingEl(t, 'can-' + i));
            else if (t.kind === 'hen') extras.push(spriteEl('hen', 'hen-' + i, 'gd-thing gd-hen'));
            // P108 IW-003 (lane P): a door, its letter showing once one is through, and its owner's name on a plate.
            else if (t.kind === 'door') {
              extras.push(spriteEl(m && m.have > 0 ? 'doorMail' : 'door', 'door-' + i, 'gd-thing gd-door', { 'data-owner': String(t.owner || '') }));
              if (t.owner) extras.push(h('span', { key: 'plate-' + i, className: 'gd-plate', 'data-owner': String(t.owner) }, String(t.owner)));
            }
            else if (THING_SPRITES[t.kind]) extras.push(spriteEl(t.kind, t.kind + '-' + i, 'gd-thing gd-' + t.kind));
            // IG-004: an islander by her plot, her open request as a bubble; the padlock over a locked plot.
            else if (t.kind === 'islander' && ISLANDER_SPRITES[t.who]) {
              extras.push(spriteEl(ISLANDER_SPRITES[t.who], 'islander-' + i, 'gd-thing gd-islander gd-islander-' + t.who, { 'data-who': String(t.who) }));
              // P106 IG-005: the bubble is at most seven tiles wide (its max-width is a share of her cell), so on a phone's 16 px
              // tiles it stays over her own plot and never under a robot at work on the next one.
              if (t.say) extras.push(h('span', { key: 'say-' + i, className: 'gd-isl-say', 'data-who': String(t.who) }, String(t.say)));
            }
            else if (t.kind === 'padlock') extras.push(spriteEl('padlock', 'padlock-' + i, 'gd-thing gd-padlock'));
            else if (t.kind === 'label') extras.push(h('span', { key: 'label-' + i, className: 'gd-label' }, String(t.text || '')));
          });
          if (c.kind === 'tree') kids.push(spriteEl('tree', 'tree'));
          if (c.kind === 'rock') kids.push(spriteEl('rock', 'rock'));
          if (c.kind === 'house') kids.push(spriteEl('house', 'house'));
          if (c.kind === 'postbox') kids.push(spriteEl('postbox', 'postbox'));
          if (c.kind === 'wall') kids.push(spriteEl('wall', 'wall', 'gd-wallart'));
          if (c.kind === 'bed' || tulip) {
            var wet = !!(tulip && (tulip.watered === true || tulip.state === 'watered' || tulip.state === 'wet'));
            var yellow = !!(tulip && tulip.colour === 'yellow');
            // IW-002: a tulip with drinks but not all of them stands half up; a worn one (droop) hangs further than dry.
            var tm = tulip ? meterOf(tulip) : null;
            var look = !wet && tulip && tulip.droop === true ? ' gd-droop' : !wet && tm && tm.have > 0 ? ' gd-part' : '';
            kids.push(spriteEl(yellow ? 'tulipYellow' : 'tulip', 'tulip', 'gd-tulip ' + (wet ? 'gd-wet' : 'gd-dry') + (yellow ? ' gd-yellow' : '') + look));
          }
          kids = ground.concat(kids, extras, marks);
          // Watch: a chip that names no thing here (the tile ahead) rings the tile itself.
          if (watched.tiles.indexOf(c.x + ',' + c.y) !== -1) kids.push(h('span', { key: 'ring-tile', className: 'gd-ring gd-ring-tile', 'data-ring': 'tile' }));
          return h(
            'button',
            { key: c.x + ',' + c.y, type: 'button', className: 'gd-cell gd-' + c.kind + (pens.length && inPen(c.x, c.y) ? ' gd-in-pen' : ''), 'data-x': String(c.x), 'data-y': String(c.y), 'data-ch': c.ch, 'aria-label': c.kind + ' ' + c.x + ',' + c.y, onClick: function () { tap(c.x, c.y); } },
            kids
          );
        });

        var places = robotPlaces(robots, grid.w, grid.h);
        var sizeW = grid.w ? 'max(' + (100 / grid.w).toFixed(4) + '%, ' + ROBOT_MIN_PX + 'px)' : ROBOT_MIN_PX + 'px';
        var sizeH = grid.h ? 'max(' + (100 / grid.h).toFixed(4) + '%, ' + ROBOT_MIN_PX + 'px)' : ROBOT_MIN_PX + 'px';
        var robotEls = robots.map(function (r, i) {
          var p = places[i];
          var rot = 'rotate(' + r.d * 90 + 'deg)';
          var bumpN = bumps.current.n[i] || 0;
          // IG-002: the can's level upright at the robot's left (canMax drops, can of them full; none when it has no can),
          // and the load it carries (the last thing carried) upright at its right. Drawn on the literal back (turning with
          // the robot) the load sat under the name tag whenever the robot faced up: the s2 drive's screenshots.
          var canEl = null;
          if (r.can !== null) {
            var drops = [];
            for (var di = 0; di < r.canMax; di++) {
              var full = di < r.can;
              drops.push(h('svg', { key: 'drop-' + di, viewBox: '0 0 12 14', className: 'gd-drop ' + (full ? 'gd-drop-full' : 'gd-drop-empty'), 'aria-hidden': 'true' }, h('path', { d: 'M6 1s5 5.4 5 8.4a5 5 0 01-10 0C1 6.4 6 1 6 1z', fill: full ? '#2B7FC0' : '#fff', stroke: full ? '#2B7FC0' : '#8E8B9A', strokeWidth: 1.5 })));
            }
            canEl = h('div', { key: 'can', className: 'gd-can', 'data-can': String(Math.min(r.can, r.canMax)), 'data-can-max': String(r.canMax), title: Math.min(r.can, r.canMax) + '/' + r.canMax }, drops);
          }
          var load = loadOf(r.carry);
          var loadEl = load ? h('div', { key: 'load', className: 'gd-load gd-load-' + load, 'data-load': load, 'data-carry': String(r.carry.length) }, spriteEl(load, 'load-svg')) : null;
          // IW-002: Watch on the can a robot holds rings the robot and draws its level large.
          var botSeen = watched.robots.indexOf(i) !== -1;
          return h(
            'div',
            {
              key: 'robot-' + i,
              className: 'gd-bot' + (botSeen ? ' gd-watch' : ''),
              'data-holds': r.holds || undefined,
              'data-watch': botSeen ? 'true' : undefined,
              'data-robot': String(i),
              'data-x': String(r.x),
              'data-y': String(r.y),
              'data-d': String(r.d),
              'data-accessory': r.accessory || undefined,
              'data-share': p.share === -1 ? undefined : String(p.share),
              style: { left: p.left.toFixed(4) + '%', top: p.top.toFixed(4) + '%', width: sizeW, height: sizeH, transform: p.transform }
            },
            h('div', { key: 'turn-' + bumpN, className: 'gd-turn' + (bumpN ? ' gd-bump' : ''), 'data-bump': bumpN ? String(bumpN) : undefined, style: { '--gd-rot': rot } }, robotSvg(r, 'svg')),
            canEl,
            loadEl,
            r.name ? h('span', { key: 'name', className: 'gd-name' }, r.name) : null,
            botSeen ? h('span', { key: 'ring', className: 'gd-ring', 'data-ring': 'robot' }) : null
          );
        });

        // IG-004: a fence round a locked plot spans w × h tiles from its (x, y): one element over the grid, not a cell's.
        var fenceEls = things
          .filter(function (t) {
            return t.kind === 'fence';
          })
          .map(function (t, i) {
            var fw = Math.max(1, Math.floor(Number(t.w)) || 1);
            var fh = Math.max(1, Math.floor(Number(t.h)) || 1);
            return h('div', {
              key: 'fence-' + i,
              className: 'gd-fence',
              'data-fence': Number(t.x) + ',' + Number(t.y) + ',' + fw + ',' + fh,
              style: {
                left: (grid.w ? (Number(t.x) * 100) / grid.w : 0).toFixed(4) + '%',
                top: (grid.h ? (Number(t.y) * 100) / grid.h : 0).toFixed(4) + '%',
                width: (grid.w ? (fw * 100) / grid.w : 0).toFixed(4) + '%',
                height: (grid.h ? (fh * 100) / grid.h : 0).toFixed(4) + '%'
              }
            });
          });

        // IW-002: a hen's pen — its tiles are straw (the cells above), a wooden rail round them (one element over the grid).
        var penEls = pens.map(function (p, i) {
          return h('div', {
            key: 'pen-' + i,
            className: 'gd-penfence',
            'data-pen': p.x + ',' + p.y + ',' + p.w + ',' + p.h,
            style: {
              left: (grid.w ? (p.x * 100) / grid.w : 0).toFixed(4) + '%',
              top: (grid.h ? (p.y * 100) / grid.h : 0).toFixed(4) + '%',
              width: (grid.w ? (p.w * 100) / grid.w : 0).toFixed(4) + '%',
              height: (grid.h ? (p.h * 100) / grid.h : 0).toFixed(4) + '%'
            }
          });
        });

        var bubbleEl = null;
        if (shownBubble) {
          var who = Math.max(0, Math.min(robots.length - 1, Number(shownBubble.robot) || 0));
          var at = places[who];
          if (at) {
            bubbleEl = h(
              'div',
              { key: 'bubble', className: 'gd-bubble' + (shownBubble.style === 'olive' ? ' gd-olive' : ''), 'data-bubble': String(who), style: { left: (at.left + (grid.w ? 50 / grid.w : 0)).toFixed(4) + '%', top: (at.top - (grid.h ? 50 / grid.h : 0)).toFixed(4) + '%' } },
              shownBubble.style === 'olive' ? h('small', { key: 'meta' }, 'Olive') : null,
              String(shownBubble.text)
            );
          }
        }

        // 🔴 Session 1’s drive: the bridge seeds props.style from defaultCss, so an inline display:block arrived and beat
        // the class’s display:grid — 48 cells of zero size, one flat green rectangle. The grid is set AFTER the merge;
        // only the graph hiding the node (display none) is kept.
        var worldStyle = Object.assign(
          {
            gridTemplateColumns: 'repeat(' + Math.max(1, grid.w) + ', minmax(0, 1fr))',
            gridTemplateRows: 'repeat(' + Math.max(1, grid.h) + ', minmax(0, 1fr))',
            aspectRatio: Math.max(1, grid.w) + ' / ' + Math.max(1, grid.h),
            '--gd-step': stepMs + 'ms'
          },
          props.style
        );
        if (worldStyle.display !== 'none') worldStyle.display = 'grid';
        return h(
          'div',
          {
            ref: root,
            className: 'gd-world' + (cheerState[0] ? ' gd-cheer' : '') + (picking ? ' gd-picking' : ''),
            'data-gd-world': 'true',
            'data-w': String(grid.w),
            'data-h': String(grid.h),
            // IW-002: a wide world (the island) draws its meters compact — numbers only — unless one is watched.
            'data-wide': grid.w > 16 && things.some(meterOf) ? '1' : undefined,
            'data-picking': picking ? 'true' : undefined,
            role: 'group',
            'aria-label': props.label || 'garden',
            style: worldStyle
          },
          h('style', { key: 'css' }, WORLD_CSS),
          cellEls,
          fenceEls,
          penEls,
          robotEls,
          bubbleEl
        );
      };
    },

    defaultCss: { display: 'grid' },

    inputProps: {
      map: { type: 'object', displayName: 'Map', group: 'World', default: '{"rows":["GGTGGGTH","GGGGGGGG","GGFGFGFG","PPPPPPPP","GWWGGRGG","GGGGGTGG"]}', description: 'Rows of characters and a legend, as an object or JSON: { rows: ["GGTG…"], legend: { G: "grass" } }. Kinds: grass, path, water, tree, rock, house, bed (a tulip bed, dry until a Thing waters it), postbox (the post box, on path). The mockup’s legend is the default.' },
      things: { type: 'object', displayName: 'Things', group: 'World', description: 'A list, as an object or JSON: { kind, x, y } with kind tulip (watered true/false), puddle, letter, bowl (full true/false), stone, egg, food, flag or label (text).' },
      robots: { type: 'object', displayName: 'Robots', group: 'World', default: '[{"x":0,"y":3,"d":1,"colour":"#FF7A59","eyes":"round","hat":"none","name":"Pip"}]', description: 'One or two, as a list or JSON: { x, y, d, colour, eyes, hat, name, bump }. d is 0 up, 1 right, 2 down, 3 left. bump is a count: raise it once per bump.' },
      bubble: { type: 'object', displayName: 'Bubble', group: 'World', description: '{ robot, text, style, ms }: a line over a robot for ms (1100 plain, 3200 olive by default). A new object shows a new bubble.' },
      stepMs: { type: 'number', displayName: 'Step Ms', group: 'World', default: 380, description: 'How long a robot takes to glide one tile.' },
      celebrate: { type: 'signal', displayName: 'Celebrate', group: 'World', description: 'The robots hop for a moment.' },
      label: { type: 'string', displayName: 'Label', group: 'World', default: 'The garden', description: 'What a screen reader calls the world.' },
      // P108 IW-002 (lane D), the common brief §4.4: the two world inputs IW-004's Workshop wires (the 3D kit has both, the same).
      watch: { type: 'object', displayName: 'Watch', group: 'World', description: 'The things a program asks about, as a list of chips { id?, kind, x, y } or its JSON (empty: none). Each is ringed and its meter drawn large — the thing with that id, else the first of its kind on its tile, else (a can) the robot holding it, else the tile.' },
      picking: { type: 'boolean', displayName: 'Picking', group: 'World', default: false, description: 'True while a child picks a thing for a chip: the world is framed in violet and the things under the pointer lift. A tap still reports Tile X, Tile Y and Tile Tapped as always.' }
    },

    outputProps: {
      onTileX: { type: 'number', displayName: 'Tile X', group: 'Taps', description: 'The column of the last tapped tile.' },
      onTileY: { type: 'number', displayName: 'Tile Y', group: 'Taps', description: 'The row of the last tapped tile.' },
      onTileTapped: { type: 'signal', displayName: 'Tile Tapped', group: 'Taps', description: 'A tile was tapped. Tile X and Tile Y already hold it.' },
      onReady: { type: 'signal', displayName: 'Ready', group: 'Events', description: 'The world is on the page.' }
    }
  };

  // P108 IW-004: Blocks (src/blocks.js, above this file in index.js) — the program editor on Blockly — beside these two.
  var blocksNode = typeof gardenKitBlocks !== 'undefined' && gardenKitBlocks ? gardenKitBlocks.node : null;

  /** @type {import('./types/node-kit').NodeKitModule} */
  var kit = {
    nodes: [],
    reactNodes: h ? [BlockList, Garden].concat(blocksNode ? [blocksNode] : []) : []
  };

  Noodl.defineModule(kit);
})();
