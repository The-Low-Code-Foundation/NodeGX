// The people bake, run ahead of time (PEOPLE.md §7 finding 5: a tablet should download pictures, not 3D people), in
// headless Chrome by _make/bake-people.mjs. For each of the twelve people (people-list.mjs):
//   1. the crowd sheet: every crowd clip rendered from the game's side camera into cells of ONE picture
//      (assets/people/sheet.png), and where the head, chest, hips, hands and feet are in every cell (for pointing);
//   2. the party model: the same person as real 3D with the expedition's clips, one GLB each (assets/people/party/).
// Rocketbox's own motion capture drives what it has (idle, walk, work, talk); Quaternius's Universal Animation Library
// (CC0) is retargeted for the rest, with Life Sim's retarget.mjs. Everything is written through POST /__out/.
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { findSlots, normalise, captureRest, bakeClip, nameSlots, resetRest } from '/lifesim/retarget.mjs';
import { loadMocap, fitMocap, byKey } from '/lifesim/mocap.mjs';
import { PEOPLE } from './people-list.mjs';

const params = new URLSearchParams(location.search);
const bake = (window.__bake = { phase: 'starting', done: false, error: null, log: [] });
const say = (s) => (bake.log.push(s), console.log(s), (document.getElementById('log').textContent = bake.log.join('\n')));

// The crowd's clips: [name, source ('mocap' or 'ual'), clip, frames, 0 loop / 1 there and back, [from, to] seconds (a
// cut)]. Fixing_Kneeling kneels down in its first second and stands up in its last: the cut is the kneeling.
const CROWD = [
  ['walk', 'mocap', 'walk', 16, 0],
  ['idle', 'mocap', 'breathe', 12, 0],
  ['work', 'mocap', 'workTable', 12, 1, [0, 4]],
  ['fix', 'ual', 'Fixing_Kneeling', 12, 1, [1, 4]],
  ['sit', 'ual', 'Sitting_Idle_Loop', 8, 0],
  ['talk', 'mocap', 'talk', 12, 0]
];
// The expedition party's clips (real 3D): [name, source, clip, loops].
const PARTY = [
  ['idle', 'mocap', 'idle', true], ['walk', 'mocap', 'walk', true],
  ['run', 'ual', 'Jog_Fwd_Loop', true], ['sprint', 'ual', 'Sprint_Loop', true],
  ['jumpStart', 'ual', 'Jump_Start', false], ['jump', 'ual', 'Jump_Loop', true], ['land', 'ual', 'Jump_Land', false],
  ['crouch', 'ual', 'Crouch_Idle_Loop', true], ['crouchWalk', 'ual', 'Crouch_Fwd_Loop', true],
  ['melee', 'ual', 'Sword_Attack', false], ['punch', 'ual', 'Punch_Jab', false],
  ['aim', 'ual', 'Pistol_Idle_Loop', true], ['shoot', 'ual', 'Pistol_Shoot', false],
  ['swim', 'ual', 'Swim_Fwd_Loop', true], ['tread', 'ual', 'Swim_Idle_Loop', true],
  ['hit', 'ual', 'Hit_Chest', false], ['down', 'ual', 'Death01', false],
  ['pickUp', 'ual', 'PickUp_Table', false], ['use', 'ual', 'Interact', false]
];
const MOCAP_NAMES = [...new Set([...CROWD, ...PARTY].filter((c) => c[1] === 'mocap').map((c) => c[2]))];
const UAL_NAMES = new Set([...CROWD, ...PARTY].filter((c) => c[1] === 'ual').map((c) => c[2]));

// A cell holds FRAME metres: the person's feet `foot` above its bottom, centred. Heights by gender (metres).
const FRAME = { w: 1, h: 2, foot: 0.1 };
const HEIGHT = { f: 1.64, m: 1.77 };
const YAW = 55; // degrees: a 3/4 turn toward the camera, walking right (left is the cell mirrored)
const CELL_H = Number(params.get('px')) || 128;
const CELL_W = CELL_H / 2;
const SHEET_W = 4096;
const COLS = SHEET_W / CELL_W;
const PER_PERSON = CROWD.reduce((n, c) => n + c[3], 0);
const ROWS = Math.ceil((PEOPLE.length * PER_PERSON) / COLS);
const SHEET_H = 2 ** Math.ceil(Math.log2(ROWS * CELL_H));

const BIPED = (n) => `Bip01 ${n}`;
const side = (s, L, R) => [[`left${s}`, L], [`right${s}`, R]];
const ROCKETBOX_MAP = Object.fromEntries([
  ['hips', BIPED('Pelvis')], ['spine', BIPED('Spine')], ['chest', BIPED('Spine1')], ['upperChest', BIPED('Spine2')], ['neck', BIPED('Neck')], ['head', BIPED('Head')],
  ...side('Shoulder', BIPED('L Clavicle'), BIPED('R Clavicle')), ...side('UpperArm', BIPED('L UpperArm'), BIPED('R UpperArm')),
  ...side('LowerArm', BIPED('L Forearm'), BIPED('R Forearm')), ...side('Hand', BIPED('L Hand'), BIPED('R Hand')), ...side('Middle', BIPED('L Finger2'), BIPED('R Finger2')),
  ...side('UpperLeg', BIPED('L Thigh'), BIPED('R Thigh')), ...side('LowerLeg', BIPED('L Calf'), BIPED('R Calf')), ...side('Foot', BIPED('L Foot'), BIPED('R Foot')), ...side('Toes', BIPED('L Toe0'), BIPED('R Toe0'))
]);
const UAL_MAP = Object.fromEntries([
  ['hips', 'DEF-hips'], ['spine', 'DEF-spine.001'], ['chest', 'DEF-spine.002'], ['upperChest', 'DEF-spine.003'], ['neck', 'DEF-neck'], ['head', 'DEF-head'],
  ...['Shoulder:shoulder', 'UpperArm:upper_arm', 'LowerArm:forearm', 'Hand:hand', 'Middle:f_middle.01', 'UpperLeg:thigh', 'LowerLeg:shin', 'Foot:foot', 'Toes:toe'].flatMap((p) => {
    const [s, b] = p.split(':');
    return [[`left${s}`, `DEF-${b}.L`], [`right${s}`, `DEF-${b}.R`]];
  })
]);
// The points recorded per cell, in this order, each [x, y] metres from the feet (x to the right, walking right).
export const POINTS = ['head', 'chest', 'hips', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'];

async function ual() {
  const gltf = await new GLTFLoader().loadAsync('assets/anim/AnimationLibrary_Godot_Standard.gltf');
  const outer = new THREE.Group(), inner = new THREE.Group();
  inner.add(gltf.scene);
  outer.add(inner);
  const slots = findSlots(gltf.scene, UAL_MAP);
  normalise(outer, inner, slots, 1);
  return { root: gltf.scene, slots, rest: captureRest(slots), clips: Object.fromEntries(gltf.animations.filter((c) => UAL_NAMES.has(c.name)).map((c) => [c.name, c])) };
}

const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
// A Rocketbox person from its FBX: the TGA textures it names are the JPEG/PNG copies fetch-people.mjs made. FBX's
// diffuse colour reads black (Life Sim's trap): white, the photo as the map; hair cards alpha-tested.
async function rocketbox(name) {
  const dir = `source/rocketbox/${name}`;
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const base = url.split(/[\\/]/).pop().toLowerCase();
    if (!base.endsWith('.tga')) return url;
    const b = base.slice(0, -4);
    if (/_opacity_color$/.test(b)) return `${dir}/${b}.png`;
    if (/_color(_\w+)?$/.test(b) || /_(body|head)_normal$/.test(b)) return `${dir}/${b}.jpg`;
    return BLANK;
  });
  const loaded = new Promise((r) => (manager.onLoad = r));
  const buf = await (await fetch(`${dir}/${name}.fbx`)).arrayBuffer();
  const scene = new FBXLoader(manager).parse(buf, `${dir}/`);
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 30000))]);
  // The FBX brings its own light and camera: not part of a person.
  const extra = [];
  scene.traverse((o) => (o.isLight || o.isCamera) && extra.push(o));
  extra.forEach((o) => o.removeFromParent());
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    o.material = [o.material].flat().map((m) => {
      const hair = /opacity/i.test(m.name) || /opacity/i.test(m.map?.image?.src ?? '');
      if (m.map) (m.map.colorSpace = THREE.SRGBColorSpace), (m.map.userData.mimeType = hair ? 'image/png' : 'image/jpeg');
      const normalMap = hair || m.normalMap?.image?.src?.startsWith('data:') ? null : m.normalMap;
      if (normalMap) normalMap.userData.mimeType = 'image/jpeg';
      return new THREE.MeshStandardMaterial({ name: m.name, map: m.map, normalMap, alphaTest: hair ? 0.5 : 0, side: hair ? THREE.DoubleSide : THREE.FrontSide, roughness: 0.85, metalness: 0 });
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
  return scene;
}

// One person stood (facing +Z, feet on y = 0, its height), with every clip it needs, by our names.
async function stand(person, lib) {
  const scene = await rocketbox(person.source);
  const outer = new THREE.Group(), inner = new THREE.Group();
  outer.name = person.id;
  inner.add(scene);
  outer.add(inner);
  const slots = findSlots(scene, ROCKETBOX_MAP);
  normalise(outer, inner, slots, HEIGHT[person.gender]);
  outer.updateMatrixWorld(true);
  const nodes = byKey(scene);
  const rest = captureRest(slots);
  nameSlots(slots);
  const mocap = fitMocap(await loadMocap(person.gender, MOCAP_NAMES), nodes, inner.scale.x);
  const clipOf = ([, source, from]) => {
    if (source === 'mocap') {
      if (!mocap[from]) throw new Error(`${person.id}: no mocap clip ${from}`);
      return mocap[from];
    }
    return bakeClip(lib.clips[from], lib, { slots, rest });
  };
  const crowd = Object.fromEntries(CROWD.map((c) => [c[0], clipOf(c)]));
  const party = Object.fromEntries(PARTY.map((c) => [c[0], c[1] === 'mocap' ? mocap[c[2]] : bakeClip(lib.clips[c[2]], lib, { slots, rest })]));
  resetRest(slots, rest);
  return { outer, slots, rest, crowd, party };
}

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3430, 1.6));
const key = new THREE.DirectionalLight(0xfff2e0, 2.2);
key.position.set(-2, 4, 5);
scene.add(key);
const camera = new THREE.OrthographicCamera(-FRAME.w / 2, FRAME.w / 2, FRAME.h - FRAME.foot, -FRAME.foot, 0.1, 50);
camera.position.set(0, 0, 10);

// The cells of one person's crowd clips, into `rt` from `cell` on. Returns the clip table and every cell's points.
function bakeCrowd(renderer, rt, who, cell) {
  const { outer, slots } = who;
  scene.add(outer);
  outer.rotation.y = THREE.MathUtils.degToRad(YAW);
  const mixer = new THREE.AnimationMixer(outer);
  const table = {}, points = [];
  const v = new THREE.Vector3();
  for (const [name, , , frames, mode, cut] of CROWD) {
    const clip = who.crowd[name];
    const [from, to] = cut ?? [0, clip.duration];
    const span = Math.min(clip.duration, to) - from;
    table[name] = { start: cell, frames, fps: +((mode === 0 ? frames : frames - 1) / span).toFixed(4), mode, ...(clip.userData?.speed ? { speed: +clip.userData.speed.toFixed(3) } : {}) };
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    // A one-shot sampled on a repeating action wraps setTime(duration) to its first pose: play it once, held.
    action.reset().setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    for (let f = 0; f < frames; f++, cell++) {
      // A loop's last frame is one step before its first; there-and-back holds both ends.
      mixer.setTime(from + (mode === 0 ? (f / frames) * span : (f / (frames - 1)) * span));
      outer.updateMatrixWorld(true);
      const x = (cell % COLS) * CELL_W, y = Math.floor(cell / COLS) * CELL_H;
      rt.viewport.set(x, y, CELL_W, CELL_H);
      rt.scissor.set(x, y, CELL_W, CELL_H);
      rt.scissorTest = true;
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      points.push(POINTS.flatMap((p) => {
        const node = p === 'chest' ? slots.upperChest ?? slots.chest : slots[p];
        node.getWorldPosition(v);
        return [+v.x.toFixed(2), +v.y.toFixed(2)];
      }));
    }
    action.stop();
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(outer);
  resetRest(slots, who.rest);
  outer.rotation.y = 0;
  outer.updateMatrixWorld(true);
  scene.remove(outer);
  return { table, points };
}

async function post(file, data) {
  const r = await fetch(`/__out/${file}`, { method: 'POST', body: data });
  const j = await r.json();
  if (!j.ok) throw new Error(`writing ${file}: ${j.error}`);
  return j.bytes;
}

// The render target's pixels as a PNG, top row first (a render target's first row is its bottom).
async function png(renderer, rt) {
  const { width: W, height: H } = rt;
  const px = new Uint8Array(W * H * 4);
  await renderer.readRenderTargetPixelsAsync(rt, 0, 0, W, H, px);
  const canvas = new OffscreenCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  ctx.putImageData(img, 0, 0);
  return canvas.convertToBlob({ type: 'image/png' });
}

async function main() {
  const t0 = performance.now();
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  renderer.setSize(256, 256);
  const rt = new THREE.WebGLRenderTarget(SHEET_W, SHEET_H, { colorSpace: THREE.SRGBColorSpace, generateMipmaps: false, depthBuffer: true });
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(rt);
  renderer.clear();

  bake.phase = 'library';
  const lib = await ual();
  const only = params.get('only')?.split(',');
  const people = PEOPLE.filter((p) => !only || only.includes(p.id));
  const index = {
    version: 1,
    made: new Date().toISOString(),
    sheet: { file: 'sheet.png', width: SHEET_W, height: SHEET_H, cellW: CELL_W, cellH: CELL_H, cols: COLS },
    frame: FRAME,
    yaw: YAW,
    points: POINTS,
    licence: 'Microsoft Rocketbox, MIT (LICENSE.md); clips: Rocketbox motion capture (MIT) and Quaternius Universal Animation Library (CC0)',
    people: []
  };
  let cell = 0;
  for (const person of people) {
    bake.phase = `baking ${person.id}`;
    const t1 = performance.now();
    const who = await stand(person, lib);
    const { table, points } = bakeCrowd(renderer, rt, who, cell);
    cell += PER_PERSON;
    // The party model: the same person, real 3D, with the expedition's clips inside.
    const animations = PARTY.map(([name]) => {
      const c = who.party[name].clone();
      c.name = name;
      return c;
    });
    const glb = await new GLTFExporter().parseAsync(who.outer, { binary: true, animations, maxTextureSize: 1024 });
    const bytes = await post(`party/${person.id}.glb`, glb);
    index.people.push({
      id: person.id, label: person.label, gender: person.gender, height: HEIGHT[person.gender], source: person.source,
      clips: table, points,
      party: {
        file: `party/${person.id}.glb`, mb: +(bytes / 1048576).toFixed(2),
        clips: Object.fromEntries(PARTY.map(([name, , , loops]) => [name, { seconds: +who.party[name].duration.toFixed(3), loops, ...(who.party[name].userData?.speed ? { speed: +who.party[name].userData.speed.toFixed(3) } : {}) }]))
      }
    });
    say(`${person.id}: ${PER_PERSON} cells, party ${(bytes / 1048576).toFixed(1)} MB, ${((performance.now() - t1) / 1000).toFixed(1)} s`);
    await new Promise((r) => requestAnimationFrame(r));
  }
  bake.phase = 'writing';
  const sheet = await png(renderer, rt);
  const sheetBytes = await post('sheet.png', sheet);
  index.sheet.mb = +(sheetBytes / 1048576).toFixed(2);
  await post('index.json', JSON.stringify(index));
  await post('LICENSE.md', await (await fetch('source/rocketbox/LICENSE.md')).text());
  say(`sheet ${SHEET_W}×${SHEET_H} (${index.sheet.mb} MB), ${people.length} people, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  bake.phase = 'done';
  bake.done = true;
}

main().catch((e) => {
  bake.error = String(e?.stack ?? e);
  bake.phase = 'failed';
  say(`FAILED: ${bake.error}`);
});
