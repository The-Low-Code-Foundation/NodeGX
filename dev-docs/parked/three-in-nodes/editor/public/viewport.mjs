// The viewport: the real app, running in @nodegx/preview's frame, with an editing layer over it.
//
// In Edit, the layer takes the pointer: a click picks the object under it (three-kit's own pick), a drag on an object
// moves it along the floor (Shift: up and down), a drag on empty space orbits and the wheel zooms (three-kit's own
// orbit and zoom). The scene being edited is lifted to fill the frame. In Play, the layer lets go and the app is as
// it is built: its taps, its pages, its layout.
//
// Nothing here writes the project: it reports picks and drags, and the page decides what they change.

const FOCUS_CSS =
  '[data-tk-focus]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;' +
  'max-width:none!important;max-height:none!important;margin:0!important;z-index:2147483000!important;border-radius:0!important}';

export class Viewport {
  constructor(host, { onPick, onDrag, onDragEnd, onHover, onStatus }) {
    this.host = host;
    this.onPick = onPick;
    this.onDrag = onDrag;
    this.onDragEnd = onDragEnd;
    this.onHover = onHover;
    this.onStatus = onStatus;
    this.preview = null;
    this.mode = 'edit';
    this.focus = true;
    this.snap = true;
    this.sceneId = null;
    this.selected = new Set(); // node ids whose objects are boxed
    this.selectedLight = null;
    this.helpers = [];
    this.helperSig = '';
    this.lights = []; // [{ node, x, y }] in layer pixels, for picking a light by its marker
    this.camera = null; // the orbit kept across rebuilds

    this.layer = document.createElement('div');
    this.layer.className = 'vp-layer';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'vp-marks';
    this.tip = document.createElement('div');
    this.tip.className = 'vp-tip';
    this.tip.hidden = true;
    host.append(this.canvas, this.layer, this.tip);
    this.bindPointer();
    const loop = () => {
      this.frameTick();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  async mount() {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/kit/preview/noodl-preview-in-page.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('The preview kit did not load.'));
      document.head.appendChild(s);
    });
    const box = document.createElement('div');
    box.className = 'vp-frame';
    this.host.prepend(box);
    this.preview = await window.NodegxPreview.mountPreview(box, { runtimeBase: '/runtime/' });
  }

  get frame() {
    return this.preview?.frame ?? null;
  }

  get win() {
    return this.frame?.contentWindow ?? null;
  }

  get runtime() {
    return this.win?.Noodl?.Navigation?._noodlRuntime ?? null;
  }

  get T() {
    return this.win?.THREE ?? null;
  }

  /** The Scene element for the scene being edited, and its engine. */
  sceneEl() {
    if (!this.preview || !this.sceneId) return null;
    const own = this.preview.elementsOf(this.sceneId).find((el) => el.matches?.('[data-three-scene]'));
    return own ?? this.frame?.contentDocument?.querySelector('[data-three-scene]') ?? null;
  }

  engine() {
    return this.sceneEl()?.__threeKit ?? null;
  }

  /** Renders this snapshot of the project; keeps the orbit, the focus and the selection box across the rebuild. */
  async show(tree) {
    const eng = this.engine();
    if (eng) this.camera = eng.census().camera;
    this.onStatus?.('busy');
    const r = await this.preview.update(tree);
    this.onStatus?.(r.status === 'ok' ? 'ok' : 'error', r);
    if (r.status !== 'ok') return r;
    this.helpers = [];
    this.helperIds = '';
    this.helperSig = '';
    await this.whenSceneReady(4000);
    this.restoreCamera();
    this.applyFocus();
    return r;
  }

  async whenSceneReady(ms) {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (this.engine()) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  restoreCamera() {
    const eng = this.engine();
    if (!eng || !this.camera) return;
    const now = eng.census().camera;
    if (now.distance > 0) eng.zoom(this.camera.distance / now.distance);
    eng.orbit(this.camera.angle - now.angle, this.camera.height - now.height);
  }

  /** The orbit the person has now, to keep as the scene's camera. */
  view() {
    return this.engine()?.census().camera ?? null;
  }

  setMode(mode) {
    this.mode = mode;
    this.host.dataset.mode = mode;
    this.applyFocus();
    this.helperIds = null;
  }

  setFocus(on) {
    this.focus = on;
    this.applyFocus();
  }

  applyFocus() {
    const doc = this.frame?.contentDocument;
    if (!doc) return;
    if (!doc.getElementById('tk-editor-focus')) {
      const st = doc.createElement('style');
      st.id = 'tk-editor-focus';
      st.textContent = FOCUS_CSS;
      doc.head.appendChild(st);
    }
    for (const el of doc.querySelectorAll('[data-tk-focus]')) el.removeAttribute('data-tk-focus');
    const el = this.sceneEl();
    if (el && this.focus && this.mode === 'edit') el.setAttribute('data-tk-focus', '');
  }

  /** A parameter changed: the running app takes it now, every instance of the component at once, no rebuild. */
  liveSet(legacyName, nodeId, name, value) {
    const gm = this.runtime?.context?.graphModel ?? this.runtime?.graphModel;
    const node = gm?.getComponentWithName(legacyName)?.getNodeWithId(nodeId);
    if (!node) return false;
    node.setParameter(name, value);
    return true;
  }

  /** Which objects wear the selection box: every object any of these nodes made (all rows of a For Each). */
  select(nodeIds, lightId) {
    this.selected = new Set(nodeIds);
    this.selectedLight = lightId ?? null;
    this.helperIds = null;
  }

  /** Where a node's object is on this page, in page pixels (the middle of its box): for tests and tooltips. */
  screenOf(nodeId) {
    const eng = this.engine();
    const T = this.T;
    if (!eng || !T) return null;
    let obj = null;
    eng.scene.traverse((o) => {
      if (!obj && o.userData?.nodeId === nodeId && !o.userData.editor) obj = o;
    });
    if (!obj) return null;
    eng.scene.updateMatrixWorld();
    const c = (obj.isLight ? obj.getWorldPosition(new T.Vector3()) : new T.Box3().setFromObject(obj).getCenter(new T.Vector3())).project(eng.camera);
    const fr = this.frame.getBoundingClientRect();
    const cr = eng.renderer.domElement.getBoundingClientRect();
    return { x: Math.round(fr.left + cr.left + ((c.x + 1) / 2) * cr.width), y: Math.round(fr.top + cr.top + ((1 - c.y) / 2) * cr.height) };
  }

  // ── the frame loop: the selection box and the light markers ─────────────────────────────────────────────────

  frameTick() {
    const eng = this.engine();
    const T = this.T;
    const ctx = this.canvas.getContext('2d');
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.lights = [];
    if (!eng || !T) return;
    const editing = this.mode === 'edit';

    // The box: rebuilt when the selection or the objects' places change; drawn by the scene's own renderer.
    const objs = [];
    eng.scene.traverse((o) => {
      if (o.userData && o.userData.nodeId && this.selected.has(o.userData.nodeId) && !o.isLight) objs.push(o);
    });
    const ids = editing ? objs.map((o) => o.uuid).join('|') : '';
    const sig = editing ? objs.map((o) => o.matrixWorld.elements.map((v) => v.toFixed(3)).join(',')).join('|') : '';
    if (ids !== this.helperIds) {
      for (const hp of this.helpers) {
        eng.scene.remove(hp);
        hp.geometry?.dispose?.();
      }
      this.helpers = [];
      for (const o of editing ? objs : []) {
        const hp = new T.BoxHelper(o, 0xffb547);
        hp.userData.editor = true;
        hp.material.depthTest = false;
        hp.renderOrder = 999;
        eng.scene.add(hp);
        this.helpers.push(hp);
      }
      this.helperIds = ids;
      this.helperSig = '';
    }
    if (sig !== this.helperSig) {
      for (const hp of this.helpers) hp.update();
      this.helperSig = sig;
      eng.renderer.render(eng.scene, eng.camera);
    }

    if (!editing) return;
    // The lights have no body to click: a marker where each one is, drawn on the layer.
    const fr = this.frame.getBoundingClientRect();
    const hr = this.host.getBoundingClientRect();
    const cr = eng.renderer.domElement.getBoundingClientRect();
    for (const o of eng.census().objects) {
      if (o.kind !== 'light' || o.shape === 'sky' || !o.node) continue;
      const v = new T.Vector3(o.wx, o.wy, o.wz).project(eng.camera);
      if (v.z > 1) continue;
      const x = fr.left - hr.left + cr.left + ((v.x + 1) / 2) * cr.width;
      const y = fr.top - hr.top + cr.top + ((1 - v.y) / 2) * cr.height;
      this.lights.push({ node: o.node, x, y });
      drawLight(ctx, x, y, o.shape, o.node === this.selectedLight);
    }
  }

  // ── the pointer ─────────────────────────────────────────────────────────────────────────────────────────────

  /** Layer pixels → the frame's own client pixels, which three-kit's pick reads. */
  toFrame(e) {
    const fr = this.frame.getBoundingClientRect();
    return { x: e.clientX - fr.left, y: e.clientY - fr.top };
  }

  hitAt(e) {
    const hr = this.host.getBoundingClientRect();
    const lx = e.clientX - hr.left;
    const ly = e.clientY - hr.top;
    const light = this.lights.find((l) => Math.hypot(l.x - lx, l.y - ly) < 16);
    if (light) return { kind: 'light', node: light.node };
    const eng = this.engine();
    if (!eng) return null;
    const p = this.toFrame(e);
    const hit = eng.pick(p.x, p.y);
    if (!hit) return null;
    return { kind: 'mesh', node: hit.obj.userData.nodeId, lineage: eng.lineage(hit).map((o) => o.obj), obj: hit.obj };
  }

  bindPointer() {
    const L = this.layer;
    let drag = null;
    let hoverAt = 0;
    L.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'edit' || !this.engine()) return;
      L.setPointerCapture(e.pointerId);
      const hit = this.hitAt(e);
      drag = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, moved: false, hit, alt: e.altKey };
      if (hit) {
        // The page says which node a press on this object moves (the object, or the group it sits in).
        const target = this.onPick?.(hit, { alt: e.altKey, pressing: true });
        if (target) drag.move = this.beginMove(target, e);
      }
    });
    L.addEventListener('pointermove', (e) => {
      if (!drag) {
        if (this.mode !== 'edit') return;
        const now = performance.now();
        if (now - hoverAt < 60) return;
        hoverAt = now;
        const hit = this.hitAt(e);
        L.style.cursor = hit ? 'pointer' : 'grab';
        const label = hit ? this.onHover?.(hit) : null;
        if (label) {
          const hr = this.host.getBoundingClientRect();
          this.tip.textContent = label;
          this.tip.style.left = `${e.clientX - hr.left + 14}px`;
          this.tip.style.top = `${e.clientY - hr.top + 14}px`;
          this.tip.hidden = false;
        } else this.tip.hidden = true;
        return;
      }
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (Math.abs(e.clientX - drag.sx) > 4 || Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
      if (!drag.moved) return;
      this.tip.hidden = true;
      if (drag.move) {
        L.style.cursor = 'grabbing';
        this.continueMove(drag.move, e);
      } else {
        L.style.cursor = 'grabbing';
        this.engine()?.orbit(-dx * 0.4, dy * 0.03);
      }
    });
    const end = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      L.style.cursor = '';
      if (d.move && d.moved) this.onDragEnd?.(d.move.target);
      else if (!d.moved && !d.hit) this.onPick?.(null, {});
    };
    L.addEventListener('pointerup', end);
    L.addEventListener('pointercancel', end);
    L.addEventListener(
      'wheel',
      (e) => {
        if (this.mode !== 'edit') return;
        e.preventDefault();
        this.engine()?.zoom(e.deltaY > 0 ? 1.08 : 0.92);
      },
      { passive: false }
    );
  }

  /**
   * A move: `target` is { node, obj, start: {x, y, z} } — the node's parameters when the press began, and the
   * three.js object it made. The pointer's travel over a plane through the object is turned into the object's
   * parent's own space, so a mesh inside a turned or scaled 3D Group follows the pointer too.
   */
  beginMove(target, e) {
    const T = this.T;
    const eng = this.engine();
    const obj = target.obj;
    if (!T || !eng || !obj) return null;
    eng.scene.updateMatrixWorld();
    const origin = obj.getWorldPosition(new T.Vector3());
    const move = { target, origin, vertical: e.shiftKey, start: null };
    move.start = this.planePoint(move, e);
    return move.start ? move : null;
  }

  planePoint(move, e) {
    const T = this.T;
    const eng = this.engine();
    const p = this.toFrame(e);
    const r = eng.renderer.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((p.x - r.left) / r.width) * 2 - 1, -((p.y - r.top) / r.height) * 2 + 1);
    const ray = new T.Raycaster();
    ray.setFromCamera(ndc, eng.camera);
    let normal;
    if (move.vertical) {
      normal = eng.camera.getWorldDirection(new T.Vector3()).setY(0);
      if (normal.lengthSq() < 1e-6) normal.set(0, 0, 1);
      normal.normalize();
    } else normal = new T.Vector3(0, 1, 0);
    const plane = new T.Plane().setFromNormalAndCoplanarPoint(normal, move.origin);
    return ray.ray.intersectPlane(plane, new T.Vector3());
  }

  continueMove(move, e) {
    const at = this.planePoint(move, e);
    if (!at) return;
    const parent = move.target.obj.parent;
    const a = parent.worldToLocal(move.start.clone());
    const b = parent.worldToLocal(at.clone());
    const d = b.sub(a);
    const s = move.target.start;
    const snap = (v) => (this.snap && !e.altKey ? Math.round(v * 4) / 4 : Math.round(v * 100) / 100);
    const next = move.vertical ? { y: snap(s.y + d.y) } : { x: snap(s.x + d.x), z: snap(s.z + d.z) };
    this.onDrag?.(move.target, next);
  }
}

function drawLight(ctx, x, y, kind, selected) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2;
  ctx.strokeStyle = selected ? '#ffb547' : 'rgba(255,240,200,0.9)';
  ctx.fillStyle = selected ? 'rgba(255,181,71,0.35)' : 'rgba(20,24,31,0.65)';
  ctx.beginPath();
  ctx.arc(0, 0, kind === 'sun' ? 7 : 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  if (kind === 'sun') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-3, 9);
    ctx.lineTo(3, 9);
    ctx.stroke();
  }
  ctx.restore();
}
