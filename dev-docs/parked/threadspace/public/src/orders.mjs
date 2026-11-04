// Orders: what each of your ships is doing and when she shoots. An actor (the Kestrel, or a ship of your fleet) has a
// plan: a list of steps done in turn, each a move ("fly to Haven and dock", "attack the Carrion", "hold") with an
// optional weapons stance that holds from that step on ("hold fire", "fire on her only"). The first step is the one
// being flown; a step that arrives is dropped and the next one starts. A plan that runs out holds position.
//
// The command map (command.mjs) writes plans; the crew AI (ai.mjs) flies them through `drive` and shoots through
// `prey`. Nothing here draws anything.

import * as THREE from 'three';

export const MOVES = {
  goto: { label: 'Fly to', done: 'arrive' },
  dock: { label: 'Fly to and dock', done: 'arrive' },
  jump: { label: 'Fly to and jump', done: 'arrive' },
  scoop: { label: 'Fly to and scoop', done: 'arrive' },
  attack: { label: 'Attack', done: 'dead' },
  avoid: { label: 'Keep away from', done: 'clear' },
  pickup: { label: 'Come and pick me up', done: 'arrive' },
  follow: { label: 'Follow the Kestrel', done: 'never' },
  hold: { label: 'Hold position', done: 'never' }
};
export const FIRE = {
  free: { label: 'Fire at will', short: 'FIRE AT WILL', blurb: 'your target first, else the nearest threat' },
  return: { label: 'Return fire', short: 'RETURN FIRE', blurb: 'only at ships that shot at her in the last 10 s' },
  focus: { label: 'Fire on her only', short: 'FOCUS', blurb: 'only at the step’s target' },
  hold: { label: 'Hold fire', short: 'HOLD FIRE', blurb: 'not a shot' }
};
const ATTACK_RANGE = [250, 480]; // the Kestrel's turret reaches 800 m; she works in close enough to hit
const _v = new THREE.Vector3();
const _away = new THREE.Vector3();

export class Orders {
  constructor(game) {
    this.game = game;
    this.plans = {};
    this.spared = new Set(); // hulls none of your guns fires on, whatever the stance
  }

  plan(actor) {
    return (this.plans[actor] ??= { steps: [], fire: 'free', focus: null, began: null });
  }

  current(actor) {
    return this.plan(actor).steps[0] ?? null;
  }

  /** Replaces the plan with this one step. */
  now(actor, step) {
    const p = this.plan(actor);
    p.steps = [step];
    this.begin(actor);
  }

  /** Adds a step after the last. */
  then(actor, step) {
    const p = this.plan(actor);
    p.steps.push(step);
    if (p.steps.length === 1) this.begin(actor);
  }

  remove(actor, i) {
    const p = this.plan(actor);
    p.steps.splice(i, 1);
    if (i === 0) this.begin(actor);
  }

  clear(actor) {
    this.plan(actor).steps = [];
  }

  /** Sets the stance without touching the moves. */
  stance(actor, fire, focus = null) {
    const p = this.plan(actor);
    p.fire = fire;
    p.focus = fire === 'focus' ? focus : null;
  }

  /** The first step starts: its stance (if it has one) takes over from here. */
  begin(actor) {
    const p = this.plan(actor);
    const s = p.steps[0];
    p.began = s ?? null;
    if (s?.fire) this.stance(actor, s.fire, s.target);
    else if (s?.move === 'attack') this.stance(actor, 'focus', s.target);
  }

  advance(actor) {
    const p = this.plan(actor);
    const done = p.steps.shift();
    this.begin(actor);
    this.game.orderDone?.(actor, done, p.steps[0] ?? null);
  }

  /** Every step that points at a thing that is gone is dropped (a sector change, a kill). */
  prune(actor) {
    const p = this.plan(actor);
    const before = p.steps[0];
    p.steps = p.steps.filter((s) => !s.target || s.target === 'you' || (s.target.alive !== false && this.game.world.entities.includes(s.target)));
    if (p.steps[0] !== before) this.begin(actor);
    if (p.focus && (!p.focus.alive || !this.game.world.entities.includes(p.focus))) p.focus = null;
  }

  label(step) {
    if (!step) return 'Hold position';
    const g = this.game;
    const name = step.target === 'you' ? 'you' : step.target ? niceName(step.target) : '';
    const m = MOVES[step.move]?.label ?? step.move;
    const words = step.move === 'pickup' ? m : step.move === 'hold' || step.move === 'follow' ? m : `${m} ${name}`;
    return step.fire ? `${words} · ${FIRE[step.fire].label.toLowerCase()}` : words;
  }

  fireLabel(actor) {
    const p = this.plan(actor);
    return p.fire === 'focus' && p.focus ? `fire on ${niceName(p.focus)} only` : FIRE[p.fire].label.toLowerCase();
  }

  // --- flying a plan ---------------------------------------------------------------------------

  /** Where a step's target is now, and how far short of it to stop. `you` is wherever the captain is. */
  where(step, ent) {
    const g = this.game;
    if (step.target === 'you') {
      const you = g.youAt();
      const stop = g.phase === 'eva' ? 26 : g.phase === 'board' ? g.navStop(g.boarding.ship) : 70;
      return { point: you, stop };
    }
    const e = step.target;
    if (step.move === 'dock' || (e.kind === 'station' && step.move === 'goto')) return { point: e.obj.localToWorld(e.obj.userData.dock.clone()), stop: g.navStop(e) };
    return { point: e.obj.position, stop: step.move === 'scoop' ? 8 : g.navStop(e) };
  }

  /** One frame of a plan flown by `flight` (the Kestrel's or a fleet ship's), at the pilot's `skill` (0–1). */
  drive(actor, ent, flight, dt, skill = 0.5, { slot = null } = {}) {
    this.prune(actor);
    const step = this.current(actor);
    const turnK = 0.5 + skill * 0.6;
    const brake = 2.5 + skill * 5.5;
    const g = this.game;
    if (!step || step.move === 'hold') return flight.hold(dt), 'holding';
    if (step.move === 'follow') {
      if (!slot) return flight.hold(dt), 'holding';
      flight.toward(slot, dt, { stop: 20, brake: 3, turnK });
      return 'following';
    }
    if (step.move === 'attack') {
      const e = step.target;
      const d = e.obj.position.distanceTo(ent.obj.position);
      if (d > ATTACK_RANGE[1]) flight.toward(e.obj.position, dt, { stop: ATTACK_RANGE[1] - 40, brake, turnK });
      else if (d < ATTACK_RANGE[0]) flight.toward(_away.copy(ent.obj.position).sub(e.obj.position).setLength(400).add(ent.obj.position), dt, { stop: 0, brake, turnK });
      else flight.hold(dt);
      return `attacking ${niceName(e)}`;
    }
    if (step.move === 'avoid') {
      const e = step.target;
      _away.copy(ent.obj.position).sub(e.obj.position);
      const d = _away.length();
      if (d > 1150) return this.advance(actor), 'clear';
      flight.toward(_v.copy(e.obj.position).addScaledVector(_away.normalize(), 1250), dt, { stop: 0, brake, turnK });
      return `keeping away from ${niceName(e)}`;
    }
    const { point, stop } = this.where(step, ent);
    const d = flight.toward(point, dt, { stop, brake, turnK });
    if (d > stop + 30) return `${MOVES[step.move].label.toLowerCase()} ${step.target === 'you' ? 'you' : niceName(step.target)} · ${fmtD(d)}`;
    // Arrived. Docking and jumping need the captain aboard and the Wren in her bay.
    if (step.move === 'dock' && actor === 'kestrel') {
      if (!g.aboardKestrel()) return 'at the dock · waiting for the captain';
      if (g.canDock()) {
        this.advance(actor);
        g.dock();
        return 'docking';
      }
      return 'at the dock · slowing';
    }
    if (step.move === 'jump' && actor === 'kestrel') {
      if (!g.aboardKestrel()) return 'at the gate · waiting for the captain';
      const gate = g.canJump();
      if (gate) {
        this.advance(actor);
        g.jump(gate);
        return 'jumping';
      }
      return 'at the gate';
    }
    if (step.move === 'pickup') return 'beside you · come aboard';
    this.advance(actor);
    return 'arrived';
  }

  /** What `ent`'s guns should shoot now, under `actor`'s stance: never a spared hull, never the hull you are boarding. */
  prey(actor, ent, range, { prefer = null } = {}) {
    const g = this.game;
    const p = this.plan(actor);
    if (p.fire === 'hold') return null;
    const ok = (e) => e?.alive && e.hittable && g.hostile('player', e.side) && !g.wontShoot(e) && e.obj.position.distanceTo(ent.obj.position) < range;
    if (p.fire === 'focus') return ok(p.focus) ? p.focus : null;
    const recent = (e) => p.fire !== 'return' || (e.hitUsAt ?? -99) > g.clock - 10;
    if (prefer && ok(prefer) && recent(prefer)) return prefer;
    let best = null, bd = Infinity;
    for (const e of g.world.entities) {
      if (!ok(e) || !recent(e)) continue;
      const d = e.obj.position.distanceToSquared(ent.obj.position);
      if (d < bd) (bd = d), (best = e);
    }
    return best;
  }
}

export function niceName(e) {
  return (e.name ?? e.kind).replace(' (YOURS)', '').replace(' (DERELICT)', '').toLowerCase().replace(/(^|[\s→-])\S/g, (c) => c.toUpperCase());
}

function fmtD(d) {
  return d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
}
