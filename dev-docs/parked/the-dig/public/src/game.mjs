// The Dig. Dig down into an infinite deep; find the rooms Claude planted last night; answer the stone to wake the
// portal; go through to a secret world made for today; bring treasure home to the case. Nothing punishes: the
// time bars only tell you, dying costs nothing, and every session can be the first or the fifth of the day.
import * as THREE from 'three';
import { B, BLOCKS, paintAtlas } from './blocks.mjs';
import { World } from './world.mjs';
import { caveGenerator, roomParts } from './gen-cave.mjs';
import { secretGenerator } from './gen-secret.mjs';
import { Player } from './player.mjs';
import { makeInput, touchDevice } from './input.mjs';
import { Mobs } from './mobs.mjs';
import { Hand, SLOTS } from './weapons.mjs';
import { makeHud } from './hud.mjs';
import { sfx, unlockAudio, setHum, setMuted, isMuted } from './audio.mjs';
import { hashString } from './noise.mjs';

const Q = new URLSearchParams(location.search);
const LITE = Q.has('lite');
const DTMAX = Number(Q.get('dtmax')) || 0.05;
const LOCAL = 'the-dig-save-v1';
const PENDING = 'the-dig-pending-answers';
const SKY = 0x9cc8e8;
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = Q.get('date') || localDate();

// ── the page ──
const renderer = new THREE.WebGLRenderer({ antialias: !touchDevice && !LITE, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touchDevice ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
document.getElementById('view').append(renderer.domElement);
if (touchDevice) document.body.classList.add('touch');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 500);
scene.add(camera);
scene.fog = new THREE.Fog(0x000000, 10, 60);
scene.background = new THREE.Color(SKY);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});
const RADIUS = LITE ? 2 : touchDevice ? 3 : 4;
const VRADIUS = LITE ? 1 : 2;

async function api(path, opts) {
  try {
    const r = await fetch(path, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
const post = (path, body) => api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const readLocal = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeLocal = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

// ── the save, the day ──
const startNote = document.getElementById('startNote');
const serverSave = await api('/api/save');
const localSave = readLocal(LOCAL, null);
let save = [serverSave, localSave].filter((s) => s?.seed).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];
if (Q.has('fresh') || !save)
  save = { v: 1, seed: Number(Q.get('seed')) || ((Math.random() * 1e9) | 0), edits: [], player: null, rooms: [], lastTorch: null, pack: null };
const pack = Object.assign({ torches: 24, rubble: 0, coal: 0, iron: 0, flint: 0, crystal: 0, rounds: 12, arrows: 16 }, save.pack ?? {});

let day = await api(`/api/today?date=${TODAY}`);
if (!day?.plants) day = { date: TODAY, source: 'sample', ...(await (await fetch('sample-plants.json')).json()) };
const dayKey = day.source === 'sample' ? 'sample' : day.date;
const answered = new Map(); // `${date}|${plantId}` → text
for (const a of (await api(`/api/answers`)) ?? []) answered.set(`${a.date}|${a.plantId}`, a.text);
// Answers carved while the server was out of reach go now.
const pending = readLocal(PENDING, []);
for (const a of pending) answered.set(`${a.date}|${a.plantId}`, a.text);
if (pending.length) {
  const left = [];
  for (const a of pending) if (!(await post('/api/answer', a))) left.push(a);
  writeLocal(PENDING, left);
}

// ── the cave ──
const cave = caveGenerator(save.seed);
const rooms = save.rooms ?? [];
for (const r of rooms) if (answered.has(`${r.date}|${r.plantId}`)) r.live = true;
const startAt = save.player?.pos ?? cave.spawn();
for (const plant of day.plants) {
  if (rooms.some((r) => r.date === dayKey && r.plantId === plant.id)) continue;
  const at = cave.placeRoom({ x: startAt.x, y: startAt.y, z: startAt.z }, hashString(dayKey + plant.id));
  rooms.push({ ...at, date: dayKey, plantId: plant.id, plant, live: answered.has(`${dayKey}|${plant.id}`) });
}
cave.structures.push(...rooms);
let atlas = paintAtlas();
const caveWorld = new World({ generator: cave, scene, texture: atlas, radius: RADIUS, vradius: VRADIUS });
caveWorld.loadEdits(save.edits);
let world = caveWorld;

const player = new Player(camera);
player.pos.set(startAt.x, startAt.y, startAt.z);
player.yaw = save.player?.yaw ?? 0;
player.pitch = save.player?.pitch ?? 0;
player.health = save.player?.health ?? 20;
let lastTorch = save.lastTorch;

const mobs = new Mobs(scene, world);
mobs.caveSpawning = !Q.has('peaceful');
mobs.surface = cave.height;
const hand = new Hand(camera, scene, world, mobs);

// ── the HUD and the input ──
const hud = makeHud({
  onSlot: (i) => {
    hand.select(i);
    hud.slots(hand.slot, pack);
  },
  onMenu: () => openMenu()
});
hud.lockChanged = (locked) => {
  if (!locked && started && !hud.panelOpen() && !touchDevice) openMenu();
};
hud.unlockAudio = unlockAudio;
const I = makeInput(renderer.domElement, hud);
const freeMouse = () => {
  I.release();
  if (document.pointerLockElement) document.exitPointerLock();
};
const relock = () => {
  if (!touchDevice) renderer.domElement.requestPointerLock?.();
};

// ── portals: a swirl where the opening is ──
const swirlMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: 0 } },
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform float t; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float r = length(p); float a = atan(p.y, p.x);
      float s = sin(a * 3.0 + r * 22.0 - t * 3.2) * 0.5 + 0.5;
      vec3 c = mix(vec3(0.32, 0.12, 0.62), vec3(0.88, 0.66, 1.0), s) + (0.5 - r) * 0.5;
      gl_FragColor = vec4(c, 0.93); }`
});
const swirls = new Map();
function showSwirl(key, centre) {
  if (swirls.has(key)) return;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), swirlMat);
  m.position.set(...centre);
  scene.add(m);
  swirls.set(key, m);
}
function clearSwirls() {
  for (const m of swirls.values()) scene.remove(m);
  swirls.clear();
}
function caveSwirls() {
  for (const r of rooms) if (r.live) showSwirl(`${r.date}|${r.plantId}`, roomParts(r).portalCentre);
}
caveSwirls();

// ── state ──
let started = false;
let secret = null; // { gen, world, room, treasures, found }
let digTarget = null, digT = 0, digSound = 0;
let active = Number(Q.get('minutes') || 0) * 60;
const warned = new Set();
let saveTimer = 0, stepT = 0, lavaT = 0;
let trophies = (await api('/api/trophies')) ?? readLocal('the-dig-trophies', []);
const clock = new THREE.Clock();

const RECIPES = [
  { makes: '4 torches', from: '1 coal', can: (p) => p.coal >= 1, run: (p) => { p.coal--; p.torches += 4; } },
  { makes: '6 rifle rounds', from: '1 iron + 1 coal', can: (p) => p.iron >= 1 && p.coal >= 1, run: (p) => { p.iron--; p.coal--; p.rounds += 6; } },
  { makes: '3 arrows', from: '1 flint (dig gravel)', can: (p) => p.flint >= 1, run: (p) => { p.flint--; p.arrows += 3; } }
];

function openMenu() {
  if (!started) return;
  I.release();
  if (document.pointerLockElement) document.exitPointerLock();
  const plants = rooms
    .filter((r) => r.date === dayKey)
    .map((r) => ({ title: r.plant.title, answered: r.live }));
  hud.menu(
    [
      { label: 'Keep digging', run: () => { hud.close(); relock(); } },
      { label: 'Craft', run: () => hud.craft(pack, RECIPES, craft) },
      { label: 'Trophy case', run: () => hud.trophies(trophies) },
      { label: isMuted() ? 'Sound on' : 'Sound off', run: () => { setMuted(!isMuted()); openMenu(); } },
      { label: 'Controls', run: () => hud.help(touchDevice) }
    ],
    { ...day, plants }
  );
}
function craft(r) {
  if (!r.can(pack)) return;
  r.run(pack);
  sfx.place();
  hud.slots(hand.slot, pack);
}

function saveNow() {
  const inCave = !secret;
  const pos = inCave ? player.pos : new THREE.Vector3(...roomParts(secret.room).standIn);
  save = {
    v: 1, seed: save.seed, savedAt: Date.now(), edits: caveWorld.editsList(), rooms, lastTorch, pack,
    player: { pos: { x: pos.x, y: pos.y, z: pos.z }, yaw: player.yaw, pitch: player.pitch, health: player.health }
  };
  writeLocal(LOCAL, save);
  post('/api/save', save);
}
addEventListener('visibilitychange', () => {
  if (document.hidden && started) saveNow();
});

// ── what the crosshair is on ──
function lookTarget() {
  return world.raycast(player.eye(), player.forward(), 5);
}
function roomAtLectern(t) {
  return rooms.find((r) => roomParts(r).lectern.every((v, i) => v === [t.x, t.y, t.z][i]));
}
function nearestTreasure() {
  if (!secret) return null;
  let best = null;
  const eye = player.eye();
  for (const tr of secret.treasures) {
    if (tr.taken) continue;
    const d = tr.mesh.position.distanceTo(eye);
    if (d < 3 && (!best || d < best.d)) best = { tr, d };
  }
  return best?.tr ?? null;
}

// ── the stone and the portal ──
function readStone(room) {
  I.release();
  if (document.pointerLockElement) document.exitPointerLock();
  const k = `${room.date}|${room.plantId}`;
  hud.lectern(room.plant, { answered: room.live, previous: answered.get(k), date: room.date === 'sample' ? TODAY : room.date, source: room.date === 'sample' ? 'sample' : 'nightly' }, async (text) => {
    const row = { date: room.date === 'sample' ? 'sample' : room.date, plantId: room.plantId, title: room.plant.title, text };
    answered.set(k, text);
    if (!(await post('/api/answer', row))) writeLocal(PENDING, [...readLocal(PENDING, []), row]);
    if (!room.live) {
      room.live = true;
      for (const [x, y, z] of roomParts(room).portal) caveWorld.set(x, y, z, B.PORTAL, { persist: false });
      caveSwirls();
      sfx.portal();
      setTimeout(() => sfx.chime(), 400);
      hud.toast('The portal woke up.');
    } else hud.toast('Carved.');
    saveNow();
  });
}

function enterSecret(room) {
  const plant = room.plant;
  const w = plant.world ?? { name: plant.title, theme: ['forest', 'field', 'tundra', 'desert', 'jungle', 'cavern'][hashString(plant.id) % 6] };
  const gen = secretGenerator(w, plant.id);
  saveNow();
  caveWorld.group.visible = false;
  mobs.clear();
  hand.clearWorldBits();
  clearSwirls();
  // Open country: draw it one chunk further than the cave.
  const sworld = new World({ generator: gen, scene, texture: paintAtlas(gen.palette, hashString(plant.id)), radius: LITE ? RADIUS : RADIUS + 1, vradius: VRADIUS });
  world = sworld;
  mobs.world = sworld;
  hand.world = sworld;
  mobs.caveSpawning = false;
  player.pos.set(gen.spawn.x, gen.spawn.y, gen.spawn.z);
  player.vel.set(0, 0, 0);
  player.fallFrom = null; // a fall in one world never lands in the other
  player.yaw = Math.PI;
  player.pitch = 0;
  showSwirl('home', gen.portalCentre);
  // Treasure: everything not already in the case.
  const treasures = [];
  const place = (t, at) => {
    if (!t || trophies.some((x) => x.id === t.id)) return;
    const g = new THREE.Group();
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: new THREE.Color(w.accent ?? '#e8b04a') }));
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    g.add(gem, core);
    g.position.set(...at);
    scene.add(g);
    treasures.push({ t, mesh: g, base: at[1], taken: false });
  };
  for (const p of gen.pois) place(p.treasure, p.item);
  for (const s of gen.strays) place(s.treasure, [s.x + 0.5, s.y + 0.8, s.z + 0.5]);
  // Who lives here.
  const kind = gen.enemies;
  for (const p of gen.pois) {
    if (kind === 'bugs' && p.type === 'station') for (let i = 0; i < 6; i++) mobs.add('bug', p.x + (Math.random() - 0.5) * 8, p.y + 1, p.z + (Math.random() - 0.5) * 6);
    if (kind === 'robots' && p.type !== 'station') for (let i = 0; i < 2; i++) mobs.add('robot', p.x + 3 + i, p.y + 1, p.z + 3);
    if (kind === 'robots' && p.type === 'station') mobs.add('robot', p.x + 2, p.y + 1, p.z);
    if (kind === 'bugs' && p.type !== 'station') mobs.add('bug', p.x + 3, p.y + 1, p.z + 3);
  }
  if (kind === 'beasts')
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, d = 25 + Math.random() * 30;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      mobs.add('beast', x, gen.height(Math.floor(x), Math.floor(z)) + 1.1, z);
    }
  secret = { gen, world: sworld, room, treasures, found: [], since: performance.now() };
  scene.background = new THREE.Color(gen.skyColor);
  scene.fog.color.set(gen.skyColor);
  sfx.portal();
  hud.toast(`${gen.name}`);
  hud.toast(`Through the portal from “${plant.title}”`);
}

function leaveSecret() {
  const s = secret;
  for (const tr of s.treasures) scene.remove(tr.mesh);
  mobs.clear();
  hand.clearWorldBits();
  clearSwirls();
  s.world.dispose();
  secret = null;
  world = caveWorld;
  caveWorld.group.visible = true;
  mobs.world = caveWorld;
  hand.world = caveWorld;
  mobs.caveSpawning = !Q.has('peaceful');
  caveSwirls();
  const p = roomParts(s.room);
  player.pos.set(...p.standIn);
  player.vel.set(0, 0, 0);
  player.fallFrom = null;
  player.yaw = Math.PI;
  scene.background.set(0x000000);
  scene.fog.color.set(0x000000);
  hud.vitals(player.health, player.maxHealth, cave.height(Math.floor(player.pos.x), Math.floor(player.pos.z)) - player.pos.y);
  sfx.portal();
  I.release();
  if (document.pointerLockElement) document.exitPointerLock();
  saveNow();
  hud.home({ world: s.gen.name, found: s.found, minutes: Math.round(active / 60) }, () => {
    started = false;
    showStart('The cave will be here. Come back any time.', 'Keep digging');
  }, () => relock());
}

function takeTreasure(tr) {
  tr.taken = true;
  scene.remove(tr.mesh);
  const t = { ...tr.t, world: secret.gen.name, plant: secret.room.plant.title, date: TODAY, at: new Date().toISOString() };
  trophies = [...trophies, t];
  secret.found.push(t);
  writeLocal('the-dig-trophies', trophies);
  post('/api/trophies', { trophy: t });
  sfx.chime();
  hud.toast(`Found: ${t.name}`);
}

// ── dig, place, use ──
function breakBlock(t) {
  const b = BLOCKS[t.id];
  world.set(t.x, t.y, t.z, B.AIR);
  sfx.break();
  hand.burst(new THREE.Vector3(t.x + 0.5, t.y + 0.5, t.z + 0.5), 0x8a7a6a, 8);
  if (b.drop === 'crate') {
    const loot = [['coal', 2 + Math.floor(Math.random() * 3)], [Math.random() < 0.5 ? 'rounds' : 'arrows', 4 + Math.floor(Math.random() * 5)], ['torches', Math.random() < 0.5 ? 6 : 0]];
    const got = loot.filter(([, n]) => n > 0);
    for (const [k, n] of got) pack[k] += n;
    hud.toast(`Crate: ${got.map(([k, n]) => `${n} ${k}`).join(', ')}`);
  } else if (b.drop === 'gravel') {
    if (Math.random() < 0.4) {
      pack.flint++;
      hud.toast('+1 flint');
    } else pack.rubble++;
  } else if (b.drop === 'torch') pack.torches++;
  else if (b.drop === 'rubble') pack.rubble++;
  else if (b.drop) {
    pack[b.drop] = (pack[b.drop] ?? 0) + 1;
    hud.toast(`+1 ${b.drop}`);
  }
  hud.slots(hand.slot, pack);
}

function place(what) {
  const t = lookTarget();
  if (!t) return;
  const x = t.x + t.n[0], y = t.y + t.n[1], z = t.z + t.n[2];
  const here = world.get(x, y, z);
  if (here !== B.AIR && here !== B.LAVA) return;
  if (what === 'torch') {
    if (pack.torches <= 0) return hud.toast('No torches. Craft them from coal (menu).');
    if (here === B.LAVA) return;
    world.set(x, y, z, B.TORCH);
    pack.torches--;
    if (world === caveWorld) lastTorch = [x, y, z];
    sfx.torch();
  } else {
    if (pack.rubble <= 0) return hud.toast('No rubble. Dig some rock.');
    // Not inside the player.
    const p = player.pos;
    if (x + 1 > p.x - 0.3 && x < p.x + 0.3 && z + 1 > p.z - 0.3 && z < p.z + 0.3 && y + 1 > p.y && y < p.y + 1.8) return;
    world.set(x, y, z, B.COBBLE);
    pack.rubble--;
    sfx.place();
  }
  hud.slots(hand.slot, pack);
}

function respawn() {
  let at = null;
  if (secret) at = [secret.gen.spawn.x, secret.gen.spawn.y, secret.gen.spawn.z];
  else if (lastTorch && world.get(...lastTorch) === B.TORCH) at = [lastTorch[0] + 0.5, lastTorch[1], lastTorch[2] + 0.5];
  else {
    const s = cave.spawn();
    at = [s.x, s.y, s.z];
  }
  player.pos.set(...at);
  player.vel.set(0, 0, 0);
  player.health = player.maxHealth;
  player.fallFrom = null;
  hud.toast(secret ? 'You came round at the landing.' : lastTorch ? 'You came round by your last torch. Everything is still in your pack.' : 'You came round at the surface. Everything is still in your pack.');
}

const hooks = {
  hitMarker: (h) => hud.hitMarker(h),
  flash: () => hud.flash(),
  toast: (t) => hud.toast(t),
  killed: (m) => {
    mobs.remove(m);
    const drop = { crawler: ['coal', 0.4], stalker: ['iron', 0.5], robot: ['rounds', 0.6], bug: ['arrows', 0.25], beast: ['arrows', 0.3] }[m.kind];
    if (drop && Math.random() < drop[1]) {
      const n = drop[0] === 'rounds' ? 3 : drop[0] === 'arrows' ? 2 : 1;
      pack[drop[0]] += n;
      hud.toast(`+${n} ${drop[0]}`);
      hud.slots(hand.slot, pack);
    }
  },
  bite: (n) => {
    player.hurt(n, performance.now() / 1000);
    sfx.hurt();
    hud.hurt();
  },
  growl: (d) => sfx.growl(d)
};

// ── the frame ──
function frame() {
  const dt = Math.min(clock.getDelta(), DTMAX);
  const now = performance.now() / 1000;
  swirlMat.uniforms.t.value = now;
  const paused = !started || hud.panelOpen();
  if (!paused) step(dt, now);
  else {
    I.consume();
    player.place();
  }
  world.update(player.pos, paused ? 12 : touchDevice ? 4 : 6);
  renderer.render(scene, camera);
}

function step(dt, now) {
  I.frame(hand.weapon());
  if (I.slot !== null) hand.select(I.slot);
  if (I.wheel) hand.select(hand.slot + I.wheel);
  if (I.slot !== null || I.wheel) hud.slots(hand.slot, pack);
  if (I.craft || I.trophies) {
    freeMouse();
    if (I.craft) hud.craft(pack, RECIPES, craft);
    else hud.trophies(trophies);
    return I.consume();
  }

  const aiming = hand.id === 'rifle' && I.aim;
  const { fell } = player.update(dt, I, world, { aiming });
  if (fell > 0) {
    player.hurt(fell, now);
    sfx.hurt();
    hud.hurt();
  }
  if (player.inLava) {
    lavaT += dt;
    if (lavaT > 0.5) {
      lavaT = 0;
      player.hurt(2, now);
      sfx.hurt();
      hud.hurt();
    }
  }
  if (player.onGround && Math.hypot(player.vel.x, player.vel.z) > 1) {
    stepT += dt * Math.hypot(player.vel.x, player.vel.z);
    if (stepT > 1.9) {
      stepT = 0;
      sfx.step();
    }
  }
  camera.fov += ((aiming ? 22 : 72) - camera.fov) * Math.min(1, dt * 14);
  camera.updateProjectionMatrix();
  hud.scope(aiming && camera.fov < 30);

  // Dig (with the pick or rubble in hand), place, fire.
  const target = lookTarget();
  const weapon = hand.weapon();
  let digging = false;
  if (!weapon && I.primary && target && Number.isFinite(BLOCKS[target.id].hard)) {
    digging = true;
    if (!digTarget || digTarget.x !== target.x || digTarget.y !== target.y || digTarget.z !== target.z) {
      digTarget = target;
      digT = 0;
    }
    digT += dt / BLOCKS[target.id].hard;
    digSound -= dt;
    if (digSound <= 0) {
      digSound = 0.24;
      sfx.dig(Math.min(1, BLOCKS[target.id].hard / 1.5));
    }
    if (digT >= 1) {
      breakBlock(target);
      digTarget = null;
      digT = 0;
    }
  } else {
    digTarget = null;
    digT = 0;
  }
  hud.crack(digging ? Math.min(1, digT) : 0);
  if (I.place) {
    if (I.place === 'torch') place('torch');
    else if (weapon) {
      // Right mouse with a weapon is aim, not place.
    } else place(hand.id === 'rubble' ? 'rubble' : 'torch');
  }
  if (weapon && I.primaryDown) {
    const msg = hand.trigger(pack, player.eye(), player.forward(), aiming, hooks);
    if (msg) hud.toast(msg);
    hud.slots(hand.slot, pack);
  }
  if (weapon && I.primaryUp) {
    const msg = hand.loose(pack, player.eye(), player.forward(), (I.upAt ?? 0) - (I.downAt ?? 0));
    if (msg) hud.toast(msg);
    hud.slots(hand.slot, pack);
  }

  // What can be used here.
  let use = null, useLabel = null;
  if (target?.id === B.LECTERN) {
    if (!secret) {
      const room = roomAtLectern(target);
      if (room) [use, useLabel] = [() => readStone(room), 'Read'];
    } else {
      const poi = secret.gen.pois.find((p) => p.lectern && p.lectern.every((v, i) => v === [target.x, target.y, target.z][i]));
      if (poi) [use, useLabel] = [() => (I.release(), document.pointerLockElement && document.exitPointerLock(), hud.note(poi.note, secret.gen.name)), 'Read'];
    }
  }
  const tr = nearestTreasure();
  if (tr) [use, useLabel] = [() => takeTreasure(tr), 'Take'];
  hud.context({ weapon, use: useLabel });
  // On the phone the Use button carries the verb; the prompt only names a treasure.
  hud.prompt(useLabel ? (touchDevice ? (tr ? tr.t.name : null) : `E — ${useLabel.toLowerCase()} ${tr ? tr.t.name : 'the stone'}`) : null);
  if (I.use && use) use();

  // The portals.
  const inPortal = player.touching(world, B.PORTAL);
  if (inPortal) {
    if (secret) return leaveSecret(), I.consume();
    const room = rooms.find((r) => r.live && roomParts(r).portal.some((c) => c[0] === inPortal[0] && c[1] === inPortal[1] && c[2] === inPortal[2]));
    if (room) return enterSecret(room), I.consume();
  }

  mobs.update(dt, player, now, hooks);
  hand.update(dt, I, { digging, aiming, pack, player, hooks });
  if (secret)
    for (const t of secret.treasures) {
      if (t.taken) continue;
      t.mesh.rotation.y += dt * 1.4;
      t.mesh.position.y = t.base + Math.sin(now * 2 + t.base) * 0.12;
    }

  // The hum of the nearest room that is still waiting for an answer.
  if (!secret) {
    let near = Infinity;
    for (const r of rooms) {
      if (r.live) continue;
      const c = roomParts(r).centre;
      near = Math.min(near, Math.hypot(c[0] - player.pos.x, c[1] - player.pos.y, c[2] - player.pos.z));
    }
    setHum(Math.max(0, 1 - near / 40));
  } else setHum(0);

  // Health comes back on its own after a while.
  if (now - player.hurtAt > 8 && player.health < player.maxHealth) player.health = Math.min(player.maxHealth, player.health + dt * 0.5);
  if (player.health <= 0) respawn();

  // The sky above, the dark below.
  if (!secret) {
    const depth = cave.height(Math.floor(player.pos.x), Math.floor(player.pos.z)) - player.pos.y;
    const k = Math.max(0, Math.min(1, (depth - 1) / 8));
    const c = new THREE.Color(SKY).lerp(new THREE.Color(0x000000), k);
    scene.background.copy(c);
    scene.fog.color.copy(c);
    scene.fog.near = k > 0.5 ? 6 : RADIUS * 16 * 0.55;
    scene.fog.far = RADIUS * 16 * (k > 0.5 ? 0.75 : 1);
    hud.vitals(player.health, player.maxHealth, depth);
  } else {
    scene.fog.near = secret.world.radius * 16 * 0.55;
    scene.fog.far = secret.world.radius * 16;
    hud.vitals(player.health, player.maxHealth, 0);
    hud.el.depth.textContent = secret.gen.name;
  }

  // The time bars: told, never stopped.
  active += dt;
  const mins = active / 60;
  for (const [m, level, text] of [
    [15, 'yellow', '15 minutes in. Just so you know.'],
    [30, 'orange', '30 minutes in. Your call.'],
    [45, 'red', '45 minutes. Still your call: the cave keeps everything exactly as it is.']
  ])
    if (mins >= m && !warned.has(m)) {
      warned.add(m);
      hud.warn(level, text);
      sfx.soft();
    }

  saveTimer += dt;
  if (saveTimer > 20) {
    saveTimer = 0;
    saveNow();
  }
  I.consume();
}

// ── start ──
const startEl = document.getElementById('start');
const startBtn = document.getElementById('startBtn');
function showStart(note, label) {
  startNote.textContent = note;
  startBtn.textContent = label;
  startEl.hidden = false;
}
document.getElementById('startHelp').textContent = touchDevice
  ? 'Left thumb moves. Right thumb looks; hold still to dig, tap to place a torch.'
  : 'WASD to move, the mouse to look. Hold the left button to dig; right places a torch.';
startBtn.onclick = () => {
  unlockAudio();
  startEl.hidden = true;
  started = true;
  relock();
  if (!introduced) {
    introduced = true;
    const n = rooms.filter((r) => r.date === dayKey && !r.live).length;
    hud.toast(day.source === 'nightly' ? `Last night, Claude planted ${n} room${n === 1 ? '' : 's'} in the deep. Listen for the hum.` : day.source === 'older' ? 'No new rooms last night. Yesterday’s are still down there.' : `${n} sample rooms are waiting in the deep. Listen for the hum.`);
  }
};
let introduced = false;

renderer.setAnimationLoop(frame);
// Build the ground under your feet before letting you in.
startNote.textContent = 'Building the ground under your feet…';
const until = performance.now() + 6000;
while (caveWorld.pending() > 0 && performance.now() < until) {
  caveWorld.update(player.pos, 40);
  await new Promise((r) => setTimeout(r, 0));
}
if (player.collides(world, player.pos.x, player.pos.y, player.pos.z)) {
  while (player.collides(world, player.pos.x, player.pos.y, player.pos.z)) player.pos.y += 1;
}
hud.slots(hand.slot, pack);
const waiting = rooms.filter((r) => r.date === dayKey && !r.live).length;
startNote.textContent =
  day.source === 'nightly'
    ? `${waiting} new room${waiting === 1 ? '' : 's'} planted last night.${day.note ? ' ' + day.note : ''}`
    : day.source === 'older'
      ? `No new rooms last night. The ones from ${day.date} are still down there.`
      : 'Sample rooms for now: the nightly run is not set up yet.';
startBtn.disabled = false;
if (Q.has('auto')) startBtn.click();

// ── for the drives (tests) ──
window.__dig = {
  state: () => ({
    pos: player.pos.toArray().map((v) => +v.toFixed(2)), health: player.health, pack: { ...pack }, inSecret: !!secret,
    world: secret?.gen.name ?? 'cave', meshes: world.group.children.length, pending: world.pending(), rooms: rooms.map((r) => ({ id: r.plantId, date: r.date, live: r.live, x: r.x, y: r.y, z: r.z })),
    mobs: mobs.list.map((m) => m.kind), treasures: secret?.treasures.filter((t) => !t.taken).length ?? null, trophies: trophies.length,
    warned: [...warned], slot: hand.id, target: lookTarget()?.id ?? null, light: world.lightAt(player.pos.x, player.pos.y + 1, player.pos.z),
    panel: !hud.el.panel.hidden, edits: caveWorld.editsList().length, source: day.source
  }),
  teleport: (x, y, z, yaw, pitch) => {
    player.pos.set(x, y, z);
    player.vel.set(0, 0, 0);
    player.fallFrom = null;
    if (yaw !== undefined) player.yaw = yaw;
    if (pitch !== undefined) player.pitch = pitch;
  },
  toRoom: (i = 0) => {
    const r = rooms.filter((x) => x.date === dayKey)[i];
    const p = roomParts(r);
    player.pos.set(...p.standIn);
    player.vel.set(0, 0, 0);
    player.fallFrom = null;
    player.yaw = Math.PI; // facing +z, at the lectern (the portal is behind you)
    player.pitch = -0.5;
    return p;
  },
  read: () => {
    const t = lookTarget();
    const room = t && roomAtLectern(t);
    if (room) readStone(room);
    return !!room;
  },
  warp: (minutes) => (active += minutes * 60),
  mobs,
  input: I,
  hud,
  world: () => world,
  pack,
  hand,
  save: saveNow,
  takeAll: () => {
    for (const t of secret?.treasures ?? []) if (!t.taken) takeTreasure(t);
  },
  goHome: () => secret && leaveSecret(),
  heightAt: (x, z) => cave.height(x, z)
};
