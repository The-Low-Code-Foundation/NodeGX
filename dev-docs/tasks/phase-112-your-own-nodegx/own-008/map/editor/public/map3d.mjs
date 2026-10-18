// The 3D map: every component a plate in its folder's district, every node a card on its plate at
// the x, y the files give it, every wire an arc from an output to an input. Drawn with three.js in
// the NodeGX canvas look (@nodegx/canvas-look): category colours, wire colours, card proportions.
// The map only draws and picks; every change goes through the model.

import * as THREE from 'three';
import { look, nodeScheme, categoryColors, wireColors } from '/kit/canvas-look/index.mjs';

const S = 10; // file pixels per world unit
const CARD_W = look.card.size.width / S;
const CARD_D = look.card.size.height / S;
const CARD_H = 1.2;
const PAD = 6;
const THEME = 'dark';
const C = look.colors[THEME];
const DETAIL_RANGE = 260; // within this distance of the camera a plate's cards get their labels

export class MapView {
  constructor(canvas, model, { categoryOf, portTypeOf }) {
    this.canvas = canvas;
    this.model = model;
    this.categoryOf = categoryOf; // (key, node) → canvas-look category
    this.portTypeOf = portTypeOf; // (key, nodeId, port, 'output'|'input') → 'signal' | other
    this.plates = new Map(); // key → { group, origin, minX, minY, w, d, cards: Map(id → mesh), pos: Map(id → Vector3), wires, detailed }
    this.selection = null; // { key, id }
    this.focusKey = null;
    this.handlers = {};
    this.pulses = [];

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(C.ground);
    this.scene.fog = new THREE.Fog(C.ground, 900, 2600);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.5, 6000);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(300, 800, 200);
    this.scene.add(sun);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.overlay = new THREE.Group(); // selection wires, links, pulses
    this.scene.add(this.overlay);

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

  /** Lays every component out in districts by folder, and draws them all. */
  build() {
    for (const p of this.plates.values()) disposeGroup(p.group);
    this.world.clear();
    this.plates.clear();
    this.clearOverlay();
    const groups = new Map();
    for (const key of this.model.keys()) {
      const folder = key.includes('/') ? key.split('/')[0] : '(top level)';
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(key);
    }
    const districts = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    let gx = 0;
    let gz = 0;
    let rowDepth = 0;
    const MAX_W = 1300;
    for (const [folder, keys] of districts) {
      // Shelf-pack the folder's plates.
      const measured = keys.map((k) => ({ key: k, ...this.measure(k) }));
      const shelfW = Math.max(220, Math.min(560, Math.sqrt(measured.reduce((s, m) => s + m.w * m.d, 0)) * 1.3));
      let x = 0;
      let z = 0;
      let shelfD = 0;
      let width = 0;
      const placed = [];
      for (const m of measured) {
        if (x > 0 && x + m.w > shelfW) {
          x = 0;
          z += shelfD + 14;
          shelfD = 0;
        }
        placed.push({ ...m, ox: x, oz: z });
        x += m.w + 14;
        width = Math.max(width, x);
        shelfD = Math.max(shelfD, m.d);
      }
      const depth = z + shelfD;
      if (gx > 0 && gx + width > MAX_W) {
        gx = 0;
        gz += rowDepth + 90;
        rowDepth = 0;
      }
      for (const p of placed) this.buildPlate(p.key, { x: gx + p.ox, z: gz + p.oz }, p);
      const label = textSprite(folder.toUpperCase(), { size: 64, color: C.cardText, bg: null, weight: 800 });
      label.position.set(gx + width / 2, 40, gz - 30);
      label.scale.multiplyScalar(3.5);
      label.userData.district = folder;
      this.world.add(label);
      gx += width + 90;
      rowDepth = Math.max(rowDepth, depth);
    }
    this.bounds = new THREE.Box3();
    for (const p of this.plates.values()) this.bounds.expandByObject(p.base);
    // The canvas's dot grid, as a ground grid under the districts.
    const size = this.bounds.getSize(new THREE.Vector3());
    const span = Math.ceil((Math.max(size.x, size.z) + 400) / 40) * 40;
    const grid = new THREE.GridHelper(span, span / 40, C.gridDotBase, C.gridDotBase);
    grid.material.transparent = true;
    grid.material.opacity = 0.07;
    grid.position.set(this.bounds.getCenter(new THREE.Vector3()).x, -1, this.bounds.getCenter(new THREE.Vector3()).z);
    this.world.add(grid);
    this.updateLod(true);
  }

  /** Where each node of a component sits in file pixels, and the plate size that holds them. */
  measure(key) {
    const nodes = this.model.nodes(key);
    const at = layoutPositions(nodes);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of at.values()) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    if (!Number.isFinite(minX)) minX = minY = maxX = maxY = 0;
    return { minX, minY, w: (maxX - minX) / S + CARD_W + PAD * 2, d: (maxY - minY) / S + CARD_D + PAD * 2 + 4 };
  }

  buildPlate(key, origin, m) {
    const plate = { key, origin, minX: m.minX, minY: m.minY, w: m.w, d: m.d, group: new THREE.Group(), cards: new Map(), pos: new Map(), detailed: false };
    this.plates.set(key, plate);
    this.world.add(plate.group);
    this.drawPlate(plate);
  }

  /** (Re)draws one plate's contents at its fixed origin: after a change only this one is redrawn. */
  drawPlate(plate) {
    disposeGroup(plate.group);
    plate.group.clear();
    plate.cards.clear();
    plate.pos.clear();
    const key = plate.key;
    const nodes = this.model.nodes(key);
    const at = layoutPositions(nodes);
    // Grow the plate when a node now sits beyond it.
    let maxX = plate.minX, maxY = plate.minY, minX = plate.minX, minY = plate.minY;
    for (const p of at.values()) {
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
    }
    const left = (minX - plate.minX) / S;
    const top = (minY - plate.minY) / S;
    const w = Math.max(plate.w, (maxX - plate.minX) / S + CARD_W + PAD * 2) - left;
    const d = Math.max(plate.d, (maxY - plate.minY) / S + CARD_D + PAD * 2 + 4) - top;
    const isCloud = key.includes('#__cloud__');
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.8, d),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(isCloud ? '#2a3a5c' : C.cardBgHover) })
    );
    base.position.set(plate.origin.x + left + w / 2, -0.4, plate.origin.z + top + d / 2);
    base.userData = { plate: key };
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

    for (const n of nodes) {
      const p = at.get(n.id);
      const world = new THREE.Vector3(
        plate.origin.x + PAD + (p.x - plate.minX) / S + CARD_W / 2,
        CARD_H / 2,
        plate.origin.z + PAD + 4 + (p.y - plate.minY) / S + CARD_D / 2
      );
      plate.pos.set(n.id, world);
      const card = this.makeCard(key, n, plate.detailed);
      card.position.copy(world);
      plate.cards.set(n.id, card);
      plate.group.add(card);
    }
    // Hierarchy: a thin line from a visual parent to each child, on the plate.
    const hier = [];
    for (const n of nodes) {
      for (const c of n.children ?? []) {
        const a = plate.pos.get(n.id);
        const b = plate.pos.get(c);
        if (a && b) hier.push(a.x - CARD_W / 2 + 1, 0.05, a.z + CARD_D / 2, a.x - CARD_W / 2 + 1, 0.05, b.z, a.x - CARD_W / 2 + 1, 0.05, b.z, b.x - CARD_W / 2, 0.05, b.z);
      }
    }
    if (hier.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(hier, 3));
      plate.group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C.hierarchyLine, transparent: true, opacity: 0.7 })));
    }
    // Wires: arcs from an output (the card's east edge) to an input (the west edge), coloured by kind.
    const pos = [];
    const col = [];
    const sig = new THREE.Color(wireColors('signal', THEME).normal);
    const dat = new THREE.Color(wireColors('data', THEME).normal);
    plate.curves = [];
    for (const w of this.model.wires(key)) {
      const curve = this.wireCurve(plate, w);
      if (!curve) continue;
      plate.curves.push({ wire: w, curve });
      const pts = curve.getPoints(18);
      const c = this.portTypeOf(key, w.fromId, w.fromProperty, 'output') === 'signal' ? sig : dat;
      for (let i = 0; i < pts.length - 1; i++) {
        pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    }
    if (pos.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      plate.wires = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }));
      plate.group.add(plate.wires);
    }
  }

  wireCurve(plate, w) {
    const a = plate.pos.get(w.fromId);
    const b = plate.pos.get(w.toId);
    if (!a || !b) return null;
    const start = new THREE.Vector3(a.x + CARD_W / 2, CARD_H, a.z);
    const end = new THREE.Vector3(b.x - CARD_W / 2, CARD_H, b.z);
    const dist = start.distanceTo(end);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 2 + Math.min(dist * 0.25, 30);
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }

  makeCard(key, node, detailed) {
    const category = this.categoryOf(key, node);
    const scheme = nodeScheme(category, THEME);
    const accent = categoryColors(category, THEME).accent;
    const side = new THREE.MeshLambertMaterial({ color: new THREE.Color(scheme.header) });
    let top;
    if (detailed) {
      top = new THREE.MeshBasicMaterial({ map: cardTexture(node, scheme, accent) });
    } else {
      top = new THREE.MeshLambertMaterial({ color: new THREE.Color(scheme.base) });
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(CARD_W, CARD_H, CARD_D), [side, side, top, side, side, side]);
    mesh.userData = { key, id: node.id, category, accent, scheme };
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
          const fresh = this.makeCard(plate.key, node, want);
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
    if (!card) return;
    const box = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(CARD_W + 0.6, CARD_H + 0.6, CARD_D + 0.6)),
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
    for (const { wire, curve } of plate.curves) {
      if (wire.fromId !== sel.id && wire.toId !== sel.id) continue;
      const kind = this.portTypeOf(sel.key, wire.fromId, wire.fromProperty, 'output') === 'signal' ? 'signal' : 'data';
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.18, 6), new THREE.MeshBasicMaterial({ color: wireColors(kind, THEME).highlighted }));
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

  /** A bright bead along a wire: the running app sent a value or a signal through it. */
  pulse(key, from, to) {
    const plate = this.plates.get(key);
    if (!plate) return;
    for (const { wire, curve } of plate.curves) {
      if (wire.fromId !== from.node || wire.fromProperty !== from.port || wire.toId !== to.node || wire.toProperty !== to.port) continue;
      if (this.pulses.length > 120) return;
      const kind = this.portTypeOf(key, wire.fromId, wire.fromProperty, 'output') === 'signal' ? 'signal' : 'data';
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshBasicMaterial({ color: wireColors(kind, THEME).pulsing }));
      this.scene.add(bead);
      this.pulses.push({ bead, curve, t0: null });
    }
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
    let down = null;
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      const hit = this.pick(e);
      const dragCard = hit?.card && this.selection && hit.card.key === this.selection.key && hit.card.id === this.selection.id && e.button === 0 && !e.shiftKey;
      down = { x: e.clientX, y: e.clientY, button: e.button, shift: e.shiftKey, moved: false, dragCard: dragCard ? hit.card : null };
    });
    el.addEventListener('pointermove', (e) => {
      if (!down) {
        const hit = this.pick(e);
        el.style.cursor = hit?.card ? 'pointer' : 'grab';
        this.emit('hover', hit);
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
      if (typing() || e.metaKey || e.ctrlKey) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  pointerNdc(e) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  /** What is under the pointer: a card ({ key, id }) or a plate (its key), and the ground point. */
  pick(e) {
    this.raycaster.setFromCamera(this.pointerNdc(e), this.camera);
    const objs = [];
    for (const p of this.plates.values()) {
      objs.push(p.base, p.label);
      for (const c of p.cards.values()) objs.push(c);
    }
    const hits = this.raycaster.intersectObjects(objs, false);
    for (const h of hits) {
      const u = h.object.userData;
      if (u.id) return { card: { key: u.key, id: u.id }, plate: u.key, point: h.point };
      if (u.plate) return { plate: u.plate, point: h.point };
    }
    return null;
  }

  groundPoint(e) {
    this.raycaster.setFromCamera(this.pointerNdc(e), this.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -CARD_H / 2), p) ? p : null;
  }

  /** A world point on a plate, as the x, y the files would hold for a node centred there. */
  fileXY(key, point) {
    const plate = this.plates.get(key);
    return {
      x: Math.round((point.x - plate.origin.x - PAD - CARD_W / 2) * S + plate.minX),
      y: Math.round((point.z - plate.origin.z - PAD - 4 - CARD_D / 2) * S + plate.minY)
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
      for (const v of plate.pos.values()) maxY = Math.max(maxY, (v.z - plate.origin.z - PAD - 4 - CARD_D / 2) * S + plate.minY);
      xy = { x: Math.round(plate.minX), y: Math.round(maxY + 120) };
    }
    // Not on top of another card: step down until the spot is free.
    const taken = [...layoutPositions(this.model.nodes(key)).values()];
    const w = look.card.size.width + 10;
    const h = look.card.size.height + 14;
    while (taken.some((t) => Math.abs(t.x - xy.x) < w && Math.abs(t.y - xy.y) < h)) xy.y += h;
    return xy;
  }

  /** Where a card is on the page, in CSS pixels (for tests that click it like a person). */
  screenOf(key, id) {
    const p = this.plates.get(key)?.pos.get(id);
    if (!p) return null;
    const v = p.clone().setY(CARD_H).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: Math.round(r.left + ((v.x + 1) / 2) * r.width), y: Math.round(r.top + ((1 - v.y) / 2) * r.height), onScreen: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 };
  }

  dragPreview(card, p) {
    const mesh = this.plates.get(card.key)?.cards.get(card.id);
    if (mesh) {
      mesh.position.set(p.x, CARD_H / 2 + 0.6, p.z);
      this.clearOverlay();
    }
  }

  endDrag(card, p) {
    if (!p) return this.redraw(card.key);
    this.emit('move', card, this.fileXY(card.key, p));
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
    // Flying: WASD / arrows, Q and E (or Space and C) for down and up, Shift for faster.
    const fwd = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const speed = Math.max(20, Math.abs(this.camera.position.y) * 1.2) * (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 3 : 1) * dt;
    const k = this.keys;
    const move = new THREE.Vector3();
    if (k.has('KeyW') || k.has('ArrowUp')) move.add(fwd);
    if (k.has('KeyS') || k.has('ArrowDown')) move.sub(fwd);
    if (k.has('KeyD') || k.has('ArrowRight')) move.add(right);
    if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right);
    if (k.has('KeyE') || k.has('Space')) move.y += 1;
    if (k.has('KeyQ') || k.has('KeyC')) move.y -= 1;
    if (move.lengthSq() > 0) {
      this.flight = null;
      this.camera.position.addScaledVector(move.normalize(), speed);
    }
    if (this.camera.position.y < 2) this.camera.position.y = 2;
    const look = this.camera.position.clone().add(new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)));
    this.camera.lookAt(look);
    for (const o of this.overlay.children) if (o.userData.bob) o.position.y = 4 + Math.sin(t / 250) * 0.6;
    // District names are for the view from above: they fade out as the camera comes down to a plate.
    for (const o of this.world.children) {
      if (!o.userData.district) continue;
      const d = o.position.distanceTo(this.camera.position);
      o.material.opacity = Math.max(0, Math.min(1, (d - 500) / 400));
      o.visible = o.material.opacity > 0.02;
    }
    // Pulses travel their wire in 600 ms.
    this.pulses = this.pulses.filter((p) => {
      if (p.t0 === null) p.t0 = t;
      const k2 = (t - p.t0) / 600;
      if (k2 >= 1) {
        this.scene.remove(p.bead);
        disposeMesh(p.bead);
        return false;
      }
      p.bead.position.copy(p.curve.getPoint(k2));
      return true;
    });
    if (t - this.lastLod > 500) {
      this.lastLod = t;
      this.updateLod(false);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

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

function cardTexture(node, scheme, accent) {
  const w = 512;
  const h = Math.round((512 * look.card.size.height) / look.card.size.width);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = scheme.base;
  g.fillRect(0, 0, w, h);
  g.fillStyle = accent;
  g.fillRect(0, 0, 14, h);
  g.fillStyle = scheme.text;
  // The kit's card fonts, scaled from the card's 150 px to this 512 px texture.
  const scaled = (f) => f.replace(/([\d.]+)px/, (_, px) => `${Math.round(Number(px) * (w / look.card.size.width))}px`);
  g.font = scaled(look.fonts.nodeLabel);
  g.textBaseline = 'middle';
  const title = node.label || shortType(node.type);
  g.fillText(fit(g, title, w - 40), 30, h * 0.36);
  g.globalAlpha = 0.7;
  g.font = scaled(look.fonts.nodeSubLabel);
  g.fillText(fit(g, node.label ? shortType(node.type) : node.id, w - 40), 30, h * 0.76);
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
  const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
  for (const m of mats) {
    m.map?.dispose();
    m.dispose();
  }
}

function disposeGroup(g) {
  g.traverse((o) => {
    if (o !== g) disposeMesh(o);
  });
}
