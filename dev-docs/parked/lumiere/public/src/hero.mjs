// The heroine: the life sim's anime girl (pixiv's VRoid sample, `assets/vrm/sample-slim.vrm`), with Quaternius's
// animations baked onto her bones (retarget.mjs, as the life sim does), dressed as a junior sorceress: a hat, a cape,
// dyed clothes and hair, and a staff in her right hand. Chef Mirabelle is a copy of the same body in her own colours.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { findSlots, normalise, captureRest, bakeClip, nameSlots, resetRest } from './retarget.mjs';
import { vrmFaceTable, Face } from './face.mjs';
import { WARDROBE } from './data.mjs';

export const HEIGHT = 1.6;
const CLIPS = [
  'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Spell_Simple_Enter', 'Spell_Simple_Shoot', 'Spell_Simple_Idle_Loop', 'Spell_Simple_Exit',
  'Hit_Chest', 'Hit_Head', 'Death01', 'Dance_Loop', 'Interact', 'PickUp_Table', 'Idle_Talking_Loop', 'Roll'
];
const side = (s, L, R) => [[`left${s}`, L], [`right${s}`, R]];
const UAL = Object.fromEntries([
  ['hips', 'DEF-hips'], ['spine', 'DEF-spine.001'], ['chest', 'DEF-spine.002'], ['upperChest', 'DEF-spine.003'], ['neck', 'DEF-neck'], ['head', 'DEF-head'],
  ...side('Shoulder', 'DEF-shoulder.L', 'DEF-shoulder.R'), ...side('UpperArm', 'DEF-upper_arm.L', 'DEF-upper_arm.R'),
  ...side('LowerArm', 'DEF-forearm.L', 'DEF-forearm.R'), ...side('Hand', 'DEF-hand.L', 'DEF-hand.R'), ...side('Middle', 'DEF-f_middle.01.L', 'DEF-f_middle.01.R'),
  ...side('UpperLeg', 'DEF-thigh.L', 'DEF-thigh.R'), ...side('LowerLeg', 'DEF-shin.L', 'DEF-shin.R'), ...side('Foot', 'DEF-foot.L', 'DEF-foot.R'), ...side('Toes', 'DEF-toe.L', 'DEF-toe.R')
]);
const VRM_BONES = {
  hips: 'hips', spine: 'spine', chest: 'chest', upperChest: 'upperChest', neck: 'neck', head: 'head',
  leftShoulder: 'leftShoulder', leftUpperArm: 'leftUpperArm', leftLowerArm: 'leftLowerArm', leftHand: 'leftHand', leftMiddle: 'leftMiddleProximal',
  rightShoulder: 'rightShoulder', rightUpperArm: 'rightUpperArm', rightLowerArm: 'rightLowerArm', rightHand: 'rightHand', rightMiddle: 'rightMiddleProximal',
  leftUpperLeg: 'leftUpperLeg', leftLowerLeg: 'leftLowerLeg', leftFoot: 'leftFoot', leftToes: 'leftToes',
  rightUpperLeg: 'rightUpperLeg', rightLowerLeg: 'rightLowerLeg', rightFoot: 'rightFoot', rightToes: 'rightToes'
};

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function loadLibrary(onProgress) {
  const gltf = await new GLTFLoader().loadAsync('assets/anim/AnimationLibrary_Godot_Standard.gltf');
  const outer = new THREE.Group(), inner = new THREE.Group();
  inner.add(gltf.scene);
  outer.add(inner);
  const slots = findSlots(gltf.scene, UAL);
  normalise(outer, inner, slots, 1);
  onProgress?.(0.3);
  return { root: gltf.scene, slots, rest: captureRest(slots), clips: gltf.animations.filter((c) => CLIPS.includes(c.name)) };
}

// A copy of a texture with its colour taken out (brightness only, stretched so the brightest part is white), so a
// material colour dyes it: the shorts are black and the hair brown, and multiplying those by pink stays dark.
function dyeable(tex) {
  const img = tex?.image;
  if (!img) return null;
  const w = Math.min(512, img.width), h = Math.min(512, img.height);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h);
  const lum = new Float32Array(w * h);
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) {
    const l = 0.299 * d.data[i * 4] + 0.587 * d.data[i * 4 + 1] + 0.114 * d.data[i * 4 + 2];
    lum[i] = l;
    hist[Math.min(255, l | 0)]++;
  }
  // The 97th percentile becomes white, and the darkest folds stay a little dark.
  let acc = 0, top = 255;
  for (let v = 0; v < 256; v++) if ((acc += hist[v]) >= w * h * 0.97) {
    top = Math.max(8, v);
    break;
  }
  for (let i = 0; i < w * h; i++) {
    const v = Math.min(255, 70 + (lum[i] / top) * 185);
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = tex.flipY;
  t.wrapS = tex.wrapS;
  t.wrapT = tex.wrapT;
  return t;
}

// Loads the body once and bakes every clip onto it (one clip a frame, so the screen doesn't freeze).
export async function loadHeroine({ renderer, onProgress } = {}) {
  const lib = await loadLibrary(onProgress);
  const buf = await (await fetch('assets/vrm/sample-slim.vrm')).arrayBuffer();
  onProgress?.(0.55);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.parseAsync(buf, 'assets/vrm/');
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  vrm.scene.traverse((o) => (o.frustumCulled = false));
  // The anime outline draws every mesh twice: off on the tablets' budget.
  vrm.scene.traverse((o) => {
    if (!o.isMesh || !Array.isArray(o.material)) return;
    const surface = o.material.filter((m) => !m.isOutline);
    if (surface.length === o.material.length) return;
    o.material = surface[0];
    o.geometry.clearGroups();
  });
  vrm.humanoid.autoUpdateHumanBones = false;
  const map = Object.fromEntries(Object.entries(VRM_BONES).map(([s, b]) => [s, vrm.humanoid.getRawBoneNode(b)]).filter(([, n]) => n));
  const outer = new THREE.Group(), inner = new THREE.Group();
  inner.add(vrm.scene);
  outer.add(inner);
  const slots = findSlots(vrm.scene, map);
  normalise(outer, inner, slots, HEIGHT);
  const rest = captureRest(slots);
  nameSlots(slots);
  const clips = {};
  for (const [i, clip] of lib.clips.entries()) {
    clips[clip.name] = bakeClip(clip, lib, { slots, rest });
    onProgress?.(0.6 + (0.35 * (i + 1)) / lib.clips.length);
    await nextFrame();
  }
  resetRest(slots, rest);
  const faceTable = vrmFaceTable(vrm, outer);
  // The dyeable copies of the clothes' and hair's textures, made once, by material name (a copy of the body has its
  // own material objects, and the name is what they share).
  const dyes = new Map();
  outer.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of [o.material].flat())
      if (/Tops|Bottoms|Shoes|HAIR/.test(m.name) && !dyes.has(m.name)) dyes.set(m.name, { original: m.map, grey: dyeable(m.map), shade: m.shadeColorFactor?.clone() });
  });
  if (renderer) for (const { grey } of dyes.values()) if (grey) renderer.initTexture(grey);
  onProgress?.(1);
  return { outer, vrm, clips, faceTable, dyes, used: false };
}

// The sorceress's things, made in code.
const gold = new THREE.MeshStandardMaterial({ color: 0xf3cf6b, metalness: 0.85, roughness: 0.3 });
function makeHat(colour) {
  const g = new THREE.Group();
  const felt = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.75 });
  // The brim: a wide flat ring that curls up at the edge.
  const brim = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.07, 0.0), new THREE.Vector2(0.2, -0.005), new THREE.Vector2(0.3, 0.012), new THREE.Vector2(0.33, 0.04)], 40), felt);
  brim.material.side = THREE.DoubleSide;
  g.add(brim);
  // The crown: a tall cone whose tip flops over, in segments.
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector3(Math.sin(t * t * 1.6) * 0.16 * t, t * 0.42, -Math.pow(t, 3) * 0.06));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const crown = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 1, 16, false), felt);
  // Taper the tube from 0.14 at the brim to a point.
  const pos = crown.geometry.attributes.position;
  const v = new THREE.Vector3();
  const frames = curve.computeFrenetFrames(24, false);
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 17);
    const t = ring / 24;
    const c = curve.getPointAt(t);
    v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(0.14 * (1 - t) + 0.004).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  crown.geometry.computeVertexNormals();
  void frames;
  g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.138, 0.05, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xf6c4dd, roughness: 0.5, side: THREE.DoubleSide }));
  band.position.y = 0.035;
  g.add(band);
  const star = new THREE.Mesh(starGeometry(0.045, 0.02, 0.012), new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffd36b, emissiveIntensity: 2.2 }));
  star.position.set(0, 0.04, 0.138);
  g.add(star);
  return g;
}
function makeTiara() {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.007, 8, 40, Math.PI * 1.1), gold);
  band.rotation.set(Math.PI / 2, 0, Math.PI * -0.05 + Math.PI);
  band.rotation.z = Math.PI * 1.45;
  g.add(band);
  const gem = new THREE.MeshStandardMaterial({ color: 0xbfe9ff, emissive: 0x8fd8ff, emissiveIntensity: 2.4, roughness: 0.1 });
  for (let i = -2; i <= 2; i++) {
    const s = new THREE.Mesh(starGeometry(i === 0 ? 0.04 : 0.022, i === 0 ? 0.018 : 0.01, 0.008), i === 0 ? gem : gold);
    const a = i * 0.32;
    s.position.set(Math.sin(a) * 0.105, 0.025 + (i === 0 ? 0.02 : 0), Math.cos(a) * 0.105);
    s.rotation.y = a;
    g.add(s);
  }
  return g;
}
// The moon crown (the Ballroom's): a silver circlet of points, a crescent moon of glowing glass at the front.
function makeCrown() {
  const g = new THREE.Group();
  const silver = new THREE.MeshStandardMaterial({ color: 0xe8ecff, metalness: 0.9, roughness: 0.22 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.118, 0.03, 40, 1, true), silver);
  band.material.side = THREE.DoubleSide;
  band.position.y = 0.012;
  g.add(band);
  const gem = new THREE.MeshStandardMaterial({ color: 0xd8e8ff, emissive: 0xa8c8ff, emissiveIntensity: 2.4, roughness: 0.1 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const tall = i % 2 === 0 ? 0.06 : 0.035;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.014, tall, 6), silver);
    spike.position.set(Math.sin(a) * 0.115, 0.027 + tall / 2, Math.cos(a) * 0.115);
    g.add(spike);
    if (i % 2 === 0 && i) {
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), gem);
      pearl.position.set(Math.sin(a) * 0.115, 0.03 + tall, Math.cos(a) * 0.115);
      g.add(pearl);
    }
  }
  // The crescent: a disc with a smaller disc cut from its side.
  const moon = new THREE.Shape();
  moon.absarc(0, 0, 0.032, Math.PI * 0.2, Math.PI * 1.8, false);
  moon.absarc(0.016, 0, 0.026, Math.PI * 1.65, Math.PI * 0.35, true);
  const crescent = new THREE.Mesh(new THREE.ExtrudeGeometry(moon, { depth: 0.008, bevelEnabled: false }), gem);
  crescent.position.set(0, 0.085, 0.112);
  crescent.rotation.z = Math.PI / 2;
  g.add(crescent);
  return g;
}
function makeBow(colour) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: colour, roughness: 0.55 });
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), m);
    loop.scale.set(1.1, 0.75, 0.35);
    loop.position.set(s * 0.075, 0, 0);
    loop.rotation.z = s * 0.35;
    g.add(loop);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.01), m);
    tail.position.set(s * 0.03, -0.07, 0);
    tail.rotation.z = s * 0.4;
    g.add(tail);
  }
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), m));
  return g;
}
function starGeometry(outer, inner, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * 0.4, bevelThickness: depth * 0.4, bevelSegments: 1 }).translate(0, 0, -depth / 2);
}
export { starGeometry };
// A cape, lined in a second colour. Its origin is the base of her neck (she faces +z): the collar wraps the neck and
// comes forward onto her collarbones, where a ribbon and a clasp close it at the throat; then it falls over her
// shoulders and widens to the hem. Round 1's was a slice of a cylinder round the spine, 16 cm out: from the side it
// stood off her neck, and it hung stiff. This one moves: `userData.update(dt, pace)` streams it back as she runs and
// sways it as she goes.
function makeCape(outerColour, liningColour, sparkle) {
  const g = new THREE.Group();
  const U = 30, V = 14, LENGTH = 0.86;
  const geo = new THREE.PlaneGeometry(1, 1, U, V);
  const p = geo.attributes.position;
  // Where each vertex hangs at rest: `u` round (0..1, the middle of her back at 0.5), `v` down (0 collar, 1 hem).
  const rest = new Float32Array(p.count * 3), uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = uv.getX(i), v = 1 - uv.getY(i);
    const over = THREE.MathUtils.smoothstep(v, 0, 0.16); // over the shoulders
    const fall = THREE.MathUtils.smoothstep(v, 0.1, 1); // down to the hem
    const bell = THREE.MathUtils.smoothstep(v, 0.2, 0.68); // out over the petal skirt (0.32 m round, 0.5 m down)
    // Round the neck (half-width 9 cm, 5.5 cm behind its centre), out over the shoulders, then over the skirt.
    const rx = 0.09 + over * 0.13 + bell * 0.15, rz = 0.055 + over * 0.085 + bell * 0.2;
    // How far round to the front: at the collar past her sides onto the collarbones, lower down to her sides.
    const reach = Math.PI * (0.64 - over * 0.12);
    const a = (0.5 - u) * 2 * reach; // this way round, the plane's front faces out
    const fold = Math.sin(a * 7) * 0.014 * fall;
    rest.set([Math.sin(a) * (rx + fold), -0.03 * over - v * LENGTH * 0.94, -Math.cos(a) * (rz + fold) - fall * 0.05], i * 3);
  }
  p.array.set(rest);
  geo.computeVertexNormals();
  const out = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: outerColour, roughness: 0.6, side: THREE.FrontSide }));
  const inn = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: liningColour, roughness: 0.5, side: THREE.BackSide, emissive: sparkle ? 0x3a2a8a : 0, emissiveIntensity: sparkle ? 0.6 : 0 }));
  out.frustumCulled = inn.frustumCulled = false; // it moves past its first bounds
  g.add(out, inn);
  // The ribbon across her throat between the collar's two ends, and the clasp at its middle.
  const ends = Math.PI * 0.64;
  const tie = new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => {
    const a = ends + ((2 * Math.PI - 2 * ends) * k) / 8;
    return new THREE.Vector3(Math.sin(a) * 0.092, -0.012 - Math.sin((k / 8) * Math.PI) * 0.03, -Math.cos(a) * 0.062);
  }));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(tie, 24, 0.007, 6), new THREE.MeshStandardMaterial({ color: liningColour, roughness: 0.5 })));
  const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffd27a, metalness: 0.8, roughness: 0.25, emissive: sparkle ? 0x6a5aff : 0x000000, emissiveIntensity: 0.8 }));
  clasp.scale.z = 0.6;
  clasp.position.set(0, -0.045, 0.066);
  g.add(clasp);
  // The motion: the cape swings back about the shoulders with her pace, a little more at the hem, with a wave
  // running through it; a spring, so it settles rather than stopping dead.
  let flow = 0, flowV = 0, t = Math.random() * 10;
  g.userData.update = (dt, pace) => {
    t += dt;
    const want = Math.min(1, pace / 5.6);
    flowV += ((want - flow) * 30 - flowV * 7) * dt;
    flow += flowV * dt;
    const a = p.array, pivot = -0.04;
    for (let i = 0; i < p.count; i++) {
      const x = rest[i * 3], y = rest[i * 3 + 1], z = rest[i * 3 + 2];
      const v = Math.max(0, (pivot - y) / LENGTH);
      const wave = Math.sin(t * (2 + flow * 7) - v * 4 + x * 6) * (0.03 + flow * 0.1);
      const th = (0.05 + flow * 0.95) * Math.pow(v, 1.2) + wave * v;
      const d = y - pivot, c = Math.cos(th), s = Math.sin(th);
      a[i * 3 + 1] = pivot + d * c - z * s;
      a[i * 3 + 2] = z * c + d * s;
    }
    p.needsUpdate = true;
    geo.computeVertexNormals();
  };
  g.userData.update(0, 0);
  return g;
}
// The staff: a slim wooden shaft wound with a ribbon, a crescent moon at the top cradling a crystal. Her light.
// `dawn` (the Ballroom's Dawn Staff): pale gold with a sunrise-pink crystal, above the Moonlit Staff.
export function makeStaff({ moonlit = false, dawn = false } = {}) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: dawn ? 0xffe2b0 : moonlit ? 0xe8e6ff : 0x8a5a3a, roughness: moonlit || dawn ? 0.3 : 0.7, metalness: moonlit || dawn ? 0.5 : 0 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.05, 10), wood);
  shaft.position.y = 0.2;
  g.add(shaft);
  const ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_, i) => new THREE.Vector3(Math.cos(i * 0.9) * 0.02, -0.25 + i * 0.03, Math.sin(i * 0.9) * 0.02))), 80, 0.004, 5), new THREE.MeshStandardMaterial({ color: 0xff9ccf, roughness: 0.5 }));
  ribbon.position.y = 0.3;
  g.add(ribbon);
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 30, Math.PI * 1.4), gold);
  moon.position.y = 0.76;
  moon.rotation.z = -Math.PI * 0.2;
  g.add(moon);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), new THREE.MeshStandardMaterial({ color: dawn ? 0xffd6e0 : moonlit ? 0xdfe7ff : 0xd7c4ff, emissive: dawn ? 0xffa0b8 : moonlit ? 0x9fc3ff : 0xb48cff, emissiveIntensity: 2.3, roughness: 0.1, flatShading: true }));
  crystal.scale.y = 1.5;
  crystal.position.y = 0.76;
  crystal.name = 'crystal';
  g.add(crystal);
  const glow = new THREE.PointLight(dawn ? 0xffb0c4 : moonlit ? 0x9fc3ff : 0xc49bff, 0.12, 1.6, 2);
  glow.position.y = 0.76;
  g.add(glow);
  g.userData = { crystal, glow };
  return g;
}

export class Heroine {
  // `body` from loadHeroine (the first call takes the loaded body; later ones get a copy, for Chef Mirabelle).
  constructor(body) {
    let outer = body.outer, vrm = body.vrm;
    this.constraints = null;
    if (body.used) {
      outer = SkeletonUtils.clone(body.outer);
      // The model's twist constraints turn the upper arms' twist bones; three-vrm runs them on the original only, so a
      // copy held its arms half up. Rebuild each constraint on the copy's nodes, with the original's rest state.
      const pair = new Map();
      const walk = (a, b) => {
        pair.set(a, b);
        a.children.forEach((c, i) => b.children[i] && walk(c, b.children[i]));
      };
      walk(body.outer, outer);
      const mgr = body.vrm.nodeConstraintManager;
      if (mgr) {
        this.constraints = new mgr.constructor();
        for (const c of mgr.constraints) {
          const n = new c.constructor(pair.get(c.destination), pair.get(c.source));
          for (const [k, v] of Object.entries(c)) {
            if (k === 'destination' || k === 'source') continue;
            n[k] = v?.clone ? v.clone() : v;
          }
          this.constraints.addConstraint(n);
        }
      }
      outer.getObjectByName(body.vrm.humanoid.normalizedHumanBonesRoot.name)?.removeFromParent();
      // Whatever the original was wearing when she was copied is hers, not the copy's.
      const worn = [];
      outer.traverse((o) => o.userData.worn && worn.push(o));
      for (const o of worn) o.removeFromParent();
      vrm = null;
    }
    body.used = true;
    this.body = body;
    this.vrm = vrm;
    this.group = new THREE.Group();
    this.group.add(outer);
    this.outer = outer;
    this.mixer = new THREE.AnimationMixer(outer);
    this.actions = Object.fromEntries(Object.entries(body.clips).map(([n, c]) => [n, this.mixer.clipAction(c)]));
    this.walkSpeed = body.clips.Walk_Loop.userData.speed || 1.1;
    this.runSpeed = body.clips.Jog_Fwd_Loop.userData.speed || 2.6;
    this.sprintSpeed = body.clips.Sprint_Loop?.userData.speed || 5;
    this.speed = 0;
    this.face = new Face(outer, body.faceTable);
    this.bones = {};
    for (const s of ['head', 'rightHand', 'leftHand', 'upperChest', 'hips', 'neck']) this.bones[s] = outer.getObjectByName(`ls_${s}`);
    // Every material a copy, so dyeing her never dyes Mirabelle.
    this.materials = new Map();
    outer.traverse((o) => {
      if (!o.isMesh) return;
      o.material = [o.material].flat().map((m) => {
        if (!this.materials.has(m)) this.materials.set(m, m.clone());
        return this.materials.get(m);
      });
      if (o.material.length === 1) o.material = o.material[0];
      o.castShadow = true;
    });
    this.worn = {};
    this.current = null;
    this.onDone = null;
    this.mixer.addEventListener('finished', () => {
      const done = this.onDone;
      this.onDone = null;
      done?.();
    });
    this.play('Idle_Loop', { fade: 0 });
  }

  play(name, { once = false, fade = 0.25, timeScale = 1, then = null } = {}) {
    const next = this.actions[name];
    if (!next) return;
    if (this.current === next && !once) return;
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = once;
    next.timeScale = timeScale;
    next.enabled = true;
    if (this.current && this.current !== next && fade > 0) next.crossFadeFrom(this.current, fade, false).play();
    else {
      if (this.current && this.current !== next) this.current.stop();
      next.play();
    }
    this.current = next;
    this.onDone = then;
  }
  // Plays a one-shot and resolves when it ends.
  once(name, opts = {}) {
    return new Promise((r) => this.play(name, { ...opts, once: true, then: r }));
  }
  duration(name) {
    return this.body.clips[name]?.duration ?? 1;
  }

  // Recolours a part: `key` matches the material names (Tops, Bottoms, Shoes, HAIR). null = as the model came.
  dye(key, colour) {
    for (const [orig, m] of this.materials) {
      if (!new RegExp(key).test(orig.name)) continue;
      const d = this.body.dyes.get(orig.name);
      if (colour == null) {
        m.map = d?.original ?? m.map;
        m.color.set(0xffffff);
        if (m.shadeColorFactor && d?.shade) m.shadeColorFactor.copy(d.shade);
        if (m.shadeMultiplyTexture) m.shadeMultiplyTexture = m.map;
      } else {
        if (d?.grey) m.map = d.grey;
        m.color.set(colour);
        if (m.shadeColorFactor) m.shadeColorFactor.set(colour).multiplyScalar(0.72);
        if (m.uniforms?.shadeMultiplyTexture) m.shadeMultiplyTexture = m.map;
      }
      m.needsUpdate = true;
    }
  }

  // Puts on a look ({ hat, cape, dress, hair }, ids from data.mjs WARDROBE) and the staff.
  wear(look, { moonlit = false, dawn = false, chef = false } = {}) {
    const dress = WARDROBE.dress.find((d) => d.id === look.dress) ?? WARDROBE.dress[0];
    const hair = WARDROBE.hair.find((d) => d.id === look.hair) ?? WARDROBE.hair[0];
    if (chef) {
      this.dye('Tops', '#ffffff');
      this.dye('Bottoms', '#f7b7cf');
      this.dye('Shoes', '#ffffff');
      this.dye('HAIR', '#ffd27a');
    } else {
      this.dye('Tops', dress.top);
      this.dye('Bottoms', dress.skirt);
      this.dye('Shoes', dress.skirt);
      this.dye('HAIR', hair.id === 'chestnut' ? null : hair.color);
    }
    for (const k of ['hat', 'cape', 'staff', 'skirt']) {
      this.worn[k]?.removeFromParent();
      this.worn[k] = null;
    }
    this.outer.updateMatrixWorld(true);
    const head = this.bones.head;
    const hatId = chef ? 'chef' : look.hat;
    let hat = null;
    if (hatId === 'witch') hat = makeHat(new THREE.Color(dress.skirt).multiplyScalar(0.8));
    else if (hatId === 'tiara') hat = makeTiara();
    else if (hatId === 'bow') hat = makeBow(dress.skirt);
    else if (hatId === 'chef') hat = makeChefHat();
    else if (hatId === 'crown') hat = makeCrown();
    if (hat) {
      // Placed in the body's frame (above and slightly behind the crown of the head), then hung on the head bone.
      const at = { witch: [0, 0.135, -0.025, 0.82, -0.16], tiara: [0, 0.12, 0.01, 1, -0.12], bow: [0, 0.12, -0.11, 1, 0.2], chef: [0, 0.15, -0.02, 1, -0.08], crown: [0, 0.125, -0.005, 1, -0.1] }[hatId];
      this.placeOn(head, hat, at);
      this.worn.hat = hat;
    }
    // A short petal skirt over the shorts (an apron for the chef).
    const skirt = makeSkirt(chef ? '#ffffff' : dress.skirt, chef ? '#f7b7cf' : dress.top, { gown: !chef && /ballgown/.test(dress.name) });
    this.placeOn(this.bones.hips, skirt, [0, 0.1, 0, 1, 0]);
    this.worn.skirt = skirt;
    const capeId = chef ? 'none' : look.cape;
    if (capeId !== 'none') {
      const cape = capeId === 'starlight' ? makeCape(0x4a55c8, 0xb8c4ff, true) : capeId === 'midnight' ? makeCape(0x1c1650, 0xc8d4ff, true) : makeCape(0xe0609a, 0xffd3e6, false);
      // Hung on the upper chest (so it turns with her body), but placed at the base of her neck.
      const chest = this.bones.upperChest, root = this.group.getWorldQuaternion(new THREE.Quaternion()).invert();
      const neck = this.bones.neck.getWorldPosition(new THREE.Vector3()).sub(chest.getWorldPosition(new THREE.Vector3())).applyQuaternion(root);
      this.placeOn(chest, cape, [neck.x, neck.y, neck.z, 1, 0]);
      this.worn.cape = cape;
    }
    if (!chef) {
      const staff = makeStaff({ moonlit, dawn });
      this.worn.staff = staff;
      this.holdStaff(staff);
    }
  }

  // Hangs `thing` on `bone`, posed in the body's own frame: [x, y, z] from the bone, scale, tilt (radians about x).
  placeOn(bone, thing, [x, y, z, s, tilt]) {
    this.outer.updateMatrixWorld(true);
    const bw = bone.getWorldPosition(new THREE.Vector3());
    const root = this.group.getWorldQuaternion(new THREE.Quaternion());
    const off = new THREE.Vector3(x, y, z).applyQuaternion(root);
    thing.position.copy(bw).add(off);
    thing.quaternion.copy(root).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)));
    thing.scale.setScalar(s);
    thing.userData.worn = true;
    this.group.parent ? this.group.parent.add(thing) : this.group.add(thing);
    bone.attach(thing);
  }

  // The staff in the right hand, upright while she stands: its hold is worked out from the hand's pose in the idle.
  holdStaff(staff) {
    const hand = this.bones.rightHand;
    const was = this.current;
    this.mixer.stopAllAction();
    this.actions.Idle_Loop.reset().play();
    this.mixer.update(0.3);
    this.outer.updateMatrixWorld(true);
    const root = this.group.getWorldQuaternion(new THREE.Quaternion());
    const want = root.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, 0, -0.08)));
    const handQ = hand.getWorldQuaternion(new THREE.Quaternion());
    const handS = hand.getWorldScale(new THREE.Vector3());
    staff.quaternion.copy(handQ.clone().invert().multiply(want));
    // In the hand's frame: a little forward of the bone (the fist), the staff's grip point at the hand.
    const fist = new THREE.Vector3(0, -0.06, 0.02).applyQuaternion(root);
    const local = fist.applyQuaternion(handQ.clone().invert()).divide(handS);
    staff.position.copy(local);
    staff.scale.setScalar(1 / handS.x);
    staff.userData.worn = true;
    hand.add(staff);
    this.current = null;
    this.play(was ? Object.entries(this.actions).find(([, a]) => a === was)?.[0] ?? 'Idle_Loop' : 'Idle_Loop', { fade: 0 });
  }

  // Where the staff's crystal is now (spells start here).
  staffTip(v = new THREE.Vector3()) {
    const c = this.worn.staff?.userData.crystal;
    return c ? c.getWorldPosition(v) : this.group.position.clone().setY(1.4);
  }

  update(dt) {
    this.mixer.update(dt);
    this.vrm?.update(dt);
    this.constraints?.update();
    this.face.update(dt);
    // (`speed` is left as it was when a fight or a card takes over: only a walk, a jog or a sprint streams the cape.)
    this.worn.cape?.userData.update(dt, /Walk|Jog|Sprint/.test(this.current?.getClip().name) ? this.speed : 0);
    const s = this.worn.staff;
    if (s) {
      const t = performance.now() / 1000;
      s.userData.crystal.rotation.y = t * 1.4;
      // Gathering a spell, the crystal brightens more than its light: it sits beside her face, and a light of 2.6 there
      // turned her face white.
      s.userData.glow.intensity = 0.12 + Math.sin(t * 3) * 0.04 + (this.charge ?? 0) * 0.35;
      s.userData.crystal.material.emissiveIntensity = 2.3 + (this.charge ?? 0) * 1.5;
    }
  }
}

// A skirt in two layers of scalloped petals, flaring from the waist; short enough that walking legs stay under it.
// A ballgown (`gown`) is fuller and longer, in three tiers, with a gold hem; still clear of her feet when she runs.
function makeSkirt(colour, trim, { gown = false } = {}) {
  const g = new THREE.Group();
  const layer = (top, hem, length, petals, c, y) => {
    const geo = new THREE.CylinderGeometry(top, hem, length, petals * 6, 3, true);
    geo.translate(0, -length / 2, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), yy = p.getY(i);
      const a = Math.atan2(z, x);
      const depth = -yy / length;
      // Scallops at the hem, soft folds above.
      const fold = 1 + Math.cos(a * petals) * 0.05 * depth;
      p.setXYZ(i, x * fold, yy + (depth > 0.99 ? -Math.abs(Math.cos(a * petals / 2)) * 0.03 : 0), z * fold);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide }));
    m.position.y = y;
    g.add(m);
  };
  if (gown) {
    layer(0.135, 0.44, 0.5, 12, colour, 0);
    layer(0.138, 0.36, 0.3, 10, trim, 0.004);
    layer(0.14, 0.24, 0.13, 12, colour, 0.008);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.008, 6, 64), new THREE.MeshStandardMaterial({ color: 0xf3cf6b, metalness: 0.7, roughness: 0.35, emissive: 0xffd36b, emissiveIntensity: 0.4 }));
    hem.rotation.x = Math.PI / 2;
    hem.position.y = -0.5;
    g.add(hem);
  } else {
    layer(0.135, 0.3, 0.27, 8, colour, 0);
    layer(0.14, 0.22, 0.12, 10, trim, 0.005);
  }
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.137, 0.012, 6, 32), new THREE.MeshStandardMaterial({ color: 0xf3cf6b, metalness: 0.7, roughness: 0.35 }));
  belt.rotation.x = Math.PI / 2;
  g.add(belt);
  return g;
}

function makeChefHat() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 24), white);
  band.position.y = 0.04;
  g.add(band);
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), white);
    const a = (i / 6) * Math.PI * 2;
    puff.position.set(Math.cos(a) * 0.06, 0.16, Math.sin(a) * 0.06);
    g.add(puff);
  }
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), white);
  top.position.y = 0.2;
  g.add(top);
  return g;
}
