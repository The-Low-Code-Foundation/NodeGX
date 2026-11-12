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
import { kestrelValues, buildKestrel, reloadDesigns } from './models/designs.mjs';
import { setBayDoor, BAY_MOUTH } from './models/kestrel.mjs';
import { Tweens, ease } from './sequence.mjs';
import { airlockOut, airlockIn, launchSequence, landSequence } from './cinematics.mjs';
import { frigateInterior, capitalInterior, concourseInterior } from './interiors.mjs';
import { LightPool } from './lights.mjs';
import { Walker } from './controllers/walk.mjs';
import { Flight } from './controllers/fly.mjs';
import { TurretSeat } from './controllers/turret.mjs';
import { Eva } from './controllers/eva.mjs';
import { Boarding } from './controllers/board.mjs';
import { Orders } from './orders.mjs';
import { Command } from './command.mjs';
import { makePerson, animatePerson, randomLook, Viewmodel } from './people.mjs';
import { SECTORS, STATIONS, SHIPS, UPGRADES, GOODS, MISSIONS, FLEET_JOBS, CREW, HIRE, POSTS, HOSTILE_AT, FACTIONS, WREN_COST } from './data.mjs';
import { clamp, rand, forwardOf, UP } from './util.mjs';

const SAVE_KEY = 'threadspace-save';
const IDLE = { keys: new Set(), dx: 0, dy: 0, wheel: 0, trigger: false, clicked: false }; // the input a seat gets while the map is open
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
    paint: kestrelValues().paint, // a new captain's Kestrel wears the shipyard's design
    engine: kestrelValues().engineGlow,
    crew: { vex: 'helm', dag: 'turret' },
    hired: [],
    fleet: [],
    missions: [],
    log: [],
    flags: {},
    sector: 'haven',
    hull: SHIPS.frigate.hull,
    kills: 0,
    wren: 'ok', // 'lost' once she is wreckage, until a yard builds another
    look: null // the captain's own look (people.mjs), set on the wardrobe
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
    this.lightPool = new LightPool(this.scene);
    this.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.perf = { avg: 1 / 60, cool: 3, block: null };
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
    this.orders = new Orders(this);
    this.command = new Command(this);
    this.transfers = []; // crew crossing between ships in suits (ai.mjs `transfers`)
    this.TRANSFER_RANGE = 1000; // how far a suit goes between hulls
    this.phase = 'title';
    this.controller = null;
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
    this.chase = { fighter: false, helm: false, walk: false, board: false, eva: false }; // V: behind the ship (or you) instead of in it
    this.gunnerOn = null; // what Dag is shooting at, for the HUD
    this.turretSeat = new TurretSeat(this);
    this.eva = new Eva(this);
    this.boarding = new Boarding(this);
    // s6: the animations between seats (cinematics.mjs). A drive that wants the old instant hand-overs sets this false.
    this.cinematics = !/[?&]cine=0\b/.test(location.search);
    this.cine = null;
    this.tweens = new Tweens();
    this.bay = { requested: false, k: 0 }; // the Wren's call for the bay: the doors open while you fly her to them
    this.bayLamps = false;
    this.visorOn = false;
    this.visorEl = document.getElementById('visor');
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('focus', () => this.checkDesign()); // back from the shipyard's tab
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
    const design = this.design();
    // The shipyard's colours, unless the captain chose others at a paint shop (then those win, and the Wren wears them too).
    this.state.paint = design.paint;
    this.state.engine = design.engineGlow;
    this.builtDesign = JSON.stringify(design);
    this.designWaiting = false;
    const obj = buildKestrel(design);
    const e = new Entity('frigate', obj, { side: 'player', hull: SHIPS.frigate.hull, shields: SHIPS.frigate.shields, radius: SHIPS.frigate.radius, half: SHIPS.frigate.half, name: 'KESTREL' });
    e.cls = SHIPS.frigate;
    this.player = e;
    this.applyUpgrades();
    e.hull = clamp(this.state.hull ?? e.hullMax, 1, e.hullMax);
    e.onDamage = (amount, at, bySide, by) => {
      if (this.playerBody() === e) {
        this.flash = 1;
        this.sfx.play('hit', 0);
      }
      if (bySide === 'rooks' || bySide === 'concord') this.underFire = 4;
      if (by) by.hitUsAt = this.clock; // for "return fire"
    };
    e.onDeath = () => this.kestrelLost();
    this.interior = frigateInterior(obj, design);
    this.walker = new Walker(this.interior);
    this.helmFlight = new Flight(e, { speed: [0, this.ship.speedMax], turn: this.ship.turn });
    this.helmFlight.throttle = 0;
    // The Wren on her pad; a second mesh flies when she launches.
    this.parkedWren = M.fighter({ paint: this.state.paint, engine: this.state.engine });
    this.parkedWren.position.copy(this.interior.fighterPad);
    this.parkedWren.rotation.y = Math.PI;
    this.parkedWren.visible = this.state.wren !== 'lost';
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
    this.fighterEnt.alive = this.state.wren !== 'lost';
    this.fighterFlight = new Flight(this.fighterEnt, SHIPS.fighter);
    this.fighterOut = false;
    this.bay = { requested: false, k: 0 };
    this.bayLamps = false;
    this.placeCrew();
    this.refreshCrates();
  }

  /** The Kestrel as the shipyard designed her, with the paint shop's choices over it. */
  design() {
    const over = {};
    if (this.state.paintChosen) over.paint = this.state.paint;
    if (this.state.engineChosen) over.engineGlow = this.state.engine;
    return kestrelValues(over);
  }

  /** Back from the shipyard: has a new design been saved since she was built? */
  async checkDesign() {
    const changed = await reloadDesigns();
    if (!this.player || this.phase === 'title' || !changed) return;
    this.designWaiting = JSON.stringify(this.design()) !== this.builtDesign;
    if (!this.designWaiting) return;
    this.banner('A NEW DESIGN FROM THE SHIPYARD · SHIP TAB: REFIT HER', 'good', 6);
    this.log('The shipyard sent a new design for the Kestrel. Refit her from the Ship tab.', 'good');
    this.panel.refresh();
  }

  /** Where a refit can't happen: off the ship, mid-jump, or dressing. */
  canRefit() {
    return !['board', 'eva', 'fighter', 'jump', 'dead', 'wardrobe', 'title', 'scene'].includes(this.phase);
  }

  /** Rebuilds her to the saved design, the way Continue does: saved, then loaded, back aboard in this sector. */
  refit() {
    if (!this.canRefit()) return;
    this.save();
    this.load();
    this.banner('REFITTED · THE SHIPYARD’S DESIGN', 'good', 4);
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

  /** The crew stand at their posts: at the helm, the turret ladder, the engine room, the airlock with the boarding
   *  party, the rest about the bridge. Whoever is flying a prize, or crossing to one, is not aboard. */
  placeCrew() {
    const I = this.interior;
    for (const p of I.people) p.removeFromParent();
    I.people = [];
    let idle = 0, party = 0;
    for (const c of this.roster()) {
      const post = this.state.crew[c.id] ?? 'idle';
      if (post.startsWith('prize') || post === 'transfer') continue;
      const taken = (post === 'helm' && this.phase === 'helm') || (post === 'turret' && this.phase === 'turret');
      const spot = taken || post === 'idle' ? I.stations.idle[idle++ % I.stations.idle.length] : post === 'party' ? I.stations.party[party++ % I.stations.party.length] : I.stations[post];
      I.person(c.name, c.look, spot.pos.x, spot.pos.z, spot.yaw, { pose: spot.pose ?? 'idle' });
    }
  }

  refreshCrates() {
    const items = { ...this.state.cargo };
    if (this.state.flags.core) items.core = 1;
    this.interior.crates(items, ...this.interior.crateOrigin);
  }

  cargoUsed() {
    return Object.entries(this.state.cargo).reduce((n, [id, q]) => n + q * (GOODS[id]?.size ?? 1), 0);
  }

  /** Everyone signed on: the two who stayed and whoever you hired, with their stats and their look. */
  roster() {
    return CREW.concat(HIRE.filter((h) => this.state.hired.includes(h.id)));
  }

  crewInfo(id) {
    return this.roster().find((c) => c.id === id) ?? null;
  }

  crewName(id) {
    return id ? this.crewInfo(id)?.name ?? id : null;
  }

  crewAt(post) {
    return Object.entries(this.state.crew).find(([, s]) => s === post)?.[0] ?? null;
  }

  crewIn(post) {
    return Object.entries(this.state.crew).filter(([, s]) => s === post).map(([id]) => id);
  }

  /** Puts `id` at `post`; a full post sends whoever was there off duty. */
  setCrew(id, post) {
    const now = this.state.crew[id] ?? 'idle';
    if (now.startsWith('prize') || now === 'transfer') return this.toast(`${this.crewName(id)} is not aboard the Kestrel.`, 'warn');
    const max = POSTS.find((p) => p.id === post)?.max ?? 1;
    const there = this.crewIn(post).filter((x) => x !== id);
    if (there.length >= max) this.state.crew[there[0]] = 'idle';
    this.state.crew[id] = post;
    const words = { helm: 'takes the helm', turret: 'climbs into the turret', engine: 'goes below to the engines', party: 'joins the boarding party', idle: 'stands down' }[post] ?? post;
    this.log(`${this.crewName(id)} ${words}.`);
    this.placeCrew();
    this.panel.refresh();
  }

  /** What a crew member's stats come to at a post: the numbers the AI flies and shoots by, and the panel prints.
   *  Stats run 1–10. `prize` is one person flying a captured ship and working her guns as well. */
  crewEffect(id, post) {
    const s = this.crewInfo(id)?.stats ?? { pilot: 1, gunnery: 1, engineering: 1, combat: 1 };
    const k = (v) => (v - 1) / 9;
    if (post === 'helm' || post === 'prize') {
      const p = k(s.pilot), gk = k(s.gunnery);
      return { skill: p, evade: s.pilot * 0.025, turn: 0.5 + p * 0.6, brake: 2.5 + p * 5.5, spread: 0.006 + (1 - gk) * 0.03, rate: 0.45 + gk * 0.45 };
    }
    if (post === 'turret') {
      const gk = k(s.gunnery);
      return { spread: 0.004 + (1 - gk) * 0.03, swing: 1.2 + gk * 2.8, react: 1.5 - gk * 1.2, lead: 0.55 + gk * 0.45 };
    }
    if (post === 'engine') return { shields: 2 + s.engineering * 0.55, patch: s.engineering * 0.3 };
    if (post === 'party') return { hp: 60 + s.combat * 8, damage: 12 + s.combat * 1.6, every: 1.5 - s.combat * 0.08, spread: 0.01 + (10 - s.combat) * 0.012 };
    return {};
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

  /** A hull none of your guns fires on: one you spared on the map, the one you are hacking or standing in. */
  wontShoot(e) {
    return this.orders.spared.has(e) || e === this.hacking?.ship || !!e.boarded;
  }

  /** Where the captain is, in the world: the Wren, the suit, the hull being boarded, or the Kestrel. */
  youAt() {
    const p = this.phase;
    if (p === 'fighter') return this.fighterEnt.obj.position;
    if (p === 'eva') return this.eva.pos;
    if (p === 'board') return this.boarding.ship.obj.position;
    return this.player.obj.position;
  }

  aboardKestrel() {
    return ['walk', 'helm', 'turret', 'tactical'].includes(this.phase);
  }

  /** The Kestrel's course: what the first step of her plan points at (orders.mjs). Setting it replaces the plan. */
  get nav() {
    const st = this.orders?.current('kestrel');
    return st && st.target && st.target !== 'you' ? st.target : null;
  }

  set nav(e) {
    if (!this.orders) return;
    if (e) this.orders.now('kestrel', { move: e.kind === 'pod' ? 'scoop' : 'goto', target: e });
    else this.orders.clear('kestrel');
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
    if (this.command.open && p !== 'tactical') this.command.hide(); // a dock, a jump, an ejection: the map closes
    this.controller?.exit?.();
    this.phase = p;
    this.prompt(null);
    this.hacking = null;
    if (p !== 'scene') this.cine = null;
    if (p !== 'fighter' && p !== 'scene' && this.bay.requested) this.shutBay(true);
    if (p === 'walk') {
      this.controller = { frame: (f, dt) => this.walkFrame(f, dt), placeCamera: (c) => this.walker.placeCamera(c, this.player.obj, this.chase.walk), exit: () => {} };
      if (opts.at) this.walker.moveTo(opts.at, opts.yaw ?? 0);
    } else if (p === 'helm') {
      this.controller = { frame: (f, dt) => this.helmFrame(f, dt), placeCamera: (c) => this.helmCamera(c), exit: () => {} };
    } else if (p === 'turret') {
      this.turretSeat.enter();
      this.controller = { frame: (f, dt) => this.turretFrame(f, dt), placeCamera: (c) => this.turretSeat.placeCamera(c), exit: () => this.turretSeat.exit() };
    } else if (p === 'tactical') {
      // The captain's chair: the command map, running. Standing up closes it.
      this.controller = { frame: () => {}, placeCamera: () => {}, exit: () => {} };
    } else if (p === 'fighter') {
      this.controller = { frame: (f, dt) => this.fighterFrame(f, dt), placeCamera: (c) => this.fighterCamera(c), exit: () => {} };
    } else if (p === 'eva') {
      this.eva.enter();
      this.controller = { frame: (f, dt) => this.evaFrame(f, dt), placeCamera: (c) => this.evaCamera(c), exit: () => {} };
    } else if (p === 'board') {
      this.controller = { frame: (f, dt) => this.boardFrame(f, dt), placeCamera: (c) => this.boarding.walker.placeCamera(c, this.boarding.ship.obj, this.chase.board), exit: () => {} };
    } else if (p === 'dock') {
      this.controller = { frame: (f, dt) => this.dockFrame(f, dt), placeCamera: (c) => this.concourseWalker.placeCamera(c, this.world.station.obj, this.chase.walk), exit: () => {} };
    } else if (p === 'wardrobe') {
      this.controller = { frame: (f, dt) => this.wardrobeFrame(f, dt), placeCamera: (c) => this.wardrobeCamera(c), exit: () => {} };
    } else if (p === 'scene') {
      // An animation between seats (cinematics.mjs): it moves everything and places the camera; E skips it.
      this.controller = { frame: (f, dt) => this.cine?.frame(dt), placeCamera: (c) => this.cine?.place(c), exit: () => {} };
    } else {
      this.controller = { frame: () => {}, placeCamera: () => {}, exit: () => {} };
    }
    if (p === 'helm' || p === 'turret' || p === 'walk') this.placeCrew();
    this.dressAvatar();
    this.panel.refresh();
    this.input.lockAllowed = p !== 'title' && p !== 'tactical' && p !== 'wardrobe';
    if (p === 'scene') this.prompt('Skip');
    if (p === 'wardrobe') this.input.unlock();
    if (p === 'tactical') this.command.show({ paused: false });
  }

  /** Tab: the command map, paused, over wherever you are. */
  openCommand() {
    if (['title', 'dead', 'jump', 'dock', 'scene'].includes(this.phase)) return;
    this.command.show({ paused: true });
  }

  /** Back exactly where you were (the chair stands you up). */
  closeCommand() {
    this.command.hide();
    if (this.phase === 'tactical') this.setPhase('walk', { at: this.interior.stations.chair.pos.clone(), yaw: Math.PI });
  }

  /** A key that is an action, not a hold: E uses, J jumps or docks, Tab is the chair, T the next target, V the view. */
  action(code) {
    if (this.phase === 'title') return;
    if (this.phase === 'scene') {
      if (code === 'KeyE' || code === 'Tab') this.cine?.skip();
      return;
    }
    if (code === 'Tab' || code === 'Escape') {
      if (this.command.open) return this.closeCommand();
      if (code === 'Tab') this.openCommand();
      return;
    }
    if (code === 'KeyP') return this.command.open ? this.command.togglePause() : this.openCommand();
    if (this.command.open) {
      if (code === 'KeyE') this.closeCommand();
      return;
    }
    if (code === 'KeyT' && ['helm', 'fighter', 'turret', 'walk'].includes(this.phase)) return this.nextTarget();
    if (code === 'KeyV' && ['fighter', 'helm', 'walk', 'board', 'eva', 'dock'].includes(this.phase)) {
      const key = this.phase === 'dock' ? 'walk' : this.phase;
      this.chase[key] = !this.chase[key];
      this.chaseCam = null;
      const words = { fighter: ['Chase view: V for the cockpit', 'Cockpit view'], helm: ['Chase view: V for the bridge', 'Bridge view'] }[key] ?? ['Third person: V for your own eyes', 'First person'];
      return this.toast(words[this.chase[key] ? 0 : 1], 'good');
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
    } else if (p === 'fighter') {
      if (!this.cinematics && this.canLand()) return this.land();
      if (this.cinematics && this.canRequestBay()) return this.requestBay();
      if (this.cinematics && this.bay.requested && this.inBayReach()) return this.play(landSequence(this));
      const h = this.hackableFromFighter();
      if (h) return this.startHack(h, 'fighter');
    } else if (p === 'eva') {
      const u = this.eva.nearestUse();
      if (!u) return;
      if (u.id === 'inside') {
        if (this.cinematics) return this.play(airlockIn(this));
        this.setPhase('walk', { at: this.interior.stations.airlock.pos.clone(), yaw: -Math.PI / 2 });
        this.pickedUp();
      }
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
    else if (id === 'fighter') {
      if (this.state.wren === 'lost' || !this.cinematics) this.launch();
      else this.play(launchSequence(this));
    } else if (id === 'eva') {
      if (this.world.sector) this.cinematics ? this.play(airlockOut(this)) : this.setPhase('eva');
    } else if (id === 'rest') {
      this.boarding.hp = 100;
      this.toast('You sit a moment. Steadier.', 'good');
    } else if (id === 'cargo') this.panel.show('ship');
    else if (id === 'engine') this.panel.show('crew');
    else if (id === 'wardrobe') this.openWardrobe();
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
    this.moveAvatar(this.walker, dt);
  }

  // --- you: the avatar, the third-person view, the locker --------------------------------------------------------

  /** The captain's own look, with an index into each palette (people.mjs). */
  look() {
    return (this.state.look ??= randomLook());
  }

  /** Your body, dressed for where you are (a suit outside, a rifle aboard someone else's hull) and put in that place's
   *  frame: the Kestrel's decks, the concourse, the boarded hull, or space. It is drawn when the camera is not your eyes. */
  dressAvatar() {
    const p = this.phase;
    if (p === 'scene') return this.avatar && (this.avatar.visible = false); // the animation has its own body
    const kind = p === 'eva' ? 'suit' : 'crew';
    const gun = p === 'board';
    const key = `${kind}|${gun}|${JSON.stringify(this.look())}`;
    if (!this.avatar || this.avatar.userData.key !== key) {
      this.avatar?.removeFromParent();
      this.avatar = makePerson(this.look(), { kind, gun });
      this.avatar.userData.key = key;
    }
    const host = p === 'walk' || p === 'wardrobe' ? this.interior?.group : p === 'dock' ? this.concourse?.group : p === 'board' ? this.boarding.interior?.group : p === 'eva' ? this.scene : null;
    if (!host) return this.avatar.removeFromParent();
    if (this.avatar.parent !== host) host.add(this.avatar);
  }

  /** Puts the avatar where the walker stands, walking when it moves. Drawn only in the third person (V). */
  moveAvatar(w, dt, { pose = null } = {}) {
    const a = this.avatar;
    if (!a?.parent) return;
    const key = this.phase === 'dock' ? 'walk' : this.phase;
    a.visible = !!this.chase[key] && !this.command.open;
    if (!a.visible) return;
    const was = a.position.clone();
    a.position.copy(w.pos);
    a.rotation.set(0, w.yaw, 0);
    const speed = dt > 0 ? was.distanceTo(w.pos) / dt : 0;
    animatePerson(a, dt, { pose: pose ?? (speed > 0.3 ? 'walk' : 'idle'), speed, aim: w.pitch });
  }

  openWardrobe(first = false) {
    this.wardrobeFirst = first;
    this.wardrobeYaw = -Math.PI / 2;
    this.setPhase('wardrobe');
    this.panel.show('you');
  }

  closeWardrobe() {
    const first = this.wardrobeFirst;
    this.wardrobeFirst = false;
    this.setPhase('walk', first ? { at: this.interior.spawn.clone(), yaw: 0 } : { at: this.interior.stations.medbay.pos.clone(), yaw: -Math.PI / 2 });
    if (first) this.banner(`${this.state.captain.toUpperCase()} · THE KESTREL`, 'good', 4);
    this.save();
  }

  /** One of your looks changes: the mirror shows it at once. */
  setLook(key, value) {
    this.state.look = { ...this.look(), [key]: value };
    this.dressAvatar();
    this.panel.refresh();
  }

  wardrobeFrame(f, dt) {
    if (f.trigger && f.dx) this.wardrobeYaw -= f.dx * 0.01;
    else this.wardrobeYaw += dt * 0.25;
    const a = this.avatar;
    a.visible = true;
    a.position.set(-5.6, this.interior.floorY, 2.2);
    a.rotation.set(0, this.wardrobeYaw, 0);
    animatePerson(a, dt, { pose: 'idle' });
  }

  /** In the quarters' doorway, looking at you by the locker. */
  wardrobeCamera(c) {
    const k = this.player.obj;
    k.updateMatrixWorld();
    const Y = this.interior.floorY;
    c.position.copy(k.localToWorld(new THREE.Vector3(-3.15, Y + 1.35, 2.2)));
    c.lookAt(k.localToWorld(new THREE.Vector3(-5.6, Y + 1.0, 2.2)));
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
    if (this.cinematics && this.bayFrame()) return;
    if (this.cinematics && this.bay.requested) this.prompt(this.inBayReach() ? 'The bay’s guidance is taking her' : `Fly her to the open bay door, astern: ${Math.round(this.bayDistance())} m`);
    else if (this.cinematics && this.canRequestBay()) this.prompt('Call the Kestrel for the bay');
    else if (!this.cinematics && this.canLand()) this.prompt('Land in the Kestrel’s bay');
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

  /** The Kestrel's turret fires at a world point, from your hands or the gunner's (whose aim wanders by `spread`). */
  fireTurret(aimPoint, spread = 0) {
    const t = this.player.obj.userData.turret;
    const tip = t.pitch.localToWorld(t.tip.clone());
    const dir = aimPoint.clone().sub(tip).normalize();
    if (spread) dir.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(spread)).normalize();
    this.combat.fire('player', tip, dir, { speed: 460, range: 900, damage: this.ship.turretDamage, len: 7, width: 0.45, owner: this.player, color: '#ffe66d', sound: 'turbolaser', camera: this.camera });
  }

  /** Out in the suit: through the visor, or (V) from behind and above you. */
  evaCamera(c) {
    const a = this.avatar;
    if (a?.parent) {
      a.visible = !!this.chase.eva && !this.command.open;
      a.position.copy(this.eva.pos).add(new THREE.Vector3(0, -1.5, 0).applyQuaternion(this.eva.quat));
      a.quaternion.copy(this.eva.quat);
      animatePerson(a, this.lastDt ?? 0.016, { pose: 'float' });
    }
    if (!this.chase.eva) return this.eva.placeCamera(c);
    c.position.copy(this.eva.pos).add(new THREE.Vector3(0.6, 0.8, 4.2).applyQuaternion(this.eva.quat));
    c.quaternion.copy(this.eva.quat);
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
    const w = this.boarding.walker;
    const was = w.pos.clone();
    if (f.keys.has('KeyR')) this.viewmodel?.reload();
    this.boarding.frame(f, dt);
    this.viewmodel?.frame(dt, { moving: was.distanceTo(w.pos) > 1e-3, sprint: f.keys.has('ShiftLeft') || f.keys.has('ShiftRight'), bob: w.bob, lookDx: f.dx, lookDy: f.dy });
    this.moveAvatar(this.boarding.walker, dt, { pose: 'aim' });
    const u = this.boarding.walker.nearestUse();
    if (u?.use === 'seize') this.prompt(this.boarding.ship.captured ? 'Hers. Choose on the panel, then leave by the airlock' : this.boarding.defendersLeft() ? `${this.boarding.defendersLeft()} defenders still up` : 'Hold E: seize the bridge');
    else this.prompt(u ? u.label : null);
    if (this.fighterOut) this.latchFighter(this.boarding.ship);
  }

  dockFrame(f, dt) {
    this.concourseWalker.frame(f, dt);
    this.moveAvatar(this.concourseWalker, dt);
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
      const gunner = this.crewAt('turret') && this.phase !== 'turret' ? (this.wontShoot(e) ? `${this.crewName(this.crewAt('turret'))} has orders to spare her.` : `${this.crewName(this.crewAt('turret'))} is on it.`) : '';
      this.toast(`Target: ${e.name} · ${this.threatOf(e).label}. ${gunner}`, 'warn');
    } else if (this.navCandidates().some((c) => c.e === e)) {
      this.setNav(e);
      const pilot = this.crewName(this.crewAt('helm'));
      const helm = pilot && this.phase !== 'helm' ? `${pilot} is flying it.` : this.phase === 'helm' ? `Fly it, or stand up and ${pilot ?? 'a pilot'} will.` : 'Nobody at the helm.';
      this.toast(`Course: ${e.name}. ${helm}`, 'good');
    }
    this.panel.refresh();
  }

  /** A click on the view with a free cursor: on a mark it selects that thing and is used up (true); anywhere else it
   *  takes the stick, or in the captain's chair starts a drag. */
  press(x, y) {
    if (this.command.open) {
      const e = this.hud.pick(x, y);
      if (!e) return false; // empty space: the drag that orbits the map
      this.command.select(e);
      return true;
    }
    if (!['helm', 'fighter', 'turret', 'eva'].includes(this.phase)) return false;
    const e = this.hud.pick(x, y);
    if (!e || e === 'you') return false;
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

  /** The Wren flies: from the bay's exit, or (`at`, `q`) from wherever the launch animation left her. */
  launch({ at = null, q = null } = {}) {
    if (this.state.wren === 'lost') return this.toast(`The bay is empty: the Wren is wreckage. A shipyard builds another for ${WREN_COST.toLocaleString()} cr.`, 'bad');
    const k = this.player.obj;
    k.updateMatrixWorld();
    const o = this.fighterEnt.obj;
    o.position.copy(at ?? k.localToWorld(k.userData.bayExit.clone()));
    if (q) o.quaternion.copy(q);
    else o.quaternion.copy(k.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.PI));
    this.world.add(this.fighterEnt);
    this.fighterEnt.alive = true;
    this.fighterOut = true;
    this.parkedWren.visible = false;
    this.fighterFlight.throttle = 0.6;
    this.lasers = 100;
    this.target = null;
    this.setPhase('fighter');
    this.toast(this.cinematics ? 'Wren away. Near the Kestrel, E calls for the bay.' : 'Wren away. E astern of the Kestrel lands her.', 'good');
    if (!at) this.sfx.play('boom', 30, 6);
  }

  /** An animation between seats (cinematics.mjs) takes over until it ends in its seat, or E skips to that. */
  play(seq) {
    this.cine = seq;
    this.setPhase('scene');
    this.cine = seq;
    return seq;
  }

  // --- the bay, called for from the Wren (s6) ----------------------------------------------------------------------

  /** The bay's mouth, in the world. */
  bayMouth() {
    const k = this.player.obj;
    k.updateMatrixWorld();
    return k.localToWorld(new THREE.Vector3(0, (BAY_MOUTH.y0 + BAY_MOUTH.y1) / 2, 36));
  }

  bayDistance() {
    return this.fighterEnt.obj.position.distanceTo(this.bayMouth());
  }

  canRequestBay() {
    return this.phase === 'fighter' && !this.hacking && !this.bay.requested && this.player.alive && this.bayDistance() < 1200;
  }

  /** Close enough to the open door, and astern of it, for the bay's guidance to take her. */
  inBayReach() {
    if (!this.bay.requested || this.bay.k < 0.95) return false;
    const k = this.player.obj;
    const local = k.worldToLocal(this.fighterEnt.obj.position.clone());
    return local.z > 35 && this.bayDistance() < 70;
  }

  /** E near the Kestrel: you ask, whoever has the helm answers, the bay vents and its doors part. */
  requestBay() {
    this.bay.requested = true;
    this.bay.far = 0;
    const helm = this.crewAt('helm');
    const who = helm ? this.crewName(helm).toUpperCase() : 'KESTREL';
    this.sfx.cue('chime');
    this.banner('WREN · Kestrel, Wren. Requesting the bay.', 'warn', 1.8);
    this.log('You called the Kestrel for the bay.');
    this.tweens.add('bayCall', 1.8, () => {}, () => {
      if (!this.bay.requested) return;
      this.sfx.cue('chime');
      this.banner(`${who} · Bay's opening, Captain. Bring her to the door, astern of us.`, 'good', 3.2);
      this.bayLamps = true;
      this.interior.alarm('bay', 'red');
      this.sfx.cue('klaxon', { n: 2, vol: 0.5 });
      this.moveBay(1, 3);
    });
  }

  /** The bay's doors to `to` (0 shut, 1 open) over `secs`, from where they stand. */
  moveBay(to, secs) {
    const from = this.bay.k;
    const K = this.player.obj, I = this.interior;
    this.tweens.add('bayDoors', secs, (k) => {
      const v = from + (to - from) * ease(k);
      this.bay.k = v;
      setBayDoor(K, v);
      I.doors.bayUpper.set(v);
      I.doors.bayLower.set(v);
    }, () => I.alarm('bay', to > 0 ? 'vacuum' : null));
  }

  /** The bay closes: you flew off, or left the Wren some other way. `now` skips the doors' travel. */
  shutBay(now = false) {
    this.bay.requested = false;
    this.bayLamps = false;
    this.tweens.list.delete('bayCall');
    if (now) {
      this.tweens.list.delete('bayDoors');
      this.bay.k = 0;
      setBayDoor(this.player.obj, 0);
      this.interior?.doors.bayUpper?.set(0);
      this.interior?.doors.bayLower?.set(0);
      this.interior?.alarm('bay', null);
    } else this.moveBay(0, 2.5);
  }

  /** Each Wren frame with the bay called for: the guidance takes her at the door; far off for long, the bay closes. */
  bayFrame() {
    if (!this.bay.requested) return false;
    if (this.inBayReach()) return !!this.play(landSequence(this));
    if (this.bayDistance() > 1600) {
      this.toast('The bay is closing: call again when you are back.', 'warn');
      this.shutBay();
    }
    return false;
  }

  canLand() {
    if (this.phase !== 'fighter' || this.hacking) return false;
    const k = this.player.obj;
    const p = k.localToWorld(k.userData.bayLand.clone());
    return this.fighterEnt.obj.position.distanceTo(p) < 110;
  }

  /** Down in the bay: on the deck before the pad, or (`at`, `yaw`) wherever the landing animation left you. */
  land({ at = null, yaw = Math.PI } = {}) {
    this.world.remove(this.fighterEnt);
    this.showWren();
    this.fighterOut = false;
    this.parkedWren.visible = true;
    this.fighterEnt.hull = Math.min(this.fighterEnt.hullMax, this.fighterEnt.hull + 10);
    this.setPhase('walk', { at: at ?? this.interior.fighterPad.clone().add(new THREE.Vector3(0, -1.1, -4)), yaw });
    this.pickedUp();
    this.toast('Down in the bay.', 'good');
  }

  showWren() {
    const o = this.fighterEnt.obj;
    o.userData.cockpit = false;
    o.traverse((m) => m.userData.cockpitHidden && (m.visible = true));
  }

  /** The Wren is shot apart. In her, you punch out in your suit where she was; aboard a hull she was latched to, you
   *  are stranded there with no ride. Either way you get yourself back (the suit, or the Kestrel coming for you on the
   *  map's orders), and the bay stays empty until a yard builds another. s3 put you in the medbay for 300 cr wherever
   *  you were, so a raider killing the Wren while you fought aboard the Carrion killed you too (Richard, s4). */
  wrenLost() {
    const o = this.fighterEnt.obj;
    const at = o.position.clone();
    const vel = this.fighterEnt.vel.clone();
    const quat = o.quaternion.clone();
    this.combat.burst(at, 20, { ring: true, shards: 16, camera: this.camera });
    this.world.remove(this.fighterEnt);
    this.showWren();
    this.fighterOut = false;
    this.fighterEnt.alive = false;
    this.state.wren = 'lost';
    this.parkedWren.visible = false;
    if (this.phase === 'fighter') {
      this.setPhase('eva');
      this.eva.pos.copy(at);
      this.eva.vel.copy(vel).multiplyScalar(0.3);
      this.eva.quat.copy(quat);
      this.banner('EJECTED — THE WREN IS GONE', 'bad');
      this.log('The Wren came apart round you and you punched out in your suit. Jet back to the Kestrel’s port airlock, or open the map (Tab) and have her come for you.', 'bad');
    } else if (this.phase === 'board') {
      this.boardedBy = 'eva';
      this.banner('THE WREN IS GONE', 'bad');
      this.log(`The Wren was shot off ${this.boarding.ship.name}'s hull. You are aboard with no ride: leave in your suit, or have the Kestrel come over (Tab).`, 'bad');
    } else this.log('The Wren was destroyed.', 'bad');
    this.log(`A shipyard builds a new Wren for ${WREN_COST.toLocaleString()} cr.`, 'warn');
    this.panel.refresh();
  }

  buyWren() {
    if (this.state.wren !== 'lost' || this.state.credits < WREN_COST) return;
    this.state.credits -= WREN_COST;
    this.state.wren = 'ok';
    const f = this.fighterEnt;
    f.alive = true;
    f.hull = f.hullMax;
    f.shields = f.shieldsMax;
    this.parkedWren.visible = true;
    this.log('A new Wren sits on the pad in the bay.', 'good');
    this.panel.refresh();
  }

  /** The hull you are aboard blows up round you: you are thrown out in your suit. */
  boardedShipLost() {
    const ship = this.boarding.ship;
    this.boarding.exit();
    ship.interior?.dispose();
    ship.interior = null;
    const at = ship.obj.position.clone();
    this.setPhase('eva');
    this.eva.pos.copy(at).add(new THREE.Vector3(0, 30, 0));
    this.eva.vel.set(0, 6, 0);
    this.banner(`${ship.name} BROKE UP ROUND YOU`, 'bad');
    this.log(`${ship.name} blew apart with you aboard. Your suit held.`, 'bad');
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
    // The rifle in your hands, in your sleeves.
    if (!this.viewmodel || this.viewmodel.lookKey !== JSON.stringify(this.look())) {
      this.viewmodel = new Viewmodel({ look: this.look(), magSize: 24 });
      this.viewmodel.lookKey = JSON.stringify(this.look());
    }
    this.viewmodel.ammo = this.viewmodel.magSize;
    this.viewmodel.equip();
    ship.boarded = true;
    ship.vel.set(0, 0, 0);
    ship.interior = capitalInterior(ship.obj, { floorY: -3, len: ship.kind === 'corvette' ? 60 : 50, rook: ship.kind === 'corvette' });
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
    if (this.boardedBy === 'eva' || !this.fighterOut) {
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

  /** She is yours, but nobody is aboard to fly her: she drifts until someone crosses over from the Kestrel in a suit
   *  (`sendCrew`). Richard, s4: a captured ship should not move until a crew member goes over to fly it. */
  keepShip(ship) {
    const id = `fleet-${Date.now()}`;
    const entry = { id, name: ship.kind === 'corvette' ? 'Carrion' : 'Hauler', cls: ship.cls.cls, kind: ship.kind, hull: ship.hull, hullMax: ship.hullMax, job: null, slot: this.state.fleet.length % 2, crew: null, at: this.world.sector.id, pos: ship.obj.position.toArray() };
    this.state.fleet.push(entry);
    ship.fleetId = id;
    ship.kind = 'follower';
    ship.boarded = false;
    ship.slot = entry.slot;
    ship.name = entry.name.toUpperCase() + ' (YOURS)';
    ship.onDamage = (a, at, side, by) => by && (by.hitUsAt = this.clock);
    this.orders.now(id, { move: 'hold' });
    this.log(`${entry.name} is yours, adrift: nobody aboard to fly her. Bring the Kestrel within ${this.TRANSFER_RANGE} m and send someone over in a suit (Fleet tab, or the map).`, 'good');
    this.unboard();
    this.panel.show('fleet');
  }

  /** `id` suits up, goes out of the Kestrel's airlock and burns across to the prize `fleetId`; aboard, she flies her. */
  sendCrew(id, fleetId) {
    const f = this.state.fleet.find((x) => x.id === fleetId);
    const e = this.world.entities.find((x) => x.fleetId === fleetId);
    if (!f || !e || f.crew || this.transfers.some((t) => t.fleetId === fleetId)) return;
    if (e.obj.position.distanceTo(this.player.obj.position) > this.TRANSFER_RANGE) return this.toast(`Too far for a suit: bring the Kestrel within ${this.TRANSFER_RANGE} m of the ${f.name}.`, 'warn');
    const post = this.state.crew[id] ?? 'idle';
    if (post.startsWith('prize') || post === 'transfer') return;
    this.state.crew[id] = 'transfer';
    const k = this.player.obj;
    k.updateMatrixWorld();
    this.startTransfer(id, fleetId, k.localToWorld(k.userData.airlock.clone().add(new THREE.Vector3(-3, 0, 0))), this.player.vel, e, new THREE.Vector3(0, 3, 0));
    this.log(`${this.crewName(id)} suits up and goes out of the airlock for the ${f.name}.`);
    if (post === 'helm' && this.phase !== 'helm') this.log('Nobody has the Kestrel’s helm now.', 'warn');
    this.placeCrew();
    this.panel.refresh();
  }

  /** The prize crew comes home: the prize drifts again. */
  recallCrew(fleetId) {
    const f = this.state.fleet.find((x) => x.id === fleetId);
    const e = this.world.entities.find((x) => x.fleetId === fleetId);
    if (!f?.crew || !e) return;
    if (e.obj.position.distanceTo(this.player.obj.position) > this.TRANSFER_RANGE) return this.toast(`Too far for a suit: bring the Kestrel within ${this.TRANSFER_RANGE} m.`, 'warn');
    const id = f.crew;
    f.crew = null;
    this.state.crew[id] = 'transfer';
    this.orders.now(fleetId, { move: 'hold' });
    e.obj.updateMatrixWorld();
    this.startTransfer(id, null, e.obj.localToWorld(e.obj.userData.airlock.clone().add(new THREE.Vector3(0, 3, 0))), e.vel, this.player, new THREE.Vector3(-3, 0, 0));
    this.log(`${this.crewName(id)} leaves the ${f.name} for the Kestrel.`);
    this.panel.refresh();
  }

  startTransfer(id, fleetId, from, vel, to, into) {
    const c = this.crewInfo(id);
    const mesh = makePerson(c?.look ?? {}, { kind: 'suit' });
    const jet = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#9fd4ff', transparent: true, opacity: 0.8, toneMapped: false }));
    jet.position.set(0, 1.1, 0.45);
    mesh.add(jet);
    mesh.userData.tick = (dt) => {
      jet.scale.setScalar(0.7 + Math.random() * 0.6);
      animatePerson(mesh, dt, { pose: 'float' });
    };
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.transfers.push({ id, fleetId, pos: from.clone(), vel: vel.clone(), to, into, mesh, name: c?.name ?? id });
  }

  transferDone(t, ok) {
    t.mesh.removeFromParent();
    this.transfers.splice(this.transfers.indexOf(t), 1);
    const name = this.crewName(t.id);
    if (t.fleetId) {
      const f = this.state.fleet.find((x) => x.id === t.fleetId);
      if (ok && f) {
        f.crew = t.id;
        this.state.crew[t.id] = `prize:${f.id}`;
        this.orders.now(f.id, { move: 'follow' });
        this.banner(`${name.toUpperCase()} HAS THE ${f.name.toUpperCase()}`, 'good');
        this.log(`${name} is aboard the ${f.name} and answers the helm: she follows the Kestrel. Give her orders on the map (Tab).`, 'good');
      } else {
        this.state.crew[t.id] = 'idle';
        this.log(`${name} found nothing to board and came back.`, 'warn');
      }
    } else {
      this.state.crew[t.id] = 'idle';
      this.log(`${name} is back aboard the Kestrel.`, 'good');
    }
    this.placeCrew();
    this.panel.refresh();
    this.command.render();
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

  /** A step of a plan arrived: say so, and what is next. */
  orderDone(actor, step, next) {
    if (!step || !['goto', 'scoop', 'avoid'].includes(step.move)) return;
    const who = actor === 'kestrel' ? this.crewName(this.crewAt('helm')) ?? 'Kestrel' : this.state.fleet.find((f) => f.id === actor)?.name ?? actor;
    this.toast(`${who}: ${this.orders.label(step).toLowerCase()} — done.${next ? ` Next: ${this.orders.label(next).toLowerCase()}.` : ''}`, 'good');
  }

  /** You are back aboard the Kestrel: a "pick me up" is done. */
  pickedUp() {
    if (this.orders.current('kestrel')?.move === 'pickup') this.orders.advance('kestrel');
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
        if (f?.crew) {
          this.state.crew[f.crew] = 'idle';
          this.log(`${this.crewName(f.crew)} got out in a suit and the Kestrel picked her up, shaken.`, 'warn');
          this.placeCrew();
        }
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
    if (this.transfers.length) return this.toast('Someone is out in a suit: wait for them.', 'warn');
    const to = gate.to;
    this.recordFleet();
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
    this.orders.spared.clear();
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
    // A ship you are paid to take whole is spared by your guns until you say otherwise (Richard, s4: Dag blew the Carrion
    // up before he could board her).
    const capture = this.state.missions.some((m) => m.state === 'active' && m.tpl.kind === 'capture');
    if (capture && this.world.corvette?.alive) {
      this.orders.spared.add(this.world.corvette);
      this.log('Your gunners have orders to spare the Carrion: Concord wants her whole. Change it on the map (Tab).', 'warn');
    }
    this.panel.refresh();
    this.save();
  }

  /** Your fleet in this sector: crewed ships jump with you and arrive on your quarter; a prize nobody is flying stays
   *  where she was left. */
  spawnFollowers() {
    const here = this.world.sector.id;
    for (const f of this.state.fleet) {
      if (f.job) continue;
      if (!f.crew && f.at && f.at !== here) continue;
      if (this.world.entities.some((x) => x.fleetId === f.id)) continue;
      const obj = f.kind === 'corvette' ? M.corvette() : M.freighter();
      const e = new Entity('follower', obj, { side: 'player', hull: f.hull, radius: SHIPS[f.kind].radius, half: SHIPS[f.kind].half, name: `${f.name.toUpperCase()} (YOURS)` });
      e.hullMax = f.hullMax;
      e.cls = SHIPS[f.kind];
      e.fleetId = f.id;
      e.slot = f.slot;
      e.captured = true;
      e.onDamage = (a, at, side, by) => by && (by.hitUsAt = this.clock);
      if (!f.crew && f.pos) obj.position.fromArray(f.pos);
      else {
        obj.position.copy(this.player.obj.position).add(new THREE.Vector3(f.slot ? 120 : -120, -20, 90).applyQuaternion(this.player.obj.quaternion));
        obj.quaternion.copy(this.player.obj.quaternion);
        f.at = here;
      }
      if (!this.orders.current(f.id)) this.orders.now(f.id, { move: f.crew ? 'follow' : 'hold' });
      this.world.add(e);
    }
  }

  /** Where each ship of the fleet is, into the save: an adrift prize is found there again. */
  recordFleet() {
    for (const f of this.state.fleet) {
      const e = this.world.entities.find((x) => x.fleetId === f.id);
      if (!e) continue;
      f.hull = e.hull;
      f.pos = e.obj.position.toArray();
      if (!f.crew) f.at = this.world.sector?.id ?? f.at;
    }
  }

  fleetOrder(id, order, job = null) {
    const f = this.state.fleet.find((x) => x.id === id);
    if (!f) return;
    if (!f.crew) return this.toast(`Nobody aboard the ${f.name} to take orders.`, 'warn');
    if (order === 'follow' || order === 'hold') this.orders.now(id, { move: order });
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
      this.orders.now(f.id, { move: 'follow' });
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
    const wren = this.state.wren === 'lost' ? 0 : Math.round((this.fighterEnt.hullMax - this.fighterEnt.hull) * 2);
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
    this.state.paintChosen = true;
    const u = this.player.obj.userData;
    if (u.repaint) u.repaint(c);
    else u.hullMat.color.set(c);
    this.parkedWren.userData.hullMat.color.set(c);
    this.fighterEnt.obj.userData.hullMat.color.set(c);
    this.panel.refresh();
  }

  setEngine(c) {
    this.state.engine = c;
    this.state.engineChosen = true;
    for (const o of [this.player.obj, this.parkedWren, this.fighterEnt.obj]) M.setEngineColor(o, c);
    this.panel.refresh();
  }

  hire(id) {
    const h = HIRE.find((x) => x.id === id);
    if (!h || this.state.hired.includes(id) || this.state.credits < h.cost) return;
    this.state.credits -= h.cost;
    this.state.hired.push(id);
    this.state.crew[id] = h.post ?? 'idle';
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
    this.recordFleet();
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
    const st = freshState();
    st.look = randomLook();
    this.start(st, { wardrobe: true });
  }

  start(state, { wardrobe = false } = {}) {
    // s3 saves: Moss boarded with you outside the crew list; a crew member mid-suit-crossing is back aboard.
    if (state.hired.includes('moss') && !state.crew.moss) state.crew.moss = 'party';
    for (const h of state.hired) state.crew[h] ??= 'idle';
    for (const [id, post] of Object.entries(state.crew)) if (post === 'transfer' || (post.startsWith('prize:') && !state.fleet.some((f) => f.crew === id))) state.crew[id] = 'idle';
    for (const f of state.fleet) f.crew ??= null;
    this.state = state;
    this.transfers.forEach((t) => t.mesh.removeFromParent());
    this.transfers = [];
    this.orders.plans = {};
    this.command.hide();
    document.getElementById('title').hidden = true;
    this.world.clear();
    this.buildShip();
    this.enterSector(state.sector);
    this.setPhase('walk', { at: this.interior.spawn.clone(), yaw: 0 });
    this.refreshWire();
    if (wardrobe) this.openWardrobe(true);
    else this.banner(`${state.captain.toUpperCase()} · THE KESTREL`, 'good', 4);
    if (!state.log.length) this.log('Haven. The Kestrel is yours, with a debt on her and two crew who stayed. The board on the station has work.');
    this.panel.refresh();
  }

  // --- the loop ------------------------------------------------------------------------------------

  frame() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastT) / 1000); // a slow frame gets up to a tenth of a second, so game time keeps up with the clock down to 10 fps
    this.lastT = now;
    this.realDt = dt;
    const cmd = this.command;
    const paused = cmd.open && cmd.paused; // the map's pause: nothing moves but the map's camera
    this.lastDt = paused ? 0 : dt;
    if (!paused) this.clock += dt;
    if (this.target && (!this.target.alive || this.target.side === 'player')) this.target = null; // dead, or yours now
    const f = this.input.frame();
    if (this.phase !== 'title' && this.phase !== 'dead') {
      if (!paused) {
        this.space.frame(this.camera, dt);
        if (this.phase !== 'dock') {
          this.ai.frame(dt);
          this.ai.crew(dt);
          this.ai.transfers(dt);
          this.engineering(dt);
          this.tractor(dt);
          this.hackFrame(dt);
        }
      }
      // With the map open the seat gets no hands (its ship flies straight on, its walker stands), and only while it runs.
      if (cmd.open) {
        cmd.frame(f, dt);
        if (!paused) this.controller.frame(IDLE, dt);
      } else this.controller.frame(f, dt);
      if (!paused) {
        this.tweens.frame(dt);
        this.world.frame(dt);
        this.combat.frame(dt, this.camera);
        this.wireDeaths();
        this.fleetJobs();
        this.checkMissions();
        if (this.phase === 'board' && !this.boarding.ship.alive) this.boardedShipLost();
        this.underFire = Math.max(0, (this.underFire ?? 0) - dt);
        this.flash = Math.max(0, this.flash - dt * 2.5);
      }
      this.dockPrompt = this.canDock() ? `J — DOCK AT ${this.world.station.station.name.toUpperCase()}` : this.canJump() ? `J — JUMP THE THREAD TO ${SECTORS[this.canJump().to].name.toUpperCase()}` : '';
      if (cmd.open) cmd.placeCamera(this.camera);
      else this.controller.placeCamera(this.camera);
      this.space.follow(this.camera);
      this.panel.tick(dt);
      cmd.tick();
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.bannerEl.hidden = true;
    }
    // Walking inside the Kestrel, the hull shell is not drawn: its boxes overlap, and the inner face of the next box
    // is a front face in your room (ships.mjs, SHELL_LAYER). Every other seat sees the whole ship, and so does the map.
    const inside = !cmd.open;
    this.camera.layers.set(0);
    const scene = this.phase === 'scene' && this.cine;
    const decks = this.phase === 'walk' || this.phase === 'wardrobe' || (scene && this.cine.inside);
    if (!decks || !inside) this.camera.layers.enable(M.SHELL_LAYER);
    // Only the rooms you are in are drawn and lit: the Kestrel's decks are out of sight from every other seat, and aboard
    // another hull her outside is out of sight (its plated metal was shaded and then painted over by the walls). s6: and
    // through her open bay door, from outside: an animation, or the Wren flying up to the door she called open.
    const rooms0 = decks || scene || (this.phase === 'fighter' && this.bay.k > 0);
    if (this.interior) this.interior.group.visible = rooms0 && inside;
    this.bayLampsFrame();
    if (this.visorEl) this.visorEl.classList.toggle('on', !!this.visorOn || (this.phase === 'eva' && !this.chase.eva && inside));
    const aboard = this.phase === 'board' && inside ? this.boarding.ship : null;
    if (this.hullHidden && this.hullHidden !== aboard) this.showHull(this.hullHidden, true);
    if (aboard && this.hullHidden !== aboard) this.showHull(aboard, false);
    if (this.boarding.interior) this.boarding.interior.group.visible = this.phase === 'board' && inside;
    cmd.grid.visible = cmd.open;
    if (inside && !paused) (rooms0 ? this.interior : this.phase === 'dock' ? this.concourse : null)?.tick(dt);
    const rooms = !inside ? [] : rooms0 ? [this.interior] : this.phase === 'board' ? [this.boarding.interior] : this.phase === 'dock' ? [this.concourse] : [];
    this.lightPool.update(this.camera.position, rooms);
    this.adaptResolution(now);
    this.renderer.render(this.scene, this.camera);
    // Your rifle aboard someone else's hull: drawn after the room with the depth cleared, so it never sinks into a wall.
    if (this.phase === 'board' && !this.chase.board && inside && this.viewmodel) {
      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.viewmodel.place(this.camera);
      this.renderer.render(this.viewmodel.scene, this.viewmodel.camera);
      this.renderer.autoClear = true;
    }
    this.hud.draw(this);
    requestAnimationFrame(() => this.frame());
  }

  /** The two lamps beside the bay's mouth flash amber while the bay is called for, venting or moving. */
  bayLampsFrame() {
    const lamps = this.player?.obj.userData.bayLamps;
    if (!lamps) return;
    const on = this.bayLamps && (this.clock * 2.2) % 1 < 0.55;
    if (on === this.bayLampsLit) return;
    this.bayLampsLit = on;
    for (const l of lamps) l.material.color.set(on ? '#ffb347' : '#3a2a14');
  }

  /** Shields come back by whoever is at the engines (a little with nobody), and a good engineer patches the hull out of
   *  a fight, up to 80%: field repairs only go so far. */
  engineering(dt) {
    const eng = this.crewAt('engine');
    const fx = eng ? this.crewEffect(eng, 'engine') : { shields: 2, patch: 0 };
    const k = this.player;
    k.shields = Math.min(k.shieldsMax, k.shields + fx.shields * dt);
    if (fx.patch && (this.underFire ?? 0) <= 0 && k.hull < k.hullMax * 0.8) k.hull = Math.min(k.hullMax * 0.8, k.hull + fx.patch * dt);
  }

  /** Hides (or shows again) everything of a ship but the rooms you are standing in. */
  showHull(ship, show) {
    for (const c of ship.obj.children) if (c !== ship.interior?.group) c.visible = show;
    this.hullHidden = show ? null : ship;
  }

  /** A slow frame rate draws fewer pixels: the pixel ratio steps down by a quarter (not below 1) when the frames run
   *  slower than 40 a second, and back up when they are faster than 57 (but not straight back to a level it just left). */
  adaptResolution(now) {
    const P = this.perf;
    const real = (now - (P.last ?? now)) / 1000;
    P.last = now;
    if (real <= 0 || real > 0.5) return; // a hidden tab, a jump's fade: not a measure of anything
    P.avg += (real - P.avg) * 0.05;
    P.cool -= real;
    if (P.cool > 0) return;
    const r = this.renderer.getPixelRatio();
    if (P.avg > 1 / 40 && r > 1) {
      P.block = { ratio: r, until: this.clock + 30 };
      this.renderer.setPixelRatio(Math.max(1, r - 0.25));
      this.resize();
      P.cool = 2;
    } else if (P.avg < 1 / 57 && r < this.maxPixelRatio && !(P.block && P.block.ratio === r + 0.25 && this.clock < P.block.until)) {
      this.renderer.setPixelRatio(Math.min(this.maxPixelRatio, r + 0.25));
      this.resize();
      P.cool = 6;
    } else P.cool = 1;
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
      map: this.command.open,
      paused: this.command.open && this.command.paused,
      plan: this.orders.plan('kestrel').steps.map((st) => this.orders.label(st)),
      fire: this.orders.plan('kestrel').fire,
      helmStatus: this.helmStatus ?? null,
      wren: this.state?.wren ?? null,
      cine: this.cine ? { name: this.cine.name, t: Math.round(this.cine.t * 10) / 10, length: this.cine.length, inside: this.cine.inside } : null,
      bay: { requested: this.bay.requested, k: Math.round(this.bay.k * 100) / 100 },
      crew: this.state?.crew,
      fleetCrew: this.state?.fleet.map((x) => x.crew),
      transfers: this.transfers.length,
      look: this.state?.look ?? null,
      third: { ...this.chase },
      bolts: this.combat.bolts.length,
      pointLights: (() => { let n = 0; this.scene.traverse((o) => o.isPointLight && o.visible && n++); return n; })(),
      pixelRatio: this.renderer.getPixelRatio()
    };
  }
}
