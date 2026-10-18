// The 3D map: every component a plate in its folder's district, every node a card on its plate at
// the x, y the files give it, every wire an arc from an output port to an input port. Drawn with
// three.js in the NodeGX canvas look (@nodegx/canvas-look): category colours, wire colours, card
// metrics. As on a NodeGX card, a card shows a port row only for a port that is wired: inputs, then
// outputs, each with its dot on the card's edge (inputs west, outputs east), and every wire leaves
// its output dot level and arrives level into its input dot.
// The map only draws and picks; every change goes through the model.

import * as THREE from 'three';
import { look, nodeScheme, categoryColors, wireColors } from '/kit/canvas-look/index.mjs';
import { designShip, shipClass, seeded, SIDES, deckMaterial, planarUV } from '/ships.mjs';
import { Space } from '/space.mjs';
import { Battle } from '/battle.mjs';

const S = 10; // file pixels per world unit
const CARD_W = look.card.size.width / S;
const CARD_D = look.card.size.height / S; // the header; port rows add to it
const ROW_PX = look.card.propertyConnectionHeight;
const ROW_D = ROW_PX / S;
const CARD_H = 1.6; // the cards are the blocks on the ships' decks
const PORT_Y = CARD_H; // ports sit on the card's top edge, so the dots and the wire ends show from above
const PAD = 6;
const THEME = 'dark';
const C = look.colors[THEME];
const DETAIL_RANGE = 260; // within this distance of the camera a plate's cards get their labels
const SEGS = 32; // line segments per wire
const BALL_EVERY_MS = 320; // how often a hovered wire fires a ball
const BALL_SPEED = 28; // world units per second

/** A wire's path: a NodeGX bezier on the ground plane (it leaves and arrives horizontally), lifted into an arc between the ports. */
class WireCurve extends THREE.Curve {
  constructor(a, b) {
    super();
    this.a = a;
    this.b = b;
    const dx = b.x - a.x;
    const dist = Math.hypot(dx, b.z - a.z);
    // How far the curve runs straight out of the output and into the input: half the gap, more when the wire runs backwards.
    this.reach = Math.max(2.5, Math.abs(dx) * 0.5, dx < 0 ? 6 + Math.min(-dx * 0.4, 24) : 0);
    this.lift = Math.min(1 + dist * 0.12, 14);
  }

  getPoint(t, target = new THREE.Vector3()) {
    const { a, b, reach, lift } = this;
    const u = 1 - t;
    const x = u * u * u * a.x + 3 * u * u * t * (a.x + reach) + 3 * u * t * t * (b.x - reach) + t * t * t * b.x;
    const z = u * u * u * a.z + 3 * u * u * t * a.z + 3 * u * t * t * b.z + t * t * t * b.z;
    // sin² rises from 0 with a zero slope, so the ends stay level with their ports.
    const s = Math.sin(Math.PI * t);
    const y = a.y + (b.y - a.y) * t + lift * s * s;
    return target.set(x, y, z);
  }
}

export class MapView {
  constructor(canvas, model, { categoryOf, portTypeOf }) {
    this.canvas = canvas;
    this.model = model;
    this.categoryOf = categoryOf; // (key, node) → canvas-look category
    this.portTypeOf = portTypeOf; // (key, nodeId, port, 'output'|'input') → 'signal' | other
    this.plates = new Map(); // key → { group, origin, minX, minY, w, d, cards, pos, info, curves, wires, detailed }
    this.selection = null; // { key, id }
    this.focusKey = null;
    this.handlers = {};
    this.balls = []; // glowing balls running along wires
    this.hover = null; // { key, wires: [curve entries], sig }

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#02030a');
    this.scene.fog = new THREE.Fog('#03040b', 2400, 6000);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 7000);
    this.scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x1a1626, 1.25));
    const sun = new THREE.DirectionalLight(0xfff4e6, 1.3);
    sun.position.set(-400, 700, -300);
    this.scene.add(sun);
    this.THREE = THREE; // for the developer's console and the tests
    this.space = new Space(this.scene);
    this.battle = new Battle(this.scene, glowSprite);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.overlay = new THREE.Group(); // selection, links
    this.scene.add(this.overlay);
    this.hoverGroup = new THREE.Group(); // the hovered wires' glow
    this.scene.add(this.hoverGroup);

    this.raycaster = new THREE.Raycaster();
    this.yaw = 0;
    this.pitch = -0.7;
    this.keys = new Set();
    this.flight = null;
    this.installControls();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.lastLod = 0;
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  on(name, fn) {
    this.handlers[name] = fn;
  }

  emit(name, ...a) {
    this.handlers[name]?.(...a);
  }

  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.renderer.setSize(r.width, r.height, false);
    this.camera.aspect = r.width / Math.max(1, r.height);
    this.camera.updateProjectionMatrix();
  }

  // --- building ----------------------------------------------------------------------------

  /**
   * Lays the components out as two fleets flying ahead (-z) side by side, the battle lane between
   * them: every folder is a squadron, its ships in columns, one behind another, with uneven gaps.
   * Each folder joins the side with fewer ships, biggest folder first. A ship's class (small,
   * medium, large) comes from its node count against the project's terciles, and its hull is built
   * around its deck, so a bigger component is a bigger ship.
   */
  build() {
    for (const p of this.plates.values()) disposeGroup(p.group);
    this.world.clear();
    this.plates.clear();
    this.clearOverlay();
    this.setHover(null);
    this.battle.clear();
    const keys = this.model.keys();
    const counts = keys.map((k) => this.model.nodes(k).length).sort((a, b) => a - b);
    const t1 = counts[Math.floor((counts.length - 1) / 3)] ?? 0;
    const t2 = counts[Math.floor((2 * (counts.length - 1)) / 3)] ?? 0;
    const groups = new Map();
    for (const key of keys) {
      const folder = key.includes('/') ? key.split('/')[0] : '(top level)';
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(key);
    }
    const districts = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    const fleets = { [SIDES.empire]: [], [SIDES.rebels]: [] };
    for (const d of districts) {
      const side = fleets.empire.reduce((s, x) => s + x[1].length, 0) <= fleets.rebels.reduce((s, x) => s + x[1].length, 0) ? SIDES.empire : SIDES.rebels;
      fleets[side].push(d);
    }
    this.fleets = {};
    for (const side of [SIDES.empire, SIDES.rebels]) this.fleets[side] = { ships: fleets[side].reduce((s, x) => s + x[1].length, 0), folders: fleets[side].map(([f]) => f) };
    // Every ship designed first, to know how much space it takes.
    const ships = new Map();
    for (const key of keys) {
      const deck = this.measure(key);
      const side = fleets.empire.some(([, ks]) => ks.includes(key)) ? SIDES.empire : SIDES.rebels;
      const cls = shipClass(this.model.nodes(key).length, t1, t2);
      const design = designShip(side, cls, deck.w, deck.d, key);
      design.W = deck.w;
      design.D = deck.d;
      ships.set(key, { key, deck, side, cls, design, fp: design.bbox });
    }
    const LANE = 420;
    for (const side of [SIDES.empire, SIDES.rebels]) {
      // The Empire's squadrons spread out to -x from the lane, the Rebels' to +x.
      let cursor = side === SIDES.empire ? 0 : LANE;
      for (const [folder, fkeys] of fleets[side]) {
        const rand = seeded(folder);
        const list = fkeys.map((k) => ships.get(k)).sort((a, b) => b.fp.max.z - b.fp.min.z - (a.fp.max.z - a.fp.min.z));
        const ncol = Math.max(1, Math.round(Math.sqrt(list.length / 1.6)));
        const cols = Array.from({ length: ncol }, () => ({ ships: [], length: 0, width: 0 }));
        for (const s of list) {
          const col = cols.reduce((a, b) => (b.length < a.length ? b : a));
          col.ships.push(s);
          col.length += s.fp.max.z - s.fp.min.z + 60;
          col.width = Math.max(col.width, s.fp.max.x - s.fp.min.x);
        }
        const gaps = cols.map(() => 30 + rand() * 50);
        const width = cols.reduce((s, c, i) => s + c.width + (i ? gaps[i] : 0), 0);
        let x = side === SIDES.empire ? cursor - width : cursor;
        const start = rand() * 160;
        let zMin = Infinity;
        cols.forEach((col, i) => {
          if (i) x += gaps[i];
          let z = start + rand() * 90;
          for (const s of col.ships) {
            const jitter = (rand() - 0.5) * 16;
            const ox = x + col.width / 2 - (s.fp.min.x + s.fp.max.x) / 2 + jitter;
            const oz = z - s.fp.min.z;
            zMin = Math.min(zMin, z);
            this.buildPlate(s.key, { x: ox, z: oz }, { ...s.deck, ship: s });
            z += s.fp.max.z - s.fp.min.z + 25 + rand() * 75; // uneven spacing, one speed
          }
          x += col.width;
        });
        const label = textSprite(folder.toUpperCase(), { size: 64, color: C.cardText, bg: null, weight: 800 });
        const lx = side === SIDES.empire ? cursor - width / 2 : cursor + width / 2;
        label.position.set(lx, 60, zMin - 60);
        label.scale.multiplyScalar(3.5);
        label.userData.district = folder;
        this.world.add(label);
        cursor = side === SIDES.empire ? cursor - width - 140 : cursor + width + 140;
      }
    }
    this.bounds = new THREE.Box3();
    for (const p of this.plates.values()) this.bounds.expandByObject(p.base).expandByObject(p.shipGroup);
    this.updateLod(true);
    this.updateBattleShips();
  }

  /** Tells the battle where every ship's turrets and hull are now. */
  updateBattleShips() {
    const list = [];
    for (const p of this.plates.values()) {
      if (!p.shipGroup) continue;
      const o = p.shipGroup.position;
      const h = p.ship.design.hull;
      const hull = new THREE.Box3(new THREE.Vector3(h.x0, h.y0, h.z0).add(o), new THREE.Vector3(h.x1, h.y1, h.z1).add(o));
      list.push({ key: p.key, side: p.ship.side, turrets: p.ship.design.turrets.map((t) => t.muzzle.clone().add(o)), hull, center: hull.getCenter(new THREE.Vector3()) });
    }
    this.battle.setShips(list);
  }

  /** Turns the battle (fighters, lasers, explosions) on or off; the fleet stays. */
  setBattle(on) {
    this.battle.setEnabled(on);
  }

  /** Each node's wired ports, as its rows: inputs then outputs, in the order the wires list them. */
  rowsOf(key) {
    const rows = new Map();
    const get = (id) => {
      if (!rows.has(id)) rows.set(id, { ins: [], outs: [] });
      return rows.get(id);
    };
    for (const w of this.model.wires(key)) {
      const to = get(w.toId);
      if (!to.ins.includes(w.toProperty)) to.ins.push(w.toProperty);
      const from = get(w.fromId);
      if (!from.outs.includes(w.fromProperty)) from.outs.push(w.fromProperty);
    }
    return rows;
  }

  /** A card's depth on the plate, in file pixels: the header and a row per wired port. */
  static cardDepthPx(r) {
    return look.card.size.height + ((r?.ins.length ?? 0) + (r?.outs.length ?? 0)) * ROW_PX;
  }

  /** Where each node of a component sits in file pixels, and the plate size that holds them. */
  measure(key) {
    const nodes = this.model.nodes(key);
    const at = layoutPositions(nodes);
    const rows = this.rowsOf(key);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const p = at.get(n.id);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y + MapView.cardDepthPx(rows.get(n.id)) - look.card.size.height);
    }
    if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
    return { minX, minY, w: (maxX - minX) / S + CARD_W + PAD * 2, d: (maxY - minY) / S + CARD_D + PAD * 2 + 4 };
  }

  buildPlate(key, origin, m) {
    const plate = { key, origin, minX: m.minX, minY: m.minY, w: m.w, d: m.d, ship: m.ship, group: new THREE.Group(), cards: new Map(), pos: new Map(), info: new Map(), detailed: false };
    this.plates.set(key, plate);
    this.world.add(plate.group);
    this.drawPlate(plate);
  }

  /** (Re)draws one plate's contents at its fixed origin: after a change only this one is redrawn. */
  drawPlate(plate) {
    // The ship is kept across redraws (it is rebuilt below only if the deck changed size).
    if (plate.shipGroup) plate.group.remove(plate.shipGroup);
    disposeGroup(plate.group);
    plate.group.clear();
    plate.cards.clear();
    plate.pos.clear();
    plate.info.clear();
    const key = plate.key;
    const nodes = this.model.nodes(key);
    const at = layoutPositions(nodes);
    const rows = this.rowsOf(key);
    // Grow the plate when a node now sits beyond it.
    let maxX = plate.minX, maxY = plate.minY, minX = plate.minX, minY = plate.minY;
    for (const n of nodes) {
      const p = at.get(n.id);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y + MapView.cardDepthPx(rows.get(n.id)) - look.card.size.height);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    }
    const left = (minX - plate.minX) / S;
    const top = (minY - plate.minY) / S;
    const w = Math.max(plate.w, (maxX - plate.minX) / S + CARD_W + PAD * 2) - left;
    const d = Math.max(plate.d, (maxY - plate.minY) / S + CARD_D + PAD * 2 + 4) - top;
    const isCloud = key.includes('#__cloud__');
    // The ship around the deck. A deck that grew (a card moved past its edge) gets a new hull to fit.
    const s = plate.ship;
    if (s && (Math.abs(s.design.W - w) > 0.01 || Math.abs(s.design.D - d) > 0.01)) {
      if (plate.shipGroup) disposeGroup(plate.shipGroup);
      plate.shipGroup = null;
      s.design = designShip(s.side, s.cls, w, d, key);
      s.design.W = w;
      s.design.D = d;
    }
    if (s && !plate.shipGroup) {
      plate.shipGroup = s.design.group;
      plate.shipGroup.position.set(plate.origin.x + left, 0, plate.origin.z + top);
      plate.engineGlows = [];
      for (const e of s.design.engines) {
        const g = glowSprite(e.color, e.size);
        g.position.copy(e.at);
        g.userData.base = e.size;
        g.userData.phase = Math.random() * 10;
        plate.shipGroup.add(g);
        plate.engineGlows.push(g);
      }
      for (const m of plate.shipGroup.children) if (m.isMesh) m.userData.plate = key;
      if (this.battle.ships.length) this.updateBattleShips();
    }
    if (plate.shipGroup) plate.group.add(plate.shipGroup);
    // The deck: plated like its hull (a cloud function's deck stays blue, so it stands out).
    const deckGeo = new THREE.BoxGeometry(w, 0.8, d);
    deckGeo.translate(plate.origin.x + left + w / 2, -0.4, plate.origin.z + top + d / 2);
    planarUV(deckGeo);
    deckGeo.translate(-(plate.origin.x + left + w / 2), 0.4, -(plate.origin.z + top + d / 2));
    const base = new THREE.Mesh(deckGeo, isCloud || !s ? new THREE.MeshLambertMaterial({ color: new THREE.Color(isCloud ? '#2a3a5c' : C.cardBgHover) }) : deckMaterial(s.side, s.cls));
    base.position.set(plate.origin.x + left + w / 2, -0.4, plate.origin.z + top + d / 2);
    base.userData = { plate: key, sharedMaterial: !isCloud && !!s };
    plate.base = base;
    plate.group.add(base);
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(base.geometry), new THREE.LineBasicMaterial({ color: C.cardBorder }));
    rim.position.copy(base.position);
    plate.rim = rim;
    plate.group.add(rim);
    const name = textSprite(key.split('/').pop(), { size: 40, color: C.cardText, bg: 'rgba(0,0,0,0.35)', weight: 700 });
    const scale = Math.min(1, Math.max(0.35, w / 90));
    name.scale.multiplyScalar(scale);
    name.position.set(plate.origin.x + left + w / 2, 6 + 4 * scale, plate.origin.z + top - 1);
    name.userData = { plate: key };
    plate.label = name;
    plate.group.add(name);

    // Cards: x, y is the card's top-left corner, as on the canvas; the header first, then a row per wired port.
    const nubs = [];
    for (const n of nodes) {
      const p = at.get(n.id);
      const r = rows.get(n.id) ?? { ins: [], outs: [] };
      const depth = MapView.cardDepthPx(r) / S;
      const cx = plate.origin.x + PAD + (p.x - plate.minX) / S + CARD_W / 2;
      const zTop = plate.origin.z + PAD + 4 + (p.y - plate.minY) / S;
      const rowZ = (i) => zTop + CARD_D + (i + 0.5) * ROW_D;
      const info = {
        center: new THREE.Vector3(cx, CARD_H / 2, zTop + depth / 2),
        depth,
        rows: r,
        inAt: new Map(r.ins.map((name, i) => [name, new THREE.Vector3(cx - CARD_W / 2, PORT_Y, rowZ(i))])),
        outAt: new Map(r.outs.map((name, j) => [name, new THREE.Vector3(cx + CARD_W / 2, PORT_Y, rowZ(r.ins.length + j))]))
      };
      plate.info.set(n.id, info);
      plate.pos.set(n.id, info.center);
      const card = this.makeCard(key, n, plate.detailed, info);
      card.position.copy(info.center);
      plate.cards.set(n.id, card);
      plate.group.add(card);
      for (const [port, v] of info.inAt) nubs.push({ v, kind: this.kindOf(key, n.id, port, 'input') });
      for (const [port, v] of info.outAt) nubs.push({ v, kind: this.kindOf(key, n.id, port, 'output') });
    }
    // The port dots, one instanced mesh per plate.
    if (nubs.length) {
      const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), nubs.length);
      const m = new THREE.Matrix4();
      nubs.forEach((nb, i) => {
        dots.setMatrixAt(i, m.makeTranslation(nb.v.x, nb.v.y, nb.v.z));
        dots.setColorAt(i, new THREE.Color(wireColors(nb.kind, THEME).normal));
      });
      plate.group.add(dots);
    }
    // Hierarchy: a thin line from a visual parent's left edge down to each child's header, on the plate.
    const hier = [];
    for (const n of nodes) {
      const a = plate.info.get(n.id);
      for (const c of n.children ?? []) {
        const b = plate.info.get(c);
        if (!a || !b) continue;
        const x0 = a.center.x - CARD_W / 2 + 1;
        const z0 = a.center.z + a.depth / 2;
        const zc = b.center.z - b.depth / 2 + CARD_D / 2;
        hier.push(x0, 0.05, z0, x0, 0.05, zc, x0, 0.05, zc, b.center.x - CARD_W / 2, 0.05, zc);
      }
    }
    if (hier.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(hier, 3));
      plate.group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C.hierarchyLine, transparent: true, opacity: 0.7 })));
    }
    // Wires, coloured by kind; one line object per plate, SEGS segments per wire, in plate.curves order.
    const pos = [];
    const col = [];
    plate.curves = [];
    for (const w of this.model.wires(key)) {
      const curve = this.wireCurve(plate, w);
      if (!curve) continue;
      const kind = this.kindOf(key, w.fromId, w.fromProperty, 'output');
      plate.curves.push({ wire: w, curve, kind });
      const pts = curve.getPoints(SEGS);
      const c = new THREE.Color(wireColors(kind, THEME).normal);
      for (let i = 0; i < SEGS; i++) {
        pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    }
    plate.wires = null;
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      plate.wires = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }));
      plate.wires.userData = { wiresOf: key };
      plate.group.add(plate.wires);
    }
  }

  kindOf(key, nodeId, port, plug) {
    return this.portTypeOf(key, nodeId, port, plug) === 'signal' ? 'signal' : 'data';
  }

  wireCurve(plate, w) {
    const a = plate.info.get(w.fromId)?.outAt.get(w.fromProperty);
    const b = plate.info.get(w.toId)?.inAt.get(w.toProperty);
    if (!a || !b) return null;
    return new WireCurve(a.clone(), b.clone());
  }

  makeCard(key, node, detailed, info) {
    const category = this.categoryOf(key, node);
    const scheme = nodeScheme(category, THEME);
    const accent = categoryColors(category, THEME).accent;
    // A labelled card is two draw calls (its face, its sides); a far, plain one is one, with a material shared by its category.
    let mesh;
    if (detailed) {
      const top = new THREE.MeshBasicMaterial({ map: cardTexture(node, scheme, accent, info.rows, (port, plug) => this.kindOf(key, node.id, port, plug)) });
      const side = new THREE.MeshLambertMaterial({ color: new THREE.Color(scheme.header) });
      mesh = new THREE.Mesh(cardGeometry(info.depth), [top, side]);
    } else {
      mesh = new THREE.Mesh(cardGeometry(info.depth), plainCardMaterial(category, scheme));
      mesh.userData.sharedMaterial = true;
    }
    Object.assign(mesh.userData, { key, id: node.id, category, accent, scheme });
    return mesh;
  }

  /** Cards near the camera get their labels; far ones go plain, so 900 cards stay light. */
  updateLod(force) {
    const cam = this.camera.position;
    for (const plate of this.plates.values()) {
      const c = plate.base.position;
      const dist = Math.hypot(cam.x - c.x, cam.y - c.y, cam.z - c.z) - Math.max(plate.w, plate.d) / 2;
      const want = dist < DETAIL_RANGE;
      if (want !== plate.detailed || force) {
        plate.detailed = want;
        for (const [id, card] of plate.cards) {
          const node = this.model.node(plate.key, id);
          if (!node) continue;
          const fresh = this.makeCard(plate.key, node, want, plate.info.get(id));
          fresh.position.copy(card.position);
          plate.group.remove(card);
          disposeMesh(card);
          plate.group.add(fresh);
          plate.cards.set(id, fresh);
        }
        this.refreshSelection();
      }
    }
  }

  /** After the model changed one component. */
  redraw(key) {
    const plate = this.plates.get(key);
    if (!plate) return this.build();
    if (this.hover?.key === key) this.setHover(null);
    this.drawPlate(plate);
    this.refreshSelection();
  }

  // --- selection and overlays --------------------------------------------------------------

  select(sel) {
    this.selection = sel;
    if (sel) this.focusKey = sel.key;
    this.refreshSelection();
  }

  focusComponent(key) {
    this.focusKey = key;
    this.refreshSelection();
  }

  clearOverlay() {
    disposeGroup(this.overlay);
    this.overlay.clear();
  }

  refreshSelection() {
    this.clearOverlay();
    for (const plate of this.plates.values()) {
      plate.rim.material.color.set(plate.key === this.focusKey ? C.selection : C.cardBorder);
    }
    if (this.focusKey) this.drawLinks(this.focusKey);
    const sel = this.selection;
    if (!sel) return;
    const plate = this.plates.get(sel.key);
    const card = plate?.cards.get(sel.id);
    const info = plate?.info.get(sel.id);
    if (!card || !info) return;
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CARD_W + 0.6, CARD_H + 0.6, info.depth + 0.6)),
      new THREE.LineBasicMaterial({ color: C.selection })
    );
    box.position.copy(card.position);
    this.overlay.add(box);
    const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 4), new THREE.MeshBasicMaterial({ color: C.selection }));
    beacon.rotation.x = Math.PI;
    beacon.position.copy(card.position).add(new THREE.Vector3(0, 4, 0));
    beacon.userData.bob = true;
    this.overlay.add(beacon);
    // The selected node's wires, thick: signal and data in their highlighted colours.
    for (const { wire, curve, kind } of plate.curves) {
      if (wire.fromId !== sel.id && wire.toId !== sel.id) continue;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.16, 6), new THREE.MeshBasicMaterial({ color: wireColors(kind, THEME).highlighted }));
      tube.userData.wire = wire;
      this.overlay.add(tube);
    }
  }

  /** Bridges from a component's instances of other components to their plates, and from its users. */
  drawLinks(key) {
    const plate = this.plates.get(key);
    if (!plate) return;
    const color = new THREE.Color(categoryColors('component', THEME).accent);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const arc = (a, b) => {
      const mid = a.clone().lerp(b, 0.5);
      mid.y += 20 + a.distanceTo(b) * 0.25;
      const g = new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(a, mid, b).getPoints(40));
      this.overlay.add(new THREE.Line(g, mat));
    };
    for (const n of this.model.nodes(key)) {
      const target = this.model.componentForType(n.type);
      const tp = target && this.plates.get(target.key);
      if (tp) arc(plate.pos.get(n.id).clone(), tp.label.position.clone());
    }
    const me = this.model.component(key).legacyName;
    for (const other of this.plates.values()) {
      if (other.key === key) continue;
      for (const n of this.model.nodes(other.key)) if (n.type === me) arc(other.pos.get(n.id).clone(), plate.label.position.clone());
    }
  }

  /**
   * The wires under the pointer, lit: each glows in its highlighted colour and fires a glowing ball
   * from its output to its input every few hundred milliseconds, so you can see which way it runs.
   * `entries` are plate.curves entries of one plate; null clears.
   */
  setHover(h) {
    const sig = h ? `${h.key}|${h.wires.map((e) => plateWireId(e.wire)).join(',')}` : '';
    if (sig === (this.hover?.sig ?? '')) return;
    disposeGroup(this.hoverGroup);
    this.hoverGroup.clear();
    this.hover = h && h.wires.length ? { ...h, sig, lastBall: 0 } : null;
    if (!this.hover) return;
    for (const e of this.hover.wires) {
      const colors = wireColors(e.kind, THEME);
      const core = new THREE.Mesh(new THREE.TubeGeometry(e.curve, 64, 0.13, 6), new THREE.MeshBasicMaterial({ color: colors.highlighted }));
      const halo = new THREE.Mesh(
        new THREE.TubeGeometry(e.curve, 64, 0.5, 8),
        new THREE.MeshBasicMaterial({ color: colors.normal, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      this.hoverGroup.add(core, halo);
      // The two ports it joins, larger and bright.
      for (const at of [e.curve.a, e.curve.b]) {
        const dot = glowSprite(colors.normal, 2.2);
        dot.position.copy(at);
        this.hoverGroup.add(dot);
      }
    }
  }

  /** A glowing ball along one wire: the running app sent a value or a signal through it. */
  pulse(key, from, to) {
    const plate = this.plates.get(key);
    if (!plate) return;
    for (const e of plate.curves) {
      const w = e.wire;
      if (w.fromId !== from.node || w.fromProperty !== from.port || w.toId !== to.node || w.toProperty !== to.port) continue;
      this.fireBall(e);
    }
  }

  fireBall(e) {
    if (this.balls.length > 160) return;
    const ball = glowSprite(wireColors(e.kind, THEME).normal, 1.8);
    ball.position.copy(e.curve.a);
    this.scene.add(ball);
    const ms = Math.max(450, (e.curve.getLength() / BALL_SPEED) * 1000);
    this.balls.push({ ball, curve: e.curve, t0: null, ms });
  }

  // --- camera ------------------------------------------------------------------------------

  overview() {
    const b = this.bounds ?? new THREE.Box3(new THREE.Vector3(), new THREE.Vector3(500, 0, 500));
    const c = b.getCenter(new THREE.Vector3());
    const size = b.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z);
    this.flyTo(new THREE.Vector3(c.x, span * 0.5, c.z + span * 0.55), c);
  }

  flyToComponent(key) {
    const plate = this.plates.get(key);
    if (!plate) return;
    const c = plate.base.position.clone();
    const span = Math.max(plate.w, plate.d);
    this.flyTo(new THREE.Vector3(c.x, span * 0.8 + 20, c.z + span * 0.7 + 20), c);
  }

  flyToNode(key, id) {
    const p = this.plates.get(key)?.pos.get(id);
    if (!p) return;
    this.flyTo(new THREE.Vector3(p.x, 34, p.z + 30), p.clone());
  }

  /** A smooth flight to `to`, looking at `target`. Elapsed time is measured from the first frame's own timestamp. */
  flyTo(to, target) {
    const dir = target.clone().sub(to).normalize();
    this.flight = {
      from: this.camera.position.clone(),
      to,
      yaw0: this.yaw,
      pitch0: this.pitch,
      yaw1: Math.atan2(-dir.x, -dir.z),
      pitch1: Math.asin(Math.max(-1, Math.min(1, dir.y))),
      t0: null,
      ms: 900
    };
    // Turn the short way round.
    while (this.flight.yaw1 - this.flight.yaw0 > Math.PI) this.flight.yaw1 -= Math.PI * 2;
    while (this.flight.yaw1 - this.flight.yaw0 < -Math.PI) this.flight.yaw1 += Math.PI * 2;
  }

  installControls() {
    const el = this.canvas;
    // The map takes the keyboard when you click it, even back from the app's preview frame.
    el.tabIndex = 0;
    let down = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.focus({ preventScroll: true });
      el.setPointerCapture(e.pointerId);
      const hit = this.pick(e);
      const dragCard = hit?.card && this.selection && hit.card.key === this.selection.key && hit.card.id === this.selection.id && e.button === 0 && !e.shiftKey;
      down = { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey, moved: false, dragCard: dragCard ? hit.card : null };
    });
    el.addEventListener('pointermove', (e) => {
      if (!down) {
        this.hoverAt(e);
        return;
      }
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > 4) down.moved = true;
      if (!down.moved) return;
      if (down.dragCard) {
        const p = this.groundPoint(e);
        if (p) this.dragPreview(down.dragCard, p);
        return;
      }
      this.flight = null;
      if (down.button === 2 || down.shift) {
        // Pan along the ground.
        const k = Math.max(0.05, this.camera.position.y / 600);
        const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        this.camera.position.addScaledVector(right, -(e.movementX) * k * 2).addScaledVector(fwd, e.movementY * k * 2);
      } else {
        this.yaw -= e.movementX * 0.004;
        this.pitch = Math.max(-1.5, Math.min(1.2, this.pitch - e.movementY * 0.004));
      }
    });
    el.addEventListener('pointerleave', () => {
      if (down) return;
      this.setHover(null);
      this.emit('hover', null);
    });
    el.addEventListener('pointerup', (e) => {
      const d = down;
      down = null;
      if (!d) return;
      if (d.dragCard && d.moved) {
        const p = this.groundPoint(e);
        this.endDrag(d.dragCard, p);
        return;
      }
      if (!d.moved) this.emit('click', this.pick(e), e);
    });
    el.addEventListener('dblclick', (e) => {
      const hit = this.pick(e);
      if (hit?.card) this.flyToNode(hit.card.key, hit.card.id);
      else if (hit?.plate) this.flyToComponent(hit.plate);
    });
    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.flight = null;
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        const speed = Math.max(2, this.camera.position.y * 0.12);
        this.camera.position.addScaledVector(dir, -Math.sign(e.deltaY) * speed);
      },
      { passive: false }
    );
    const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    window.addEventListener('keydown', (e) => {
      if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (FLY_KEYS.has(e.code)) {
        e.preventDefault(); // the arrows and Space would scroll the page
        this.keys.add(e.code);
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Hovering: a wire lights up with its balls; a card lights up all of its wires. */
  hoverAt(e) {
    const hit = this.pick(e, { wires: true });
    this.canvas.style.cursor = hit?.card || hit?.wire ? 'pointer' : 'grab';
    if (hit?.wire) {
      this.setHover({ key: hit.wire.key, wires: [hit.wire.entry] });
    } else if (hit?.card) {
      const plate = this.plates.get(hit.card.key);
      this.setHover({ key: hit.card.key, wires: plate.curves.filter((c) => c.wire.fromId === hit.card.id || c.wire.toId === hit.card.id) });
    } else {
      this.setHover(null);
    }
    this.emit('hover', hit);
  }

  pointerNdc(e) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  /**
   * What is under the pointer: a card ({ key, id }), a wire ({ key, wire, entry }) when asked, or a
   * plate (its key), with the point. A card wins over a wire that passes just above it.
   */
  pick(e, { wires = false } = {}) {
    this.raycaster.setFromCamera(this.pointerNdc(e), this.camera);
    // A wire is a 1-pixel line: catch it within a few pixels' worth of world at this height.
    this.raycaster.params.Line.threshold = Math.max(0.25, this.camera.position.y * 0.008);
    const objs = [];
    for (const p of this.plates.values()) {
      objs.push(p.base, p.label);
      for (const c of p.cards.values()) objs.push(c);
      if (wires && p.wires) objs.push(p.wires);
      // Clicking a ship's hull picks its component, like clicking its deck.
      for (const m of p.shipGroup?.children ?? []) if (m.isMesh) objs.push(m);
    }
    const hits = this.raycaster.intersectObjects(objs, false);
    const card = hits.find((h) => h.object.userData.id);
    const wire = hits.find((h) => h.object.userData.wiresOf);
    if (wire && (!card || wire.distance < card.distance - 1.5)) {
      const key = wire.object.userData.wiresOf;
      const entry = this.plates.get(key).curves[Math.floor(wire.index / (2 * SEGS))];
      if (entry) return { wire: { key, wire: entry.wire, entry }, plate: key, point: wire.point };
    }
    if (card) {
      const u = card.object.userData;
      return { card: { key: u.key, id: u.id }, plate: u.key, point: card.point };
    }
    const plate = hits.find((h) => h.object.userData.plate);
    return plate ? { plate: plate.object.userData.plate, point: plate.point } : null;
  }

  groundPoint(e) {
    this.raycaster.setFromCamera(this.pointerNdc(e), this.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -CARD_H / 2), p) ? p : null;
  }

  /** A world point on a plate, as the x, y the files would hold for a card of this depth centred there. */
  fileXY(key, point, depth = CARD_D) {
    const plate = this.plates.get(key);
    return {
      x: Math.round((point.x - plate.origin.x - PAD - CARD_W / 2) * S + plate.minX),
      y: Math.round((point.z - plate.origin.z - PAD - 4 - depth / 2) * S + plate.minY)
    };
  }

  /** A spot on the plate a new node can go: the point the camera looks at, if it is on this plate; else the plate's free corner. */
  dropPoint(key) {
    const plate = this.plates.get(key);
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const ray = new THREE.Ray(this.camera.position.clone(), dir);
    const p = new THREE.Vector3();
    const b = new THREE.Box3().setFromObject(plate.base);
    let xy;
    if (ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), p) && p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z) {
      xy = this.fileXY(key, p);
    } else {
      let maxY = plate.minY;
      for (const i of plate.info.values()) maxY = Math.max(maxY, (i.center.z + i.depth / 2 - plate.origin.z - PAD - 4) * S + plate.minY);
      xy = { x: Math.round(plate.minX), y: Math.round(maxY + 60) };
    }
    // Not on top of another card: step down until the spot is free.
    const at = layoutPositions(this.model.nodes(key));
    const rows = this.rowsOf(key);
    const taken = this.model.nodes(key).map((n) => ({ ...at.get(n.id), h: MapView.cardDepthPx(rows.get(n.id)) }));
    const w = look.card.size.width + 10;
    const h = look.card.size.height;
    while (taken.some((t) => Math.abs(t.x - xy.x) < w && xy.y < t.y + t.h + 14 && xy.y + h + 14 > t.y)) xy.y += 20;
    return xy;
  }

  /** Where a card is on the page, in CSS pixels (for tests that click it like a person). */
  screenOf(key, id) {
    const p = this.plates.get(key)?.pos.get(id);
    if (!p) return null;
    return this.screenOfPoint(p.clone().setY(CARD_H));
  }

  /** Where a world point is on the page, in CSS pixels. */
  screenOfPoint(point) {
    const v = point.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: Math.round(r.left + ((v.x + 1) / 2) * r.width), y: Math.round(r.top + ((1 - v.y) / 2) * r.height), onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 };
  }

  dragPreview(card, p) {
    const mesh = this.plates.get(card.key)?.cards.get(card.id);
    if (mesh) {
      mesh.position.set(p.x, CARD_H / 2 + 0.6, p.z);
      this.clearOverlay();
      this.setHover(null);
    }
  }

  endDrag(card, p) {
    if (!p) return this.redraw(card.key);
    this.emit('move', card, this.fileXY(card.key, p, this.plates.get(card.key)?.info.get(card.id)?.depth));
  }

  frame(t) {
    const dt = this.lastT ? Math.min(0.1, (t - this.lastT) / 1000) : 0;
    this.lastT = t;
    if (this.flight) {
      const f = this.flight;
      if (f.t0 === null) f.t0 = t;
      const k = Math.min(1, Math.max(0, (t - f.t0) / f.ms));
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.camera.position.lerpVectors(f.from, f.to, e);
      this.yaw = f.yaw0 + (f.yaw1 - f.yaw0) * e;
      this.pitch = f.pitch0 + (f.pitch1 - f.pitch0) * e;
      if (k >= 1) this.flight = null;
    }
    // Flying: W/S fly forward and back level with the ground, the way you are facing (looking down
    // doesn't turn it into a dive); A/D sideways; E/Q (or Space/C) up and down; Shift faster.
    // The wheel is the zoom: it moves along the line of sight.
    const ahead = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const speed = Math.max(20, Math.abs(this.camera.position.y) * 1.2) * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 3 : 1) * dt;
    const k = this.keys;
    const move = new THREE.Vector3();
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(ahead);
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(ahead);
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right);
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right);
    if (k.has('KeyE') || k.has('Space')) move.y += 1;
    if (k.has('KeyQ') || k.has('KeyC')) move.y -= 1;
    if (move.lengthSq() > 0) {
      this.flight = null;
      this.camera.position.addScaledVector(move.normalize(), speed);
    }
    const lookAt = this.camera.position.clone().add(new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)));
    this.camera.lookAt(lookAt);
    for (const o of this.overlay.children) if (o.userData.bob) o.position.y = 4 + Math.sin(t / 250) * 0.6;
    // District names are for the view from above: they fade out as the camera comes down to a plate.
    for (const o of this.world.children) {
      if (!o.userData.district) continue;
      const d = o.position.distanceTo(this.camera.position);
      o.material.opacity = Math.max(0, Math.min(1, (d - 500) / 400));
      o.visible = o.material.opacity > 0.02;
    }
    // Hovered wires fire a ball from output to input every BALL_EVERY_MS.
    if (this.hover && t - this.hover.lastBall > BALL_EVERY_MS) {
      this.hover.lastBall = t;
      for (const e of this.hover.wires.slice(0, 40)) this.fireBall(e);
    }
    // Balls run their wire at BALL_SPEED, easing in and out of the ports.
    this.balls = this.balls.filter((b) => {
      if (b.t0 === null) b.t0 = t;
      const k2 = (t - b.t0) / b.ms;
      if (k2 >= 1) {
        this.scene.remove(b.ball);
        b.ball.material.dispose();
        return false;
      }
      b.ball.position.copy(b.curve.getPoint(k2));
      b.ball.material.opacity = Math.min(1, k2 * 6, (1 - k2) * 6);
      return true;
    });
    if (t - this.lastLod > 500) {
      this.lastLod = t;
      this.updateLod(false);
    }
    // Space streams past, the battle goes on, and the engines flicker.
    this.space.frame(this.camera, dt);
    this.battle.frame(dt, this.camera);
    for (const p of this.plates.values()) {
      for (const g of p.engineGlows ?? []) {
        const f = 0.88 + 0.08 * Math.sin(t / 70 + g.userData.phase) + Math.random() * 0.06;
        g.scale.setScalar(g.userData.base * f);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}

const FLY_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'KeyC', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);

const plateWireId = (w) => `${w.fromId}.${w.fromProperty}>${w.toId}.${w.toProperty}`;

/**
 * Where each node sits, in file pixels. A node with x and y sits there. A visual child without
 * them is laid out from the tree under its parent, and written nowhere: a child has no position.
 */
export function layoutPositions(nodes) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const at = new Map();
  const place = (n, depth = 0) => {
    if (at.has(n.id)) return at.get(n.id);
    if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
      at.set(n.id, { x: n.x, y: n.y });
    } else if (n.parent !== undefined && byId.has(n.parent) && depth < 50) {
      const parent = byId.get(n.parent);
      const p = place(parent, depth + 1);
      const i = (parent.children ?? []).indexOf(n.id);
      at.set(n.id, { x: p.x + 60, y: p.y + 60 * (i + 1) });
    }
    return at.get(n.id);
  };
  for (const n of nodes) place(n);
  let maxY = 0;
  for (const p of at.values()) maxY = Math.max(maxY, p.y);
  let k = 0;
  for (const n of nodes) {
    if (!at.has(n.id)) at.set(n.id, { x: 0, y: maxY + 120 + 60 * k++ });
  }
  return at;
}

/** A card's box with its faces in two groups: the top (0) and the five other faces (1). */
function cardGeometry(depth) {
  const g = new THREE.BoxGeometry(CARD_W, CARD_H, depth);
  const idx = Array.from(g.index.array); // six faces of six indices: +x, -x, +y, -y, +z, -z
  g.setIndex([...idx.slice(12, 18), ...idx.slice(0, 12), ...idx.slice(18)]);
  g.clearGroups();
  g.addGroup(0, 6, 0);
  g.addGroup(6, 30, 1);
  return g;
}

const plainMaterials = new Map();
function plainCardMaterial(category, scheme) {
  if (!plainMaterials.has(category)) plainMaterials.set(category, new THREE.MeshLambertMaterial({ color: new THREE.Color(scheme.base) }));
  return plainMaterials.get(category);
}

/** The card's face: the header as on the canvas, then a row per wired port with its name at its dot's side. */
function cardTexture(node, scheme, accent, rows, kindOf) {
  const w = 512;
  const k = w / look.card.size.width; // texture pixels per file pixel
  const nRows = rows.ins.length + rows.outs.length;
  const h = Math.round((look.card.size.height + nRows * ROW_PX) * k);
  const headH = look.card.size.height * k;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = scheme.base;
  g.fillRect(0, 0, w, h);
  g.fillStyle = scheme.header;
  g.fillRect(0, 0, w, headH);
  g.fillStyle = accent;
  g.fillRect(0, 0, 14, headH);
  g.fillStyle = scheme.text;
  // The kit's card fonts, scaled from the card's 150 px to this 512 px texture.
  const scaled = (f) => f.replace(/([\d.]+)px/, (_, px) => `${Math.round(Number(px) * k)}px`);
  g.font = scaled(look.fonts.nodeLabel);
  g.textBaseline = 'middle';
  const title = node.label || shortType(node.type);
  g.fillText(fit(g, title, w - 40), 30, headH * 0.36);
  g.globalAlpha = 0.7;
  g.font = scaled(look.fonts.nodeSubLabel);
  g.fillText(fit(g, node.label ? shortType(node.type) : node.id, w - 40), 30, headH * 0.76);
  g.globalAlpha = 1;
  g.font = scaled(look.fonts.portLabel);
  const rowY = (i) => headH + (i + 0.5) * ROW_PX * k;
  rows.ins.forEach((name, i) => {
    g.fillStyle = wireColors(kindOf(name, 'input'), THEME).normal;
    g.textAlign = 'left';
    g.fillText(fit(g, name, w - 60), 26, rowY(i));
  });
  rows.outs.forEach((name, j) => {
    g.fillStyle = wireColors(kindOf(name, 'output'), THEME).normal;
    g.textAlign = 'right';
    g.fillText(fit(g, name, w - 60), w - 26, rowY(rows.ins.length + j));
  });
  if (nRows) {
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(0, headH, w, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function shortType(type) {
  if (!type) return '?';
  if (type.startsWith('/')) return type.split('/').pop();
  return type.replace(/^net\.noodl\.(controls\.|visual\.|user\.)?/, '');
}

function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

/** A soft glowing ball: a white core fading into the wire's colour, drawn additively so it lights what it passes. */
let glowTexture = null;
function glowSprite(color, size) {
  if (!glowTexture) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.18, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    glowTexture = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture, color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
  );
  s.scale.set(size, size, 1);
  s.userData.shared = true;
  return s;
}

function textSprite(text, { size = 48, color = '#fff', bg = null, weight = 600 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `${weight} ${size}px system-ui, sans-serif`;
  const tw = Math.ceil(g.measureText(text).width) + size;
  c.width = tw;
  c.height = Math.ceil(size * 1.6);
  const g2 = c.getContext('2d');
  if (bg) {
    g2.fillStyle = bg;
    g2.beginPath();
    g2.roundRect(0, 0, c.width, c.height, size * 0.3);
    g2.fill();
  }
  g2.font = `${weight} ${size}px system-ui, sans-serif`;
  g2.fillStyle = color;
  g2.textBaseline = 'middle';
  g2.fillText(text, size / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  const k = 0.12;
  sprite.scale.set(c.width * k, c.height * k, 1);
  return sprite;
}

function disposeMesh(o) {
  o.geometry?.dispose();
  if (o.userData.sharedMaterial) return; // the ships' hull and glow materials serve every ship
  const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
  for (const m of mats) {
    // The glow texture is shared by every ball and port glow: keep it.
    if (m.map && m.map !== glowTexture) m.map.dispose();
    m.dispose();
  }
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o !== g) disposeMesh(o);
  });
}
