// Fly an X-wing: the cockpit view of the 1993 game, over the same battle. You are one more Rebel
// fighter in it: the TIEs hunt you the way they hunt the others, your four cannons put real bolts
// into the same battle, and a kill is the same fireball. Nothing here touches the project.
//
// Fly with the mouse (a click on the view takes the pointer; Esc gives it back) or the arrows; A / D roll; W / S
// throttle (or the wheel); Space or a click fires; T picks the next TIE; Esc goes back to the map.
// The HUD is a 2D canvas over the map: the cockpit frame, the reticle, a bracket on the target and
// a diamond where to lead it, the fore and aft scopes, shields, lasers and the score.

import * as THREE from 'three';
import { SIDES } from '/ships.mjs';

const SPEED = { min: 28, max: 115 }; // world units a second at throttle 0 and 1 (the fighters fly 55–80)
const TURN = { pitch: 1.5, yaw: 1.15, roll: 2.6 }; // radians a second at full deflection
const CANNON = { speed: 430, range: 700, every: 0.14, converge: 320, cost: 7, recharge: 22 }; // energy out of 100: a shot's cost, a second's recharge
const SHIELDS = { full: 100, hit: 20, regen: 5 }; // a TIE's bolt takes 20; 5 a second comes back
const TIE_RADIUS = 4.5; // a bolt this close to a TIE's centre is a hit
// The X-wing's cannon tips in the ship's own space (nose along -z, as a camera looks), and the pilot's eye above the hull.
const MUZZLES = [new THREE.Vector3(-3.35, 0.75, -2.1), new THREE.Vector3(3.35, 0.75, -2.1), new THREE.Vector3(-3.35, -0.75, -2.1), new THREE.Vector3(3.35, -0.75, -2.1)];
const PAIRS = [[0, 3], [1, 2]]; // the cannons fire in diagonal pairs
const EYE = new THREE.Vector3(0, 0.95, 0.3);
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const FLY_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Space']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const COLORS = { green: '#39ff6a', amber: '#ffb347', blue: '#58b0ff', red: '#ff5540', dim: '#5f6b78', panel: '#0b0d11', line: '#3a424c' };

export class Pilot {
  constructor(map, { onChange = null, onSound = null, ensureBattle = null, toast = null } = {}) {
    this.map = map;
    this.battle = map.battle;
    this.camera = map.camera;
    this.canvas = map.canvas;
    this.hud = document.getElementById('cockpit');
    this.onChange = onChange;
    this.onSound = onSound;
    this.ensureBattle = ensureBattle;
    this.toast = toast;
    this.active = false;
    this.alive = false;
    this.ship = new THREE.Object3D(); // where you are and which way you point; never drawn, you are inside it
    this.vel = new THREE.Vector3(0, 0, -1); // a unit vector, like a fighter's
    this.speed = 0;
    this.keys = new Set();
    this.taps = new Set(); // keys pressed since the last frame, so a quick tap counts even on a slow frame
    this.stick = { x: 0, y: 0 };
    this.locked = false;
    this.wantedLock = false;
    this.trigger = false;
    this.throttle = 0.7;
    this.shields = SHIELDS.full;
    this.lasers = 100;
    this.cooldown = 0;
    this.pair = 0;
    this.bank = 0;
    this.target = null;
    this.flash = 0;
    this.deadFor = 0;
    this.time = 0;
    this.warn = '';
    this.kills = 0;
    this.deaths = 0;
    this.hitsTaken = 0;
    this.shots = 0;
    this.assistOn = false;
    this.saved = null;
    this.tmp = { a: new THREE.Vector3(), b: new THREE.Vector3(), line: new THREE.Line3() };
    // What the battle sees of you: one more fighter the TIEs can pick, aim at and hit.
    const self = this;
    this.entry = {
      obj: this.ship,
      side: SIDES.rebels,
      kind: 'player',
      vel: this.vel,
      get speed() {
        return self.speed;
      },
      get alive() {
        return self.active && self.alive;
      },
      onHit: () => self.hit()
    };
    this.install();
  }

  // --- in and out ------------------------------------------------------------------------------

  enter() {
    if (this.active) return;
    if (!this.battle.bounds || this.battle.bounds.isEmpty()) {
      this.toast?.('Open an app first: the battle is over its fleet.', 'bad');
      return;
    }
    this.ensureBattle?.();
    this.saved = { position: this.camera.position.clone(), yaw: this.map.yaw, pitch: this.map.pitch, fov: this.camera.fov };
    this.map.flight = null;
    this.map.keys.clear();
    this.map.setHover(null);
    this.active = true;
    this.time = 0;
    this.camera.fov = 72;
    this.camera.updateProjectionMatrix();
    this.battle.setPlayer(this.entry);
    this.spawn(true);
    this.hud.hidden = false;
    this.canvas.style.cursor = 'crosshair';
    this.canvas.focus({ preventScroll: true });
    this.onChange?.(true);
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.alive = false;
    this.trigger = false;
    this.keys.clear();
    this.target = null;
    this.wantedLock = false;
    this.battle.setPlayer(null);
    this.hud.hidden = true;
    this.canvas.style.cursor = '';
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.camera.fov = this.saved?.fov ?? 60;
    this.camera.updateProjectionMatrix();
    // Back to where you were on the map: the map's camera flies there from the cockpit.
    const s = this.saved;
    const f = this.forward();
    this.map.yaw = Math.atan2(-f.x, -f.z);
    this.map.pitch = Math.asin(clamp(f.y, -1, 1));
    const dir = new THREE.Vector3(-Math.sin(s.yaw) * Math.cos(s.pitch), Math.sin(s.pitch), -Math.cos(s.yaw) * Math.cos(s.pitch));
    this.map.flyTo(s.position.clone(), s.position.clone().add(dir));
    this.onChange?.(false);
  }

  /** A fresh X-wing: on the first sortie where the map's camera was, if that is over the fleet; after that, behind the fleet, flying its way. */
  spawn(first) {
    const b = this.battle.bounds;
    const p = this.ship.position;
    const over = (v) => v.x > b.min.x - 300 && v.x < b.max.x + 300 && v.z > b.min.z - 300 && v.z < b.max.z + 300 && v.y > 12 && v.y < 320;
    let dir;
    if (first && over(this.camera.position)) {
      p.copy(this.camera.position);
      dir = this.camera.getWorldDirection(new THREE.Vector3());
      dir.y *= 0.3;
    } else {
      p.set(b.min.x + Math.random() * (b.max.x - b.min.x), 60 + Math.random() * 120, b.max.z + 150);
      dir = new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, -1);
    }
    dir.normalize();
    this.ship.quaternion.setFromRotationMatrix(new THREE.Matrix4().lookAt(p, p.clone().add(dir), UP));
    this.ship.updateMatrixWorld();
    this.vel.copy(dir);
    this.alive = true;
    this.shields = SHIELDS.full;
    this.lasers = 100;
    this.throttle = 0.7;
    this.speed = SPEED.min + this.throttle * (SPEED.max - SPEED.min);
    this.stick.x = this.stick.y = 0;
    this.bank = 0;
    this.target = null;
    this.deadFor = 0;
    this.battle.hyperspace(p.clone(), dir);
    this.placeCamera();
  }

  // --- the controls ----------------------------------------------------------------------------

  install() {
    const el = this.canvas;
    const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.active || typing() || e.metaKey || e.ctrlKey || e.altKey) return;
        if (e.code === 'Escape') {
          e.preventDefault();
          return this.exit();
        }
        if (e.code === 'KeyT' && !e.repeat) this.nextTarget();
        if (FLY_KEYS.has(e.code)) {
          e.preventDefault();
          this.keys.add(e.code);
          this.taps.add(e.code);
        }
      },
      true
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), true);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.trigger = false;
    });
    el.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.active) return;
        e.preventDefault();
        el.focus({ preventScroll: true });
        if (e.button === 0) this.trigger = true;
        this.lock();
      },
      true
    );
    el.addEventListener(
      'pointerup',
      (e) => {
        if (this.active && e.button === 0) this.trigger = false;
      },
      true
    );
    el.addEventListener(
      'pointermove',
      (e) => {
        if (!this.active || !this.locked) return;
        // With the pointer taken, the mouse is the stick: it deflects as you move, and centres itself as you stop.
        this.stick.x = clamp(this.stick.x + e.movementX * 0.0035, -1, 1);
        this.stick.y = clamp(this.stick.y - e.movementY * 0.0035, -1, 1);
      },
      true
    );
    el.addEventListener(
      'wheel',
      (e) => {
        if (!this.active) return;
        e.preventDefault();
        this.throttle = clamp(this.throttle - Math.sign(e.deltaY) * 0.1, 0, 1);
      },
      { passive: false, capture: true }
    );
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === el;
      // The browser's own Esc gives the pointer back without a key event: that is leaving the cockpit.
      if (!this.locked && this.active && this.wantedLock) this.exit();
    });
  }

  lock() {
    if (this.locked || !this.canvas.requestPointerLock) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      this.wantedLock = true;
      p?.catch?.(() => (this.wantedLock = false));
    } catch {
      this.wantedLock = false;
    }
  }

  /** For the console and the tests: R2 flies and shoots for you. */
  assist(on) {
    this.assistOn = on;
    return on;
  }

  // --- every frame -----------------------------------------------------------------------------

  forward(target = new THREE.Vector3()) {
    return target.set(0, 0, -1).applyQuaternion(this.ship.quaternion);
  }

  frame(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (!this.alive) {
      this.deadFor += dt;
      if (this.deadFor > 2.8) this.spawn(false);
      this.placeCamera();
      this.draw();
      return;
    }
    const k = new Set([...this.keys, ...this.taps]);
    this.taps.clear();
    let pitch = 0;
    let yaw = 0;
    let roll = 0;
    if (this.locked) {
      pitch = this.stick.y;
      yaw = -this.stick.x;
      const decay = Math.max(0, 1 - dt * 1.8);
      this.stick.x *= decay;
      this.stick.y *= decay;
    }
    if (k.has('ArrowUp')) pitch += 1;
    if (k.has('ArrowDown')) pitch -= 1;
    if (k.has('ArrowLeft')) yaw += 1;
    if (k.has('ArrowRight')) yaw -= 1;
    if (k.has('KeyA')) roll += 1;
    if (k.has('KeyD')) roll -= 1;
    if (k.has('KeyW')) this.throttle = Math.min(1, this.throttle + dt * 0.5);
    if (k.has('KeyS')) this.throttle = Math.max(0, this.throttle - dt * 0.5);
    let fire = this.trigger || k.has('Space');
    if (this.assistOn) {
      const a = this.steerAssist();
      pitch = a.pitch;
      yaw = a.yaw;
      roll = 0;
      fire = a.fire;
    }
    this.ship.rotateX(clamp(pitch, -1, 1) * TURN.pitch * dt);
    this.ship.rotateY(clamp(yaw, -1, 1) * TURN.yaw * dt);
    this.ship.rotateZ(clamp(roll, -1, 1) * TURN.roll * dt);
    this.bank += (clamp(yaw, -1, 1) * 0.4 - this.bank) * Math.min(1, dt * 4); // the hull leans into a turn
    this.speed = SPEED.min + this.throttle * (SPEED.max - SPEED.min);
    const fwd = this.forward(this.tmp.a);
    this.vel.copy(fwd);
    this.ship.position.addScaledVector(fwd, this.speed * dt);
    this.keepOverTheFleet();
    this.ship.updateMatrixWorld();
    this.cooldown -= dt;
    this.lasers = Math.min(100, this.lasers + CANNON.recharge * dt);
    this.shields = Math.min(SHIELDS.full, this.shields + SHIELDS.regen * dt);
    if (fire && this.cooldown <= 0 && this.lasers >= CANNON.cost) this.shoot(fwd);
    this.autoTarget();
    this.placeCamera();
    this.draw();
  }

  /** The battle is over the fleet: the edge of it turns you back rather than letting you fly off into the dark. */
  keepOverTheFleet() {
    const b = this.battle.bounds;
    const p = this.ship.position;
    const lo = { x: b.min.x - 350, y: 10, z: b.min.z - 350 };
    const hi = { x: b.max.x + 350, y: 340, z: b.max.z + 350 };
    let out = false;
    for (const ax of ['x', 'y', 'z']) {
      if (p[ax] < lo[ax]) (p[ax] = lo[ax]), (out = true);
      if (p[ax] > hi[ax]) (p[ax] = hi[ax]), (out = true);
    }
    this.warn = out ? 'EDGE OF THE BATTLE — TURN BACK' : '';
  }

  placeCamera() {
    this.camera.position.copy(this.ship.position).add(this.tmp.b.copy(EYE).applyQuaternion(this.ship.quaternion));
    this.camera.quaternion.copy(this.ship.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(Z, this.bank));
  }

  // --- the cannons -----------------------------------------------------------------------------

  shoot(fwd) {
    this.cooldown = CANNON.every;
    this.lasers -= CANNON.cost;
    this.shots++;
    const aim = this.ship.position.clone().addScaledVector(fwd, CANNON.converge); // the bolts meet where the reticle points
    for (const [n, gi] of PAIRS[this.pair++ % 2].entries()) {
      const muzzle = MUZZLES[gi].clone().applyQuaternion(this.ship.quaternion).add(this.ship.position);
      const dir = aim.clone().sub(muzzle).normalize();
      const to = muzzle.clone().addScaledVector(dir, CANNON.range);
      this.battle.fire(SIDES.rebels, muzzle, to, { speed: CANNON.speed, len: 4.5, width: 0.28, sound: n === 0 ? 'xwing' : null, hits: (at, from) => this.hitTest(at, from) });
    }
  }

  /** Did a bolt's step from `from` to `at` pass through a TIE, or into a capital ship's hull? */
  hitTest(at, from) {
    const seg = this.tmp.line.set(from, at);
    const near = this.tmp.a;
    for (const f of this.battle.fighters) {
      if (f.kind !== 'tie' || !f.alive) continue;
      seg.closestPointToPoint(f.obj.position, true, near);
      if (near.distanceToSquared(f.obj.position) < TIE_RADIUS * TIE_RADIUS) {
        this.battle.kill(f);
        this.kills++;
        if (this.target === f) this.target = null;
        return true;
      }
    }
    for (const s of this.battle.ships) {
      if (s.hull.containsPoint(at)) {
        this.battle.explode(at.clone(), 7, { debris: 5 });
        return true;
      }
    }
    return false;
  }

  hit() {
    if (!this.alive) return;
    this.hitsTaken++;
    this.flash = 1;
    this.shields -= SHIELDS.hit;
    this.onSound?.('hit');
    // The bolt bursts on your shields, just ahead of the canopy.
    const at = this.ship.position.clone().addScaledVector(this.forward(this.tmp.a), 7).add(new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, 0));
    this.battle.explode(at, 4, { debris: 4 });
    if (this.shields <= 0) this.die();
  }

  die() {
    this.alive = false;
    this.deaths++;
    this.deadFor = 0;
    this.shields = 0;
    this.trigger = false;
    this.target = null;
    this.battle.explode(this.ship.position.clone(), 30, { ring: true, debris: 22 });
  }

  // --- targets ---------------------------------------------------------------------------------

  ties() {
    return this.battle.fighters.filter((f) => f.kind === 'tie' && f.alive);
  }

  /** Keeps a target in the bracket: the nearest TIE that is most ahead, until it dies or you pick another with T. */
  autoTarget() {
    if (this.target && (!this.target.alive || this.target.obj.position.distanceTo(this.ship.position) > 1100)) this.target = null;
    if (this.target) return;
    const fwd = this.forward(this.tmp.a);
    let best = null;
    let score = Infinity;
    for (const f of this.ties()) {
      const to = this.tmp.b.copy(f.obj.position).sub(this.ship.position);
      const d = to.length();
      const s = d * (1.6 - to.normalize().dot(fwd));
      if (s < score) (score = s), (best = f);
    }
    this.target = best;
  }

  nextTarget() {
    const fwd = this.forward(this.tmp.a);
    const list = this.ties().sort((a, b) => this.tmp.b.copy(a.obj.position).sub(this.ship.position).normalize().dot(fwd) < this.tmp.b.copy(b.obj.position).sub(this.ship.position).normalize().dot(fwd) ? 1 : -1);
    if (!list.length) return;
    const i = list.indexOf(this.target);
    this.target = list[(i + 1) % list.length];
  }

  /** Where to shoot to meet the target: ahead of it by its speed over the bolt's flight. */
  leadPoint(f, target = new THREE.Vector3()) {
    const d = f.obj.position.distanceTo(this.ship.position);
    return target.copy(f.obj.position).addScaledVector(f.vel, (f.speed ?? 0) * (d / CANNON.speed));
  }

  steerAssist() {
    const tg = this.target;
    if (!tg) return { pitch: 0, yaw: 0.6, fire: false };
    const local = this.ship.worldToLocal(this.leadPoint(tg));
    const dist = local.length();
    let yaw = clamp((-local.x / (Math.abs(local.z) + 1)) * 3, -1, 1);
    let pitch = clamp((local.y / (Math.abs(local.z) + 1)) * 3, -1, 1);
    if (local.z > 0) {
      yaw = local.x < 0 ? 1 : -1;
      pitch = 0;
    }
    const aligned = local.z < 0 && Math.hypot(local.x, local.y) < dist * 0.045;
    this.throttle = dist > 300 ? 1 : 0.6;
    return { pitch, yaw, fire: aligned && dist < 520 };
  }

  // --- the HUD ---------------------------------------------------------------------------------

  draw() {
    const hud = this.hud;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = hud.clientWidth;
    const H = hud.clientHeight;
    if (!W || !H) return;
    if (hud.width !== Math.round(W * dpr) || hud.height !== Math.round(H * dpr)) {
      hud.width = Math.round(W * dpr);
      hud.height = Math.round(H * dpr);
    }
    const g = hud.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.font = '11px ui-monospace, Menlo, monospace';
    g.textBaseline = 'middle';
    const panelH = Math.min(150, Math.round(H * 0.24));
    const panelY = H - panelH;
    const cx = W / 2;
    const cy = H / 2;

    // A hit on the shields washes the view red for a moment.
    if (this.flash > 0) {
      g.fillStyle = `rgba(255, 50, 24, ${(this.flash * 0.45).toFixed(3)})`;
      g.fillRect(0, 0, W, panelY);
    }

    // The target, its bracket and its lead point; or an arrow to it at the edge of the view.
    const tg = this.target;
    if (tg && this.alive) {
      const dist = tg.obj.position.distanceTo(this.ship.position);
      const inRange = dist < CANNON.range;
      const v = tg.obj.position.clone().project(this.camera);
      const ahead = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      g.strokeStyle = inRange ? COLORS.amber : COLORS.green;
      g.fillStyle = g.strokeStyle;
      g.lineWidth = 1.5;
      if (ahead) {
        const x = ((v.x + 1) / 2) * W;
        const y = ((1 - v.y) / 2) * H;
        const s = clamp(5400 / Math.max(dist, 1), 14, 56) / 2;
        const c = s * 0.45;
        g.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          g.moveTo(x + sx * s, y + sy * (s - c));
          g.lineTo(x + sx * s, y + sy * s);
          g.lineTo(x + sx * (s - c), y + sy * s);
        }
        g.stroke();
        g.textAlign = 'left';
        g.fillText(`TIE/LN  ${Math.round(dist)} m`, x + s + 6, y + s);
        const l = this.leadPoint(tg).project(this.camera);
        if (l.z < 1) {
          const lx = ((l.x + 1) / 2) * W;
          const ly = ((1 - l.y) / 2) * H;
          g.beginPath();
          g.moveTo(lx, ly - 6);
          g.lineTo(lx + 6, ly);
          g.lineTo(lx, ly + 6);
          g.lineTo(lx - 6, ly);
          g.closePath();
          g.stroke();
        }
      } else {
        const local = this.ship.worldToLocal(tg.obj.position.clone());
        const a = Math.atan2(-local.y, local.x);
        const rx = W * 0.42;
        const ry = (panelY / 2) * 0.86;
        const x = cx + Math.cos(a) * rx;
        const y = cy + Math.sin(a) * ry;
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.beginPath();
        g.moveTo(10, 0);
        g.lineTo(-6, -7);
        g.lineTo(-6, 7);
        g.closePath();
        g.fill();
        g.restore();
        g.textAlign = 'center';
        g.fillText(`${local.z > 0 ? 'BEHIND' : 'TARGET'}  ${Math.round(dist)} m`, clamp(x, 60, W - 60), y + (y < cy ? 16 : -16));
      }
    }

    // The reticle, at the centre of the view.
    g.strokeStyle = COLORS.green;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(cx, cy, 14, 0, Math.PI * 2);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      g.moveTo(cx + dx * 18, cy + dy * 18);
      g.lineTo(cx + dx * 30, cy + dy * 30);
    }
    g.stroke();
    g.fillStyle = COLORS.green;
    g.fillRect(cx - 1, cy - 1, 2, 2);

    // The cockpit frame: struts from the canopy's corners down to the console.
    g.fillStyle = COLORS.panel;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(W * 0.1, 0);
    g.lineTo(0, H * 0.18);
    g.closePath();
    g.moveTo(W, 0);
    g.lineTo(W - W * 0.1, 0);
    g.lineTo(W, H * 0.18);
    g.closePath();
    g.moveTo(0, panelY);
    g.lineTo(W * 0.16, panelY);
    g.lineTo(0, panelY - H * 0.16);
    g.closePath();
    g.moveTo(W, panelY);
    g.lineTo(W - W * 0.16, panelY);
    g.lineTo(W, panelY - H * 0.16);
    g.closePath();
    g.fill();

    // The console.
    g.fillStyle = COLORS.panel;
    g.fillRect(0, panelY, W, panelH);
    g.strokeStyle = COLORS.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, panelY + 0.5);
    g.lineTo(W, panelY + 0.5);
    g.stroke();
    const bar = (x, y, w, h, k, color, label, value) => {
      g.fillStyle = '#161a20';
      g.fillRect(x, y, w, h);
      g.fillStyle = color;
      g.fillRect(x, y, w * clamp(k, 0, 1), h);
      g.strokeStyle = COLORS.line;
      g.strokeRect(x + 0.5, y + 0.5, w, h);
      g.fillStyle = COLORS.dim;
      g.textAlign = 'left';
      g.fillText(label, x, y - 9);
      g.textAlign = 'right';
      g.fillStyle = color;
      g.fillText(value, x + w, y - 9);
    };
    const pad = Math.max(14, W * 0.02);
    const barW = clamp(W * 0.17, 90, 220);
    bar(pad, panelY + 26, barW, 10, this.shields / SHIELDS.full, COLORS.blue, 'SHIELDS', `${Math.max(0, Math.round(this.shields))}`);
    bar(pad, panelY + 56, barW, 10, this.lasers / 100, COLORS.red, 'LASERS', `${Math.round(this.lasers)}`);
    bar(W - pad - barW, panelY + 26, barW, 10, this.throttle, COLORS.amber, 'THROTTLE', `${Math.round(this.throttle * 100)}%`);
    g.fillStyle = COLORS.dim;
    g.textAlign = 'left';
    g.fillText('SPEED', W - pad - barW, panelY + 56);
    g.textAlign = 'right';
    g.fillStyle = COLORS.amber;
    g.fillText(`${Math.round(this.speed)} m/s`, W - pad, panelY + 56);

    // The two scopes: every fighter ahead of you on the left one, behind you on the right one.
    const R = Math.min(panelH * 0.32, 40);
    const scopeY = panelY + panelH * 0.56;
    const scope = (x, label, back) => {
      g.fillStyle = '#061a0c';
      g.beginPath();
      g.arc(x, scopeY, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#1f6b34';
      g.stroke();
      g.beginPath();
      g.arc(x, scopeY, R / 2, 0, Math.PI * 2);
      g.moveTo(x - R, scopeY);
      g.lineTo(x + R, scopeY);
      g.moveTo(x, scopeY - R);
      g.lineTo(x, scopeY + R);
      g.stroke();
      g.fillStyle = COLORS.dim;
      g.textAlign = 'center';
      g.fillText(label, x, scopeY + R + 10);
      for (const f of this.battle.fighters) {
        if (!f.alive) continue;
        const d = this.ship.worldToLocal(f.obj.position.clone());
        if (back ? d.z <= 0 : d.z > 0) continue;
        const len = d.length() || 1;
        const theta = Math.acos(clamp(Math.abs(d.z) / len, 0, 1));
        const r = (theta / (Math.PI / 2)) * R;
        const h = Math.hypot(d.x, d.y) || 1;
        const px = x + (d.x / h) * r;
        const py = scopeY - (d.y / h) * r;
        g.fillStyle = f.kind === 'tie' ? COLORS.red : COLORS.green;
        g.fillRect(px - 1.5, py - 1.5, 3, 3);
        if (f === tg) {
          g.strokeStyle = COLORS.amber;
          g.strokeRect(px - 4, py - 4, 8, 8);
        }
      }
    };
    scope(cx - Math.max(150, W * 0.14), 'FORE', false);
    scope(cx + Math.max(150, W * 0.14), 'AFT', true);

    // The targeting computer in the middle: what you are after, and the score.
    const tw = Math.min(220, W * 0.2);
    const tx = cx - tw / 2;
    const ty = panelY + 14;
    const th = panelH - 28;
    g.fillStyle = '#061a0c';
    g.fillRect(tx, ty, tw, th);
    g.strokeStyle = '#1f6b34';
    g.strokeRect(tx + 0.5, ty + 0.5, tw, th);
    g.textAlign = 'center';
    g.fillStyle = COLORS.green;
    if (tg) {
      const dist = Math.round(tg.obj.position.distanceTo(this.ship.position));
      g.fillText('TIE/LN FIGHTER', cx, ty + 14);
      g.fillText(`${dist} m${dist < CANNON.range ? '  IN RANGE' : ''}`, cx, ty + 30);
      // The TIE, as its wireframe: the ball and two hexagonal wings.
      const ix = cx;
      const iy = ty + th / 2 + 10;
      const s = Math.min(th * 0.22, 16);
      g.strokeStyle = COLORS.green;
      g.beginPath();
      g.arc(ix, iy, s * 0.4, 0, Math.PI * 2);
      for (const sx of [-1, 1]) {
        for (let k = 0; k <= 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const px = ix + sx * s * 1.3 + Math.cos(a) * s * 0.18;
          const py = iy + Math.sin(a) * s;
          if (k === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.moveTo(ix + sx * s * 0.4, iy);
        g.lineTo(ix + sx * s * 1.3, iy);
      }
      g.stroke();
    } else {
      g.fillText(this.battle.enabled ? 'NO TARGET' : 'BATTLE OFF — PRESS B', cx, ty + th / 2 - 6);
    }
    g.fillStyle = COLORS.dim;
    g.fillText(`KILLS ${this.kills}   LOST ${this.deaths}`, cx, ty + th - 10);

    // Words on the canopy.
    g.textAlign = 'center';
    if (this.warn) {
      g.fillStyle = COLORS.amber;
      g.fillText(this.warn, cx, 26);
    } else if (!this.locked && this.alive && this.canvas.requestPointerLock) {
      g.fillStyle = COLORS.amber;
      g.fillText('CLICK THE VIEW TO TAKE THE STICK', cx, 26);
    }
    g.fillStyle = COLORS.dim;
    g.fillText('mouse or arrows fly · A D roll · W S throttle · Space fires · T next target · Esc back to the map', cx, panelY - 10);
    if (!this.alive) {
      g.fillStyle = 'rgba(0, 0, 0, 0.45)';
      g.fillRect(0, 0, W, panelY);
      g.fillStyle = COLORS.red;
      g.font = 'bold 22px ui-monospace, Menlo, monospace';
      g.fillText('SHIP LOST', cx, cy - 12);
      g.font = '11px ui-monospace, Menlo, monospace';
      g.fillStyle = COLORS.amber;
      g.fillText('another X-wing is on its way…', cx, cy + 12);
    }
  }

  stats() {
    const tg = this.target;
    const p = this.ship.position;
    return {
      active: this.active,
      alive: this.alive,
      shields: Math.round(this.shields),
      lasers: Math.round(this.lasers),
      throttle: Number(this.throttle.toFixed(2)),
      speed: Math.round(this.speed),
      kills: this.kills,
      deaths: this.deaths,
      hitsTaken: this.hitsTaken,
      shots: this.shots,
      locked: this.locked,
      assist: this.assistOn,
      target: tg ? { kind: tg.kind, distance: Math.round(tg.obj.position.distanceTo(p)) } : null,
      position: [Math.round(p.x), Math.round(p.y), Math.round(p.z)],
      ties: this.ties().length
    };
  }
}
