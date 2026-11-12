// GENERATED from reference/src/world.js by tools/sync-stage.mjs — do not edit here.
function create(env) {
  const window = env.window, SIZE = env.size, OffscreenCanvas = window.OffscreenCanvas, devicePixelRatio = window.devicePixelRatio;
  const setTimeout = window.setTimeout.bind(window), performance = window.performance;
// The school in three.js: the hall and its stage, the dressing room ("la loge"), the foyer, the car park, the camera.
// Round 1's recipe: flat-shaded low poly, a warm palette, parquet, velvet and wood as the only textures, one sun and a sky
// fill, a cutaway with The Sims' three wall modes, four quarter turns, a change of view is a cut.
const T = env.T;
const { G } = env;
const { LOGE, PIECES, PARKING, RULES } = use('rules/data');
const { footprint, againstWall, rngFor, clamp } = use('rules/engine');

const V = (x, y, z) => new T.Vector3(x, y, z);
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
const canvas = renderer.domElement;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new T.Scene(); scene.background = new T.Color(0xb7a6d8);
const camera = new T.PerspectiveCamera(40, 1, 0.3, 400);
const hemi = new T.HemisphereLight(0xfff3e0, 0x7a6a58, 0.95); scene.add(hemi);
const sun = new T.DirectionalLight(0xfff0d8, 2.1); sun.position.set(-22, 40, 26); sun.target.position.set(-1, 0, 4); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 130 }); sun.shadow.bias = -0.0006; scene.add(sun);
const std = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, flatShading: true, ...o });
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b; };
const cyl = (r0, r1, h, m, x = 0, y = 0, z = 0, seg = 10) => { const c = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg), m); c.position.set(x, y, z); c.castShadow = c.receiveShadow = true; return c; };
function parquetTex(a = '#c8935a', b = '#b37d48', line = '#8a5a30') {
  const cv = new OffscreenCanvas(1, 1); cv.width = cv.height = 256; const g = cv.getContext('2d');
  for (let r = 0; r < 8; r++) for (let k = 0; k < 3; k++) { g.fillStyle = (r + k) % 2 ? a : b; const off = (r % 2) * 42; g.fillRect(((k * 85 + off) % 256), r * 32, 85, 32); g.fillRect(((k * 85 + off) % 256) - 256, r * 32, 85, 32); }
  g.strokeStyle = line; g.lineWidth = 2; for (let r = 0; r <= 8; r++) { g.beginPath(); g.moveTo(0, r * 32); g.lineTo(256, r * 32); g.stroke(); }
  for (let r = 0; r < 8; r++) for (let k = 0; k < 4; k++) { const x = (k * 85 + (r % 2) * 42) % 256; g.beginPath(); g.moveTo(x, r * 32); g.lineTo(x, r * 32 + 32); g.stroke(); }
  const tx = new T.CanvasTexture(cv); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.colorSpace = T.SRGBColorSpace; return tx;
}
const PARQ = parquetTex();
function floorMat(w, d) { const tx = PARQ.clone(); tx.needsUpdate = true; tx.repeat.set(w / 4, d / 4); return new T.MeshStandardMaterial({ map: tx, roughness: 0.75, flatShading: true }); }
const M = {
  grass: std(0x8cc56a), pave: std(0xd8cdbf), asphalt: std(0x5d5a66), line: std(0xffffff), wall: std(0xf4e6d0), wallTop: std(0xe2cfb2), foyerWall: std(0xf8e9cf), drWall: std(0xf6c9cf),
  velvet: std(0xb3203c, { roughness: 1 }), velvet2: std(0x8f1730, { roughness: 1 }), wood: std(0x9a6a3c), wood2: std(0x7a5030), pale: std(0xe7c9a0), gold: std(0xe6b450, { metalness: 0.3, roughness: 0.5 }),
  black: std(0x1b1720), white: std(0xffffff), dark: std(0x2e2638), tile1: std(0xf3e6d3), tile2: std(0xe6d3ba), glass: std(0xbfe3f5, { metalness: 0.2, roughness: 0.15 }),
  seat: std(0xb3203c, { roughness: 1 }), seatBack: std(0x8f1730, { roughness: 1 }), cream: std(0xfff4e0), mat: std(0x3a3340, { roughness: 1 }),
};
const ground = new T.Mesh(new T.PlaneGeometry(400, 400), M.grass); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

/* ---------------- the plan of the school, in metres ---------------- */
const ROOMS = { hall: { x0: -15, x1: 3, z0: -9, z1: 7 }, dr: { x0: 3, x1: 13, z0: -9, z1: -1 }, foyer: { x0: 3, x1: 13, z0: -1, z1: 7 }, park: { x0: -15, x1: 16, z0: 8.5, z1: 15.5 } };
const STAGE = { x0: -12, x1: 0, z0: -9, z1: -3, h: 0.8, cx: -6, front: -3.3 };
const floorY = (x, z) => (z < -3 && z > -9 && x > -15 && x < 3 ? STAGE.h : 0);
const stageToWorld = (x, z) => V(STAGE.cx + x, STAGE.h, STAGE.front - z);
const school = new T.Group(); scene.add(school);
{
  const hf = new T.Mesh(new T.PlaneGeometry(18, 16), floorMat(18, 16)); hf.rotation.x = -Math.PI / 2; hf.position.set(-6, 0.02, -1); hf.receiveShadow = true; school.add(hf);
  const st = box(12, STAGE.h, 6, M.wood2, -6, STAGE.h / 2, -6); st.material = [M.wood2, M.wood2, floorMat(12, 6), M.wood2, M.wood, M.wood2]; school.add(st);
  for (const x of [-13.5, 1.5]) school.add(box(3, STAGE.h, 6, M.dark, x, STAGE.h / 2, -6));
  for (let i = 0; i < 2; i++) school.add(box(2.4, 0.2 + i * 0.2, 0.5, M.wood, -6, 0.1 + i * 0.2, -2.55 + 0.5 - i * 0.5));
  for (let x = 0; x < 10; x++) for (let z = 0; z < 8; z++) { const t = new T.Mesh(new T.PlaneGeometry(1, 1), (x + z) % 2 ? M.tile1 : M.tile2); t.rotation.x = -Math.PI / 2; t.position.set(3.5 + x, 0.02, -0.5 + z); t.receiveShadow = true; school.add(t); }
}
// the dance mat (le tapis de danse): grey over the boards for ballet and contemporary, rolled away for jazz and hip-hop
const danceMat = new T.Mesh(new T.PlaneGeometry(11.6, 5.8), M.mat); danceMat.rotation.x = -Math.PI / 2; danceMat.position.set(-6, STAGE.h + 0.012, -6); danceMat.receiveShadow = true; school.add(danceMat);
function setStageFloor(kind) { danceMat.visible = kind !== 'bois'; }
// the usable stage, taped in white at its corners
const tapeG = new T.Group(); school.add(tapeG);
function drawStageTape(stage) {
  tapeG.clear(); const m = std(0xffffff, { roughness: 0.6 });
  for (const sx of [-1, 1]) for (const z of [0, stage.depth]) { const p = stageToWorld(sx * stage.halfW, z); const a = box(0.5, 0.01, 0.06, m, p.x - sx * 0.22, STAGE.h + 0.02, p.z); const b = box(0.06, 0.01, 0.5, m, p.x, STAGE.h + 0.02, p.z + (z ? 0.22 : -0.22)); a.castShadow = b.castShadow = false; tapeG.add(a); tapeG.add(b); }
}

/* ---------------- walls: rebuilt when the dressing room grows ---------------- */
let WALLSEG = [];
const wallG = new T.Group(); school.add(wallG);
const drFloor = new T.Mesh(new T.PlaneGeometry(1, 1), floorMat(10, 8)); drFloor.rotation.x = -Math.PI / 2; drFloor.receiveShadow = true; school.add(drFloor);
const drRoof = { cols: 0 };
function buildLoge() {
  const cols = G.S.school.logeCols, X1 = 3 + cols; ROOMS.dr.x1 = X1; ROOMS.park.x1 = Math.max(16, X1);
  if (drRoof.cols !== cols) { drFloor.geometry.dispose(); drFloor.geometry = new T.PlaneGeometry(cols, 8); drFloor.material = floorMat(cols, 8); drFloor.position.set(3 + cols / 2, 0.025, -5); drRoof.cols = cols; }
  wallG.clear();
  const segs = [
    [-15, -9, 3, -9, [0, -1], ['hall'], 5], [3, -9, X1, -9, [0, -1], ['dr'], 3],
    [-15, 7, 3, 7, [0, 1], ['hall'], 5], [3, 7, 7, 7, [0, 1], ['foyer'], 3], [9, 7, 13, 7, [0, 1], ['foyer'], 3],
    [-15, -9, -15, 7, [-1, 0], ['hall'], 5], [X1, -9, X1, -1, [1, 0], ['dr'], 3], [13, -1, 13, 7, [1, 0], ['foyer'], 3],
    [3, -9, 3, -8, null, ['hall', 'dr'], 3], [3, -6.5, 3, -1, null, ['hall', 'dr'], 3], [3, -1, 3, 3, null, ['hall', 'foyer'], 3], [3, 4.5, 3, 7, null, ['hall', 'foyer'], 3],
    [3, -1, 7, -1, null, ['dr', 'foyer'], 3], [8.5, -1, 13, -1, null, ['dr', 'foyer'], 3],
  ];
  if (X1 > 13) segs.push([13, -1, X1, -1, [0, 1], ['dr'], 3]);
  const old = new Map(WALLSEG.map((w) => [w.key, w.cur]));
  WALLSEG = segs.map(([x1, z1, x2, z2, n, rooms, h]) => {
    const L = Math.hypot(x2 - x1, z2 - z1), along = x1 === x2 ? 'z' : 'x', mat = rooms.includes('dr') ? M.drWall : rooms.includes('foyer') ? M.foyerWall : M.wall;
    const m = new T.Mesh(new T.BoxGeometry(along === 'x' ? L + 0.2 : 0.2, 1, along === 'x' ? 0.2 : L + 0.2), mat); m.castShadow = m.receiveShadow = true; m.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); wallG.add(m);
    const cap = box(along === 'x' ? L + 0.24 : 0.24, 0.08, along === 'x' ? 0.24 : L + 0.24, M.wallTop, (x1 + x2) / 2, 0, (z1 + z2) / 2); cap.castShadow = false; wallG.add(cap);
    const key = `${x1},${z1},${x2},${z2}`;
    return { key, m, cap, n, rooms, h, cur: old.get(key) ?? h };
  });
  stepWalls(0, true);
}
let wallMode = 1;
const setWallMode = (m) => { wallMode = m; };
const view = { rot: 0, high: false, mode: 'school', pan: new T.Vector2(), zoom: 1, yaw: Math.PI / 4 };
function wallTargets() {
  const dir = V(Math.sin(view.yaw), 0, Math.cos(view.yaw));
  for (const w of WALLSEG) {
    let h = w.h;
    if (wallMode === 2) h = 0.2;
    else if (wallMode === 1) { if (w.n && w.n[0] * dir.x + w.n[1] * dir.z > 0.2) h = 0.2; else if (!w.n) h = 1.1; }
    if (G.pickedRoom && w.rooms.includes(G.pickedRoom) && wallMode !== 0) h = 0.2;
    if (['stage', 'podium'].includes(view.mode) && w.n && w.n[1] > 0 && w.rooms.includes('hall')) h = 0.2;
    w.target = h;
  }
}
function stepWalls(dt, snap) { for (const w of WALLSEG) { w.cur = snap || w.target === undefined ? (w.target ?? w.cur) : w.cur + (w.target - w.cur) * Math.min(1, dt * 10); w.m.scale.y = w.cur; w.m.position.y = w.cur / 2; w.cap.position.y = w.cur + 0.04; } }

/* ---------------- the stage: curtain, backdrops, the hall's clock, lights ---------------- */
const curtain = { open: 0, target: 0, halves: [] };
const backMat = new T.MeshStandardMaterial({ roughness: 1 });
{
  for (const x of [-12.25, 0.25]) school.add(box(0.5, 4.1, 0.6, M.velvet2, x, STAGE.h + 2.05, -3.1));
  school.add(box(12.9, 1.0, 0.6, M.velvet2, -6, STAGE.h + 3.6, -3.1)); school.add(box(12.9, 0.12, 0.64, M.gold, -6, STAGE.h + 3.1, -3.1));
  for (const side of [-1, 1]) {
    const g = new T.Group(); g.position.set(side < 0 ? -12 : 0, STAGE.h, -3.25); school.add(g);
    for (let k = 0; k < 10; k++) { const b = box(0.62, 3.1, 0.12, k % 2 ? M.velvet : M.velvet2, (side < 0 ? 1 : -1) * (0.3 + k * 0.6), 1.55, (k % 2) * 0.08); b.castShadow = false; g.add(b); }
    curtain.halves.push(g);
  }
  const back = new T.Mesh(new T.PlaneGeometry(12, 3.8), backMat); back.position.set(-6, STAGE.h + 1.9, -8.85); school.add(back);
  for (const x of [-12, 0]) for (const z of [-4.6, -6.6]) school.add(box(0.15, 3.4, 1.0, M.black, x + (x < -6 ? 0.15 : -0.15), STAGE.h + 1.7, z));
}
const backTex = {};
function drawBackdrop(id) {
  const cv = new OffscreenCanvas(1, 1); cv.width = 512; cv.height = 160; const g = cv.getContext('2d'), rng = rngFor(7);
  const grad = (a, b) => { const grd = g.createLinearGradient(0, 0, 0, 160); grd.addColorStop(0, a); grd.addColorStop(1, b); g.fillStyle = grd; g.fillRect(0, 0, 512, 160); };
  if (id === 'nuit') {
    grad('#1d2350', '#4a3a7a');
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,240,200,${0.4 + rng() * 0.6})`; g.beginPath(); g.arc(rng() * 512, rng() * 150, 1 + rng() * 2.2, 0, 7); g.fill(); }
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(400, 40, 18, 0, 7); g.fill(); g.fillStyle = '#1d2350'; g.beginPath(); g.arc(408, 34, 16, 0, 7); g.fill();
  } else if (id === 'foret') {
    grad('#bfe8d0', '#7cc28e');
    for (let i = 0; i < 26; i++) { const x = rng() * 512, h = 60 + rng() * 80, w = 20 + rng() * 26; g.fillStyle = rng() > 0.5 ? '#2f6b45' : '#3f8a58'; g.beginPath(); g.moveTo(x, 160 - h); g.lineTo(x - w, 160); g.lineTo(x + w, 160); g.fill(); }
    for (let i = 0; i < 30; i++) { g.fillStyle = ['#ffb3c7', '#fff1a8', '#ffffff'][i % 3]; g.beginPath(); g.arc(rng() * 512, 150 + rng() * 10, 3, 0, 7); g.fill(); }
  } else if (id === 'mer') {
    grad('#bfe3f5', '#4f9fd8');
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(90, 50, 22, 0, 7); g.fill();
    for (let r = 0; r < 5; r++) { g.strokeStyle = `rgba(255,255,255,${0.35 + r * 0.1})`; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, 95 + r * 14 + Math.sin(x / 24 + r) * 5); g.stroke(); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(380, 70); g.lineTo(380, 30); g.lineTo(410, 70); g.fill(); g.fillStyle = '#c23652'; g.fillRect(360, 70, 60, 10);
  } else {
    grad('#2b2350', '#6b4a8a');
    for (let i = 0; i < 18; i++) { const x = i * 30 + rng() * 10, w = 22 + rng() * 14, h = 50 + rng() * 90; g.fillStyle = '#1b1530'; g.fillRect(x, 160 - h, w, h); for (let y = 160 - h + 6; y < 156; y += 10) for (let xx = x + 4; xx < x + w - 4; xx += 8) if (rng() > 0.45) { g.fillStyle = '#ffe08a'; g.fillRect(xx, y, 4, 5); } }
  }
  const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; return tx;
}
function showBackdrop(id) { backMat.map = backTex[id] ||= drawBackdrop(id); backMat.needsUpdate = true; }
const clockCv = new OffscreenCanvas(1, 1); clockCv.width = clockCv.height = 256;
const clockTex = new T.CanvasTexture(clockCv); clockTex.colorSpace = T.SRGBColorSpace;
{ const c = new T.Mesh(new T.CircleGeometry(0.45, 32), new T.MeshBasicMaterial({ map: clockTex })); c.position.set(-6, STAGE.h + 3.6, -2.79); school.add(c); const rim = new T.Mesh(new T.TorusGeometry(0.47, 0.05, 6, 32), M.gold); rim.position.copy(c.position); school.add(rim); }
let clockShown = -1;
function drawClock(tt) {
  const m = Math.floor(tt / 60); if (m === clockShown) return; clockShown = m;
  const g = clockCv.getContext('2d'); g.clearRect(0, 0, 256, 256); g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = '#2b2236'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104, i % 3 ? 5 : 9, 0, 7); g.fill(); }
  const hh = (tt / 3600) % 12, mm = (tt / 60) % 60; g.lineCap = 'round';
  g.strokeStyle = '#2b2236'; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(hh / 12 * Math.PI * 2) * 60, 128 - Math.cos(hh / 12 * Math.PI * 2) * 60); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(mm / 60 * Math.PI * 2) * 92, 128 - Math.cos(mm / 60 * Math.PI * 2) * 92); g.stroke();
  g.fillStyle = '#c23652'; g.beginPath(); g.arc(128, 128, 10, 0, 7); g.fill(); clockTex.needsUpdate = true;
}
// coloured spotlights and the disco ball, bought in the shop
const lights = { group: new T.Group(), spots: [], cones: [], ball: null, dots: [] };
scene.add(lights.group);
const SPOT_COLORS = [0xff7eb6, 0x7cc6ff, 0xf5d76e, 0xb48cff];
function buildLights(up) {
  lights.group.clear(); lights.spots = []; lights.cones = []; lights.ball = null; lights.dots = [];
  if (up.projecteurs) SPOT_COLORS.forEach((c, k) => {
    const x = -10.5 + k * 3, s = new T.SpotLight(c, 0, 16, 0.42, 0.6, 1.2); s.position.set(x, STAGE.h + 4.4, -2.6); s.target.position.set(-6 + (k - 1.5) * 1.6, STAGE.h, -6); lights.group.add(s); lights.group.add(s.target); lights.spots.push(s);
    lights.group.add(box(0.36, 0.3, 0.42, M.black, x, STAGE.h + 4.45, -2.6));
    const d = s.position.clone().sub(s.target.position), cone = new T.Mesh(new T.ConeGeometry(1.1, d.length(), 18, 1, true), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide }));
    cone.quaternion.setFromUnitVectors(V(0, 1, 0), d.clone().normalize()); cone.position.copy(s.position).lerp(s.target.position, 0.5); lights.group.add(cone); lights.cones.push(cone);
  });
  if (up.boule) {
    const ball = new T.Mesh(new T.IcosahedronGeometry(0.38, 1), new T.MeshStandardMaterial({ color: 0xe8e8f0, metalness: 0.9, roughness: 0.15, flatShading: true }));
    ball.position.set(-6, STAGE.h + 4.0, -5.5); lights.group.add(ball); lights.group.add(box(0.02, 0.5, 0.02, M.black, -6, STAGE.h + 4.45, -5.5)); lights.ball = ball;
    for (let i = 0; i < 18; i++) { const d = new T.Mesh(new T.CircleGeometry(0.12, 8), new T.MeshBasicMaterial({ color: [0xffffff, 0xff9ec7, 0x7cc6ff, 0xf5d76e][i % 4], transparent: true, opacity: 0 })); d.rotation.x = -Math.PI / 2; lights.group.add(d); lights.dots.push(d); }
  }
}
function stepLights(dt, on, disco) {
  const k = on ? 1 : 0;
  lights.spots.forEach((s, i) => { s.intensity += (k * 60 - s.intensity) * Math.min(1, dt * 4); s.target.position.x = -6 + (i - 1.5) * 1.6 + Math.sin(G.realT * 0.8 + i) * 1.4 * k; });
  lights.cones.forEach((c) => { c.material.opacity += (k * 0.12 - c.material.opacity) * Math.min(1, dt * 4); });
  if (lights.ball) {
    lights.ball.rotation.y += dt * 1.5; const d = disco ? 1 : 0;
    lights.dots.forEach((m, i) => { const a = G.realT * 0.9 + i * 0.35, r = 1 + (i % 5) * 0.9; m.position.set(-6 + Math.cos(a) * r * 1.3, STAGE.h + 0.03, -6 + Math.sin(a) * r * 0.55); m.material.opacity += (d * 0.85 - m.material.opacity) * Math.min(1, dt * 4); });
  }
}

/* ---------------- the seats and the parents in them ---------------- */
let SEATS = [];
const seatG = new T.Group(); school.add(seatG);
const parentBody = new T.InstancedMesh(new T.BoxGeometry(0.42, 0.6, 0.3), std(0xffffff), 200), parentHead = new T.InstancedMesh(new T.BoxGeometry(0.3, 0.3, 0.3), std(0xffffff), 200);
parentBody.castShadow = true; school.add(parentBody); school.add(parentHead);
let parentSpots = [];
function buildSeats(rowsExtra, comfy) {
  seatG.clear(); SEATS = [];
  const rows = 8 + rowsExtra, dz = Math.min(0.95, 6.4 / (rows - 1));
  for (let r = 0; r < rows; r++) for (let k = 0; k < 7; k++) for (const side of [-1, 1]) SEATS.push(V(-6 + side * (0.75 + k * 0.72), 0, 0.2 + r * dz));
  const seatM = comfy ? std(0xd94a6a, { roughness: 1 }) : M.seat, backM = comfy ? std(0xa8243f, { roughness: 1 }) : M.seatBack;
  const seatI = new T.InstancedMesh(new T.BoxGeometry(comfy ? 0.66 : 0.6, comfy ? 0.5 : 0.45, 0.55), seatM, SEATS.length), backI = new T.InstancedMesh(new T.BoxGeometry(comfy ? 0.66 : 0.6, comfy ? 0.75 : 0.6, 0.14), backM, SEATS.length);
  const o = new T.Object3D(); SEATS.forEach((p, i) => { o.position.set(p.x, 0.22, p.z); o.updateMatrix(); seatI.setMatrixAt(i, o.matrix); o.position.set(p.x, comfy ? 0.66 : 0.6, p.z + 0.3); o.updateMatrix(); backI.setMatrixAt(i, o.matrix); });
  seatI.castShadow = backI.castShadow = true; seatG.add(seatI); seatG.add(backI);
  // the parents sit in a shuffled order; those without a seat stand along the walls
  const order = SEATS.map((_, i) => i).sort((a, b) => ((a * 7919) % 101) - ((b * 7919) % 101));
  parentSpots = order.map((i) => V(SEATS[i].x, 0.75, SEATS[i].z + 0.08));
  for (let k = 0; k < 60; k++) parentSpots.push(V(k % 2 ? -14.4 : 2.4, 1.0, -1.6 + Math.floor(k / 2) * 0.62));
  const o2 = new T.Object3D(), rng = rngFor(42), tops = [0x4f7cff, 0x86d9a6, 0xf5b942, 0xff6f91, 0x6b5b95, 0xe8e2d0, 0x2e8b8b, 0x9a6a3c], skins = [0xf1c9a5, 0xe8b48f, 0xd9a076, 0xb07a4b, 0x7a4b2b];
  parentSpots.slice(0, 200).forEach((p, i) => { o2.position.copy(p); o2.updateMatrix(); parentBody.setMatrixAt(i, o2.matrix); parentBody.setColorAt(i, new T.Color(tops[Math.floor(rng() * tops.length)])); o2.position.set(p.x, p.y + 0.5, p.z); o2.updateMatrix(); parentHead.setMatrixAt(i, o2.matrix); parentHead.setColorAt(i, new T.Color(skins[Math.floor(rng() * skins.length)])); });
  parentBody.instanceMatrix.needsUpdate = parentHead.instanceMatrix.needsUpdate = true; if (parentBody.instanceColor) parentBody.instanceColor.needsUpdate = parentHead.instanceColor.needsUpdate = true;
  parentBody.count = parentHead.count = 0;
}
function setParents(n, clap = 0) {
  n = clamp(Math.round(n), 0, Math.min(200, parentSpots.length)); parentBody.count = parentHead.count = n;
  if (clap) { const o = new T.Object3D(); for (let i = 0; i < n; i++) { const p = parentSpots[i]; o.position.set(p.x, p.y + 0.5 + Math.abs(Math.sin(G.realT * 9 + i)) * 0.12 * clap, p.z); o.updateMatrix(); parentHead.setMatrixAt(i, o.matrix); } parentHead.instanceMatrix.needsUpdate = true; parentHead.userData.clapped = true; }
  else if (parentHead.userData.clapped) { const o = new T.Object3D(); for (let i = 0; i < Math.min(200, parentSpots.length); i++) { const p = parentSpots[i]; o.position.set(p.x, p.y + 0.5, p.z); o.updateMatrix(); parentHead.setMatrixAt(i, o.matrix); } parentHead.instanceMatrix.needsUpdate = true; parentHead.userData.clapped = false; }
}

/* ---------------- the foyer: the goûter table, the snack bar ---------------- */
const TABLE = V(10.5, 0, 4.5);
const table = new T.Group(); table.position.copy(TABLE); school.add(table);
table.add(box(3.2, 0.08, 1.2, M.cream, 0, 0.78, 0)); for (const [x, z] of [[-1.5, -0.5], [1.5, -0.5], [-1.5, 0.5], [1.5, 0.5]]) table.add(box(0.08, 0.76, 0.08, M.wood, x, 0.38, z));
table.add(box(3.24, 0.3, 0.02, std(0xf6c9cf), 0, 0.68, 0.61));
const cakeMesh = cyl(0.42, 0.42, 0.22, std(0xf2c48a), -0.8, 0.93, 0, 14); table.add(cakeMesh); const icing = cyl(0.43, 0.43, 0.05, std(0xfff0f5), -0.8, 1.05, 0, 14); table.add(icing);
const crepesMesh = new T.Group(); table.add(crepesMesh);
for (let i = 0; i < 5; i++) crepesMesh.add(cyl(0.22, 0.22, 0.03, std(0xe8b86b), 1.2, 0.85 + i * 0.035, 0.25, 12));
const bottlesG = new T.Group(); table.add(bottlesG);
function showTable(frac, bottlesLeft, crepes) {
  const k = Math.max(0.001, frac); cakeMesh.scale.set(Math.sqrt(k), 1, Math.sqrt(k)); icing.scale.set(Math.sqrt(k), 1, Math.sqrt(k)); cakeMesh.visible = icing.visible = frac > 0.002;
  crepesMesh.visible = !!crepes && frac > 0.05;
  const nb = Math.ceil(bottlesLeft - 1e-6); if (nb === bottlesG.userData.n) return; bottlesG.userData.n = nb;
  bottlesG.clear(); for (let i = 0; i < nb; i++) { bottlesG.add(cyl(0.09, 0.09, 0.36, std(0xffa94d, { roughness: 0.3 }), 0.1 + (i % 6) * 0.2, 1.0, -0.25 - Math.floor(i / 6) * 0.2, 8)); bottlesG.add(cyl(0.04, 0.04, 0.08, M.white, 0.1 + (i % 6) * 0.2, 1.22, -0.25 - Math.floor(i / 6) * 0.2, 6)); }
}
const buvette = new T.Group(); buvette.position.set(5.2, 0, 6.1); school.add(buvette);
{
  buvette.add(box(2.6, 1.0, 0.7, M.wood, 0, 0.5, 0)); buvette.add(box(2.7, 0.06, 0.8, M.cream, 0, 1.03, 0));
  for (let i = 0; i < 6; i++) buvette.add(cyl(0.06, 0.06, 0.18, std([0xff6f91, 0xf5d76e, 0x86d9a6][i % 3]), -1.0 + i * 0.4, 1.15, 0, 8));
  buvette.add(box(2.6, 0.5, 0.06, std(0xc23652), 0, 2.2, 0.2)); for (const x of [-1.25, 1.25]) buvette.add(box(0.06, 1.2, 0.06, M.wood2, x, 1.6, 0.2));
}
const showBuvette = (on) => { buvette.visible = !!on; };

/* ---------------- the car park, its bays and the road ---------------- */
const parkG = new T.Group(); scene.add(parkG);
const BAYS = [];
function buildParking(width, rows) {
  parkG.clear(); BAYS.length = 0;
  const ap = new T.Mesh(new T.PlaneGeometry(31, 7), M.asphalt); ap.rotation.x = -Math.PI / 2; ap.position.set(0.5, 0.015, 12); ap.receiveShadow = true; parkG.add(ap);
  const road = new T.Mesh(new T.PlaneGeometry(90, 3.4), M.asphalt); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.012, 17.6); road.receiveShadow = true; parkG.add(road);
  for (let x = -40; x < 40; x += 3) { const l = box(1.4, 0.02, 0.1, M.line, x, 0.03, 17.6); l.castShadow = false; parkG.add(l); }
  const per = Math.floor(PARKING.lotLength / width), x0 = -14;
  for (let k = 0; k <= per; k++) { const l = box(0.1, 0.02, 4.4, M.line, x0 + k * width, 0.03, 11.4); l.castShadow = false; parkG.add(l); }
  for (let k = 0; k < per; k++) BAYS.push({ x: x0 + (k + 0.5) * width, z: 11.6, face: Math.PI });
  if (rows > 1) {
    const ap2 = new T.Mesh(new T.PlaneGeometry(31, 6), M.asphalt); ap2.rotation.x = -Math.PI / 2; ap2.position.set(0.5, 0.014, 22.2); ap2.receiveShadow = true; parkG.add(ap2);
    for (let k = 0; k <= per; k++) { const l = box(0.1, 0.02, 4.4, M.line, x0 + k * width, 0.03, 22.4); l.castShadow = false; parkG.add(l); }
    for (let k = 0; k < per; k++) BAYS.push({ x: x0 + (k + 0.5) * width, z: 22.2, face: 0 });
  }
  const walk = new T.Mesh(new T.PlaneGeometry(2.4, 1.6), M.pave); walk.rotation.x = -Math.PI / 2; walk.position.set(8, 0.02, 7.8); parkG.add(walk);
  // the gate: two posts and a barrier at the car park's entrance
  for (const z of [15.6, 16.0]) parkG.add(box(0.2, 1.2, 0.2, M.gold, 15.2, 0.6, z - 0.2));
  const treeZ = rows > 1 ? 27 : 21;
  for (let x = -20; x < 22; x += 3.1) { const tr = rngFor(Math.round(x * 13 + 100)); parkG.add(cyl(0.12, 0.16, 1.2, M.wood2, x, 0.6, treeZ)); const c = new T.Mesh(new T.IcosahedronGeometry(0.9 + tr() * 0.4, 0), std(tr() > 0.5 ? 0x6fae54 : 0x5d9a48)); c.position.set(x, 1.8, treeZ); c.castShadow = true; parkG.add(c); }
}
// the sign with the school's name
const signCv = new OffscreenCanvas(1, 1); signCv.width = 1024; signCv.height = 200;
const signTex = new T.CanvasTexture(signCv); signTex.colorSpace = T.SRGBColorSpace;
{ const g = new T.Group(); g.position.set(4.6, 0, 8.2); scene.add(g); for (const x of [-1.6, 1.6]) g.add(box(0.12, 1.6, 0.12, M.wood2, x, 0.8, 0)); const b = new T.Mesh(new T.BoxGeometry(3.6, 0.72, 0.08), [M.wood, M.wood, M.wood, M.wood, new T.MeshStandardMaterial({ map: signTex, roughness: 0.8 }), M.wood]); b.position.set(0, 1.75, 0); b.castShadow = true; g.add(b); }
function drawSign(name) {
  const g = signCv.getContext('2d'); g.fillStyle = '#2b2236'; g.fillRect(0, 0, 1024, 200); g.strokeStyle = '#e6b450'; g.lineWidth = 10; g.strokeRect(10, 10, 1004, 180);
  g.fillStyle = '#ffe7a8'; g.textAlign = 'center'; g.textBaseline = 'middle'; let size = 92;
  do { g.font = `${size}px "Playball", cursive`; size -= 4; } while (g.measureText(name).width > 940 && size > 30);
  g.fillText(name, 512, 104); signTex.needsUpdate = true;
}
// the parents' cars: they come along the road from the east, wait at the gate, park in a bay or drive on to the supermarket
const CAR_COLORS = [0xe63946, 0x4f7cff, 0xf5f5f5, 0x2b2236, 0x86d9a6, 0xf5b942, 0x9aa0a6, 0xb48cff, 0xff8fa3, 0x2e8b8b, 0xffd6b8, 0x5d5a66];
const cars = [];
function carMesh(i) {
  while (cars.length <= i) {
    const k = cars.length, g = new T.Group(), m = std(CAR_COLORS[k % CAR_COLORS.length]);
    g.add(box(1.7, 0.7, 3.8, m, 0, 0.55, 0)); g.add(box(1.5, 0.6, 2.0, M.glass, 0, 1.15, -0.2)); g.add(box(1.52, 0.08, 2.02, m, 0, 1.49, -0.2));
    for (const [x, z] of [[-0.85, 1.2], [0.85, 1.2], [-0.85, -1.2], [0.85, -1.2]]) { const w = cyl(0.32, 0.32, 0.25, M.black, x, 0.32, z, 10); w.rotation.z = Math.PI / 2; g.add(w); }
    g.visible = false; scene.add(g); cars.push(g);
  }
  return cars[i];
}
const hideCars = (from = 0) => { for (let i = from; i < cars.length; i++) cars[i].visible = false; };
const lerp = (a, b, u) => a + (b - a) * u;
// put car c on its way at time t; the list entry carries arr, through, bay (null: the car park is full)
function placeCar(g, c, t, queueAhead) {
  const ROAD = 17.6, GATE = 16.2;
  if (t < c.arr - 30) { g.visible = false; return; }
  g.visible = true; let x, z, face = -Math.PI / 2;
  if (t < c.arr) { const u = (t - (c.arr - 30)) / 30; x = lerp(40, GATE + queueAhead * 4.6, u); z = ROAD; }
  else if (t < c.through) { x = GATE + queueAhead * 4.6; z = ROAD; }
  else if (c.bay === null) { const u = Math.min(1, (t - c.through) / 30); x = lerp(GATE, -40, u); z = ROAD; if (u >= 1) { g.visible = false; return; } }
  else {
    const b = BAYS[c.bay] || BAYS[BAYS.length - 1], u = Math.min(1, (t - c.through) / 25);
    if (b.z > ROAD) { x = lerp(GATE, b.x, Math.min(1, u * 1.3)); z = u * 1.3 < 1 ? ROAD : lerp(ROAD, b.z, (u * 1.3 - 1) / 0.3); face = u * 1.3 < 1 ? Math.PI / 2 + Math.PI : 0; if (u >= 1) { x = b.x; z = b.z; face = 0; } }
    else if (u < 0.15) { x = GATE - 1; z = lerp(ROAD, 14.6, u / 0.15); face = Math.PI; }
    else if (u < 0.8) { x = lerp(GATE - 1, b.x, (u - 0.15) / 0.65); z = 14.6; face = -Math.PI / 2; }
    else { x = b.x; z = lerp(14.6, b.z, (u - 0.8) / 0.2); face = Math.PI; }
  }
  g.position.set(x, 0, z); g.rotation.y = face;
}

/* ---------------- the dressing room's furniture ---------------- */
const furnG = new T.Group(); school.add(furnG);
const tileCentre = (c, r) => V(ROOMS.dr.x0 + c + 0.5, 0, ROOMS.dr.z0 + r + 0.5);
function makePiece(id) {
  const g = new T.Group();
  if (id === 'miroir') { g.add(box(0.9, 1.8, 0.08, M.gold, 0, 1.0, -0.4)); g.add(box(0.76, 1.64, 0.1, M.glass, 0, 1.0, -0.38)); g.add(box(0.5, 0.06, 0.3, M.wood2, 0, 0.03, -0.3)); }
  if (id === 'banc') { g.add(box(1.8, 0.1, 0.45, M.wood, 0, 0.45, 0)); for (const x of [-0.8, 0.8]) g.add(box(0.08, 0.42, 0.4, M.wood2, x, 0.21, 0)); }
  if (id === 'portant') { for (const x of [-0.85, 0.85]) g.add(box(0.06, 1.6, 0.06, M.gold, x, 0.8, 0)); g.add(box(1.8, 0.05, 0.05, M.gold, 0, 1.58, 0)); g.add(box(1.9, 0.05, 0.5, M.wood2, 0, 0.03, 0)); ['#ff9ec7', '#7cc6ff', '#b48cff', '#ffb86b', '#86d9a6', '#ffffff'].forEach((c, k) => g.add(box(0.22, 0.75, 0.32, std(c), -0.6 + k * 0.24, 1.15, 0))); }
  if (id === 'chaise') { g.add(box(0.45, 0.08, 0.45, M.velvet, 0, 0.45, 0)); g.add(box(0.45, 0.5, 0.06, M.wood, 0, 0.72, -0.2)); for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) g.add(box(0.05, 0.43, 0.05, M.wood2, x, 0.21, z)); }
  if (id === 'coiffeuse') { g.add(box(1.7, 0.08, 0.55, M.pale, 0, 0.75, -0.15)); for (const x of [-0.8, 0.8]) g.add(box(0.08, 0.74, 0.5, M.pale, x, 0.37, -0.15)); g.add(box(1.5, 0.9, 0.06, M.glass, 0, 1.35, -0.4)); for (let i = 0; i < 5; i++) g.add(box(0.1, 0.1, 0.1, std(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.8 }), -0.6 + i * 0.3, 1.85, -0.38)); for (const x of [-0.45, 0.45]) g.add(cyl(0.18, 0.18, 0.45, M.velvet, x, 0.25, 0.3, 10)); }
  if (id === 'plante') { g.add(cyl(0.22, 0.17, 0.4, std(0xc96a4a), 0, 0.2, 0, 8)); const l = new T.Mesh(new T.IcosahedronGeometry(0.42, 0), std(0x5d9a48)); l.position.y = 0.75; l.castShadow = true; g.add(l); }
  if (id === 'lampe') { g.add(cyl(0.18, 0.2, 0.05, M.dark, 0, 0.03, 0, 8)); g.add(cyl(0.03, 0.03, 1.5, M.dark, 0, 0.78, 0, 6)); g.add(cyl(0.18, 0.3, 0.3, std(0xfff0d0, { emissive: 0xffd58a, emissiveIntensity: 0.6 }), 0, 1.6, 0, 8)); }
  if (id === 'tapis') { const r = box(1.9, 0.03, 1.9, std(0xc9a0dc), 0, 0.03, 0); r.castShadow = false; g.add(r); const r2 = box(1.4, 0.035, 1.4, std(0xf6c9cf), 0, 0.035, 0); r2.castShadow = false; g.add(r2); }
  if (id === 'etagere') { for (const y of [0.05, 0.45, 0.85]) g.add(box(1.8, 0.05, 0.4, M.pale, 0, y, -0.25)); for (const x of [-0.88, 0.88]) g.add(box(0.05, 0.9, 0.4, M.pale, x, 0.45, -0.25)); for (let i = 0; i < 6; i++) g.add(box(0.22, 0.1, 0.3, std(0xf2b8c6), -0.65 + i * 0.26, i < 3 ? 0.13 : 0.53, -0.25)); }
  if (id === 'pouf') g.add(cyl(0.35, 0.35, 0.4, std(0xb48cff), 0, 0.2, 0, 10));
  if (id === 'canape') { const c = std(0x7cc6ff); g.add(box(2.8, 0.45, 0.8, c, 0, 0.3, 0)); g.add(box(2.8, 0.6, 0.2, c, 0, 0.75, -0.32)); for (const x of [-1.35, 1.35]) g.add(box(0.2, 0.6, 0.8, c, x, 0.45, 0)); for (const x of [-0.9, 0, 0.9]) g.add(box(0.8, 0.12, 0.6, std(0xbfe3f5), x, 0.58, 0.05)); }
  if (id === 'paravent') { [-0.62, 0, 0.62].forEach((x, k) => { const p = box(0.6, 1.7, 0.05, std([0xf6c9cf, 0xffd6b8, 0xf6c9cf][k]), x, 0.9, (k % 2) * 0.12); p.rotation.y = (k - 1) * 0.3; g.add(p); }); }
  if (id === 'fontaine') { g.add(box(0.45, 1.0, 0.4, M.white, 0, 0.5, -0.25)); g.add(cyl(0.18, 0.18, 0.45, std(0x7cc6ff, { roughness: 0.2, transparent: true, opacity: 0.8 }), 0, 1.25, -0.25, 12)); g.add(box(0.12, 0.06, 0.08, M.dark, 0, 0.75, -0.02)); }
  if (id === 'fruits') { g.add(cyl(0.25, 0.25, 0.7, M.pale, 0, 0.35, 0, 10)); g.add(cyl(0.3, 0.18, 0.14, M.wood, 0, 0.77, 0, 10)); [[0xff4d4d, -0.1, 0], [0xf5d76e, 0.1, 0.05], [0x86d9a6, 0, -0.1], [0xffa94d, 0.05, 0.12]].forEach(([c, x, z]) => { const f = new T.Mesh(new T.IcosahedronGeometry(0.09, 0), std(c)); f.position.set(x, 0.9, z); g.add(f); }); }
  if (id === 'enceinte') { g.add(box(0.5, 0.9, 0.45, M.dark, 0, 0.45, 0)); for (const y of [0.3, 0.68]) { const s = cyl(0.15, 0.15, 0.04, M.black, 0, y, 0.23, 14); s.rotation.x = Math.PI / 2; g.add(s); } }
  if (id === 'barre') { for (const x of [-1.3, 1.3]) g.add(box(0.06, 1.05, 0.06, M.gold, x, 0.52, -0.35)); { const bar = cyl(0.035, 0.035, 2.8, M.wood, 0, 1.0, -0.3, 8); bar.rotation.z = Math.PI / 2; g.add(bar); } g.add(box(2.8, 1.6, 0.05, M.glass, 0, 1.2, -0.46)); }
  if (id === 'ventilo') { g.add(cyl(0.18, 0.2, 0.05, M.dark, 0, 0.03, 0, 8)); g.add(cyl(0.03, 0.03, 1.1, M.dark, 0, 0.58, 0, 6)); const f = new T.Group(); f.position.set(0, 1.2, 0.05); for (let i = 0; i < 3; i++) { const b = box(0.08, 0.36, 0.02, std(0x7cc6ff), 0, 0.18, 0); const p = new T.Group(); p.rotation.z = (i * Math.PI * 2) / 3; p.add(b); f.add(p); } f.userData.spin = true; g.add(f); }
  if (id === 'doudous') { g.add(box(0.8, 0.5, 0.6, std(0xf5d76e), 0, 0.25, 0)); const t = new T.Mesh(new T.IcosahedronGeometry(0.16, 0), std(0xc8935a)); t.position.set(-0.15, 0.62, 0); g.add(t); const u = new T.Mesh(new T.IcosahedronGeometry(0.14, 0), std(0xff9ec7)); u.position.set(0.18, 0.6, 0.05); g.add(u); }
  if (id === 'sieste') { const r = box(1.9, 0.12, 1.9, std(0xbfe3f5), 0, 0.06, 0); r.castShadow = false; g.add(r); for (const [x, z, c] of [[-0.5, -0.6, 0xff9ec7], [0.4, -0.6, 0xf5d76e], [0, 0.4, 0xb48cff]]) g.add(box(0.6, 0.18, 0.4, std(c), x, 0.2, z)); }
  if (id === 'horloge') { { const face = cyl(0.3, 0.3, 0.06, M.white, 0, 1.8, -0.45, 20); face.rotation.x = Math.PI / 2; g.add(face); } g.add(box(0.03, 0.2, 0.02, M.dark, 0, 1.86, -0.41)); }
  return g;
}
function placePieceMesh(f, g) { const fp = footprint(f); g.position.set(ROOMS.dr.x0 + f.c + fp.w / 2, 0.03, ROOMS.dr.z0 + f.r + fp.d / 2); g.rotation.y = -f.rot * Math.PI / 2; }
const selRing = new T.Mesh(new T.RingGeometry(0.75, 0.9, 32), new T.MeshBasicMaterial({ color: 0xf5b942 })); selRing.rotation.x = -Math.PI / 2; selRing.visible = false; scene.add(selRing);
const badRingMat = new T.MeshBasicMaterial({ color: 0xff5a5a });
function showFurniture() {
  furnG.clear(); const cols = G.S.school.logeCols;
  for (const f of G.S.school.furniture) {
    const g = makePiece(f.id); placePieceMesh(f, g); g.userData.f = f; furnG.add(g);
    if (PIECES[f.id].wall && !againstWall(f, cols)) { const r = new T.Mesh(new T.RingGeometry(0.35, 0.48, 24), badRingMat); r.rotation.x = -Math.PI / 2; r.position.set(g.position.x, 0.07, g.position.z); furnG.add(r); }
  }
  const s = G.selected;
  if (s && G.S.school.furniture.includes(s)) { const fp = footprint(s); selRing.visible = true; selRing.position.set(ROOMS.dr.x0 + s.c + fp.w / 2, 0.06, ROOMS.dr.z0 + s.r + fp.d / 2); selRing.scale.setScalar(Math.max(fp.w, fp.d) * 0.75); } else selRing.visible = false;
}
function spinFans(dt) { furnG.traverse((o) => { if (o.userData.spin) o.rotation.z += dt * 12; }); }
const ghost = { g: null, f: null };
const TONES = { ok: 0xffffff, warn: 0xffd36b, bad: 0xff6f6f };
function setGhost(f, tone = 'ok') {
  if (ghost.g) { scene.remove(ghost.g); ghost.g = null; } ghost.f = f; ghost.tone = tone; if (!f) return;
  ghost.g = makePiece(f.id);
  ghost.g.traverse((o) => { if (o.isMesh) { o.material = new T.MeshStandardMaterial({ color: TONES[tone], transparent: true, opacity: 0.55 }); o.castShadow = false; } });
  placePieceMesh(f, ghost.g); scene.add(ghost.g);
}

/* ---------------- rooms and doors: the dancers walk through doors ---------------- */
const roomAt = (x, z) => (z > 7 ? 'park' : x >= 3 ? (z < -1 ? 'dr' : 'foyer') : z < -3 ? (x >= 0 ? 'wing' : 'stage') : 'hall');
const DOORS = { 'park|foyer': V(8, 0, 7), 'foyer|dr': V(7.75, 0, -1), 'dr|wing': V(3, 0, -7.25), 'wing|stage': V(-0.2, 0, -6), 'foyer|hall': V(3, 0, 3.75), 'hall|stage': V(-6, 0, -2.6) };
const ADJ = {}; for (const k of Object.keys(DOORS)) { const [a, b] = k.split('|'); (ADJ[a] ||= []).push(b); (ADJ[b] ||= []).push(a); }
function route(from, to) {
  const a = roomAt(from.x, from.z), b = roomAt(to.x, to.z); if (a === b) return [to.clone()];
  const prev = { [a]: null }, q = [a]; while (q.length) { const r = q.shift(); if (r === b) break; for (const n of ADJ[r] || []) if (!(n in prev)) { prev[n] = r; q.push(n); } }
  if (!(b in prev)) return [to.clone()];
  const rooms = []; for (let r = b; r; r = prev[r]) rooms.unshift(r);
  const pts = []; for (let i = 0; i < rooms.length - 1; i++) pts.push((DOORS[`${rooms[i]}|${rooms[i + 1]}`] || DOORS[`${rooms[i + 1]}|${rooms[i]}`]).clone());
  pts.push(to.clone()); return pts;
}

/* ---------------- the camera: four turns, two heights, pan and zoom; a change of view is a cut ---------------- */
let camSnap = true, lastFrame = null;
const frameBand = { offset: 0, top: 0, under: 0 };
const camPos = V(20, 20, 20), camLook = V(0, 0, 0), fitCam = new T.PerspectiveCamera();
function viewSpec() {
  view.yaw = Math.PI / 4 + view.rot * Math.PI / 2;
  if (view.mode === 'stage') return { yaw: 0, pitch: 0.16, pts: [V(-12.4, STAGE.h, -3), V(0.4, STAGE.h, -3), V(-12.4, STAGE.h + 4.2, -3.1), V(0.4, STAGE.h + 4.2, -3.1), V(-6, STAGE.h, -8.5)], panR: 3 };
  if (view.mode === 'podium') return { yaw: 0, pitch: 0.12, pts: [V(-11.6, STAGE.h, -3.4), V(-0.4, STAGE.h, -3.4), V(-11.6, STAGE.h + 2.0, -3.8), V(-0.4, STAGE.h + 2.0, -3.8)], panR: 3 };
  const pitch = view.high ? 1.0 : 0.62;
  if (view.mode === 'park') { const x1 = ROOMS.park.x1, z1 = G.S.school.upgrades.rangee ? 25 : 18.5; return { yaw: 0, pitch: view.high ? 1.0 : 0.75, pts: [V(-15, 0, 8.5), V(x1, 0, 8.5), V(-15, 0, z1), V(x1, 0, z1), V(4.6, 2.5, 8.2)], panR: 8 }; }
  if (view.mode === 'room' && G.pickedRoom) { const r = ROOMS[G.pickedRoom]; return { yaw: view.yaw, pitch, pts: [V(r.x0, 0, r.z0), V(r.x1, 0, r.z0), V(r.x0, 0, r.z1), V(r.x1, 0, r.z1), V((r.x0 + r.x1) / 2, 2, (r.z0 + r.z1) / 2)], panR: 4 }; }
  return { yaw: view.yaw, pitch, pts: [V(-15, 0, -9), V(ROOMS.dr.x1, 0, -9), V(-15, 0, 15.5), V(ROOMS.park.x1, 0, 15.5), V(-15, 3, -9), V(ROOMS.dr.x1, 3, -9), V(-6, 5, -3)], panR: 12, big: true };
}
function usable() { const m = 0.04, f = frameBand; return { x0: -1 + m, x1: (f.offset ? 1 - 2 * f.offset / SIZE.w : 1) - m, y0: -1 + 2 * f.under / SIZE.h + m, y1: 1 - 2 * f.top / SIZE.h - m }; }
function fitDistance(spec, centre) {
  fitCam.projectionMatrix.copy(camera.projectionMatrix); fitCam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  const dir = V(Math.sin(spec.yaw) * Math.cos(spec.pitch), Math.sin(spec.pitch), Math.cos(spec.yaw) * Math.cos(spec.pitch)), u = usable(), p = V(0, 0, 0);
  const fits = (dd) => { fitCam.position.copy(centre).addScaledVector(dir, dd); fitCam.lookAt(centre); fitCam.updateMatrixWorld(); for (const q of spec.pts) { p.copy(q).project(fitCam); if (p.z > 1 || p.x < u.x0 || p.x > u.x1 || p.y < u.y0 || p.y > u.y1) return false; } return true; };
  let lo = 2, hi = 400; for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  const floor = spec.big ? 20 : 4; return { dist: Number.isFinite(hi) && hi > floor ? hi : floor * 2, dir };
}
function placeCamera(dt) {
  const spec = viewSpec(), b = new T.Box3().setFromPoints(spec.pts), centre = b.getCenter(V(0, 0, 0));
  const { dist, dir } = fitDistance(spec, centre), right = V(Math.cos(spec.yaw), 0, -Math.sin(spec.yaw)), fwd = V(-Math.sin(spec.yaw), 0, -Math.cos(spec.yaw));
  const look = centre.clone().addScaledVector(right, view.pan.x).addScaledVector(fwd, view.pan.y), pos = look.clone().addScaledVector(dir, dist / view.zoom);
  lastFrame = { spec, dist };
  const k = camSnap ? 1 : 1 - Math.exp(-dt * 8), snapped = camSnap; camSnap = false;
  camPos.lerp(pos, k); camLook.lerp(look, k); camera.position.copy(camPos); camera.lookAt(camLook);
  wallTargets(); stepWalls(dt, snapped);
}
const snapCam = () => { camSnap = true; };
function cutTo(mode) { if (mode) view.mode = mode; camSnap = true; view.pan.set(0, 0); view.zoom = 1; }
function panBy(dx, dy) {
  if (!lastFrame) return; const spec = lastFrame.spec, w = 2 * lastFrame.dist / view.zoom * Math.tan(T.MathUtils.degToRad(camera.fov / 2)) / SIZE.h;
  view.pan.x -= dx * w; view.pan.y += dy * w / Math.max(0.5, Math.sin(spec.pitch)); if (view.pan.length() > spec.panR) view.pan.setLength(spec.panR);
}
const zoomBy = (f) => { view.zoom = clamp(view.zoom * f, 0.8, 4); };
function resizeRenderer(sheetW, under, top) {
  renderer.setSize(SIZE.w, SIZE.h, false); camera.aspect = SIZE.w / SIZE.h;
  Object.assign(frameBand, { offset: sheetW, under, top });
  const sh = (under - top) / 2;
  if (sheetW) camera.setViewOffset(SIZE.w + sheetW, SIZE.h, sheetW, 0, SIZE.w, SIZE.h);
  else if (Math.abs(sh) > 1) camera.setViewOffset(SIZE.w, SIZE.h + 2 * Math.abs(sh), 0, sh > 0 ? 2 * sh : 0, SIZE.w, SIZE.h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix(); camSnap = true;
}

/* ---------------- pointing ---------------- */
const ray = new T.Raycaster(), ndc = new T.Vector2(), floorPlane = new T.Plane(V(0, 1, 0), 0);
function aim(x, y) { const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
function groundAt(x, y) { aim(x, y); const p = V(0, 0, 0); return ray.ray.intersectPlane(floorPlane, p) ? p : null; }
function tileAt(p) { const D = ROOMS.dr; if (!p || p.x < D.x0 || p.x > D.x1 || p.z < D.z0 || p.z > D.z1) return null; return { c: Math.floor(p.x - D.x0), r: Math.floor(p.z - D.z0) }; }
function pieceAt(x, y) { aim(x, y); const hit = ray.intersectObjects(furnG.children, true)[0]; if (!hit) return null; let o = hit.object; while (o && !o.userData.f) o = o.parent; return o ? o.userData.f : null; }
const project = (x, y, z) => { const v = V(x, y, z).project(camera); return { x: (v.x + 1) / 2 * SIZE.w, y: (1 - v.y) / 2 * SIZE.h, behind: v.z > 1 }; };
const DR_ROWS = LOGE.rows;


  const out = {};
  for (const [k, get] of Object.entries({ RULES: () => RULES, V: () => V, canvas: () => canvas, renderer: () => renderer, scene: () => scene, camera: () => camera, std: () => std, box: () => box, cyl: () => cyl, floorMat: () => floorMat, M: () => M, ROOMS: () => ROOMS, STAGE: () => STAGE, floorY: () => floorY, stageToWorld: () => stageToWorld, school: () => school, setStageFloor: () => setStageFloor, drawStageTape: () => drawStageTape, WALLSEG: () => WALLSEG, buildLoge: () => buildLoge, wallMode: () => wallMode, setWallMode: () => setWallMode, view: () => view, curtain: () => curtain, showBackdrop: () => showBackdrop, drawClock: () => drawClock, buildLights: () => buildLights, stepLights: () => stepLights, SEATS: () => SEATS, buildSeats: () => buildSeats, setParents: () => setParents, TABLE: () => TABLE, showTable: () => showTable, showBuvette: () => showBuvette, BAYS: () => BAYS, buildParking: () => buildParking, drawSign: () => drawSign, cars: () => cars, carMesh: () => carMesh, hideCars: () => hideCars, placeCar: () => placeCar, furnG: () => furnG, tileCentre: () => tileCentre, makePiece: () => makePiece, placePieceMesh: () => placePieceMesh, showFurniture: () => showFurniture, spinFans: () => spinFans, ghost: () => ghost, setGhost: () => setGhost, roomAt: () => roomAt, route: () => route, frameBand: () => frameBand, viewSpec: () => viewSpec, usable: () => usable, placeCamera: () => placeCamera, snapCam: () => snapCam, cutTo: () => cutTo, panBy: () => panBy, zoomBy: () => zoomBy, resizeRenderer: () => resizeRenderer, groundAt: () => groundAt, tileAt: () => tileAt, pieceAt: () => pieceAt, project: () => project, DR_ROWS: () => DR_ROWS })) Object.defineProperty(out, k, { get, enumerable: true });
  return out;
}
exports.create = create;
