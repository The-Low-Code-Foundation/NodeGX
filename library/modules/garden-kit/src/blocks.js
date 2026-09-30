/**
 * Garden Kit — Blocks (P108 IW-004): the program editor on real Blockly 12, made for children the way Scratch made it.
 *
 * `build.mjs` puts this file ABOVE `kit.js` in `index.js`; `kit.js` registers the node it returns (`gardenKitBlocks.node`)
 * beside Block List and Garden. Blockly itself is vendored BESIDE `index.js` (`blockly_compressed.js`, its French and
 * English messages, manifest `dependencies`), so a page loads it first and this file reads the `Blockly` global. Without
 * it (the server render, the kit gate's bare context) the node draws an empty box and throws nothing.
 *
 * ── The rule this file follows ───────────────────────────────────────────────
 *
 *   Blockly is a VIEW. The program is the engine's list of blocks `{ id, t, n?, slots?, body?, else? }`, in and out, on
 *   Block List's ports. Blockly JSON never leaves the node. A Blockly block's id IS the engine block's id.
 *
 * The translator (`toBlockly` / `toEngine`, exported on the node as `translate`) is pure data → data, so the gate
 * (`tests/iw004Blocks.test.ts`) runs it with no Blockly and again through a real headless Blockly workspace. Every
 * engine block carries a memo of its own shape in the Blockly block's extraState (`src`: its keys in their order, the
 * slots Blockly does not edit, the type of every value), so a program goes engine → Blockly → engine byte-identical
 * whatever key order or value types it was written with (the reference programs write `arg: 4`, a stored v4 program
 * `arg: "4"`). A block made in Blockly (from the drawer) has no memo and is written in the contract's order.
 *
 * ── Conditions (P108 brief §4.3) ─────────────────────────────────────────────
 *
 * `until` / `if` hold a condition in their COND input. A lone legacy sensor block (`the wall is ahead`) is written as
 * today's `slots.sensor` / `slots.arg` pair (the engine reads it today, and every stored program has it); anything else
 * built in Blockly — a thing chip and its state, a comparison, and / or / not, a value — is written as `slots.cond`, an
 * expression object. A `cond: { op: 'sensor' }` read from a program comes back as the same `cond` (the sensor block
 * remembers it came from an expression).
 */
var gardenKitBlocks = (function () {
  var h = typeof React !== 'undefined' ? React.createElement : null;

  function BK() {
    return typeof Blockly !== 'undefined' && Blockly && Blockly.inject ? Blockly : null;
  }

  function flag(value, whenUnset) {
    if (value === undefined || value === null) return whenUnset;
    return value === true;
  }

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

  function clone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function isObj(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The vocabulary: engine type ↔ Blockly type, the things, their states (brief §4.3)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Engine `t` → Blockly type (IW-000 §7's names; the ones the mockup did not have follow them). */
  var TYPE_OF = {
    fwd: 'garden_forward', left: 'garden_turn_left', right: 'garden_turn_right', water: 'garden_water', fill: 'garden_fill', pick: 'garden_pick', put: 'garden_put',
    say: 'garden_say', repeat: 'garden_repeat', until: 'garden_until', 'if': 'garden_if', when: 'garden_when', count_inc: 'garden_count_inc', trick: 'garden_trick',
    'do': 'garden_do', ask: 'garden_ask', go_nearest: 'garden_go_nearest', go_to: 'garden_go_to', set: 'garden_set', change: 'garden_change'
  };
  var T_OF = {};
  for (var tk in TYPE_OF) T_OF[TYPE_OF[tk]] = tk;
  T_OF.garden_if_else = 'if';
  var OLIVE_PREFIX = 'olive:';

  /** The statement types that hold a body (DO), and the one that also holds an else. */
  var BODY_TYPES = { garden_repeat: 1, garden_until: 1, garden_if: 1, garden_if_else: 1, garden_when: 1, garden_trick: 1, garden_unknown: 1 };
  var COND_TYPES = { garden_until: 1, garden_if: 1, garden_if_else: 1 };

  /** The slots a type edits in Blockly as a field (F) or a value input (I, with what it holds). Every other slot rides in the memo. */
  var EDITS = {
    garden_say: [['text', 'F', 'TEXT']],
    garden_when: [['event', 'F', 'EVENT']],
    garden_trick: [['name', 'F', 'NAME']],
    garden_do: [['name', 'F', 'NAME']],
    garden_go_nearest: [['kind', 'F', 'KIND']],
    garden_go_to: [['thing', 'I', 'THING', 'ref']],
    garden_set: [['name', 'F', 'NAME'], ['value', 'I', 'VALUE', 'val']],
    garden_change: [['name', 'F', 'NAME'], ['by', 'I', 'BY', 'val']]
  };

  /** The legacy sensors (CG-002's `sense()`), for a drawer the palette does not describe. */
  var SENSORS = ['wall_ahead', 'tulip_ahead', 'bowl_empty', 'basket_full', 'count_is', 'olive_says:yes', 'olive_says:no', 'can_empty'];

  /** Things a chip can be, and a state list per kind (brief §4.3's table). `has` takes N, or WHAT on a tile. */
  var STATES = {
    ahead: ['wall', 'nothing', 'has'],
    here: ['nothing', 'has'],
    can: ['empty', 'full', 'has'],
    held: ['empty', 'full', 'has'],
    basket: ['empty', 'full', 'has'],
    bowl: ['empty', 'full', 'has'],
    store: ['empty', 'full', 'has'],
    tulip: ['thirsty', 'drunk'],
    site: ['done', 'dirt'],
    rock: ['stones', 'used'],
    other: ['front']
  };
  var TILE_REFS = { ahead: 1, here: 1 };
  /** What a tile may have, what a container may count, what `go to nearest` may seek. */
  var WHAT_KINDS = ['egg', 'stone', 'tulip', 'rock', 'letter', 'food', 'can', 'water'];
  var SEEK_KINDS = ['egg', 'rock', 'tulip', 'can', 'well', 'basket', 'site', 'letter', 'stone', 'bowl', 'hen', 'postbox'];
  var VAR_NAMES = ['count', 'eggs', 'stones', 'water', 'steps'];
  var TEXT_WORDS = ['red tulip', 'yellow tulip', 'tulip', 'rock', 'stone', 'letter', 'bowl', 'egg'];

  function kindOfRef(ref) {
    if (!isObj(ref)) return null;
    if (typeof ref.ref === 'string') return ref.ref;
    return typeof ref.kind === 'string' ? ref.kind : null;
  }

  function statesOf(kind) {
    return STATES[kind] || (kind ? STATES.other : ['wall', 'nothing', 'has', 'empty', 'full', 'thirsty', 'drunk', 'done', 'dirt', 'stones', 'used', 'front']);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The translator — engine program ↔ Blockly JSON (pure, exported for the gate)
  // ═══════════════════════════════════════════════════════════════════════════

  /** The block's own shape, kept in its extraState: the engine block with body/else as placeholders (their place in the key order). */
  function memoOf(b) {
    var m = {};
    for (var k in b) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
      m[k] = k === 'body' || k === 'else' ? Array.isArray(b[k]) : clone(b[k]);
    }
    return m;
  }

  function typeOfBlock(b) {
    var t = String(b.t);
    if (t.indexOf(OLIVE_PREFIX) === 0) return 'garden_olive';
    if (t === 'if' && Array.isArray(b['else'])) return 'garden_if_else';
    return TYPE_OF[t] || 'garden_unknown';
  }

  /** A value for a Blockly field: fields hold text. */
  function fieldText(v) {
    return v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  }

  /** A chip: the REF kept whole in its extraState (its key order included). An empty chip is `null`. */
  function chipOf(ref, shadow) {
    var j = { type: 'garden_thing' };
    if (isObj(ref)) j.extraState = clone(ref);
    return shadow ? { shadow: j } : { block: j };
  }

  function sensorBlock(sensor, arg, asCond, hasArg) {
    var j = { type: 'garden_sensor', fields: { SENSOR: fieldText(sensor), ARG: arg === undefined || arg === null ? '1' : fieldText(arg) } };
    var es = {};
    if (asCond) es.asCond = true;
    if (hasArg) es.arg = true;
    if (typeof arg === 'number') es.num = true;
    if (es.asCond || es.arg || es.num) j.extraState = es;
    return j;
  }

  /** An expression (COND) as blocks. An op this file does not know rides whole in an opaque block. */
  function condBlock(c) {
    if (!isObj(c)) return null;
    if (c.op === 'sensor') return sensorBlock(c.sensor, c.arg, true, Object.prototype.hasOwnProperty.call(c, 'arg'));
    if (c.op === 'is') {
      var j = { type: 'garden_is', extraState: { kind: kindOfRef(c.thing) }, fields: { STATE: fieldText(c.state), N: c.n === undefined ? '1' : fieldText(c.n), WHAT: fieldText(c.what) } };
      if (c.thing !== undefined && c.thing !== null) j.inputs = { THING: chipOf(c.thing, false) };
      else j.inputs = { THING: chipOf(null, true) };
      return j;
    }
    if (c.op === 'cmp') return { type: 'garden_compare', fields: { OP: fieldText(c.cmp) }, inputs: valInputs({ A: valBlock(c.a), B: valBlock(c.b) }) };
    if (c.op === 'and' || c.op === 'or') return { type: 'garden_logic', fields: { OP: c.op }, inputs: valInputs({ A: condBlock(c.a), B: condBlock(c.b) }) };
    if (c.op === 'not') return { type: 'garden_not', inputs: valInputs({ A: condBlock(c.a) }) };
    return { type: 'garden_expr', extraState: { v: clone(c) } };
  }

  /** A value (VAL) as a block. */
  function valBlock(v) {
    if (!isObj(v)) return null;
    if (v.op === 'num') return { type: 'garden_number', fields: { NUM: fieldText(v.n) } };
    if (v.op === 'text') return { type: 'garden_text', fields: { TEXT: fieldText(v.s) } };
    if (v.op === 'count') return { type: 'garden_count', fields: { WHAT: fieldText(v.what) }, inputs: { THING: v.thing === undefined || v.thing === null ? chipOf(null, true) : chipOf(v.thing, false) } };
    if (v.op === 'level') return { type: 'garden_level', inputs: { THING: v.thing === undefined || v.thing === null ? chipOf(null, true) : chipOf(v.thing, false) } };
    if (v.op === 'var') return { type: 'garden_var', fields: { NAME: fieldText(v.name) } };
    if (v.op === 'read') return { type: 'garden_read' };
    return { type: 'garden_expr_val', extraState: { v: clone(v) } };
  }

  function valInputs(map) {
    var out = {};
    for (var k in map) if (map[k]) out[k] = { block: map[k] };
    return out;
  }

  /** One engine block → one Blockly block (JSON), with its body chained under DO and its else under ELSE. */
  function blockOf(b) {
    if (!isObj(b)) return null;
    var type = typeOfBlock(b);
    var slots = isObj(b.slots) ? b.slots : {};
    var j = { type: type, id: String(b.id), extraState: { src: memoOf(b) } };
    if (type === 'garden_olive') {
      j.extraState.rung = String(b.t).slice(OLIVE_PREFIX.length);
      j.extraState.keys = [];
    }
    var fields = {};
    var inputs = {};
    if (type === 'garden_repeat') fields.N = typeof b.n === 'number' ? String(b.n) : '3';
    var edits = EDITS[type] || [];
    for (var i = 0; i < edits.length; i++) {
      var e = edits[i];
      var has = Object.prototype.hasOwnProperty.call(slots, e[0]);
      if (e[1] === 'F') fields[e[2]] = has ? fieldText(slots[e[0]]) : '';
      else if (e[3] === 'ref') inputs[e[2]] = has && isObj(slots[e[0]]) ? chipOf(slots[e[0]], false) : chipOf(null, true);
      else if (has && isObj(slots[e[0]])) {
        var vb = valBlock(slots[e[0]]);
        if (vb) inputs[e[2]] = { block: vb };
      }
    }
    if (type === 'garden_olive') {
      // Olive's blocks: every slot that is a word (to, deed, kind, times) is a field S_<key>, listed in the extraState
      // so the block builds exactly those fields before Blockly loads their values.
      for (var sk in slots) {
        if (typeof slots[sk] === 'string' || typeof slots[sk] === 'number') {
          j.extraState.keys.push(sk);
          fields['S_' + sk] = fieldText(slots[sk]);
        }
      }
    }
    if (type === 'garden_unknown') j.extraState.t = String(b.t);
    if (COND_TYPES[type]) {
      if (isObj(slots.cond)) {
        var cb = condBlock(slots.cond);
        inputs.COND = cb ? { block: cb } : { shadow: sensorBlock('', undefined, false, false) };
      } else if (Object.prototype.hasOwnProperty.call(slots, 'sensor')) {
        inputs.COND = { shadow: sensorBlock(slots.sensor, slots.arg, false, Object.prototype.hasOwnProperty.call(slots, 'arg')) };
      } else inputs.COND = { shadow: sensorBlock('', slots.arg, false, Object.prototype.hasOwnProperty.call(slots, 'arg')) };
    }
    if (BODY_TYPES[type]) {
      var body = chainOf(Array.isArray(b.body) ? b.body : []);
      if (body) inputs.DO = { block: body };
    }
    if (type === 'garden_if_else') {
      var els = chainOf(b['else']);
      if (els) inputs.ELSE = { block: els };
    }
    if (Object.keys(fields).length) j.fields = fields;
    if (Object.keys(inputs).length) j.inputs = inputs;
    return j;
  }

  function chainOf(list) {
    var head = null;
    var prev = null;
    for (var i = 0; i < (list || []).length; i++) {
      var j = blockOf(list[i]);
      if (!j) continue;
      if (prev) prev.next = { block: j };
      else head = j;
      prev = j;
    }
    return head;
  }

  /** The start hat's place in the workspace (right of the drawer the flyout leaves; the node scrolls it into sight). */
  var START_AT = { x: 24, y: 24 };

  /** The engine program → a Blockly workspace state: the ▶ hat with the program chained under it. */
  function toBlockly(program) {
    var list = readJson(program, []);
    if (!Array.isArray(list)) list = [];
    var start = { type: 'garden_start', id: 'start', x: START_AT.x, y: START_AT.y };
    var head = chainOf(list);
    if (head) start.next = { block: head };
    return { blocks: { languageVersion: 0, blocks: [start] } };
  }

  // ── Blockly JSON → the engine program ─────────────────────────────────────

  function inputBlock(j, name) {
    var i = j && j.inputs && j.inputs[name];
    return i ? i.block || i.shadow || null : null;
  }

  function refOf(j) {
    if (!j || j.type !== 'garden_thing') return null;
    return isObj(j.extraState) && Object.keys(j.extraState).length ? clone(j.extraState) : null;
  }

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) && String(v).trim() !== '' ? n : fallback;
  }

  function valOf(j) {
    if (!j) return null;
    var f = j.fields || {};
    if (j.type === 'garden_number') return { op: 'num', n: num(f.NUM, 0) };
    if (j.type === 'garden_text') return { op: 'text', s: String(f.TEXT === undefined ? '' : f.TEXT) };
    if (j.type === 'garden_count') return { op: 'count', what: String(f.WHAT || ''), thing: refOf(inputBlock(j, 'THING')) };
    if (j.type === 'garden_level') return { op: 'level', thing: refOf(inputBlock(j, 'THING')) };
    if (j.type === 'garden_var') return { op: 'var', name: String(f.NAME || '') };
    if (j.type === 'garden_read') return { op: 'read' };
    if (j.type === 'garden_expr_val' && j.extraState) return clone(j.extraState.v);
    return null;
  }

  function condOf(j) {
    if (!j) return null;
    var f = j.fields || {};
    var es = j.extraState || {};
    if (j.type === 'garden_sensor') {
      var c = { op: 'sensor', sensor: String(f.SENSOR || '') };
      if (es.arg || c.sensor === 'count_is') c.arg = es.num ? num(f.ARG, 1) : String(f.ARG === undefined ? '' : f.ARG);
      return c;
    }
    if (j.type === 'garden_is') {
      var thing = refOf(inputBlock(j, 'THING'));
      var o = { op: 'is', thing: thing, state: String(f.STATE || '') };
      if (o.state === 'has') {
        if (thing && TILE_REFS[thing.ref]) o.what = String(f.WHAT || '');
        else o.n = num(f.N, 1);
      }
      return o;
    }
    if (j.type === 'garden_compare') return { op: 'cmp', cmp: String(f.OP || 'eq'), a: valOf(inputBlock(j, 'A')), b: valOf(inputBlock(j, 'B')) };
    if (j.type === 'garden_logic') return { op: f.OP === 'or' ? 'or' : 'and', a: condOf(inputBlock(j, 'A')), b: condOf(inputBlock(j, 'B')) };
    if (j.type === 'garden_not') return { op: 'not', a: condOf(inputBlock(j, 'A')) };
    if (j.type === 'garden_expr' && es.v) return clone(es.v);
    return null;
  }

  /** A value written back in the type the program had it (a number stays a number, text stays text). */
  function typedLike(v, like) {
    if (typeof like === 'number') {
      var n = Number(v);
      return isFinite(n) && String(v).trim() !== '' ? n : v;
    }
    if (typeof like === 'boolean') return v === true || v === 'true';
    return v;
  }

  /** The slots: the memo's order and its untouched values, the edited ones laid over them (undefined = gone). */
  function slotsOf(src, edited) {
    var out = {};
    var srcSlots = src && isObj(src.slots) ? src.slots : null;
    var done = {};
    if (srcSlots) {
      for (var k in srcSlots) {
        if (Object.prototype.hasOwnProperty.call(edited, k)) {
          done[k] = 1;
          if (edited[k] !== undefined) out[k] = typedLike(edited[k], srcSlots[k]);
        } else out[k] = clone(srcSlots[k]);
      }
    }
    for (var e in edited) if (!done[e] && edited[e] !== undefined) out[e] = edited[e];
    if (Object.keys(out).length) return out;
    return srcSlots ? {} : undefined;
  }

  /** What a statement block's fields and inputs say about its slots (a key mapped to undefined is removed). */
  function editedSlots(j) {
    var f = j.fields || {};
    var ed = {};
    var edits = EDITS[j.type] || [];
    for (var i = 0; i < edits.length; i++) {
      var e = edits[i];
      if (e[1] === 'F') {
        var v = f[e[2]];
        ed[e[0]] = v === undefined || v === '' ? undefined : String(v);
      } else if (e[3] === 'ref') ed[e[0]] = refOf(inputBlock(j, e[2])) || undefined;
      else ed[e[0]] = valOf(inputBlock(j, e[2])) || undefined;
    }
    if (j.type === 'garden_olive') {
      var keys = (j.extraState && j.extraState.keys) || [];
      for (var q = 0; q < keys.length; q++) {
        var ov = f['S_' + keys[q]];
        ed[keys[q]] = ov === undefined || ov === '' ? undefined : String(ov);
      }
    }
    if (COND_TYPES[j.type]) {
      var cj = inputBlock(j, 'COND');
      ed.sensor = undefined;
      ed.arg = undefined;
      ed.cond = undefined;
      if (cj && cj.type === 'garden_sensor' && !(cj.extraState && cj.extraState.asCond)) {
        var sf = cj.fields || {};
        var sensor = String(sf.SENSOR || '');
        var ces = cj.extraState || {};
        if (sensor) ed.sensor = sensor;
        if ((sensor || ces.arg) && (ces.arg || sensor === 'count_is')) ed.arg = ces.num ? num(sf.ARG, 1) : String(sf.ARG === undefined ? '' : sf.ARG);
      } else if (cj) {
        var c = condOf(cj);
        if (c) ed.cond = c;
      }
    }
    return ed;
  }

  function engineOf(j) {
    if (!j || !j.type || j.type === 'garden_start') return null;
    var es = j.extraState || {};
    var src = isObj(es.src) ? es.src : null;
    var t = j.type === 'garden_olive' ? OLIVE_PREFIX + String(es.rung || '') : j.type === 'garden_unknown' ? String(es.t || (src && src.t) || '') : T_OF[j.type];
    if (!t) return null;
    var id = /^-?\d+$/.test(String(j.id)) && !(src && typeof src.id === 'string') ? Number(j.id) : String(j.id);
    var n = j.type === 'garden_repeat' ? num(j.fields && j.fields.N, 3) : undefined;
    var slots = slotsOf(src, editedSlots(j));
    var hasBody = !!BODY_TYPES[j.type];
    var body = hasBody ? listOf(inputBlock(j, 'DO')) : undefined;
    var els = j.type === 'garden_if_else' ? listOf(inputBlock(j, 'ELSE')) : undefined;
    var out = {};
    var keys = src ? Object.keys(src) : ['id', 't', 'n', 'slots', 'body', 'else'];
    var placed = {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      placed[k] = 1;
      if (k === 'id') out.id = id;
      else if (k === 't') out.t = t;
      else if (k === 'n') {
        if (n !== undefined) out.n = n;
        else if (src && Object.prototype.hasOwnProperty.call(src, 'n')) out.n = clone(src.n);
      } else if (k === 'slots') {
        if (slots !== undefined) out.slots = slots;
      } else if (k === 'body') {
        if (hasBody && (src ? src.body === true || body.length > 0 : j.type !== 'garden_unknown' || body.length > 0)) out.body = body;
      } else if (k === 'else') {
        if (els !== undefined) out['else'] = els;
      } else out[k] = clone(src[k]);
    }
    // A memo that lacked a key the block now has (a body filled, a slot set): after the rest.
    if (!placed.id) out.id = id;
    if (!placed.t) out.t = t;
    if (!placed.n && n !== undefined) out.n = n;
    if (!placed.slots && slots !== undefined) out.slots = slots;
    if (!placed.body && hasBody && body.length) out.body = body;
    if (!placed['else'] && els !== undefined) out['else'] = els;
    return out;
  }

  function listOf(j) {
    var out = [];
    var guard = 0;
    while (j && guard++ < 100000) {
      var b = engineOf(j);
      if (b) out.push(b);
      j = j.next && j.next.block;
    }
    return out;
  }

  /** A Blockly workspace state → the engine program: the chain under ▶ (a block left loose is not in the program). */
  function toEngine(state) {
    var top = state && state.blocks && Array.isArray(state.blocks.blocks) ? state.blocks.blocks : [];
    var start = null;
    for (var i = 0; i < top.length; i++) if (top[i] && top[i].type === 'garden_start') start = top[i];
    return start && start.next ? listOf(start.next.block) : [];
  }

  /** Every chip REF a program's conditions and values use (the world's watch list), each once. */
  function refsIn(program) {
    var out = [];
    var seen = {};
    function add(r) {
      if (!isObj(r) || typeof r.kind !== 'string') return;
      var key = JSON.stringify(r);
      if (seen[key]) return;
      seen[key] = 1;
      out.push(clone(r));
    }
    function walkExpr(e) {
      if (!isObj(e)) return;
      if (isObj(e.thing)) add(e.thing);
      if (e.a) walkExpr(e.a);
      if (e.b) walkExpr(e.b);
    }
    function walk(list) {
      for (var i = 0; list && i < list.length; i++) {
        var b = list[i];
        if (!isObj(b)) continue;
        var s = isObj(b.slots) ? b.slots : {};
        walkExpr(s.cond);
        walkExpr(s.value);
        walkExpr(s.by);
        if (isObj(s.thing)) add(s.thing);
        walk(b.body);
        walk(b['else']);
      }
    }
    walk(readJson(program, []));
    return out;
  }

  function countStatements(list) {
    var n = 0;
    for (var i = 0; list && i < list.length; i++) {
      if (!isObj(list[i])) continue;
      n += 1 + countStatements(list[i].body) + countStatements(list[i]['else']);
    }
    return n;
  }

  var translate = { toBlockly: toBlockly, toEngine: toEngine, refsIn: refsIn, countStatements: countStatements, TYPE_OF: TYPE_OF, T_OF: T_OF, STATES: STATES, SENSORS: SENSORS };

  // ═══════════════════════════════════════════════════════════════════════════
  // The words the node draws itself (the page may send its own through Words: the iw4… keys)
  // ═══════════════════════════════════════════════════════════════════════════

  var WORDS = {
    iw4Start: { en: '{b}’s steps', fr: 'les pas de {b}' },
    iw4Times: { en: 'times', fr: 'fois' },
    iw4Else: { en: 'else', fr: 'sinon' },
    iw4Help: { en: 'Help', fr: 'Aide' },
    iw4Pick: { en: '👆 tap', fr: '👆 touche' },
    iw4PickLine: { en: 'Tap a thing on the island to put it in the block.', fr: 'Touche une chose sur l’île pour la mettre dans le bloc.' },
    iw4PickCancel: { en: 'Cancel', fr: 'Annuler' },
    iw4Full: { en: '{b}’s brain holds {n} blocks. Fold some steps into a repeat to make room.', fr: 'Le cerveau de {b} tient {n} blocs. Plie des pas dans un « répéter » pour faire de la place.' },
    iw4ZoomIn: { en: 'Bigger', fr: 'Plus grand' },
    iw4ZoomOut: { en: 'Smaller', fr: 'Plus petit' },
    iw4ZoomFit: { en: 'See all the steps', fr: 'Voir tous les pas' },
    iw4Is: { en: 'is', fr: 'est' },
    iw4CountOf: { en: 'count of', fr: 'nombre de' },
    iw4In: { en: 'in', fr: 'dans' },
    iw4LevelOf: { en: 'level of', fr: 'niveau de' },
    iw4Not: { en: 'not', fr: 'pas' },
    iw4And: { en: 'and', fr: 'et' },
    iw4Or: { en: 'or', fr: 'ou' },
    iw4Read: { en: 'what Olive read', fr: 'ce qu’Olive a lu' },
    iw4Set: { en: 'set', fr: 'mettre' },
    iw4To: { en: 'to', fr: 'à' },
    iw4Change: { en: 'change', fr: 'changer' },
    iw4By: { en: 'by', fr: 'de' },
    iw4GoNearest: { en: 'go to nearest', fr: 'aller au plus proche' },
    iw4GoTo: { en: 'go to', fr: 'aller à' },
    iw4Ask: { en: 'ask Olive', fr: 'demander à Olive' },
    iw4Sensor: { en: 'when', fr: 'quand' },
    iw4None: { en: '…', fr: '…' },
    iw4Monitor: { en: '{name} = {v}', fr: '{name} = {v}' },
    // States (brief §4.3), the words a child reads after the chip.
    iw4S_wall: { en: 'is a wall', fr: 'est un mur' },
    iw4S_nothing: { en: 'is clear', fr: 'est libre' },
    iw4S_has: { en: 'has', fr: 'contient' },
    iw4S_empty: { en: 'is empty', fr: 'est vide' },
    iw4S_full: { en: 'is full', fr: 'est plein' },
    iw4S_thirsty: { en: 'is thirsty', fr: 'a soif' },
    iw4S_drunk: { en: 'has had its drinks', fr: 'a bu ses gorgées' },
    iw4S_done: { en: 'is path', fr: 'est un chemin' },
    iw4S_dirt: { en: 'is not path yet', fr: 'n’est pas encore un chemin' },
    iw4S_stones: { en: 'has stones', fr: 'a des pierres' },
    iw4S_used: { en: 'is used up', fr: 'est épuisé' },
    iw4S_front: { en: 'is in front of me', fr: 'est devant moi' },
    // Chips: the thing a child tapped, or one of the robot's own.
    iw4C_ahead: { en: '👀 ahead', fr: '👀 devant' },
    iw4C_here: { en: '⬇️ here', fr: '⬇️ ici' },
    iw4C_held: { en: '✋ what {b} holds', fr: '✋ ce que tient {b}' },
    iw4C_robot: { en: '🤖 {b}', fr: '🤖 {b}' },
    iw4C_read: { en: '📜 what Olive read', fr: '📜 ce qu’Olive a lu' },
    iw4K_can: { en: '🪣 can', fr: '🪣 arrosoir' },
    iw4K_well: { en: '⛲ well', fr: '⛲ puits' },
    iw4K_tulip: { en: '🌷 tulip', fr: '🌷 tulipe' },
    iw4K_rock: { en: '🪨 rock', fr: '🪨 rocher' },
    iw4K_site: { en: '🟫 square', fr: '🟫 case' },
    iw4K_egg: { en: '🥚 egg', fr: '🥚 œuf' },
    iw4K_basket: { en: '🧺 basket', fr: '🧺 panier' },
    iw4K_bowl: { en: '🥣 bowl', fr: '🥣 gamelle' },
    iw4K_store: { en: '📦 store', fr: '📦 réserve' },
    iw4K_stone: { en: '🪨 stone', fr: '🪨 pierre' },
    iw4K_letter: { en: '✉️ letter', fr: '✉️ lettre' },
    iw4K_food: { en: '🍖 food', fr: '🍖 nourriture' },
    iw4K_water: { en: '💧 water', fr: '💧 eau' },
    iw4K_hen: { en: '🐔 hen', fr: '🐔 poule' },
    iw4K_postbox: { en: '📮 post box', fr: '📮 boîte aux lettres' },
    iw4K_note: { en: '📝 note', fr: '📝 mot' },
    iw4K_sign: { en: '🪧 sign', fr: '🪧 panneau' },
    // The blocks Blockly draws with no palette entry (a palette entry's own label wins).
    iw4B_fwd: { en: 'forward', fr: 'avancer' },
    iw4B_left: { en: 'turn left', fr: 'tourner à gauche' },
    iw4B_right: { en: 'turn right', fr: 'tourner à droite' },
    iw4B_water: { en: 'water', fr: 'arroser' },
    iw4B_fill: { en: 'fill', fr: 'remplir' },
    iw4B_pick: { en: 'pick up', fr: 'prendre' },
    iw4B_put: { en: 'put down', fr: 'poser' },
    iw4B_say: { en: 'say', fr: 'dire' },
    iw4B_repeat: { en: 'repeat', fr: 'répéter' },
    iw4B_until: { en: 'repeat until', fr: 'répéter jusqu’à' },
    iw4B_if: { en: 'if', fr: 'si' },
    iw4B_when: { en: 'when', fr: 'quand' },
    iw4B_count_inc: { en: 'count one', fr: 'compter un' },
    iw4B_trick: { en: 'trick', fr: 'astuce' },
    iw4B_do: { en: 'do trick', fr: 'faire l’astuce' }
  };

  function wordsOf(rows, lang) {
    var out = {};
    for (var k in WORDS) out[k] = WORDS[k][lang] || WORDS[k].en;
    var list = readJson(rows, []);
    if (Array.isArray(list)) {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r && typeof r.key === 'string' && r.key.indexOf('iw4') === 0) out[r.key] = String(r[lang] || r.en || out[r.key] || '');
      }
    }
    return out;
  }

  function fill(text, vars) {
    var s = String(text || '');
    for (var k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
    return s;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Icons — inline SVG paths (24 × 24, white on the block), drawn by a field of our own: no image, no URL
  // ═══════════════════════════════════════════════════════════════════════════

  var ICON = {
    play: [['path', 'M6 3l15 9-15 9z']],
    fwd: [['path', 'M12 3l8 9h-5v9H9v-9H4z']],
    left: [['path', 'M9 18L3 13l6-5v3h6a4 4 0 010 8h-2v-3h2a1 1 0 000-2H9v3z', 'scale(1,-1) translate(0,-26)']],
    right: [['path', 'M15 18l6-5-6-5v3H9a4 4 0 000 8h2v-3H9a1 1 0 010-2h6v3z', 'scale(1,-1) translate(0,-26)']],
    pick: [['path', 'M12 2.5l2.5 5.2 5.8.8-4.2 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.2-4 5.8-.8z']],
    put: [['path', 'M3 15h18v6H3zM10.5 2h3v7h3.5L12 14 7 9h3.5z']],
    fill: [['path', 'M5 9h10v12H5z'], ['path', 'M15 12l6-3.5v3.5l-6 3.5z'], ['path', 'M7 3h6v5H7z']],
    water: [['path', 'M12 2s7 8 7 12.5a7 7 0 01-14 0C5 10 12 2 12 2z']],
    go: [['path', 'M12 1.5a7.5 7.5 0 017.5 7.5c0 5.5-7.5 13.5-7.5 13.5S4.5 14.5 4.5 9A7.5 7.5 0 0112 1.5zm0 4.7a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z']],
    loop: [['path', 'M17 3l4 4-4 4V8.5H8a3 3 0 000 6h1.5V17H8a5.5 5.5 0 010-11h9zM7 21l-4-4 4-4v2.5h9a3 3 0 000-6h-1.5V7H16a5.5 5.5 0 010 11H7z']],
    until: [['path', 'M4 4h2v17H4z'], ['path', 'M6 4h13l-3 4 3 4H6z']],
    'if': [['path', 'M12 2l10 10-10 10L2 12zm-1.4 5v6.5h2.8V7zm0 8v2.6h2.8V15z']],
    say: [['path', 'M4 4h16a2 2 0 012 2v9a2 2 0 01-2 2H10l-5 4v-4H4a2 2 0 01-2-2V6a2 2 0 012-2z']],
    count: [['path', 'M5 4h3v16H5zM10.5 4h3v16h-3zM16 4h3v16h-3z']],
    owl: [['path', 'M12 3c5 0 8 3.5 8 8.5V20H4v-8.5C4 6.5 7 3 12 3zm-3.5 6a2.5 2.5 0 100 5 2.5 2.5 0 000-5zm7 0a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM12 14l-1.5 2h3z']],
    set: [['path', 'M4 6h16v4H4zM4 14h16v4H4z']],
    help: [['circle', '12,12,11', null, '#fff'], ['path', 'M9 9.2a3 3 0 115 2.3c-1 .7-1.6 1.2-1.6 2.6', null, 'none', '#2E2A3D'], ['circle', '12.4,17.6,1.5', null, '#2E2A3D']]
  };

  /** The icon of each engine type in a block's head. */
  var ICON_OF = {
    fwd: 'fwd', left: 'left', right: 'right', water: 'water', fill: 'fill', pick: 'pick', put: 'put', say: 'say', repeat: 'loop', until: 'until', 'if': 'if',
    when: 'if', count_inc: 'count', trick: 'loop', 'do': 'fwd', ask: 'owl', go_nearest: 'go', go_to: 'go', set: 'set', change: 'set'
  };

  /** Block styles (the theme): the page's block colours where it sends them, the mockup's otherwise. */
  var STYLE_COLOURS = {
    hat: '#E4572E', motion: '#3170E0', action: '#058149', control: '#A86501', ask: '#8059EC', sense: '#7A55E8', chip: '#4A2FA6', chipEmpty: '#D9482B', value: '#1F78B4'
  };
  var STYLE_OF = {
    fwd: 'motion', left: 'motion', right: 'motion', go_nearest: 'motion', go_to: 'motion', water: 'action', fill: 'action', pick: 'action', put: 'action',
    say: 'ask', ask: 'ask', repeat: 'control', until: 'control', 'if': 'control', when: 'control', count_inc: 'control', trick: 'ask', 'do': 'ask', set: 'value', change: 'value'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Blockly: the fields, the blocks, the kid flyout — defined once per page, reading each workspace's own context
  // ═══════════════════════════════════════════════════════════════════════════

  /** Each live editor by its main workspace id (a block reads its band, words and palette from here). */
  var CTL = {};
  var PENDING = { ctx: null };
  var DEFAULT_CTX = { band: 2, lang: 'en', palette: {}, paletteList: [], words: wordsOf(null, 'en'), showHelp: false, botName: 'Pip' };

  function mainOf(ws) {
    if (!ws) return null;
    return ws.targetWorkspace || (ws.isFlyout && ws.getFlyout && ws.getFlyout() && ws.getFlyout().targetWorkspace) || ws;
  }

  function ctlOfWs(ws) {
    var m = mainOf(ws);
    return m && CTL[m.id] ? CTL[m.id] : null;
  }

  function ctxOf(block) {
    var c = block && ctlOfWs(block.workspace);
    return c ? c.ctx : PENDING.ctx || DEFAULT_CTX;
  }

  function w(ctx, key, vars) {
    return fill(ctx.words[key] !== undefined ? ctx.words[key] : key, Object.assign({ b: ctx.botName || 'Pip' }, vars || {}));
  }

  /** A palette entry's label (already in the child's language and band), else our own word, else the type. */
  function labelOf(t, ctx) {
    var e = ctx.palette[t];
    if (e && e.label) return typeof e.label === 'object' ? e.label[ctx.lang] || e.label.en || t : String(e.label);
    var k = 'iw4B_' + t;
    return ctx.words[k] !== undefined ? ctx.words[k] : t;
  }

  /** The options of a palette slot (value, label) as [label, value] pairs; none → the fallback list. */
  function slotOptions(ctx, paletteIds, key, fallback) {
    for (var i = 0; i < paletteIds.length; i++) {
      var e = ctx.palette[paletteIds[i]];
      if (!e || !Array.isArray(e.slots)) continue;
      for (var s = 0; s < e.slots.length; s++) {
        var sl = e.slots[s];
        if (sl && sl.key === key && Array.isArray(sl.options)) {
          return sl.options.map(function (o) {
            var l = o.label && typeof o.label === 'object' ? o.label[ctx.lang] || o.label.en : o.label;
            return [String(l === undefined || l === null ? o.value : l), String(o.value)];
          });
        }
      }
    }
    return fallback;
  }

  function slotTypable(ctx, paletteIds, key) {
    if (ctx.band !== 2) return false;
    for (var i = 0; i < paletteIds.length; i++) {
      var e = ctx.palette[paletteIds[i]];
      if (!e || !Array.isArray(e.slots)) continue;
      for (var s = 0; s < e.slots.length; s++) if (e.slots[s] && e.slots[s].key === key && e.slots[s].text) return true;
    }
    return false;
  }

  function range(a, b) {
    var out = [];
    for (var i = a; i <= b; i++) out.push([String(i), String(i)]);
    return out;
  }

  function kindWord(ctx, k) {
    var key = 'iw4K_' + k;
    return ctx.words[key] !== undefined ? ctx.words[key] : k;
  }

  function chipLabel(ctx, ref) {
    if (!isObj(ref)) return w(ctx, 'iw4Pick');
    if (typeof ref.ref === 'string') return w(ctx, 'iw4C_' + ref.ref);
    // The thing's word, and its number when the world named it (tulip 2): never its tile's coordinates.
    // (An id the engine mints for a thing it reserved, kind@x,y, carries no number of its own.)
    var n = typeof ref.id === 'string' && ref.id.indexOf('@') === -1 ? (ref.id.match(/(\d+)$/) || [])[1] : '';
    return kindWord(ctx, ref.kind) + (n ? ' ' + n : '');
  }

  var defined = null;

  /** Define the fields, the blocks and the flyout on this Blockly (once). Returns the classes the editor uses. */
  function defineBlocks(Bk) {
    if (Bk.__gardenKit) return Bk.__gardenKit;

    /** An icon drawn from path data (white on the block). A `?` icon is tappable and opens the block's card. */
    class FieldIcon extends Bk.Field {
      constructor(name, size, onTap) {
        super(Bk.Field.SKIP_SETUP);
        this.icon_ = name;
        this.px_ = size;
        this.onTap_ = onTap || null;
        this.SERIALIZABLE = false;
        this.EDITABLE = !!onTap;
        this.size_ = new Bk.utils.Size(size, size);
        this.value_ = name;
      }
      initView() {
        var g = Bk.utils.dom.createSvgElement('g', { transform: 'scale(' + this.px_ / 24 + ')', class: 'gd-icon gd-icon-' + this.icon_ }, this.fieldGroup_);
        var parts = ICON[this.icon_] || [];
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (p[0] === 'circle') {
            var c = p[1].split(',');
            Bk.utils.dom.createSvgElement('circle', { cx: c[0], cy: c[1], r: c[2], fill: p[3] || '#fff' }, g);
          } else {
            var attrs = { d: p[1], fill: p[3] || '#fff' };
            if (p[2]) attrs.transform = p[2];
            if (p[4]) {
              attrs.stroke = p[4];
              attrs['stroke-width'] = '2.4';
              attrs['stroke-linecap'] = 'round';
            }
            Bk.utils.dom.createSvgElement('path', attrs, g);
          }
        }
      }
      updateSize_() {
        this.size_ = new Bk.utils.Size(this.px_, this.px_);
      }
      render_() {
        this.updateSize_();
      }
      getText_() {
        return '';
      }
      isClickable() {
        return !!this.onTap_;
      }
      showEditor_() {
        if (this.onTap_) this.onTap_(this);
      }
      doClassValidation_(v) {
        return v;
      }
    }

    /**
     * A slot a child fills by picking, never by typing at 7–9: a tap opens OUR picker (big buttons, `.gd-picker .gd-opt`)
     * under the field. Any text is a valid value (a stored program keeps a value the list no longer offers).
     */
    class KidPick extends Bk.Field {
      constructor(value, options, key, typable) {
        super(value === undefined || value === null ? '' : String(value));
        this.options_ = options;
        this.slotKey_ = key;
        this.typable_ = typable || null;
        this.SERIALIZABLE = true;
        this.EDITABLE = true;
      }
      doClassValidation_(v) {
        return v === undefined || v === null ? null : String(v);
      }
      optionsList() {
        var raw = typeof this.options_ === 'function' ? this.options_.call(this, this.getSourceBlock()) : this.options_;
        var list = Array.isArray(raw) ? raw.slice() : [];
        var v = this.getValue();
        if (v !== null && v !== '' && !list.some(function (o) { return o[1] === v; })) list.push([v, v]);
        return list;
      }
      getText_() {
        var v = this.getValue();
        if (v === null || v === '') return '…';
        var list = this.optionsList();
        for (var i = 0; i < list.length; i++) if (list[i][1] === v) return list[i][0];
        return String(v);
      }
      isClickable() {
        var b = this.getSourceBlock();
        return !!b && !b.isInFlyout && b.isEditable() && !b.workspace.isReadOnly();
      }
      showEditor_() {
        var c = ctlOfWs(this.getSourceBlock() && this.getSourceBlock().workspace);
        if (c) c.openPicker(this);
      }
    }

    var ctx0 = function (b) {
      return ctxOf(b);
    };

    function iconSize(ctx) {
      return ctx.band === 1 ? 30 : 24;
    }

    function helpField(block, input, t) {
      var ctx = ctx0(block);
      if (!block.isInFlyout || !ctx.showHelp) return;
      input.appendField(new FieldIcon('help', 22, function () {
        var c = ctlOfWs(block.workspace);
        if (c) c.help(block);
      }), 'Q');
    }

    function head(block, t, input) {
      var ctx = ctx0(block);
      input.appendField(new FieldIcon(ICON_OF[t] || 'fwd', iconSize(ctx)), 'ICON');
      input.appendField(new Bk.FieldLabel(labelOf(t, ctx)), 'WORD');
    }

    function statement(block, t) {
      block.setPreviousStatement(true);
      block.setNextStatement(true);
      block.setStyle((STYLE_OF[t] || 'motion') + '_blocks');
    }

    /** A block that keeps its engine memo (extraState.src) and any extras a type adds. */
    function withMemo(def, extraSave, extraLoad) {
      def.saveExtraState = function () {
        var s = this.src_ ? { src: clone(this.src_) } : {};
        if (extraSave) extraSave.call(this, s);
        return Object.keys(s).length ? s : null;
      };
      def.loadExtraState = function (s) {
        this.src_ = s && isObj(s.src) ? clone(s.src) : null;
        if (extraLoad) extraLoad.call(this, s || {});
      };
      return def;
    }

    function simple(type, t) {
      Bk.Blocks[type] = withMemo({
        init: function () {
          var hd = this.appendDummyInput('HEAD');
          head(this, t, hd);
          helpField(this, hd, t);
          statement(this, t);
        }
      });
    }
    simple('garden_forward', 'fwd');
    simple('garden_turn_left', 'left');
    simple('garden_turn_right', 'right');
    simple('garden_water', 'water');
    simple('garden_fill', 'fill');
    simple('garden_pick', 'pick');
    simple('garden_put', 'put');
    simple('garden_count_inc', 'count_inc');
    simple('garden_ask', 'ask');

    Bk.Blocks.garden_start = {
      init: function () {
        var ctx = ctx0(this);
        var hd = this.appendDummyInput('HEAD');
        hd.appendField(new FieldIcon('play', iconSize(ctx)), 'ICON');
        hd.appendField(new Bk.FieldLabel(w(ctx, 'iw4Start')), 'WORD');
        this.setNextStatement(true);
        this.setStyle('hat_blocks');
        this.setDeletable(false);
        this.hat = 'cap';
      }
    };

    function picker(type, t, field, key, options, paletteIds, typableKey) {
      Bk.Blocks[type] = withMemo({
        init: function () {
          var ctx = ctx0(this);
          var hd = this.appendDummyInput('HEAD');
          head(this, t, hd);
          hd.appendField(new KidPick('', function () { return options(ctxOf(this.getSourceBlock ? this.getSourceBlock() : null)); }, key, typableKey ? function () { return slotTypable(ctxOf(this.getSourceBlock()), paletteIds, typableKey); } : null), field);
          helpField(this, hd, t);
          statement(this, t);
          void ctx;
        }
      });
    }
    picker('garden_say', 'say', 'TEXT', 'text', function (ctx) { return slotOptions(ctx, ['say'], 'text', [['thanksMamie', 'thanksMamie'], ['thanksSami', 'thanksSami'], ['thanksBiscuit', 'thanksBiscuit']]); }, ['say'], 'text');
    picker('garden_do', 'do', 'NAME', 'name', function (ctx) { return slotOptions(ctx, ['do', 'trick'], 'name', [['row', 'row'], ['hop', 'hop'], ['zigzag', 'zigzag']]); }, ['do']);
    picker('garden_go_nearest', 'go_nearest', 'KIND', 'kind', function (ctx) { return SEEK_KINDS.map(function (k) { return [kindWord(ctx, k), k]; }); }, ['go_nearest']);

    function container(type, t, field, key, options) {
      Bk.Blocks[type] = withMemo({
        init: function () {
          var hd = this.appendDummyInput('HEAD');
          head(this, t, hd);
          if (field) hd.appendField(new KidPick('', function () { return options(ctxOf(this.getSourceBlock())); }, key), field);
          if (t === 'repeat') hd.appendField(new Bk.FieldLabel(ctx0(this).band === 1 ? '×' : w(ctx0(this), 'iw4Times')), 'TIMES');
          helpField(this, hd, t);
          this.appendStatementInput('DO');
          statement(this, t);
        }
      });
    }
    container('garden_repeat', 'repeat', 'N', 'n', function () { return range(1, 9); });
    container('garden_when', 'when', 'EVENT', 'event', function (ctx) { return slotOptions(ctx, ['when'], 'event', [['meow', 'meow']]); });
    container('garden_trick', 'trick', 'NAME', 'name', function (ctx) { return slotOptions(ctx, ['trick', 'do'], 'name', [['row', 'row'], ['hop', 'hop'], ['zigzag', 'zigzag']]); });

    function cond(type, t, withElse) {
      Bk.Blocks[type] = withMemo({
        init: function () {
          var hd = this.appendValueInput('COND').setCheck('Boolean');
          head(this, t, hd);
          if (this.isInFlyout && ctx0(this).showHelp) helpField(this, this.appendDummyInput('QI'), t);
          this.setInputsInline(true);
          this.appendStatementInput('DO');
          if (withElse) {
            this.appendDummyInput('ELSEW').appendField(new Bk.FieldLabel(w(ctx0(this), 'iw4Else')), 'ELSEWORD');
            this.appendStatementInput('ELSE');
          }
          statement(this, t);
        }
      });
    }
    cond('garden_until', 'until', false);
    cond('garden_if', 'if', false);
    cond('garden_if_else', 'if', true);

    Bk.Blocks.garden_go_to = withMemo({
      init: function () {
        var hd = this.appendValueInput('THING').setCheck('Thing');
        head(this, 'go_to', hd);
        if (this.isInFlyout && ctx0(this).showHelp) helpField(this, this.appendDummyInput('QI'), 'go_to');
        this.setInputsInline(true);
        statement(this, 'go_to');
      }
    });

    function setter(type, t, wordKey, input, inWord) {
      Bk.Blocks[type] = withMemo({
        init: function () {
          var ctx = ctx0(this);
          var hd = this.appendDummyInput('HEAD');
          hd.appendField(new FieldIcon('set', iconSize(ctx)), 'ICON');
          hd.appendField(new Bk.FieldLabel(w(ctx, wordKey)), 'WORD');
          hd.appendField(new KidPick('', function () { return VAR_NAMES.map(function (n) { return [n, n]; }); }, 'name', function () { return ctxOf(this.getSourceBlock()).band === 2; }), 'NAME');
          this.appendValueInput(input).setCheck(['Number', 'String']).appendField(new Bk.FieldLabel(w(ctx, inWord)), 'INWORD');
          if (this.isInFlyout && ctx.showHelp) helpField(this, this.appendDummyInput('QI'), t);
          this.setInputsInline(true);
          statement(this, t);
        }
      });
    }
    setter('garden_set', 'set', 'iw4Set', 'VALUE', 'iw4To');
    setter('garden_change', 'change', 'iw4Change', 'BY', 'iw4By');

    /** Olive's blocks (`olive:<rung>`): the rung and the fields its slots need arrive in the extraState, before the fields load. */
    Bk.Blocks.garden_olive = {
      init: function () {
        this.rung_ = '';
        this.keys_ = [];
        this.src_ = null;
        var hd = this.appendDummyInput('HEAD');
        hd.appendField(new FieldIcon('owl', iconSize(ctx0(this))), 'ICON');
        hd.appendField(new Bk.FieldLabel(''), 'WORD');
        statement(this, 'ask');
      },
      saveExtraState: function () {
        var s = { rung: this.rung_, keys: this.keys_.slice() };
        if (this.src_) s.src = clone(this.src_);
        return s;
      },
      loadExtraState: function (s) {
        s = s || {};
        this.src_ = isObj(s.src) ? clone(s.src) : null;
        this.rung_ = String(s.rung || '');
        this.keys_ = Array.isArray(s.keys) ? s.keys.map(String) : [];
        var ctx = ctx0(this);
        var t = OLIVE_PREFIX + this.rung_;
        this.getField('WORD').setValue(labelOf(t, ctx));
        var hd = this.getInput('HEAD');
        var self = this;
        this.keys_.forEach(function (k) {
          if (self.getField('S_' + k)) return;
          hd.appendField(new KidPick('', function () { return slotOptions(ctxOf(this.getSourceBlock()), [t], k, []); }, k, function () { return slotTypable(ctxOf(this.getSourceBlock()), [t], k); }), 'S_' + k);
        });
        if (this.isInFlyout && ctx.showHelp && !this.getField('Q')) helpField(this, hd, t);
      }
    };

    /** A block of a type this kit does not know: its engine block rides whole, so nothing a program holds is lost. */
    Bk.Blocks.garden_unknown = {
      init: function () {
        this.t_ = '';
        this.src_ = null;
        var hd = this.appendDummyInput('HEAD');
        hd.appendField(new FieldIcon('pick', iconSize(ctx0(this))), 'ICON');
        hd.appendField(new Bk.FieldLabel('?'), 'WORD');
        this.appendStatementInput('DO');
        statement(this, 'ask');
      },
      saveExtraState: function () {
        var s = { t: this.t_ };
        if (this.src_) s.src = clone(this.src_);
        return s;
      },
      loadExtraState: function (s) {
        s = s || {};
        this.src_ = isObj(s.src) ? clone(s.src) : null;
        this.t_ = String(s.t || '');
        this.getField('WORD').setValue(labelOf(this.t_, ctx0(this)));
      }
    };

    // ── Conditions and values ──────────────────────────────────────────────

    function value(type, output, style, build, extraSave, extraLoad) {
      Bk.Blocks[type] = {
        init: function () {
          build.call(this, ctx0(this));
          this.setOutput(true, output);
          this.setStyle(style + '_blocks');
          this.setInputsInline(true);
        },
        saveExtraState: extraSave || undefined,
        loadExtraState: extraLoad || undefined
      };
      if (!extraSave) delete Bk.Blocks[type].saveExtraState;
      if (!extraLoad) delete Bk.Blocks[type].loadExtraState;
    }

    function sensorOptions(ctx) {
      var list = slotOptions(ctx, ['until', 'if'], 'sensor', null);
      if (list) return list;
      return SENSORS.map(function (s) { return [s.replace(/_/g, ' '), s]; });
    }

    value('garden_sensor', 'Boolean', 'sense', function (ctx) {
      this.es_ = {};
      var hd = this.appendDummyInput('S');
      hd.appendField(new KidPick('', function () { return sensorOptions(ctxOf(this.getSourceBlock())); }, 'sensor'), 'SENSOR');
      hd.appendField(new KidPick('1', function () { return range(1, 9); }, 'arg'), 'ARG');
      this.getField('ARG').setVisible(false);
      if (this.isInFlyout && ctx.showHelp) helpField(this, hd, 'sensor');
    }, function () {
      return Object.keys(this.es_ || {}).length ? clone(this.es_) : null;
    }, function (s) {
      this.es_ = isObj(s) ? clone(s) : {};
    });

    value('garden_is', 'Boolean', 'sense', function (ctx) {
      this.kind_ = null;
      this.appendValueInput('THING').setCheck('Thing');
      var s = this.appendDummyInput('S');
      s.appendField(new KidPick('', function () {
        var b = this.getSourceBlock();
        var c = ctxOf(b);
        return statesOf(b && b.kind_).map(function (id) { return [c.words['iw4S_' + id] || id, id]; });
      }, 'state'), 'STATE');
      s.appendField(new KidPick('1', function () { return range(0, 9); }, 'n'), 'N');
      s.appendField(new KidPick('', function () { var c = ctxOf(this.getSourceBlock()); return WHAT_KINDS.map(function (k) { return [kindWord(c, k), k]; }); }, 'what'), 'WHAT');
      this.getField('N').setVisible(false);
      this.getField('WHAT').setVisible(false);
      if (this.isInFlyout && ctx.showHelp) helpField(this, s, 'is');
    }, function () {
      return this.kind_ ? { kind: this.kind_ } : null;
    }, function (s) {
      this.kind_ = s && s.kind ? String(s.kind) : null;
    });

    value('garden_thing', 'Thing', 'chipEmpty', function (ctx) {
      this.ref_ = null;
      this.appendDummyInput('C').appendField(new Bk.FieldLabel(chipLabel(ctx, null)), 'LABEL');
      this.setOutputShape(2);
    }, function () {
      return this.ref_ ? clone(this.ref_) : null;
    }, function (s) {
      this.setThing(s);
    });
    Bk.Blocks.garden_thing.setThing = function (ref) {
      this.ref_ = isObj(ref) && Object.keys(ref).length ? clone(ref) : null;
      this.getField('LABEL').setValue(chipLabel(ctx0(this), this.ref_));
      this.setStyle(this.ref_ ? 'chip_blocks' : 'chipEmpty_blocks');
    };

    value('garden_count', 'Number', 'value', function (ctx) {
      var hd = this.appendDummyInput('H');
      hd.appendField(new Bk.FieldLabel(w(ctx, 'iw4CountOf')), 'WORD');
      hd.appendField(new KidPick('', function () { var c = ctxOf(this.getSourceBlock()); return WHAT_KINDS.map(function (k) { return [kindWord(c, k), k]; }); }, 'what'), 'WHAT');
      hd.appendField(new Bk.FieldLabel(w(ctx, 'iw4In')), 'IN');
      this.appendValueInput('THING').setCheck('Thing');
      if (this.isInFlyout && ctx.showHelp) helpField(this, this.appendDummyInput('QI'), 'count');
    });
    value('garden_level', 'Number', 'value', function (ctx) {
      this.appendDummyInput('H').appendField(new Bk.FieldLabel(w(ctx, 'iw4LevelOf')), 'WORD');
      this.appendValueInput('THING').setCheck('Thing');
      if (this.isInFlyout && ctx.showHelp) helpField(this, this.appendDummyInput('QI'), 'level');
    });
    value('garden_compare', 'Boolean', 'sense', function (ctx) {
      this.appendValueInput('A').setCheck(['Number', 'String']);
      this.appendDummyInput('O').appendField(new KidPick('eq', [['=', 'eq'], ['<', 'lt'], ['>', 'gt']], 'cmp'), 'OP');
      this.appendValueInput('B').setCheck(['Number', 'String']);
      if (this.isInFlyout && ctx.showHelp) helpField(this, this.appendDummyInput('QI'), 'compare');
    });
    value('garden_logic', 'Boolean', 'sense', function (ctx) {
      this.appendValueInput('A').setCheck('Boolean');
      this.appendDummyInput('O').appendField(new KidPick('and', function () { var c = ctxOf(this.getSourceBlock()); return [[c.words.iw4And, 'and'], [c.words.iw4Or, 'or']]; }, 'logic'), 'OP');
      this.appendValueInput('B').setCheck('Boolean');
      void ctx;
    });
    value('garden_not', 'Boolean', 'sense', function (ctx) {
      this.appendValueInput('A').setCheck('Boolean').appendField(new Bk.FieldLabel(w(ctx, 'iw4Not')), 'WORD');
    });
    value('garden_number', 'Number', 'value', function () {
      this.appendDummyInput('V').appendField(new KidPick('0', function () { return range(0, 20); }, 'num', function () { return ctxOf(this.getSourceBlock()).band === 2; }), 'NUM');
      this.setOutputShape(2);
    });
    value('garden_text', 'String', 'value', function () {
      this.appendDummyInput('V').appendField(new KidPick('', function () { return TEXT_WORDS.map(function (s) { return [s, s]; }); }, 'text', function () { return true; }), 'TEXT');
      this.setOutputShape(2);
    });
    value('garden_var', 'Number', 'value', function () {
      this.appendDummyInput('V').appendField(new KidPick('', function () { return VAR_NAMES.map(function (n) { return [n, n]; }); }, 'name', function () { return ctxOf(this.getSourceBlock()).band === 2; }), 'NAME');
      this.setOutputShape(2);
    });
    value('garden_read', 'String', 'value', function (ctx) {
      this.appendDummyInput('V').appendField(new FieldIcon('owl', 20), 'ICON').appendField(new Bk.FieldLabel(w(ctx, 'iw4Read')), 'WORD');
      this.setOutputShape(2);
    });
    function opaque(type, output) {
      value(type, output, 'value', function () {
        this.v_ = null;
        this.appendDummyInput('V').appendField(new Bk.FieldLabel('?'), 'WORD');
      }, function () {
        return { v: clone(this.v_) };
      }, function (s) {
        this.v_ = s && s.v !== undefined ? clone(s.v) : null;
        this.getField('WORD').setValue(this.v_ && this.v_.op ? String(this.v_.op) : '?');
      });
    }
    opaque('garden_expr', 'Boolean');
    opaque('garden_expr_val', null);

    // ── The drawer: it keeps its own scale (IW-000 §6: at a child's zoom the drawer would eat half the workspace) ──
    class KidFlyout extends Bk.VerticalFlyout {
      getFlyoutScale() {
        var c = ctlOfWs(this.targetWorkspace);
        return c ? c.flyoutScale() : 0.8;
      }
      /** A block dragged out gets the next numeric ids of the program it lands in (every block in it, children too). */
      serializeBlock(block) {
        var json = super.serializeBlock(block);
        var c = ctlOfWs(this.targetWorkspace);
        if (c) c.freshIds(json);
        return json;
      }
    }
    Bk.registry.register(Bk.registry.Type.FLYOUTS_VERTICAL_TOOLBOX, 'gardenKidFlyout', KidFlyout, true);
    /** On a narrow workspace (a phone) the drawer is a strip along the top, so the program keeps the whole width. */
    class KidFlyoutH extends Bk.HorizontalFlyout {
      getFlyoutScale() {
        var c = ctlOfWs(this.targetWorkspace);
        return c ? c.flyoutScale() : 0.62;
      }
      serializeBlock(block) {
        var json = super.serializeBlock(block);
        var c = ctlOfWs(this.targetWorkspace);
        if (c) c.freshIds(json);
        return json;
      }
    }
    Bk.registry.register(Bk.registry.Type.FLYOUTS_HORIZONTAL_TOOLBOX, 'gardenKidFlyoutH', KidFlyoutH, true);

    // ── No menu a child can break anything with (IW-004 §2): only Help and Duplicate. Every other item is unregistered;
    // Duplicate is ours (the copy gets the next whole-number ids and stays under the brain size), in Blockly's own word.
    (function trimMenus() {
      var reg = Bk.ContextMenuRegistry && Bk.ContextMenuRegistry.registry;
      if (!reg || !reg.registeredItems) return;
      Array.from(reg.registeredItems.keys()).forEach(function (id) {
        try {
          reg.unregister(id);
        } catch (e) {
          /* gone already */
        }
      });
      var BLOCK = Bk.ContextMenuRegistry.ScopeType.BLOCK;
      reg.register({
        id: 'gardenHelp',
        weight: 0,
        scopeType: BLOCK,
        displayText: function (scope) {
          return ctxOf(scope.block).words.iw4Help || 'Help';
        },
        preconditionFn: function (scope) {
          return scope.block && /^garden_/.test(scope.block.type) && scope.block.type !== 'garden_start' ? 'enabled' : 'hidden';
        },
        callback: function (scope) {
          var c = ctlOfWs(scope.block.workspace);
          if (c) c.help(scope.block);
        }
      });
      reg.register({
        id: 'gardenDuplicate',
        weight: 1,
        scopeType: BLOCK,
        displayText: function () {
          return Bk.Msg.DUPLICATE_BLOCK || 'Duplicate';
        },
        preconditionFn: function (scope) {
          var b = scope.block;
          if (!b || b.isInFlyout || !b.isDeletable() || !b.isMovable() || b.type === 'garden_start') return 'hidden';
          var c = ctlOfWs(b.workspace);
          return c && c.canCopy(b) ? 'enabled' : 'disabled';
        },
        callback: function (scope) {
          var c = ctlOfWs(scope.block.workspace);
          if (c) c.duplicate(scope.block);
        }
      });
    })();

    defined = { FieldIcon: FieldIcon, KidPick: KidPick, KidFlyout: KidFlyout };
    Bk.__gardenKit = defined;
    return defined;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The drawer (a flyout toolbox) from the palette, band by band
  // ═══════════════════════════════════════════════════════════════════════════

  /** The palette id a drawer block stands for (a drive's and the card's name for it). */
  function palIdOf(json) {
    if (!json) return '';
    if (json.type === 'garden_olive') return OLIVE_PREFIX + ((json.extraState && json.extraState.rung) || '');
    if (json.type === 'garden_if_else') return 'if:else';
    if (json.type === 'garden_thing') return 'thing' + (json.extraState && json.extraState.ref ? ':' + json.extraState.ref : '');
    if (T_OF[json.type]) return T_OF[json.type];
    return json.type.replace(/^garden_/, '');
  }

  function drawerBlock(entry) {
    var id = String(entry.id);
    if (id.indexOf(OLIVE_PREFIX) === 0) {
      return { kind: 'block', type: 'garden_olive', extraState: { rung: id.slice(OLIVE_PREFIX.length), keys: (entry.slots || []).map(function (s) { return String(s.key); }) } };
    }
    var type = TYPE_OF[id];
    if (!type) return { kind: 'block', type: 'garden_unknown', extraState: { t: id } };
    var j = { kind: 'block', type: type };
    if (type === 'garden_repeat') j.fields = { N: '3' };
    if (COND_TYPES[type]) j.inputs = { COND: { shadow: { type: 'garden_sensor', fields: { SENSOR: '', ARG: '1' } } } };
    if (type === 'garden_go_to') j.inputs = { THING: { shadow: { type: 'garden_thing' } } };
    if (type === 'garden_go_nearest') j.fields = { KIND: 'egg' };
    if (type === 'garden_set') j.inputs = { VALUE: { shadow: { type: 'garden_number', fields: { NUM: '0' } } } };
    if (type === 'garden_change') j.inputs = { BY: { shadow: { type: 'garden_number', fields: { NUM: '1' } } } };
    return j;
  }

  /**
   * The drawer: every palette block (the page's band × request × robot list), then — at 10–12, when the drawer has a
   * condition block — the if/else, the sensor, a thing chip and its state, and the value blocks. At 7–9 none of them.
   */
  function toolboxOf(ctx) {
    var list = ctx.paletteList;
    var contents = [];
    var hasCond = false;
    var hasIf = false;
    var hasRead = false;
    var hasVars = false;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || typeof e.id !== 'string') continue;
      contents.push(drawerBlock(e));
      if (e.id === 'until' || e.id === 'if') hasCond = true;
      if (e.id === 'if') hasIf = true;
      if (e.id === 'olive:read') hasRead = true;
      if (e.id === 'set' || e.id === 'change') hasVars = true;
      if (e.id === 'if' && ctx.band === 2) contents.push({ kind: 'block', type: 'garden_if_else', inputs: { COND: { shadow: { type: 'garden_sensor', fields: { SENSOR: '', ARG: '1' } } } } });
    }
    if (ctx.band === 2 && hasCond) {
      contents.push({ kind: 'sep', gap: 20 });
      contents.push({ kind: 'block', type: 'garden_sensor', fields: { SENSOR: '', ARG: '1' } });
      contents.push({ kind: 'block', type: 'garden_is', inputs: { THING: { shadow: { type: 'garden_thing' } } } });
      contents.push({ kind: 'block', type: 'garden_thing' });
      contents.push({ kind: 'block', type: 'garden_thing', extraState: { ref: 'ahead' } });
      contents.push({ kind: 'block', type: 'garden_thing', extraState: { ref: 'here' } });
      contents.push({ kind: 'block', type: 'garden_thing', extraState: { ref: 'held' } });
      if (hasRead) contents.push({ kind: 'block', type: 'garden_thing', extraState: { ref: 'read' } });
      contents.push({ kind: 'block', type: 'garden_count', inputs: { THING: { shadow: { type: 'garden_thing' } } } });
      contents.push({ kind: 'block', type: 'garden_level', inputs: { THING: { shadow: { type: 'garden_thing' } } } });
      contents.push({ kind: 'block', type: 'garden_compare', inputs: { A: { shadow: { type: 'garden_number', fields: { NUM: '0' } } }, B: { shadow: { type: 'garden_number', fields: { NUM: '4' } } } } });
      contents.push({ kind: 'block', type: 'garden_number', fields: { NUM: '4' } });
      contents.push({ kind: 'block', type: 'garden_logic' });
      contents.push({ kind: 'block', type: 'garden_not' });
      if (hasRead) contents.push({ kind: 'block', type: 'garden_read' });
      if (hasVars) contents.push({ kind: 'block', type: 'garden_var', fields: { NAME: 'count' } });
    }
    void hasIf;
    return { kind: 'flyoutToolbox', contents: contents };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The editor: one injected workspace, held for the node's life (a React render never remounts it)
  // ═══════════════════════════════════════════════════════════════════════════

  var BLOCKS_CSS =
    '.gd-bk{position:relative;display:block;width:100%;height:100%;min-height:420px;font-family:inherit;color:#2E2A3D;-webkit-tap-highlight-color:transparent;touch-action:none}\n' +
    // Its own layer, its own paint: the world beside it animates every frame (Garden 3D on a software renderer measured
    // its frame rule tripping while the workspace repainted with it).
    '.gd-bk-host{position:absolute;inset:0;border-radius:14px;overflow:hidden;contain:strict;will-change:transform}\n' +
    '.gd-bk .blocklyMainBackground{stroke:none}\n' +
    '.gd-bk .blocklyText{font-weight:700}\n' +
    '.gd-bk .blocklyFlyoutBackground{fill-opacity:1}\n' +
    // The running block: Blockly's own highlight plus the ink ring over a white halo (P106 D5, ≥ 3:1 on every ground).
    '.gd-bk .gd-run>.blocklyPath{stroke:var(--gd-run,#2E2A3D)!important;stroke-width:4px!important;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 2px #fff)}\n' +
    '.gd-bk .gd-sel>.blocklyPath{stroke:var(--gd-sel,#A86501);stroke-width:3px}\n' +
    '.gd-bk .gd-slot{cursor:pointer}\n' +
    '.gd-bk-zoom{position:absolute;right:18px;bottom:18px;display:flex;flex-direction:column;gap:6px;z-index:3}\n' +
    '.gd-bk.gd-narrow .gd-bk-zoom{top:10px;bottom:auto;flex-direction:row}\n' +
    '.gd-bk-zoom button{width:40px;height:40px;border-radius:12px;border:0;background:#fff;color:#2E2A3D;font:800 20px/40px inherit;font-family:inherit;padding:0;box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer;touch-action:manipulation}\n' +
    '.gd-bk .gd-picker{position:fixed;z-index:60;display:flex;flex-wrap:wrap;gap:6px;padding:8px;border-radius:14px;background:#EEE8FF;box-shadow:0 8px 24px rgba(0,0,0,.2);max-width:340px}\n' +
    '.gd-bk .gd-opt{border:0;border-radius:999px;background:#fff;color:#4A2FA6;font-weight:800;font-family:inherit;font-size:15px;padding:9px 14px;min-height:40px;cursor:pointer;touch-action:manipulation}\n' +
    '.gd-bk .gd-opt[aria-pressed="true"]{background:#4A2FA6;color:#fff}\n' +
    '.gd-bk .gd-slot-text{font:inherit;font-weight:700;font-size:15px;padding:8px 10px;border-radius:10px;border:2px solid #D8CCF5;flex:1 1 180px;min-width:0}\n' +
    '.gd-bk-line{position:absolute;left:12px;right:12px;top:12px;z-index:4;padding:10px 12px;border-radius:12px;background:#FFF0DA;color:#2E2A3D;font-weight:800;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,.15);display:flex;gap:10px;align-items:center}\n' +
    '.gd-bk-line button{border:0;border-radius:999px;background:#fff;color:#4A2FA6;font:800 14px inherit;font-family:inherit;padding:6px 12px;cursor:pointer}\n' +
    '.gd-bk.gd-picking .gd-bk-host{box-shadow:inset 0 0 0 4px #8F6BFF}\n' +
    '.gd-bk.gd-locked .blocklyFlyout{opacity:.55}\n' +
    '.gd-bk .blocklyZoom,.gd-bk .blocklyTrash{display:none}\n' +
    '.gd-bk-empty{padding:18px 10px;color:#6E6784;font-weight:700}\n' +
    '@media (prefers-reduced-motion: reduce){.gd-bk *{transition:none!important;animation:none!important}}';

  /** A colour port: `var(--token)` is read off the page (Blockly's theme needs the colour itself); junk → the fallback. */
  function resolveColour(v, el, fallback) {
    if (typeof v !== 'string' || !v) return fallback;
    var m = /^var\((--[a-z0-9-]+)\)$/i.exec(v.trim());
    if (m) {
      if (!el || typeof getComputedStyle !== 'function') return fallback;
      var got = getComputedStyle(el).getPropertyValue(m[1]).trim();
      return /^#[0-9a-f]{3,8}$/i.test(got) ? got : fallback;
    }
    return /^#[0-9a-f]{3,8}$/i.test(v.trim()) ? v.trim() : fallback;
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1).length === 3 ? hex.slice(1).replace(/(.)/g, '$1$1') : hex.slice(1, 7), 16);
    var c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); });
    return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }

  /** The kids' messages: Blockly's own (EN/FR, vendored) under ours. */
  function messagesOf(Bk, lang) {
    if (!Bk.gardenMsgEn && Bk.Msg) Bk.gardenMsgEn = Object.assign({}, Bk.Msg);
    return lang === 'fr' && Bk.gardenMsgFr ? Bk.gardenMsgFr : Bk.gardenMsgEn || Bk.Msg;
  }

  var nextEditor = 1;

  /**
   * One editor on one host element. `env` gives the node's latest props (read on every call) and its outputs.
   * Returns { update(), destroy(), api } — `api` is also on the root element as `__gardenBlocks` for the drives.
   */
  function createEditor(Bk, root, host, env) {
    var kit = defineBlocks(Bk);
    var ed = { id: nextEditor++, ctx: null, ws: null, lastEmitted: null, loading: false, locked: false, lastAdded: null, selected: '', runningId: '', picking: '', key: '' };

    function props() {
      return env.props() || {};
    }

    function makeCtx() {
      var p = props();
      var list = readJson(p.palette, []);
      if (!Array.isArray(list)) list = [];
      var map = {};
      for (var i = 0; i < list.length; i++) if (list[i] && typeof list[i].id === 'string') map[list[i].id] = list[i];
      var lang = p.language === 'fr' ? 'fr' : 'en';
      return { band: Number(p.band) === 1 ? 1 : 2, lang: lang, palette: map, paletteList: list, words: wordsOf(p.words, lang), showHelp: flag(p.showHelp, false), botName: String(p.botName || 'Pip'), brain: Math.max(0, Math.floor(Number(p.brainSize) || 0)) };
    }

    /** A workspace under 380 px wide (a phone) is narrow: the drawer is a strip (IW-000: at 400 px a side drawer ate 60 %). */
    function isNarrow() {
      var wdt = root && root.clientWidth ? root.clientWidth : typeof window !== 'undefined' ? window.innerWidth : 1024;
      return wdt > 0 && wdt < 380;
    }
    ed.narrow = isNarrow();
    ed.flyoutScale = function () {
      return ed.narrow ? 0.62 : ed.ctx && ed.ctx.band === 1 ? 0.84 : 0.74;
    };

    function theme() {
      var p = props();
      var cols = Object.assign({}, STYLE_COLOURS);
      cols.motion = resolveColour(p.motionColor, root, cols.motion);
      cols.action = resolveColour(p.actionColor, root, cols.action);
      cols.control = resolveColour(p.controlColor, root, cols.control);
      cols.ask = resolveColour(p.askColor, root, cols.ask);
      var styles = {};
      for (var k in cols) styles[k + '_blocks'] = { colourPrimary: cols[k], colourSecondary: shade(cols[k], 0.9), colourTertiary: shade(cols[k], 0.72) };
      return Bk.Theme.defineTheme('gardenKit' + ed.id + '_' + Object.keys(cols).map(function (k) { return cols[k].slice(1); }).join(''), {
        base: Bk.Themes.Classic,
        blockStyles: styles,
        componentStyles: { workspaceBackgroundColour: '#FFFDF6', toolboxBackgroundColour: '#FFF0D3', flyoutBackgroundColour: '#FFF0D3', flyoutOpacity: 1, scrollbarColour: '#D9C9A6', scrollbarOpacity: 0.7, insertionMarkerColour: '#2E2A3D', insertionMarkerOpacity: 0.3, cursorColour: '#2E2A3D' },
        fontStyle: { family: 'Fredoka, Nunito, sans-serif', weight: '600', size: 14 },
        startHats: true
      });
    }

    // ── ids: a block made here gets the next whole number of the program (the page's Teach and fold count that way) ──
    function maxId() {
      var m = 0;
      if (!ed.ws) return m;
      var all = ed.ws.getAllBlocks(false);
      for (var i = 0; i < all.length; i++) {
        var n = Number(all[i].id);
        if (/^\d+$/.test(all[i].id) && n > m) m = n;
      }
      return m;
    }
    ed.freshIds = function (json) {
      var next = maxId();
      (function walk(j) {
        if (!j || typeof j !== 'object') return;
        if (j.type) j.id = String(++next);
        if (j.extraState && j.extraState.src) delete j.extraState.src;
        if (j.next) walk(j.next.block);
        if (j.inputs) for (var k in j.inputs) {
          walk(j.inputs[k].block);
          walk(j.inputs[k].shadow);
        }
      })(json);
      return json;
    };

    function startBlock() {
      if (!ed.ws) return null;
      var top = ed.ws.getTopBlocks(false);
      for (var i = 0; i < top.length; i++) if (top[i].type === 'garden_start') return top[i];
      return null;
    }

    function current() {
      return JSON.stringify(toEngine(Bk.serialization.workspaces.save(ed.ws)));
    }

    function statementsIn(ws) {
      var n = 0;
      var all = ws.getAllBlocks(false);
      for (var i = 0; i < all.length; i++) if (all[i].previousConnection && !all[i].isShadow() && all[i].type !== 'garden_start') n++;
      return n;
    }

    // ── Brain size: the drawer greys out when the robot's brain is full; a tap on it says why ──
    function installCapacity(ws) {
      var remaining = function () {
        var brain = ed.ctx.brain;
        return brain > 0 ? brain - statementsIn(ws) : Infinity;
      };
      ws.remainingCapacity = remaining;
      ws.hasBlockLimits = function () {
        return true;
      };
      ws.isCapacityAvailable = function (counts) {
        var need = 0;
        for (var t in counts) {
          if (t === 'garden_start') return false;
          var def = Bk.Blocks[t];
          if (def && T_OF[t] !== undefined) need += counts[t];
          else if (t === 'garden_olive' || t === 'garden_unknown') need += counts[t];
        }
        return need <= remaining();
      };
    }

    function fullLine() {
      showLine(w(ed.ctx, 'iw4Full', { n: ed.ctx.brain }), null);
      call('onFull');
    }

    // ── the line at the workspace's foot (the brain is full; pick a thing) ──
    var lineEl = null;
    function showLine(text, action) {
      hideLine();
      if (typeof document === 'undefined') return;
      lineEl = document.createElement('div');
      lineEl.className = 'gd-bk-line';
      lineEl.setAttribute('data-line', action ? 'pick' : 'full');
      var span = document.createElement('span');
      span.textContent = text;
      lineEl.appendChild(span);
      if (action) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gd-bk-cancel';
        b.textContent = action.label;
        b.addEventListener('click', action.run);
        lineEl.appendChild(b);
      } else {
        var t = setTimeout(hideLine, 4000);
        lineEl.__t = t;
      }
      root.appendChild(lineEl);
    }
    function hideLine() {
      if (lineEl) {
        if (lineEl.__t) clearTimeout(lineEl.__t);
        if (lineEl.parentNode) lineEl.parentNode.removeChild(lineEl);
      }
      lineEl = null;
    }

    function call(name, value) {
      var p = props();
      if (typeof p[name] === 'function') {
        if (arguments.length > 1) p[name](value);
        else p[name]();
      }
    }

    // ── the picker: big buttons under a slot, and a line to type in where the band and the slot allow it ──
    var pickerEl = null;
    ed.openPicker = function (field) {
      // A second tap on the slot closes its picker (as Block List's did).
      if (pickerEl && pickerEl.__field === field) {
        closePicker();
        return;
      }
      closePicker();
      if (typeof document === 'undefined' || ed.locked) return;
      var list = field.optionsList();
      var el = document.createElement('div');
      el.className = 'gd-picker';
      el.setAttribute('data-picker', field.slotKey_ || '');
      var value = field.getValue();
      list.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gd-opt';
        b.setAttribute('data-opt', o[1]);
        b.setAttribute('aria-pressed', o[1] === value ? 'true' : 'false');
        b.textContent = o[0];
        b.addEventListener('click', function () {
          field.setValue(o[1]);
          closePicker();
        });
        el.appendChild(b);
      });
      var typable = typeof field.typable_ === 'function' ? field.typable_.call(field) : !!field.typable_;
      if (typable) {
        var inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'gd-slot-text';
        inp.maxLength = 40;
        inp.value = value || '';
        inp.setAttribute('autocomplete', 'off');
        inp.addEventListener('input', function () {
          field.setValue(inp.value.slice(0, 40));
        });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') closePicker();
        });
        el.appendChild(inp);
      }
      // Fixed to the screen under the slot (over it when the slot is low), kept inside the window.
      var fr = field.getSvgRoot() ? field.getSvgRoot().getBoundingClientRect() : null;
      var vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
      var vh = typeof window !== 'undefined' ? window.innerHeight : 768;
      var rows = Math.ceil(list.length / 3) + (typable ? 1 : 0);
      var hgt = Math.min(vh - 8, 16 + rows * 46);
      var left = fr ? Math.max(4, Math.min(fr.left, vw - 348)) : 12;
      var top = fr ? fr.bottom + 6 : 12;
      if (top + hgt > vh) top = Math.max(4, (fr ? fr.top : vh) - 6 - hgt);
      el.style.left = Math.round(left) + 'px';
      el.style.top = Math.round(top) + 'px';
      root.appendChild(el);
      pickerEl = el;
      pickerEl.__field = field;
      var fr0 = field.getSvgRoot && field.getSvgRoot();
      if (fr0) fr0.setAttribute('aria-expanded', 'true');
    };
    function closePicker() {
      if (pickerEl && pickerEl.__field) {
        var r = pickerEl.__field.getSvgRoot && pickerEl.__field.getSvgRoot();
        if (r) r.setAttribute('aria-expanded', 'false');
      }
      if (pickerEl && pickerEl.parentNode) pickerEl.parentNode.removeChild(pickerEl);
      pickerEl = null;
    }
    var outside = function (e) {
      if (pickerEl && !pickerEl.contains(e.target)) {
        var f = pickerEl.__field;
        var r = f && f.getSvgRoot();
        if (!r || !r.contains(e.target)) closePicker();
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('pointerdown', outside, true);

    // ── the card: the ? on a DRAWER block (never a placed one) names the block's kind and fires Help ──
    ed.help = function (block) {
      var id = palIdOf({ type: block.type, extraState: block.saveExtraState ? block.saveExtraState() : null });
      call('onHelpBlock', id);
      call('onHelp');
    };

    // ── picking a thing on the island for a chip ──
    ed.armPick = function (chip) {
      if (ed.locked) return;
      ed.picking = chip.id;
      root.classList.add('gd-picking');
      showLine(w(ed.ctx, 'iw4PickLine'), { label: w(ed.ctx, 'iw4PickCancel'), run: function () { ed.cancelPick(); } });
      call('onPicking', true);
      call('onPickArm');
    };
    ed.cancelPick = function () {
      if (!ed.picking) return;
      ed.picking = '';
      root.classList.remove('gd-picking');
      hideLine();
      call('onPicking', false);
    };
    ed.applyPick = function (ref) {
      if (!ed.picking || !ed.ws) return false;
      var chip = ed.ws.getBlockById(ed.picking);
      ed.cancelPick();
      if (!chip || chip.type !== 'garden_thing' || !isObj(ref) || (typeof ref.kind !== 'string' && typeof ref.ref !== 'string')) return false;
      Bk.Events.setGroup(true);
      var before = JSON.stringify(chip.saveExtraState());
      chip.setThing(ref);
      Bk.Events.fire(new (Bk.Events.get(Bk.Events.BLOCK_CHANGE))(chip, 'mutation', null, before, JSON.stringify(chip.saveExtraState())));
      Bk.Events.setGroup(false);
      return true;
    };

    // ── tap to add: at the end of the selected container, else at the end of the program under ▶ ──
    function lastInChain(b) {
      while (b && b.getNextBlock()) b = b.getNextBlock();
      return b;
    }
    function selectedBlock() {
      var s = ed.selected && ed.ws ? ed.ws.getBlockById(ed.selected) : null;
      return s && !s.isDeadOrDying() ? s : null;
    }
    /** The first value slot still empty in a block's condition or value — its own, else inside what fills them (depth first). */
    function emptyValueInput(b) {
      if (!b || !b.inputList) return null;
      for (var i = 0; i < b.inputList.length; i++) {
        var inp = b.inputList[i];
        if (!inp.connection || inp.connection.type !== Bk.ConnectionType.INPUT_VALUE) continue;
        var t = inp.connection.targetBlock();
        if (!t || t.isShadow()) return inp;
        if (t.type === 'garden_thing' && !t.ref_) return inp;
        var deeper = emptyValueInput(t);
        if (deeper) return deeper;
      }
      return null;
    }
    ed.tapAdd = function (flyBlock) {
      if (ed.locked || !ed.ws) return null;
      var json = Bk.serialization.blocks.save(flyBlock, { addCoordinates: false });
      ed.freshIds(json);
      var counts = {};
      counts[flyBlock.type] = 1;
      if (flyBlock.previousConnection && !ed.ws.isCapacityAvailable(counts)) {
        fullLine();
        return null;
      }
      Bk.Events.setGroup(true);
      var nb = null;
      try {
        nb = Bk.serialization.blocks.append(json, ed.ws);
        if (nb.previousConnection) {
          var sel = selectedBlock();
          var host = sel && sel.getInput('DO') ? sel : null;
          var conn;
          if (host) {
            var first = host.getInputTargetBlock('DO');
            conn = first ? lastInChain(first).nextConnection : host.getInput('DO').connection;
          } else {
            var s = startBlock();
            conn = lastInChain(s).nextConnection;
          }
          conn.connect(nb.previousConnection);
          if (nb.getInput('DO') && nb.type !== 'garden_if' && nb.type !== 'garden_if_else') select(nb);
        } else if (nb.outputConnection) {
          var targets = [selectedBlock(), ed.lastAdded ? ed.ws.getBlockById(ed.lastAdded) : null];
          var done = false;
          for (var i = 0; i < targets.length && !done; i++) {
            var inp = emptyValueInput(targets[i]);
            if (!inp) continue;
            var old = inp.connection.targetBlock();
            if (old && !old.isShadow()) old.dispose(false);
            try {
              inp.connection.connect(nb.outputConnection);
              done = !!nb.outputConnection.targetBlock();
            } catch (e) {
              done = false;
            }
          }
          if (!done) {
            var sb = startBlock().getBoundingRectangle();
            nb.moveTo(new Bk.utils.Coordinate(sb.right + 60, sb.top));
          }
        }
      } finally {
        Bk.Events.setGroup(false);
      }
      if (nb && nb.previousConnection) ed.lastAdded = nb.id;
      // Where it went, in sight (a long program runs past the workspace's foot).
      if (nb) {
        var shown = nb;
        var bring = function () {
          try {
            if (ed.ws && !shown.isDeadOrDying()) ed.ws.scrollBoundsIntoView(shown.getBoundingRectangleWithoutChildren ? shown.getBoundingRectangleWithoutChildren() : shown.getBoundingRectangle(), 24);
          } catch (e) {
            /* an older Blockly */
          }
        };
        if (Bk.renderManagement && Bk.renderManagement.finishQueuedRenders) Bk.renderManagement.finishQueuedRenders().then(bring, bring);
        else setTimeout(bring, 0);
      }
      return nb;
    };

    function select(b) {
      try {
        if (b && b.select) b.select();
        else if (Bk.common && Bk.common.setSelected) Bk.common.setSelected(b);
      } catch (e) {
        /* selection is a nicety */
      }
      noteSelected(b ? b.id : '');
    }

    function statementOf(b) {
      while (b && !b.previousConnection && b.getParent()) b = b.getParent();
      return b && b.previousConnection ? b : null;
    }

    function noteSelected(id) {
      var b = id && ed.ws ? ed.ws.getBlockById(id) : null;
      var st = statementOf(b);
      var next = st && st.type !== 'garden_start' ? st.id : '';
      if (next === ed.selected) return;
      ed.selected = next;
      schedule();
      call('onSelected', next);
    }

    // ── what is shown depends on what is picked: the chip decides the states; `has` shows N or WHAT; count_is shows its N ──
    function refreshFields() {
      var all = ed.ws.getAllBlocks(false);
      for (var i = 0; i < all.length; i++) {
        var b = all[i];
        if (b.type === 'garden_is') {
          var chip = b.getInputTargetBlock('THING');
          var kind = chip && chip.ref_ ? kindOfRef(chip.ref_) : null;
          var sf = b.getField('STATE');
          if (kind !== b.kind_) {
            b.kind_ = kind;
            // A new chip: its kind's first state unless the one picked is still on its list (IW-000's rule).
            var list = statesOf(kind);
            if (kind && list.indexOf(sf.getValue()) === -1) sf.setValue(list[0]);
          }
          var st = sf.getValue();
          var tile = !!(chip && chip.ref_ && TILE_REFS[chip.ref_.ref]);
          vis(b, 'N', st === 'has' && !tile);
          vis(b, 'WHAT', st === 'has' && tile);
        } else if (b.type === 'garden_sensor') vis(b, 'ARG', b.getField('SENSOR').getValue() === 'count_is');
      }
    }
    function vis(b, name, on) {
      var f = b.getField(name);
      if (f && f.isVisible() !== on) {
        f.setVisible(on);
        if (b.rendered) b.queueRender();
      }
    }

    // ── the markers a drive and a screen reader read, on Blockly's own SVG ──
    var tagQueued = false;
    function schedule() {
      if (tagQueued) return;
      tagQueued = true;
      var run = function () {
        if (!tagQueued) return;
        tagQueued = false;
        tag();
      };
      // After Blockly's queued render (a frame), and a timer beside it: a frame never comes in a hidden window.
      var t = setTimeout(run, 60);
      if (Bk.renderManagement && Bk.renderManagement.finishQueuedRenders) {
        Bk.renderManagement.finishQueuedRenders().then(function () {
          clearTimeout(t);
          if (tagQueued) run();
        }, function () {});
      }
    }
    function kindClass(t) {
      return 'gd-' + (STYLE_OF[t] === 'value' ? 'control' : STYLE_OF[t] || (t.indexOf(OLIVE_PREFIX) === 0 ? 'ask' : 'motion'));
    }
    function tagField(f, key) {
      var r = f && f.getSvgRoot && f.getSvgRoot();
      if (!r) return;
      r.classList.add('gd-slot');
      r.setAttribute('data-slot', key);
      r.setAttribute('data-value', f.getValue() === null ? '' : String(f.getValue()));
    }
    function tag() {
      if (!ed.ws) return;
      var svg = ed.ws.getParentSvg && ed.ws.getParentSvg();
      if (svg) svg.classList.add('gd-prog');
      var all = ed.ws.getAllBlocks(false);
      var n = 0;
      for (var i = 0; i < all.length; i++) {
        var b = all[i];
        var r = b.getSvgRoot && b.getSvgRoot();
        if (!r) continue;
        var t = T_OF[b.type] || (b.type === 'garden_olive' ? OLIVE_PREFIX + b.rung_ : b.type === 'garden_unknown' ? b.t_ : '');
        if (b.type === 'garden_start') {
          r.classList.add('gd-start');
        } else if (b.previousConnection && t) {
          n++;
          r.classList.add('gd-blk');
          r.classList.add(kindClass(t));
          r.setAttribute('data-id', b.id);
          r.setAttribute('data-t', t);
          r.classList.toggle('gd-run', ed.runningId !== '' && b.id === ed.runningId);
          if (ed.runningId !== '' && b.id === ed.runningId) r.setAttribute('data-run', 'true');
          else r.removeAttribute('data-run');
          r.classList.toggle('gd-sel', b.id === ed.selected);
          r.setAttribute('data-sel', b.id === ed.selected ? '1' : '0');
          if (b.getInput('DO')) {
            r.classList.add('gd-rep');
            r.setAttribute('data-rep', b.id);
          }
          var wf = b.getField('WORD');
          if (wf && wf.getSvgRoot()) wf.getSvgRoot().setAttribute('data-head', b.id);
        } else {
          r.classList.add('gd-val');
          r.setAttribute('data-v', b.type.replace(/^garden_/, ''));
          if (b.type === 'garden_thing') r.setAttribute('data-ref', b.ref_ ? JSON.stringify(b.ref_) : '');
        }
        for (var q = 0; q < b.inputList.length; q++) {
          var row = b.inputList[q].fieldRow;
          for (var f = 0; f < row.length; f++) if (row[f] instanceof kit.KidPick) tagField(row[f], row[f].slotKey_);
        }
      }
      root.setAttribute('data-count', String(n));
      var fly = ed.ws.getFlyout && ed.ws.getFlyout();
      var fws = fly && fly.getWorkspace();
      if (fws) {
        var fsv = fws.getParentSvg && fws.getParentSvg();
        if (fsv) fsv.classList.add('gd-palette');
        var fall = fws.getAllBlocks(false);
        for (var fa = 0; fa < fall.length; fa++) {
          var inner = fall[fa];
          var iq = inner.getParent() ? inner.getField('Q') : null;
          if (iq && iq.isVisible()) {
            iq.setVisible(false);
            inner.getRootBlock().queueRender();
          }
        }
        var tops = fws.getTopBlocks(false);
        for (var k = 0; k < tops.length; k++) {
          var fb = tops[k];
          var fr = fb.getSvgRoot && fb.getSvgRoot();
          if (!fr) continue;
          var pid = palIdOf({ type: fb.type, extraState: fb.saveExtraState ? fb.saveExtraState() : null });
          fr.setAttribute('data-pal', pid);
          fr.setAttribute('data-pal-item', pid);
          fr.classList.add('gd-pal-item');
          fr.classList.toggle('gd-off', !fb.isEnabled());
          // Where a finger taps the drawer block: its word (a C-block's middle is its empty mouth), else its icon.
          var hf = fb.getField('WORD') || fb.getField('ICON') || fb.getField('LABEL') || fb.getField('SENSOR') || fb.getField('STATE') || fb.getField('NUM') || fb.getField('OP');
          var he = hf && hf.getSvgRoot() ? hf.getSvgRoot() : fr.querySelector('.blocklyPath');
          if (he) he.setAttribute('data-pal-head', pid);
          var qf = fb.getField('Q');
          var qr = qf && qf.getSvgRoot();
          if (qr) {
            qr.classList.add('gd-help');
            qr.setAttribute('data-help', pid);
          }
        }
      }
    }

    // ── program out: after every edit that changes it, the engine program as JSON text ──
    function emit() {
      if (ed.loading || !ed.ws) return;
      var text = current();
      if (text === ed.lastEmitted) return;
      ed.lastEmitted = text;
      call('onProgram', text);
      call('onChanged');
      call('onBlocks', countStatements(JSON.parse(text)));
      call('onWatch', JSON.stringify(refsIn(text)));
    }

    /**
     * Teach's case, cheaply: the program that came in is the one on show with ONE block added at the end of a list (the
     * top, or a container's body) — that block is appended, nothing else is rebuilt. Measured: a full reload per pad
     * press, 27 presses, made the page janky enough that Garden 3D's frame rule gave up on 3D under software GL.
     */
    function appendOne(nowText, nextText) {
      var a = readJson(nowText, []);
      var b = readJson(nextText, []);
      var path = [];
      var added = null;
      (function find(x, y) {
        if (!Array.isArray(x) || !Array.isArray(y)) return;
        if (y.length === x.length + 1 && JSON.stringify(y.slice(0, x.length)) === JSON.stringify(x)) {
          added = y[x.length];
          return;
        }
        if (y.length !== x.length) return;
        var at = -1;
        for (var i = 0; i < x.length; i++) {
          if (JSON.stringify(x[i]) === JSON.stringify(y[i])) continue;
          if (at !== -1) return;
          at = i;
        }
        if (at === -1 || !isObj(x[at]) || !isObj(y[at]) || x[at].id !== y[at].id) return;
        var xa = clone(x[at]);
        var yb = clone(y[at]);
        delete xa.body;
        delete yb.body;
        if (JSON.stringify(xa) !== JSON.stringify(yb)) return;
        path.push(x[at].id);
        find(x[at].body, y[at].body);
      })(a, b);
      if (!isObj(added)) return false;
      var host = path.length ? ed.ws.getBlockById(String(path[path.length - 1])) : startBlock();
      if (!host) return false;
      var json = blockOf(added);
      if (!json) return false;
      ed.loading = true;
      Bk.Events.disable();
      try {
        var nb = Bk.serialization.blocks.append(json, ed.ws);
        var conn;
        if (path.length) {
          var first = host.getInputTargetBlock('DO');
          conn = first ? lastInChain(first).nextConnection : host.getInput('DO') && host.getInput('DO').connection;
        } else conn = lastInChain(host).nextConnection;
        if (!conn || !nb.previousConnection) throw new Error('no place for it');
        conn.connect(nb.previousConnection);
      } catch (e) {
        Bk.Events.enable();
        ed.loading = false;
        return false;
      }
      Bk.Events.enable();
      ed.loading = false;
      if (current() !== nextText) return false;
      ed.lastEmitted = nextText;
      refreshFields();
      highlight();
      try {
        var fly = ed.ws.getFlyout();
        if (fly && fly.filterForCapacity) fly.filterForCapacity();
      } catch (e) {
        /* the drawer greys on the next edit */
      }
      schedule();
      call('onBlocks', countStatements(b));
      return true;
    }

    function load(text) {
      if (!ed.ws) return;
      ed.loading = true;
      closePicker();
      try {
        Bk.Events.disable();
        try {
          ed.ws.clear();
          Bk.serialization.workspaces.load(toBlockly(text), ed.ws);
        } finally {
          Bk.Events.enable();
        }
      } catch (e) {
        if (typeof console !== 'undefined') console.warn('garden-kit.Blocks: the program did not load', e);
      }
      if (!startBlock()) {
        var s = ed.ws.newBlock('garden_start', 'start');
        s.initSvg();
        s.render();
        s.moveBy(START_AT.x, START_AT.y);
      }
      ed.loading = false;
      ed.lastEmitted = text;
      if (ed.selected && !ed.ws.getBlockById(ed.selected)) noteSelected('');
      refreshFields();
      highlight();
      try {
        var fly = ed.ws.getFlyout();
        if (fly && fly.filterForCapacity) fly.filterForCapacity();
      } catch (e) {
        /* the drawer greys itself on the next edit */
      }
      schedule();
      call('onBlocks', countStatements(readJson(text, [])));
      call('onWatch', JSON.stringify(refsIn(text)));
      setTimeout(showStart, 0);
    }

    function showStart() {
      var s = startBlock();
      if (!s || !ed.ws) return;
      try {
        ed.ws.scrollBoundsIntoView(s.getBoundingRectangleWithoutChildren ? s.getBoundingRectangleWithoutChildren() : s.getBoundingRectangle(), 24);
      } catch (e) {
        /* an older Blockly */
      }
    }

    function highlight() {
      if (!ed.ws) return;
      try {
        ed.ws.highlightBlock(null);
        if (ed.runningId && ed.ws.getBlockById(ed.runningId)) ed.ws.highlightBlock(ed.runningId);
      } catch (e) {
        /* a block gone mid-run */
      }
      schedule();
    }

    // Selection is BlockList's: a tap on a placed block selects it, a second tap lets go, a tap on the empty workspace
    // lets go. A deselect Blockly fires on its own (a press in the drawer moves its focus) is ignored, so "tap repeat,
    // tap forward, tap forward" puts both forwards inside the repeat.
    function onEvent(e) {
      if (e.type === Bk.Events.SELECTED) {
        var nb = e.newElementId ? ed.ws.getBlockById(e.newElementId) : null;
        var st = statementOf(nb);
        if (st && st.type !== 'garden_start' && st.id !== ed.selected) {
          ed.justSelected = st.id;
          noteSelected(st.id);
        }
        return;
      }
      if (e.type === Bk.Events.CLICK && e.targetType === 'workspace') {
        noteSelected('');
        return;
      }
      if (e.type === Bk.Events.CLICK && e.targetType === 'block' && e.blockId) {
        var b = ed.ws.getBlockById(e.blockId);
        if (b && b.type === 'garden_thing' && !ed.locked) {
          ed.armPick(b);
          return;
        }
        var sb = statementOf(b);
        if (!sb || sb.type === 'garden_start') return;
        if (ed.justSelected === sb.id) ed.justSelected = null;
        else if (ed.selected === sb.id) noteSelected('');
        else noteSelected(sb.id);
        return;
      }
      if (e.isUiEvent) {
        schedule();
        return;
      }
      if (ed.loading) return;
      refreshFields();
      schedule();
      emit();
    }

    function onFlyoutEvent(e) {
      if (e.type === Bk.Events.CLICK && e.targetType === 'block' && e.blockId && !ed.locked) {
        var fws = ed.ws.getFlyout().getWorkspace();
        var b = fws.getBlockById(e.blockId);
        if (!b) return;
        var top = b.getRootBlock();
        if (!top.isEnabled()) {
          fullLine();
          return;
        }
        ed.tapAdd(top);
      }
    }

    function inject() {
      var p = props();
      ed.ctx = makeCtx();
      ed.narrow = isNarrow();
      root.classList.toggle('gd-narrow', ed.narrow);
      ed.key = [ed.narrow, ed.ctx.band, ed.ctx.lang, JSON.stringify(ed.ctx.paletteList), ed.ctx.showHelp, JSON.stringify(ed.ctx.words), ed.ctx.botName, p.motionColor, p.actionColor, p.controlColor, p.askColor].join('|');
      Bk.setLocale(messagesOf(Bk, ed.ctx.lang));
      Bk.config.snapRadius = 48;
      Bk.config.connectingSnapRadius = 64;
      Bk.config.dragRadius = 6;
      Bk.config.flyoutDragRadius = 6;
      PENDING.ctx = ed.ctx;
      var ws;
      try {
        ws = Bk.inject(host, {
          renderer: 'zelos',
          theme: theme(),
          toolbox: flag(p.showPalette, true) ? toolboxOf(ed.ctx) : undefined,
          trashcan: false,
          sounds: false,
          media: 'data:,',
          comments: false,
          disable: false,
          collapse: false,
          readOnly: false,
          zoom: { controls: false, wheel: true, startScale: ed.ctx.band === 1 ? 0.9 : 0.8, maxScale: 1.8, minScale: 0.45, scaleSpeed: 1.15 },
          move: { scrollbars: true, drag: true, wheel: false },
          grid: { spacing: 32, length: 2, colour: '#EFE3C8', snap: false },
          maxInstances: { garden_start: 1 },
          // On a phone the drawer is a strip along the workspace's FOOT (a thumb's reach). Measured on Blockly 12.3.1: a
          // strip at the top shifts the workspace under it, and a block dragged from it was drawn one flyout-height away
          // from where it would connect (it snapped to the block above) — at the foot nothing moves.
          horizontalLayout: ed.narrow,
          toolboxPosition: ed.narrow ? 'end' : 'start',
          plugins: { flyoutsVerticalToolbox: 'gardenKidFlyout', flyoutsHorizontalToolbox: 'gardenKidFlyoutH' }
        });
      } finally {
        PENDING.ctx = null;
      }
      ed.ws = ws;
      CTL[ws.id] = ed;
      installCapacity(ws);
      ws.addChangeListener(onEvent);
      var fly = ws.getFlyout && ws.getFlyout();
      if (fly) fly.getWorkspace().addChangeListener(onFlyoutEvent);
      ed.lastIncoming = programText(props().program);
      load(ed.lastIncoming);
    }

    function programText(v) {
      var list = readJson(v, []);
      return JSON.stringify(Array.isArray(list) ? list : []);
    }

    function destroy() {
      closePicker();
      hideLine();
      if (typeof document !== 'undefined') document.removeEventListener('pointerdown', outside, true);
      if (ed.ws) {
        delete CTL[ed.ws.id];
        try {
          ed.ws.dispose();
        } catch (e) {
          /* already gone */
        }
      }
      ed.ws = null;
    }

    /** Props in: the view is rebuilt only for what Blockly cannot change in place (band, language, palette, colours). */
    function update() {
      var p = props();
      if (!ed.ws) return;
      // The view's inputs, by identity first: a render that changed none of them (a glow, a lock) costs nothing here.
      var refs = [isNarrow(), p.palette, p.words, p.band, p.language, p.showHelp, p.botName, p.motionColor, p.actionColor, p.controlColor, p.askColor, p.brainSize];
      var same = !!ed.refs && refs.length === ed.refs.length && refs.every(function (r, i) {
        return r === ed.refs[i];
      });
      ed.refs = refs;
      var next = same ? null : makeCtx();
      var key = same ? ed.key : [refs[0], next.band, next.lang, JSON.stringify(next.paletteList), next.showHelp, JSON.stringify(next.words), next.botName, p.motionColor, p.actionColor, p.controlColor, p.askColor].join('|');
      if (key !== ed.key) {
        var keep = current();
        destroyWs();
        inject();
        load(keep);
        ed.lastEmitted = keep;
        // A new workspace: the lock and the glow are laid again below.
        ed.locked = false;
        ed.runningId = '';
        root.classList.remove('gd-locked');
      }
      if (next) ed.ctx.brain = next.brain;
      // Program in: only a NEW value from the graph counts (a render with the same, older prop must not undo an edit the
      // graph has not echoed back yet — Block List's useEffect on [program]); and never the node's own text back.
      var text = programText(p.program);
      if (text !== ed.lastIncoming) {
        ed.lastIncoming = text;
        if (text !== ed.lastEmitted) {
          var now = current();
          if (text !== now && !appendOne(now, text)) load(text);
        }
      }
      var locked = flag(p.locked, false);
      if (locked !== ed.locked) {
        ed.locked = locked;
        try {
          ed.ws.setIsReadOnly(locked);
        } catch (e) {
          /* older Blockly */
        }
        root.classList.toggle('gd-locked', locked);
        if (locked) {
          closePicker();
          ed.cancelPick();
        }
      }
      var run = p.runningId === undefined || p.runningId === null ? '' : String(p.runningId);
      if (run !== ed.runningId) {
        ed.runningId = run;
        highlight();
      }
      var pick = readJson(p.pick, null);
      var pickKey = pick ? JSON.stringify(pick) : '';
      if (pickKey !== ed.pickKey) {
        ed.pickKey = pickKey;
        if (pick && isObj(pick.ref)) ed.applyPick(pick.ref);
      }
      // React writes the root's className on a render (band, locked): the classes the editor keeps are laid again.
      root.classList.toggle('gd-narrow', !!ed.narrow);
      root.classList.toggle('gd-picking', !!ed.picking);
      root.classList.toggle('gd-locked', !!ed.locked);
    }

    function destroyWs() {
      if (ed.ws) {
        delete CTL[ed.ws.id];
        try {
          ed.ws.dispose();
        } catch (e) {
          /* gone */
        }
      }
      ed.ws = null;
      while (host.firstChild) host.removeChild(host.firstChild);
    }

    /** Duplicate (the menu's): the block and what hangs inside it, not the blocks under it; new whole-number ids. */
    function copyJson(block) {
      var json = Bk.serialization.blocks.save(block, { addCoordinates: false, addNextBlocks: false });
      return ed.freshIds(json);
    }
    function statementsInJson(j) {
      var n = 0;
      (function walk(x) {
        if (!x || typeof x !== 'object') return;
        if (x.type && T_OF[x.type] !== undefined) n++;
        if (x.next) walk(x.next.block);
        if (x.inputs) for (var k in x.inputs) walk(x.inputs[k].block);
      })(j);
      return n;
    }
    ed.canCopy = function (block) {
      if (ed.locked) return false;
      var brain = ed.ctx.brain;
      return !(brain > 0) || statementsIn(ed.ws) + statementsInJson(copyJson(block)) <= brain;
    };
    ed.duplicate = function (block) {
      if (!ed.canCopy(block)) {
        fullLine();
        return null;
      }
      var json = copyJson(block);
      var xy = block.getRelativeToSurfaceXY();
      Bk.Events.setGroup(true);
      var nb = null;
      try {
        nb = Bk.serialization.blocks.append(json, ed.ws);
        nb.moveTo(new Bk.utils.Coordinate(xy.x + 30, xy.y + 30));
      } finally {
        Bk.Events.setGroup(false);
      }
      return nb;
    };

    ed.zoom = function (how) {
      if (!ed.ws) return;
      if (how === 'fit') ed.ws.zoomToFit();
      else ed.ws.zoomCenter(how === 'in' ? 1 : -1);
    };

    /** For a drive: the drawer block of this palette id scrolled into the drawer's view (a child scrolls it with a finger). */
    ed.reveal = function (palId) {
      var fly = ed.ws && ed.ws.getFlyout();
      if (!fly) return false;
      var fws = fly.getWorkspace();
      var tops = fws.getTopBlocks(false);
      for (var i = 0; i < tops.length; i++) {
        var id = palIdOf({ type: tops[i].type, extraState: tops[i].saveExtraState ? tops[i].saveExtraState() : null });
        if (id !== palId) continue;
        var xy = tops[i].getRelativeToSurfaceXY();
        var m = fws.getMetrics();
        var scale = fws.scale;
        var hw = tops[i].getHeightWidth();
        if (ed.narrow) {
          var x = xy.x * scale;
          if (x < m.viewLeft || x + hw.width * scale > m.viewLeft + m.viewWidth) {
            if (fws.scrollbar && fws.scrollbar.setX) fws.scrollbar.setX(Math.max(0, x - 20));
            else fws.scroll(-Math.max(0, x - 20), 0);
          }
          return true;
        }
        var y = xy.y * scale;
        if (y < m.viewTop || y + hw.height * scale > m.viewTop + m.viewHeight) {
          if (fws.scrollbar && fws.scrollbar.setY) fws.scrollbar.setY(Math.max(0, y - 20));
          else fws.scroll(0, -Math.max(0, y - 20));
        }
        return true;
      }
      return false;
    };
    ed.program = function () {
      return ed.ws ? current() : '[]';
    };
    ed.blockly = function () {
      return ed.ws ? Bk.serialization.workspaces.save(ed.ws) : null;
    };
    ed.workspace = function () {
      return ed.ws;
    };

    inject();
    root.__gardenBlocks = ed;
    return { update: update, destroy: destroy, api: ed };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The node
  // ═══════════════════════════════════════════════════════════════════════════

  var Blocks = {
    name: 'garden-kit.Blocks',
    displayNodeName: 'Blocks',
    docs:
      'The program editor a child holds, on real Blockly 12 made for children (P108 IW-004): the Zelos look, the drawer always ' +
      'open on the left (tap a drawer block to add it, or drag it out; drag a block back to the drawer to throw it away), a ? on ' +
      'the drawer blocks only, big pickers instead of typing, no menu but Help and Duplicate, the running block glowing. ' +
      'Program in and out is the engine program (the same JSON Block List reads and writes); Blockly JSON never leaves the node. ' +
      'A thing chip is picked on the island: a tap on a chip arms Picking, and the page sends the tapped thing through Pick.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,

    /** The pure parts, for the gate. */
    translate: translate,
    toolbox: toolboxOf,
    defineBlocks: defineBlocks,
    words: WORDS,
    css: BLOCKS_CSS,

    getReactComponent: function () {
      return function BlocksComponent(props) {
        var root = React.useRef(null);
        var host = React.useRef(null);
        var editor = React.useRef(null);
        var latest = React.useRef(props);
        latest.current = props;

        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(root.current);
          var Bk = BK();
          if (!Bk || !host.current) return undefined;
          try {
            editor.current = createEditor(Bk, root.current, host.current, {
              props: function () {
                return latest.current;
              }
            });
          } catch (e) {
            if (typeof console !== 'undefined') console.warn('garden-kit.Blocks: Blockly did not start', e);
          }
          var ro = null;
          if (typeof ResizeObserver !== 'undefined' && root.current) {
            ro = new ResizeObserver(function () {
              var ed = editor.current && editor.current.api;
              if (ed && ed.ws) {
                try {
                  Bk.svgResize(ed.ws);
                } catch (e) {
                  /* hidden */
                }
                // A workspace that turned narrow (or wide) lays its drawer out again.
                if (editor.current) editor.current.update();
              }
            });
            ro.observe(root.current);
          }
          return function () {
            if (ro) ro.disconnect();
            if (editor.current) editor.current.destroy();
            editor.current = null;
          };
        }, []);

        // Every render hands the props to the editor; it changes only what changed. Blockly's DOM is never React's.
        React.useEffect(function () {
          if (editor.current) editor.current.update();
        });

        var band = Number(props.band) === 1 ? 1 : 2;
        var lang = props.language === 'fr' ? 'fr' : 'en';
        var words = wordsOf(props.words, lang);
        var zoomBtn = function (how, label, text) {
          return h('button', {
            key: how, type: 'button', 'data-zoom': how, 'aria-label': label, title: label,
            onClick: function () {
              var ed = editor.current && editor.current.api;
              if (ed) ed.zoom(how);
            }
          }, text);
        };
        return h(
          'div',
          {
            ref: root,
            className: 'gd-blocks gd-bk gd-band' + band + (flag(props.locked, false) ? ' gd-locked' : ''),
            'data-gd-blocks': 'true',
            'data-bk': 'blockly',
            'data-band': String(band),
            'data-lang': lang,
            onContextMenu: function (e) {
              e.preventDefault();
            },
            style: Object.assign({ '--gd-run': props.runColor, '--gd-sel': props.controlColor }, props.style)
          },
          h('style', { key: 'css' }, BLOCKS_CSS),
          h('div', { key: 'host', ref: host, className: 'gd-bk-host' }),
          h('div', { key: 'zoom', className: 'gd-bk-zoom' }, zoomBtn('in', words.iw4ZoomIn, '+'), zoomBtn('out', words.iw4ZoomOut, '−'), zoomBtn('fit', words.iw4ZoomFit, '⤢'))
        );
      };
    },

    defaultCss: { display: 'block' },

    inputProps: {
      palette: { type: 'object', displayName: 'Palette', group: 'Program', description: 'The drawer’s blocks, in Block List’s palette shape (id, kind, icon, label, hasBody, hasCount, slots). At 10–12, a drawer with until or if also offers the sensor, a thing chip and its state, the value blocks and if/else.' },
      program: { type: 'object', displayName: 'Program', group: 'Program', description: 'The engine program, as JSON text or a list of blocks { id, t, n, slots, body, else } — the same Block List reads. What the graph sends replaces what is drawn; the node’s own output is not read back as a change.' },
      band: { type: 'number', displayName: 'Band', group: 'Program', default: 2, description: '1: icon-first blocks, a bigger drawer, no value blocks, never a keyboard. 2: icons and words, the value blocks.' },
      language: { type: { name: 'enum', enums: [{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }] }, displayName: 'Language', group: 'Program', default: 'en', description: 'Blockly’s own messages and ours.' },
      words: { type: 'array', displayName: 'Words', group: 'Program', description: 'The page’s word rows { key, en, fr }; the iw4… keys replace the node’s own.' },
      botName: { type: 'string', displayName: 'Robot Name', group: 'Program', default: 'Pip', description: 'The {b} in the words (“Pip’s steps”).' },
      brainSize: { type: 'number', displayName: 'Brain Size', group: 'Program', default: 0, description: 'The most blocks the program may hold (the robot’s brain). The drawer greys out when it is full and a tap says why. 0: no limit.' },
      runningId: { type: 'string', displayName: 'Running Id', group: 'Program', default: '', description: 'The id of the block to glow. Empty glows none.' },
      locked: { type: 'boolean', displayName: 'Locked', group: 'Program', default: false, description: 'True while a run plays: nothing can be added, moved or changed.' },
      showPalette: { type: 'boolean', displayName: 'Show Palette', group: 'Program', default: true },
      showHelp: { type: 'boolean', displayName: 'Show Help', group: 'Program', default: false, description: 'A ? on every drawer block (never a placed one). A tap sets Help Block to the block’s kind and fires Help; it places nothing.' },
      pick: { type: 'object', displayName: 'Pick', group: 'Things', description: '{ n, ref }: the thing tapped on the island while Picking — a REF { id?, kind, x, y }. A new n puts it in the chip that asked.' },
      motionColor: { type: 'color', displayName: 'Motion Blocks', group: 'Style', default: '#3170E0' },
      actionColor: { type: 'color', displayName: 'Action Blocks', group: 'Style', default: '#058149' },
      controlColor: { type: 'color', displayName: 'Control Blocks', group: 'Style', default: '#A86501' },
      askColor: { type: 'color', displayName: 'Ask Blocks', group: 'Style', default: '#8059EC' },
      runColor: { type: 'color', displayName: 'Running Ring', group: 'Style', default: '#2E2A3D', description: 'The ring around the running block, over a white halo.' },
      dropColor: { type: 'color', displayName: 'Drop Line', group: 'Style', default: '#FFD166', description: 'Kept for Block List’s wiring; Blockly draws its own insertion marker.' }
    },

    outputProps: {
      onProgram: { type: 'string', displayName: 'Program', group: 'Program', description: 'The engine program as JSON text, after every edit.' },
      onChanged: { type: 'signal', displayName: 'Changed', group: 'Program', description: 'An edit happened. Program already holds it.' },
      onSelected: { type: 'string', displayName: 'Selected', group: 'Program', description: 'The id of the selected block (a container: where a drawer tap and Teach put new blocks), or empty.' },
      onBlocks: { type: 'number', displayName: 'Blocks', group: 'Program', description: 'How many blocks the program holds.' },
      onFull: { type: 'signal', displayName: 'Brain Full', group: 'Program', description: 'A block was refused: the brain is full.' },
      onHelpBlock: { type: 'string', displayName: 'Help Block', group: 'Help', description: 'The kind (palette id) of the drawer block whose ? was tapped.' },
      onHelp: { type: 'signal', displayName: 'Help', group: 'Help', description: 'A drawer block’s ? was tapped. Help Block already holds its kind.' },
      onPicking: { type: 'boolean', displayName: 'Picking', group: 'Things', description: 'True while a chip waits for a thing tapped on the island.' },
      onPickArm: { type: 'signal', displayName: 'Pick Armed', group: 'Things', description: 'A chip was tapped: Picking is on.' },
      onWatch: { type: 'string', displayName: 'Watch', group: 'Things', description: 'The chips the program uses, as a JSON list of REFs — the things the world draws large (the monitor).' }
    }
  };

  return { node: Blocks, translate: translate, createEditor: createEditor, defineBlocks: defineBlocks };
})();
