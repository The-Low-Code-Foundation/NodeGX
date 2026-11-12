// The four animations between seats (sequence.mjs says how a timeline runs): out through the airlock, back in through
// it, into the Wren and out of the bay, and back into the bay on its own guidance once you have flown her to the door.
// Each builds a Sequence over the Kestrel's own frame (the rooms, the parked Wren, the doors are all in it), so a ship
// under way carries the whole scene with her. Each ends in the verb a drive already uses: setPhase('eva'),
// setPhase('walk'), launch(), land(). E skips to that end.

import * as THREE from 'three';
import { Sequence, ease, easeOut } from './sequence.mjs';
import { foldWings, openCanopy, setThrust } from './ships.mjs';
import { setBayDoor, setAirlockDoor } from './models/kestrel.mjs';
import { makePerson, animatePerson } from './people.mjs';

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** The camera at `eye`, looking at `look`, both in the Kestrel's frame. */
function frameShot(game, c, eye, look) {
  const k = game.player.obj;
  k.updateMatrixWorld();
  const e = eye.clone().applyMatrix4(k.matrixWorld);
  const l = look.clone().applyMatrix4(k.matrixWorld);
  const up = UP.clone().applyQuaternion(k.getWorldQuaternion(new THREE.Quaternion()));
  c.position.copy(e);
  c.quaternion.setFromRotationMatrix(_m.lookAt(e, l, up));
}

/** Through the Wren's eyes (her own hull hidden, as in her cockpit). */
function cockpitShot(wren, c) {
  wren.updateMatrixWorld(true);
  c.position.copy(wren.localToWorld(wren.userData.eye.clone()));
  wren.getWorldQuaternion(c.quaternion);
}

function cockpitView(wren, inside) {
  wren.traverse((m) => m.userData.cockpitHidden && (m.visible = !inside));
}

/** A person for the animation, in your look: crew clothes, or the suit. */
function body(game, kind) {
  const key = `${kind}|${JSON.stringify(game.look())}`;
  if (game.cinePerson?.userData.key !== key) {
    game.cinePerson?.removeFromParent();
    game.cinePerson = makePerson(game.look(), { kind });
    game.cinePerson.userData.key = key;
  }
  return game.cinePerson;
}

function dropBody(game) {
  game.cinePerson?.removeFromParent();
  game.cinePerson = null;
}

function say(game, text, cls = 'warn', secs = 2.2) {
  game.banner(text, cls, secs);
}

// --- the airlock ---------------------------------------------------------------------------------------------------

const SPOT = (I) => new THREE.Vector3(-5.6, I.floorY, -6);

/** Out: to the middle of the airlock, the inner door down, the helmet on, the klaxon and the air going, the outer
 *  doors up, and you drift out into the space walk. */
export function airlockOut(game) {
  const I = game.interior, W = game.walker, K = game.player.obj;
  const from = W.pos.clone(), yaw0 = W.yaw, pitch0 = W.pitch;
  const spot = SPOT(I);
  const hullX = K.userData.airlock.x - 0.7;
  const out = new THREE.Vector3(hullX - 5.3, I.floorY + 0.4, -6); // where the space walk starts (Eva.enter)
  const mist = makeMist(I.group, new THREE.Vector3(-5.6, I.floorY + 1.4, -6));
  const seq = new Sequence('airlockOut', {
    length: 9.2,
    inside: true,
    end: () => {
      mist.removeFromParent();
      dropBody(game);
      I.alarm('airlock', null);
      I.doors.airlockOuter.set(0);
      I.doors.airlockInner.set(1);
      setAirlockDoor(K, 0);
      game.visorOn = false;
      game.setPhase('eva');
    }
  });
  const third = !!game.chase.walk;
  const me = body(game, 'crew');
  me.visible = third;
  I.group.add(me);
  const place = (dt, pose = 'idle', speed = 0) => {
    const p = game.cinePerson; // the suit replaces the clothes half-way
    if (!p) return;
    p.position.copy(W.pos);
    p.rotation.set(0, W.yaw, 0);
    animatePerson(p, dt, { pose, speed });
  };
  seq.shot(0, 99, (c) => {
    W.placeCamera(c, K, third);
    seq.inside = W.pos.x > hullX + 0.3;
    if (seq.shake) c.position.add(new THREE.Vector3((Math.random() - 0.5) * seq.shake, (Math.random() - 0.5) * seq.shake, 0));
  });
  seq.track(0, 1.1, (k, dt) => {
    const e = ease(k);
    W.pos.lerpVectors(from, spot, e);
    W.yaw = lerpAngle(yaw0, Math.PI / 2, e);
    W.pitch = lerp(pitch0, 0.05, e);
    place(dt, k < 1 ? 'walk' : 'idle', k < 1 ? 3 : 0);
  });
  seq.at(0.9, () => {
    I.alarm('airlock', 'amber');
    game.sfx.cue('servo', { dur: 1.2 });
    say(game, 'AIRLOCK · CYCLING');
  });
  seq.track(1.1, 2.2, (k) => I.doors.airlockInner.set(1 - ease(k)));
  seq.at(2.2, () => game.sfx.cue('clunk'));
  // The helmet: a blink to dark, and you are in the suit.
  seq.at(2.4, () => game.fadeEl.classList.add('on'));
  seq.at(2.85, () => {
    const suit = body(game, 'suit');
    suit.visible = third;
    I.group.add(suit);
    place(0);
    game.visorOn = true;
    game.sfx.cue('clunk', { vol: 0.6 });
  });
  seq.at(2.95, () => {
    game.fadeEl.classList.remove('on');
    game.sfx.cue('chime');
    say(game, 'SUIT SEALED · AIR 3:00', 'good');
  });
  seq.track(2.4, 3.4, (k, dt) => place(dt));
  seq.at(3.5, () => {
    I.alarm('airlock', 'red');
    game.sfx.cue('klaxon', { n: 3 });
    game.sfx.cue('hiss', { dur: 3.2 });
    say(game, 'DEPRESSURISING · 3', 'bad', 1.1);
  });
  seq.at(4.5, () => say(game, 'DEPRESSURISING · 2', 'bad', 1.1));
  seq.at(5.5, () => say(game, 'DEPRESSURISING · 1', 'bad', 1.1));
  seq.track(3.5, 6.5, (k, dt) => {
    mist.userData.flow(k, dt, 1 - k);
    seq.shake = 0.03 * (1 - k);
    place(dt);
  });
  seq.at(6.5, () => {
    seq.shake = 0;
    I.alarm('airlock', 'vacuum');
    game.sfx.cue('servo', { dur: 1.4 });
    say(game, 'VACUUM · OUTER DOOR OPEN', 'warn', 1.8);
  });
  seq.track(6.5, 7.9, (k, dt) => {
    I.doors.airlockOuter.set(ease(k));
    setAirlockDoor(K, ease(Math.min(1, k * 1.2)));
    place(dt);
  });
  seq.track(8.0, 9.2, (k, dt) => {
    const e = ease(k);
    W.pos.lerpVectors(spot, out, e);
    W.pitch = lerp(0.05, 0, e);
    place(dt, 'float');
  });
  return seq;
}

/** In: from your suit to the outer door and into the airlock, the doors shut behind you, air back, the helmet off,
 *  the inner door up. */
export function airlockIn(game) {
  const I = game.interior, W = game.walker, K = game.player.obj;
  K.updateMatrixWorld();
  const start = K.worldToLocal(game.eva.pos.clone()).sub(new THREE.Vector3(0, 1.6, 0));
  const hullX = K.userData.airlock.x - 0.7;
  const mouth = new THREE.Vector3(hullX - 1.2, I.floorY, -6);
  const spot = SPOT(I);
  I.doors.airlockOuter.set(1);
  I.doors.airlockInner.set(0);
  setAirlockDoor(K, 1);
  I.alarm('airlock', 'vacuum');
  game.visorOn = true;
  const third = !!game.chase.eva;
  const me = body(game, 'suit');
  me.visible = third;
  I.group.add(me);
  W.pos.copy(start);
  W.yaw = -Math.PI / 2;
  W.pitch = 0;
  const place = (dt, pose = 'idle', speed = 0) => {
    const p = game.cinePerson; // the suit replaces the clothes half-way
    if (!p) return;
    p.position.copy(W.pos);
    p.rotation.set(0, W.yaw, 0);
    animatePerson(p, dt, { pose, speed });
  };
  const seq = new Sequence('airlockIn', {
    length: 8.2,
    inside: false,
    end: () => {
      dropBody(game);
      I.alarm('airlock', null);
      I.doors.airlockOuter.set(0);
      I.doors.airlockInner.set(1);
      setAirlockDoor(K, 0);
      game.visorOn = false;
      game.setPhase('walk', { at: spot.clone(), yaw: -Math.PI / 2 });
      game.pickedUp();
    }
  });
  seq.shot(0, 99, (c) => {
    W.placeCamera(c, K, third);
    seq.inside = W.pos.x > hullX + 0.3;
  });
  seq.track(0, 2.2, (k, dt) => {
    const e = ease(k);
    if (e < 0.5) W.pos.lerpVectors(start, mouth, e * 2);
    else W.pos.lerpVectors(mouth, spot, e * 2 - 1);
    place(dt, 'float');
  });
  seq.at(2.3, () => {
    game.sfx.cue('servo', { dur: 1.2 });
    I.alarm('airlock', 'amber');
  });
  seq.track(2.3, 3.5, (k, dt) => {
    I.doors.airlockOuter.set(1 - ease(k));
    setAirlockDoor(K, 1 - ease(k));
    W.yaw = lerpAngle(-Math.PI / 2, Math.PI / 2, ease(k)); // you turn to watch it shut
    place(dt);
  });
  seq.at(3.5, () => game.sfx.cue('clunk'));
  seq.at(3.7, () => {
    game.sfx.cue('klaxon', { n: 2, vol: 0.6 });
    game.sfx.cue('hiss', { dur: 2.6, rise: true });
    say(game, 'REPRESSURISING', 'warn', 2.4);
  });
  seq.track(3.7, 6.2, (k, dt) => place(dt));
  seq.at(6.2, () => {
    I.alarm('airlock', 'green');
    game.sfx.cue('chime');
    say(game, 'PRESSURE NOMINAL', 'good', 1.6);
  });
  seq.at(6.4, () => game.fadeEl.classList.add('on'));
  seq.at(6.85, () => {
    const crew = body(game, 'crew');
    crew.visible = third;
    I.group.add(crew);
    game.visorOn = false;
  });
  seq.at(6.95, () => game.fadeEl.classList.remove('on'));
  seq.at(7.0, () => game.sfx.cue('servo', { dur: 1 }));
  seq.track(6.4, 8.2, (k, dt) => {
    W.yaw = lerpAngle(Math.PI / 2, -Math.PI / 2, ease(Math.max(0, k * 2 - 0.6)));
    place(dt);
  });
  seq.track(7.0, 8.0, (k) => I.doors.airlockInner.set(ease(k)));
  return seq;
}

/** A puff of air: points that stream from the middle of the airlock out to the outer door as it vents. */
/** A round grain that fades at its edge (a bare PointsMaterial draws hard squares). */
let _dot = null;
function softDot() {
  if (_dot) return _dot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.9)');
  r.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}

function makeMist(group, at) {
  const N = 140;
  const pos = new Float32Array(N * 3);
  const seed = Array.from({ length: N }, () => [Math.random() * 3.6 - 1.8, Math.random() * 2.4 - 1.2, Math.random()]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: '#dfe8ff', size: 0.22, map: softDot(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, m);
  pts.userData.live = true;
  pts.frustumCulled = false;
  group.add(pts);
  let t = 0;
  pts.userData.flow = (k, dt, strength) => {
    t += dt;
    m.opacity = 0.55 * Math.sin(Math.PI * Math.min(1, k * 1.1));
    for (let i = 0; i < N; i++) {
      const [z, y, ph] = seed[i];
      const u = (ph + t * 0.9) % 1; // each grain's trip from the middle to the door
      pos[i * 3] = at.x - u * 1.9;
      pos[i * 3 + 1] = at.y + y * (1 - u * 0.6) * strength;
      pos[i * 3 + 2] = at.z + z * (1 - u * 0.7);
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

// --- the bay ---------------------------------------------------------------------------------------------------------

const PAD = (I) => I.fighterPad.clone();
const SEAT = new THREE.Vector3(0, -0.05, -0.35); // where you sit, in the Wren's own frame
const LADDER_FOOT = (I) => new THREE.Vector3(-2.05, I.floorY, 28.7);
const LADDER_TOP = (I) => new THREE.Vector3(-1.55, I.floorY + 1.85, 28.55);
const CORNER = (I) => new THREE.Vector3(-5.4, I.floorY + 2.7, 31.6); // low at the door end, looking up the Wren's flank
const HIGH = (I) => new THREE.Vector3(-5.3, I.floorY + 3.85, 20.4); // high at the hold end, port side (the starboard pipe and gas
// bottles stood across the frame), looking down the bay to the door

function setBlast(I, k) {
  I.doors.bayUpper.set(k);
  I.doors.bayLower.set(k);
}

/** Into the Wren and out: the canopy up, up the ladder and in, the canopy down; the bay's klaxon, the wings fold,
 *  the doors part, she lifts and goes out of the stern, the wings spread, and the doors close behind her. */
export function launchSequence(game) {
  const I = game.interior, W = game.walker, K = game.player.obj, wren = game.parkedWren;
  const pad = PAD(I);
  const me = body(game, 'crew');
  I.group.add(me);
  me.visible = true;
  const from = W.pos.clone();
  const foot = LADDER_FOOT(I), top = LADDER_TOP(I);
  const seatHost = () => wren.localToWorld(SEAT.clone()).applyMatrix4(new THREE.Matrix4().copy(I.group.matrixWorld).invert());
  wren.position.copy(pad);
  wren.rotation.set(0, Math.PI, 0);
  foldWings(wren, 0);
  openCanopy(wren, 0);
  const seq = new Sequence('launch', {
    length: 14,
    inside: true,
    end: () => {
      // The flying Wren takes over where this one is; this one goes back to the pad for next time.
      wren.updateMatrixWorld(true);
      const at = wren.getWorldPosition(new THREE.Vector3()), q = wren.getWorldQuaternion(new THREE.Quaternion());
      dropBody(game);
      I.bayLadder.visible = false;
      I.alarm('bay', null);
      setBlast(I, 0);
      setBayDoor(K, 0);
      game.bayLamps = false;
      cockpitView(wren, false);
      wren.position.copy(pad);
      wren.rotation.set(0, Math.PI, 0);
      foldWings(wren, 0);
      openCanopy(wren, 0);
      setThrust(wren, 0);
      game.launch({ at, q });
    }
  });
  // Shot 1: from the door end of the bay, low, up her flank: the canopy, the ladder, you climbing in.
  seq.shot(0, 4.7, (c) => frameShot(game, c, CORNER(I), new THREE.Vector3(-0.6, I.floorY + 1.3, 27.6)));
  seq.at(0, () => {
    I.bayLadder.visible = true;
    game.sfx.cue('servo', { dur: 1.2 });
  });
  seq.track(0, 1.2, (k) => openCanopy(wren, ease(k)));
  seq.track(0, 1.6, (k, dt) => {
    me.position.lerpVectors(from, foot, ease(k));
    const to = Math.atan2(-(foot.x - from.x), -(foot.z - from.z));
    me.rotation.set(0, k < 0.85 ? to : lerpAngle(to, -Math.PI / 2, (k - 0.85) / 0.15), 0);
    animatePerson(me, dt, { pose: k < 1 ? 'walk' : 'idle', speed: 3 });
  });
  seq.track(1.6, 2.8, (k, dt) => {
    me.position.lerpVectors(foot, top, k);
    me.rotation.set(0, -Math.PI / 2, 0);
    animatePerson(me, dt, { pose: 'walk', speed: 2.2 });
  });
  seq.track(2.8, 3.6, (k, dt) => {
    const s = seatHost();
    me.position.lerpVectors(top, s, ease(k));
    me.position.y += Math.sin(Math.PI * k) * 0.45;
    me.rotation.set(0, lerpAngle(-Math.PI / 2, Math.PI, ease(k)), 0);
    animatePerson(me, dt, { pose: k < 0.6 ? 'walk' : 'sit', speed: 1.5 });
  });
  seq.at(3.6, () => {
    wren.attach(me); // she carries you now
    me.position.copy(SEAT);
    me.rotation.set(0, 0, 0);
    I.bayLadder.visible = false;
    game.sfx.cue('servo', { dur: 0.9 });
  });
  seq.track(3.6, 14, (k, dt) => animatePerson(me, dt, { pose: 'sit' }));
  seq.track(3.7, 4.6, (k) => openCanopy(wren, 1 - ease(k)));
  seq.at(4.6, () => {
    game.sfx.cue('clunk');
    game.sfx.cue('chime');
    say(game, 'WREN · CANOPY SEALED', 'good', 1.4);
  });
  // Shot 2: high at the hold end, down the bay: the klaxon, the beacons, the wings folding, the doors parting.
  seq.shot(4.7, 8.7, (c, k) => frameShot(game, c, HIGH(I).add(new THREE.Vector3(0, 0, k * 1.2)), new THREE.Vector3(0, I.floorY + 1.1, 31.5)));
  seq.at(4.9, () => {
    I.alarm('bay', 'red');
    game.bayLamps = true;
    game.sfx.cue('klaxon', { n: 4 });
    game.sfx.cue('hiss', { dur: 3 });
    say(game, 'BAY DEPRESSURISING · CLEAR THE DECK', 'bad', 1.9);
  });
  seq.at(5.0, () => game.sfx.cue('servo', { dur: 1.6 }));
  seq.track(5.0, 6.6, (k) => foldWings(wren, ease(k)));
  seq.at(6.7, () => {
    I.alarm('bay', 'amber');
    game.sfx.cue('servo', { dur: 2 });
    say(game, 'BAY DOORS OPENING', 'warn', 1.8);
  });
  seq.track(6.8, 8.4, (k) => setBlast(I, ease(k)));
  seq.track(7.1, 8.7, (k) => setBayDoor(K, ease(k)));
  seq.track(6.9, 8.7, (k) => {
    wren.position.y = pad.y + 0.5 * ease(k);
    setThrust(wren, 0.15 * k);
  });
  // Shot 3: through her canopy, out of the door; the shell is drawn once you are past it.
  seq.shot(8.7, 11.8, (c) => {
    cockpitView(wren, true);
    me.visible = false;
    cockpitShot(wren, c);
    seq.inside = wren.position.z < 35.6;
  });
  seq.at(8.7, () => game.sfx.cue('roar', { dur: 3.2 }));
  seq.track(8.7, 11.8, (k) => {
    wren.position.z = pad.z + 26 * k * k;
    wren.position.y = pad.y + 0.5 - 0.3 * k;
    setThrust(wren, 0.2 + 0.8 * k);
  });
  seq.track(10.3, 11.4, (k) => foldWings(wren, 1 - ease(k)));
  // Shot 4: off her quarter, the Wren pulling away astern; the doors close behind her.
  seq.shot(11.8, 14, (c, k) => {
    cockpitView(wren, false);
    me.visible = true;
    frameShot(game, c, new THREE.Vector3(15, 7, 46), wren.position.clone());
  }, { inside: false });
  seq.track(11.8, 14, (k) => {
    wren.position.z = pad.z + 26 + 40 * k + 12 * k * k;
    setThrust(wren, 1);
  });
  seq.at(12.0, () => {
    I.alarm('bay', 'amber');
    game.sfx.cue('servo', { dur: 1.8 });
  });
  seq.track(12.0, 13.8, (k) => {
    setBlast(I, 1 - ease(k));
    setBayDoor(K, 1 - ease(k));
  });
  return seq;
}

/** Back in: the bay's guidance takes the Wren from wherever you brought her near the door, lines her up astern,
 *  folds her wings, slides her in over the pad and sets her down; the doors shut, the air comes back, the pad turns her
 *  round to face the door again, the canopy lifts and you climb down. */
export function landSequence(game) {
  const I = game.interior, W = game.walker, K = game.player.obj, wren = game.parkedWren, f = game.fighterEnt.obj;
  K.updateMatrixWorld();
  f.updateMatrixWorld();
  const kq = K.getWorldQuaternion(new THREE.Quaternion());
  const p0 = K.worldToLocal(f.position.clone());
  const q0 = kq.clone().invert().multiply(f.quaternion);
  const pad = PAD(I);
  const lineUp = new THREE.Vector3(0, pad.y + 0.5, 50);
  const over = new THREE.Vector3(0, pad.y + 0.5, pad.z);
  const qIn = new THREE.Quaternion(); // nose forward (−z): into the bay
  const t1 = THREE.MathUtils.clamp(p0.distanceTo(lineUp) / 22, 2.2, 5);
  const ctrl = p0.clone().lerp(lineUp, 0.5).add(new THREE.Vector3(0, 0, 12)); // swing round astern of the door
  const curve = new THREE.QuadraticBezierCurve3(p0, ctrl, lineUp);
  const L = t1 + 13.4;
  wren.position.copy(p0);
  wren.quaternion.copy(q0);
  wren.visible = true;
  foldWings(wren, 0);
  openCanopy(wren, 0);
  setThrust(wren, 0.6);
  const me = body(game, 'crew');
  wren.add(me);
  me.position.copy(SEAT);
  me.rotation.set(0, 0, 0);
  const stand = new THREE.Vector3(-2.7, I.floorY, 29.6);
  const foot = LADDER_FOOT(I), top = LADDER_TOP(I);
  game.world.remove(game.fighterEnt);
  game.tweens.list.delete('bayDoors'); // the doors are the animation's now
  setBlast(I, 1);
  setBayDoor(K, 1);
  game.bayLamps = true;
  const seq = new Sequence('land', {
    length: L,
    inside: false,
    end: () => {
      dropBody(game);
      I.bayLadder.visible = false;
      I.alarm('bay', null);
      setBlast(I, 0);
      setBayDoor(K, 0);
      game.bayLamps = false;
      game.bay.requested = false;
      game.bay.k = 0;
      cockpitView(wren, false);
      wren.position.copy(pad);
      wren.rotation.set(0, Math.PI, 0);
      foldWings(wren, 0);
      openCanopy(wren, 0);
      setThrust(wren, 0);
      game.land({ at: stand.clone(), yaw: 0 }); // facing into the bay, her wing and flank on your right
    }
  });
  seq.at(0, () => {
    game.sfx.cue('chime');
    say(game, 'BAY GUIDANCE HAS HER · HANDS OFF', 'good', 2);
  });
  // Shot 1: through the canopy as the bay's guidance flies her round to the door.
  seq.shot(0, t1, (c) => {
    cockpitView(wren, true);
    me.visible = false;
    cockpitShot(wren, c);
  }, { inside: false });
  seq.track(0, t1, (k) => {
    const e = ease(k);
    wren.position.copy(curve.getPoint(e));
    wren.quaternion.slerpQuaternions(q0, qIn, easeOut(k * 1.3));
    setThrust(wren, 0.6 - 0.4 * k);
  });
  // Shot 2: from inside the bay, looking out of the open door: she hangs there, folds her wings and comes in.
  seq.shot(t1, t1 + 5.4, (c, k) => {
    cockpitView(wren, false);
    me.visible = true;
    frameShot(game, c, new THREE.Vector3(-4.6, I.floorY + 3.4, 21.8 + k * 1.5), wren.position.clone().lerp(new THREE.Vector3(0, I.floorY + 1.2, 36), 0.35));
  }, { inside: true });
  seq.at(t1, () => game.sfx.cue('servo', { dur: 1.3 }));
  seq.track(t1, t1 + 1.4, (k) => {
    foldWings(wren, ease(k));
    wren.position.copy(lineUp);
    wren.position.y += Math.sin(k * Math.PI * 2) * 0.05;
  });
  seq.track(t1 + 1.4, t1 + 4.4, (k) => {
    wren.position.lerpVectors(lineUp, over, easeOut(k));
    setThrust(wren, 0.2 - 0.15 * k);
  });
  seq.track(t1 + 4.4, t1 + 5.2, (k) => {
    wren.position.copy(over);
    wren.position.y = lerp(over.y, pad.y, ease(k));
  });
  seq.at(t1 + 5.2, () => {
    game.sfx.cue('clunk');
    setThrust(wren, 0);
  });
  // Shot 3: high at the hold end: the doors shut, the air comes back, the pad turns her round, the wings spread.
  seq.shot(t1 + 5.4, t1 + 10.2, (c, k) => frameShot(game, c, HIGH(I).add(new THREE.Vector3(0, 0, k)), new THREE.Vector3(0, I.floorY + 0.8, 29)), { inside: true });
  seq.at(t1 + 5.3, () => {
    I.alarm('bay', 'amber');
    game.sfx.cue('servo', { dur: 1.8 });
    say(game, 'BAY DOORS CLOSING', 'warn', 1.6);
  });
  seq.track(t1 + 5.3, t1 + 7.1, (k) => {
    setBlast(I, 1 - ease(k));
    setBayDoor(K, 1 - ease(k));
  });
  seq.at(t1 + 7.2, () => {
    game.sfx.cue('clunk');
    game.sfx.cue('klaxon', { n: 2, vol: 0.6 });
    game.sfx.cue('hiss', { dur: 2.4, rise: true });
    game.bayLamps = false;
    say(game, 'BAY REPRESSURISING', 'warn', 2.2);
  });
  seq.track(t1 + 7.2, t1 + 9.2, (k) => wren.rotation.set(0, Math.PI * ease(k), 0));
  seq.at(t1 + 9.3, () => {
    I.alarm('bay', 'green');
    game.sfx.cue('chime');
    say(game, 'PRESSURE NOMINAL · WELCOME HOME', 'good', 1.8);
  });
  seq.track(t1 + 9.2, t1 + 10.2, (k) => foldWings(wren, 1 - ease(k)));
  // Shot 4: low at the door end, up her flank: the canopy, you climbing down.
  seq.shot(t1 + 10.2, L, (c) => frameShot(game, c, CORNER(I), new THREE.Vector3(-1.2, I.floorY + 1.1, 28.2)), { inside: true });
  seq.at(t1 + 10.2, () => {
    game.sfx.cue('servo', { dur: 1.1 });
    I.bayLadder.visible = true;
  });
  seq.track(t1 + 10.2, t1 + 11.2, (k) => openCanopy(wren, ease(k)));
  seq.track(0, t1 + 11.2, (k, dt) => animatePerson(me, dt, { pose: 'sit' }));
  seq.at(t1 + 11.2, () => I.group.attach(me));
  seq.track(t1 + 11.2, t1 + 11.9, (k, dt) => {
    const s = I.group.worldToLocal(wren.localToWorld(SEAT.clone()));
    me.position.lerpVectors(s, top, ease(k));
    me.position.y += Math.sin(Math.PI * k) * 0.45;
    me.rotation.set(0, lerpAngle(Math.PI, -Math.PI / 2, ease(k)), 0);
    animatePerson(me, dt, { pose: 'walk', speed: 1.5 });
  });
  seq.track(t1 + 11.9, t1 + 12.8, (k, dt) => {
    me.position.lerpVectors(top, foot, k);
    me.rotation.set(0, -Math.PI / 2, 0);
    animatePerson(me, dt, { pose: 'walk', speed: 2.2 });
  });
  seq.at(t1 + 12.6, () => game.sfx.cue('servo', { dur: 0.8 }));
  seq.track(t1 + 12.6, t1 + 13.3, (k) => openCanopy(wren, 1 - ease(k)));
  seq.track(t1 + 12.8, L, (k, dt) => {
    me.position.lerpVectors(foot, stand, ease(k));
    const to = Math.atan2(-(stand.x - foot.x), -(stand.z - foot.z));
    me.rotation.set(0, k < 0.5 ? to : lerpAngle(to, 0, Math.min(1, (k - 0.5) / 0.4)), 0);
    animatePerson(me, dt, { pose: k < 1 ? 'walk' : 'idle', speed: 2 });
  });
  return seq;
}
