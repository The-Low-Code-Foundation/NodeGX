// The command map: Tab from anywhere pauses the game and lifts the camera over the sector. Every contact wears its
// name, a stalk down to the plane and, for a hostile you pick, the reach of its guns; your ships wear their plans.
// Click a contact and a card asks "What will Vex do?": pick who (the Kestrel, or a crewed ship of your fleet), a move
// (fly to, dock, jump, attack, keep away, pick me up…), a stance for that step (fire at will, return fire, hold fire,
// fire on her only), then do it now or add it after what she is already doing. P runs the game with the map open;
// Tab, Esc or E closes it, and you are back exactly where you were. The captain's chair opens it running.
//
// The card is DOM over the game's state and verbs, like the panel: the NodeGX side of the seam.

import * as THREE from 'three';
import { clamp, el } from './util.mjs';
import { MOVES, FIRE, niceName } from './orders.mjs';

const RINGS = [250, 500, 1000, 1500, 2000, 3000];

export class Command {
  constructor(game) {
    this.game = game;
    this.open = false;
    this.paused = false;
    this.yaw = 0.5;
    this.pitch = 0.95;
    this.dist = 1600;
    this.center = new THREE.Vector3();
    this.panned = false; // once you pan, the map stops following the Kestrel
    this.sel = null;
    this.actor = 'kestrel';
    this.verb = null;
    this.fire = null;
    this.card = document.getElementById('cmdcard');
    this.grid = makeGrid();
    game.scene.add(this.grid);
  }

  /** Opens the map: paused (Tab) or running (the captain's chair). */
  show({ paused = true } = {}) {
    const g = this.game;
    this.open = true;
    this.paused = paused;
    if (!this.panned) this.center.copy(g.youAt());
    g.input.unlock();
    g.input.lockAllowed = false;
    this.render();
    g.panel.refresh();
  }

  hide() {
    const g = this.game;
    this.open = false;
    this.paused = false;
    this.panned = false;
    this.card.hidden = true;
    g.input.lockAllowed = !['title', 'tactical', 'wardrobe'].includes(g.phase);
    if (g.player) g.panel.refresh();
  }

  togglePause() {
    if (!this.open) return this.show({ paused: true });
    this.paused = !this.paused;
    this.render();
  }

  frame(f, dt) {
    if (f.trigger && (f.dx || f.dy)) {
      this.yaw -= f.dx * 0.005;
      this.pitch = clamp(this.pitch + f.dy * 0.005, 0.15, 1.5);
    }
    if (f.wheel) this.dist = clamp(this.dist * (1 + f.wheel * 0.14), 120, 9000);
    // W A S D pan across the plane, at a speed that scales with the zoom.
    const k = f.keys;
    const px = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const pz = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
    const real = Math.min(0.05, this.game.realDt ?? dt);
    if (px || pz) {
      this.panned = true;
      const s = this.dist * 0.9 * real;
      this.center.x += (Math.cos(this.yaw) * px + Math.sin(this.yaw) * pz) * s;
      this.center.z += (-Math.sin(this.yaw) * px + Math.cos(this.yaw) * pz) * s;
    } else if (!this.panned) this.center.lerp(this.game.youAt(), 1 - Math.exp(-real * 6));
    this.grid.position.set(this.center.x, this.game.player.obj.position.y, this.center.z);
    this.grid.scale.setScalar(1);
  }

  placeCamera(camera) {
    const off = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)).multiplyScalar(this.dist);
    camera.position.copy(this.center).add(off);
    camera.lookAt(this.center);
  }

  /** The plane the stalks stand on: the Kestrel's height. */
  planeY() {
    return this.game.player.obj.position.y;
  }

  /** A click on the map: a contact opens its card (null closes it back to the actor's own orders). */
  select(e) {
    this.sel = e;
    this.verb = null;
    this.fire = null;
    const g = this.game;
    // A ship of yours with someone aboard is an actor: picking her gives her the orders.
    if (e && e.kind === 'follower' && this.crewed(e)) this.actor = e.fleetId;
    if (e === g.player) (this.actor = 'kestrel'), (this.sel = null);
    if (e && e.fleetId && e.fleetId === this.actor) this.sel = null; // the ship giving the orders: her own menu
    this.render();
  }

  crewed(e) {
    return !!this.game.state.fleet.find((f) => f.id === e.fleetId)?.crew;
  }

  /** Who can take orders: the Kestrel (if anyone has the helm or turret) and every crewed ship of the fleet. */
  actors() {
    const g = this.game;
    const list = [{ id: 'kestrel', name: 'Kestrel', who: g.crewName(g.crewAt('helm')) ?? null, ent: g.player }];
    for (const f of g.state.fleet) {
      const e = g.world.entities.find((x) => x.fleetId === f.id);
      if (e && f.crew) list.push({ id: f.id, name: f.name, who: g.crewName(f.crew), ent: e });
    }
    return list;
  }

  actorEnt(id = this.actor) {
    return this.actors().find((a) => a.id === id)?.ent ?? this.game.player;
  }

  /** The moves `actor` can make on the selected thing, each with why not when it can't. */
  verbs() {
    const g = this.game;
    const e = this.sel;
    const kestrel = this.actor === 'kestrel';
    const out = [];
    const add = (move, label, why = null, extra = {}) => out.push({ move, label: label ?? MOVES[move].label, why, ...extra });
    if (!e) {
      add('hold');
      if (kestrel) add('pickup', g.aboardKestrel() ? 'Come and pick me up' : 'Come and pick me up', g.aboardKestrel() ? 'You are aboard her.' : null);
      else add('follow');
      return out;
    }
    if (e === 'you') {
      add('pickup', 'Come and pick me up', kestrel && g.aboardKestrel() ? 'You are aboard her.' : null);
      return out;
    }
    const hostile = g.hostile('player', e.side) && e.hittable;
    if (e.kind === 'station') {
      add('goto');
      if (kestrel) add('dock', null, g.fighterOut ? 'Land the Wren first.' : null);
    } else if (e.kind === 'gate') {
      add('goto');
      if (kestrel) add('jump', `Fly to and jump → ${e.to ? capital(e.to) : ''}`, g.fighterOut ? 'Land the Wren first.' : null);
    } else if (e.kind === 'pod') {
      add('scoop', null, e.pod?.core ? 'The core needs hands: a space walk.' : null);
    } else if (hostile) {
      add('attack');
      add('avoid');
      add('goto', 'Fly to her (no shooting)', null, { fire: 'hold' });
    } else if (e === g.fighterEnt) {
      add('pickup', 'Come and pick me up', g.phase !== 'fighter' ? 'You are not in her.' : null);
    } else {
      add('goto');
      if (e.kind === 'follower' && !kestrel) add('hold');
    }
    return out;
  }

  /** The step the card would send now. */
  step(v) {
    const e = this.sel;
    const target = v.move === 'pickup' ? 'you' : v.move === 'hold' || v.move === 'follow' ? null : e;
    return { move: v.move, target, fire: this.fire ?? v.fire ?? null };
  }

  send(v, then) {
    const g = this.game;
    const s = this.step(v);
    if (then) g.orders.then(this.actor, s);
    else g.orders.now(this.actor, s);
    const who = this.actorName();
    g.toast(`${who}: ${then ? 'then ' : ''}${g.orders.label(s).toLowerCase()}.`, 'good');
    if (this.actor === 'kestrel' && !g.crewAt('helm') && s.move !== 'hold') g.toast('Nobody has the Kestrel’s helm: seat someone there (Crew).', 'warn');
    this.verb = null;
    this.fire = null;
    this.render();
    g.panel.refresh();
  }

  actorName(id = this.actor) {
    const a = this.actors().find((x) => x.id === id);
    if (!a) return 'Kestrel';
    return a.who ? `${a.who} (${a.name})` : a.name;
  }

  /** Rebuilds the card. Called on every change and twice a second while open. */
  render() {
    const g = this.game;
    const c = this.card;
    if (!this.open) return (c.hidden = true);
    c.hidden = false;
    if (!this.actors().some((a) => a.id === this.actor)) this.actor = 'kestrel';
    const e = this.sel && this.sel !== 'you' && (this.sel.alive === false || !g.world.entities.includes(this.sel)) ? null : this.sel;
    this.sel = e;
    const actor = this.actors().find((a) => a.id === this.actor);
    const who = actor.who ?? actor.name;
    const ent = actor.ent;
    const dist = e && e !== 'you' ? e.obj.position.distanceTo(ent.obj.position) : null;
    const hostile = e && e !== 'you' && g.hostile('player', e.side) && e.hittable;
    const head = e === 'you' ? 'YOU' : e ? niceName(e).toUpperCase() : 'NO CONTACT PICKED';
    const sub = e === 'you' ? 'where you are' : e ? [dist != null ? fmtD(dist) + ' from ' + actor.name : null, hostile ? g.threatOf(e).label : e.side === 'player' ? 'yours' : e.side && e.side !== 'none' ? e.side : null, hostile && g.wontShoot(e) ? 'SPARED' : null].filter(Boolean).join(' · ') : `${actor.name}: her own orders — or click a contact on the map`;
    const plan = g.orders.plan(this.actor);
    const verbs = this.verbs();
    const pick = verbs.find((v) => v.move === this.verb && !v.why);
    const prize = e && e.kind === 'follower' ? g.state.fleet.find((f) => f.id === e.fleetId) : null;
    // replaceChildren writes a null out as the word "null": the optional rows go through a filter.
    c.replaceChildren(...[
      el('div', { class: 'cc-head' },
        el('div', {}, el('b', {}, head), el('div', { class: 'cc-sub' }, sub)),
        el('div', { class: 'cc-time' }, el('button', { class: `small ${this.paused ? 'primary' : ''}`, onclick: () => this.togglePause() }, this.paused ? '▶ Run (P)' : '❚❚ Pause (P)'), el('button', { class: 'small', title: 'Back to where you were (Tab)', onclick: () => g.closeCommand() }, '✕'))
      ),
      el('div', { class: 'cc-actors' }, ...this.actors().map((a) => el('button', { class: `small ${a.id === this.actor ? 'primary' : ''}`, onclick: () => ((this.actor = a.id), (this.verb = null), this.render()) }, a.who ? `${a.name} · ${a.who}` : `${a.name} · no pilot`))),
      el('div', { class: 'cc-ask' }, `What will ${who.toUpperCase()} do?`),
      el('div', { class: 'cc-verbs' },
        ...verbs.map((v, i) => el('button', { class: `cc-verb ${this.verb === v.move ? 'on' : ''}`, disabled: !!v.why, title: v.why ?? '', onclick: () => ((this.verb = v.move), (this.fire = v.fire ?? null), this.render()) }, el('span', { class: 'cc-cur' }, this.verb === v.move ? '▶' : ''), v.label, v.why ? el('i', {}, v.why) : null))
      ),
      el('div', { class: 'cc-row' }, el('span', { class: 'cc-lbl' }, 'Weapons'),
        el('button', { class: `small ${this.fire === null ? 'primary' : ''}`, onclick: () => ((this.fire = null), this.render()) }, `keep (${g.orders.fireLabel(this.actor)})`),
        ...['free', 'return', 'hold'].concat(hostile ? ['focus'] : []).map((k) => el('button', { class: `small ${this.fire === k ? 'primary' : ''}`, title: FIRE[k].blurb, onclick: () => ((this.fire = k), this.render()) }, FIRE[k].label))
      ),
      el('div', { class: 'cc-row' },
        el('button', { class: 'primary', disabled: !pick && !(this.fire && !this.verb), onclick: () => (pick ? this.send(pick, false) : this.setStance()) }, pick ? '▶ Do it now' : this.fire ? '▶ Set the stance' : '▶ Do it now'),
        el('button', { disabled: !pick, onclick: () => this.send(pick, true) }, '+ Then, after that'),
        hostile ? el('button', { class: 'small', onclick: () => this.toggleSpare(e) }, g.orders.spared.has(e) ? 'Stop sparing her' : 'Spare her (no gun fires on her)') : null,
        hostile ? el('button', { class: 'small', onclick: () => g.select(e) }, 'Make her my target') : null
      ),
      prize && !prize.crew ? this.prizeRow(prize, e) : null,
      el('div', { class: 'cc-plan' },
        el('div', { class: 'cc-lbl' }, `${actor.name}'s plan · weapons: ${g.orders.fireLabel(this.actor)}`),
        (this.nowEl = el('div', { class: 'cc-now' }, this.nowText())),
        ...plan.steps.map((s, i) => el('div', { class: `cc-step ${i === 0 ? 'on' : ''}` }, el('span', {}, `${i + 1}. ${g.orders.label(s)}`), el('button', { class: 'small', title: 'Drop this step', onclick: () => (g.orders.remove(this.actor, i), this.render()) }, '✕'))),
        !plan.steps.length ? el('div', { class: 'cc-step' }, 'Nothing planned: holding position.') : el('button', { class: 'small', onclick: () => (g.orders.clear(this.actor), this.render()) }, 'Clear the plan')
      )
    ].filter(Boolean));
  }

  nowText() {
    const ent = this.actorEnt();
    return `now: ${this.actor === 'kestrel' ? this.game.helmStatus ?? 'holding' : ent.status ?? 'holding'}`;
  }

  /** The live line only: a full rebuild under the cursor would eat a click. */
  tick() {
    if (this.open && this.nowEl) this.nowEl.textContent = this.nowText();
  }

  setStance() {
    const g = this.game;
    g.orders.stance(this.actor, this.fire, this.sel && this.sel !== 'you' ? this.sel : null);
    g.toast(`${this.actorName()}: ${g.orders.fireLabel(this.actor)}.`, 'good');
    this.fire = null;
    this.render();
  }

  toggleSpare(e) {
    const g = this.game;
    if (g.orders.spared.has(e)) g.orders.spared.delete(e);
    else g.orders.spared.add(e);
    g.toast(g.orders.spared.has(e) ? `No gun of yours fires on ${niceName(e)}.` : `${niceName(e)} is fair game again.`, 'warn');
    this.render();
  }

  /** A prize nobody is flying: send someone over from the Kestrel, if she is close enough for a suit. */
  prizeRow(f, e) {
    const g = this.game;
    const d = e.obj.position.distanceTo(g.player.obj.position);
    const near = d < g.TRANSFER_RANGE;
    const free = g.roster().filter((c) => !String(g.state.crew[c.id] ?? '').startsWith('prize') && !g.transfers.some((t) => t.id === c.id));
    return el('div', { class: 'cc-row cc-prize' },
      el('span', { class: 'cc-lbl' }, g.transfers.some((t) => t.fleetId === f.id) ? 'On the way over' : 'Nobody aboard: send'),
      ...free.map((c) => el('button', { class: 'small', disabled: !near, title: `${c.name}: piloting ${c.stats.pilot}, gunnery ${c.stats.gunnery}`, onclick: () => (g.sendCrew(c.id, f.id), this.render()) }, `${c.name} (pilot ${c.stats.pilot})`)),
      near ? null : el('i', {}, `Bring the Kestrel within ${g.TRANSFER_RANGE} m (now ${fmtD(d)}): Kestrel → Fly to her.`)
    );
  }
}

/** Rings on the plane round the map's centre, every few hundred metres, and a cross. */
function makeGrid() {
  const g = new THREE.Group();
  const m = new THREE.LineBasicMaterial({ color: '#2f5878', transparent: true, opacity: 0.55, depthWrite: false });
  for (const r of RINGS) {
    const pts = [];
    for (let i = 0; i <= 96; i++) pts.push(new THREE.Vector3(Math.cos((i / 96) * Math.PI * 2) * r, 0, Math.sin((i / 96) * Math.PI * 2) * r));
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m));
  }
  const cross = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cross.push(new THREE.Vector3(Math.cos(a) * 250, 0, Math.sin(a) * 250), new THREE.Vector3(Math.cos(a) * 3000, 0, Math.sin(a) * 3000));
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cross), m));
  g.visible = false;
  g.renderOrder = -1;
  return g;
}

function capital(id) {
  return id === 'haven' ? 'Haven' : id === 'drift' ? 'the Drift' : id === 'cinder' ? 'Cinder Reach' : id;
}

export function fmtD(d) {
  return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
}
