// The people shelf: twelve realistic people (Microsoft Rocketbox, MIT) in functional clothes, two ways.
//
//  - The crowd: hundreds of people in ONE draw call. Each person is a flat picture baked ahead of time from the 3D
//    model, from the game's side camera (assets/people/sheet.png), animated by swapping frames in the shader. Nothing
//    is skinned at run time, so two hundred cost about what one does. Clips: walk, idle, work (at a table), fix
//    (kneeling), sit (needs something to sit on), talk.
//  - The party: the same person as real 3D (assets/people/party/<id>.glb), for the one to three you steer on an
//    expedition. Clips: idle, walk, run, sprint, jumpStart, jump, land, crouch, crouchWalk, melee, punch, aim, shoot,
//    swim, tread, hit, down, pickUp, use.
//
//   const people = await loadPeople();                 // once
//   const crowd = makeCrowd(people, 300);              // scene.add(crowd.mesh)
//   const i = crowd.add('medic-f', { x: 2, y: 0, z: 1 });
//   crowd.play(i, 'walk'); crowd.move(i, { x: 2.5, facing: 1 });
//   crowd.update(seconds);                             // every frame
//   crowd.pick(x, y) → { i, person, part } | null     // part: head · torso · hands · legs
//   const hero = people.party('medic-f');              // { object, play('run'), update(dt), partAt(hit) }
//
// A person's feet stand at (x, y); they walk along x, at depth z (people never move in depth on their own). Walking
// right is the picture as baked; facing -1 is it mirrored. The pictures were lit once, at the bake: `shade` (0–1)
// darkens a person in a dark room. Heights are the bake's (women 1.64 m, men 1.77 m); `scale` changes one person.
// Ruled 2026-10-30: the clothes are as the library ships them; there is no recolouring.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { register } from './registry.mjs';

export const PARTS = ['head', 'torso', 'hands', 'legs'];
// The points baked per cell (index.json `points`) and the part each one is.
const POINT_PART = { head: 'head', chest: 'torso', hips: 'torso', leftHand: 'hands', rightHand: 'hands', leftFoot: 'legs', rightFoot: 'legs' };

const vertexShader = /* glsl */ `
attribute vec3 aPos;
attribute vec4 aAnim;   // first cell, frames, frames a second, 0 loop / 1 there and back
attribute vec4 aMisc;   // phase (s), mirrored (0/1), scale, shade
uniform float uTime, uCols;
uniform vec2 uCell;
uniform vec3 uFrame;
varying vec2 vUv;
varying float vShade;
void main() {
  float n = aAnim.y, f = floor( ( uTime + aMisc.x ) * aAnim.z );
  if ( aAnim.w > 0.5 ) { float period = 2.0 * ( n - 1.0 ); f = mod( f, period ); f = f < n ? f : period - f; }
  else f = mod( f, n );
  float cell = aAnim.x + f;
  vec2 at = vec2( mod( cell, uCols ), floor( cell / uCols ) );
  vUv = ( at + vec2( aMisc.y > 0.5 ? 1.0 - uv.x : uv.x, uv.y ) ) * uCell;
  vec3 p = aPos + vec3( position.x * uFrame.x, position.y * uFrame.y - uFrame.z, 0.0 ) * aMisc.z;
  gl_Position = projectionMatrix * viewMatrix * vec4( p, 1.0 );
  vShade = aMisc.w;
}`;

const fragmentShader = /* glsl */ `
uniform sampler2D uSheet;
varying vec2 vUv;
varying float vShade;
void main() {
  vec4 c = texture2D( uSheet, vUv );
  if ( c.a < 0.5 ) discard;
  // The sheet's edges were filtered against transparent black: undo that, or every outline goes dark.
  gl_FragColor = vec4( c.rgb / c.a * vShade, 1.0 );
  #include <colorspace_fragment>
}`;

/** Loads the shelf: the index, the crowd's sheet, and (on demand) the party models. */
export async function loadPeople(base = 'assets/people/') {
  const index = await (await fetch(`${base}index.json`)).json();
  const sheet = await new THREE.TextureLoader().loadAsync(`${base}${index.sheet.file}`);
  sheet.colorSpace = THREE.SRGBColorSpace;
  sheet.flipY = true;
  sheet.anisotropy = 4;
  // `first`: the person's first cell (their points are numbered from it).
  const byId = new Map(index.people.map((p, n) => [p.id, { ...p, n, first: Math.min(...Object.values(p.clips).map((c) => c.start)) }]));
  const glbs = new Map();
  const shelf = {
    index, sheet, base,
    ids: index.people.map((p) => p.id),
    person: (id) => {
      const p = byId.get(id);
      if (!p) throw new Error(`people: no person "${id}" (there are: ${[...byId.keys()].join(', ')})`);
      return p;
    },
    /** Loads the party models of these people (all of them by default); party() needs it done first. */
    async preload(ids = shelf.ids) {
      await Promise.all(ids.map((id) => glbs.get(id) ?? glbs.set(id, new GLTFLoader().loadAsync(`${base}${shelf.person(id).party.file}`)).get(id)));
      for (const id of ids) glbs.set(id, await glbs.get(id));
    },
    /** One person as real 3D, with their expedition clips. */
    party(id) {
      const gltf = glbs.get(id);
      if (!gltf || gltf instanceof Promise) throw new Error(`people: party("${id}") before preload(["${id}"]) finished`);
      return partyMember(shelf.person(id), gltf);
    }
  };
  register('shelves', 'people', {
    summary: `${index.people.length} people (${index.people.map((p) => p.id).join(', ')}) · crowd clips: ${Object.keys(index.people[0].clips).join(', ')} · party clips: ${Object.keys(index.people[0].party.clips).join(', ')} · parts: ${PARTS.join(', ')}`
  });
  return shelf;
}

/** The crowd: up to `capacity` flat people in one mesh. */
export function makeCrowd(shelf, capacity = 256) {
  const { index, sheet } = shelf;
  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const attr = (name, size) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size);
    a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(name, a);
    return a;
  };
  const a = { pos: attr('aPos', 3), anim: attr('aAnim', 4), misc: attr('aMisc', 4) };
  geo.instanceCount = 0;
  const F = index.frame, S = index.sheet;
  const material = new THREE.ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: {
      uSheet: { value: sheet }, uTime: { value: 0 }, uCols: { value: S.cols },
      uCell: { value: new THREE.Vector2(S.cellW / S.width, S.cellH / S.height) },
      uFrame: { value: new THREE.Vector3(F.w, F.h, F.foot) }
    }
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.name = 'crowd';
  mesh.userData.part = 'crowd';

  // Per person, on the CPU too: who, what clip, where (for pick and for the game to read back).
  const who = [];
  let time = 0;
  const dirty = () => (a.pos.needsUpdate = a.anim.needsUpdate = a.misc.needsUpdate = true);

  const crowd = {
    mesh,
    get count() { return geo.instanceCount; },
    /** Adds one person; returns their number in this crowd. */
    add(id, { x = 0, y = 0, z = 0, facing = 1, scale = 1, shade = 1, clip = 'idle', phase = Math.random() * 10 } = {}) {
      if (geo.instanceCount >= capacity) throw new Error(`crowd: full (${capacity}); makeCrowd(people, more)`);
      const i = geo.instanceCount++;
      who[i] = { id, person: shelf.person(id), x, y, z, facing, scale, shade, clip, phase };
      crowd.move(i, who[i]);
      crowd.play(i, clip, phase);
      return i;
    },
    /** Moves one person; any of x, y, z, facing (1 right, -1 left), scale, shade. */
    move(i, { x, y, z, facing, scale, shade }) {
      const w = who[i];
      Object.assign(w, Object.fromEntries(Object.entries({ x, y, z, facing, scale, shade }).filter(([, v]) => v !== undefined)));
      a.pos.setXYZ(i, w.x, w.y, w.z);
      a.misc.setY(i, w.facing < 0 ? 1 : 0);
      a.misc.setZ(i, w.scale);
      a.misc.setW(i, w.shade);
      dirty();
    },
    /** Starts a clip (walk, idle, work, fix, sit, talk). `phase` in seconds offsets it, so a crowd is not in step. */
    play(i, clip, phase = who[i].phase) {
      const c = who[i].person.clips[clip];
      if (!c) throw new Error(`crowd: no clip "${clip}" (there are: ${Object.keys(who[i].person.clips).join(', ')})`);
      who[i].clip = clip;
      who[i].phase = phase;
      a.anim.setXYZW(i, c.start, c.frames, c.fps, c.mode);
      a.misc.setX(i, phase);
      dirty();
    },
    /** Takes the last person out; returns how many are left. (Keep your own list of who is who by number.) */
    pop() {
      if (geo.instanceCount) who.length = --geo.instanceCount;
      return geo.instanceCount;
    },
    /** Reads one person back: { id, x, y, z, facing, scale, shade, clip }. */
    get: (i) => ({ ...who[i], person: undefined }),
    /** How fast this person walks in their walk clip, metres a second (their feet do not slide at this speed). */
    walkSpeed: (i) => who[i].person.clips.walk.speed ?? 1.2,
    /** Advances every clip to `seconds` (a clock the game owns). */
    update(seconds) {
      time = seconds;
      material.uniforms.uTime.value = seconds;
    },
    /** The cell a person shows now (what the shader picks). */
    cellOf(i) {
      const w = who[i], c = w.person.clips[w.clip];
      let f = Math.floor((time + w.phase) * c.fps);
      if (c.mode === 1) {
        const period = 2 * (c.frames - 1);
        f = ((f % period) + period) % period;
        f = f < c.frames ? f : period - f;
      } else f = ((f % c.frames) + c.frames) % c.frames;
      return c.start + f;
    },
    /** Who is at (x, y) on the people's plane, and which part: the nearest baked point, within reach of it. */
    pick(x, y, reach = 0.3) {
      let best = null;
      for (let i = 0; i < geo.instanceCount; i++) {
        const w = who[i];
        const lx = ((x - w.x) / w.scale) * (w.facing < 0 ? -1 : 1), ly = (y - w.y) / w.scale;
        if (Math.abs(lx) > F.w / 2 || ly < -F.foot || ly > F.h - F.foot) continue;
        const pts = w.person.points[crowd.cellOf(i) - w.person.first];
        for (let k = 0; k < index.points.length; k++) {
          const d = Math.hypot(lx - pts[2 * k], ly - pts[2 * k + 1]);
          if (d < reach && (!best || d < best.d)) best = { d, i, k };
        }
      }
      return best && { i: best.i, person: who[best.i].id, part: POINT_PART[index.points[best.k]] };
    }
  };
  return crowd;
}

// The bone a hit vertex mostly moves → the part it is.
const boneToPart = (name) => (/head|neck|ponytail|hair/i.test(name) ? 'head' : /hand|finger/i.test(name) ? 'hands' : /thigh|calf|foot|toe|leg/i.test(name) ? 'legs' : 'torso');

function partyMember(person, gltf) {
  const object = SkeletonUtils.clone(gltf.scene);
  object.name = person.id;
  object.userData.model = 'person';
  object.userData.person = person.id;
  object.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.part = 'body';
    o.frustumCulled = false;
  });
  const mixer = new THREE.AnimationMixer(object);
  const clips = Object.fromEntries(gltf.animations.map((c) => [c.name, c]));
  let current = null;
  return {
    object, mixer, person,
    clips: person.party.clips,
    /** Plays a clip, cross-fading from the last over `fade` seconds. A clip that does not loop holds its last pose. */
    play(name, { fade = 0.15, speed = 1 } = {}) {
      const clip = clips[name];
      if (!clip) throw new Error(`party: no clip "${name}" (there are: ${Object.keys(clips).join(', ')})`);
      const action = mixer.clipAction(clip);
      const loops = person.party.clips[name]?.loops ?? true;
      action.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      action.clampWhenFinished = !loops;
      action.timeScale = speed;
      if (current === action && action.isRunning()) return action;
      action.reset().play();
      if (current && current !== action) current.crossFadeTo(action, fade, false);
      current = action;
      return action;
    },
    update: (dt) => mixer.update(dt),
    /** The part a raycast hit is on (head · torso · hands · legs), from the bone that moves the hit vertex most. */
    partAt(hit) {
      const mesh = hit.object;
      if (!mesh.isSkinnedMesh || !hit.face) return null;
      const { skinIndex, skinWeight } = mesh.geometry.attributes;
      let best = 0, bone = null;
      for (let k = 0; k < 4; k++) {
        const w = skinWeight.getComponent(hit.face.a, k);
        if (w > best) (best = w), (bone = mesh.skeleton.bones[skinIndex.getComponent(hit.face.a, k)]);
      }
      return bone ? boneToPart(bone.name) : 'torso';
    }
  };
}
