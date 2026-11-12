// One animation library for every character: the clips are recorded on Quaternius's Universal Animation Library rig
// and baked, once at load, onto whatever humanoid rig a candidate brings (Rocketbox's 3ds Max Biped, a VRM, Quaternius's
// own rig). Rest poses differ — Rocketbox stands in an A-pose, the VRM in a T-pose — so a bone copies the SOURCE bone's
// change from its rest (which carries the twist), and is then swung so it POINTS where the source bone points (which
// cancels the A/T difference). Both rigs are first normalised to one frame: X = the character's left, Y = up, Z = forward.
import * as THREE from 'three';

// The humanoid slots a rig maps its bones onto. A rig may leave some out (Quaternius has no toes).
export const SLOTS = [
  'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand', 'leftMiddle',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand', 'rightMiddle',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'
];

// Which slot a bone points at, best first. The first one BOTH rigs have is used.
const AIM = {
  spine: ['chest', 'upperChest', 'neck'], chest: ['upperChest', 'neck'], upperChest: ['neck'], neck: ['head'],
  leftShoulder: ['leftUpperArm'], leftUpperArm: ['leftLowerArm'], leftLowerArm: ['leftHand'], leftHand: ['leftMiddle'],
  rightShoulder: ['rightUpperArm'], rightUpperArm: ['rightLowerArm'], rightLowerArm: ['rightHand'], rightHand: ['rightMiddle'],
  leftUpperLeg: ['leftLowerLeg'], leftLowerLeg: ['leftFoot'], leftFoot: ['leftToes'],
  rightUpperLeg: ['rightLowerLeg'], rightLowerLeg: ['rightFoot'], rightFoot: ['rightToes']
};

const key = (name) => name.replace(/[^a-z0-9]/gi, '').toLowerCase();

// Finds each slot's bone by name, ignoring case and punctuation (loaders rename "Bip01 L Hand" / "Hand.L" differently).
export function findSlots(root, map) {
  const byKey = new Map();
  root.traverse((o) => byKey.has(key(o.name)) || byKey.set(key(o.name), o));
  const slots = {};
  for (const [slot, name] of Object.entries(map)) {
    const node = typeof name === 'string' ? byKey.get(key(name)) : name;
    if (node) slots[slot] = node;
  }
  return slots;
}

// Turns `inner` (inside `outer`) so the rig faces +Z with its left on +X, scales it to `height` metres and stands its
// feet on y = 0. Must run with the rig in its rest pose.
export function normalise(outer, inner, slots, height) {
  outer.updateMatrixWorld(true);
  const p = (s) => slots[s].getWorldPosition(new THREE.Vector3());
  const feet = p('leftFoot').add(p('rightFoot')).multiplyScalar(0.5);
  const up = p('head').sub(feet).normalize();
  const left = p('leftUpperArm').sub(p('rightUpperArm'));
  left.sub(up.clone().multiplyScalar(left.dot(up))).normalize();
  const fwd = new THREE.Vector3().crossVectors(left, up);
  const basis = new THREE.Matrix4().makeBasis(left, up, fwd);
  inner.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(basis).invert());
  outer.updateMatrixWorld(true);
  // A skinned mesh caches its (skinned) box: clear it, or the second measure reads the first.
  const measure = () => {
    const box = new THREE.Box3();
    inner.traverse((o) => {
      if (!o.isMesh) return;
      if (o.isSkinnedMesh) o.boundingBox = null;
      box.expandByObject(o);
    });
    return box;
  };
  let box = measure();
  inner.scale.multiplyScalar(height / (box.max.y - box.min.y));
  outer.updateMatrixWorld(true);
  box = measure();
  const hips = p('hips');
  inner.position.add(new THREE.Vector3(-hips.x, -box.min.y, -hips.z));
  outer.updateMatrixWorld(true);
}

// Everything the bake needs to know about a rig at rest. Call with the rig normalised and in its rest pose.
export function captureRest(slots) {
  const rest = {};
  for (const [slot, node] of Object.entries(slots)) {
    node.updateWorldMatrix(true, false);
    rest[slot] = {
      localQ: node.quaternion.clone(),
      localP: node.position.clone(),
      worldQ: node.getWorldQuaternion(new THREE.Quaternion()),
      worldP: node.getWorldPosition(new THREE.Vector3()),
      worldInv: node.matrixWorld.clone().invert(),
      parentWorldInv: node.parent.matrixWorld.clone().invert()
    };
  }
  return rest;
}

// The bake: samples `clip` on the source rig at `fps` and writes a clip that drives the target's slots, with tracks
// named `ls_<slot>` (the target's slot nodes are renamed to match, so a clone of the target plays the same clip).
export function bakeClip(clip, src, tgt, fps = 30) {
  const mixer = new THREE.AnimationMixer(src.root);
  const action = mixer.clipAction(clip);
  // Sampled as a one-shot that holds its end: looping, `setTime(clip.duration)` wraps to 0, so every baked clip ended
  // on its FIRST pose. Harmless for a loop; Sitting_Enter's last frame stood back up and Sitting_Exit's sat back down,
  // so a Sim sat, popped up and sat again (round 7, the loo).
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();

  const slotOf = new Map(Object.entries(tgt.slots).map(([s, n]) => [n, s]));
  // Target nodes, parents before children, from the lowest node above every slot (Quaternius hangs the legs off a
  // `Root` bone beside the hips, not under them); unmapped ones between keep their rest rotation.
  const isUnder = (node, top) => {
    for (let o = node; o; o = o.parent) if (o === top) return true;
    return false;
  };
  let top = tgt.slots.hips;
  while (top.parent && !Object.values(tgt.slots).every((n) => isUnder(n, top))) top = top.parent;
  const order = [];
  top.traverse((o) => order.push(o));
  const aim = {};
  for (const slot of Object.keys(tgt.slots)) {
    const to = (AIM[slot] ?? []).find((a) => tgt.slots[a] && src.slots[a] && src.slots[slot]);
    if (!to) continue;
    // Where the aimed-at bone sits in this bone's own frame at rest (constant while the bones between keep rest).
    const local = tgt.rest[to].worldP.clone().applyMatrix4(tgt.rest[slot].worldInv);
    aim[slot] = { to, dir: local.normalize() };
  }
  const hipScale = tgt.rest.hips.worldP.y / src.rest.hips.worldP.y;
  // The bone that carries the body's movement: the hips, unless the legs hang off a bone above them — then that one,
  // or sitting lowers the body and leaves the legs at standing height.
  const mover = top !== tgt.slots.hips && top.isBone ? top : tgt.slots.hips;
  if (mover !== tgt.slots.hips) mover.name = 'ls_root';
  mover.updateWorldMatrix(true, false);
  const moverOffset = tgt.rest.hips.worldP.clone().sub(mover.getWorldPosition(new THREE.Vector3()));
  const moverParentInv = mover.parent.matrixWorld.clone().invert();
  const baseQ = top.parent.getWorldQuaternion(new THREE.Quaternion());

  const frames = Math.max(2, Math.ceil(clip.duration * fps) + 1);
  const times = new Float32Array(frames);
  const quats = Object.fromEntries(Object.keys(tgt.slots).filter((s) => src.slots[s]).map((s) => [s, new Float32Array(frames * 4)]));
  const hipPos = new Float32Array(frames * 3);
  const world = new Map();
  const sQ = {}, sP = {};
  const q = new THREE.Quaternion(), d = new THREE.Quaternion(), dirT = new THREE.Vector3(), dirS = new THREE.Vector3();
  let footSpeed = [];
  let prevStance = null;

  for (let f = 0; f < frames; f++) {
    const t = Math.min(f / fps, clip.duration);
    times[f] = t;
    mixer.setTime(t);
    src.root.updateMatrixWorld(true);
    for (const [s, n] of Object.entries(src.slots)) {
      sQ[s] = n.getWorldQuaternion(sQ[s] ?? new THREE.Quaternion());
      sP[s] = n.getWorldPosition(sP[s] ?? new THREE.Vector3());
    }
    world.clear();
    for (const node of order) {
      const parentW = world.get(node.parent) ?? baseQ;
      const slot = slotOf.get(node);
      if (!slot || !quats[slot]) {
        world.set(node, parentW.clone().multiply(slot ? tgt.rest[slot].localQ : node.quaternion));
        continue;
      }
      // The source bone's change from rest, applied to the target bone's rest…
      d.copy(sQ[slot]).multiply(src.rest[slot].worldQ.clone().invert());
      const w = d.clone().multiply(tgt.rest[slot].worldQ);
      // …then swung so the bone points where the source bone points.
      const a = aim[slot];
      if (a) {
        dirT.copy(a.dir).applyQuaternion(w);
        dirS.copy(sP[a.to]).sub(sP[slot]).normalize();
        w.premultiply(q.setFromUnitVectors(dirT.normalize(), dirS));
      }
      world.set(node, w);
      const local = parentW.clone().invert().multiply(w);
      local.toArray(quats[slot], f * 4);
    }
    const hp = sP.hips.clone().multiplyScalar(hipScale).sub(moverOffset).applyMatrix4(moverParentInv);
    hp.toArray(hipPos, f * 3);
    // Walk speed, read off the clip: the lower foot is on the ground, and moves back at the speed the body goes forward.
    if (src.slots.leftFoot && f > 0) {
      const stance = sP.leftFoot.y < sP.rightFoot.y ? 'leftFoot' : 'rightFoot';
      if (prevStance && prevStance.slot === stance) footSpeed.push(Math.abs(sP[stance].z - prevStance.z) * fps);
      prevStance = { slot: stance, z: sP[stance].z };
    } else if (src.slots.leftFoot) {
      const stance = sP.leftFoot.y < sP.rightFoot.y ? 'leftFoot' : 'rightFoot';
      prevStance = { slot: stance, z: sP[stance].z };
    }
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(src.root);

  const tracks = [new THREE.VectorKeyframeTrack(`${mover.name}.position`, times, hipPos)];
  for (const [slot, values] of Object.entries(quats)) tracks.push(new THREE.QuaternionKeyframeTrack(`ls_${slot}.quaternion`, times, values));
  const baked = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  footSpeed.sort((x, y) => x - y);
  baked.userData = { speed: (footSpeed[Math.floor(footSpeed.length / 2)] ?? 0) * hipScale };
  return baked;
}

// Renames the target's slot nodes to the names the baked tracks use. Run after captureRest, before baking.
export function nameSlots(slots) {
  for (const [slot, node] of Object.entries(slots)) node.name = `ls_${slot}`;
}

// Puts a rig back to its rest pose (the bake leaves the source wherever the last frame was).
export function resetRest(slots, rest) {
  for (const [slot, node] of Object.entries(slots)) {
    node.quaternion.copy(rest[slot].localQ);
    node.position.copy(rest[slot].localP);
  }
}
