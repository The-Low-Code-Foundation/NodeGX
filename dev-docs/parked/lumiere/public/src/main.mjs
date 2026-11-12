// Château Lumière, the toy (round 1): the title, the Grand Hall, three rooms, the fights, the light sweep, the rewards,
// the wardrobe and Chef Mirabelle's cakes. SCOPE.md §12 says what is in and out.
//
// Test URLs: ?fresh=1 (no save read or written) ?auto=1 (skip the title) ?mute=1 ?quality=low|high ?won=dressing,kitchen
//            ?at=dressing (start in that room) ?timer=off ?dtmax=0.1
// window.__game is the drives' handle: state, save, place, battle, enter(id), answer(right), …
import * as THREE from 'three';
import { makeView, params } from './look.mjs';
import { loadHeroine, Heroine } from './hero.mjs';
import { buildPlace } from './castle.mjs';
import { makeExterior } from './exterior.mjs';
import { Fx } from './fx.mjs';
import { Battle, escapeHtml } from './battle.mjs';
import { makeCake, disposeCake, CAKE_OPTIONS } from './cake.mjs';
import { wake as wakeAudio, sfx, playMusic, setMuted, note, tick } from './audio.mjs';
import { makeBiscuits, disposeBiscuits, BISCUIT_OPTIONS } from './biscuit.mjs';
import * as Books from './books.mjs';
import * as Piano from './piano.mjs';
import * as Dance from './dance.mjs';
import { YEARS, SUBJECTS, topicsFor, DEFAULT_YEAR } from './school/school.mjs';
import { ROOMS, roomById, REWARDS, ITEMS, ITEM_FROM, TIMERS, WARDROBE, DEFAULT_LOOK, POTION_RESPAWN, WAKE_HP, HUBS, roomsIn, FREED, stats as statsOf, hitFor, hitsToKnockOut } from './data.mjs';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FRESH = params.has('fresh');
const KEY = 'lumiere.save.v1';
const DTMAX = Number(params.get('dtmax')) || 0.1;

// ---------- the save ----------
function freshSave() {
  return {
    name: '', chooser: { year: DEFAULT_YEAR, subject: 'maths', topic: null },
    settings: { timer: params.get('timer') ?? 'normal', sound: !params.has('mute'), quality: params.get('quality') ?? 'high' },
    won: (params.get('won') ?? '').split(',').filter((id) => roomById(id)),
    look: { ...DEFAULT_LOOK }, hp: 100, mp: 30, bag: { heart: 1, star: 1, cake: 0, biscuit: 0 }, cakes: 0, started: false
  };
}
function loadSave() {
  if (FRESH) return freshSave();
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s?.chooser) return { ...freshSave(), ...s, settings: { ...freshSave().settings, ...s.settings }, bag: { ...freshSave().bag, ...s.bag } };
  } catch {}
  return freshSave();
}
const save = loadSave();
if (params.get('quality')) save.settings.quality = params.get('quality');
if (params.has('mute')) save.settings.sound = false;
function persist() {
  if (FRESH) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {}
}
const stats = () => statsOf(save);
// The heroine's numbers never exceed what her gear allows (a reward can raise them; a reload can't lower them below 0).
function clampMeters() {
  const s = stats();
  save.hp = Math.max(0, Math.min(s.maxHp, save.hp));
  save.mp = Math.max(0, Math.min(s.maxMp, save.mp));
}

// ---------- the view ----------
setMuted(!save.settings.sound);
const view = makeView($('#view'), { quality: save.settings.quality });
const camera = view.camera;
camera.fov = 50;
camera.updateProjectionMatrix();
const game = {
  state: 'loading', save, place: null, battle: null, hero: null, fx: null, answers: [], toasts: [], ready: false,
  stats, persist
};
window.__game = game;
game.view = view;

const places = {};
const fxFor = new Map();
function placeFor(id) {
  if (!places[id]) places[id] = buildPlace(id);
  return places[id];
}

function progress(f) {
  $('#loading .progress i').style.width = `${Math.round(f * 100)}%`;
}

// ---------- the camera ----------
// Follow (behind her, turned by `yaw`), or fixed (battles, the wardrobe, the cakes), easing between.
const cam = { mode: 'follow', yaw: 0, dist: 4.2, height: 2.4, pos: new THREE.Vector3(), look: new THREE.Vector3(), toPos: new THREE.Vector3(), toLook: new THREE.Vector3(), base: null, ease: 3 };
game.cam = cam;
game.camTo = (pos, look, time = 1) => {
  cam.mode = 'fixed';
  cam.toPos.set(...pos);
  cam.toLook.set(...look);
  cam.base = { pos: [...pos], look: [...look] };
  cam.ease = 3 / Math.max(0.2, time);
};
// In a fight: lean the camera towards something for a moment, then back.
game.nudge = (target, amount = 0.25, time = 0.6) => {
  if (!cam.base) return;
  const p = new THREE.Vector3(...cam.base.pos), l = new THREE.Vector3(...cam.base.look);
  cam.toPos.copy(p.lerp(target.clone().setY(p.y), amount));
  cam.toLook.copy(l.lerp(target.clone().setY(l.y), amount * 1.5));
  cam.ease = 3 / time;
};
game.camBack = (time = 0.6) => {
  if (!cam.base) return;
  cam.toPos.set(...cam.base.pos);
  cam.toLook.set(...cam.base.look);
  cam.ease = 3 / time;
};
// Back to following her. `fromView`: from a fixed view (a fight, the wardrobe, the cakes), the camera stays on the side
// of her where it already is and only settles its distance and height. Swinging it round behind her took it in a
// straight line over her head, and while it did, forward flipped from one way to the other.
function follow({ fromView = false } = {}) {
  if (fromView && game.hero) {
    const h = game.hero.group.position;
    cam.yaw = Math.atan2(cam.pos.x - h.x, cam.pos.z - h.z);
  }
  cam.mode = 'follow';
  cam.ease = 6;
}
game.follow = follow;
function updateCamera(dt) {
  if (game.state === 'title') return;
  if (cam.mode === 'follow' && game.hero && game.place) {
    const h = game.hero.group.position;
    const b = game.place?.bounds;
    // As far back as the room allows: step in from the full distance until nothing (a wall, a pillar) is in the way,
    // coming lower as it comes closer.
    const blocked = (x, z) => (b && (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ)) || game.place.blockers.some((k) => x > k.minX - 0.25 && x < k.maxX + 0.25 && z > k.minZ - 0.25 && z < k.maxZ + 0.25 && k.tall !== false);
    const room = (yaw) => {
      let d = cam.dist;
      for (; d > 1.4; d -= 0.2) {
        let clear = true;
        for (let s = 0.35; s <= 1.001 && clear; s += 0.15) if (blocked(h.x + Math.sin(yaw) * d * s, h.z + Math.cos(yaw) * d * s)) clear = false;
        if (clear) break;
      }
      return d;
    };
    const dist = room(cam.yaw);
    // Boxed in (a wall right behind her): drift round towards whichever side has more room, unless she is steering.
    if (dist < 2.6 && !drag && dt > 0) {
      const l = room(cam.yaw + 0.4), r = room(cam.yaw - 0.4);
      if (Math.max(l, r) > dist + 0.2) cam.yaw += (l >= r ? 1 : -1) * dt * 1.4;
    }
    const want = new THREE.Vector3(h.x + Math.sin(cam.yaw) * dist, 1.5 + (cam.height - 1.5) * (dist / cam.dist), h.z + Math.cos(cam.yaw) * dist);
    cam.toPos.copy(want);
    cam.toLook.set(h.x - Math.sin(cam.yaw) * 1.2, 1.15, h.z - Math.cos(cam.yaw) * 1.2);
  }
  const k = 1 - Math.exp(-cam.ease * dt);
  cam.pos.lerp(cam.toPos, k);
  cam.look.lerp(cam.toLook, k);
  camera.position.copy(cam.pos);
  camera.lookAt(cam.look);
}
function snapCamera() {
  updateCamera(0);
  cam.pos.copy(cam.toPos);
  cam.look.copy(cam.toLook);
  camera.position.copy(cam.pos);
  camera.lookAt(cam.look);
}

// ---------- places ----------
function setPlace(id) {
  const place = placeFor(id);
  game.place = place;
  view.setScene(place.scene);
  if (!fxFor.has(id)) fxFor.set(id, new Fx(place.scene, camera, $('#pops')));
  game.fx = fxFor.get(id);
  place.scene.add(game.hero.group);
  // Her cape, hat and staff hang on her bones, so they move with her into the new scene.
  if (place.hub) {
    // A hub brightens a share at a time as the rooms off it are won; its doors glow gold once theirs is.
    const rooms = roomsIn(id);
    place.setRestored(rooms.filter((r) => save.won.includes(r.id)).length / rooms.length);
    for (const r of rooms) place.setDoor(r.id, save.won.includes(r.id));
    if (id === 'hall') place.setDoor('wing', save.won.includes('library'));
  } else place.setRestored(save.won.includes(id) ? 1 : 0);
  if (id === 'kitchen') placeMirabelle();
  if (id === 'tearoom') placePraline();
  const room = roomById(id);
  $('#where').textContent = room ? room.name : HUBS[id];
  game.state = 'explore';
  return place;
}
function putHero(x, z, face) {
  const h = game.hero;
  h.group.position.set(x, 0, z);
  h.group.rotation.set(0, face, 0);
  h.target = null;
  h.play('Idle_Loop', { fade: 0.1 });
  cam.yaw = face + Math.PI;
}

async function fade(on) {
  $('#fade').classList.toggle('on', on);
  await wait(650);
}

const hubBright = (hub) => roomsIn(hub).every((r) => save.won.includes(r.id));
async function enter(id) {
  hidePrompt();
  sfx('click');
  await fade(true);
  const place = setPlace(id);
  const won = !!HUBS[id] || save.won.includes(id);
  if (HUBS[id]) {
    putHero(place.spawn.x, place.spawn.z, place.spawn.face);
    playMusic(hubBright(id) ? 'bright' : 'dark');
  } else if (won) {
    putHero(place.spawn.x, place.spawn.z, place.spawn.face);
    playMusic('bright');
  } else playMusic('dark');
  follow();
  snapCamera();
  if (!won) {
    // Straight into the fight: she stands on her mark, the camera on the battle view.
    const b = place.battle;
    putHero(b.hero[0], b.hero[1], -Math.PI / 2);
    cam.mode = 'fixed';
    cam.pos.set(...b.camera).add(new THREE.Vector3(0.6, 0.4, 1.2));
    // …but never outside the room's walls (it looked at them from behind: dark slabs across the fight).
    cam.pos.x = Math.max(-place.W / 2 + 0.3, Math.min(place.W / 2 - 0.3, cam.pos.x));
    cam.pos.z = Math.max(-place.D / 2 + 0.3, Math.min(place.D / 2 - 0.3, cam.pos.z));
    cam.look.set(...b.look);
    cam.toPos.copy(cam.pos);
    cam.toLook.copy(cam.look);
  }
  $('#hud').hidden = false;
  renderHud();
  await fade(false);
  if (!won) startBattle(id);
  else showTip();
}
game.enter = enter;

// Leaving a room by its door (or by running away): back in the place its door is in (the Hall, or the Swan Gallery),
// in front of that room's door. Leaving the Gallery is back to the Hall, by the Swan Wing's door.
const hubOf = (id) => (id === 'gallery' ? 'hall' : roomById(id)?.hub ?? 'hall');
async function backToHub(fromId) {
  hidePrompt();
  await fade(true);
  const hubId = hubOf(fromId);
  const hub = setPlace(hubId);
  // In front of that room's door, facing into the hall (a door's front faces along its turn, `ry`).
  const d = hub.doors.find((d) => d.id === (fromId === 'gallery' ? 'wing' : fromId));
  if (d) putHero(d.x + Math.sin(d.ry) * 0.6, d.z + Math.cos(d.ry) * 0.6, d.ry);
  else putHero(hub.spawn.x, hub.spawn.z, hub.spawn.face);
  playMusic(hubBright(hubId) ? 'bright' : 'dark');
  follow();
  snapCamera();
  renderHud();
  await fade(false);
}

// ---------- the fight ----------
function startBattle(id) {
  game.state = 'battle';
  $('#where').hidden = true;
  hidePrompt();
  $('#tip').textContent = '';
  game.battle = new Battle(game, game.place, roomById(id));
  game.battle.start();
}
game.chooserFor = () => {
  const c = save.chooser;
  if (c.subject === 'mix') return { year: c.year, subject: SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)], topic: null };
  return { year: c.year, subject: c.subject, topic: c.topic };
};
game.timerSeconds = () => TIMERS[save.settings.timer] ?? 30;
game.log = (a) => game.answers.push(a);
game.answer = (right) => game.battle?.test(right);
game.stats = stats;

game.battleOver = async (how, battle) => {
  const id = battle.room.id;
  game.battle = null;
  $('#where').hidden = false;
  clampMeters();
  persist();
  if (how === 'won') {
    if (!save.won.includes(id)) save.won.push(id);
    persist();
    const place = game.place;
    sfx('sweep');
    playMusic('bright');
    const at = game.hero.group.position.clone();
    game.fx.spray(at.clone().setY(1.0), { n: 160, colour: [0xffffff, 0xffe28a, 0xffb3d9, 0xb9e0ff], speed: 4.5, life: 1.8, size: 0.12, up: 1.2 });
    game.fx.shock(at.clone().setY(1.0), 0xfff0c0, 5, 0.8);
    await place.sweep(game.hero.group.position);
    game.hero.face.mood = 'happy';
    await wait(500);
    const next = await reward(id);
    game.hero.face.mood = 'neutral';
    game.state = 'explore';
    follow({ fromView: true });
    showTip();
    next?.();
  } else if (how === 'ko') {
    const hubId = hubOf(id);
    toast(`Lumi the firefly carries you back to ${HUBS[hubId].replace(/^The /, 'the ')}…`, 3200);
    await fade(true);
    const s = stats();
    save.hp = Math.max(save.hp, Math.round(s.maxHp * WAKE_HP));
    save.mp = Math.max(save.mp, Math.round(s.maxMp * WAKE_HP));
    persist();
    const hall = setPlace(hubId);
    putHero(hall.spawn.x, hall.spawn.z, hall.spawn.face);
    game.hero.face.mood = 'neutral';
    playMusic('dark');
    follow();
    snapCamera();
    renderHud();
    await fade(false);
    toast(`You’re back in ${HUBS[hubId].replace(/^The /, 'the ')}. Find the glowing potions to get strong again!`, 4200);
  } else {
    await backToHub(id);
    toast('You slipped out. The creature is still in there, waiting.', 3000);
  }
};

// The surprise: a card, its gift applied, and what the room now holds.
async function reward(id) {
  const room = roomById(id);
  const r = REWARDS[room.reward];
  const freedLine = FREED[room.creatures[0]];
  sfx('reward');
  if (id === 'dressing') save.look.cape = 'starlight';
  wearLook();
  if (id === 'kitchen') placeMirabelle(true);
  if (id === 'tearoom') placePraline(true);
  game.fx.rise(game.hero.group.position);
  clampMeters();
  persist();
  renderHud();
  const buttons = [];
  const OPEN = { wardrobe: ['Try things on!', openWardrobe], cakes: ['Bake a cake!', () => openBake('cake')], books: ['Read with Hoot!', openBooks], piano: ['Play the piano!', openPiano], biscuits: ['Bake biscuits!', () => openBake('biscuit')], dance: ['Dance!', openDance] }[r.opens];
  if (OPEN) buttons.push([OPEN[0], OPEN[1], true], ['Later', null]);
  else buttons.push(['Wonderful!', null, true]);
  return card(r.icon, r.title, `<i>${freedLine}</i><br><br>${r.text}`, buttons);
}

// ---------- the heroine's clothes ----------
function wearLook() {
  game.hero.wear(save.look, { moonlit: save.won.includes('library'), dawn: save.won.includes('ballroom') });
}

// ---------- moving about ----------
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.code);
  if ((e.code === 'Enter' || e.code === 'Space') && !$('#prompt').hidden) $('#prompt button.primary')?.click();
  if (e.code === 'Escape' && game.state !== 'title') toggleMenu();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

// Tap or click the floor to walk there; drag to turn the camera.
const ray = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let drag = null;
$('#view').addEventListener('pointerdown', (e) => {
  wakeAudio();
  drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, moved: false };
});
addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 8 || Math.abs(e.clientY - drag.y) > 8) drag.moved = true;
  if (drag.moved && game.state === 'explore') cam.yaw = drag.yaw - dx * 0.006;
});
addEventListener('pointerup', (e) => {
  if (drag && !drag.moved && game.state === 'explore') walkTo(e.clientX, e.clientY);
  drag = null;
});
function walkTo(x, y) {
  const r = $('#view').getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1), camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(floorPlane, p)) return;
  const b = game.place.bounds;
  p.x = Math.max(b.minX, Math.min(b.maxX, p.x));
  p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z));
  game.hero.target = p;
  game.fx?.marker(p);
}
game.walkTo = (x, z) => (game.hero.target = new THREE.Vector3(x, 0, z));

// Her paces, in metres a second (round 1 had 0.95 and 1.6: "painfully slow"). Each plays on the animation that fits
// it, sped up to match but only so far (`cap`): the clips' own paces are 0.95, 1.8 and 2.05 m/s, and a sprint played
// at three times its speed looks frantic, so at the top end her feet glide a little, hidden by the stardust. The keys
// jog (Shift sprints); a tap walks if it is close, jogs, or sprints if it is far, slowing as she arrives.
const PACE = { walk: 1.6, jog: 3.4, sprint: 5.6 };
const RADIUS = 0.28;
function collide(p) {
  const b = game.place.bounds;
  p.x = Math.max(b.minX, Math.min(b.maxX, p.x));
  p.z = Math.max(b.minZ, Math.min(b.maxZ, p.z));
  for (const k of game.place.blockers) {
    const cx = Math.max(k.minX, Math.min(k.maxX, p.x)), cz = Math.max(k.minZ, Math.min(k.maxZ, p.z));
    const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
    if (d < RADIUS) {
      if (d > 1e-4) {
        p.x = cx + (dx / d) * RADIUS;
        p.z = cz + (dz / d) * RADIUS;
      } else {
        // Inside the box: out by the nearest side.
        const out = [[k.minX - RADIUS - p.x, 0], [k.maxX + RADIUS - p.x, 0], [0, k.minZ - RADIUS - p.z], [0, k.maxZ + RADIUS - p.z]].sort((a, b) => Math.hypot(...a) - Math.hypot(...b))[0];
        p.x += out[0];
        p.z += out[1];
      }
    }
  }
}

function moveHero(dt) {
  const h = game.hero;
  // Walking steers `rotation.y` only: a turn stored any other way (a `lookAt` gives (π, y, π)) is brought back to a
  // plain yaw first, or she walks mirrored.
  if (h.group.rotation.x || h.group.rotation.z) {
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(h.group.quaternion);
    h.group.rotation.set(0, Math.atan2(f.x, f.z), 0);
  }
  let dir = new THREE.Vector3();
  const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  if (keys.has('KeyQ')) cam.yaw += dt * 1.8;
  if (keys.has('KeyE')) cam.yaw -= dt * 1.8;
  if (f || s) {
    h.target = null;
    // Forward is into the screen as it is drawn now, not where the camera is going: after a fight, the wardrobe or
    // the cakes it swings round from in front of her, and forward by `cam.yaw` ran her at the screen ("runs backwards
    // when pressing forwards", Richard, 11-01) until it got there.
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0);
    if (fwd.lengthSq() < 1e-6) fwd.set(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    dir.addScaledVector(fwd, f).addScaledVector(right, s).normalize();
  } else if (h.target) {
    dir.subVectors(h.target, h.group.position).setY(0);
    if (dir.length() < 0.12) {
      h.target = null;
      dir.set(0, 0, 0);
    } else dir.normalize();
  }
  const sprintKey = keys.has('ShiftLeft') || keys.has('ShiftRight');
  let pace = 0;
  if (f || s) pace = sprintKey ? PACE.sprint : PACE.jog;
  else if (h.target) {
    const far = h.target.distanceTo(h.group.position);
    pace = far > 4.5 ? PACE.sprint : far > 1.5 ? PACE.jog : PACE.walk;
  }
  // She speeds up and slows down rather than jumping between paces.
  h.speed += (pace - h.speed) * Math.min(1, dt * (pace > h.speed ? 5 : 8));
  if (dir.lengthSq() > 0) {
    const speed = Math.max(h.speed, 0.6);
    const before = h.group.position.clone();
    const p = before.clone().addScaledVector(dir, speed * dt);
    collide(p);
    h.group.position.copy(p);
    // Stuck against something while walking to a tapped spot: give up rather than run on the spot.
    if (h.target && p.distanceTo(before) < speed * dt * 0.2) h.target = null;
    const want = Math.atan2(dir.x, dir.z);
    let d = want - h.group.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    h.group.rotation.y += d * Math.min(1, dt * 12);
    const [clip, native, cap] = speed > 4.5 ? ['Sprint_Loop', h.sprintSpeed, 1.4] : speed > 2.4 ? ['Jog_Fwd_Loop', h.runSpeed, 1.5] : ['Walk_Loop', h.walkSpeed, 1.6];
    h.play(clip, { fade: 0.2 });
    if (h.current) h.current.timeScale = Math.max(0.75, Math.min(cap, speed / native));
    // Running leaves a trail of stardust at her heels, a puff every few centimetres (so as much on a slow tablet as a
    // fast one); sprinting, thicker.
    h.trail = (h.trail ?? 0) + (speed > 3 ? p.distanceTo(before) : 0);
    for (; h.trail > 0.07 && game.fx; h.trail -= 0.07) {
      const heel = h.group.position.clone().addScaledVector(dir, -0.25 - h.trail).setY(0.12);
      game.fx.spray(heel, { n: speed > 4.5 ? 2 : 1, colour: [0xffe28a, 0xffb3d9, 0xc9a6ff, 0xffffff], speed: 0.35, life: 0.8, size: 0.075, up: 0.3, spread: 3 });
    }
    // The camera drifts round behind her while she walks somewhere she was sent (not while being steered by keys).
    if (h.target && !drag) {
      let dy = h.group.rotation.y + Math.PI - cam.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      cam.yaw += dy * Math.min(1, dt * 1.2);
    }
  } else {
    h.speed = 0;
    h.play('Idle_Loop', { fade: 0.25 });
  }
}

// ---------- what she is near ----------
let promptKey = null;
function setPrompt(key, html, buttons) {
  if (promptKey === key) return;
  promptKey = key;
  const el = $('#prompt');
  el.innerHTML = html + '<div class="row" style="justify-content:center"></div>';
  const row = el.querySelector('.row');
  for (const [label, fn, primary] of buttons) {
    const b = document.createElement('button');
    b.textContent = label;
    if (primary) b.className = 'primary big';
    b.onclick = () => (sfx('click'), fn());
    row.appendChild(b);
  }
  el.hidden = false;
}
function hidePrompt() {
  promptKey = null;
  $('#prompt').hidden = true;
}
const stars = (n) => '★'.repeat(n) + '<span style="opacity:.3">' + '★'.repeat(5 - n) + '</span>';
function dangerLine(room) {
  const s = stats();
  const n = hitsToKnockOut(room.depth, s);
  const hit = hitFor(room.depth, s);
  if (n <= 1) return `<p class="danger one">One wrong answer in there and you’re knocked out!</p>`;
  return `<p class="danger">Each wrong answer in there costs you ${hit} HP: ${n} and you’re knocked out.</p>`;
}

function nearby() {
  const h = game.hero.group.position;
  const place = game.place;
  // Potions in the Hall.
  if (place.potionSpots)
    for (const spot of place.potionSpots) {
      if (spot.back > 0 || Math.hypot(spot.x - h.x, spot.z - h.z) > 0.85) continue;
      pickPotion(spot);
    }
  for (const d of place.doors) {
    if (Math.hypot(d.x - h.x, d.z - h.z) > 1.3) continue;
    if (!place.hub || (place.id === 'gallery' && d.id === 'out')) return setPrompt(`exit-${place.id}`, `<h3>Back to ${HUBS[hubOf(place.id)]}</h3>`, [['Go back', () => backToHub(place.id), true]]);
    if (d.id === 'out') return setPrompt('out', '<h3>The front doors</h3><p>Outside: the moonlit bridge, and the way home.</p>', [['Leave for now', () => toTitle(), true]]);
    if (d.id === 'wing') {
      if (!save.won.includes('library')) return setPrompt('wing-locked', '<h3>The Swan Wing 🔒</h3><p>Locked tight, with a silver swan on the lock. Somebody in the <b>Library</b> is keeping the key…</p>', [['I’ll find it', () => hidePrompt(), true]]);
      const n = roomsIn('gallery').filter((r) => save.won.includes(r.id)).length;
      return setPrompt(`wing-${n}`, `<h3>The Swan Wing</h3><p>The Music Room, the Tea Room and the Ballroom. ${n ? `${n} of 3 won back ✨` : 'Deeper in the château: the creatures in there are stronger.'}</p>`, [['Go in', () => enter('gallery'), true]]);
    }
    const room = roomById(d.id);
    const won = save.won.includes(room.id);
    const s = stats();
    const low = !won && save.hp < s.maxHp * 0.5 ? `<p>You’re low on health. A potion first?</p>` : '';
    return setPrompt(`door-${d.id}-${won}-${s.ward}-${Math.round(save.hp)}`, `<h3>${room.name} <span class="stars">${stars(room.depth)}</span></h3><p>${won ? 'Yours again ✨' : room.blurb}</p>${won ? '' : dangerLine(room)}${low}`, [[won ? 'Go in' : 'Go in and fight', () => enter(room.id), true]]);
  }
  const f = place.feature;
  if (f && save.won.includes(place.id) && Math.hypot(f.x - h.x, f.z - h.z) < 1.5) {
    if (f.kind === 'wardrobe') return setPrompt('wardrobe', '<h3>The Enchanted Wardrobe</h3>', [['Open the wardrobe', () => openWardrobe(), true]]);
    if (f.kind === 'chef') return setPrompt('chef', '<h3>Chef Mirabelle</h3><p>“Shall we bake something magical?”</p>', [['Bake a cake', () => openBake('cake'), true]]);
    if (f.kind === 'books') return setPrompt('books', `<h3>Archivist Hoot</h3><p>“Hoo! Fancy a read? Every book has a question at the end.”</p><p class="small">Stars: ${Books.BOOKS.filter((b) => save.books?.[b.id]).length} of ${Books.BOOKS.length}</p>`, [['Read with Hoot', () => openBooks(), true]]);
    if (f.kind === 'piano') return setPrompt('piano', '<h3>Maestro Fig</h3><p>“The piano is in tune at last! Shall we play?”</p>', [['Play the piano', () => openPiano(), true]]);
    if (f.kind === 'praline') return setPrompt('praline', '<h3>Chef Praline</h3><p>“Biscuits for the ghosts’ tea! Will you help me?”</p>', [['Bake biscuits', () => openBake('biscuit'), true]]);
    if (f.kind === 'dance') return setPrompt('dance', '<h3>Madame Lune</h3><p>“The orchestra is ready, little sorceress. Shall we dance?”</p>', [['Dance!', () => openDance(), true]]);
  }
  hidePrompt();
}

function pickPotion(spot) {
  const it = ITEMS[spot.kind];
  const s = stats();
  const full = spot.kind === 'heart' ? save.hp >= s.maxHp : save.mp >= s.maxMp;
  if (save.bag[spot.kind] < it.max) {
    save.bag[spot.kind]++;
    toast(`${it.icon} ${it.name}! It’s in your bag.`);
  } else if (!full) {
    drink(spot.kind);
  } else return;
  spot.back = POTION_RESPAWN;
  sfx('potion');
  game.fx.rise(game.hero.group.position, spot.kind === 'heart' ? [0xff8fc4, 0xffffff] : [0x8fc4ff, 0xffffff], 30);
  persist();
  renderHud();
}
function drink(kind) {
  const it = ITEMS[kind];
  const s = stats();
  const hp0 = save.hp, mp0 = save.mp;
  save.hp = Math.min(s.maxHp, save.hp + it.hp);
  save.mp = Math.min(s.maxMp, save.mp + it.mp);
  const p = game.hero.group.position.clone().setY(2);
  if (save.hp > hp0) game.fx.number(p, `+${Math.round(save.hp - hp0)}`, 'heal');
  if (save.mp > mp0) game.fx.number(p.clone().setY(2.3), `+${Math.round(save.mp - mp0)} MP`, 'heal');
  game.fx.rise(game.hero.group.position, kind === 'star' ? [0x8fc4ff, 0xffffff] : [0xff8fc4, 0xffffff, 0xffe28a]);
}
game.useItem = (kind) => {
  if (!save.bag[kind]) return;
  save.bag[kind]--;
  sfx('potion');
  drink(kind);
  persist();
  renderHud();
};

// ---------- the HUD ----------
function renderHud() {
  clampMeters();
  const s = stats();
  $('#hud-name').textContent = save.name;
  const set = (sel, v, max) => {
    $(`${sel} .bar i`).style.width = `${(100 * v) / max}%`;
    $(`${sel} em`).textContent = `${Math.ceil(v)}/${max}`;
  };
  set('.party-card .hp', save.hp, s.maxHp);
  set('.party-card .mp', save.mp, s.maxMp);
  const bag = $('#bag');
  bag.innerHTML = '';
  for (const [id, it] of Object.entries(ITEMS)) {
    if (ITEM_FROM[id] && !save.won.includes(ITEM_FROM[id])) continue;
    const b = document.createElement('button');
    b.innerHTML = `${it.icon}<small>×${save.bag[id]}</small>`;
    b.title = `${it.name}: ${it.text}`;
    b.disabled = !save.bag[id] || game.state === 'battle';
    b.onclick = () => game.useItem(id);
    bag.appendChild(b);
  }
}
game.renderHud = renderHud;

let toastTimer;
function toast(text, ms = 2600) {
  game.toasts.push(text);
  const el = $('#tip');
  el.textContent = text;
  el.style.opacity = '1';
  el.style.fontSize = '16px';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.style.fontSize = '';
    showTip();
  }, ms);
}
function showTip() {
  $('#tip').textContent = game.state === 'explore' ? 'Tap the floor to walk · drag to look around · or the arrow keys' : '';
}

// A card in the middle of the screen; resolves when a button is pressed.
function card(icon, title, html, buttons) {
  return new Promise((resolve) => {
    const prev = game.state;
    game.state = 'card';
    $('#card-icon').textContent = icon;
    $('#card-title').textContent = title;
    $('#card-text').innerHTML = html;
    const row = $('#card-buttons');
    row.innerHTML = '';
    for (const [label, fn, primary] of buttons) {
      const b = document.createElement('button');
      b.textContent = label;
      if (primary) b.className = 'big';
      b.onclick = () => {
        sfx('click');
        $('#card').hidden = true;
        game.state = prev === 'card' || prev === 'battle' ? 'explore' : prev;
        // The caller runs the follow-up once it has finished its own steps (a reward's "Try things on!").
        resolve(fn);
      };
      row.appendChild(b);
    }
    $('#card').hidden = false;
  });
}

// ---------- the chooser (title and menu) ----------
function chooser(yearsEl, subjectsEl, topicsEl) {
  const c = save.chooser;
  const chip = (label, on, fn) => {
    const b = document.createElement('button');
    b.className = `chip${on ? ' on' : ''}`;
    b.textContent = label;
    b.onclick = () => (sfx('click'), fn(), chooser(yearsEl, subjectsEl, topicsEl), persist());
    return b;
  };
  yearsEl.replaceChildren(...YEARS.map((y) => chip(y, c.year === y, () => ((c.year = y), (c.topic = null)))));
  const NAMES = { maths: '🔢 Maths', science: '🔬 Science', geography: '🗺️ Geography', french: '🇫🇷 French', english: '🇬🇧 English', history: '🏰 History', mix: '🎲 A bit of everything' };
  subjectsEl.replaceChildren(...[...SUBJECTS, 'mix'].map((s) => chip(NAMES[s], c.subject === s, () => ((c.subject = s), (c.topic = null)))));
  if (c.subject === 'mix') topicsEl.replaceChildren();
  else topicsEl.replaceChildren(chip('All of it', !c.topic, () => (c.topic = null)), ...topicsFor(c.subject, c.year).map((t) => chip(t.name + (t.above ? ` (${t.from})` : ''), c.topic === t.id, () => (c.topic = t.id))));
}

// ---------- the title ----------
let exterior = null;
function toTitle() {
  hidePrompt();
  persist();
  game.state = 'title';
  $('#hud').hidden = true;
  if (!exterior) exterior = makeExterior();
  exterior.setRestored(save.won.length / ROOMS.length);
  view.setScene(exterior.scene);
  $('#title').hidden = false;
  $('#name').value = save.name;
  $('#name').placeholder = 'Type your name';
  chooser($('#years'), $('#subjects'), $('#topics'));
  $('#start').textContent = save.started ? 'Back into the château' : 'Enter the château';
  $('#title-note').textContent = save.won.length ? `Rooms won back: ${save.won.length} of ${ROOMS.length}.` : 'Your great-aunt left you a château. Nobody has lived in it for a hundred years…';
  playMusic(null);
}
$('#name').addEventListener('input', (e) => {
  save.name = e.target.value.trim().slice(0, 16);
  persist();
});
$('#start').onclick = async () => {
  wakeAudio();
  sfx('click');
  if (!save.name) save.name = 'Sorceress';
  const first = !save.started;
  save.started = true;
  persist();
  $('#title').hidden = true;
  // The exterior stays built for coming back to the title; only its framing comes off the camera.
  camera.clearViewOffset();
  await enter('hall');
  if (first) await card('🏰', 'Welcome home', `This was your great-aunt’s château. A curse has filled it with grumpy magical creatures.<br><br>Answer a question right and your staff casts a spell. Get it wrong and they strike back.<br><br>The doors glow purple where creatures wait. Start with the <b>Dressing Room</b>: it’s the easiest.`, [['Let’s go!', null, true]]);
};

// ---------- the menu ----------
function toggleMenu(force) {
  const open = force ?? $('#menu').hidden;
  if (open) {
    if (game.battle) game.battle.paused = true;
    chooser($('#m-years'), $('#m-subjects'), $('#m-topics'));
    renderMenu();
  } else if (game.battle) game.battle.paused = false;
  $('#menu').hidden = !open;
}
function renderMenu() {
  const t = $('#m-timer');
  const LABELS = { relaxed: 'Relaxed (45 s)', normal: 'Normal (30 s)', brisk: 'Brisk (20 s)', off: 'No timer' };
  t.replaceChildren(...Object.keys(TIMERS).map((k) => {
    const b = document.createElement('button');
    b.className = `chip${save.settings.timer === k ? ' on' : ''}`;
    b.textContent = LABELS[k];
    b.onclick = () => ((save.settings.timer = k), persist(), renderMenu());
    return b;
  }));
  $('#m-sound').textContent = save.settings.sound ? '🔊 Sound on' : '🔇 Sound off';
  $('#m-quality').textContent = save.settings.quality === 'high' ? '✨ Pretty (fast computers)' : '🐢 Simple (slow computers)';
}
$('#menu-btn').onclick = () => (sfx('click'), toggleMenu(true));
$('#m-resume').onclick = () => (sfx('click'), toggleMenu(false));
$('#m-sound').onclick = () => {
  save.settings.sound = !save.settings.sound;
  setMuted(!save.settings.sound);
  persist();
  renderMenu();
};
$('#m-quality').onclick = () => {
  save.settings.quality = save.settings.quality === 'high' ? 'low' : 'high';
  persist();
  renderMenu();
  $('#m-quality').textContent += ' — after a reload';
};
let resetArmed = false;
$('#m-reset').onclick = () => {
  if (!resetArmed) {
    resetArmed = true;
    $('#m-reset').textContent = 'Really? Every room goes dark again. Tap again to start over.';
    return;
  }
  localStorage.removeItem(KEY);
  location.reload();
};

// ---------- the wardrobe ----------
function openWardrobe() {
  hidePrompt();
  game.state = 'wardrobe';
  const place = game.place;
  const f = place.feature;
  const h = game.hero;
  h.target = null;
  h.group.position.set(f.x, 0, f.z);
  // Her back to the mirror, facing the camera.
  h.group.rotation.y = -Math.PI / 2;
  h.play('Idle_Loop', { fade: 0.2 });
  const p = h.group.position;
  game.camTo([p.x - 2.9, 1.25, p.z + 0.35], [p.x, 0.92, p.z + 0.45], 0.8);
  $('#wardrobe').hidden = false;
  $('#hud').hidden = true;
  renderWardrobe();
}
const GROUP_NAMES = { hat: 'On your head', cape: 'Cape', dress: 'Dress', hair: 'Hair' };
function renderWardrobe() {
  const el = $('#w-groups');
  el.innerHTML = '';
  for (const [group, options] of Object.entries(WARDROBE)) {
    const g = document.createElement('div');
    g.className = 'group';
    g.innerHTML = `<h3>${GROUP_NAMES[group]}</h3>`;
    const row = document.createElement('div');
    row.className = 'row';
    for (const o of options) {
      const b = document.createElement('button');
      const locked = o.from && !save.won.includes(o.from);
      const colour = o.skirt ?? o.color;
      b.className = save.look[group] === o.id ? 'on' : '';
      b.innerHTML = `${colour ? `<span class="swatch" style="background:${colour}"></span>` : ''}${locked ? '🔒 ' : ''}${o.name}`;
      b.disabled = locked;
      b.onclick = () => {
        save.look[group] = o.id;
        sfx('potion');
        wearLook();
        game.fx.rise(game.hero.group.position, [0xffb3d9, 0xffffff, 0xd9c4ff], 40);
        persist();
        renderWardrobe();
      };
      row.appendChild(b);
    }
    g.appendChild(row);
    el.appendChild(g);
  }
}
$('#w-done').onclick = () => {
  sfx('click');
  $('#wardrobe').hidden = true;
  $('#hud').hidden = false;
  game.state = 'explore';
  follow({ fromView: true });
};

// ---------- the chefs: Mirabelle's cakes and Praline's biscuits ----------
// One way of playing, two kitchens (Richard, 11-12: "repetition with variables"): a chef, a few steps of choices
// (one of a list, or as many as she likes), a model that changes as she picks, and a spell to bake it. Each BAKERY is
// the variables; `openBake(kind)` is the game.
let mirabelle = null, praline = null;
function chefCopy(dress) {
  const c = new Heroine(game.body);
  c.wear({ ...DEFAULT_LOOK, dress }, { chef: true });
  c.face.mood = 'happy';
  return c;
}
function placeMirabelle(announce = false) {
  if (!save.won.includes('kitchen') || game.place?.id !== 'kitchen') return;
  const place = game.place;
  mirabelle ??= chefCopy('violet');
  place.scene.add(mirabelle.group);
  mirabelle.group.position.set(place.feature.x, 0, place.feature.z - 0.3);
  mirabelle.group.rotation.y = 0;
  mirabelle.play('Idle_Talking_Loop', { fade: 0.2 });
  if (announce) game.fx.rise(mirabelle.group.position, [0xffd27a, 0xffffff, 0xffb3d9], 60);
}
// Chef Praline, Mirabelle's little sister: the same chef's whites, mint where Mirabelle's are pink, shorter.
function placePraline(announce = false) {
  if (!save.won.includes('tearoom') || game.place?.id !== 'tearoom') return;
  const place = game.place;
  if (!praline) {
    praline = chefCopy('mint');
    praline.dye('Bottoms', '#9fe0c8');
    praline.dye('HAIR', '#ffb08a');
    praline.group.scale.setScalar(0.92);
  }
  place.scene.add(praline.group);
  const [x, z, ry] = place.feature.chefAt;
  praline.group.position.set(x, 0, z);
  praline.group.rotation.y = ry;
  praline.play('Idle_Talking_Loop', { fade: 0.2 });
  if (announce) game.fx.rise(praline.group.position, [0x9fe0c8, 0xffffff, 0xffb3d9], 60);
}

const BAKERY = {
  cake: {
    title: 'Magic Cakes', chef: 'Chef Mirabelle', room: 'kitchen', item: 'cake',
    fresh: () => ({ sponge: 'vanilla', tiers: 1, icing: 'pink', toppings: ['strawberries'] }),
    steps: [
      { key: 'sponge', title: 'Pick a sponge', say: 'First, the sponge! What flavour shall we bake?', options: () => CAKE_OPTIONS.sponge },
      { key: 'tiers', title: 'How tall?', say: 'One tier, two tiers… or three, for a ball?', options: () => CAKE_OPTIONS.tiers.map((n) => ({ id: n, name: `${n} tier${n > 1 ? 's' : ''}` })) },
      { key: 'icing', title: 'The icing', say: 'Now the icing. Ooh, choose a pretty one!', options: () => CAKE_OPTIONS.icing },
      { key: 'toppings', title: 'Decorate it', say: 'Toppings! Pick as many as you like, darling. More is more!', options: () => CAKE_OPTIONS.toppings, multi: true },
      { key: 'bake', title: 'Bake it!', say: 'Wave your staff and say the magic word… “Lumière!”' }
    ],
    make: (r) => makeCake(r), dispose: disposeCake,
    at: () => new THREE.Vector3(-0.15, 0.95, 0.62),
    stand: [-1.0, 1.9, Math.PI * 0.85], cam: [[0.55, 1.75, 2.75], [0.25, 1.15, 0.4]],
    baked: (room) => (room ? 'Magnifique! Keep it in your bag: one slice and you’re as strong as ever, even in a fight!' : 'Magnifique! Your bag is full of cakes already, so this one is for the ghosts’ tea party!'),
    again: (n) => `That’s cake number ${n}! Another one? Or off you go, little sorceress.`,
    count: 'cakes'
  },
  biscuit: {
    title: 'Biscuits for Tea', chef: 'Chef Praline', room: 'tearoom', item: 'biscuit',
    fresh: () => ({ dough: 'butter', shape: 'star', icing: 'white', sprinkles: ['stars'] }),
    steps: [
      { key: 'dough', title: 'The dough', say: 'Hello hello! First the dough. Butter? Chocolate? Something pink?', options: () => BISCUIT_OPTIONS.dough },
      { key: 'shape', title: 'Cut them out', say: () => (save.books?.recipe ? 'Pick a cutter! Ooh, you’ve read great-aunt’s recipe? Then the Moon cutter is yours!' : 'Pick a cutter! (The Moon cutter is great-aunt’s secret recipe. It’s in a book in the Library…)'), options: () => BISCUIT_OPTIONS.shape.map((o) => ({ ...o, locked: o.needs && !save.books?.[o.needs] })) },
      { key: 'icing', title: 'The icing', say: 'A little icing on top? Or plain and crunchy?', options: () => BISCUIT_OPTIONS.icing },
      { key: 'sprinkles', title: 'Sprinkles!', say: 'Sprinkles! As many kinds as you like!', options: () => BISCUIT_OPTIONS.sprinkles, multi: true },
      { key: 'bake', title: 'Bake them!', say: 'Into the oven… with a spell! Say “Lumière!”' }
    ],
    make: (r) => makeBiscuits(r), dispose: disposeBiscuits,
    at: () => new THREE.Vector3(...game.place.feature.trayAt),
    stand: [-0.35, -2.55, 2.48], cam: [[0.75, 1.7, -0.9], [0.55, 0.95, -3.2]],
    // Great-aunt's Moon Biscuits are two in the bag, not one.
    baked: (room, r) => (r.shape === 'moon' ? (room ? 'Great-aunt’s Moon Biscuits! Just like she made them. Two for your bag!' : 'Moon Biscuits! Your bag is full, so these are for the ghosts’ tea.') : room ? 'Délicieux! One for your bag: a biscuit gives back 40 health and 10 magic.' : 'Délicieux! Your bag is full of biscuits, so these go to the ghosts’ tea!'),
    bonus: (r) => (r.shape === 'moon' ? 1 : 0),
    again: (n) => `That’s ${n} tray${n > 1 ? 's' : ''} of biscuits! Another? Or off to explore?`,
    count: 'biscuits'
  }
};
let bake = null, made = null, recipe = null, bakeStep = 0;
function openBake(kind) {
  hidePrompt();
  bake = BAKERY[kind];
  game.state = 'cakes';
  const h = game.hero;
  h.target = null;
  const [x, z, ry] = bake.stand;
  h.group.position.set(x, 0, z);
  h.group.rotation.set(0, ry, 0);
  h.play('Idle_Loop', { fade: 0.2 });
  recipe = bake.fresh();
  bakeStep = 0;
  game.camTo(...bake.cam, 0.8);
  $('#cakes h2').textContent = bake.title;
  $('#cakes').hidden = false;
  $('#hud').hidden = true;
  buildBake();
  renderBake();
  game.mini = { kind: `bake-${kind}`, recipe: () => recipe, step: () => bake.steps[bakeStep].key };
}
game.openBake = openBake;
function buildBake() {
  if (made) {
    made.removeFromParent();
    made.userData.dispose(made);
  }
  made = bake.make(recipe);
  made.userData.dispose = bake.dispose;
  made.position.copy(bake.at());
  game.place.scene.add(made);
}
function say(text) {
  $('#speech').hidden = false;
  $('#speech').innerHTML = `<b>${bake.chef}:</b> ${escapeHtml(text)}`;
}
function renderBake() {
  const step = bake.steps[bakeStep];
  say(typeof step.say === 'function' ? step.say() : step.say);
  $('#c-step').textContent = `Step ${bakeStep + 1} of ${bake.steps.length}: ${step.title}`;
  const el = $('#c-options');
  el.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'row';
  for (const o of step.options?.() ?? []) {
    const b = document.createElement('button');
    const on = step.multi ? recipe[step.key].includes(o.id) : recipe[step.key] === o.id;
    b.className = on ? 'on' : '';
    b.disabled = !!o.locked;
    b.innerHTML = `${o.color ? `<span class="swatch" style="background:${o.color}"></span>` : ''}${o.locked ? '🔒 ' : ''}${escapeHtml(o.name)}`;
    b.onclick = () => {
      sfx('click');
      if (step.multi) recipe[step.key] = on ? recipe[step.key].filter((x) => x !== o.id) : [...recipe[step.key], o.id];
      else recipe[step.key] = o.id;
      buildBake();
      renderBake();
    };
    row.appendChild(b);
  }
  el.appendChild(row);
  $('#c-back').disabled = bakeStep === 0;
  $('#c-next').textContent = step.key === 'bake' ? '✨ Lumière! ✨' : bake.steps[bakeStep + 1]?.key === 'bake' ? 'Ready to bake' : 'Next';
}
$('#c-back').onclick = () => {
  sfx('click');
  bakeStep = Math.max(0, bakeStep - 1);
  renderBake();
};
$('#c-next').onclick = async () => {
  sfx('click');
  if (bake.steps[bakeStep].key !== 'bake') {
    bakeStep++;
    return renderBake();
  }
  // The bake: a spell from her staff to the cake, a burst, and it glows.
  $('#c-next').disabled = true;
  const h = game.hero;
  const at = bake.at();
  h.charge = 1;
  h.play('Spell_Simple_Shoot', { once: true, fade: 0.15 });
  await wait(h.duration('Spell_Simple_Shoot') * 380);
  sfx('cast');
  await game.fx.bolt(h.bones.leftHand.getWorldPosition(new THREE.Vector3()), at.clone().setY(at.y + 0.25), { colour: 0xffd27a, trail: [0xffffff, 0xffe28a, 0xffb3d9], time: 0.6 });
  h.charge = 0;
  sfx('win');
  game.fx.rise(at, [0xffe28a, 0xffffff, 0xffb3d9], 80);
  h.play('Idle_Loop', { fade: 0.3 });
  save[bake.count] = (save[bake.count] ?? 0) + 1;
  const it = ITEMS[bake.item];
  const room = save.bag[bake.item] < it.max;
  if (room) save.bag[bake.item] = Math.min(it.max, save.bag[bake.item] + 1 + (bake.bonus?.(recipe) ?? 0));
  persist();
  say(bake.baked(room, recipe));
  await wait(2600);
  $('#c-next').disabled = false;
  bakeStep = 0;
  renderBake();
  say(bake.again(save[bake.count]));
};
document.querySelector('#cakes .side-panel .actions').insertAdjacentHTML('afterend', '<p class="small"><button class="link" id="c-done">Thank the chef and go</button></p>');
$('#c-done').onclick = () => {
  sfx('click');
  $('#cakes').hidden = true;
  $('#speech').hidden = true;
  game.mini = null;
  backToExplore();
};

// ---------- round 2's mini-games: Hoot's books, Fig's piano, Madame Lune's ball ----------
function backToExplore() {
  $('#hud').hidden = false;
  renderHud();
  game.state = 'explore';
  follow({ fromView: true });
}
function standAt(x, z, ry, cam, look) {
  hidePrompt();
  const h = game.hero;
  h.target = null;
  h.group.position.set(x, 0, z);
  h.group.rotation.set(0, ry, 0);
  h.play('Idle_Loop', { fade: 0.2 });
  game.camTo(cam, look, 0.8);
  $('#hud').hidden = true;
}
async function openBooks() {
  game.state = 'mini';
  standAt(1.25, -0.85, Math.PI, [2.9, 1.55, 0.9], [1.45, 1.05, -1.5]);
  const owl = game.place.feature.friend;
  game.mini = { kind: 'books' };
  await Books.open({
    save, persist, sfx,
    cheer: () => (owl?.mood('happy'), game.fx.rise(game.hero.group.position, [0xffe28a, 0xffffff], 30)),
    think: () => owl?.mood('think'),
    onQuill: () => {
      sfx('reward');
      game.fx.rise(game.hero.group.position, [0xffe28a, 0xffffff, 0xb9e0ff], 80);
      clampMeters();
      renderHud();
      toast('🪶 Hoot gives you his Owl Quill: +10 magic!', 4200);
    }
  });
  game.mini = null;
  backToExplore();
}
game.openBooks = openBooks;
async function openPiano() {
  game.state = 'mini';
  const f = game.place.feature;
  standAt(f.x, f.z + 0.1, Math.PI, [f.x + 1.1, 2.05, f.z + 2.3], [f.x + 0.1, 0.95, f.z - 1.6]);
  playMusic(null);
  await Piano.open({ save, persist, sfx, note, press: (i) => f.piano.userData.press(i), fig: (m) => f.friend?.mood(m) });
  playMusic('bright');
  backToExplore();
}
game.openPiano = openPiano;
async function openDance() {
  game.state = 'mini';
  const f = game.place.feature;
  standAt(f.x, f.z, 0, [f.x + 0.9, 2.1, f.z + 4.6], [f.x - 0.3, 1.2, f.z - 0.5]);
  playMusic(null);
  const h = game.hero;
  await Dance.open({
    save, persist, sfx, note, tick,
    lune: (m) => f.friend?.mood(m),
    dancing: (on) => h.play(on ? 'Dance_Loop' : 'Idle_Loop', { fade: 0.3 }),
    sparkle: () => game.fx.spray(h.group.position.clone().setY(0.15), { n: 14, colour: [0xffe28a, 0xffb3d9, 0xb9e0ff, 0xffffff], speed: 1.6, life: 0.7, size: 0.08, up: 0.8 })
  });
  h.play('Idle_Loop', { fade: 0.3 });
  playMusic('bright');
  backToExplore();
}
game.openDance = openDance;

// ---------- the loop ----------
const timer = new THREE.Timer();
let t = 0;
function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), DTMAX);
  t += dt;
  if (game.state === 'title' && exterior) exterior.update(dt, camera);
  else if (game.place) {
    if (game.state === 'explore') {
      moveHero(dt);
      nearby();
    }
    game.place.update(dt, t);
    game.battle?.update(dt);
  }
  game.hero?.update(dt);
  if (game.hero && game.fx) game.fx.channel(game.hero.group.position, game.state === 'battle' ? game.hero.charge ?? 0 : 0, dt);
  // At a sprint the view widens a little, for the rush of it.
  const fov = 50 + (game.state === 'explore' ? Math.max(0, (game.hero?.speed ?? 0) - 3.6) * 2.4 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
  mirabelle?.update(dt);
  praline?.update(dt);
  made?.userData.update?.(dt);
  game.fx?.update(dt, camera);
  updateCamera(dt);
  view.render();
}

// ---------- boot ----------
(async () => {
  progress(0.05);
  const body = await loadHeroine({ renderer: view.renderer, onProgress: (f) => progress(0.05 + f * 0.75) });
  game.body = body;
  game.hero = new Heroine(body);
  wearLook();
  clampMeters();
  // Build the places now, behind the loading screen, so walking through a door never stalls.
  const all = ['hall', ...ROOMS.slice(0, 3).map((r) => r.id), 'gallery', ...ROOMS.slice(3).map((r) => r.id)];
  for (const [i, id] of all.entries()) {
    placeFor(id);
    progress(0.8 + ((i + 1) / all.length) * 0.19);
    await new Promise((r) => requestAnimationFrame(r));
  }
  view.renderer.setAnimationLoop(frame);
  $('#loading').hidden = true;
  game.ready = true;
  const at = params.get('at');
  if (params.has('auto') || at) {
    if (!save.name) save.name = 'Lumière';
    save.started = true;
    await enter(at && (roomById(at) || HUBS[at]) ? at : 'hall');
  } else toTitle();
})().catch((e) => {
  console.error(e);
  $('#loading p').textContent = `Something went wrong: ${e.message}`;
});
