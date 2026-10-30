// The checks that need the running game (tools/check.mjs drives the page and calls them): every mesh under a part,
// the design files' round-trip, and no inert knob. The game makes them possible with one line, once its scene is up:
//   expose({ scene, camera, renderer });
import * as THREE from 'three';
import { registry } from './registry.mjs';
import { extremes } from './knobs.mjs';
import { roundTrip } from './design.mjs';

const stage = {};

/** Tells the kit (and the checker) where the game's scene is. Call it once the first place is built. */
export function expose({ scene, camera, renderer }) {
  Object.assign(stage, { scene, camera, renderer });
  if (typeof window !== 'undefined') window.__play.ready = true;
}

/** Every mesh, line, point cloud or sprite with no part name on itself or above it. */
export function orphanMeshes(root = stage.scene) {
  const out = [];
  root?.traverse((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
    for (let p = o; p; p = p.parent) if (p.userData.part) return;
    const path = [];
    for (let p = o; p && p !== root; p = p.parent) path.unshift(p.name || p.type);
    out.push(path.join(' > '));
  });
  return out;
}

// What a part is, as data: each mesh's box in the model's frame, its colours, whether it shows. Two builds whose part
// signatures match drew the same part.
function signatures(root) {
  root.updateMatrixWorld(true);
  const out = {};
  root.traverse((o) => {
    if (!(o.isMesh || o.isLine || o.isPoints || o.isSprite) || !o.userData.part) return;
    const name = o.userData.part.split('.')[0];
    const box = new THREE.Box3().setFromObject(o);
    const mats = [o.material].flat().map((m) => [m.color?.getHexString(), m.emissive?.getHexString(), m.opacity, m.map?.uuid].join('/'));
    (out[name] ??= []).push([o.visible, box.min.toArray().map((v) => v.toFixed(3)), box.max.toArray().map((v) => v.toFixed(3)), mats].join('|'));
  });
  return out;
}
function boxOfParts(root, names) {
  const box = new THREE.Box3();
  root.traverse((o) => (o.isMesh || o.isLine || o.isPoints || o.isSprite) && names.has(o.userData.part?.split('.')[0]) && box.expandByObject(o));
  return box;
}

// Two builds of a model, rendered alone, framed on `box`, from one direction: how many pixels differ.
const SIZE = 160;
function differ(renderer, objects, box, dir) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z, 0.01) * 0.6;
  const camera = new THREE.OrthographicCamera(-r, r, r, -r, 0.01, r * 40);
  camera.position.copy(c).addScaledVector(new THREE.Vector3(...dir).normalize(), r * 10);
  camera.lookAt(c);
  const rt = new THREE.WebGLRenderTarget(SIZE, SIZE);
  const before = renderer.getRenderTarget();
  const shots = objects.map((object) => {
    scene.add(object);
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    const px = new Uint8Array(SIZE * SIZE * 4);
    renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
    scene.remove(object);
    return px;
  });
  renderer.setRenderTarget(before);
  rt.dispose();
  const [a, b] = shots;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++;
  return n;
}
// Front on (the game's own view), and three-quarter views from above and below.
const VIEWS = [[0, 0, 1], [1, 1.2, 2], [1, -1.2, 2]];

/** No inert knob: for every model with knobs, each knob at its two extremes must change at least `min` pixels of the
 *  parts it changes, rendered alone and framed on them (the best of three views). Knob groups no model reads (sound,
 *  rules, the camera) are listed, not judged. */
export function inertKnobs(min = 12) {
  const renderer = stage.renderer;
  if (!renderer) return { bad: ['expose({ scene, camera, renderer }) was never called'], unrendered: [] };
  const bad = [], judged = new Set();
  for (const [id, M] of registry.models) {
    const S = M.knobs;
    if (!S) continue;
    judged.add(S.$.group);
    const saved = { ...S.$.values };
    for (const [k, s] of Object.entries(S.$.decl)) {
      const builds = extremes(s).map((v) => {
        S.$.values[k] = v; // straight in: no listeners, so the game's own copies are not refitted
        return M.build(M.checkCtx ?? {});
      });
      S.$.values[k] = saved[k];
      const [sa, sb] = builds.map(signatures);
      const changed = new Set(Object.keys({ ...sa, ...sb }).filter((p) => JSON.stringify(sa[p]) !== JSON.stringify(sb[p])));
      const px = changed.size ? Math.max(...VIEWS.map((d) => differ(renderer, builds, boxOfParts(builds[0], changed).union(boxOfParts(builds[1], changed)), d))) : 0;
      if (px < min) bad.push(`${id}: knob ${S.$.group}.${k} (${s.label}) changes ${changed.size ? `${px} pixels of ${[...changed].join(', ')}` : 'no part'} between ${extremes(s).join(' and ')}`);
    }
  }
  const unrendered = [...registry.knobs.keys()].filter((g) => !judged.has(g));
  return { bad, unrendered };
}

/** Everything the page can tell the checker, in one call. */
export async function pageChecks() {
  return {
    orphans: orphanMeshes(),
    roundTrip: await roundTrip(),
    inert: inertKnobs(),
    counts: { knobs: registry.knobs.size, models: registry.models.size, places: registry.places.size }
  };
}

if (typeof window !== 'undefined') window.__play = Object.assign(window.__play ?? {}, { ready: false, orphanMeshes, inertKnobs, pageChecks, stage });
