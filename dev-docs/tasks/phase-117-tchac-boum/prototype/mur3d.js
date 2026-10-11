/**
 * P117 Tchac-Boum — the wall in three dimensions (Richard, 2026-10-11: "3D polygon stuff on a real wall with some basic
 * physics"). WebGL draws the room: a brick wall, a wooden floor, a low-poly costume on a plank for every part, a rail
 * between parts, marbles that roll along the rails and the shards of a popped balloon. The parts' own DOM elements (the
 * two faces, the text widgets, the button a gate clicks) are pinned onto their planks by three's CSS3D renderer, so a
 * part is still one element that turns over in place, and nothing the page writes or reads changes.
 *
 * Units: the files' editor pixels, 1:1 (world x = node x, world y = −node y, z towards the viewer). Nothing here knows
 * NodeGX: the page says where the parts are, which rails exist, when a marble leaves and what a costume should do.
 *
 * The physics is honest about what it is: a marble is a bead on its rail (gravity along the tangent, a little drag), shot
 * with just enough speed to reach the other end — because the signal did arrive, in the running app; the shards fly
 * ballistically and bounce on the floor; a button is a spring; the ramp's marble falls at constant acceleration over
 * the Timer's own duration.
 */
import * as T from './three.js';

const PI = Math.PI;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- materials: a small flat-shaded palette ---------------- */
const mat = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.04, flatShading: true, ...o });
const M = {
  wood: () => mat(0xc48a4a), wood2: mat(0x8a5a2b), woodDark: mat(0x5a3a1b),
  red: mat(0xff3b30, { roughness: 0.4 }), redDark: mat(0x8f1a12), grey: mat(0xa5a5b2, { metalness: 0.5, roughness: 0.45 }), greyDark: mat(0x4a4a55),
  steel: mat(0xb9bcc9, { metalness: 0.85, roughness: 0.3 }), brass: mat(0xd9b35a, { metalness: 0.7, roughness: 0.35 }),
  paper: mat(0xfff8ea), ink: mat(0x2b2140), green: mat(0x244a3a), screen: mat(0x0a1f1a, { emissive: 0x0a3a2a, emissiveIntensity: 0.5 }), bezel: mat(0x333340),
  cat: mat(0x8d6e63), catDark: mat(0x5d4037), pink: mat(0xffb3a7), white: mat(0xffffff), black: mat(0x1a1a1a),
  glass: new T.MeshStandardMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0, flatShading: true }),
  filament: mat(0xffd166, { emissive: 0xffb300, emissiveIntensity: 0 }),
  balloon: mat(0xff5a7a, { roughness: 0.35 }), shard: mat(0xff5a7a, { roughness: 0.5 }),
  marble: new T.MeshStandardMaterial({ color: 0xffd166, roughness: 0.25, metalness: 0.15 }),
  marbleBlue: new T.MeshStandardMaterial({ color: 0x35c3e8, roughness: 0.25, metalness: 0.15 }),
  data: new T.MeshStandardMaterial({ color: 0xc9a8ff, emissive: 0x8a5cff, emissiveIntensity: 0.9, roughness: 0.3 }),
  rail: mat(0xd9c7a3, { roughness: 0.5, metalness: 0.3 }), string: mat(0xa88bd1, { roughness: 0.8 }),
  mirror: new T.MeshStandardMaterial({ color: 0xdde6ff, metalness: 1, roughness: 0.08 }), lever: mat(0xff3b30)
};
const G = {
  box: (w, h, d) => new T.BoxGeometry(w, h, d),
  sphere: (r, w = 10, h = 7) => new T.SphereGeometry(r, w, h),
  cyl: (rt, rb, h, s = 12) => new T.CylinderGeometry(rt, rb, h, s),
  cone: (r, h, s = 8) => new T.ConeGeometry(r, h, s),
  tetra: (r) => new T.TetrahedronGeometry(r)
};
const mesh = (geo, material, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; };

/* ---------------- procedural textures: bricks, floorboards, the editor's dot grid ---------------- */
function canvasTexture(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// bricks about 70 editor pixels wide (a 512-unit tile, repeated 72 times over the 40000-unit wall), dusty and warm, the mortar pale
const bricks = () => canvasTexture(512, 256, (ctx, w, h) => {
  ctx.fillStyle = '#8c7b86'; ctx.fillRect(0, 0, w, h);                 // mortar
  const bw = 64, bh = 32, gap = 5; let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let row = 0; row * bh < h; row++) for (let col = -1; col * bw < w + bw; col++) {
    const x = col * bw + (row % 2 ? bw / 2 : 0), y = row * bh;
    const hue = 8 + rnd() * 16, sat = 30 + rnd() * 14, l = 34 + rnd() * 12;
    ctx.fillStyle = `hsl(${hue} ${sat}% ${l}%)`; ctx.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
    ctx.fillStyle = `hsl(${hue} ${sat}% ${l + 7}%)`; ctx.fillRect(x + gap / 2, y + gap / 2, bw - gap, 3);
    ctx.fillStyle = `hsl(${hue} ${sat}% ${l - 8}%)`; ctx.fillRect(x + gap / 2, y + bh - gap / 2 - 3, bw - gap, 3);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = `hsl(${hue} ${sat - 10}% ${l + (rnd() > 0.5 ? 5 : -5)}%)`; ctx.fillRect(x + gap + rnd() * (bw - 20), y + gap + rnd() * (bh - 12), 4 + rnd() * 10, 2 + rnd() * 4); }
  }
}, [72, 144]);
const boards = () => canvasTexture(512, 512, (ctx, w, h) => {
  let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 8; i++) { const l = 22 + rnd() * 10; ctx.fillStyle = `hsl(28 42% ${l}%)`; ctx.fillRect(i * 64, 0, 64, h); ctx.fillStyle = `hsl(28 42% ${l - 8}%)`; ctx.fillRect(i * 64, 0, 2, h); for (let k = 0; k < 6; k++) { ctx.fillStyle = `hsl(28 40% ${l + 4}%)`; ctx.fillRect(i * 64 + 6 + rnd() * 50, rnd() * h, 2, 40 + rnd() * 120); } }
}, [12, 12]);
const grid = (ground, dot) => canvasTexture(80, 80, (ctx, w, h) => { ctx.fillStyle = ground; ctx.fillRect(0, 0, w, h); ctx.fillStyle = dot; for (let x = 10; x < w; x += 20) for (let y = 10; y < h; y += 20) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, PI * 2); ctx.fill(); } }, [250, 250]);
const glowTexture = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d'); const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(255,230,140,1)'); g.addColorStop(0.4, 'rgba(255,200,80,.5)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); };

/* ---------------- the costumes: what each skin is made of, and what it does when a signal lands ---------------- */
// Each builder returns { g, on(kind, arg), tick(dt) }; the plate's centre is (0, 13) on the plank (the label strip is below), the plank's face is z = 12.
const COSTUMES = {
  bouton(ctx, petit) {
    const g = new T.Group(), r = petit ? 24 : 38;
    g.add(mesh(G.cyl(r + 6, r + 8, 10, 16), petit ? M.greyDark : M.redDark, 0, 13, 17).rotateX(PI / 2));
    const dome = mesh(G.sphere(r, 14, 9), petit ? M.grey : M.red, 0, 13, 24); dome.scale.z = 0.7; g.add(dome);
    return { g, on(kind) { if (kind === 'press') ctx.tween(dome.position, 'z', 12, 0.08).then(() => ctx.tween(dome.position, 'z', 24, 0.25, easeOutBack)); } };
  },
  tourniquet(ctx) {
    const g = new T.Group();
    const hub = new T.Group(); hub.position.set(-40, 13, 26);
    hub.add(mesh(G.cyl(9, 9, 30, 10), M.steel).rotateX(PI / 2));
    for (let i = 0; i < 4; i++) { const pivot = new T.Group(); pivot.rotation.z = i * PI / 2; pivot.add(mesh(G.box(62, 7, 7), M.brass, 31, 0, 8)); hub.add(pivot); }
    g.add(hub);
    g.add(mesh(G.box(70, 60, 10), M.woodDark, 50, 13, 17));                                   // the drum's housing; the digits are DOM
    return { g, on(kind) { if (kind === 'count') ctx.tween(hub.rotation, 'z', hub.rotation.z - PI / 2, 0.45, easeOutBack); } };
  },
  rampe(ctx) {
    const g = new T.Group();
    const slope = new T.Group(); slope.position.set(-78, 42, 14); slope.rotation.z = -0.4;
    slope.add(mesh(G.box(170, 8, 26), M.wood2, 85, -4, 13));
    slope.add(mesh(G.box(170, 4, 3), M.brass, 85, 1, 3)); slope.add(mesh(G.box(170, 4, 3), M.brass, 85, 1, 23));
    const ball = mesh(G.sphere(10, 10, 7), M.marble, 6, 11, 13); ball.visible = false; slope.add(ball);
    g.add(slope);
    g.add(mesh(G.box(20, 46, 20), M.woodDark, -84, 20, 24));                                  // the post the ramp hangs from
    let roll = null;
    return {
      g,
      on(kind, duration) { if (kind === 'roll') roll = { t: 0, dur: Math.max(0.15, (Number(duration) || 700) / 1000) }; },
      tick(dt) { if (!roll) return; roll.t += dt; const u = Math.min(1, roll.t / roll.dur); ball.visible = u < 1; ball.position.x = 6 + 158 * u * u; ball.rotation.z = -u * u * 9; if (u >= 1) { roll = null; ball.visible = false; } }
    };
  },
  ballon(ctx) {
    const g = new T.Group();
    const body = new T.Group(); body.position.set(0, 28, 50);
    const skin = mesh(G.sphere(36, 12, 9), M.balloon); skin.scale.set(1, 1.15, 1); body.add(skin);
    body.add(mesh(G.cone(6, 9, 6), M.balloon, 0, -43, 0).rotateX(PI));
    const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, -48, 0), new T.Vector3(4, -75, -36)]), new T.LineBasicMaterial({ color: 0xfff4e6 })); body.add(line);
    g.add(body); g.add(mesh(G.cyl(5, 5, 8, 8), M.brass, 4, -34, 14).rotateX(PI / 2));
    let popped = false;
    return {
      g,
      on(kind) {
        if (kind === 'on' && !popped) { popped = true; body.visible = false; ctx.shards(g, new T.Vector3(0, 28, 50), 16, M.shard); ctx.flash(g, 60); }
        if (kind === 'off' && popped) { popped = false; body.visible = true; body.scale.setScalar(0.1); ctx.tween(body.scale, 'x', 1, 0.6, easeOutBack); ctx.tween(body.scale, 'y', 1, 0.6, easeOutBack); ctx.tween(body.scale, 'z', 1, 0.6, easeOutBack); }
        if (kind === 'init' && !popped) { body.visible = true; }
      }
    };
  },
  chat(ctx) {
    const g = new T.Group(); const cat = new T.Group(); cat.position.set(-10, 2, 12); g.add(cat);
    const body = mesh(G.sphere(26, 10, 7), M.cat, 0, 20, 20); body.scale.set(1.4, 0.8, 0.9); cat.add(body);
    const head = new T.Group(); head.position.set(34, 30, 24); cat.add(head);
    head.add(mesh(G.sphere(19, 10, 7), M.cat));
    head.add(mesh(G.cone(7, 12, 4), M.catDark, -9, 17, 0)); head.add(mesh(G.cone(7, 12, 4), M.catDark, 9, 17, 0));
    head.add(mesh(G.sphere(4, 6, 4), M.pink, 0, -2, 18));
    const open = [mesh(G.sphere(3.5, 6, 4), M.black, -7, 4, 16), mesh(G.sphere(3.5, 6, 4), M.black, 7, 4, 16)];
    const shut = [mesh(G.box(8, 1.6, 1), M.black, -7, 3, 18), mesh(G.box(8, 1.6, 1), M.black, 7, 3, 18)];
    for (const e of open) { e.visible = false; head.add(e); } for (const e of shut) head.add(e);
    const tail = mesh(new T.TorusGeometry(16, 4, 6, 10, PI), M.catDark, -36, 20, 14); tail.rotation.z = 0.4; cat.add(tail);
    let awake = false;
    const set = (on) => { awake = on; for (const e of open) e.visible = on; for (const e of shut) e.visible = !on; ctx.tween(head.position, 'y', on ? 46 : 30, 0.35, easeOutBack); ctx.tween(cat.rotation, 'z', on ? 0 : -0.12, 0.35); ctx.tween(tail.rotation, 'z', on ? 1.6 : 0.4, 0.4); };
    set(false);
    return { g, on(kind) { if (kind === 'on' && !awake) set(true); if (kind === 'off' && awake) set(false); } };
  },
  ampoule(ctx) {
    const g = new T.Group();
    g.add(mesh(G.cyl(12, 14, 16, 12), M.steel, 0, -12, 30));
    const bulb = mesh(G.sphere(26, 12, 9), M.glass, 0, 22, 30); g.add(bulb);
    const fil = mesh(G.sphere(9, 8, 6), M.filament.clone(), 0, 20, 30); g.add(fil);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: ctx.glow, color: 0xffd166, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })); glow.scale.setScalar(160); glow.position.set(0, 22, 34); g.add(glow);
    return { g, on(kind) { if (kind === 'on') { ctx.tween(fil.material, 'emissiveIntensity', 2.2, 0.2); ctx.tween(glow.material, 'opacity', 0.9, 0.2); } if (kind === 'off') { ctx.tween(fil.material, 'emissiveIntensity', 0, 0.3); ctx.tween(glow.material, 'opacity', 0, 0.3); } } };
  },
  ardoise(ctx) {
    const g = new T.Group();
    g.add(mesh(G.box(196, 100, 6), M.green, 0, 13, 15));
    for (const [w, h, x, y] of [[204, 8, 0, 67], [204, 8, 0, -41], [8, 108, -98, 13], [8, 108, 98, 13]]) g.add(mesh(G.box(w, h, 10), M.wood2, x, y, 17));
    return { g, on() {} };
  },
  metronome(ctx) {
    const g = new T.Group(); const drum = new T.Group(); drum.position.set(-40, 13, 30); g.add(drum);
    drum.add(mesh(G.cyl(36, 36, 34, 14), M.red).rotateX(PI / 2)); drum.add(mesh(G.cyl(33, 33, 2, 14), M.paper, 0, 0, 17).rotateX(PI / 2));
    for (const s of [-1, 1]) { const stick = mesh(G.box(6, 60, 6), M.wood2, s * 22, 24, 44); stick.rotation.z = s * 0.6; drum.add(stick); }
    g.add(mesh(G.box(70, 44, 10), M.woodDark, 50, 13, 17));                                   // the count's housing; the digits are DOM
    return { g, on(kind) { if (kind === 'beat') { drum.scale.setScalar(1.18); ctx.tween(drum.scale, 'x', 1, 0.3, easeOutBack); ctx.tween(drum.scale, 'y', 1, 0.3, easeOutBack); ctx.tween(drum.scale, 'z', 1, 0.3, easeOutBack); } } };
  },
  pancarte(ctx) {
    const g = new T.Group();
    g.add(mesh(G.box(8, 60, 8), M.wood2, 0, -24, 18)); g.add(mesh(G.box(166, 66, 8), M.paper, 0, 16, 22)); g.add(mesh(G.box(174, 74, 4), M.ink, 0, 16, 18));
    return { g, on() {} };
  },
  afficheur(ctx) { return COSTUMES.ecran(ctx); },
  ecran(ctx) {
    const g = new T.Group();
    g.add(mesh(G.box(190, 76, 10), M.bezel, 0, 13, 17)); g.add(mesh(G.box(176, 62, 4), M.screen, 0, 13, 23));
    return { g, on() {} };
  },
  aiguillage(ctx) {
    const g = new T.Group();
    g.add(mesh(G.box(70, 10, 8), M.steel, -60, 13, 16));
    const up = mesh(G.box(80, 10, 8), M.steel, 10, 36, 16); up.rotation.z = 0.5; g.add(up);
    const down = mesh(G.box(80, 10, 8), M.steel, 10, -10, 16); down.rotation.z = -0.5; g.add(down);
    const lever = mesh(G.box(6, 44, 6), M.lever, -24, 24, 26); lever.rotation.z = -0.5; g.add(lever);
    g.add(mesh(G.sphere(7, 8, 6), M.lever, -24, 44, 26));
    return { g, on(kind, v) { if (kind === 'result') ctx.tween(lever.rotation, 'z', v === 'true' ? -0.5 : v === 'false' ? 0.5 : 0, 0.3); } };
  },
  miroir(ctx) {
    const g = new T.Group();
    g.add(mesh(new T.TorusGeometry(40, 6, 8, 20), M.brass, 0, 13, 18)); g.add(mesh(G.cyl(38, 38, 3, 20), M.mirror, 0, 13, 16).rotateX(PI / 2));
    return { g, on() {} };
  },
  piece(ctx) {
    const g = new T.Group(); const cube = mesh(G.box(54, 54, 54), M.brass, -56, 20, 40); cube.rotation.set(0.4, 0.6, 0); g.add(cube);
    return { g, on() {}, tick(dt) { cube.rotation.y += dt * 0.6; } };
  }
};
COSTUMES['bouton-petit'] = (ctx) => COSTUMES.bouton(ctx, true);

/* ---------------- the wall ---------------- */
export function createWall({ stage, W, H, reduce, colors }) {
  const scene = new T.Scene();
  const cssScene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 1, 10, 30000);
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.domElement.id = 'gl'; renderer.domElement.style.cssText = 'position:absolute;inset:0;display:block;';
  stage.appendChild(renderer.domElement);
  const css = new T.CSS3DRenderer();
  css.domElement.id = 'css3d'; css.domElement.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  stage.appendChild(css.domElement);

  // the room: a brick wall at z = 0, a floor under the lowest part, warm light from the top left that casts shadows
  const brick = bricks(), gridTex = grid(colors.ground, colors.gridDot);
  const wallMat = new T.MeshStandardMaterial({ map: brick, roughness: 0.95, metalness: 0 });
  const wallMesh = new T.Mesh(new T.PlaneGeometry(40000, 40000), wallMat); wallMesh.receiveShadow = true; scene.add(wallMesh);
  const floorMat = new T.MeshStandardMaterial({ map: boards(), roughness: 0.9 });
  const floor = new T.Mesh(new T.PlaneGeometry(40000, 6000), floorMat); floor.rotation.x = -PI / 2; floor.position.set(0, -1200, 3000); floor.receiveShadow = true; scene.add(floor);
  const skirting = new T.Mesh(G.box(40000, 24, 14), M.woodDark); skirting.position.set(0, -1188, 7); skirting.receiveShadow = true; scene.add(skirting);
  scene.add(new T.HemisphereLight(0xfff4e6, 0x4a3a5a, 0.95));
  const sun = new T.DirectionalLight(0xfff0d0, 1.7); sun.castShadow = true;
  sun.shadow.mapSize.set((navigator.hardwareConcurrency || 4) <= 4 ? 1024 : 2048, (navigator.hardwareConcurrency || 4) <= 4 ? 1024 : 2048);
  sun.shadow.camera.left = -1800; sun.shadow.camera.right = 1800; sun.shadow.camera.top = 1400; sun.shadow.camera.bottom = -1400; sun.shadow.camera.near = 100; sun.shadow.camera.far = 6000; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 2;
  scene.add(sun); scene.add(sun.target);
  const glow = glowTexture();

  /* tweens */
  const tweens = [];
  const tween = (obj, prop, to, dur, ease = easeInOut) => new Promise((done) => { if (reduce) { obj[prop] = to; return done(); } for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].obj === obj && tweens[i].prop === prop) tweens.splice(i, 1); tweens.push({ obj, prop, from: obj[prop], to, t: 0, dur, ease, done }); });
  const stepTweens = (dt) => { for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const u = Math.min(1, w.t / w.dur); w.obj[w.prop] = w.from + (w.to - w.from) * w.ease(u); if (u >= 1) { tweens.splice(i, 1); w.done(); } } };

  /* the floor, the shards' ground: under the lowest part */
  let floorY = -1200;
  const setFloor = (y) => { floorY = y; floor.position.y = y; skirting.position.y = y + 12; };

  /* shards: ballistic, spinning, bouncing on the floor */
  const shards = [];
  const shardGeo = G.tetra(9);
  function spawnShards(group, at, n, material) {
    const origin = group.localToWorld(at.clone());
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(shardGeo, material); m.castShadow = true; m.position.copy(origin); scene.add(m);
      const a = Math.random() * PI * 2, up = Math.random();
      shards.push({ m, v: new T.Vector3(Math.cos(a) * (300 + Math.random() * 500), 200 + up * 700, 100 + Math.random() * 500), w: new T.Vector3(Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6), life: 2.2 });
    }
  }
  function stepShards(dt) {
    for (let i = shards.length - 1; i >= 0; i--) {
      const s = shards[i]; s.life -= dt; s.v.y -= 2400 * dt; s.v.multiplyScalar(1 - 0.4 * dt);
      s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += s.w.x * dt; s.m.rotation.y += s.w.y * dt; s.m.rotation.z += s.w.z * dt;
      if (s.m.position.y < floorY + 9) { s.m.position.y = floorY + 9; s.v.y = Math.abs(s.v.y) * 0.45; s.v.x *= 0.8; s.v.z *= 0.8; }
      if (s.m.position.z < 10) { s.m.position.z = 10; s.v.z = Math.abs(s.v.z) * 0.5; }
      if (s.life < 0.5) s.m.scale.setScalar(Math.max(0.01, s.life * 2));
      if (s.life <= 0) { scene.remove(s.m); shards.splice(i, 1); }
    }
  }

  /* a flash on a part's plank when a signal lands */
  const flash = (group, ms = 300) => { const p = group.userData.plank; if (!p) return; p.material.emissive.setHex(0xffd166); p.material.emissiveIntensity = 0.5; clearTimeout(p.userData.cool); p.userData.cool = setTimeout(() => { p.material.emissiveIntensity = 0; }, ms); };

  const ctx = { tween, shards: spawnShards, flash, glow };

  /* ---- parts: a plank with a costume, and the DOM element pinned to it ---- */
  const parts = new Map();   // id → { g, obj, costume, skin, x, y }
  const centre = (x, y) => new T.Vector3(x + W / 2, -(y + H / 2), 0);
  function buildCostume(part, skin) {
    if (part.costume) { part.g.remove(part.costume.g); }
    const c = (COSTUMES[skin] || COSTUMES.piece)(ctx);
    part.costume = c; part.skin = skin; part.g.add(c.g);
  }
  function addPart(id, el, { x, y, skin, fresh }) {
    const wrap = document.createElement('div'); wrap.style.width = `${W}px`; wrap.style.height = `${H}px`; wrap.appendChild(el);
    const obj = new T.CSS3DObject(wrap); cssScene.add(obj);
    const g = new T.Group(); scene.add(g);
    const plank = mesh(G.box(W, H, 12), M.wood(), 0, 0, 6); plank.material.emissive = new T.Color(0x000000); g.userData.plank = plank; g.add(plank);
    const part = { g, obj, plank, costume: null, skin: null, x, y };
    parts.set(id, part);
    buildCostume(part, skin);
    movePart(id, x, y);
    if (face === 'circuit') g.rotation.y = PI;
    if (fresh && !reduce) { g.scale.setScalar(0.3); tween(g.scale, 'x', 1, 0.6, easeOutBack); tween(g.scale, 'y', 1, 0.6, easeOutBack); tween(g.scale, 'z', 1, 0.6, easeOutBack); }
  }
  function movePart(id, x, y) { const p = parts.get(id); if (!p) return; p.x = x; p.y = y; const c = centre(x, y); p.g.position.copy(c); p.obj.position.copy(c); }
  function setSkin(id, skin) { const p = parts.get(id); if (p && p.skin !== skin) buildCostume(p, skin); }
  function removePart(id) { const p = parts.get(id); if (!p) return; scene.remove(p.g); cssScene.remove(p.obj); parts.delete(id); }
  function event(id, kind, arg) { const p = parts.get(id); if (!p) return; if (kind === 'hot') return flash(p.g); p.costume.on(kind, arg); }

  /* ---- rails between parts: a bead's path, and what it is drawn as ---- */
  const rails = new Map();   // key → { from, to, signal, curve, L, mesh, sig }
  let face = 'mur';
  const anchorOut = (p) => new T.Vector3(p.x + W, -(p.y + H / 2), 22);
  const anchorIn = (p) => new T.Vector3(p.x, -(p.y + H / 2), 22);
  function railCurve(a, b, signal) {
    const dist = a.distanceTo(b), dx = Math.max(60, Math.abs(b.x - a.x) * 0.5);
    const sag = face === 'circuit' ? 0 : signal ? Math.min(90, dist * 0.14) : Math.min(40, dist * 0.06);
    return new T.CubicBezierCurve3(a, new T.Vector3(a.x + dx, a.y - sag, 22), new T.Vector3(b.x - dx, b.y - sag, 22), b);
  }
  const railMaterial = (signal, selected) => {
    if (selected) return mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.4 });
    if (face === 'circuit') return mat(signal ? colors.wireSignal : colors.wireData, { emissive: signal ? colors.wireSignal : colors.wireData, emissiveIntensity: 0.35, flatShading: false });
    return signal ? M.rail : M.string;
  };
  function setRails(list) {
    const keys = new Set(list.map((r) => r.key));
    for (const [k, r] of rails) if (!keys.has(k)) { scene.remove(r.mesh); r.mesh.geometry.dispose(); rails.delete(k); }
    for (const r of list) {
      const a = parts.get(r.from), b = parts.get(r.to); if (!a || !b) continue;
      const A = anchorOut(a), B = anchorIn(b);
      const sig = `${A.x},${A.y},${B.x},${B.y},${r.signal},${r.selected},${face}`;
      let rail = rails.get(r.key);
      if (rail && rail.sig === sig) continue;
      if (rail) { scene.remove(rail.mesh); rail.mesh.geometry.dispose(); }
      const curve = railCurve(A, B, r.signal);
      const m = new T.Mesh(new T.TubeGeometry(curve, 40, r.signal ? (face === 'circuit' ? 3 : 4.5) : (face === 'circuit' ? 2.5 : 2.2), 7, false), railMaterial(r.signal, r.selected));
      m.castShadow = true; scene.add(m);
      rails.set(r.key, { ...r, curve, L: curve.getLength(), mesh: m, sig, hot: 0 });
    }
  }
  const hot = (key, ms) => { const r = rails.get(key); if (!r || r.selected) return; r.mesh.material = mat(0xffd166, { emissive: 0xffd166, emissiveIntensity: 0.6 }); clearTimeout(r.cool); r.cool = setTimeout(() => { if (rails.get(key) === r) r.mesh.material = railMaterial(r.signal, r.selected); }, ms); };

  /* ---- marbles: a bead on its rail, shot with just enough speed to arrive; a value is a glow that slides ---- */
  const beads = [];
  const marbleGeo = G.sphere(11, 12, 9), dataGeo = G.sphere(6, 8, 6);
  const GRAV = 2600, VMIN = 420, VMAX = 1700;
  function marble(key, signal, onArrive) {
    const r = rails.get(key); if (!r) return false;
    if (beads.length >= 60) return false;
    const m = new T.Mesh(signal ? marbleGeo : dataGeo, signal ? (face === 'circuit' ? M.marbleBlue : M.marble) : M.data); m.castShadow = signal; scene.add(m);
    let v;
    if (signal) {
      let rise = 0; const y0 = r.curve.v0.y;
      for (let i = 1; i <= 24; i++) rise = Math.max(rise, r.curve.getPointAt(i / 24).y - y0);
      v = Math.sqrt(VMIN * VMIN + 2 * GRAV * rise) + 140;
    } else v = 700;
    beads.push({ key, m, s: 0, v, signal, spin: 0, onArrive });
    return true;
  }
  const tan = new T.Vector3();
  function stepBeads(dt) {
    for (let i = beads.length - 1; i >= 0; i--) {
      const b = beads[i], r = rails.get(b.key);
      if (!r) { scene.remove(b.m); beads.splice(i, 1); continue; }
      if (b.signal) {
        r.curve.getTangentAt(clamp(b.s / r.L, 0, 1), tan);
        b.v += (-GRAV * tan.y - 0.15 * b.v) * dt;
        b.v = clamp(b.v, 90, VMAX);
      }
      b.s += b.v * dt;
      if (b.s >= r.L) { scene.remove(b.m); beads.splice(i, 1); b.onArrive?.(); continue; }
      r.curve.getPointAt(b.s / r.L, b.m.position); b.m.position.z += b.signal ? 10 : 4;
      if (b.signal) { b.spin -= b.v * dt / 11; b.m.rotation.z = b.spin; }
    }
  }

  /* ---- the ghost string while a kid drags one ---- */
  const ghostMat = new T.LineDashedMaterial({ color: 0xffd166, dashSize: 12, gapSize: 8, linewidth: 1 });
  let ghostLine = null;
  function ghost(from, to) {
    if (ghostLine) { scene.remove(ghostLine); ghostLine.geometry.dispose(); ghostLine = null; }
    if (!from) return;
    const a = new T.Vector3(from.x, -from.y, 30), b = new T.Vector3(to.x, -to.y, 30);
    const pts = railCurve(a, b, true).getPoints(32);
    ghostLine = new T.Line(new T.BufferGeometry().setFromPoints(pts), ghostMat); ghostLine.computeLineDistances(); scene.add(ghostLine);
  }

  /* ---- the camera: an editor-space point at the stage's centre, and a zoom (1 = one editor pixel per CSS pixel) ---- */
  let cam = { x: 800, y: 400, z: 1 };
  let sw = 1, sh = 1;
  const stageTop = () => stage.getBoundingClientRect().top;
  function setCam(c) {
    cam = { ...c };
    const d = (sh / 2) / (Math.tan(camera.fov * PI / 360) * cam.z);
    camera.position.set(cam.x, -cam.y, d); camera.lookAt(cam.x, -cam.y, 0); camera.updateMatrixWorld();
    sun.position.set(cam.x - 900, -cam.y + 1100, 1600); sun.target.position.set(cam.x, -cam.y, 0); sun.target.updateMatrixWorld();
  }
  const toWall = (px, py) => ({ x: cam.x + (px - sw / 2) / cam.z, y: cam.y + (py - stageTop() - sh / 2) / cam.z });
  function resize() {
    sw = stage.clientWidth || 1; sh = stage.clientHeight || 1;
    renderer.setSize(sw, sh, false); css.setSize(sw, sh);
    camera.aspect = sw / sh; camera.updateProjectionMatrix();
    setCam(cam);
  }

  /* ---- the two faces: every plank turns over; the wall becomes the editor's canvas ---- */
  function setFace(f) {
    if (f === face) return;
    face = f;
    for (const p of parts.values()) tween(p.g.rotation, 'y', f === 'circuit' ? PI : 0, 0.75);
    setTimeout(() => { wallMat.map = f === 'circuit' ? gridTex : brick; wallMat.needsUpdate = true; floor.visible = skirting.visible = f !== 'circuit'; }, reduce ? 0 : 380);
    for (const r of rails.values()) r.sig = '';   // every rail is redrawn in the face's colours and sag
  }

  /* ---- the loop ---- */
  function tick(dt) {
    stepTweens(dt); stepBeads(dt); stepShards(dt);
    for (const p of parts.values()) p.costume.tick?.(dt);
  }
  function render() { renderer.render(scene, camera); css.render(cssScene, camera); }

  resize();
  return { addPart, movePart, setSkin, removePart, event, setRails, hot, marble, ghost, setCam, toWall, resize, setFace, setFloor, tick, render, get cam() { return { ...cam }; }, get beads() { return beads.length; }, get shards() { return shards.length; }, renderer, scene, camera };
}
