// The game: one state machine over the seats. You are always somewhere (walking the Kestrel, at her helm,
// in her turret, in the Wren, outside in a suit, inside someone else's hull, on a station concourse), and
// every seat is a controller that moves one thing and places the camera. The rest is the universe ticking:
// the world's entities, the AI, bolts, missions, standing, the fleet's jobs, the save.

import * as THREE from 'three';
import { World, Entity } from './world.mjs';
import { Combat } from './combat.mjs';
import { AI } from './ai.mjs';
import { Hud } from './hud.mjs';
import { Panel } from './panel.mjs';
import { Input } from './input.mjs';
import { Space } from './space.mjs';
import { Sfx } from './sfx.mjs';
import { LocalNet } from './net.mjs';
import * as M from './ships.mjs';
import { frigateInterior, capitalInterior, concourseInterior } from './interiors.mjs';
import { Walker } from './controllers/walk.mjs';
import { Flight } from './controllers/fly.mjs';
import { TurretSeat } from './controllers/turret.mjs';
import { Eva } from './controllers/eva.mjs';
import { Boarding } from './controllers/board.mjs';
import { Tactical } from './controllers/tactical.mjs';
import { SECTORS, STATIONS, SHIPS, UPGRADES, GOODS, MISSIONS, FLEET_JOBS, HIRE, HOSTILE_AT, FACTIONS } from './data.mjs';
import { clamp, rand, forwardOf, UP } from './util.mjs';

const SAVE_KEY = 'threadspace-save';
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();
const _q = new THREE.Quaternion();

function freshState() {
  return {
    version: 1,
    captain: 'Captain ' + ['Reyes', 'Okafor', 'Lindqvist', 'Tanaka', 'Moreau', 'Baptiste'][Math.floor(Math.random() * 6)],
    credits: 1200,
    standing: { concord: 10, rooks: -10, guild: 0 },
    cargo: {},
    upgrades: [],
    paint: '#9aa3ad',
    engine: '#58b0ff',
    crew: { vex: 'helm', dag: 'turret' },
    hired: [],
    fleet: [],
    missions: [],
    log: [],
    flags: {},
    sector: 'haven',
    hull: SHIPS.frigate.hull,
    kills: 0
  };
}

export class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.promptEl = document.getElementById('prompt');
    this.bannerEl = document.getElementById('banner');
    this.fadeEl = document.getElementById('fade');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, logarithmicDepthBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor('#02030a');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.2, 20000);
    this.scene.add(new THREE.HemisphereLight('#9fb4d8', '#1a1410', 0.9));
    const sun = new THREE.DirectionalLight('#fff4e0', 1.6);
    sun.position.set(0.6, 0.8, 0.3);
    this.scene.add(sun);
    this.sfx = new Sfx();
    this.space = new Space(this.scene, this.renderer, sun);
    this.world = new World(this.scene);
    this.combat = new Combat(this.scene, this.world, this.sfx);
    this.ai = new AI(this);
    this.input = new Input(this.canvas);
    this.input.onAction = (code) => this.action(code);
    this.input.onPress = (x, y) => this.press(x, y);
    this.hud = new Hud(document.getElementById('hud'));
    this.panel = new Panel(this);
    this.net = new LocalNet();
    this.phase = 'title';
    this.controller = null;
    this.nav = null;
    this.target = null;
    this.lasers = 100;
    this.warn = '';
    this.flash = 0;
    this.dockPrompt = '';
    this.hacking = null;
    this.toastT = 0;
    this.clock = 0;
    this.lastT = performance.now();
    this.wire = [];
    this.claims = {};
    this.prompted = null;
    this.assist = false;
    this.chase = { fighter: false, helm: false }; // V: behind the ship instead of in it
    this.gunnerOn = null; // what Dag is shooting at, for the HUD
    this.turretSeat = new TurretSeat(this);
    this.eva = new Eva(this);
    this.boarding = new Boarding(this);
    this.tactical = new Tactical(this);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.canvas.addEventListener('pointerdown', () => this.sfx.start(), { once: true });
    window.addEventListener('keydown', () => this.sfx.start(), { once: true });
  }

  resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // --- the Kestrel and her stats ---------------------------------------------------------------

  /** Builds the frigate, her inside, her fighter, from the state; places her in the sector. */
  buildShip() {
    this.player?.obj.removeFromParent();
    const obj = M.frigate({ paint: this.state.paint, engine: this.state.engine });
    const e = new Entity('frigate', obj, { side: 'player', hull: SHIPS.frigate.hull, shields: SHIPS.frigate.shields, radius: SHIPS.frigate.radius, half: SHIPS.frigate.half, name: 'KESTREL' });
    e.cls = SHIPS.frigate;
    this.player = e;
    this.applyUpgrades();
    e.hull = clamp(this.state.hull ?? e.hullMax, 1, e.hullMax);
    e.onDamage = (amount, at, bySide) => {
      if (this.playerBody() === e) {
        this.flash = 1;
        this.sfx.play('hit', 0);
      }
      if (bySide === 'rooks' || bySide === 'concord') this.underFire = 4;
    };
    e.onDeath = () => this.kestrelLost();
    this.interior = frigateInterior(obj);
    this.walker = new Walker(this.interior);
    this.helmFlight = new Flight(e, { speed: [0, this.ship.speedMax], turn: this.ship.turn });
    this.helmFlight.throttle = 0;
    // The Wren on her pad; a second mesh flies when she launches.
    this.parkedWren = M.fighter({ paint: this.state.paint, engine: this.state.engine });
    this.parkedWren.position.copy(this.interior.fighterPad);
    this.parkedWren.rotation.y = Math.PI;
    M.setThrust(this.parkedWren, 0);
    this.interior.group.add(this.parkedWren);
    const fobj = M.fighter({ paint: this.state.paint, engine: this.state.engine });
    this.fighterEnt = new Entity('fighter', fobj, { side: 'player', hull: SHIPS.fighter.hull, shields: SHIPS.fighter.shields, radius: SHIPS.fighter.radius, half: SHIPS.fighter.half, name: 'WREN' });
    this.fighterEnt.cls = SHIPS.fighter;
    this.fighterEnt.onDamage = () => {
      if (this.phase === 'fighter') {
        this.flash = 1;
        this.sfx.play('hit', 0);
      }
    };
    this.fighterEnt.onDeath = () => this.wrenLost();
    this.fighterFlight = new Flight(this.fighterEnt, SHIPS.fighter);
    this.fighterOut = false;
    this.placeCrew();
    this.refreshCrates();
  }

  applyUpgrades() {
    const s = { hullMax: SHIPS.frigate.hull, shieldsMax: SHIPS.frigate.shields, speedMax: SHIPS.frigate.speed[1], turn: SHIPS.frigate.turn, turretEvery: 0.45, turretDamage: 24, cargoMax: SHIPS.frigate.cargo, fighterDamage: 25, rifleDamage: 25, armour: 1, tractor: 45 };
    for (const id of this.state.upgrades) UPGRADES.find((u) => u.id === id)?.apply(s);
    this.ship = s;
    const e = this.player;
    if (e) {
      e.hullMax = s.hullMax;
      e.shieldsMax = s.shieldsMax;
      e.shields = Math.min(e.shields, e.shieldsMax);
      if (this.helmFlight) {
        this.helmFlight.speedMax = s.speedMax;
        this.helmFlight.turn = s.turn;
      }
    }
  }

  placeCrew() {
    const I = this.interior;
    for (const p of I.people) p.removeFromParent();
    I.people = [];
    const spot = (c, i) => {
      const st = this.state.crew[c.id];
      const taken = (st === 'helm' && this.phase === 'helm') || (st === 'turret' && this.phase === 'turret');
      const key = taken || st === 'idle' || !st ? (i ? 'idle2' : 'idle') : st;
      return I.stations[key];
    };
    [{ id: 'vex', color: '#3d5a80' }, { id: 'dag', color: '#7a2e2e' }].forEach((c, i) => {
      const s = spot(c, i);
      I.person(c.id === 'vex' ? 'Vex' : 'Dag', c.color, s.pos.x, s.pos.z, s.yaw);
    });
    if (this.state.hired.includes('moss')) I.person('Moss', '#2f6f4e', -2, 10, Math.PI / 2);
  }

  refreshCrates() {
    const items = { ...this.state.cargo };
    if (this.state.flags.core) items.core = 1;
    this.interior.crates(items, ...this.interior.crateOrigin);
  }

  cargoUsed() {
    return Object.entries(this.state.cargo).reduce((n, [id, q]) => n + q * (GOODS[id]?.size ?? 1), 0);
  }

  crewAt(station) {
    return Object.entries(this.state.crew).find(([, s]) => s === station)?.[0] ?? null;
  }

  setCrew(id, station) {
    if (station !== 'idle') for (const k of Object.keys(this.state.crew)) if (this.state.crew[k] === station) this.state.crew[k] = 'idle';
    this.state.crew[id] = station;
    const name = id === 'vex' ? 'Vex' : id === 'dag' ? 'Dag' : HIRE.find((h) => h.id === id)?.name ?? id;
    this.log(`${name} ${station === 'helm' ? 'takes the helm' : station === 'turret' ? 'climbs into the turret' : 'stands down'}.`);
    this.placeCrew();
    this.panel.refresh();
  }

  // --- sides -----------------------------------------------------------------------------------

  hostile(a, b) {
    if (a === b || a === 'none' || b === 'none') return false;
    const s = this.state.standing;
    if (a === 'rooks' || b === 'rooks') {
      const other = a === 'rooks' ? b : a;
      if (other === 'player') return s.rooks < 30;
      return true;
    }
    if (a === 'player' || b === 'player') {
      const other = a === 'player' ? b : a;
      return (s[other] ?? 0) < HOSTILE_AT;
    }
    return false;
  }

  playerBody() {
    return this.phase === 'fighter' || (this.fighterOut && (this.phase === 'board' || this.hacking)) ? this.fighterEnt : this.player;
  }

  activeFlight() {
    return this.phase === 'fighter' ? this.fighterFlight : this.helmFlight;
  }

  leadFor(e) {
    const body = this.playerBody();
    const d = e.obj.position.distanceTo(body.obj.position);
    return e.obj.position.clone().addScaledVector(e.vel, d / 460);
  }

  // --- phases ----------------------------------------------------------------------------------

  setPhase(p, opts = {}) {
    const prev = this.phase;
    this.controller?.exit?.();
    this.phase = p;
    this.prompt(null);
    this.hacking = null;
    if (p === 'walk') {
      this.controller = { frame: (f, dt) => this.walkFrame(f, dt), placeCamera: (c) => this.walker.placeCamera(c, this.player.obj), exit: () => {} };
      if (opts.at) this.walker.moveTo(opts.at, opts.yaw ?? 0);
    } else if (p === 'helm') {
      this.controller = { frame: (f, dt) => this.helmFrame(f, dt), placeCamera: (c) => this.helmCamera(c), exit: () => {} };
    } else if (p === 'turret') {
      this.turretSeat.enter();
      this.controller = { frame: (f, dt) => this.turretFrame(f, dt), placeCamera: (c) => this.turretSeat.placeCamera(c), exit: () => this.turretSeat.exit() };
    } else if (p === 'tactical') {
      this.controller = { frame: (f, dt) => this.tactical.frame(f, dt), placeCamera: (c) => this.tactical.placeCamera(c), exit: () => {} };
    } else if (p === 'fighter') {
      this.controller = { frame: (f, dt) => this.fighterFrame(f, dt), placeCamera: (c) => this.fighterCamera(c), exit: () => {} };
    } else if (p === 'eva') {
      this.eva.enter();
      this.controller = { frame: (f, dt) => this.evaFrame(f, dt), placeCamera: (c) => this.eva.placeCamera(c), exit: () => {} };
    } else if (p === 'board') {
      this.controller = { frame: (f, dt) => this.boardFrame(f, dt), placeCamera: (c) => this.boarding.placeCamera(c), exit: () => {} };
    } else if (p === 'dock') {
      this.controller = { frame: (f, dt) => this.dockFrame(f, dt), placeCamera: (c) => this.concourseWalker.placeCamera(c, this.world.station.obj), exit: () => {} };
    } else {
      this.controller = { frame: () => {}, placeCamera: () => {}, exit: () => {} };
    }
    if (p === 'helm' || p === 'turret' || p === 'walk') this.placeCrew();
    this.panel.refresh();
    this.input.lockAllowed = p !== 'title' && p !== 'tactical';
    if (p === 'tactical') this.input.unlock();
  }

  /** A key that is an action, not a hold: E uses, J jumps or docks, Tab is the chair, T the next target, V the view. */
  action(code) {
    if (this.phase === 'title') return;
    if (code === 'Tab') {
      if (this.phase === 'tactical') this.setPhase('walk', { at: this.interior.stations.idle.pos.clone(), yaw: Math.PI });
      else if (['walk', 'helm', 'turret'].includes(this.phase)) this.setPhase('tactical');
      return;
    }
    if (code === 'KeyT' && ['helm', 'fighter', 'turret', 'tactical', 'walk'].includes(this.phase)) return this.nextTarget();
    if (code === 'KeyV' && (this.phase === 'fighter' || this.phase === 'helm')) {
      this.chase[this.phase] = !this.chase[this.phase];
      this.chaseCam = null;
      return this.toast(this.chase[this.phase] ? 'Chase view: V for the cockpit' : this.phase === 'fighter' ? 'Cockpit view' : 'Bridge view', 'good');
    }
    if (code === 'KeyJ') return this.engage();
    if (code === 'KeyM') return this.panel.show('nav');
    if (code === 'KeyE') return this.use();
  }

  /** E: whatever the seat offers. */
  use() {
    const p = this.phase;
    if (p === 'walk') {
      const u = this.walker.nearestUse();
      if (!u) return;
      this.doUse(u.use);
    } else if (p === 'dock') {
      const u = this.concourseWalker.nearestUse();
      if (!u) return;
      if (u.use === 'undock') this.undock();
      else if (u.use.startsWith('tab:')) this.panel.show(u.use.slice(4));
    } else if (p === 'helm') {
      if (this.canDock()) return this.dock();
      this.setPhase('walk', { at: this.interior.stations.helm.pos.clone().add(new THREE.Vector3(0, 0, 1.6)), yaw: 0 });
    } else if (p === 'turret') {
      this.setPhase('walk', { at: this.interior.stations.turret.pos.clone(), yaw: Math.PI / 2 });
    } else if (p === 'tactical') {
      this.setPhase('walk', { at: this.interior.stations.idle.pos.clone(), yaw: Math.PI });
    } else if (p === 'fighter') {
      if (this.canLand()) return this.land();
      const h = this.hackableFromFighter();
      if (h) return this.startHack(h, 'fighter');
    } else if (p === 'eva') {
      const u = this.eva.nearestUse();
      if (!u) return;
      if (u.id === 'inside') this.setPhase('walk', { at: this.interior.stations.medbay.pos.clone().add(new THREE.Vector3(0, 0, -8)), yaw: -Math.PI / 2 });
      else if (u.id === 'grab') this.collectPod(u.pod);
      else if (u.id === 'hack') this.startHack(u.ship, 'eva');
    } else if (p === 'board') {
      const u = this.boarding.walker.nearestUse();
      if (u?.use === 'unboard') this.unboard();
    }
  }

  doUse(id) {
    const I = this.interior;
    if (id === 'helm') this.setPhase('helm');
    else if (id === 'turret') this.setPhase('turret');
    else if (id === 'tactical') this.setPhase('tactical');
    else if (id === 'fighter') this.launch();
    else if (id === 'eva') {
      if (this.world.sector) this.setPhase('eva');
    } else if (id === 'rest') {
      this.boarding.hp = 100;
      this.toast('You sit a moment. Steadier.', 'good');
    } else if (id === 'cargo') this.panel.show('ship');
  }

  /** J: the gate you are in, or the dock you are beside. */
  engage() {
    const gate = this.canJump();
    if (gate) return this.jump(gate);
    if (this.canDock()) return this.dock();
    this.toast('Nothing to engage: fly into a gate, or beside a station’s dock.', 'warn');
  }

  // --- frames per seat -------------------------------------------------------------------------

  walkFrame(f, dt) {
    this.walker.frame(f, dt);
    const u = this.walker.nearestUse();
    this.prompt(u ? u.label : null);
  }

  helmFrame(f, dt) {
    this.helmFlight.manual(f, dt, { mouseGain: 0.0025 });
    this.autoTarget(this.player);
  }

  helmCamera(c) {
    const k = this.player.obj;
    k.updateMatrixWorld();
    if (this.chase.helm) return this.chaseCamera(c, k, new THREE.Vector3(0, 22, 120), this.helmFlight.bank * 0.3);
    // The helm's eye is just behind the bridge glass (z −33.5), so the window's frame and the helm console sit out of
    // the view and the prow is ahead and below.
    c.position.copy(k.localToWorld(new THREE.Vector3(0, 0, -33.15)));
    c.quaternion.copy(k.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), this.helmFlight.bank * 0.5));
  }

  /** Behind and above `obj`, on a soft spring: the ship swings in the frame when she turns, then the camera catches up. */
  chaseCamera(c, obj, offset, bank = 0) {
    const want = obj.localToWorld(offset.clone());
    const look = obj.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.atan2(offset.y * 0.6, offset.z))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bank));
    const dt = this.lastDt ?? 0.016;
    if (!this.chaseCam || this.chaseCam.obj !== obj) this.chaseCam = { obj, rel: want.clone().sub(obj.position), q: look.clone() };
    // The spring holds the camera's place relative to the ship, so a fast ship does not leave it behind.
    this.chaseCam.rel.lerp(want.sub(obj.position), 1 - Math.exp(-dt * 6));
    this.chaseCam.q.slerp(look, 1 - Math.exp(-dt * 7));
    c.position.copy(obj.position).add(this.chaseCam.rel);
    c.quaternion.copy(this.chaseCam.q);
  }

  turretFrame(f, dt) {
    this.turretSeat.frame(f, dt);
    this.autoTarget(this.player);
  }

  fighterFrame(f, dt) {
    const fl = this.fighterFlight;
    if (this.hacking) {
      this.latchFighter(this.hacking.ship);
    } else if (this.assist) {
      const a = this.steerAssist();
      fl.apply(a.pitch, a.yaw, 0, dt);
      if (a.fire) this.fireCannons();
    } else fl.manual(f, dt);
    this.lasers = Math.min(100, this.lasers + 22 * dt);
    this.cannonCool = (this.cannonCool ?? 0) - dt;
    if (!this.hacking && (f.trigger || f.keys.has('Space'))) this.fireCannons();
    this.autoTarget(this.fighterEnt);
    this.scoop(this.fighterEnt, 14);
    this.fighterEnt.shields = Math.min(this.fighterEnt.shieldsMax, this.fighterEnt.shields + 5 * dt);
    if (this.canLand()) this.prompt('Land in the Kestrel’s bay');
    else {
      const h = this.hackableFromFighter();
      this.prompt(h ? `Dock and hack the airlock of ${h.name}` : null);
    }
  }

  fighterCamera(c) {
    const o = this.fighterEnt.obj;
    const inside = !this.chase.fighter;
    if (o.userData.cockpit !== inside) {
      o.userData.cockpit = inside;
      o.traverse((m) => m.userData.cockpitHidden && (m.visible = !inside));
    }
    if (!inside) return this.chaseCamera(c, o, new THREE.Vector3(0, 3.4, 17), this.fighterFlight.bank);
    c.position.copy(o.localToWorld(o.userData.eye.clone()));
    this.fighterFlight.cameraQuat(c.quaternion);
  }

  /** Where the guns meet, for the reticle in the chase view: 300 m down the nose. */
  aimPoint() {
    const body = this.phase === 'fighter' ? this.fighterEnt.obj : this.player.obj;
    return body.position.clone().addScaledVector(forwardOf(body, _v), 300);
  }

  fireCannons() {
    if ((this.cannonCool ?? 0) > 0 || this.lasers < 7) return;
    this.cannonCool = 0.14;
    this.lasers -= 7;
    const o = this.fighterEnt.obj;
    const fwd = forwardOf(o, _v);
    const aim = o.position.clone().addScaledVector(fwd, 320);
    o.userData.muzzles.forEach((m, i) => {
      const muzzle = m.clone().applyQuaternion(o.quaternion).add(o.position);
      const dir = aim.clone().sub(muzzle).normalize();
      this.combat.fire('player', muzzle, dir, { speed: 460, range: 750, damage: this.ship.fighterDamage, len: 4.5, width: 0.28, owner: this.fighterEnt, color: this.state.engine, sound: i === 0 ? 'xwing' : null, camera: this.camera });
    });
  }

  /** The Kestrel's turret fires at a world point, from the gunner's hands or Dag's. */
  fireTurret(aimPoint) {
    const t = this.player.obj.userData.turret;
    const tip = t.pitch.localToWorld(t.tip.clone());
    const dir = aimPoint.clone().sub(tip).normalize();
    this.combat.fire('player', tip, dir, { speed: 460, range: 900, damage: this.ship.turretDamage, len: 7, width: 0.45, owner: this.player, color: '#ffe66d', sound: 'turbolaser', camera: this.camera });
  }

  evaFrame(f, dt) {
    this.eva.frame(f, dt);
    const u = this.eva.nearestUse();
    this.prompt(u ? u.label : null);
    if (this.eva.o2 <= 0) {
      this.toast('Air gone. Dag hauled you in by the line.', 'bad');
      this.setPhase('walk', { at: this.interior.stations.medbay.pos.clone(), yaw: Math.PI / 2 });
    }
    if (this.eva.pos.distanceTo(this.player.obj.position) > 1500) this.warn = 'THE KESTREL IS FAR — TURN BACK';
    else this.warn = '';
  }

  boardFrame(f, dt) {
    this.boarding.frame(f, dt);
    const u = this.boarding.walker.nearestUse();
    if (u?.use === 'seize') this.prompt(this.boarding.ship.captured ? 'Hers. Choose on the panel, then leave by the airlock' : this.boarding.defendersLeft() ? `${this.boarding.defendersLeft()} defenders still up` : 'Hold E: seize the bridge');
    else this.prompt(u ? u.label : null);
    if (this.fighterOut) this.latchFighter(this.boarding.ship);
  }

  dockFrame(f, dt) {
    this.concourseWalker.frame(f, dt);
    const u = this.concourseWalker.nearestUse();
    this.prompt(u ? u.label : null);
  }

  // --- targets ---------------------------------------------------------------------------------

  hostiles() {
    return this.world.entities.filter((e) => e.alive && e.hittable && this.hostile('player', e.side));
  }

  autoTarget(body) {
    if (this.target && (!this.target.alive || this.target.obj.position.distanceTo(body.obj.position) > 2500)) this.target = null;
    if (this.target) return;
    const fwd = body.forward(_v);
    let best = null, score = Infinity;
    for (const e of this.hostiles()) {
      const to = _w.copy(e.obj.position).sub(body.obj.position);
      const d = to.length();
      const s = d * (1.6 - to.normalize().dot(fwd));
      if (s < score) (score = s), (best = e);
    }
    this.target = best;
  }

  /** T: the hostile nearest the middle of the view if one is close to it, else the next one out by distance. */
  nextTarget() {
    const body = this.playerBody();
    const list = this.hostiles().sort((a, b) => a.obj.position.distanceTo(body.obj.position) - b.obj.position.distanceTo(body.obj.position));
    if (!list.length) return this.toast('Nothing hostile on the scope.', 'warn');
    const fwd = this.camera.getWorldDirection(_v);
    let aimed = null, best = 0.985; // within about 10 degrees of the crosshair
    for (const e of list) {
      const dot = _w.copy(e.obj.position).sub(this.camera.position).normalize().dot(fwd);
      if (dot > best && e !== this.target) (best = dot), (aimed = e);
    }
    this.select(aimed ?? list[(list.indexOf(this.target) + 1) % list.length]);
  }

  /** Picks a thing: a hostile becomes the target (Dag shoots it), anything else you can fly to becomes the course. */
  select(e) {
    if (!e) return;
    if (this.hostile('player', e.side) && e.hittable) {
      this.target = e;
      const gunner = this.crewAt('turret') && this.phase !== 'turret' ? 'Dag is on it.' : '';
      this.toast(`Target: ${e.name} · ${this.threatOf(e).label}. ${gunner}`, 'warn');
    } else if (this.navCandidates().some((c) => c.e === e)) {
      this.setNav(e);
      const helm = this.crewAt('helm') && this.phase !== 'helm' ? 'Vex is flying it.' : this.phase === 'helm' ? 'Fly it, or stand up and Vex will.' : 'Nobody at the helm.';
      this.toast(`Course: ${e.name}. ${helm}`, 'good');
    }
    this.panel.refresh();
  }

  /** A click on the view with a free cursor: on a mark it selects that thing and is used up (true); anywhere else it
   *  takes the stick, or in the captain's chair starts a drag. */
  press(x, y) {
    if (!['helm', 'fighter', 'turret', 'tactical', 'eva'].includes(this.phase)) return false;
    const e = this.hud.pick(x, y);
    if (!e) return false;
    this.select(e);
    return true;
  }

  /** How dangerous a contact is to the thing you are in: a word, a colour and a number to sort by. */
  threatOf(e) {
    const body = this.playerBody();
    const armed = e.kind === 'pirate' ? (12 * 2) / 0.38 : e.obj.userData.turrets?.length ? (e.obj.userData.turrets.length * 14) / 1.4 : 0; // damage a second
    if (!armed) return { label: 'UNARMED', color: '#8a93a3', n: 0 };
    const yours = body.hull + body.shields;
    const theirs = e.hull + e.shields;
    // Seconds she needs to kill you against seconds you need to kill her, roughly.
    const yourDps = body === this.fighterEnt ? ((this.ship.fighterDamage * 2) / 0.14) * 0.15 : this.ship.turretDamage / this.ship.turretEvery * 0.5;
    const k = (theirs / yourDps) / (yours / armed);
    if (k < 0.25) return { label: 'LOW', color: '#39d27a', n: 1 };
    if (k < 0.8) return { label: 'MEDIUM', color: '#ffb347', n: 2 };
    if (k < 2) return { label: 'HIGH', color: '#ff5540', n: 3 };
    return { label: 'DEADLY', color: '#ff2a6d', n: 4 };
  }

  steerAssist() {
    const tg = this.target;
    if (!tg) return { pitch: 0, yaw: 0.6, fire: false };
    const o = this.fighterEnt.obj;
    const local = o.worldToLocal(this.leadFor(tg));
    const dist = local.length();
    let yaw = clamp((-local.x / (Math.abs(local.z) + 1)) * 3, -1, 1);
    let pitch = clamp((local.y / (Math.abs(local.z) + 1)) * 3, -1, 1);
    if (local.z > 0) (yaw = local.x < 0 ? 1 : -1), (pitch = 0);
    const aligned = local.z < 0 && Math.hypot(local.x, local.y) < dist * 0.045;
    this.fighterFlight.throttle = dist > 300 ? 1 : 0.6;
    return { pitch, yaw, fire: aligned && dist < 600 };
  }

  // --- the Wren ---------------------------------------------------------------------------------

  launch() {
    if (!this.fighterEnt.alive) return this.toast('The Wren is wreckage. A shipyard can build another.', 'bad');
    const k = this.player.obj;
    k.updateMatrixWorld();
    const o = this.fighterEnt.obj;
    o.position.copy(k.localToWorld(k.userData.bayExit.clone()));
    o.quaternion.copy(k.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
    this.world.add(this.fighterEnt);
    this.fighterEnt.alive = true;
    this.fighterOut = true;
    this.parkedWren.visible = false;
    this.fighterFlight.throttle = 0.6;
    this.lasers = 100;
    this.target = null;
    this.setPhase('fighter');
    this.toast('Wren away. E astern of the Kestrel lands her.', 'good');
    this.sfx.play('boom', 30, 6);
  }

  canLand() {
    if (this.phase !== 'fighter' || this.hacking) return false;
    const k = this.player.obj;
    const p = k.localToWorld(k.userData.bayLand.clone());
    return this.fighterEnt.obj.position.distanceTo(p) < 110;
  }

  land() {
    this.world.remove(this.fighterEnt);
    this.showWren();
    this.fighterOut = false;
    this.parkedWren.visible = true;
    this.fighterEnt.hull = Math.min(this.fighterEnt.hullMax, this.fighterEnt.hull + 10);
    this.setPhase('walk', { at: this.interior.fighterPad.clone().add(new THREE.Vector3(0, -1.1, -4)), yaw: Math.PI });
    this.toast('Down in the bay.', 'good');
  }

  showWren() {
    const o = this.fighterEnt.obj;
    o.userData.cockpit = false;
    o.traverse((m) => m.userData.cockpitHidden && (m.visible = true));
  }

  wrenLost() {
    this.combat.burst(this.fighterEnt.obj.position.clone(), 20, { ring: true, shards: 16, camera: this.camera });
    this.world.remove(this.fighterEnt);
    this.showWren();
    this.fighterOut = false;
    this.parkedWren.visible = true;
    this.fighterEnt.alive = true;
    this.fighterEnt.hull = this.fighterEnt.hullMax * 0.4;
    this.fighterEnt.shields = this.fighterEnt.shieldsMax;
    this.state.credits = Math.max(0, this.state.credits - 300);
    this.log('The Wren was shot out from under you. Vex pulled you from the wreck; the bay crew patched her up for 300 cr.', 'bad');
    if (this.phase === 'fighter' || this.phase === 'board') this.setPhase('walk', { at: this.interior.stations.medbay.pos.clone(), yaw: Math.PI / 2 });
    this.banner('WREN LOST', 'bad');
  }

  kestrelLost() {
    this.combat.burst(this.player.obj.position.clone(), 80, { ring: true, shards: 30, camera: this.camera });
    this.banner('KESTREL LOST — reloading the last save', 'bad');
    this.setPhase('dead');
    setTimeout(() => this.load() || this.newGame(), 2800);
  }

  // --- boarding --------------------------------------------------------------------------------

  hackableFromFighter() {
    const o = this.fighterEnt.obj;
    for (const e of this.world.entities) {
      if (!e.alive || !e.boardable || e.captured) continue;
      const a = e.obj.localToWorld(e.obj.userData.airlock.clone());
      if (a.distanceTo(o.position) < 45) return e;
    }
    return null;
  }

  startHack(ship, by) {
    this.hacking = { ship, k: 0, by };
    this.toast(`Hacking ${ship.name}'s airlock: hold still.`, 'warn');
  }

  /** The fighter clamps to the hull's airlock while hacking and boarding, and rides with it. */
  latchFighter(ship) {
    const o = this.fighterEnt.obj;
    ship.obj.updateMatrixWorld();
    o.position.copy(ship.obj.localToWorld(ship.obj.userData.airlock.clone().add(new THREE.Vector3(0, -3, 0))));
    o.quaternion.copy(ship.obj.quaternion);
    this.fighterEnt.vel.copy(ship.vel);
    this.fighterEnt.speed = 0;
  }

  hackFrame(dt) {
    const h = this.hacking;
    if (!h) return;
    if (!h.ship.alive) return (this.hacking = null);
    h.k += dt / 3.5;
    if (h.k < 1) return;
    this.board(h.ship, h.by);
  }

  board(ship, by) {
    this.hacking = null;
    ship.boarded = true;
    ship.vel.set(0, 0, 0);
    ship.interior = capitalInterior(ship.obj, { floorY: -3, len: ship.kind === 'corvette' ? 60 : 50 });
    this.boardedBy = by;
    this.boarding.enter(ship, ship.interior);
    this.setPhase('board');
    this.banner(`AIRLOCK OPEN — ${ship.name}`, 'warn');
    this.log(`Boarded ${ship.name}.`, 'warn');
    this.panel.show('boarding');
  }

  unboard() {
    const ship = this.boarding.ship;
    this.boarding.exit();
    ship.interior?.dispose();
    ship.interior = null;
    if (!ship.captured) {
      ship.boarded = false;
      this.toast('Back out through the airlock. She will not forget you.', 'warn');
    }
    if (this.boardedBy === 'eva') {
      const a = ship.obj.localToWorld(ship.obj.userData.airlock.clone().add(new THREE.Vector3(0, -4, 0)));
      this.setPhase('eva');
      this.eva.pos.copy(a);
      this.eva.vel.copy(ship.vel);
    } else {
      this.latchFighter(ship);
      this.fighterFlight.throttle = 0.3;
      this.setPhase('fighter');
    }
  }

  boardingLost() {
    const ship = this.boarding.ship;
    this.boarding.exit();
    ship.interior?.dispose();
    ship.interior = null;
    ship.boarded = false;
    if (this.fighterOut) {
      this.world.remove(this.fighterEnt);
      this.showWren();
      this.fighterOut = false;
      this.parkedWren.visible = true;
    }
    this.boarding.hp = 100;
    this.log(`Shot down aboard ${ship.name}. Vex brought the Wren back with you in it, barely.`, 'bad');
    this.banner('YOU WAKE IN THE MEDBAY', 'bad');
    this.setPhase('walk', { at: this.interior.stations.medbay.pos.clone(), yaw: Math.PI / 2 });
  }

  captured(ship) {
    if (ship.captured) return;
    ship.captured = true;
    ship.side = 'player';
    ship.name = `${ship.name} (YOURS)`;
    this.state.kills++;
    const was = ship.kind;
    this.standingDelta(was === 'corvette' ? { rooks: -15, concord: 10 } : { guild: -25, concord: -12, rooks: 10 });
    if (was === 'corvette') this.state.flags.corvetteCaptured = true;
    if (was === 'freighter') this.state.flags.freighterTaken = true;
    this.banner('THE BRIDGE IS YOURS', 'good');
    this.log(`Took ${ship.name}.`, 'good');
    this.net.post(this.state.captain, `boarded and took the ${was === 'corvette' ? 'Carrion' : 'Guild hauler'}`);
    this.panel.show('boarding');
  }

  keepShip(ship) {
    const id = `fleet-${Date.now()}`;
    const entry = { id, name: ship.kind === 'corvette' ? 'Carrion' : 'Hauler', cls: ship.cls.cls, kind: ship.kind, hull: ship.hull, hullMax: ship.hullMax, order: 'follow', job: null, slot: this.state.fleet.length % 2 };
    this.state.fleet.push(entry);
    ship.fleetId = id;
    ship.kind = 'follower';
    ship.boarded = false;
    ship.name = entry.name.toUpperCase() + ' (YOURS)';
    this.log(`${entry.name} joins the fleet.`, 'good');
    this.unboard();
    this.panel.show('fleet');
  }

  scuttleShip(ship) {
    const loot = ship.cls.cargo * 25 + 400;
    this.state.credits += loot;
    for (let i = 0; i < 3; i++) this.world.spawnPod(ship.obj.position.clone().add(new THREE.Vector3(rand(-60, 60), rand(-30, 30), rand(-60, 60))), { goods: i ? 'parts' : 'medicine', qty: 2 });
    this.log(`Stripped ${ship.name} for ${loot} cr and blew her.`, 'warn');
    this.unboard();
    ship.captured = true;
    setTimeout(() => {
      ship.alive = false;
      this.combat.burst(ship.obj.position.clone(), 60, { ring: true, shards: 24, camera: this.camera });
      this.world.remove(ship);
    }, 1200);
  }

  // --- the sector: pods, deaths, hunters ---------------------------------------------------------

  collectPod(pod, by = null) {
    const p = pod.pod;
    if (p.core) {
      this.state.flags.core = true;
      this.log('The Meridian’s data core is in the hold.', 'good');
    } else if (p.credits) {
      this.state.credits += p.credits;
      this.log(`A credit chip: ${p.credits} cr.`, 'good');
      this.toast(`Credit chip: ${p.credits} cr`, 'good');
    } else {
      const room = this.ship.cargoMax - this.cargoUsed();
      const take = Math.min(p.qty, Math.floor(room / (GOODS[p.goods].size || 1)));
      if (take <= 0) return this.toast('The hold is full.', 'warn');
      this.state.cargo[p.goods] = (this.state.cargo[p.goods] ?? 0) + take;
      this.log(`Pod aboard: ${GOODS[p.goods].name} ×${take}.`, 'good');
      this.toast(`Scooped${by ? ` by ${by}` : ''}: ${GOODS[p.goods].name} ×${take}`, 'good');
    }
    this.world.remove(pod);
    pod.alive = false;
    this.refreshCrates();
    this.sfx.play('hit', 0);
    this.panel.refresh();
  }

  /** The Kestrel takes in a pod within 45 m of her; with the tractor fitted she pulls one in from 250 m. The Meridian's
   *  core is wedged in the wreck and needs hands: a space walk, never a scoop. */
  tractor(dt) {
    const k = this.player.obj.position;
    this.beams = [];
    for (const e of [...this.world.entities]) {
      if (e.kind !== 'pod' || !e.alive || e.pod.core) continue;
      const d = e.obj.position.distanceTo(k);
      if (d < 45) this.collectPod(e);
      else if (d < this.ship.tractor && !this.dockedAt) {
        e.obj.position.addScaledVector(_v.copy(k).sub(e.obj.position).normalize(), Math.min(d, 60 * dt));
        this.beams.push(e);
      }
    }
    this.space.beams(this.player.obj, this.beams);
  }

  /** The Wren scoops a pod she flies through. */
  scoop(body, reach) {
    for (const e of [...this.world.entities]) {
      if (e.kind === 'pod' && e.alive && !e.pod.core && e.obj.position.distanceTo(body.obj.position) < reach) this.collectPod(e, 'the Wren');
    }
  }

  /** Something died: who gets paid, who gets angry, what falls out. */
  wireDeaths() {
    for (const e of this.world.entities) {
      if (e.alive || e.deathHandled || e.side === 'player' || e.kind === 'pod') continue;
      e.deathHandled = true;
      const byYou = e.lastHitBy === 'player';
      this.combat.burst(e.obj.position.clone(), e.radius > 20 ? 50 : 16, { ring: true, shards: e.radius > 20 ? 24 : 10, camera: this.camera });
      if (e.kind === 'pirate') {
        if (byYou) {
          this.state.kills++;
          this.standingDelta({ rooks: -3, concord: 2 });
          this.progress('bounty', e);
        }
        if (Math.random() < 0.35) this.world.spawnPod(e.obj.position.clone(), { credits: 60 + Math.floor(Math.random() * 90) });
      } else if (e.kind === 'corvette') {
        if (byYou) this.standingDelta({ rooks: -15, concord: 8 });
        for (let i = 0; i < 3; i++) this.world.spawnPod(e.obj.position.clone().add(new THREE.Vector3(rand(-50, 50), rand(-20, 20), rand(-50, 50))), { goods: 'parts', qty: 2 });
        this.log(byYou ? 'The Carrion is gone. Concord will hear of it.' : 'The Carrion is gone.', 'warn');
      } else if (e.kind === 'freighter') {
        if (byYou) {
          this.standingDelta({ guild: -25, concord: -10, rooks: 8 });
          this.state.flags.freighterTaken = true;
          this.log('You destroyed a Guild hauler. The Guild and Concord will remember.', 'bad');
        }
        for (let i = 0; i < 4; i++) this.world.spawnPod(e.obj.position.clone().add(new THREE.Vector3(rand(-50, 50), rand(-20, 20), rand(-50, 50))), { goods: i % 2 ? 'parts' : 'ore', qty: 3 });
      } else if (e.kind === 'follower') {
        const f = this.state.fleet.find((x) => x.id === e.fleetId);
        if (f) this.state.fleet.splice(this.state.fleet.indexOf(f), 1);
        this.log(`${e.name} was destroyed.`, 'bad');
      }
      setTimeout(() => this.world.remove(e), 100);
      this.panel.refresh();
    }
  }

  standingDelta(d) {
    for (const [f, v] of Object.entries(d)) this.state.standing[f] = clamp(this.state.standing[f] + v, -100, 100);
  }

  spawnHunters() {
    const s = this.state.standing;
    const k = this.player.obj.position;
    if (s.rooks < HOSTILE_AT) {
      for (let i = 0; i < 2; i++) this.world.spawnPirate(k.clone().add(new THREE.Vector3(rand(-900, 900), rand(-200, 200), rand(-900, 900))), { hunter: true });
      this.banner('ROOK HUNTERS ON THE SCOPE', 'bad');
      this.log('The Rooks have a price on you: hunters jumped in behind you.', 'bad');
    }
    if (s.concord < HOSTILE_AT && this.world.sector.id === 'haven') {
      for (let i = 0; i < 2; i++) {
        const e = this.world.spawnPirate(k.clone().add(new THREE.Vector3(rand(-900, 900), rand(-200, 200), rand(-900, 900))));
        e.side = 'concord';
        e.name = 'CONCORD PATROL';
        M.setEngineColor(e.obj, '#58b0ff');
        e.obj.userData.hullMat = null;
      }
      this.banner('CONCORD PATROL — WEAPONS HOT', 'bad');
    }
  }

  // --- nav, dock, jump ---------------------------------------------------------------------------

  navCandidates() {
    const k = this.player.obj.position;
    const list = [];
    for (const e of this.world.entities) {
      if (!e.alive) continue;
      if (['station', 'gate', 'derelict', 'corvette', 'freighter', 'follower', 'pod'].includes(e.kind)) list.push({ e, d: e.obj.position.distanceTo(k) });
    }
    return list.sort((a, b) => a.d - b.d);
  }

  setNav(e) {
    this.nav = e;
    this.panel.refresh();
  }

  /** How far short of a course Vex stops: inside the dock's window, on a pod (so she scoops it), off a big hull. */
  navStop(e) {
    return { station: 130, pod: e.pod?.core ? 60 : 10, gate: 50, derelict: 90, corvette: 260, freighter: 200, follower: 150 }[e.kind] ?? 120;
  }

  navPoint() {
    const e = this.nav;
    if (e.kind === 'station') return e.obj.localToWorld(e.obj.userData.dock.clone());
    return e.obj.position;
  }

  missionTargets() {
    const out = [];
    for (const m of this.state.missions) {
      if (m.state !== 'active') continue;
      const k = m.tpl.kind;
      if (k === 'salvage' && this.world.core?.alive) out.push(this.world.core);
      if (k === 'capture' && this.world.corvette?.alive && !this.world.corvette.captured) out.push(this.world.corvette);
      if (k === 'raid' && this.world.freighter?.alive && !this.world.freighter.captured) out.push(this.world.freighter);
      if (k === 'courier' && this.world.station?.station.id === m.tpl.to) out.push(this.world.station);
    }
    return out;
  }

  canDock() {
    const st = this.world.station;
    if (!st || !['helm', 'walk', 'tactical', 'turret'].includes(this.phase) || this.fighterOut) return false;
    const d = st.obj.localToWorld(st.obj.userData.dock.clone()).distanceTo(this.player.obj.position);
    return d < 170 && this.player.speed < 25;
  }

  canJump() {
    if (!['helm', 'walk', 'tactical', 'turret'].includes(this.phase) || this.fighterOut) return null;
    for (const g of this.world.gates) if (g.obj.position.distanceTo(this.player.obj.position) < 130) return g;
    return null;
  }

  dock() {
    const st = this.world.station;
    this.dockedAt = st.station;
    this.nav = null;
    this.helmFlight.throttle = 0;
    this.player.vel.set(0, 0, 0);
    this.player.speed = 0;
    // She parks broadside to the concourse window.
    const p = st.obj.localToWorld(st.obj.userData.dock.clone());
    this.player.obj.position.copy(p);
    this.player.obj.quaternion.copy(st.obj.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2));
    this.player.shields = this.player.shieldsMax;
    this.space.beams(null, []);
    this.concourse?.dispose();
    this.concourse = concourseInterior(st.obj, { faction: st.station.faction });
    this.concourseWalker = new Walker(this.concourse);
    this.confiscate();
    this.setPhase('dock');
    this.banner(`DOCKED — ${st.station.name.toUpperCase()}`, 'good');
    this.log(`Docked at ${st.station.name}.`);
    this.refreshWire();
    this.save();
  }

  confiscate() {
    if (this.dockedAt.faction === 'concord' && this.state.cargo.contraband > 0) {
      const n = this.state.cargo.contraband;
      this.state.cargo.contraband = 0;
      this.standingDelta({ concord: -8 });
      this.log(`Concord customs took ${n} contraband and your name.`, 'bad');
      this.refreshCrates();
    }
  }

  undock() {
    const st = this.world.station;
    this.concourse?.dispose();
    this.concourse = null;
    const p = st.obj.localToWorld(st.obj.userData.dock.clone().add(new THREE.Vector3(0, 220, 0)));
    this.player.obj.position.copy(p);
    this.player.obj.lookAt(p.clone().add(new THREE.Vector3(0, 0, -1)));
    this.dockedAt = null;
    this.helmFlight.throttle = 0;
    this.setPhase('walk', { at: this.interior.spawn.clone(), yaw: 0 });
    this.banner('UNDOCKED', 'good');
  }

  jump(gate) {
    if (this.fighterOut) return this.toast('Land the Wren first.', 'warn');
    const to = gate.to;
    this.fadeEl.classList.add('on');
    this.banner(`THREAD → ${SECTORS[to].name.toUpperCase()}`, 'good');
    const prevPhase = this.phase === 'helm' ? 'helm' : 'walk';
    this.setPhase('jump');
    this.sfx.play('boom', 10, 30);
    setTimeout(() => {
      this.enterSector(to, this.world.sector.id);
      this.fadeEl.classList.remove('on');
      this.setPhase(prevPhase, { at: this.interior.spawn.clone(), yaw: 0 });
      this.save();
    }, 1700);
  }

  /** Lays the sector out and parks the Kestrel at the gate she came through (or the middle, from a save). */
  enterSector(id, from = null) {
    this.nav = null;
    this.target = null;
    this.world.load(id, { keep: [this.player], captured: { corvette: this.state.flags.corvetteCaptured } });
    this.space.setSector(id);
    if (!this.world.entities.includes(this.player)) this.world.add(this.player);
    this.state.sector = id;
    const k = this.player.obj;
    const arrival = from ? this.world.gates.find((g) => g.to === from) : null;
    if (arrival) {
      const dir = arrival.obj.position.clone().negate().normalize();
      k.position.copy(arrival.obj.position).addScaledVector(dir, 220);
      k.lookAt(k.position.clone().add(dir));
    } else {
      k.position.set(-300, 20, 300);
      k.lookAt(new THREE.Vector3(600, 0, -400));
    }
    k.updateMatrixWorld();
    this.helmFlight.throttle = 0;
    this.player.vel.set(0, 0, 0);
    this.spawnFollowers();
    this.spawnHunters();
    this.log(`Arrived in ${SECTORS[id].name}.`);
    if (this.world.corvette && this.state.flags.freighterTaken) this.world.freighter = null;
    this.panel.refresh();
    this.save();
  }

  spawnFollowers() {
    for (const f of this.state.fleet) {
      if (f.job) continue;
      const obj = f.kind === 'corvette' ? M.corvette() : M.freighter();
      const e = new Entity('follower', obj, { side: 'player', hull: f.hull, radius: SHIPS[f.kind].radius, half: SHIPS[f.kind].half, name: `${f.name.toUpperCase()} (YOURS)` });
      e.hullMax = f.hullMax;
      e.cls = SHIPS[f.kind];
      e.fleetId = f.id;
      e.slot = f.slot;
      e.captured = true;
      obj.position.copy(this.player.obj.position).add(new THREE.Vector3(f.slot ? 120 : -120, -20, 90).applyQuaternion(this.player.obj.quaternion));
      obj.quaternion.copy(this.player.obj.quaternion);
      this.world.add(e);
    }
  }

  fleetOrder(id, order, job = null) {
    const f = this.state.fleet.find((x) => x.id === id);
    if (!f) return;
    f.order = order;
    if (order === 'job') {
      f.job = { id: job.id, endsAt: Date.now() + job.minutes * 60000 };
      const e = this.world.entities.find((x) => x.fleetId === id);
      if (e) {
        this.combat.burst(e.obj.position.clone(), 10, { shards: 0, camera: this.camera, sound: false });
        this.world.remove(e);
      }
      this.log(`${f.name} jumps out: ${job.name}.`);
    }
    this.panel.refresh();
  }

  fleetJobs() {
    for (const f of this.state.fleet) {
      if (!f.job || f.job.endsAt > Date.now()) continue;
      const job = FLEET_JOBS.find((j) => j.id === f.job.id);
      f.job = null;
      f.order = 'follow';
      if (Math.random() < job.risk) {
        f.hull = Math.max(f.hullMax * 0.2, f.hull - f.hullMax * 0.4);
        this.log(`${f.name} is back from ${job.name}, shot up, with ${job.reward} cr.`, 'warn');
      } else this.log(`${f.name} is back from ${job.name} with ${job.reward} cr.`, 'good');
      this.state.credits += job.reward;
      const e = this.world.entities.find((x) => x.fleetId === f.id);
      if (!e) {
        this.state.fleet = this.state.fleet.filter((x) => x !== f).concat([f]);
        this.spawnOneFollower(f);
      }
      this.panel.refresh();
    }
  }

  spawnOneFollower(f) {
    const keep = this.state.fleet;
    this.state.fleet = [f];
    this.spawnFollowers();
    this.state.fleet = keep;
  }

  canClaim() {
    const here = this.world.sector?.id;
    return here && !this.hostiles().length && this.world.entities.some((e) => e.kind === 'follower' && e.alive) && this.state.credits >= 2000 && this.claims[here]?.captain !== this.state.captain;
  }

  async claimSector() {
    if (!this.canClaim()) return;
    this.state.credits -= 2000;
    const here = this.world.sector.id;
    await this.net.claim(here, this.state.captain);
    this.claims = await this.net.claims();
    this.log(`You hold ${SECTORS[here].name}. Other captains will see it on the wire.`, 'good');
    this.banner(`${SECTORS[here].name.toUpperCase()} IS YOURS`, 'good');
    this.refreshWire();
  }

  async refreshWire() {
    this.wire = await this.net.feed();
    this.claims = await this.net.claims();
    this.panel.refresh();
  }

  // --- missions ----------------------------------------------------------------------------------

  offers() {
    const st = this.dockedAt;
    return Object.entries(MISSIONS)
      .filter(([k, t]) => t.at === st.id)
      .filter(([k]) => !this.state.missions.some((m) => m.key === k && m.state !== 'turned'))
      .filter(([k]) => !(k === 'salvage' && this.state.flags.salvageDone) && !(k === 'capture' && this.state.flags.corvetteCaptured) && !(k === 'raid' && this.state.flags.freighterTaken))
      .map(([k, t]) => ({ ...t, key: k, kind: k.replace(/\d+$/, '') }));
  }

  accept(t) {
    if (t.cargo) {
      const need = Object.entries(t.cargo).reduce((n, [g, q]) => n + q * GOODS[g].size, 0);
      if (this.cargoUsed() + need > this.ship.cargoMax) return this.toast('No room in the hold for the cargo.', 'warn');
      for (const [g, q] of Object.entries(t.cargo)) this.state.cargo[g] = (this.state.cargo[g] ?? 0) + q;
      this.refreshCrates();
    }
    this.state.missions.push({ key: t.key, tpl: t, state: 'active', progress: 0 });
    this.log(`Took: ${t.title}.`);
    this.panel.refresh();
  }

  abandon(m) {
    m.state = 'turned';
    this.standingDelta({ [m.tpl.giver]: -3 });
    this.log(`Dropped: ${m.tpl.title}.`, 'warn');
    this.panel.refresh();
  }

  progress(kind, e) {
    for (const m of this.state.missions) {
      if (m.state !== 'active' || m.tpl.kind !== kind) continue;
      if (kind === 'bounty' && this.world.sector.id === m.tpl.sector) {
        m.progress++;
        if (m.progress >= m.tpl.count) this.done(m);
        else this.toast(`Bounty: ${m.progress} of ${m.tpl.count}`, 'good');
      }
    }
  }

  checkMissions() {
    for (const m of this.state.missions) {
      if (m.state !== 'active') continue;
      const k = m.tpl.kind;
      if (k === 'salvage' && this.state.flags.core) this.done(m);
      if (k === 'capture' && this.state.flags.corvetteCaptured) this.done(m);
      if (k === 'raid' && this.state.flags.freighterTaken) this.done(m);
      if (k === 'courier') {
        const ok = Object.entries(m.tpl.cargo).every(([g, q]) => (this.state.cargo[g] ?? 0) >= q);
        if (ok && this.dockedAt?.id === m.tpl.to) this.done(m);
      }
    }
  }

  done(m) {
    m.state = 'done';
    this.banner(`DONE — ${m.tpl.title.toUpperCase()}`, 'good');
    this.log(`${m.tpl.title}: done. Turn it in at ${STATIONS[m.tpl.to ?? m.tpl.at].name}.`, 'good');
    this.panel.refresh();
  }

  turnIn(m) {
    const t = m.tpl;
    if (t.cargo) {
      for (const [g, q] of Object.entries(t.cargo)) this.state.cargo[g] = Math.max(0, (this.state.cargo[g] ?? 0) - q);
      this.refreshCrates();
    }
    if (t.kind === 'salvage') {
      this.state.flags.core = false;
      this.state.flags.salvageDone = true;
      this.refreshCrates();
    }
    this.state.credits += t.reward;
    this.standingDelta(t.standing);
    m.state = 'turned';
    this.log(`${t.title}: paid ${t.reward} cr.`, 'good');
    this.net.post(this.state.captain, `finished "${t.title}"`);
    this.panel.refresh();
  }

  missionStatus(m) {
    const t = m.tpl;
    if (m.state === 'done') return 'Done. Turn it in.';
    if (t.kind === 'bounty') return `${m.progress} of ${t.count} raiders in ${SECTORS[t.sector].name}.`;
    if (t.kind === 'courier') return `Carrying ${Object.entries(t.cargo).map(([g, q]) => `${GOODS[g].name} ×${q}`).join(', ')} to ${STATIONS[t.to].name}.`;
    if (t.kind === 'salvage') return `The core is beside the Meridian in ${SECTORS[t.sector].name}. Space walk to it.`;
    if (t.kind === 'capture') return `The Carrion patrols ${SECTORS[t.sector].name}. Hack her belly airlock from the Wren.`;
    if (t.kind === 'raid') return `The hauler runs the ${SECTORS[t.sector].name} lane. Destroy her or take her.`;
    return '';
  }

  // --- trade and the yard ------------------------------------------------------------------------

  priceAt(goods, buying) {
    const st = this.dockedAt;
    const k = st.prices[goods] ?? 1.2;
    return Math.round(GOODS[goods].base * k * (buying ? 1.1 : 0.9));
  }

  buy(goods, n) {
    const cost = this.priceAt(goods, true) * n;
    if (this.state.credits < cost) return;
    this.state.credits -= cost;
    this.state.cargo[goods] = (this.state.cargo[goods] ?? 0) + n;
    this.refreshCrates();
    this.panel.refresh();
  }

  sell(goods, n) {
    n = Math.min(n, this.state.cargo[goods] ?? 0);
    if (n <= 0) return;
    this.state.credits += this.priceAt(goods, false) * n;
    this.state.cargo[goods] -= n;
    this.refreshCrates();
    this.panel.refresh();
  }

  repairCost() {
    const k = this.player;
    const hull = Math.round((k.hullMax - k.hull) * 0.8);
    const wren = Math.round((this.fighterEnt.hullMax - this.fighterEnt.hull) * 2);
    return hull + wren;
  }

  repair() {
    const c = this.repairCost();
    if (this.state.credits < c) return;
    this.state.credits -= c;
    this.player.hull = this.player.hullMax;
    this.fighterEnt.hull = this.fighterEnt.hullMax;
    this.log(`Repairs: ${c} cr.`);
    this.panel.refresh();
  }

  buyUpgrade(id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u || this.state.upgrades.includes(id) || this.state.credits < u.cost) return;
    this.state.credits -= u.cost;
    this.state.upgrades.push(id);
    this.applyUpgrades();
    this.log(`Fitted: ${u.name}.`, 'good');
    this.panel.refresh();
  }

  setPaint(c) {
    this.state.paint = c;
    this.player.obj.userData.hullMat.color.set(c);
    this.parkedWren.userData.hullMat.color.set(c);
    this.fighterEnt.obj.userData.hullMat.color.set(c);
    this.panel.refresh();
  }

  setEngine(c) {
    this.state.engine = c;
    for (const o of [this.player.obj, this.parkedWren, this.fighterEnt.obj]) M.setEngineColor(o, c);
    this.panel.refresh();
  }

  hire(id) {
    const h = HIRE.find((x) => x.id === id);
    if (!h || this.state.hired.includes(id) || this.state.credits < h.cost) return;
    this.state.credits -= h.cost;
    this.state.hired.push(id);
    if (h.role !== 'marine') this.state.crew[id] = 'idle';
    this.log(`${h.name} signs on.`, 'good');
    this.placeCrew();
    this.panel.refresh();
  }

  // --- words -------------------------------------------------------------------------------------

  prompt(text) {
    if (text === this.prompted) return;
    this.prompted = text;
    this.promptEl.hidden = !text;
    if (text) this.promptEl.innerHTML = `<b>E</b>${text}`;
  }

  toast(text, cls = '') {
    this.banner(text, cls, 2.4);
  }

  banner(text, cls = '', seconds = 3.2) {
    this.bannerEl.textContent = text;
    this.bannerEl.className = cls;
    this.bannerEl.hidden = false;
    this.toastT = seconds;
  }

  log(text, cls = '') {
    this.state.log.push({ t: Date.now(), text, cls });
    if (this.state.log.length > 80) this.state.log.shift();
  }

  // --- save ------------------------------------------------------------------------------------------

  save(say = false) {
    this.state.hull = this.player.hull;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      if (say) this.toast('Saved.', 'good');
    } catch {}
  }

  hasSave() {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  }

  load() {
    let s;
    try {
      s = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch {}
    if (!s) return false;
    this.start({ ...freshState(), ...s });
    return true;
  }

  newGame(ask = false) {
    if (ask && !confirm('Start over as a new captain? The save is replaced on the next dock or jump.')) return;
    this.start(freshState());
  }

  start(state) {
    this.state = state;
    document.getElementById('title').hidden = true;
    this.world.clear();
    this.buildShip();
    this.enterSector(state.sector);
    this.setPhase('walk', { at: this.interior.spawn.clone(), yaw: 0 });
    this.refreshWire();
    this.banner(`${state.captain.toUpperCase()} · THE KESTREL`, 'good', 4);
    if (!state.log.length) this.log('Haven. The Kestrel is yours, with a debt on her and two crew who stayed. The board on the station has work.');
    this.panel.refresh();
  }

  // --- the loop ------------------------------------------------------------------------------------

  frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000); // a slow frame gets up to a tenth of a second, so game time keeps up with the clock down to 10 fps
    this.lastT = now;
    this.lastDt = dt;
    this.clock += dt;
    if (this.target && !this.target.alive) this.target = null;
    const f = this.input.frame();
    if (this.phase !== 'title' && this.phase !== 'dead') {
      this.space.frame(this.camera, dt);
      if (this.phase !== 'dock') {
        this.ai.frame(dt);
        this.ai.crew(dt);
        if (this.phase === 'fighter' || this.phase === 'board' || this.phase === 'eva') this.player.shields = Math.min(this.player.shieldsMax, this.player.shields + 3 * dt);
        else this.player.shields = Math.min(this.player.shieldsMax, this.player.shields + 3 * dt);
        this.tractor(dt);
        this.hackFrame(dt);
      }
      this.controller.frame(f, dt);
      this.world.frame(dt);
      this.combat.frame(dt, this.camera);
      this.wireDeaths();
      this.fleetJobs();
      this.checkMissions();
      this.underFire = Math.max(0, (this.underFire ?? 0) - dt);
      this.flash = Math.max(0, this.flash - dt * 2.5);
      this.dockPrompt = this.canDock() ? `J — DOCK AT ${this.world.station.station.name.toUpperCase()}` : this.canJump() ? `J — JUMP THE THREAD TO ${SECTORS[this.canJump().to].name.toUpperCase()}` : '';
      // The fighter's parked twin and the hull lights breathe a little.
      this.controller.placeCamera(this.camera);
      this.space.follow(this.camera);
      this.panel.tick(dt);
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.bannerEl.hidden = true;
    }
    // Walking inside the Kestrel, the hull shell is not drawn: its boxes overlap, and the inner face of the next box
    // is a front face in your room (ships.mjs, SHELL_LAYER). Every other seat sees the whole ship.
    this.camera.layers.set(0);
    if (this.phase !== 'walk') this.camera.layers.enable(M.SHELL_LAYER);
    this.renderer.render(this.scene, this.camera);
    this.hud.draw(this);
    requestAnimationFrame(() => this.frame());
  }

  /** For the drive: numbers a test can gate on. */
  stats() {
    const k = this.player;
    return {
      phase: this.phase,
      sector: this.world.sector?.id ?? null,
      credits: this.state?.credits ?? 0,
      hull: Math.round(k?.hull ?? 0),
      shields: Math.round(k?.shields ?? 0),
      speed: Math.round(k?.speed ?? 0),
      position: k ? k.obj.position.toArray().map(Math.round) : null,
      fighterOut: this.fighterOut,
      fighterHull: Math.round(this.fighterEnt?.hull ?? 0),
      hostiles: this.hostiles().length,
      entities: this.world.entities.length,
      kills: this.state?.kills ?? 0,
      standing: this.state?.standing,
      cargo: this.state?.cargo,
      missions: this.state?.missions.map((m) => `${m.key}:${m.state}:${m.progress}`),
      fleet: this.state?.fleet.length ?? 0,
      nav: this.nav?.name ?? null,
      target: this.target?.name ?? null,
      prompt: this.prompted,
      docked: this.dockedAt?.id ?? null,
      boarding: this.phase === 'board' ? { hp: Math.round(this.boarding.hp), left: this.boarding.defendersLeft(), captured: !!this.boarding.ship.captured } : null,
      walker: this.phase === 'walk' ? this.walker.pos.toArray().map((v) => Math.round(v * 10) / 10) : null,
      eva: this.phase === 'eva' ? { o2: Math.round(this.eva.o2), pos: this.eva.pos.toArray().map(Math.round) } : null,
      hacking: this.hacking ? Math.round(this.hacking.k * 100) / 100 : null,
      locked: this.input.locked,
      bolts: this.combat.bolts.length
    };
  }
}
