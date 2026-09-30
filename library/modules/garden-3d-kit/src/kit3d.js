// @ts-check
/**
 * Garden 3D Kit — a NodeGX node kit for Olive’s Island (Phase 106, IG-007).
 *
 * One React node, `Garden 3D`, on EXACTLY the ports of garden-kit’s `Garden` (Map, Things, Robots, Bubble, Step Ms,
 * Celebrate, Label in; Tile X, Tile Y, Tile Tapped, Ready out) plus Camera, Focus, Frame Ms and Supported. The page
 * swaps the node; the graph above it is untouched. This file draws a flat-shaded little island with three.js: tile
 * boxes with a height per kind, cone-on-cylinder trees, icosahedron rocks, a box-and-prism house, stem-and-bulb
 * tulips, robots as a box body with a visor, eyes and a hat. One directional light, one hemisphere light, no shadow
 * maps, no textures, no post-processing. Primitives only: nothing is fetched (CG-001 AC10 holds for this kit too).
 *
 * Hand-written in the shape of `garden-kit`: no SDK, no npm install, no bundler for THIS file. `build.mjs` copies it
 * verbatim under a banner into `project/noodl_modules/garden-3d-kit/index.js`, the file a project installs. three.js is
 * vendored BESIDE it as `three.min.js` (0.158.0, MIT, LICENSE.txt) and listed in manifest.json `dependencies`, the
 * maplibre way, so the page loads it first and this file reads the `THREE` global. It reads it at MOUNT, never at
 * definition: the kit catalog extractor loads `main` alone, and the node must register there without three.js.
 *
 * ── The rule this file follows ───────────────────────────────────────────────
 *
 *   The kit draws. The engine (CG-002) interprets.
 *
 * Nothing here runs a program or knows what a wall is. The tiles the map names are drawn; the robots go where the
 * graph puts them, gliding over Step Ms; a bump count that rises recoils; Celebrate hops; a Bubble is a DOM overlay
 * projected from the robot’s head (its text stays selectable and translatable). A tapped tile reports its x and y.
 *
 * ── Where the pure parts live (the kit gate grades them without a browser) ──
 *
 *   Garden3D.world   parseMap / parseThings / parseRobots / rose — garden-kit’s helpers when that kit is on the page
 *                    (found through window.__noodl_modules at render time), else the copies below (`LOCAL_WORLD`).
 *   Garden3D.scene   buildScene(world, THREE) — every mesh of a world, instanced tiles counted as one each.
 *   Garden3D.camera  pose / project / rayFromNdc / pickTile / frameRect / clampCamera — hand-rolled maths, no THREE.
 *   Garden3D.engine  create({ THREE, root, canvas, overlay, … }) — the browser half; `Supported` is decided here.
 *
 * ── The JSON contract (garden-kit’s, verbatim; the new ports after it) ──────
 *
 * Map:      { rows: ["GGTGGGTH", ...], legend: { G: "grass", ... } } or just the rows. Kinds: grass path water tree
 *           rock house bed postbox. A bed draws a dry tulip; a Thing waters it. A postbox tile is path wearing the box.
 * Things:   [{ kind: tulip | puddle | letter | bowl | label | stone | postbox | egg | food | flag | rock | sign | note | tick,
 *             x, y, watered?, full?, text?, left? }]  (rock `left` 0..4; a sign's and a note's text is not drawn)
 * Robots:   [{ x, y, d, colour, eyes, hat, name, bump?, can?, canMax?, carry? }]  d 0..3 clockwise from up; bump is a
 *           COUNT that rises; can 0..canMax or null; the load drawn is the last of carry.
 * Bubble:   { robot, text, style: plain | olive, ms }
 * Camera:   plot | island | follow — plot frames Focus (the whole map when Focus is empty), island frames the whole
 *           map, follow keeps robot 0 in the middle.
 * Focus:    { x, y, w, h } in tiles.
 * Frame Ms: the rolling p95 of the last 60 frame intervals, measured only after Ready, only while the document is
 *           visible (a frame throttle never fires in a hidden window; without the guard the fallback would fire on
 *           every minimised app) and only while the scene moves: it is drawn ON DEMAND (a glide, a turn, a bump, a
 *           hop, a camera glide, a finger on it), so a still scene draws nothing and is never timed.
 * Supported: true when a WebGL2 context could be made and three.js is on the page; false draws nothing, throws
 *           nothing, and Ready never fires (the page’s fallback rule swaps the node).
 * Too Slow: a signal, once, when Frame Ms has stayed above 50 ms for 3 s of visible time (the rule's other cue).
 *
 * The vocabulary both renderers share (P106 s2, the common brief's §4): THING_BUILDERS is a table keyed by thing
 * kind — a rock (big at `left` ≥ 3, medium at 2, small at 1, nothing at 0), a stone, a post box, a sign and a note
 * (their `text` is never drawn on the tile) are one entry each; a robot draws `colour`, `eyes`, `hat`, its can with the
 * level `can` of `canMax` (no level at all when `can` is null) and its load on its back: the LAST entry of `carry`
 * (`stone`, `letter`, `egg`, `food` as themselves, anything else a parcel, nothing when `carry` is empty). `accessory` (IG-005) is not in the
 * port's vocabulary yet: every robot carries the can.
 *
 * The look is the mockup's (`tpl-012-mockups/island-3d.html`, IG-000): its palette, tile heights, the sea and the sand
 * rim under the island, the tiles a hair apart so the grid reads, its lights, and its camera — 35° from straight
 * down, turned 0.42 rad about the vertical, a 38° lens.
 */
(function () {
  // ✅ React is a global the runtime installs before this file runs. Read it bare; never window.React.
  var h = typeof React !== 'undefined' ? React.createElement : null;

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

  // ═══════════════════════════════════════════════════════════════════════════
  // The world helpers — garden-kit’s when it is on the page, these copies when it is not
  // ═══════════════════════════════════════════════════════════════════════════

  // COPIED from library/modules/garden-kit/src/kit.js (the 2D `Garden` node’s world.* helpers), so that this kit
  // stands alone in a project that installs it without garden-kit. When garden-kit IS on the page its own helpers are
  // used instead (see `worldHelpers`), and the kit gate pins these copies to the originals on a shared set of inputs.
  // P108 IW-002 (lane D): L is the wall tile (WALL_TILE, below; the engine blocks it) — drawn by both kits.
  var DEFAULT_LEGEND = { G: 'grass', P: 'path', W: 'water', T: 'tree', R: 'rock', H: 'house', F: 'bed', B: 'postbox', L: 'wall', '.': 'grass', ' ': 'grass' };
  var KINDS = ['grass', 'path', 'water', 'tree', 'rock', 'house', 'bed', 'postbox', 'wall'];

  function parseMap(v) {
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

  /** A rising count is a new event; a mount, the same value, a fall or junk is not (the Boost-count rule). */
  function rose(before, after) {
    var a = Number(before);
    var b = Number(after);
    if (!isFinite(b)) return false;
    return b > (isFinite(a) ? a : 0);
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

  var LOCAL_WORLD = { parseMap: parseMap, parseThings: parseThings, parseRobots: parseRobots, rose: rose, DEFAULT_LEGEND: DEFAULT_LEGEND, KINDS: KINDS, job: JOB_LOOK, source: 'local' };

  /**
   * garden-kit’s `Garden.world` if that kit is on the page. Modules land in `window.__noodl_modules` in load order and
   * garden-3d-kit sorts BEFORE garden-kit, so this is read at render time, never at definition.
   */
  function siblingWorld() {
    var list = null;
    if (typeof window !== 'undefined' && window.__noodl_modules) list = window.__noodl_modules;
    else if (typeof globalThis !== 'undefined' && globalThis.__noodl_modules) list = globalThis.__noodl_modules;
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      var nodes = m && Array.isArray(m.reactNodes) ? m.reactNodes : [];
      for (var j = 0; j < nodes.length; j++) {
        var n = nodes[j];
        if (n && n.name === 'garden-kit.Garden' && n.world && typeof n.world.parseMap === 'function') return n.world;
      }
    }
    return null;
  }

  function worldHelpers() {
    var s = siblingWorld();
    return s ? { parseMap: s.parseMap, parseThings: s.parseThings, parseRobots: s.parseRobots, rose: s.rose || rose, source: 'sibling' } : LOCAL_WORLD;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The look — the mockup’s palette as hex numbers, a height per tile kind
  // ═══════════════════════════════════════════════════════════════════════════

  var PALETTE = {
    background: 0x9fd9f3,
    sea: 0x7cc6f0,
    sand: 0xf1dfb5,
    base: 0x9bd3af,
    white: 0xffffff,
    grass: 0xbde6c9,
    grassAlt: 0xb4e0c2,
    path: 0xf1dfb5,
    water: 0x7cc6f0,
    bed: 0xc79a63,
    ground: 0xa8d9b4,
    trunk: 0xa9773f,
    canopy: 0x3e9b62,
    canopyLight: 0x48af70,
    rock: 0x9c9aa6,
    rockLight: 0xb7b5c2,
    wall: 0xffe3b3,
    roof: 0xe86a5e,
    door: 0x8b5a2b,
    window: 0x7cc6f0,
    stem: 0x3fa66b,
    tulip: 0xff6b9a,
    tulipDry: 0xe68081,
    yellow: 0xffd166,
    yellowDry: 0xe6b865,
    stemDry: 0x9cc7a8,
    puddle: 0x7cc6f0,
    letter: 0xfff7e8,
    letterInk: 0xe86a5e,
    bowl: 0xe86a5e,
    bowlRim: 0x4fa7dc,
    kibble: 0x8b5a2b,
    ink: 0x2e2a3d,
    visor: 0xffffff,
    cap: 0x3e63c8,
    sun: 0xffd166,
    sunCrown: 0x7a4b1f,
    crown: 0xffd166,
    can: 0x4fa7dc,
    canWater: 0xbfe7ff,
    // P106 IG-005: the accessories — Cobble's hod, Pocket's satchel, Echo's bell.
    hod: 0xa9773f,
    hodPole: 0x7a4b1f,
    satchel: 0xc98a4b,
    satchelStrap: 0x8b5a2b,
    bell: 0xffd166,
    bellInk: 0xc98a00,
    bulb: 0xffd166,
    wheel: 0x3a3646,
    iron: 0x8e8ca0,
    paper: 0xffffff,
    coral: 0xff7a59,
    parcel: 0xc98a5e,
    // P106 IG-004 (lane E): the islanders, the fence round a locked plot and its padlock — the mockup's colours.
    skin: 0xf7d3b5,
    granny: 0x8f6bff,
    hair: 0xe9e4ef,
    postie: 0x3e63c8,
    satchel: 0xc98a5e,
    cat: 0xf3b76a,
    nose: 0xe06b8a,
    fence: 0xa9773f,
    gold: 0xffd166,
    // P108 IW-002 AC6 (lane D): the job model's things, the mockup's colours (island-jobs.html's C table).
    stoneWall: 0x8e8b9a,
    stoneWallCap: 0xc9c6d2,
    dirt: 0x9e7248,
    gravel: 0xb8ae9c,
    cobble: 0xa3a0ab,
    wicker: 0xc98a4b,
    egg: 0xfff4dc,
    hen: 0xffffff,
    comb: 0xe0463a,
    beak: 0xffb347,
    straw: 0xf2de9e,
    crate: 0xc98a4b,
    // P108 IW-003 (lane B): Biscuit's ball and its seam; the biscuits on a store of food.
    ball: 0xe04e4e,
    ballSeam: 0xfff7e8,
    biscuit: 0xf0d9b0
  };

  /**
   * How tall each tile box is (the mockup's TOP): water lowest, then the bed, the path, grass. Tree, rock and house sit
   * on a grass-height tile; a post box on path.
   */
  var TILE_HEIGHT = { water: 0.14, path: 0.34, grass: 0.4, bed: 0.3, tree: 0.4, rock: 0.4, house: 0.4, postbox: 0.34, wall: 0.4 };
  /** The grassy kinds take their shade per tile (a checkerboard), so their material is white and the instance colours it. */
  var TILE_COLOUR = { water: PALETTE.water, path: PALETTE.path, grass: PALETTE.white, bed: PALETTE.bed, tree: PALETTE.white, rock: PALETTE.white, house: PALETTE.white, postbox: PALETTE.path, wall: PALETTE.white };
  /** Tiles a hair apart so the grid reads on the base under them; water a hair wider so the pond is one sheet. */
  var TILE_SIZE = 0.98;
  var WATER_SIZE = 1.02;
  /** A rock's radius by what is left of it (the mockup's sizes): big at left ≥ 3, medium at 2, small at 1. */
  var ROCK_SIZES = { big: 0.32, medium: 0.24, small: 0.16 };
  /** The roof: a triangle 0.96 wide (r·√3) squashed to 0.4 tall (1.5·r·squash). */
  var ROOF = { r: 0.96 / Math.sqrt(3), squash: 0.4 / (1.5 * (0.96 / Math.sqrt(3))) };

  function tileHeight(kind) {
    return TILE_HEIGHT[kind] === undefined ? TILE_HEIGHT.grass : TILE_HEIGHT[kind];
  }

  /** Tile (x, y) → world (x, z): the map is centred on the origin, row 0 far (−z), the last row near (+z). */
  function tileCentre(world, x, y) {
    return { x: x - world.w / 2 + 0.5, z: y - world.h / 2 + 0.5 };
  }

  function kindAt(world, x, y) {
    if (x < 0 || y < 0 || x >= world.w || y >= world.h) return null;
    var c = world.cells[y * world.w + x];
    return c ? c.kind : null;
  }

  function hexToInt(colour, fallback) {
    if (typeof colour !== 'string') return fallback;
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colour.trim());
    if (!m) return fallback;
    var s = m[1];
    if (s.length === 3) s = s.charAt(0) + s.charAt(0) + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2);
    return parseInt(s, 16);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The scene — buildScene(world, THREE): every mesh of a world, from primitives
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * A small material cache per THREE (a stub in the gate, the real one in the page): one Lambert per colour, flat
   * shaded. Every mesh of one colour shares it, which is what keeps the draw count small.
   */
  function materials(THREE) {
    var cache = {};
    return function (colour, extra) {
      var key = colour + (extra ? JSON.stringify(extra) : '');
      if (!cache[key]) {
        var opts = { color: colour, flatShading: true };
        if (extra) for (var k in extra) opts[k] = extra[k];
        cache[key] = new THREE.MeshLambertMaterial(opts);
      }
      return cache[key];
    };
  }

  /**
   * A geometry by kind and arguments, made once per engine (`out.geos`, the engine's cache) and shared by every build
   * after it: a rebuild when a tulip is watered makes Mesh objects, never new GPU buffers. With no cache (the gate's
   * single build) it is a plain constructor call.
   */
  function G(THREE, out, kind) {
    var args = Array.prototype.slice.call(arguments, 3);
    var key = kind + '(' + args.join(',') + ')';
    if (out.geos && out.geos[key]) return out.geos[key];
    var geo = new (Function.prototype.bind.apply(THREE[kind], [null].concat(args)))();
    if (out.geos) out.geos[key] = geo;
    return geo;
  }

  function mesh(THREE, geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  /**
   * Instanced boxes for the tiles, one InstancedMesh per kind, alternate grass a shade lighter (the 2D kit’s
   * nth-child(odd)). Returns the meshes and, per tile, the top height the picker and the robots stand on.
   */
  function buildTiles(world, THREE, mat, out) {
    var byKind = {};
    world.cells.forEach(function (c) {
      (byKind[c.kind] = byKind[c.kind] || []).push(c);
    });
    var dummy = new THREE.Object3D();
    var meshes = [];
    for (var kind in byKind) {
      var cells = byKind[kind];
      var height = tileHeight(kind);
      var geo = G(THREE, out, 'BoxGeometry', 1, height, 1);
      var im = new THREE.InstancedMesh(geo, mat(TILE_COLOUR[kind]), cells.length);
      im.name = 'tiles-' + kind;
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var p = tileCentre(world, c.x, c.y);
        dummy.position.set(p.x, height / 2, p.z);
        dummy.rotation.set(0, 0, 0);
        var size = kind === 'water' ? WATER_SIZE : TILE_SIZE;
        dummy.scale.set(size, 1, size);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
        // 🔴 An instance colour MULTIPLIES the material's: a grass-green material under a grass-green instance drew a
        // darker, squared green (s1's shots). The grassy kinds' material is white (TILE_COLOUR).
        if (kind === 'grass' || kind === 'tree' || kind === 'rock' || kind === 'house' || kind === 'wall') {
          im.setColorAt(i, new THREE.Color((c.x + c.y) % 2 ? PALETTE.grassAlt : PALETTE.grass));
        }
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      meshes.push(im);
      out.meshCount++;
    }
    return meshes;
  }

  /**
   * Under the tiles (the mockup's): the sea to the horizon, a sand rim a little wider than the map, and a green base the
   * tiles stand on, which shows between them as the grid. Three meshes whatever the map's size.
   */
  function buildGround(map, THREE, mat, out) {
    var w = Math.max(1, map.w);
    var hh = Math.max(1, map.h);
    var sea = mesh(THREE, G(THREE, out, 'PlaneGeometry', 400, 400), mat(PALETTE.sea), 0, -0.06, 0);
    sea.rotation.x = -Math.PI / 2;
    sea.name = 'sea';
    var sand = mesh(THREE, G(THREE, out, 'BoxGeometry', w + 1.4, 0.3, hh + 1.4), mat(PALETTE.sand), 0, -0.16, 0);
    sand.name = 'sand';
    var base = mesh(THREE, G(THREE, out, 'BoxGeometry', w, 0.06, hh), mat(PALETTE.base), 0, 0, 0);
    base.name = 'base';
    out.meshCount += 3;
    return [sea, sand, base];
  }

  /** The decorations a tile KIND carries (tree, rock, house), instanced per part so a forest is a handful of draws. */
  function buildTileDecor(world, THREE, mat, out) {
    var trees = [];
    var rocks = [];
    var houses = [];
    var walls = [];
    world.cells.forEach(function (c) {
      if (c.kind === 'tree') trees.push(c);
      else if (c.kind === 'rock') rocks.push(c);
      else if (c.kind === 'house') houses.push(c);
      else if (c.kind === 'wall') walls.push(c);
    });
    var dummy = new THREE.Object3D();
    var meshes = [];
    var instanced = function (geo, colour, cells, place) {
      if (!cells.length) return;
      var im = new THREE.InstancedMesh(geo, mat(colour), cells.length);
      for (var i = 0; i < cells.length; i++) {
        var p = tileCentre(world, cells[i].x, cells[i].y);
        place(dummy, p, cells[i], i);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      meshes.push(im);
      out.meshCount++;
    };
    var top = tileHeight('grass');
    // A tree (the mockup's): a trunk under two six-sided cones, the upper one lighter, each tree a little bigger or
    // smaller and turned by its tile, so a forest is not a row of clones.
    var treeScale = function (c) {
      return 0.85 + (((c.x * 31 + c.y * 17) * 7) % 5) * 0.06;
    };
    var treeYaw = function (c) {
      return ((c.x * 31 + c.y * 17) % 6) * 0.5;
    };
    [
      [G(THREE, out, 'CylinderGeometry', 0.07, 0.1, 0.36, 6), PALETTE.trunk, 0.18],
      [G(THREE, out, 'ConeGeometry', 0.4, 0.62, 6), PALETTE.canopy, 0.6],
      [G(THREE, out, 'ConeGeometry', 0.3, 0.5, 6), PALETTE.canopyLight, 0.95]
    ].forEach(function (part) {
      instanced(part[0], part[1], trees, function (d, p, c) {
        var k = treeScale(c);
        d.position.set(p.x, top + part[2] * k, p.z);
        d.rotation.set(0, treeYaw(c), 0);
        d.scale.set(k, k, k);
      });
    });
    // A rock tile (map R): a big flat icosahedron, the same as a rock thing at left 3; it yields nothing (brief §4).
    instanced(G(THREE, out, 'IcosahedronGeometry', 1, 0), PALETTE.rock, rocks, function (d, p, c) {
      d.position.set(p.x, top + ROCK_SIZES.big * 0.75, p.z);
      d.rotation.set(0.3, (c.x + c.y) * 0.7, 0.2);
      d.scale.set(ROCK_SIZES.big, ROCK_SIZES.big * 0.75, ROCK_SIZES.big);
    });
    // A house (the mockup's): a box under a gabled roof whose gables face the front, a door and two windows. The roof is
    // a three-sided cylinder lying front to back, apex up (rotation.x = −90°), squashed to 0.4 tall.
    instanced(G(THREE, out, 'BoxGeometry', 0.8, 0.5, 0.66), PALETTE.wall, houses, function (d, p) {
      d.position.set(p.x, top + 0.25, p.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
    });
    instanced(G(THREE, out, 'CylinderGeometry', ROOF.r, ROOF.r, 0.8, 3), PALETTE.roof, houses, function (d, p) {
      d.position.set(p.x, top + 0.5 + ROOF.r * 0.5 * ROOF.squash, p.z);
      d.rotation.set(-Math.PI / 2, 0, 0);
      d.scale.set(1, 1, ROOF.squash);
    });
    instanced(G(THREE, out, 'BoxGeometry', 0.18, 0.28, 0.04), PALETTE.door, houses, function (d, p) {
      d.position.set(p.x, top + 0.14, p.z + 0.34);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
    });
    instanced(G(THREE, out, 'BoxGeometry', 0.14, 0.14, 0.04), PALETTE.window, houses.concat(houses), function (d, p, c, i) {
      d.position.set(p.x + (i < houses.length ? -0.24 : 0.24), top + 0.3, p.z + 0.34);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
    });
    // P108 IW-002: a wall tile (L) is a dry-stone wall across its grass tile — a grey body and a paler cap, two instanced
    // meshes however many walls; nothing is walked through it (the engine blocks L).
    instanced(G(THREE, out, 'BoxGeometry', 0.98, 0.34, 0.5), PALETTE.stoneWall, walls, function (d, p) {
      d.position.set(p.x, top + 0.17, p.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
    });
    instanced(G(THREE, out, 'BoxGeometry', 1.0, 0.07, 0.58), PALETTE.stoneWallCap, walls, function (d, p) {
      d.position.set(p.x, top + 0.37, p.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
    });
    return meshes;
  }

  /**
   * The things a page places on tiles, one builder per kind (the mockup's primitives). Each returns a Group at the tile's
   * centre, at the tile's top, with `userData.kind`. A thing kind with no entry draws nothing: every kind the 2D kit has
   * a sprite for has an entry here, and the brief's §4 kinds (rock, sign, note) are one or two primitives each.
   */
  var THING_BUILDERS = {
    tulip: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var wet = !!(t.watered === true || t.state === 'watered' || t.state === 'wet');
      var yellow = t.colour === 'yellow';
      var petal = yellow ? (wet ? PALETTE.yellow : PALETTE.yellowDry) : wet ? PALETTE.tulip : PALETTE.tulipDry;
      g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.025, 0.03, 0.34, 5), mat(PALETTE.stem), 0, 0.17, 0));
      g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.12, 0.05, 0.2, 5), mat(petal), 0, 0.42, 0));
      var l1 = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.16, 0.02), mat(PALETTE.stem), -0.07, 0.14, 0);
      l1.rotation.z = 0.7;
      var l2 = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.16, 0.02), mat(PALETTE.stem), 0.07, 0.14, 0);
      l2.rotation.z = -0.7;
      g.add(l1, l2);
      out.meshCount += 4;
      // Dry: tilted, and the petal is the 2D kit's dry colour (its petal at .55 over the bed; P106 s3: faded, never
      // desaturated, so a dry red and a dry yellow stay apart for Mamie's note). Wet: upright.
      g.rotation.z = wet ? 0 : 0.31;
      g.userData.wet = wet;
      // P108 IW-002: a tulip with some of its drinks stands half up; a worn one (droop) hangs lower than a dry one.
      var tm = meterOf(t);
      if (!wet && t.droop === true) {
        g.rotation.z = 0.55;
        g.scale.set(0.9, 0.9, 0.9);
        g.userData.look = 'droop';
      } else if (!wet && tm && tm.have > 0) {
        g.rotation.z = 0.16;
        g.userData.look = 'part';
      }
      return g;
    },
    puddle: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.3, 0.3, 0.02, 8), mat(PALETTE.puddle), 0, 0.01, 0));
      out.meshCount += 1;
      return g;
    },
    letter: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var paper = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.3, 0.02, 0.2), mat(PALETTE.letter), 0, 0.02, 0);
      var flap = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.02, 0.08), mat(PALETTE.letterInk), 0, 0.035, -0.04);
      g.add(paper, flap);
      g.rotation.y = 0.4;
      out.meshCount += 2;
      return g;
    },
    bowl: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.22, 0.15, 0.12, 8), mat(PALETTE.bowl), 0, 0.06, 0));
      out.meshCount += 1;
      var bm = meterOf(t);
      if (t.full || (bm && bm.have > 0)) {
        g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.16, 0.16, 0.06, 8), mat(PALETTE.kibble), 0, 0.14, 0));
        out.meshCount += 1;
      }
      return g;
    },
    label: function (THREE) {
      // A label is text: it is a DOM overlay (see the engine), not a mesh. An empty group holds its place.
      return new THREE.Group();
    },
    postbox: function (THREE, mat, t, out) {
      // The post box (IG-001 D9, the mockup's): an iron post, a red box, a white slot on its front.
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.08, 0.4, 0.08), mat(PALETTE.iron), 0, 0.2, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.34, 0.4, 0.3), mat(PALETTE.roof), 0, 0.6, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.04, 0.04), mat(PALETTE.paper), 0, 0.68, -0.15));
      out.meshCount += 3;
      return g;
    },
    // A mineable rock (brief §4): big at left ≥ 3, medium at 2, small at 1 (a pebble beside it from medium up); at 0
    // the engine removes the thing, and a 0 that arrives anyway draws nothing. No `left` is a rock a request placed: big.
    rock: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var left = t.left === undefined || t.left === null || t.left === '' || !isFinite(Number(t.left)) ? 4 : Math.floor(Number(t.left));
      var size = left >= 3 ? 'big' : left === 2 ? 'medium' : left === 1 ? 'small' : 'none';
      g.userData.size = size;
      // P108 IW-002: a rock with a max regrows — used up, it stays as a pale stub where it will grow back.
      if (size === 'none' && wholeOf(t.max)) {
        var stub = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(PALETTE.rockLight), 0, 0.05, 0);
        stub.scale.set(0.16, 0.05, 0.16);
        g.add(stub);
        out.meshCount += 1;
        g.userData.size = 'used';
        return g;
      }
      if (size === 'none') return g;
      var r = ROCK_SIZES[size];
      var main = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(PALETTE.rock), 0, r * 0.75, 0);
      main.scale.set(r, r * 0.75, r);
      main.rotation.set(0.3, (Number(t.x) + Number(t.y)) * 0.7, 0.2);
      g.add(main);
      out.meshCount += 1;
      if (left >= 2) {
        var pebble = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(PALETTE.rockLight), 0.22, 0.09, 0.16);
        pebble.scale.set(0.12, 0.09, 0.12);
        g.add(pebble);
        out.meshCount += 1;
      }
      return g;
    },
    // A stone (IG-001 D9; IG-002 picks it from a rock): a small flat pebble.
    stone: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var m = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(PALETTE.rockLight), 0, 0.07, 0);
      m.scale.set(0.14, 0.08, 0.14);
      m.rotation.y = (Number(t.x) * 3 + Number(t.y)) * 0.6;
      g.add(m);
      out.meshCount += 1;
      return g;
    },
    // A sign (brief §4): a post with a board. Its text is Olive's to read, never drawn on the tile.
    sign: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.5, 0.05), mat(PALETTE.trunk), 0, 0.25, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.44, 0.26, 0.04), mat(PALETTE.paper), 0, 0.5, 0));
      out.meshCount += 2;
      return g;
    },
    // A note (brief §4): a paper on the ground with a coral heading line. Its text is never drawn on the tile.
    note: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.34, 0.02, 0.44), mat(PALETTE.paper), 0, 0.02, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.22, 0.02, 0.03), mat(PALETTE.coral), 0, 0.03, -0.1));
      g.rotation.y = -0.3;
      out.meshCount += 2;
      return g;
    },
    egg: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var egg = mesh(THREE, G(THREE, out, 'SphereGeometry', 0.14, 8, 6), mat(PALETTE.letter), 0, 0.16, 0);
      egg.scale.y = 1.3;
      g.add(egg);
      out.meshCount += 1;
      return g;
    },
    food: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.16, 0.16, 0.1, 8), mat(PALETTE.kibble), 0, 0.05, 0));
      out.meshCount += 1;
      return g;
    },
    flag: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var pole = mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.02, 0.02, 0.6, 5), mat(PALETTE.ink), 0, 0.3, 0);
      var cloth = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.26, 0.16, 0.02), mat(PALETTE.sun), 0.14, 0.5, 0);
      g.add(pole, cloth);
      out.meshCount += 2;
      return g;
    },
    // P106 IG-003 (the s3 brief §4.4): the tick on the tile a child predicted right — a green disc standing up, a white
    // check across it (a short stroke and a long one), turned to the camera's side. It blocks nothing.
    tick: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var disc = mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.26, 0.26, 0.04, 16), mat(PALETTE.stem), 0, 0.42, 0);
      disc.rotation.x = Math.PI / 2;
      var shortStroke = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.16, 0.03), mat(PALETTE.white), -0.07, 0.39, 0.03);
      shortStroke.rotation.z = 0.8;
      var longStroke = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.3, 0.03), mat(PALETTE.white), 0.05, 0.44, 0.03);
      longStroke.rotation.z = -0.65;
      g.add(disc, shortStroke, longStroke);
      g.rotation.y = 0.42;
      out.meshCount += 3;
      return g;
    },
    // P106 IG-004 (lane E) — an islander standing by her plot (the mockup's): Mamie Rose in her violet dress and white
    // hair, Sami in his blue cap with a satchel, Biscuit the cat. `who` is sami | mamie | biscuit. Her bubble is a DOM
    // overlay (the engine), never text on a tile.
    islander: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var add = function (m) {
        g.add(m);
        out.meshCount += 1;
        return m;
      };
      if (t.who === 'biscuit') {
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.42, 0.22, 0.22), mat(PALETTE.cat), 0, 0.11, 0));
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.24, 0.22, 0.22), mat(PALETTE.cat), 0.28, 0.24, 0));
        add(mesh(THREE, G(THREE, out, 'ConeGeometry', 0.05, 0.1, 4), mat(PALETTE.cat), 0.2, 0.4, -0.07));
        add(mesh(THREE, G(THREE, out, 'ConeGeometry', 0.05, 0.1, 4), mat(PALETTE.cat), 0.2, 0.4, 0.07));
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.03, 0.03, 0.03), mat(PALETTE.ink), 0.41, 0.28, -0.06));
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.03, 0.03, 0.03), mat(PALETTE.ink), 0.41, 0.28, 0.06));
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.04, 0.03, 0.03), mat(PALETTE.nose), 0.41, 0.22, 0));
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.28, 0.05, 0.05), mat(PALETTE.cat), -0.3, 0.2, 0)).rotation.z = 0.6;
        g.rotation.y = -0.6;
      } else {
        var postie = t.who === 'sami';
        add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.14, 0.2, 0.42, 6), mat(postie ? PALETTE.postie : PALETTE.granny), 0, 0.21, 0));
        add(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.15, 6, 5), mat(PALETTE.skin), 0, 0.55, 0));
        if (postie) {
          add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.34, 0.06, 0.34), mat(PALETTE.postie), 0, 0.66, 0));
          add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.08, 0.2), mat(PALETTE.postie), 0, 0.72, 0));
          add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.18, 0.2, 0.08), mat(PALETTE.satchel), 0.16, 0.26, 0));
        } else {
          add(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.16, 6, 4), mat(PALETTE.hair), 0, 0.6, 0.02)).scale.set(1, 0.7, 1);
          add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.1, 0.02, 0.1), mat(PALETTE.ink), 0, 0.53, -0.14));
        }
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.03, 0.03, 0.02), mat(PALETTE.ink), -0.05, 0.57, -0.14));
        add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.03, 0.03, 0.02), mat(PALETTE.ink), 0.05, 0.57, -0.14));
      }
      g.userData.who = t.who;
      return g;
    },
    // A fence round a locked plot: the rectangle of w × h tiles from its (x, y) tile — a post at every tile corner of
    // its edge (ONE instanced mesh) and a rail along each side. The group sits on tile (x, y)'s centre, so the corner is
    // half a tile up and left of it.
    fence: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var w = Math.max(1, Math.floor(Number(t.w)) || 1);
      var d = Math.max(1, Math.floor(Number(t.h)) || 1);
      var corners = [];
      for (var i = 0; i <= w; i++) corners.push([i - 0.5, -0.5], [i - 0.5, d - 0.5]);
      for (var j = 1; j < d; j++) corners.push([-0.5, j - 0.5], [w - 0.5, j - 0.5]);
      var posts = new THREE.InstancedMesh(G(THREE, out, 'BoxGeometry', 0.07, 0.4, 0.07), mat(PALETTE.fence), corners.length);
      var dummy = new THREE.Object3D();
      for (var k = 0; k < corners.length; k++) {
        dummy.position.set(corners[k][0], 0.2, corners[k][1]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        posts.setMatrixAt(k, dummy.matrix);
      }
      posts.instanceMatrix.needsUpdate = true;
      g.add(posts);
      out.meshCount += 1;
      var rail = function (x, z, sx, sz) {
        g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', sx, 0.05, sz), mat(PALETTE.fence), x, 0.3, z));
        out.meshCount += 1;
      };
      rail(w / 2 - 0.5, -0.5, w, 0.04);
      rail(w / 2 - 0.5, d - 0.5, w, 0.04);
      rail(-0.5, d / 2 - 0.5, 0.04, d);
      rail(w - 0.5, d / 2 - 0.5, 0.04, d);
      g.userData.w = w;
      g.userData.h = d;
      g.userData.posts = corners.length;
      return g;
    },
    // A padlock over a locked plot: a gold body, a keyhole, a shackle (three boxes), floating at the top-left corner of
    // its tile — the page puts it on the plot's middle tile, so it floats over the middle of the plot.
    padlock: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.56, 0.44, 0.2), mat(PALETTE.gold), -0.5, 1.12, -0.5));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.1, 0.14, 0.06), mat(PALETTE.ink), -0.5, 1.1, -0.39));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.06, 0.24, 0.06), mat(PALETTE.iron), -0.66, 1.42, -0.5));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.06, 0.24, 0.06), mat(PALETTE.iron), -0.34, 1.42, -0.5));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.38, 0.06, 0.06), mat(PALETTE.iron), -0.5, 1.54, -0.5));
      out.meshCount += 5;
      return g;
    },
    // ── P108 IW-002 AC6 (lane D): the job model's things, the mockup's primitives (island-jobs.html). Their meters are
    // DOM chips in the overlay (the mockup's), never text on a tile. ──
    // A path site: a ground patch by stage (dirt → gravel → cobbles → path) and a stone per stone laid until it is path.
    site: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var stage = siteStage(t);
      var colour = stage === 'path' ? PALETTE.path : stage === 'cobbles' ? PALETTE.cobble : stage === 'gravel' ? PALETTE.gravel : PALETTE.dirt;
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.94, 0.05, 0.94), mat(colour), 0, 0.025, 0));
      out.meshCount += 1;
      if (stage !== 'path') {
        var spots = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2], [0, 0], [0, -0.3], [0, 0.3], [-0.3, 0]];
        var laid = Math.min((meterOf(t) || { have: 0 }).have, spots.length);
        for (var i = 0; i < laid; i++) {
          var st = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(i % 2 ? PALETTE.rock : PALETTE.rockLight), spots[i][0], 0.07, spots[i][1]);
          st.scale.set(0.15, 0.06, 0.15);
          st.rotation.y = i * 0.9;
          g.add(st);
          out.meshCount += 1;
        }
      } else {
        g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.94, 0.02, 0.06), mat(PALETTE.sand), 0, 0.055, -0.44));
        g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.94, 0.02, 0.06), mat(PALETTE.sand), 0, 0.055, 0.44));
        out.meshCount += 2;
      }
      g.userData.stage = stage;
      return g;
    },
    // A basket: a wicker tub with a handle; an egg in it per egg counted (up to eight shown).
    basket: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.24, 0.18, 0.2, 10), mat(PALETTE.wicker), 0, 0.1, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.04, 0.26, 0.04), mat(PALETTE.satchelStrap), -0.2, 0.3, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.04, 0.26, 0.04), mat(PALETTE.satchelStrap), 0.2, 0.3, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.44, 0.04, 0.04), mat(PALETTE.satchelStrap), 0, 0.44, 0));
      out.meshCount += 4;
      var spots = [[-0.08, -0.07], [0.08, -0.07], [-0.08, 0.08], [0.08, 0.08], [0, 0], [0, -0.14], [0, 0.14], [-0.14, 0]];
      var n = Math.min((meterOf(t) || { have: 0 }).have, spots.length);
      // P108 IW-003 (lane B): Biscuit's basket holds his ball, not eggs.
      if (t.item === 'ball' && n > 0) {
        g.add(ballOf(THREE, mat, out, 0.13, 0.26));
        g.userData.ball = true;
        return g;
      }
      for (var i = 0; i < n; i++) {
        var e = mesh(THREE, G(THREE, out, 'SphereGeometry', 1, 8, 6), mat(PALETTE.egg), spots[i][0], 0.2 + (i >= 4 ? 0.06 : 0), spots[i][1]);
        e.scale.set(0.065, 0.085, 0.065);
        g.add(e);
        out.meshCount += 1;
      }
      g.userData.eggs = n;
      return g;
    },
    // A store: a wooden crate; stones heaped on it per stone counted (up to six shown).
    store: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.56, 0.34, 0.5), mat(PALETTE.crate), 0, 0.17, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.58, 0.04, 0.52), mat(PALETTE.satchelStrap), 0, 0.2, 0));
      out.meshCount += 2;
      var spots = [[-0.14, -0.1], [0.14, -0.1], [-0.14, 0.12], [0.14, 0.12], [0, 0], [0, 0.02]];
      var n = Math.min((meterOf(t) || { have: 0 }).have, spots.length);
      // P108 IW-003 (lane B): a store of food (Biscuit's sack, his treat jar) — biscuits on the crate, by its count.
      if (t.item === 'food') {
        var nf = Math.min(Math.max(n, Math.floor(Number(t.count)) || 0), 4);
        for (var f = 0; f < nf; f++) g.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.1, 0.1, 0.05, 8), mat(PALETTE.biscuit), spots[f][0], 0.39 + f * 0.012, spots[f][1]));
        out.meshCount += nf;
        g.userData.food = nf;
        return g;
      }
      for (var i = 0; i < n; i++) {
        var st = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(i % 2 ? PALETTE.rock : PALETTE.rockLight), spots[i][0], 0.4 + (i >= 4 ? 0.07 : 0), spots[i][1]);
        st.scale.set(0.12, 0.08, 0.12);
        g.add(st);
        out.meshCount += 1;
      }
      return g;
    },
    // The watering can lying on the map (the mockup's canProp): its body, spout and handle, and its water at level/max.
    can: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.24, 0.2), mat(PALETTE.can), 0, 0.12, 0));
      var sp = mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.022, 0.034, 0.22, 5), mat(PALETTE.can), 0.16, 0.2, 0);
      sp.rotation.z = -0.9;
      g.add(sp);
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.04, 0.12, 0.16), mat(PALETTE.can), -0.02, 0.3, 0));
      out.meshCount += 3;
      var m = meterOf(t);
      var share = m && m.need > 0 ? Math.max(0, Math.min(1, m.have / m.need)) : 0;
      var level = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.21, 0.24, 0.21), mat(PALETTE.canWater), 0, 0.12 * share, 0);
      level.name = 'level';
      level.scale.y = share;
      level.visible = share > 0;
      g.add(level);
      out.meshCount += 1;
      g.rotation.y = 0.5;
      return g;
    },
    // The hen (the mockup's) and her pen: a straw floor over the pen's tiles and a rail round it, drawn from the hen's
    // tile (the pen is [x0, y0, x1, y1]), so one hen is one group.
    hen: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      var bird = new THREE.Group();
      var add = function (m) {
        bird.add(m);
        out.meshCount += 1;
        return m;
      };
      add(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.18, 7, 5), mat(PALETTE.hen), 0, 0.2, 0)).scale.set(1.25, 1, 1);
      add(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.1, 6, 5), mat(PALETTE.hen), 0.2, 0.36, 0));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.08, 0.1), mat(PALETTE.comb), 0.22, 0.47, 0));
      add(mesh(THREE, G(THREE, out, 'ConeGeometry', 0.035, 0.08, 4), mat(PALETTE.beak), 0.31, 0.35, 0)).rotation.z = -Math.PI / 2;
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.025, 0.025, 0.02), mat(PALETTE.ink), 0.26, 0.39, 0.07));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.025, 0.025, 0.02), mat(PALETTE.ink), 0.26, 0.39, -0.07));
      add(mesh(THREE, G(THREE, out, 'ConeGeometry', 0.08, 0.16, 5), mat(PALETTE.hen), -0.24, 0.3, 0)).rotation.z = 0.8;
      bird.rotation.y = 0.5;
      bird.name = 'hen';
      g.add(bird);
      var pen = penOf(t);
      if (pen) {
        var ox = pen.x - Number(t.x);
        var oz = pen.y - Number(t.y);
        var floor = mesh(THREE, G(THREE, out, 'BoxGeometry', 1, 0.02, 1), mat(PALETTE.straw), ox + pen.w / 2 - 0.5, 0.012, oz + pen.h / 2 - 0.5);
        floor.scale.set(pen.w - 0.04, 1, pen.h - 0.04);
        floor.name = 'pen';
        g.add(floor);
        var rail = function (x, z, sx, sz) {
          g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', sx, 0.05, sz), mat(PALETTE.fence), x, 0.22, z));
        };
        rail(ox + pen.w / 2 - 0.5, oz - 0.5, pen.w, 0.04);
        rail(ox + pen.w / 2 - 0.5, oz + pen.h - 0.5, pen.w, 0.04);
        rail(ox - 0.5, oz + pen.h / 2 - 0.5, 0.04, pen.h);
        rail(ox + pen.w - 0.5, oz + pen.h / 2 - 0.5, 0.04, pen.h);
        out.meshCount += 5;
        g.userData.pen = pen;
      }
      return g;
    },
    // P108 IW-003 (lane P): a front door standing on its step, facing the camera (+z, as the houses' doors do), with a
    // letterbox; a letter through it (count > 0) shows its corner above the slot. Its owner's name is a plate the overlay
    // draws under it (userData.owner).
    door: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.62, 0.06, 0.34), mat(PALETTE.path), 0, 0.03, 0.08));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.5, 0.8, 0.12), mat(PALETTE.hodPole), 0, 0.46, 0));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.4, 0.7, 0.04), mat(PALETTE.door), 0, 0.43, 0.06));
      g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.22, 0.05, 0.02), mat(PALETTE.ink), 0, 0.58, 0.085));
      g.add(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.035, 6, 5), mat(PALETTE.yellow), 0.13, 0.42, 0.09));
      out.meshCount += 5;
      var dm = meterOf(t);
      if (dm && dm.have > 0) {
        var mail = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.12, 0.02), mat(PALETTE.letter), 0, 0.66, 0.09);
        mail.name = 'mail';
        g.add(mail);
        g.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.025, 0.022), mat(PALETTE.letterInk), 0, 0.7, 0.092));
        out.meshCount += 2;
        g.userData.mail = true;
      }
      g.userData.owner = t.owner === undefined || t.owner === null ? '' : String(t.owner);
      return g;
    },
    // P108 IW-003 (lane B): Biscuit's ball, lying on the grass by the wall.
    ball: function (THREE, mat, t, out) {
      var g = new THREE.Group();
      g.add(ballOf(THREE, mat, out, 0.15, 0.15));
      return g;
    }
  };
  /** P108 IW-003 (lane B): a red ball with a white seam, of radius r, its middle at height y (on the map, in a basket, on a back). */
  function ballOf(THREE, mat, out, r, y) {
    var b = new THREE.Group();
    b.add(mesh(THREE, G(THREE, out, 'SphereGeometry', r, 10, 8), mat(PALETTE.ball), 0, y, 0));
    var seam = mesh(THREE, G(THREE, out, 'CylinderGeometry', r * 1.02, r * 1.02, r * 0.18, 12), mat(PALETTE.ballSeam), 0, y, 0);
    seam.rotation.x = 0.5;
    b.add(seam);
    out.meshCount += 2;
    b.name = 'ball';
    return b;
  }

  // ── P108 IW-003 (lane S): Sami's bench — a site with build 'bench', drawn by stage (the 2D kit's five stages) ────────
  /** The bench's stage by its stones: 0 pegs and string on dirt · 1 a leg · 2 two legs · 3 the seat · 4 built (the back; Sami sits). */
  function benchStage(t) {
    var need = (t && wholeOf(t.need)) || 1;
    var have = Math.min((t && wholeOf(t.have)) || 0, need);
    return have >= need ? 4 : Math.min(3, Math.floor((have * 4) / need));
  }
  JOB_LOOK.benchStage = benchStage;
  var pathSiteBuilder = THING_BUILDERS.site;
  THING_BUILDERS.site = function (THREE, mat, t, out) {
    if (!t || t.build !== 'bench') return pathSiteBuilder(THREE, mat, t, out);
    var g = new THREE.Group();
    var st = benchStage(t);
    var add = function (m) {
      g.add(m);
      out.meshCount += 1;
      return m;
    };
    // The ground: dirt while it is built, gravel once it stands.
    add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.94, 0.05, 0.94), mat(st === 4 ? PALETTE.gravel : PALETTE.dirt), 0, 0.025, 0));
    // Stage 0–2: the builder's pegs at the seat's two ends (the plan on the ground).
    if (st < 3) {
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.3, 0.05), mat(PALETTE.fence), -0.42, 0.15, 0));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.3, 0.05), mat(PALETTE.fence), 0.42, 0.15, 0));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.84, 0.01, 0.01), mat(PALETTE.white), 0, 0.28, 0));
    }
    // The legs rise first (one at stage 1, both at 2), then the seat (3), then the back (4).
    if (st >= 1) add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.14, 0.26, 0.34), mat(PALETTE.rock), -0.28, 0.18, 0)).name = 'leg';
    if (st >= 2) add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.14, 0.26, 0.34), mat(PALETTE.rock), 0.28, 0.18, 0)).name = 'leg';
    if (st >= 3) add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.8, 0.08, 0.42), mat(PALETTE.rockLight), 0, 0.35, 0)).name = 'seat';
    if (st >= 4) {
      // The back on the north side (−z): the bench faces the path below it, and the camera.
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.76, 0.22, 0.07), mat(PALETTE.cobble), 0, 0.56, -0.18)).name = 'back';
      // Sami sits on it: the islander (his cap, his satchel), lowered onto the seat and turned to face the path (an
      // islander faces −z; half a turn faces +z, the path and the camera).
      var sami = THING_BUILDERS.islander(THREE, mat, { kind: 'islander', who: 'sami' }, out);
      sami.scale.set(0.8, 0.62, 0.8);
      sami.rotation.y = Math.PI;
      sami.position.set(0, 0.39, -0.02);
      sami.name = 'sami';
      g.add(sami);
    }
    g.userData.stage = 'bench' + st;
    g.userData.bench = st;
    return g;
  };

  /**
   * The load a robot shows on its back: the LAST entry of `carry` (brief §4). stone, letter, egg and food are drawn as
   * themselves (as the 2D kit draws them, lane A's IG-002); anything else is the generic parcel.
   */
  var LOADS = ['stone', 'letter', 'egg', 'food', 'ball'];
  function loadOf(r) {
    var carry = Array.isArray(r.carry) ? r.carry : [];
    if (!carry.length) return null;
    var last = String(carry[carry.length - 1]);
    return LOADS.indexOf(last) !== -1 ? last : 'parcel';
  }

  /**
   * A robot (the mockup's robotMesh): a box body in its colour, a white visor on the front (−z at yaw 0), two eyes, a
   * mouth, two dark wheels, an antenna with a gold ball, the hat, the watering can on its right with its level, and
   * the load on its back. Yaw 0 faces d = 0 (up, −z); d turns clockwise seen from above, so rotation.y = −d·π/2.
   *
   * The can's level is `can` of `canMax` (brief §4): a lighter band inside the can, as tall as the share left; at 0 it
   * is hidden (no drops); when `can` is null there is no level at all (this robot has no can level to show).
   */
  /** The watering can on the robot's right, with its level when there is one (IG-002; a function since IG-005). */
  function buildCan(THREE, mat, r, out, g) {
    var can = new THREE.Group();
    can.name = 'can';
    can.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.16, 0.2, 0.16), mat(PALETTE.can), 0, 0.1, 0));
    var spout = mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.02, 0.03, 0.18, 4), mat(PALETTE.can), 0, 0.16, -0.12);
    spout.rotation.x = 0.9;
    can.add(spout);
    out.meshCount += 2;
    if (r.can !== null && r.can !== undefined && isFinite(Number(r.can))) {
      var max = Number(r.canMax) > 0 ? Number(r.canMax) : 3;
      var share = Math.max(0, Math.min(1, Number(r.can) / max));
      var level = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.17, 0.2, 0.17), mat(PALETTE.canWater), 0, 0.1 * share, 0);
      level.name = 'level';
      level.scale.y = share;
      level.visible = share > 0;
      level.userData.can = Number(r.can);
      level.userData.canMax = max;
      can.add(level);
      out.meshCount += 1;
    }
    can.position.set(0.38, 0.14, 0.02);
    g.add(can);
  }

  /**
   * P106 IG-005: what a robot wears for its job, a few primitives each: Cobble's hod (a wooden trough on a pole, a stone
   * in it) on his left, Pocket's satchel (a strap across, a bag at the hip) on his right, Echo's gold bell under the
   * visor. Named `accessory` with its kind, so a gate can find it. The can is `buildCan`; '' draws nothing.
   */
  function accessoryGroup(THREE, mat, kind, out) {
    if (kind !== 'hod' && kind !== 'satchel' && kind !== 'bell') return null;
    var a = new THREE.Group();
    a.name = 'accessory';
    a.userData.accessory = kind;
    var put = function (m) {
      a.add(m);
      out.meshCount += 1;
      return m;
    };
    if (kind === 'hod') {
      put(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.02, 0.02, 0.5, 4), mat(PALETTE.hodPole), -0.36, 0.3, 0.1));
      var trough = put(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.12, 0.3), mat(PALETTE.hod), -0.36, 0.6, 0.1));
      trough.rotation.z = 0.35;
      put(mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 0.07, 0), mat(PALETTE.rockLight), -0.38, 0.69, 0.1));
    } else if (kind === 'satchel') {
      var strap = put(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.05, 0.62, 0.46), mat(PALETTE.satchelStrap), 0, 0.4, 0));
      strap.rotation.z = 0.7;
      put(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.1, 0.2, 0.26), mat(PALETTE.satchel), 0.3, 0.2, 0.05));
    } else {
      put(mesh(THREE, G(THREE, out, 'ConeGeometry', 0.08, 0.12, 6), mat(PALETTE.bell), 0, 0.2, -0.26));
      put(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.025, 5, 4), mat(PALETTE.bellInk), 0, 0.13, -0.26));
    }
    return a;
  }

  function buildRobot(THREE, mat, r, out) {
    var g = new THREE.Group();
    var body = hexToInt(r.colour, PALETTE.coral);
    var bodyMat = mat(body);
    var ink = mat(PALETTE.ink);
    var add = function (m) {
      g.add(m);
      out.meshCount += 1;
      return m;
    };
    add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.5, 0.5, 0.44), bodyMat, 0, 0.37, 0));
    add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.36, 0.18, 0.06), mat(PALETTE.visor), 0, 0.46, -0.23)).name = 'visor';
    if (r.eyes === 'happy') {
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.08, 0.03, 0.02), ink, -0.09, 0.47, -0.27));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.08, 0.03, 0.02), ink, 0.09, 0.47, -0.27));
    } else {
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.07, 0.07, 0.02), ink, -0.09, 0.46, -0.27));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', r.eyes === 'wink' ? 0.09 : 0.07, r.eyes === 'wink' ? 0.03 : 0.07, 0.02), ink, 0.09, 0.46, -0.27));
    }
    add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.16, 0.05, 0.02), ink, 0, 0.28, -0.23));
    add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.1, 0.2, 0.28), mat(PALETTE.wheel), -0.3, 0.12, 0));
    add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.1, 0.2, 0.28), mat(PALETTE.wheel), 0.3, 0.12, 0));
    add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.015, 0.015, 0.16, 4), ink, 0, 0.7, 0));
    add(mesh(THREE, G(THREE, out, 'SphereGeometry', 0.045, 5, 4), mat(PALETTE.bulb), 0, 0.8, 0));
    if (r.hat === 'cap') {
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.42, 0.09, 0.42), mat(PALETTE.cap), 0, 0.66, 0));
      add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.34, 0.03, 0.2), mat(PALETTE.cap), 0, 0.63, -0.3));
    } else if (r.hat === 'sun') {
      // The sunflower: a brown heart and eight petals, tipped a little (the mockup's).
      var sun = new THREE.Group();
      sun.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.1, 0.1, 0.05, 8), mat(PALETTE.sunCrown), 0, 0, 0));
      out.meshCount += 1;
      for (var i = 0; i < 8; i++) {
        var petal = mesh(THREE, G(THREE, out, 'BoxGeometry', 0.08, 0.03, 0.16), mat(PALETTE.sun), Math.sin((i * Math.PI) / 4) * 0.16, 0, Math.cos((i * Math.PI) / 4) * 0.16);
        petal.rotation.y = (i * Math.PI) / 4;
        sun.add(petal);
        out.meshCount += 1;
      }
      sun.position.set(0.06, 0.66, 0.06);
      sun.rotation.z = -0.25;
      g.add(sun);
    } else if (r.hat === 'crown') {
      add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.17, 0.14, 0.14, 5, 1, true), mat(PALETTE.crown, { side: THREE.DoubleSide }), 0, 0.68, 0));
    }
    // P106 IG-005: what the robot wears for its job (the hod, the satchel, the bell); the can is below, as before.
    var acc = accessoryGroup(THREE, mat, r.accessory, out);
    if (acc) g.add(acc);
    // The can, on the right: its body, its spout, and the level when there is one. IG-005: only on a robot that carries
    // it — the can is Pip's accessory — or one with a level to show.
    var hasLevel = r.can !== null && r.can !== undefined && isFinite(Number(r.can));
    if (r.accessory === 'can' || hasLevel || r.holds === 'can') buildCan(THREE, mat, r, out, g);
    // The load, on the back (+z): the last thing carried.
    var load = loadOf(r);
    if (load) {
      var back = new THREE.Group();
      back.name = 'load';
      back.userData.load = load;
      if (load === 'stone') {
        var st = mesh(THREE, G(THREE, out, 'IcosahedronGeometry', 1, 0), mat(PALETTE.rockLight), 0, 0, 0);
        st.scale.set(0.13, 0.1, 0.13);
        back.add(st);
        out.meshCount += 1;
      } else if (load === 'egg') {
        var egg = mesh(THREE, G(THREE, out, 'SphereGeometry', 0.1, 8, 6), mat(PALETTE.letter), 0, 0, 0);
        egg.scale.y = 1.3;
        back.add(egg);
        out.meshCount += 1;
      } else if (load === 'food') {
        back.add(mesh(THREE, G(THREE, out, 'CylinderGeometry', 0.13, 0.13, 0.08, 8), mat(PALETTE.kibble), 0, 0, 0));
        out.meshCount += 1;
      } else if (load === 'ball') {
        back.add(ballOf(THREE, mat, out, 0.11, 0));
      } else if (load === 'letter') {
        back.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.28, 0.2, 0.03), mat(PALETTE.letter), 0, 0, 0));
        back.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.2, 0.08, 0.02), mat(PALETTE.letterInk), 0, 0.04, 0.02));
        out.meshCount += 2;
      } else {
        back.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.24, 0.18, 0.18), mat(PALETTE.parcel), 0, 0, 0));
        back.add(mesh(THREE, G(THREE, out, 'BoxGeometry', 0.25, 0.04, 0.19), mat(PALETTE.coral), 0, 0, 0));
        out.meshCount += 2;
      }
      back.position.set(0, 0.46, 0.3);
      g.add(back);
    }
    g.userData.head = { x: 0, y: 0.86, z: 0 };
    g.name = 'robot';
    return g;
  }

  /**
   * Every mesh of a world, pure in THREE: `{ root, tiles, decor, things, robots, lights, meshCount }`. Instanced
   * tiles and instanced decorations count as one mesh each. The engine adds `root` to its scene; the gate counts.
   */
  function buildScene(world, THREE, shared) {
    var out = { meshCount: 0, geos: shared ? shared.geos : null };
    var mat = shared ? shared.mat : materials(THREE);
    var root = new THREE.Group();
    root.name = 'garden';
    var ground = buildGround(world.map, THREE, mat, out);
    ground.forEach(function (m) {
      root.add(m);
    });
    var tiles = buildTiles(world.map, THREE, mat, out);
    var decor = buildTileDecor(world.map, THREE, mat, out);
    tiles.forEach(function (m) {
      root.add(m);
    });
    decor.forEach(function (m) {
      root.add(m);
    });
    // A tulip bed draws a dry tulip until a Thing waters it: the bed cells with no tulip Thing get one.
    var thingsAt = {};
    world.things.forEach(function (t) {
      (thingsAt[Number(t.x) + ',' + Number(t.y)] = thingsAt[Number(t.x) + ',' + Number(t.y)] || []).push(t);
    });
    var things = [];
    // P108 IW-002: where a meter chip floats over each kind (the mockup's lifts, in world units above the tile top).
    var METER_LIFT = { tulip: 0.72, site: 0.3, basket: 0.62, bowl: 0.45, store: 0.7, can: 0.62, rock: 0.72, hen: 0.66 };
    METER_LIFT.door = 0.98; // P108 IW-003 (lane P): over the door's lintel.
    var placeThing = function (t, i) {
      var build = THING_BUILDERS[t.kind];
      if (!build) return;
      var x = Number(t.x);
      var y = Number(t.y);
      var g = build(THREE, mat, t, out);
      var p = tileCentre(world.map, x, y);
      var k = kindAt(world.map, x, y);
      g.position.set(p.x, (g.position.y || 0) + tileHeight(k || 'grass'), p.z);
      // P108 IW-002: a letter the post box THING received stands in its slot (a letter on the map's B tile lies as before).
      if (t.kind === 'letter' && (thingsAt[x + ',' + y] || []).some(function (o) { return o.kind === 'postbox'; })) {
        g.position.y += 0.66;
        g.position.z -= 0.16;
        g.rotation.x = Math.PI / 2;
        g.userData.inBox = true;
      }
      g.userData.baseY = g.position.y;
      // The meter, the index a Watch resolves to, and the chip's lift (the overlay draws both).
      g.userData.meter = meterOf(t);
      g.userData.index = typeof i === 'number' ? i : -1;
      g.userData.lift = METER_LIFT[t.kind] || 0.62;
      // P108 IW-003 (lane S): a bench's chip floats over its back and Sami, not at a path square's height.
      if (t.kind === 'site' && t.build === 'bench') g.userData.lift = 1.02;
      g.userData.kind = t.kind;
      g.userData.x = x;
      g.userData.y = y;
      g.userData.text = t.text;
      // IG-004: an islander's bubble (her open request, in the child's words) is drawn by the overlay.
      if (t.kind === 'islander') g.userData.say = typeof t.say === 'string' ? t.say : '';
      g.userData.key = t.kind + ':' + x + ',' + y;
      root.add(g);
      things.push(g);
    };
    world.map.cells.forEach(function (c) {
      var here = thingsAt[c.x + ',' + c.y] || [];
      var hasTulip = here.some(function (t) {
        return t.kind === 'tulip';
      });
      if (c.kind === 'bed' && !hasTulip) placeThing({ kind: 'tulip', x: c.x, y: c.y, watered: false });
      // A postbox TILE (legend B, IG-001 D9) is a path tile wearing the post box, as the 2D kit draws it.
      if (c.kind === 'postbox') placeThing({ kind: 'postbox', x: c.x, y: c.y });
      here.forEach(function (t) {
        placeThing(t, world.things.indexOf(t));
      });
    });
    // Robots, two on one tile drawn smaller and apart (the 2D kit’s robotPlaces: −90%/−10% offsets, scale .78).
    var byTile = {};
    world.robots.forEach(function (r, i) {
      (byTile[r.x + ',' + r.y] = byTile[r.x + ',' + r.y] || []).push(i);
    });
    var robots = world.robots.map(function (r, i) {
      var g = buildRobot(THREE, mat, r, out);
      var mates = byTile[r.x + ',' + r.y];
      var share = mates.length > 1 ? mates.indexOf(i) : -1;
      var offset = share === -1 ? [0, 0] : share === 0 ? [-0.22, -0.22] : share === 1 ? [0.22, 0.22] : [0, 0];
      var p = tileCentre(world.map, r.x, r.y);
      var k = kindAt(world.map, r.x, r.y);
      g.position.set(p.x + offset[0], tileHeight(k || 'grass'), p.z + offset[1]);
      g.rotation.y = (-r.d * Math.PI) / 2;
      if (share !== -1) g.scale.set(0.78, 0.78, 0.78);
      g.userData.index = i;
      g.userData.share = share;
      g.userData.offset = offset;
      root.add(g);
      return g;
    });
    // The mockup's two lights: a pale sky over a soil-brown ground, and the sun from the front right.
    var sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(6, 12, 4);
    var sky = new THREE.HemisphereLight(0xe8f6ff, 0xc79a63, 1.5);
    root.add(sun, sky);
    return { root: root, ground: ground, tiles: tiles, decor: decor, things: things, robots: robots, lights: [sun, sky], meshCount: out.meshCount };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // The camera — pose, projection, picking and bounds, hand-rolled so the gate can grade them without THREE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * The mockup's camera (island-3d.html, makeView): tilted 35° from straight down, turned 0.42 rad about the vertical
   * (the island is seen corner-on, not square), a 38° vertical lens, aimed at the tile tops (0.4 up). P106 s2 measured
   * the mockup's source: its 35° is from the vertical, as here. The angles are the look Richard grades; the maths below
   * takes any.
   */
  var CAMERA = { tiltDeg: 35, yawRad: 0.42, fovDeg: 38, targetY: 0.4, fitScale: 1.18, fitPad: 1.2, near: 0.1, far: 200, minTiles: 3, margin: 0.92, objectHeight: 1.3 };

  /**
   * A camera state is a target on the ground and a distance: `{ tx, tz, dist }`. Position and basis follow, exactly as
   * the mockup places its camera (island-3d.html `v.apply`): at (tx + d·sin35·sin yaw, d·cos35, tz + d·sin35·cos yaw),
   * looking at (tx, 0.4, tz) — the tile tops. Forward points at that target; right is level; up = right × forward.
   */
  function pose(state) {
    var tilt = (CAMERA.tiltDeg * Math.PI) / 180;
    var s = Math.sin(tilt);
    var c = Math.cos(tilt);
    var sy = Math.sin(CAMERA.yawRad);
    var cy = Math.cos(CAMERA.yawRad);
    var ty = CAMERA.targetY;
    var position = [state.tx + state.dist * s * sy, state.dist * c, state.tz + state.dist * s * cy];
    var f = [state.tx - position[0], ty - position[1], state.tz - position[2]];
    var fl = Math.sqrt(f[0] * f[0] + f[1] * f[1] + f[2] * f[2]) || 1;
    var forward = [f[0] / fl, f[1] / fl, f[2] / fl];
    // right = forward × (0, 1, 0), normalised: level, whatever the pitch.
    var r = [-forward[2], 0, forward[0]];
    var rl = Math.sqrt(r[0] * r[0] + r[2] * r[2]) || 1;
    var right = [r[0] / rl, 0, r[2] / rl];
    var up = [right[1] * forward[2] - right[2] * forward[1], right[2] * forward[0] - right[0] * forward[2], right[0] * forward[1] - right[1] * forward[0]];
    return { position: position, target: [state.tx, ty, state.tz], forward: forward, right: right, up: up, range: fl };
  }

  function tanHalf() {
    return Math.tan((CAMERA.fovDeg * Math.PI) / 360);
  }

  /** A world point → normalised device coordinates `{ x, y, depth }` (x, y in −1..1 on screen; depth > 0 in front). */
  function project(state, aspect, point) {
    var p = pose(state);
    var d = [point[0] - p.position[0], point[1] - p.position[1], point[2] - p.position[2]];
    var xc = d[0] * p.right[0] + d[1] * p.right[1] + d[2] * p.right[2];
    var yc = d[0] * p.up[0] + d[1] * p.up[1] + d[2] * p.up[2];
    var zc = d[0] * p.forward[0] + d[1] * p.forward[1] + d[2] * p.forward[2];
    var t = tanHalf();
    if (zc <= 0) return { x: 0, y: 0, depth: zc };
    return { x: xc / (zc * t * aspect), y: yc / (zc * t), depth: zc };
  }

  /** NDC (x, y in −1..1) → a ray `{ origin, dir }` from the camera. */
  function rayFromNdc(state, aspect, nx, ny) {
    var p = pose(state);
    var t = tanHalf();
    var dir = [
      p.forward[0] + p.right[0] * nx * t * aspect + p.up[0] * ny * t,
      p.forward[1] + p.right[1] * nx * t * aspect + p.up[1] * ny * t,
      p.forward[2] + p.right[2] * nx * t * aspect + p.up[2] * ny * t
    ];
    var len = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2]) || 1;
    return { origin: p.position.slice(), dir: [dir[0] / len, dir[1] / len, dir[2] / len] };
  }

  /**
   * The tile a ray lands on, or null. Each distinct tile top is a plane; the highest plane is hit first along a ray
   * that goes down, so the planes are tried tallest first and the first whose tile really is that tall wins.
   */
  function pickTile(ray, map) {
    if (!map || !map.w || !map.h || ray.dir[1] >= 0) return null;
    var heights = [];
    map.cells.forEach(function (c) {
      var hh = tileHeight(c.kind);
      if (heights.indexOf(hh) === -1) heights.push(hh);
    });
    heights.sort(function (a, b) {
      return b - a;
    });
    for (var i = 0; i < heights.length; i++) {
      var t = (heights[i] - ray.origin[1]) / ray.dir[1];
      if (t < 0) continue;
      var px = ray.origin[0] + ray.dir[0] * t;
      var pz = ray.origin[2] + ray.dir[2] * t;
      var x = Math.floor(px + map.w / 2);
      var y = Math.floor(pz + map.h / 2);
      var kind = kindAt(map, x, y);
      if (kind && tileHeight(kind) === heights[i]) return { x: x, y: y };
    }
    return null;
  }

  /** A rectangle of tiles `{ x, y, w, h }` clamped into the map; the whole map when it is empty or junk. */
  function focusRect(map, focus) {
    var f = readJson(focus, null);
    var whole = { x: 0, y: 0, w: map.w, h: map.h };
    if (!f || typeof f !== 'object') return whole;
    var x = Number(f.x);
    var y = Number(f.y);
    var w = Number(f.w);
    var hh = Number(f.h);
    if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(hh) || w <= 0 || hh <= 0) return whole;
    x = Math.max(0, Math.min(map.w, x));
    y = Math.max(0, Math.min(map.h, y));
    w = Math.max(1, Math.min(map.w - x, w));
    hh = Math.max(1, Math.min(map.h - y, hh));
    return { x: x, y: y, w: w, h: hh };
  }

  /**
   * The camera state that frames a rectangle of tiles: the target at its centre, the distance the smallest at which
   * its eight corners (ground and object height) sit inside the view with a margin. Bisection: the projection is not
   * linear in the distance and thirty halvings are cheaper than being clever.
   */
  function frameRect(map, rect, aspect) {
    var cx = rect.x + rect.w / 2 - map.w / 2;
    var cz = rect.y + rect.h / 2 - map.h / 2;
    var corners = [];
    [0, CAMERA.objectHeight].forEach(function (y) {
      corners.push([cx - rect.w / 2, y, cz - rect.h / 2], [cx + rect.w / 2, y, cz - rect.h / 2], [cx - rect.w / 2, y, cz + rect.h / 2], [cx + rect.w / 2, y, cz + rect.h / 2]);
    });
    var fits = function (dist) {
      var st = { tx: cx, tz: cz, dist: dist };
      for (var i = 0; i < corners.length; i++) {
        var n = project(st, aspect, corners[i]);
        if (n.depth <= 0 || Math.abs(n.x) > CAMERA.margin || Math.abs(n.y) > CAMERA.margin) return false;
      }
      return true;
    };
    var lo = 0.5;
    var hi = 400;
    for (var i = 0; i < 40; i++) {
      var mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return { tx: cx, tz: cz, dist: hi };
  }

  /**
   * The mockup's framing (island-3d.html `v.fit`): the target at the rectangle's centre, the distance at which its width
   * fills the view across or its depth (foreshortened by the tilt) fills it down, whichever is further, × 1.18 + 1.2.
   * It fills the stage and lets the corners of the turned rectangle run off it — the look Richard grades (IG-007 AC5).
   * `frameRect` (everything inside a margin) stays the zoom-out bound, so a pinch can always show the whole map, and it
   * frames the Island camera (P106 s4).
   */
  function fitRect(map, rect, aspect) {
    var t = tanHalf();
    var tilt = (CAMERA.tiltDeg * Math.PI) / 180;
    var across = rect.w / (2 * t * aspect);
    var down = (rect.h * Math.cos(tilt)) / (2 * t);
    return { tx: rect.x + rect.w / 2 - map.w / 2, tz: rect.y + rect.h / 2 - map.h / 2, dist: Math.max(across, down) * CAMERA.fitScale + CAMERA.fitPad };
  }

  /** The zoom range of a map: from a `minTiles` square to the whole map and a quarter beyond. */
  function zoomBounds(map, aspect) {
    var small = Math.min(CAMERA.minTiles, Math.max(1, Math.min(map.w, map.h)));
    var minDist = frameRect(map, { x: 0, y: 0, w: small, h: small }, aspect).dist;
    var maxDist = frameRect(map, { x: 0, y: 0, w: Math.max(1, map.w), h: Math.max(1, map.h) }, aspect).dist * 1.25;
    return { minDist: minDist, maxDist: Math.max(maxDist, minDist) };
  }

  /** The state, held inside the map: the target never leaves the map and the distance never leaves the zoom range. */
  function clampCamera(state, map, aspect) {
    var z = zoomBounds(map, aspect);
    var dist = Math.max(z.minDist, Math.min(z.maxDist, isFinite(state.dist) ? state.dist : z.maxDist));
    var hw = Math.max(0.5, map.w / 2);
    var hh = Math.max(0.5, map.h / 2);
    return { tx: Math.max(-hw, Math.min(hw, isFinite(state.tx) ? state.tx : 0)), tz: Math.max(-hh, Math.min(hh, isFinite(state.tz) ? state.tz : 0)), dist: dist };
  }

  /** Screen pixels per world unit at the target, for a pan that keeps the ground under the finger. */
  function pixelsPerUnit(state, heightPx) {
    return heightPx / (2 * pose(state).range * tanHalf());
  }

  var CAMERA_API = { CAMERA: CAMERA, pose: pose, project: project, rayFromNdc: rayFromNdc, pickTile: pickTile, focusRect: focusRect, frameRect: frameRect, fitRect: fitRect, zoomBounds: zoomBounds, clampCamera: clampCamera, pixelsPerUnit: pixelsPerUnit, tileCentre: tileCentre, tileHeight: tileHeight, kindAt: kindAt };

  // ═══════════════════════════════════════════════════════════════════════════
  // The engine — the browser half. Supported is decided here; a page with no THREE or no WebGL2 gets a quiet no.
  // ═══════════════════════════════════════════════════════════════════════════

  var TAP_SLOP_PX = 8;
  var FRAME_WINDOW = 60;
  var FRAME_REPORT_MS = 500;
  var TURN_MS = 300;
  var BUMP_MS = 350;
  var HOP_MS = 1400;
  var TULIP_MS = 500;
  var POP_MS = 300;
  var CAMERA_MS = 400;
  /** P108 IW-002: how far a thing under the pointer rises while Picking (world units). */
  var PICK_LIFT = 0.14;
  /**
   * The fallback's cue (IG-007 AC4): Frame Ms above `ms` for `forMs` of SAMPLED time after Ready fires Too Slow, once.
   * It is decided here, where the frames are. Sampled time is the intervals between frames of one busy, visible spell:
   * a hidden window draws no frame and counts no time (a frame throttle never fires in a hidden window — without that
   * the fallback would fire on every minimised app; coming back into view starts the count again), and a still scene
   * draws no frame either (nothing is timed under the win card's blur).
   */
  var SLOW = { ms: 50, forMs: 3000 };

  function easeOut(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function shortestYaw(from, to) {
    var d = to - from;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }

  function p95(list) {
    if (!list.length) return 0;
    var sorted = list.slice().sort(function (a, b) {
      return a - b;
    });
    return sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))];
  }

  /**
   * Decide `Supported` and, when it is true, own the renderer, the scene, the loop, the input and the overlay.
   *
   * @param {object} o
   * @param {any} o.THREE  the global, or undefined
   * @param {any} o.root   the node’s element (attributes a drive reads are written on it)
   * @param {any} o.canvas the canvas to draw on (may be null when unsupported)
   * @param {any} o.overlay the DOM layer for names, labels and the bubble
   * @param {Function} [o.onTap]      (x, y)
   * @param {Function} [o.onFrameMs]  (ms)
   * @param {Function} [o.onReady]    ()
   * @param {Function} [o.onTooSlow]  (ms) — once, when Frame Ms stayed above SLOW.ms for SLOW.forMs of visible time
   * @param {Function} [o.now]        a clock, for the gate
   * @param {Function} [o.raf]        requestAnimationFrame, for the gate
   * @param {Function} [o.caf]        cancelAnimationFrame
   * @param {any} [o.doc]             document, for visibility
   * @param {Function} [o.getContext] (canvas) → a WebGL2 context or null (defaults to canvas.getContext('webgl2'))
   * @param {boolean} [o.reducedMotion]
   */
  function createEngine(o) {
    var THREE = o.THREE;
    var eng = {
      supported: false,
      reason: '',
      world: null,
      built: null,
      meshCount: 0,
      state: { tx: 0, tz: 0, dist: 10 },
      cameraMode: 'plot',
      focus: null,
      aspect: 4 / 3,
      ready: false,
      frames: [],
      frameMs: 0,
      handMoved: false,
      drawCalls: 0,
      // P108 IW-002 (brief §4.4): the chips Watch rings, whether Picking is on, and the tile under the pointer then.
      watch: null,
      picking: false,
      hover: null,
      destroy: function () {}
    };
    var setAttr = function (name, value) {
      if (o.root && typeof o.root.setAttribute === 'function') o.root.setAttribute(name, String(value));
    };

    // ── Supported: three.js on the page, a canvas, a WebGL2 context, and a renderer that constructs ──
    var gl = null;
    var renderer = null;
    try {
      if (!THREE || typeof THREE.WebGLRenderer !== 'function') eng.reason = 'no THREE';
      else if (!o.canvas) eng.reason = 'no canvas';
      else {
        gl = o.getContext ? o.getContext(o.canvas) : typeof o.canvas.getContext === 'function' ? o.canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' }) : null;
        if (!gl) eng.reason = 'no WebGL2';
        else {
          renderer = new THREE.WebGLRenderer({ canvas: o.canvas, context: gl, antialias: true, alpha: false });
          eng.supported = true;
        }
      }
    } catch (e) {
      eng.reason = 'renderer threw: ' + (e && e.message ? e.message : String(e));
      eng.supported = false;
      renderer = null;
    }
    setAttr('data-supported', eng.supported ? 'true' : 'false');
    if (!eng.supported) {
      setAttr('data-unsupported-reason', eng.reason);
      return eng;
    }

    // ── The scene, the camera, the loop ──
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.background);
    var camera = new THREE.PerspectiveCamera(CAMERA.fovDeg, eng.aspect, CAMERA.near, CAMERA.far);
    var now = o.now || function () {
      return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    };
    var raf = o.raf || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
    var caf = o.caf || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : function () {});
    var doc = o.doc || (typeof document !== 'undefined' ? document : null);
    var reduced = !!o.reducedMotion;
    var rafId = 0;
    var lastFrame = 0;
    var lastReport = 0;
    var slowFor = 0;
    var tooSlow = false;
    var bubbleTimer = null;
    var destroyed = false;
    var width = 1;
    var height = 1;
    var anims = { robots: [], camera: null, hop: 0, tulips: {}, pops: {} };
    var overlayEls = { names: [], labels: [], bubble: null, says: [], meters: [], rings: [] };
    var stepMs = 380;
    var bubble = null;
    var bubbleUntil = 0;
    var listeners = [];

    var visible = function () {
      return !doc || doc.visibilityState === undefined || doc.visibilityState === 'visible';
    };

    var resize = function () {
      var w = o.root && o.root.clientWidth ? o.root.clientWidth : o.canvas.clientWidth || o.canvas.width || 640;
      var hh = o.root && o.root.clientHeight ? o.root.clientHeight : o.canvas.clientHeight || o.canvas.height || 480;
      if (w < 1) w = 1;
      if (hh < 1) hh = 1;
      width = w;
      height = hh;
      eng.aspect = w / hh;
      // The mockup's cap: a retina tablet draws 1.5× at most (the pixels cost frame time on the HD 615).
      var dpr = typeof devicePixelRatio === 'number' ? Math.min(1.5, devicePixelRatio) : 1;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, hh, false);
      camera.aspect = eng.aspect;
      camera.updateProjectionMatrix();
      // 🔴 The first framing happens at the first world, often before the stage is laid out (a 300×150 canvas): until a
      // finger has moved the camera, a new size re-frames (s1's and s2's first shots sat far out, at 14.9 not 11.4).
      if (eng.world && !eng.handMoved) {
        eng.state = clampCamera(goalState(), eng.world.map, eng.aspect);
        anims.camera = null;
      } else if (eng.world) eng.state = clampCamera(eng.state, eng.world.map, eng.aspect);
    };

    var applyCamera = function () {
      var p = pose(eng.state);
      camera.position.set(p.position[0], p.position[1], p.position[2]);
      camera.lookAt(p.target[0], p.target[1], p.target[2]);
    };

    /** The state the Camera and Focus ports ask for, from the current world. */
    var goalState = function () {
      var map = eng.world.map;
      // P106 s4 (a): the island is seen whole — every corner inside the margin (frameRect). The mockup's fit is the plot's
      // look and ran the 46 × 22 island's corner off the stage.
      if (eng.cameraMode === 'island') return frameRect(map, { x: 0, y: 0, w: Math.max(1, map.w), h: Math.max(1, map.h) }, eng.aspect);
      if (eng.cameraMode === 'follow' && eng.built && eng.built.robots.length) {
        var r = eng.built.robots[0];
        return { tx: r.position.x, tz: r.position.z, dist: eng.state.dist };
      }
      return fitRect(map, focusRect(map, eng.focus), eng.aspect);
    };

    var glideCamera = function (to, ms) {
      to = clampCamera(to, eng.world.map, eng.aspect);
      if (reduced || !ms) {
        eng.state = to;
        anims.camera = null;
        return;
      }
      anims.camera = { from: { tx: eng.state.tx, tz: eng.state.tz, dist: eng.state.dist }, to: to, start: now(), ms: ms };
    };

    // ── The overlay: a pill per robot name, a pill per label, one bubble; positioned from projected points ──
    var el = function (className, attrs) {
      if (!doc || typeof doc.createElement !== 'function') return null;
      var e = doc.createElement('div');
      e.className = className;
      for (var k in attrs) e.setAttribute(k, String(attrs[k]));
      return e;
    };
    var screenOf = function (point) {
      var n = project(eng.state, eng.aspect, point);
      return { sx: ((n.x + 1) / 2) * width, sy: ((1 - n.y) / 2) * height, depth: n.depth };
    };
    var place = function (e, sx, sy) {
      e.style.left = sx.toFixed(1) + 'px';
      e.style.top = sy.toFixed(1) + 'px';
    };
    /** P108 IW-002: a meter chip (the mockup's): its icon, a pip per unit up to METER_PIPS_MAX, the numbers. */
    var meterChip = function (m, extraClass, attrs) {
      var e = el('gd3-meter gd3-m-' + m.icon + (m.full ? ' gd3-full' : '') + (extraClass || ''), attrs);
      if (!e) return null;
      var part = function (tag, cls, text) {
        var c = doc.createElement(tag);
        c.className = cls;
        if (text !== undefined) c.textContent = text;
        return c;
      };
      e.setAttribute('data-meter', m.text);
      e.setAttribute('data-kind', m.kind);
      // P108 IW-003 (lane B): its share in tenths, for the compact bar on the island.
      e.setAttribute('data-fill', String(m.need > 0 ? Math.max(0, Math.min(10, Math.round((10 * m.have) / m.need))) : 0));
      if (m.full) e.setAttribute('data-full', 'true');
      e.appendChild(part('i', 'gd3-mi gd3-mi-' + m.icon));
      if (m.pips) {
        var pips = part('span', 'gd3-pips');
        for (var i = 0; i < m.pips; i++) pips.appendChild(part('i', 'gd3-pip' + (i < m.have ? ' gd3-on' : '')));
        e.appendChild(pips);
      }
      e.appendChild(part('span', 'gd3-mt', m.text));
      return e;
    };
    var rebuildOverlay = function () {
      if (!o.overlay) return;
      while (o.overlay.firstChild) o.overlay.removeChild(o.overlay.firstChild);
      overlayEls = { names: [], labels: [], bubble: null, says: [], meters: [], rings: [] };
      // P108 IW-002: what Watch rings (resolved as the engine resolves a chip), each thing's meter, a held can's level.
      var seen = resolveWatch(eng.watch, eng.world.things, eng.world.robots);
      eng.built.things.forEach(function (g) {
        var watched = g.userData.index !== -1 && seen.things.indexOf(g.userData.index) !== -1;
        var m = g.userData.meter;
        if (m) {
          var e = meterChip(m, watched ? ' gd3-watch' : '', { 'data-x': g.userData.x, 'data-y': g.userData.y });
          if (e) {
            if (watched) e.setAttribute('data-watch', 'true');
            o.overlay.appendChild(e);
            overlayEls.meters.push({ el: e, g: g });
          }
        }
        if (watched) {
          var r = el('gd3-ring', { 'data-ring': g.userData.kind, 'data-x': g.userData.x, 'data-y': g.userData.y });
          if (r) {
            o.overlay.appendChild(r);
            overlayEls.rings.push({ el: r, g: g });
          }
        }
      });
      eng.built.robots.forEach(function (g, i) {
        var rb = eng.world.robots[i];
        var watched = seen.robots.indexOf(i) !== -1;
        if (rb && rb.can !== null && rb.can !== undefined && (rb.holds === 'can' || watched)) {
          var max = Number(rb.canMax) > 0 ? Math.floor(Number(rb.canMax)) : 3;
          var have = Math.min(max, Math.max(0, Math.floor(Number(rb.can)) || 0));
          var e = meterChip({ kind: 'can', icon: 'water', have: have, need: max, pips: max <= METER_PIPS_MAX ? max : 0, text: have + '/' + max, full: false }, ' gd3-meter-bot' + (watched ? ' gd3-watch' : ''), { 'data-robot': i });
          if (e) {
            if (watched) e.setAttribute('data-watch', 'true');
            o.overlay.appendChild(e);
            overlayEls.meters.push({ el: e, g: g, robot: true });
          }
        }
        if (watched) {
          var r = el('gd3-ring', { 'data-ring': 'robot', 'data-robot': i });
          if (r) {
            o.overlay.appendChild(r);
            overlayEls.rings.push({ el: r, g: g, robot: true });
          }
        }
      });
      seen.tiles.forEach(function (k) {
        var xy = k.split(',').map(Number);
        if (!eng.world.map.w || xy[0] >= eng.world.map.w || xy[1] >= eng.world.map.h) return;
        var r = el('gd3-ring', { 'data-ring': 'tile', 'data-x': xy[0], 'data-y': xy[1] });
        if (!r) return;
        o.overlay.appendChild(r);
        overlayEls.rings.push({ el: r, tile: { x: xy[0], y: xy[1] } });
      });
      setAttr('data-watched', overlayEls.rings.length);
      if (o.root && typeof o.root.removeAttribute === 'function') o.root.removeAttribute('data-wide');
      if (eng.world.map.w > 16 && overlayEls.meters.length) setAttr('data-wide', '1');
      eng.built.robots.forEach(function (g, i) {
        var r = eng.world.robots[i];
        var e = el('gd3-name', { 'data-robot': i, 'data-x': r.x, 'data-y': r.y, 'data-d': r.d });
        if (!e) return;
        if (g.userData.share !== -1) e.setAttribute('data-share', String(g.userData.share));
        e.textContent = r.name || '';
        if (!r.name) e.style.visibility = 'hidden';
        o.overlay.appendChild(e);
        overlayEls.names.push(e);
      });
      // IG-004: an islander with an open request says it, in a bubble over her head.
      eng.built.things.forEach(function (g) {
        if (g.userData.kind !== 'islander' || !g.userData.say) return;
        var e = el('gd3-isl-say', { 'data-who': g.userData.who || '', 'data-x': g.userData.x, 'data-y': g.userData.y });
        if (!e) return;
        e.textContent = String(g.userData.say);
        o.overlay.appendChild(e);
        overlayEls.says.push({ el: e, g: g });
      });
      eng.built.things.forEach(function (g) {
        if (g.userData.kind !== 'label') return;
        var e = el('gd3-label', { 'data-label': g.userData.x + ',' + g.userData.y });
        if (!e) return;
        e.textContent = String(g.userData.text || '');
        o.overlay.appendChild(e);
        overlayEls.labels.push({ el: e, g: g });
      });
      // P108 IW-003 (lane P): a door's owner on a plate under it — a label's pill, placed as a label is.
      eng.built.things.forEach(function (g) {
        if (g.userData.kind !== 'door' || !g.userData.owner) return;
        var e = el('gd3-label gd3-plate', { 'data-owner': g.userData.owner, 'data-x': g.userData.x, 'data-y': g.userData.y });
        if (!e) return;
        e.textContent = String(g.userData.owner);
        o.overlay.appendChild(e);
        overlayEls.labels.push({ el: e, g: g, plate: true });
      });
      if (bubble) {
        var b = el('gd3-bubble' + (bubble.style === 'olive' ? ' gd3-olive' : ''), { 'data-bubble': bubble.robot });
        if (b) {
          if (bubble.style === 'olive') {
            var small = doc.createElement('small');
            small.textContent = 'Olive';
            b.appendChild(small);
          }
          b.appendChild(doc.createTextNode(String(bubble.text)));
          o.overlay.appendChild(b);
          overlayEls.bubble = b;
        }
      }
    };
    var positionOverlay = function () {
      overlayEls.names.forEach(function (e, i) {
        var g = eng.built.robots[i];
        if (!g) return;
        var s = screenOf([g.position.x, g.position.y + 0.02, g.position.z + 0.3]);
        place(e, s.sx, s.sy + 6);
        e.setAttribute('data-sx', s.sx.toFixed(1));
        e.setAttribute('data-sy', s.sy.toFixed(1));
      });
      overlayEls.labels.forEach(function (l) {
        // P108 IW-003 (lane P): a door's plate sits on its step (centred), not a tile in front where it hid the post box.
        var s = l.plate ? screenOf([l.g.position.x, l.g.position.y + 0.04, l.g.position.z + 0.2]) : screenOf([l.g.position.x, l.g.position.y, l.g.position.z + 0.4]);
        place(l.el, s.sx, s.sy);
      });
      overlayEls.says.forEach(function (l) {
        var s = screenOf([l.g.position.x, l.g.position.y + 0.95, l.g.position.z]);
        place(l.el, s.sx, s.sy);
      });
      // P108 IW-002: a meter over its thing (a held can's under its robot's name); a ring round a watched thing's tile,
      // its robot, or the tile itself — an ellipse sized by the tile as the camera sees it.
      overlayEls.meters.forEach(function (l) {
        if (l.robot) {
          var sb = screenOf([l.g.position.x, l.g.position.y + 0.02, l.g.position.z + 0.3]);
          place(l.el, sb.sx, sb.sy + 48);
          return;
        }
        var s = screenOf([l.g.position.x, l.g.position.y + l.g.userData.lift, l.g.position.z]);
        place(l.el, s.sx, s.sy);
        // P108 IW-003 (lane B): on the island the compact bar is at most 80 % of its tile as the camera sees it (12 px at
        // most), so two neighbours' bars never touch however far the camera stands.
        if (eng.world.map.w > 16 && l.el.className.indexOf('gd3-watch') === -1) {
          var a = screenOf([l.g.position.x - 0.5, l.g.position.y, l.g.position.z]);
          var b = screenOf([l.g.position.x + 0.5, l.g.position.y, l.g.position.z]);
          l.el.style.width = Math.max(3, Math.min(12, 0.8 * Math.abs(b.sx - a.sx))).toFixed(1) + 'px';
        } else if (l.el.style.width) l.el.style.width = '';
      });
      overlayEls.rings.forEach(function (l) {
        var c;
        if (l.tile) {
          var tp = tileCentre(eng.world.map, l.tile.x, l.tile.y);
          c = [tp.x, tileHeight(kindAt(eng.world.map, l.tile.x, l.tile.y) || 'grass'), tp.z];
        } else c = [l.g.position.x, l.g.position.y + (l.robot ? 0.3 : 0.04), l.g.position.z];
        var ends = [[c[0] - 0.5, c[1], c[2]], [c[0] + 0.5, c[1], c[2]], [c[0], c[1], c[2] - 0.5], [c[0], c[1], c[2] + 0.5]].map(screenOf);
        var xs = ends.map(function (p) { return p.sx; });
        var ys = ends.map(function (p) { return p.sy; });
        var mid = screenOf(c);
        place(l.el, mid.sx, mid.sy);
        l.el.style.width = (Math.max.apply(null, xs) - Math.min.apply(null, xs)).toFixed(1) + 'px';
        l.el.style.height = (Math.max.apply(null, ys) - Math.min.apply(null, ys)).toFixed(1) + 'px';
      });
      if (overlayEls.bubble) {
        var g = eng.built.robots[bubble.robot];
        if (g) {
          var head = g.userData.head;
          var s = screenOf([g.position.x + head.x, g.position.y + head.y * g.scale.y, g.position.z + head.z]);
          place(overlayEls.bubble, s.sx, s.sy - 8);
        }
      }
    };

    // ── The world: rebuild the scene when the map changes; move robots and things when they change ──
    // The engine's caches (G, materials): every build shares them, so a rebuild uploads nothing new. A dropped build
    // gives back only its instanced meshes' own buffers; the shared geometry goes with the engine.
    var shared = { geos: {}, mat: materials(THREE) };
    var disposeGroup = function (g) {
      if (!g || typeof g.traverse !== 'function') return;
      g.traverse(function (obj) {
        if (obj.isInstancedMesh && typeof obj.dispose === 'function') obj.dispose();
      });
    };
    var disposeShared = function () {
      for (var k in shared.geos) if (shared.geos[k] && shared.geos[k].dispose) shared.geos[k].dispose();
      shared.geos = {};
    };
    /** What of the robots the scene builder draws, beyond where they stand and face. */
    var lookKey = function (robots) {
      return JSON.stringify(
        (robots || []).map(function (r) {
          return [r.colour, r.eyes, r.hat, r.name, r.can, r.canMax, r.carry, r.holds];
        })
      );
    };
    var setWorld = function (world) {
      var first = !eng.world;
      var mapChanged = first || !eng.world || JSON.stringify(eng.world.map.rows) !== JSON.stringify(world.map.rows) || JSON.stringify(eng.world.map.legend) !== JSON.stringify(world.map.legend);
      var thingsChanged = first || JSON.stringify(eng.world.things) !== JSON.stringify(world.things);
      // 🔴 A robot's own look (its can level, its load, its colour, eyes, hat, name) and how many robots there are are
      // part of the built scene too: a Robots write that changes only those (a fill, a pick) rebuilds, reusing the
      // engine's shared geometry and materials, and the robots keep their glide below. A move or a turn alone does not.
      var robotsChanged = first || lookKey(eng.world.robots) !== lookKey(world.robots);
      var previous = eng.world;
      eng.world = world;
      if (mapChanged || thingsChanged || robotsChanged) {
        var oldBuilt = eng.built;
        eng.built = buildScene(world, THREE, shared);
        eng.meshCount = eng.built.meshCount;
        if (oldBuilt) {
          scene.remove(oldBuilt.root);
          disposeGroup(oldBuilt.root);
        }
        scene.add(eng.built.root);
        // Robots keep their glide: the new groups start where the old ones were.
        anims.robots = eng.built.robots.map(function (g, i) {
          var old = oldBuilt && oldBuilt.robots[i];
          var goal = { x: g.position.x, z: g.position.z, yaw: g.rotation.y, tileY: g.position.y };
          var a = { goal: goal, from: null, start: 0, ms: 0, yawFrom: g.rotation.y, yawStart: 0, bump: 0, bumpStart: 0, seenBump: world.robots[i].bump };
          if (old && !mapChanged) {
            g.position.set(old.position.x, old.position.y, old.position.z);
            g.rotation.y = old.rotation.y;
            var oa = anims.robots[i];
            if (oa) {
              // The OLD goal: a move that arrives in the same write as a look or thing change is then seen as a move
              // below and glides from where the robot is drawn, instead of jumping there.
              a.goal = oa.goal;
              a.from = oa.from;
              a.start = oa.start;
              a.ms = oa.ms;
              a.yawFrom = oa.yawFrom;
              a.yawStart = oa.yawStart;
              a.bump = oa.bump;
              a.bumpStart = oa.bumpStart;
              a.seenBump = oa.seenBump;
            }
          }
          return a;
        });
        // A tulip that just got watered stands up over TULIP_MS; a puddle that just appeared pops.
        var t0 = now();
        eng.built.things.forEach(function (g) {
          var key = g.userData.key;
          if (g.userData.kind === 'tulip') {
            var was = previous && previous.things.some(function (t) {
              return t.kind === 'tulip' && Number(t.x) === g.userData.x && Number(t.y) === g.userData.y && (t.watered === true || t.state === 'watered' || t.state === 'wet');
            });
            if (g.userData.wet && !was && !first) anims.tulips[key] = t0;
          } else if (g.userData.kind === 'puddle') {
            var had = previous && previous.things.some(function (t) {
              return t.kind === 'puddle' && Number(t.x) === g.userData.x && Number(t.y) === g.userData.y;
            });
            if (!had && !first) anims.pops[key] = t0;
          }
        });
        setAttr('data-w', world.map.w);
        setAttr('data-h', world.map.h);
        setAttr('data-meshes', eng.meshCount);
        rebuildOverlay();
        if (mapChanged) {
          eng.state = clampCamera(goalState(), world.map, eng.aspect);
          eng.handMoved = false;
          anims.camera = null;
        }
      }
      // Robots: a new tile is a glide, a new d a turn, a risen bump a recoil.
      world.robots.forEach(function (r, i) {
        var g = eng.built.robots[i];
        var a = anims.robots[i];
        if (!g || !a) return;
        var p = tileCentre(world.map, r.x, r.y);
        var goal = { x: p.x + g.userData.offset[0], z: p.z + g.userData.offset[1], yaw: (-r.d * Math.PI) / 2, tileY: tileHeight(kindAt(world.map, r.x, r.y) || 'grass') };
        if (Math.abs(goal.x - a.goal.x) > 1e-6 || Math.abs(goal.z - a.goal.z) > 1e-6) {
          a.from = { x: g.position.x, z: g.position.z, y: g.position.y };
          a.start = now();
          a.ms = reduced ? 0 : stepMs;
        }
        if (Math.abs(shortestYaw(a.goal.yaw, goal.yaw)) > 1e-6) {
          a.yawFrom = g.rotation.y;
          a.yawStart = now();
        }
        if (a.seenBump !== r.bump) {
          if (rose(a.seenBump, r.bump)) {
            a.bump++;
            a.bumpStart = now();
          }
          a.seenBump = r.bump;
        }
        a.goal = goal;
        var e = overlayEls.names[i];
        if (e) {
          e.setAttribute('data-x', String(r.x));
          e.setAttribute('data-y', String(r.y));
          e.setAttribute('data-d', String(r.d));
          if (e.textContent !== (r.name || '')) e.textContent = r.name || '';
        }
      });
    };

    var animate = function (t) {
      // Camera glide.
      if (anims.camera) {
        var k = Math.min(1, (t - anims.camera.start) / anims.camera.ms);
        var e = easeOut(k);
        var f = anims.camera.from;
        var to = anims.camera.to;
        eng.state = { tx: f.tx + (to.tx - f.tx) * e, tz: f.tz + (to.tz - f.tz) * e, dist: f.dist + (to.dist - f.dist) * e };
        if (k >= 1) anims.camera = null;
      }
      if (eng.cameraMode === 'follow' && eng.built.robots.length && !anims.camera) {
        var r0 = eng.built.robots[0];
        eng.state = clampCamera({ tx: r0.position.x, tz: r0.position.z, dist: eng.state.dist }, eng.world.map, eng.aspect);
      }
      // Robots.
      var hop = anims.hop ? Math.min(1, (t - anims.hop) / HOP_MS) : 1;
      if (hop >= 1) anims.hop = 0;
      eng.built.robots.forEach(function (g, i) {
        var a = anims.robots[i];
        var x = a.goal.x;
        var z = a.goal.z;
        var y = a.goal.tileY;
        if (a.from && a.ms > 0) {
          var k2 = Math.min(1, (t - a.start) / a.ms);
          var e2 = k2 < 0.5 ? 2 * k2 * k2 : 1 - Math.pow(-2 * k2 + 2, 2) / 2;
          x = a.from.x + (a.goal.x - a.from.x) * e2;
          z = a.from.z + (a.goal.z - a.from.z) * e2;
          y = a.from.y + (a.goal.tileY - a.from.y) * e2;
          if (k2 >= 1) a.from = null;
        }
        var yaw = a.goal.yaw;
        if (a.yawStart && !reduced) {
          var k3 = Math.min(1, (t - a.yawStart) / TURN_MS);
          yaw = a.yawFrom + shortestYaw(a.yawFrom, a.goal.yaw) * easeOut(k3);
          if (k3 >= 1) a.yawStart = 0;
        }
        var recoil = 0;
        if (a.bumpStart && !reduced) {
          var k4 = Math.min(1, (t - a.bumpStart) / BUMP_MS);
          recoil = k4 < 0.3 ? (-0.12 * k4) / 0.3 : k4 < 0.6 ? -0.12 + ((0.2 * (k4 - 0.3)) / 0.3) : 0.08 * (1 - (k4 - 0.6) / 0.4);
          if (k4 >= 1) a.bumpStart = 0;
        }
        var hopY = 0;
        if (hop < 1 && !reduced) hopY = 0.22 * Math.abs(Math.sin(hop * Math.PI * 2));
        // Recoil is along the facing direction: −z at yaw 0 rotated by yaw.
        g.position.set(x - Math.sin(yaw) * recoil, y + hopY, z - Math.cos(yaw) * recoil);
        g.rotation.y = yaw;
        g.userData.gliding = !!a.from;
        g.userData.bumping = !!a.bumpStart;
      });
      // Tulips and puddles.
      eng.built.things.forEach(function (g) {
        var key = g.userData.key;
        if (anims.tulips[key] !== undefined) {
          var k5 = Math.min(1, (t - anims.tulips[key]) / TULIP_MS);
          var back = 1 - easeOut(k5);
          g.rotation.z = 0.31 * back;
          if (k5 >= 1) delete anims.tulips[key];
        }
        if (anims.pops[key] !== undefined) {
          var k6 = Math.min(1, (t - anims.pops[key]) / POP_MS);
          var s = 0.2 + 0.8 * easeOut(k6);
          g.scale.set(s, 1, s);
          if (k6 >= 1) delete anims.pops[key];
        }
        // P108 IW-002 (Picking): the things on the tile under the pointer are lifted while a child picks.
        var lifted = !!(eng.picking && eng.hover && eng.hover.x === g.userData.x && eng.hover.y === g.userData.y);
        if (g.userData.baseY !== undefined) g.position.y = g.userData.baseY + (lifted ? PICK_LIFT : 0);
        g.userData.lifted = lifted;
      });
    };

    var frame = function () {
      rafId = 0;
      if (destroyed || !eng.world) return;
      var t = now();
      // A sample is the interval between two frames of one busy, visible spell: the first frame after an idle or a
      // hidden spell is not one (lastFrame is 0 then), so a still scene and a minimised app add nothing.
      if (lastFrame && eng.ready && visible()) {
        var dt = t - lastFrame;
        eng.frames.push(dt);
        if (eng.frames.length > FRAME_WINDOW) eng.frames.shift();
        if (t - lastReport >= FRAME_REPORT_MS) {
          lastReport = t;
          var ms = Math.round(p95(eng.frames) * 10) / 10;
          if (ms !== eng.frameMs) {
            eng.frameMs = ms;
            setAttr('data-frame-ms', ms);
            if (typeof o.onFrameMs === 'function') o.onFrameMs(ms);
          }
        }
        // Too Slow: the sampled time (moving, visible) the readout has stayed above SLOW.ms, added up across the short
        // still gaps between two glides; a readout at or under SLOW.ms starts it again.
        if (!tooSlow) {
          if (eng.frameMs > SLOW.ms) slowFor += dt;
          else slowFor = 0;
          if (slowFor >= SLOW.forMs) {
            tooSlow = true;
            eng.tooSlow = true;
            setAttr('data-too-slow', 'true');
            if (typeof o.onTooSlow === 'function') o.onTooSlow(eng.frameMs);
          }
        }
      }
      lastFrame = t;
      if (bubble && bubbleUntil && t >= bubbleUntil) {
        bubble = null;
        bubbleUntil = 0;
        rebuildOverlay();
      }
      animate(t);
      applyCamera();
      renderer.render(scene, camera);
      var calls = renderer.info && renderer.info.render ? renderer.info.render.calls : 0;
      if (calls !== eng.drawCalls) {
        eng.drawCalls = calls;
        setAttr('data-draw-calls', calls);
      }
      positionOverlay();
      if (!eng.ready) {
        eng.ready = true;
        setAttr('data-ready', 'true');
        if (typeof o.onReady === 'function') o.onReady();
      }
      // On demand: another frame only while something moves or a finger is down. A still scene draws nothing — the
      // CPU is Olive's while she thinks (AC3), and nothing under the win card's blur is timed.
      if (busy()) schedule();
      else {
        lastFrame = 0;
        setAttr('data-idle', 'true');
      }
    };
    /** Anything that changes the picture from one frame to the next. */
    var busy = function () {
      if (anims.camera || anims.hop) return true;
      var k;
      for (k in anims.tulips) return true;
      for (k in anims.pops) return true;
      for (var i = 0; i < anims.robots.length; i++) {
        var a = anims.robots[i];
        if (a && (a.from || a.yawStart || a.bumpStart)) return true;
      }
      for (k in pointers) return true;
      return false;
    };
    var schedule = function () {
      if (destroyed || rafId || !raf) return;
      if (!visible()) return;
      if (o.root && typeof o.root.removeAttribute === 'function') o.root.removeAttribute('data-idle');
      rafId = raf(frame);
    };
    var onVisibility = function () {
      if (visible()) {
        lastFrame = 0;
        slowFor = 0;
        eng.frames = [];
        schedule();
      }
    };
    if (doc && typeof doc.addEventListener === 'function') {
      doc.addEventListener('visibilitychange', onVisibility);
      listeners.push([doc, 'visibilitychange', onVisibility]);
    }

    // ── Input: one pointer pans, two pinch, a wheel zooms, a short still press taps a tile. Pen is a finger. ──
    var pointers = {};
    var press = null;
    var pinch = null;
    var count = function () {
      var n = 0;
      for (var k in pointers) n++;
      return n;
    };
    var local = function (ev) {
      var r = o.canvas.getBoundingClientRect ? o.canvas.getBoundingClientRect() : { left: 0, top: 0 };
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };
    /** P108 IW-002 (Picking): the tile under the pointer, the things on it lifted; a frame only when it changes. */
    var setHover = function (p) {
      if (!eng.world) return;
      var hit = p ? eng.pick(p.x, p.y) : null;
      var was = eng.hover ? eng.hover.x + ',' + eng.hover.y : '';
      var now = hit ? hit.x + ',' + hit.y : '';
      if (was === now) return;
      eng.hover = hit;
      setAttr('data-hover', now);
      schedule();
    };
    var onDown = function (ev) {
      if (ev.button !== undefined && ev.button !== 0 && ev.pointerType === 'mouse') return;
      var p = local(ev);
      if (eng.picking) setHover(p);
      pointers[ev.pointerId] = p;
      if (count() === 1) {
        press = { x: p.x, y: p.y, moved: 0, id: ev.pointerId };
        pinch = null;
      } else if (count() === 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]];
        var b = pointers[ids[1]];
        pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: eng.state.dist, happened: true };
      }
      schedule();
      try {
        if (o.canvas.setPointerCapture) o.canvas.setPointerCapture(ev.pointerId);
      } catch (e) {
        /* a synthetic pointer has no capture */
      }
    };
    var onMove = function (ev) {
      var prev = pointers[ev.pointerId];
      if (!prev) {
        if (eng.picking) setHover(local(ev));
        return;
      }
      var p = local(ev);
      pointers[ev.pointerId] = p;
      if (count() === 1 && press) {
        press.moved = Math.max(press.moved, Math.hypot(p.x - press.x, p.y - press.y));
        if (press.moved > TAP_SLOP_PX) {
          // The ground follows the finger: a sideways pixel is 1/ppu along the camera's level right; an upward one is
          // 1/(ppu·cos tilt) along the ground under the camera's up.
          var ppu = pixelsPerUnit(eng.state, height);
          var tilt = (CAMERA.tiltDeg * Math.PI) / 180;
          var sy = Math.sin(CAMERA.yawRad);
          var cy = Math.cos(CAMERA.yawRad);
          var dx = p.x - prev.x;
          var dy = p.y - prev.y;
          var along = dy / (ppu * Math.cos(tilt));
          eng.state = clampCamera({ tx: eng.state.tx - (cy * dx) / ppu - sy * along, tz: eng.state.tz + (sy * dx) / ppu - cy * along, dist: eng.state.dist }, eng.world.map, eng.aspect);
          anims.camera = null;
          eng.handMoved = true;
          if (eng.cameraMode === 'follow') eng.cameraMode = 'plot-held';
        }
      } else if (count() === 2 && pinch) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]];
        var b = pointers[ids[1]];
        var d1 = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        eng.state = clampCamera({ tx: eng.state.tx, tz: eng.state.tz, dist: (pinch.dist0 * pinch.d0) / d1 }, eng.world.map, eng.aspect);
        anims.camera = null;
        eng.handMoved = true;
        if (press) press.moved = TAP_SLOP_PX + 1;
      }
    };
    var onUp = function (ev) {
      var p = pointers[ev.pointerId];
      delete pointers[ev.pointerId];
      if (press && press.id === ev.pointerId) {
        if (press.moved <= TAP_SLOP_PX && !(pinch && pinch.happened) && p && ev.type !== 'pointercancel') tap(p.x, p.y);
        press = null;
      }
      if (count() < 2) pinch = null;
      schedule();
    };
    var onWheel = function (ev) {
      if (ev.preventDefault) ev.preventDefault();
      var factor = Math.exp((ev.deltaY || 0) * 0.0012);
      eng.state = clampCamera({ tx: eng.state.tx, tz: eng.state.tz, dist: eng.state.dist * factor }, eng.world.map, eng.aspect);
      anims.camera = null;
      eng.handMoved = true;
      schedule();
    };
    var tap = function (sx, sy) {
      if (!eng.world) return;
      var nx = (sx / width) * 2 - 1;
      var ny = 1 - (sy / height) * 2;
      var hit = pickTile(rayFromNdc(eng.state, eng.aspect, nx, ny), eng.world.map);
      if (hit && typeof o.onTap === 'function') o.onTap(hit.x, hit.y);
    };
    if (o.canvas && typeof o.canvas.addEventListener === 'function') {
      o.canvas.addEventListener('pointerdown', onDown);
      o.canvas.addEventListener('pointermove', onMove);
      o.canvas.addEventListener('pointerup', onUp);
      o.canvas.addEventListener('pointercancel', onUp);
      o.canvas.addEventListener('wheel', onWheel, { passive: false });
      var onLeave = function () {
        if (eng.picking) setHover(null);
      };
      o.canvas.addEventListener('pointerleave', onLeave);
      listeners.push([o.canvas, 'pointerdown', onDown], [o.canvas, 'pointermove', onMove], [o.canvas, 'pointerup', onUp], [o.canvas, 'pointercancel', onUp], [o.canvas, 'wheel', onWheel], [o.canvas, 'pointerleave', onLeave]);
    }
    var ro = null;
    if (typeof ResizeObserver === 'function' && o.root) {
      // A resize clears the canvas: draw once more (on demand, nothing else would).
      ro = new ResizeObserver(function () {
        resize();
        schedule();
      });
      ro.observe(o.root);
    } else if (typeof window !== 'undefined' && window.addEventListener) {
      var onResize = function () {
        resize();
        schedule();
      };
      window.addEventListener('resize', onResize);
      listeners.push([window, 'resize', onResize]);
    }

    // ── The API the node wires ──
    eng.setWorld = function (world) {
      setWorld(world);
      schedule();
    };
    eng.setStepMs = function (ms) {
      stepMs = ms;
    };
    eng.setCamera = function (mode, focus) {
      var changed = mode !== eng.cameraMode || JSON.stringify(focus || null) !== JSON.stringify(eng.focus || null);
      eng.cameraMode = mode === 'island' || mode === 'follow' ? mode : 'plot';
      eng.focus = focus;
      setAttr('data-camera', eng.cameraMode);
      if (eng.world && changed) {
        eng.handMoved = false;
        glideCamera(goalState(), CAMERA_MS);
      }
      schedule();
    };
    eng.setBubble = function (b) {
      bubble = b && typeof b === 'object' && b.text ? { robot: Math.max(0, Math.min((eng.world ? eng.world.robots.length : 1) - 1, Number(b.robot) || 0)), text: b.text, style: b.style === 'olive' ? 'olive' : 'plain' } : null;
      var ms = bubble ? Number(b.ms) : 0;
      if (bubble && (!isFinite(ms) || ms <= 0)) ms = bubble.style === 'olive' ? 3200 : 1100;
      bubbleUntil = bubble ? now() + ms : 0;
      // The bubble goes on a timer, not on a frame: a still scene draws none (coalesce on a timer, never on rAF).
      if (bubbleTimer) clearTimeout(bubbleTimer);
      bubbleTimer = bubble && typeof setTimeout === 'function' ? setTimeout(function () {
        bubbleTimer = null;
        if (destroyed) return;
        bubble = null;
        bubbleUntil = 0;
        if (eng.built) rebuildOverlay();
      }, ms) : null;
      if (eng.built) rebuildOverlay();
      schedule();
    };
    /** P108 IW-002 (brief §4.4): the chips to ring. Rings and meters are overlay DOM: no rebuild of the scene. */
    eng.setWatch = function (v) {
      eng.watch = v === undefined ? null : v;
      if (eng.built) rebuildOverlay();
      schedule();
    };
    /** Picking: the root says so (the page's violet frame is CSS); the tile under the pointer lifts its things. */
    eng.setPicking = function (on) {
      eng.picking = !!on;
      setAttr('data-picking', eng.picking ? 'true' : 'false');
      if (!eng.picking) {
        eng.hover = null;
        setAttr('data-hover', '');
      }
      schedule();
    };
    eng.celebrate = function () {
      anims.hop = now();
      schedule();
    };
    eng.resize = function () {
      resize();
      schedule();
    };
    /** Screen coordinates (in canvas px) of a tile’s centre, for a drive that taps tiles. */
    eng.screenOfTile = function (x, y) {
      var p = tileCentre(eng.world.map, x, y);
      return screenOf([p.x, tileHeight(kindAt(eng.world.map, x, y) || 'grass'), p.z]);
    };
    eng.pick = function (sx, sy) {
      var nx = (sx / width) * 2 - 1;
      var ny = 1 - (sy / height) * 2;
      return pickTile(rayFromNdc(eng.state, eng.aspect, nx, ny), eng.world.map);
    };
    eng.robotAt = function (i) {
      var g = eng.built && eng.built.robots[i];
      return g ? { x: g.position.x, y: g.position.y, z: g.position.z, yaw: g.rotation.y, gliding: !!g.userData.gliding, bumping: !!g.userData.bumping } : null;
    };
    eng.frame = frame;
    eng.destroy = function () {
      destroyed = true;
      if (bubbleTimer) clearTimeout(bubbleTimer);
      if (rafId) caf(rafId);
      listeners.forEach(function (l) {
        l[0].removeEventListener(l[1], l[2]);
      });
      if (ro) ro.disconnect();
      if (eng.built) disposeGroup(eng.built.root);
      disposeShared();
      if (renderer && renderer.dispose) renderer.dispose();
    };
    resize();
    return eng;
  }

  var ENGINE_API = { create: createEngine, TAP_SLOP_PX: TAP_SLOP_PX, FRAME_WINDOW: FRAME_WINDOW, SLOW: SLOW, p95: p95 };

  // ═══════════════════════════════════════════════════════════════════════════
  // Garden 3D — the React node
  // ═══════════════════════════════════════════════════════════════════════════

  var WORLD_CSS =
    '.gd3-world{position:relative;width:100%;max-width:640px;margin:0 auto;border-radius:16px;overflow:hidden;background:#BFE8CC;border:4px solid #A8D9B4;box-sizing:border-box;-webkit-tap-highlight-color:transparent;font-family:inherit;touch-action:none;user-select:none;-webkit-user-select:none}\n' +
    '.gd3-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}\n' +
    '.gd3-overlay{position:absolute;inset:0;pointer-events:none;overflow:hidden}\n' +
    '.gd3-name{position:absolute;transform:translate(-50%,0);background:#fff;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15);color:#2E2A3D;z-index:2}\n' +
    '.gd3-label{position:absolute;transform:translate(-50%,0);background:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.15)}\n' +
    '.gd3-bubble{position:absolute;transform:translate(-30%,-100%);background:#fff;border-radius:14px;padding:8px 12px;font-weight:800;font-size:14px;box-shadow:0 6px 18px rgba(72,52,20,.10);max-width:230px;color:#2E2A3D;pointer-events:none}\n' +
    '.gd3-bubble:after{content:"";position:absolute;left:34%;bottom:-8px;border:8px solid transparent;border-top-color:#fff;border-bottom:0}\n' +
    '.gd3-bubble.gd3-olive{background:#EEE8FF;color:#4A2FA6}.gd3-bubble.gd3-olive:after{border-top-color:#EEE8FF}\n' +
    '.gd3-bubble small{display:block;font-weight:700;color:#6E6784;font-size:11px}.gd3-bubble.gd3-olive small{color:#6A5AA8}\n' +
    '.gd3-fallback{position:absolute;inset:0;display:grid;place-items:center;color:#6E6784;font-size:13px;font-weight:700}\n' +
    '.gd3-isl-say{position:absolute;transform:translate(-30%,-100%);background:#fff;border-radius:12px;padding:5px 9px;font-weight:800;font-size:12px;box-shadow:0 6px 18px rgba(72,52,20,.12);max-width:180px;color:#2E2A3D;pointer-events:none;z-index:1}\n' +
    '.gd3-isl-say:after{content:"";position:absolute;left:30%;bottom:-6px;border:6px solid transparent;border-top-color:#fff;border-bottom:0}\n' +
    // P108 IW-002 AC6 (lane D): the mockup's meter chips over a thing (garden-kit's .gd-meter, the same look), a held can's
    // level under its robot's name (ink, the mockup's robot chip), Watch's rings and large meters, Picking's violet frame.
    '.gd3-meter{position:absolute;transform:translate(-50%,-100%);display:flex;align-items:center;gap:3px;background:#fff;border-radius:999px;padding:1px 7px;font-size:11px;font-weight:800;line-height:1.35;white-space:nowrap;color:#2E2A3D;box-shadow:0 2px 6px rgba(0,0,0,.18);pointer-events:none;z-index:1}\n' +
    '.gd3-meter-bot{background:#2E2A3D;color:#fff;z-index:2}\n' +
    '.gd3-pips{display:inline-flex;gap:2px}.gd3-pip{display:block;width:6px;height:9px;border-radius:3px;background:#E6DCC6}\n' +
    '.gd3-pip.gd3-on{background:#7CC6F0}.gd3-m-stone .gd3-pip.gd3-on{background:#8E8CA0}.gd3-m-egg .gd3-pip.gd3-on{background:#FFD166}.gd3-m-food .gd3-pip.gd3-on{background:#C79A63}.gd3-m-letter .gd3-pip.gd3-on{background:#E86A5E}\n' +
    '.gd3-meter.gd3-full{background:#3FA66B;color:#fff}.gd3-meter.gd3-full .gd3-pip{background:rgba(255,255,255,.35)}.gd3-meter.gd3-full .gd3-pip.gd3-on{background:#fff}\n' +
    '.gd3-mi{display:block;flex:none;box-sizing:border-box;width:8px;height:8px}\n' +
    '.gd3-mi-water{background:#2B7FC0;border-radius:0 50% 50% 50%;transform:rotate(45deg);margin:2px 1px 0}.gd3-meter-bot .gd3-mi-water{background:#7CC6F0}\n' +
    '.gd3-mi-stone{background:#8E8B9A;border-radius:45% 55% 40% 50%;width:10px;height:8px}\n' +
    '.gd3-mi-egg{background:#FFF7E8;border:1.5px solid #C79A63;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;width:8px;height:10px}\n' +
    '.gd3-mi-food{background:#C79A63;border-radius:50%;width:10px;height:7px}\n' +
    '.gd3-mi-letter{background:#FFF7E8;border:1.5px solid #E86A5E;border-radius:1px;width:10px;height:7px}\n' +
    '.gd3-mi-dot{background:#6E6784;border-radius:50%;width:7px;height:7px}\n' +
    '.gd3-meter.gd3-watch{outline:3px solid #8F6BFF;outline-offset:1px;font-size:15px;gap:5px;padding:2px 11px;z-index:3}\n' +
    '.gd3-meter.gd3-watch .gd3-pip{width:9px;height:14px;border-radius:4px}.gd3-meter.gd3-watch .gd3-mi{width:11px;height:11px}.gd3-meter.gd3-watch .gd3-mi-egg{width:10px;height:13px}.gd3-meter.gd3-watch .gd3-mi-stone,.gd3-meter.gd3-watch .gd3-mi-food,.gd3-meter.gd3-watch .gd3-mi-letter{width:14px;height:10px}\n' +
    '.gd3-ring{position:absolute;transform:translate(-50%,-50%);box-sizing:border-box;border:3px solid #8F6BFF;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.9),inset 0 0 0 2px rgba(255,255,255,.9);pointer-events:none}\n' +
    // P108 IW-003 (lane P): the door's name plate (a label's pill, the 2D plate's colours); hidden on the island.
    '.gd3-plate{transform:translate(-50%,-50%);background:#FFF7E8;color:#2E2A3D;border:1.5px solid #8B5A2B;border-radius:6px;padding:0 6px;font-size:11px;box-shadow:none}.gd3-world[data-wide="1"] .gd3-plate{display:none}\n' +
    '.gd3-world[data-wide="1"] .gd3-meter:not(.gd3-watch){font-size:9px;padding:0 4px;gap:2px}.gd3-world[data-wide="1"] .gd3-meter:not(.gd3-watch) .gd3-pips{display:none}\n' +
    // P108 IW-003 (lane B): the island's compact meter is a bar narrower than a tile (neighbours' chips no longer overlap).
    '.gd3-world[data-wide="1"] .gd3-meter:not(.gd3-watch):not(.gd3-meter-bot){width:12px;height:5px;padding:0;gap:0;font-size:0;border-radius:3px;background:linear-gradient(90deg,var(--c,#2B7FC0) 0 var(--f,0%),#E6DCC6 var(--f,0%));box-shadow:0 0 0 1.5px #fff,0 1px 3px rgba(0,0,0,.3)}\n' +
    '.gd3-world[data-wide="1"] .gd3-meter:not(.gd3-watch):not(.gd3-meter-bot)>*{display:none}\n' +
    '.gd3-world[data-wide="1"] .gd3-meter.gd3-m-stone{--c:#6E6B7A}.gd3-world[data-wide="1"] .gd3-meter.gd3-m-egg{--c:#E0A800}.gd3-world[data-wide="1"] .gd3-meter.gd3-m-food{--c:#A9773F}.gd3-world[data-wide="1"] .gd3-meter.gd3-m-letter,.gd3-world[data-wide="1"] .gd3-meter.gd3-m-ball{--c:#E04E4E}\n' +
    '.gd3-world[data-wide="1"] .gd3-meter[data-fill="1"]{--f:10%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="2"]{--f:20%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="3"]{--f:30%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="4"]{--f:40%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="5"]{--f:50%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="6"]{--f:60%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="7"]{--f:70%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="8"]{--f:80%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="9"]{--f:90%}.gd3-world[data-wide="1"] .gd3-meter[data-fill="10"]{--f:100%}\n' +
    '.gd3-world[data-wide="1"] .gd3-meter.gd3-full:not(.gd3-watch):not(.gd3-meter-bot){--c:#3FA66B;--f:100%}\n' +
    '.gd3-mi-ball{background:#E04E4E;border-radius:50%;width:8px;height:8px;box-shadow:inset 0 -2px 0 rgba(255,255,255,.6)}.gd3-m-ball .gd3-pip.gd3-on{background:#E04E4E}\n' +
    '.gd3-world.gd3-picking{border-color:#8F6BFF;box-shadow:0 0 0 3px #EEE8FF}.gd3-picking .gd3-canvas{cursor:crosshair}';

  /** @type {import('./types/node-kit').ReactNodeDefinition} */
  var Garden3D = {
    name: 'garden-3d-kit.Garden3D',
    displayNodeName: 'Garden 3D',
    docs:
      'The tile world in the round: a flat-shaded three.js island from the same Map, Things, Robots and Bubble as ' +
      'Garden (tile boxes with a height per kind, cone trees, icosahedron rocks, a box-and-prism house, stem-and-bulb ' +
      'tulips, robots as a box body with a visor, eyes and a hat). One finger or a drag pans, a pinch or a wheel zooms, ' +
      'a tap reports the tile. Camera frames the Focus rectangle, the whole island, or follows robot 0. Supported is ' +
      'false when there is no WebGL2 (or no three.js): nothing is drawn, nothing throws, Ready never fires, and the ' +
      'page swaps in Garden. Frame Ms is the rolling p95 of the last 60 frames, measured after Ready while visible; ' +
      'Too Slow fires once when it stays above 50 ms for 3 s of visible time, the other cue to swap. ' +
      'It draws; the engine decides where a robot may go.',
    ssr: { compat: 'safe' },
    noodlNodeAsProp: true,

    /** The pure parts, for the kit gate. */
    world: LOCAL_WORLD,
    worldHelpers: worldHelpers,
    scene: { buildScene: buildScene, buildRobot: buildRobot, THING_BUILDERS: THING_BUILDERS, PALETTE: PALETTE, TILE_HEIGHT: TILE_HEIGHT, PICK_LIFT: PICK_LIFT },
    /** P108 IW-002: the job table's copies and the meter / watch helpers (pinned to garden-kit's and to cg002Content). */
    job: JOB_LOOK,
    camera: CAMERA_API,
    engine: ENGINE_API,
    css: WORLD_CSS,

    getReactComponent: function () {
      return function Garden3DComponent(props) {
        var root = React.useRef(null);
        var canvas = React.useRef(null);
        var overlay = React.useRef(null);
        var engine = React.useRef(null);
        var helpers = worldHelpers();
        var grid = helpers.parseMap(props.map);
        var things = helpers.parseThings(props.things);
        var robots = helpers.parseRobots(props.robots);
        var stepMs = Math.max(0, Number(props.stepMs));
        if (!isFinite(stepMs)) stepMs = 380;
        var cameraMode = props.camera === 'island' || props.camera === 'follow' ? props.camera : 'plot';
        var focus = readJson(props.focus, null);
        var focusKey = JSON.stringify(focus);
        var mapKey = JSON.stringify(grid.rows) + JSON.stringify(grid.legend);
        var thingsKey = JSON.stringify(things);
        var robotsKey = JSON.stringify(robots);
        // P108 IW-002 (brief §4.4): the two world inputs.
        var watchList = watchRefs(props.watch);
        var watchKey = JSON.stringify(watchList);
        var picking = props.picking === true;
        var supportedState = React.useState(null);

        // Mount: decide Supported once, on the real page. Everything browser-only lives here.
        React.useEffect(function () {
          props.noodlNode && props.noodlNode.setDOMElement(root.current);
          var reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
          var eng = createEngine({
            THREE: typeof THREE !== 'undefined' ? THREE : undefined,
            root: root.current,
            canvas: canvas.current,
            overlay: overlay.current,
            reducedMotion: reduced,
            onTap: function (x, y) {
              if (typeof props.onTileX === 'function') props.onTileX(x);
              if (typeof props.onTileY === 'function') props.onTileY(y);
              if (typeof props.onTileTapped === 'function') props.onTileTapped();
            },
            onFrameMs: function (ms) {
              if (typeof props.onFrameMs === 'function') props.onFrameMs(ms);
            },
            onReady: function () {
              if (typeof props.onReady === 'function') props.onReady();
            },
            onTooSlow: function () {
              if (typeof props.onTooSlow === 'function') props.onTooSlow();
            }
          });
          engine.current = eng;
          if (root.current) {
            root.current.gd3 = eng;
            root.current.setAttribute('data-helpers', helpers.source);
          }
          if (typeof props.onSupported === 'function') props.onSupported(eng.supported);
          supportedState[1](eng.supported);
          return function () {
            eng.destroy();
            engine.current = null;
          };
        }, []);

        React.useEffect(
          function () {
            var eng = engine.current;
            if (!eng || !eng.supported) return;
            eng.setStepMs(stepMs);
            eng.setWorld({ map: grid, things: things, robots: robots });
          },
          [mapKey, thingsKey, robotsKey, stepMs, supportedState[0]]
        );

        React.useEffect(
          function () {
            var eng = engine.current;
            if (!eng || !eng.supported) return;
            eng.setCamera(cameraMode, focus);
          },
          [cameraMode, focusKey, supportedState[0]]
        );

        React.useEffect(
          function () {
            var eng = engine.current;
            if (!eng || !eng.supported) return;
            eng.setWatch(watchList);
          },
          // A new world rebuilds the overlay from eng.watch itself; this is for a new Watch alone.
          [watchKey, supportedState[0]]
        );
        React.useEffect(
          function () {
            var eng = engine.current;
            if (!eng || !eng.supported) return;
            eng.setPicking(picking);
          },
          [picking, supportedState[0]]
        );

        // Celebrate is a signal: a count that rises. The robots hop.
        var cheers = React.useRef(null);
        if (cheers.current === null) cheers.current = { seen: props.celebrate, n: 0 };
        if (cheers.current.seen !== props.celebrate) {
          if (helpers.rose(cheers.current.seen, props.celebrate)) cheers.current.n++;
          cheers.current.seen = props.celebrate;
        }
        var cheerN = cheers.current.n;
        React.useEffect(
          function () {
            var eng = engine.current;
            if (!cheerN || !eng || !eng.supported) return;
            eng.celebrate();
          },
          [cheerN]
        );

        var bubble = readJson(props.bubble, null);
        var bubbleKey = bubble && typeof bubble === 'object' && bubble.text ? JSON.stringify(bubble) : '';
        React.useEffect(
          function () {
            var eng = engine.current;
            if (!eng || !eng.supported) return;
            eng.setBubble(bubbleKey ? bubble : null);
          },
          [bubbleKey, supportedState[0]]
        );

        var worldStyle = Object.assign({ aspectRatio: Math.max(1, grid.w) + ' / ' + Math.max(1, grid.h) }, props.style);
        if (worldStyle.display !== 'none') worldStyle.display = 'block';
        return h(
          'div',
          {
            ref: root,
            className: 'gd3-world' + (picking ? ' gd3-picking' : ''),
            'data-gd3-world': 'true',
            'data-w': String(grid.w),
            'data-h': String(grid.h),
            'data-camera': cameraMode,
            role: 'group',
            'aria-label': props.label || 'garden',
            style: worldStyle
          },
          h('style', { key: 'css' }, WORLD_CSS),
          h('canvas', { key: 'canvas', ref: canvas, className: 'gd3-canvas', 'data-gd3-canvas': 'true', 'aria-hidden': 'true' }),
          h('div', { key: 'overlay', ref: overlay, className: 'gd3-overlay', 'data-gd3-overlay': 'true' }),
          supportedState[0] === false ? h('div', { key: 'fallback', className: 'gd3-fallback', 'data-gd3-fallback': 'true' }) : null
        );
      };
    },

    defaultCss: { display: 'block' },

    inputProps: {
      map: { type: 'object', displayName: 'Map', group: 'World', default: '{"rows":["GGTGGGTH","GGGGGGGG","GGFGFGFG","PPPPPPPP","GWWGGRGG","GGGGGTGG"]}', description: 'Rows of characters and a legend, as an object or JSON: { rows: ["GGTG…"], legend: { G: "grass" } }. Kinds: grass, path, water, tree, rock, house, bed (a tulip bed, dry until a Thing waters it), postbox (the post box, on path). The mockup’s legend is the default.' },
      things: { type: 'object', displayName: 'Things', group: 'World', description: 'A list, as an object or JSON: { kind, x, y } with kind tulip (watered true/false), puddle, letter, bowl (full true/false), stone, egg, food, flag or label (text).' },
      robots: { type: 'object', displayName: 'Robots', group: 'World', default: '[{"x":0,"y":3,"d":1,"colour":"#FF7A59","eyes":"round","hat":"none","name":"Pip"}]', description: 'One or two, as a list or JSON: { x, y, d, colour, eyes, hat, name, bump }. d is 0 up, 1 right, 2 down, 3 left. bump is a count: raise it once per bump.' },
      bubble: { type: 'object', displayName: 'Bubble', group: 'World', description: '{ robot, text, style, ms }: a line over a robot for ms (1100 plain, 3200 olive by default). A new object shows a new bubble.' },
      stepMs: { type: 'number', displayName: 'Step Ms', group: 'World', default: 380, description: 'How long a robot takes to glide one tile.' },
      celebrate: { type: 'signal', displayName: 'Celebrate', group: 'World', description: 'The robots hop for a moment.' },
      label: { type: 'string', displayName: 'Label', group: 'World', default: 'The garden', description: 'What a screen reader calls the world.' },
      camera: { type: { name: 'enum', enums: [{ value: 'plot', label: 'Plot' }, { value: 'island', label: 'Island' }, { value: 'follow', label: 'Follow' }] }, displayName: 'Camera', group: 'Camera', default: 'plot', description: 'plot frames the Focus rectangle (the whole map when Focus is empty); island frames the whole map; follow keeps robot 0 in the middle. A finger can always pan and zoom within the map.' },
      focus: { type: 'object', displayName: 'Focus', group: 'Camera', description: '{ x, y, w, h } in tiles: the rectangle the plot camera frames.' },
      // P108 IW-002 (lane D), the common brief §4.4: garden-kit's two world inputs, the same (the port gate diffs them).
      watch: { type: 'object', displayName: 'Watch', group: 'World', description: 'The things a program asks about, as a list of chips { id?, kind, x, y } or its JSON (empty: none). Each is ringed and its meter drawn large — the thing with that id, else the first of its kind on its tile, else (a can) the robot holding it, else the tile.' },
      picking: { type: 'boolean', displayName: 'Picking', group: 'World', default: false, description: 'True while a child picks a thing for a chip: the world is framed in violet and the things under the pointer lift. A tap still reports Tile X, Tile Y and Tile Tapped as always.' }
    },

    outputProps: {
      onTileX: { type: 'number', displayName: 'Tile X', group: 'Taps', description: 'The column of the last tapped tile.' },
      onTileY: { type: 'number', displayName: 'Tile Y', group: 'Taps', description: 'The row of the last tapped tile.' },
      onTileTapped: { type: 'signal', displayName: 'Tile Tapped', group: 'Taps', description: 'A tile was tapped. Tile X and Tile Y already hold it.' },
      onReady: { type: 'signal', displayName: 'Ready', group: 'Events', description: 'The world is on the page.' },
      onFrameMs: { type: 'number', displayName: 'Frame Ms', group: 'Events', description: 'The rolling p95 of the last 60 frame intervals in ms, measured after Ready, only while the page is visible and only while something moves (the scene is drawn on demand). Above 33 is under 30 fps.' },
      onSupported: { type: 'boolean', displayName: 'Supported', group: 'Events', description: 'True when a WebGL2 context could be made and three.js is on the page. False: nothing is drawn, nothing throws, Ready never fires — swap in Garden.' },
      onTooSlow: { type: 'signal', displayName: 'Too Slow', group: 'Events', description: 'Fires once when Frame Ms has stayed above 50 ms (under 20 fps) for 3 s of moving, visible time after Ready — the page’s cue to swap in Garden. A hidden window and a still scene count no time.' }
    }
  };

  /** @type {import('./types/node-kit').NodeKitModule} */
  var kit = {
    nodes: [],
    reactNodes: h ? [Garden3D] : []
  };

  Noodl.defineModule(kit);
})();
