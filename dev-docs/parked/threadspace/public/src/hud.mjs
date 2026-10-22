// The HUD: a 2D canvas over the view. Brackets on hostiles (with their hull, shields and how dangerous they are),
// diamonds on places, a lead point on the target, bars for what you are in, air for a space walk, health for a
// boarding. The canvas takes no events; `pick` answers which mark a click on the view landed on.

import * as THREE from 'three';
import { clamp, fmtTime } from './util.mjs';
import { FACTIONS } from './data.mjs';
import { O2_SECONDS } from './controllers/eva.mjs';

const C = { green: '#39d27a', amber: '#ffb347', blue: '#58b0ff', red: '#ff5540', purple: '#b48cff', dim: '#8a93a3', white: '#e6e9ee', panel: 'rgba(14,16,19,0.8)' };
const _v = new THREE.Vector3();

export class Hud {
  constructor(canvas) {
    this.canvas = canvas;
    this.marks = [];
  }

  /** The thing whose mark is under (x, y) in the view's pixels, from the last frame drawn, or null. */
  pick(x, y) {
    let best = null, bd = Infinity;
    for (const m of this.marks) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < Math.max(m.r, 22) && d < bd) (bd = d), (best = m.e);
    }
    return best;
  }

  draw(game) {
    const hud = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = hud.clientWidth, H = hud.clientHeight;
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
    this.g = g;
    this.W = W;
    this.H = H;
    this.marks = [];
    const p = game.phase;
    if (game.flash > 0) {
      g.fillStyle = `rgba(255,50,24,${(game.flash * 0.4).toFixed(3)})`;
      g.fillRect(0, 0, W, H);
    }
    if (p === 'walk' || p === 'dock') this.dot();
    else if (p === 'board') this.boarding(game);
    else if (p === 'helm' || p === 'fighter' || p === 'turret' || p === 'eva' || p === 'tactical') this.space(game);
    if (p === 'jump') return;
    if (game.hacking) this.progress(game.hacking.k, 'HACKING THE AIRLOCK', C.amber);
  }

  dot() {
    const { g, W, H } = this;
    g.fillStyle = 'rgba(230,233,238,0.8)';
    g.fillRect(W / 2 - 1.5, H / 2 - 1.5, 3, 3);
  }

  progress(k, label, color) {
    const { g, W, H } = this;
    const w = 220, x = W / 2 - w / 2, y = H * 0.62;
    g.fillStyle = C.panel;
    g.fillRect(x - 10, y - 22, w + 20, 44);
    g.fillStyle = '#161a20';
    g.fillRect(x, y, w, 8);
    g.fillStyle = color;
    g.fillRect(x, y, w * clamp(k, 0, 1), 8);
    g.textAlign = 'center';
    g.fillText(label, W / 2, y - 10);
  }

  bar(x, y, w, h, k, color, label, value) {
    const g = this.g;
    g.fillStyle = '#161a20';
    g.fillRect(x, y, w, h);
    g.fillStyle = color;
    g.fillRect(x, y, w * clamp(k, 0, 1), h);
    g.strokeStyle = '#3a424c';
    g.strokeRect(x + 0.5, y + 0.5, w, h);
    g.fillStyle = C.dim;
    g.textAlign = 'left';
    g.fillText(label, x, y - 9);
    g.textAlign = 'right';
    g.fillStyle = color;
    g.fillText(value, x + w, y - 9);
  }

  /** Projects a world point; returns {x, y, ahead} or an edge point when it is behind or outside. */
  project(game, world) {
    const { W, H } = this;
    _v.copy(world).project(game.camera);
    const ahead = _v.z < 1 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1;
    if (ahead) return { x: ((_v.x + 1) / 2) * W, y: ((1 - _v.y) / 2) * H, ahead };
    // Behind or off the side: a point on an ellipse at the edge, in the direction it lies.
    let ax = _v.x, ay = _v.y;
    if (_v.z > 1) (ax = -ax), (ay = -ay);
    const a = Math.atan2(-ay, ax);
    return { x: W / 2 + Math.cos(a) * W * 0.44, y: H / 2 + Math.sin(a) * H * 0.42, ahead: false, angle: a };
  }

  diamond(x, y, s, color, fill = false) {
    const g = this.g;
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, y - s);
    g.lineTo(x + s, y);
    g.lineTo(x, y + s);
    g.lineTo(x - s, y);
    g.closePath();
    if (fill) g.fill();
    else g.stroke();
  }

  bracket(x, y, s, color) {
    const g = this.g;
    const c = s * 0.45;
    g.strokeStyle = color;
    g.lineWidth = 1.5;
    g.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      g.moveTo(x + sx * s, y + sy * (s - c));
      g.lineTo(x + sx * s, y + sy * s);
      g.lineTo(x + sx * (s - c), y + sy * s);
    }
    g.stroke();
  }

  mini(x, y, w, k, color) {
    const g = this.g;
    g.fillStyle = 'rgba(10,12,16,0.7)';
    g.fillRect(x, y, w, 3);
    g.fillStyle = color;
    g.fillRect(x, y, w * clamp(k, 0, 1), 3);
  }

  arrow(x, y, a, color) {
    const g = this.g;
    g.fillStyle = color;
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
  }

  label(x, y, text, color, align = 'left') {
    const g = this.g;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(text, x, y);
  }

  space(game) {
    const { g, W, H } = this;
    const body = game.playerBody();
    const eye = game.camera.position;
    const phase = game.phase;
    // Marks on everything that matters, nearest last so its label wins.
    const marks = [];
    for (const e of game.world.entities) {
      if (!e.alive || e === body) continue;
      if (phase !== 'fighter' && e === game.fighterEnt && !game.fighterOut) continue;
      const d = e.obj.position.distanceTo(eye);
      let color = C.dim, kind = 'dot';
      if (e.kind === 'station') (color = C.blue), (kind = 'diamond');
      else if (e.kind === 'gate') (color = C.purple), (kind = 'diamond');
      else if (e.kind === 'pod') (color = C.amber), (kind = 'small');
      else if (e.kind === 'derelict') (color = C.dim), (kind = 'diamond');
      else if (game.hostile('player', e.side)) (color = C.red), (kind = 'bracket');
      else if (e.side === 'player') (color = C.green), (kind = 'bracket');
      else (color = FACTIONS[e.side]?.color ?? C.dim), (kind = 'bracket');
      if (kind === 'small' && d > 1500) continue;
      marks.push({ e, d, color, kind });
    }
    marks.sort((a, b) => b.d - a.d);
    for (const m of marks) {
      const p = this.project(game, m.e.obj.position);
      const isNav = game.nav === m.e;
      const isTarget = game.target === m.e;
      const isMission = game.missionTargets().includes(m.e);
      const s = m.kind === 'small' ? 5 : clamp(6000 / Math.max(m.d, 1), 10, 40) / 2 + 6;
      if (!p.ahead) {
        if (isNav || isTarget || isMission || (m.kind === 'bracket' && m.color === C.red && m.d < 900)) {
          this.arrow(p.x, p.y, p.angle, isNav ? C.green : m.color);
          this.label(clamp(p.x, 70, W - 70), p.y + (p.y < H / 2 ? 16 : -16), `${isNav ? 'NAV ' : ''}${m.e.name} ${Math.round(m.d)} m`, isNav ? C.green : m.color, 'center');
        }
        continue;
      }
      this.marks.push({ e: m.e, x: p.x, y: p.y, r: s + 8 });
      if (m.kind === 'bracket') this.bracket(p.x, p.y, s, m.color);
      else if (m.kind === 'diamond') this.diamond(p.x, p.y, s, m.color);
      else this.diamond(p.x, p.y, 4, m.color, true);
      if (isNav) {
        this.diamond(p.x, p.y, s + 8, C.green);
        this.label(p.x, p.y - s - 16, 'NAV', C.green, 'center');
      }
      if (isMission) this.label(p.x, p.y + s + 24, 'MISSION', C.green, 'center');
      if (isTarget) {
        this.bracket(p.x, p.y, s + 5, C.amber);
        // Where to shoot to meet it.
        const lead = game.leadFor(m.e);
        if (lead) {
          const lp = this.project(game, lead);
          if (lp.ahead) this.diamond(lp.x, lp.y, 6, C.amber);
        }
      }
      if (m.kind !== 'small' || m.d < 400 || isNav) this.label(p.x + s + 6, p.y + s, `${m.e.name}  ${m.d < 1000 ? Math.round(m.d) + ' m' : (m.d / 1000).toFixed(1) + ' km'}`, isTarget ? C.amber : m.color);
      // A ship: her shields and hull under the bracket, and how dangerous she is to what you are in.
      if (m.kind === 'bracket' && m.e.hullMax && (isTarget || m.d < 2200)) {
        const w = clamp(s * 2, 28, 64), x0 = p.x - w / 2, y0 = p.y + s + 5;
        if (m.e.shieldsMax) this.mini(x0, y0, w, m.e.shields / m.e.shieldsMax, C.blue);
        this.mini(x0, y0 + (m.e.shieldsMax ? 4 : 0), w, m.e.hull / m.e.hullMax, m.e.hull / m.e.hullMax < 0.3 ? C.red : C.green);
        if (m.color === C.red) {
          const t = game.threatOf(m.e);
          this.label(p.x + s + 6, p.y + s + 13, t.label, t.color);
        }
      }
      if (game.gunnerOn === m.e && phase !== 'turret') this.label(p.x, p.y - s - (isNav ? 28 : 10), 'DAG', C.amber, 'center');
    }
    // The reticle where the guns point: the middle of the view, or in the chase view the point 300 m down the nose.
    const chase = (phase === 'fighter' && game.chase.fighter) || (phase === 'helm' && game.chase.helm);
    if (phase === 'fighter' || phase === 'turret') {
      const r = chase ? this.project(game, game.aimPoint()) : { x: W / 2, y: H / 2, ahead: true };
      if (r.ahead) {
        g.strokeStyle = C.green;
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(r.x, r.y, 12, 0, Math.PI * 2);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          g.moveTo(r.x + dx * 16, r.y + dy * 16);
          g.lineTo(r.x + dx * 26, r.y + dy * 26);
        }
        g.stroke();
      }
    } else if ((phase === 'helm' && !chase) || phase === 'eva') {
      g.strokeStyle = 'rgba(230,233,238,0.5)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(W / 2 - 10, H / 2);
      g.lineTo(W / 2 + 10, H / 2);
      g.moveTo(W / 2, H / 2 - 10);
      g.lineTo(W / 2, H / 2 + 10);
      g.stroke();
    }
    // The Wren's canopy frame: struts from the corners.
    if (phase === 'fighter' && !chase) {
      g.fillStyle = '#0b0d11';
      g.beginPath();
      for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const x0 = sx ? W : 0, y0 = sy ? H : 0;
        g.moveTo(x0, y0);
        g.lineTo(x0 + (sx ? -1 : 1) * W * 0.12, y0);
        g.lineTo(x0, y0 + (sy ? -1 : 1) * H * 0.2);
        g.closePath();
      }
      g.fill();
    }
    // Bars: what you are in, bottom left; the drive, bottom right.
    const y = H - 34;
    const bw = clamp(W * 0.16, 90, 200);
    if (phase === 'eva') {
      const eva = game.eva;
      this.bar(18, y, bw, 8, eva.o2 / O2_SECONDS, eva.o2 < 40 ? C.red : C.blue, 'AIR', fmtTime(eva.o2));
      this.bar(W - 18 - bw, y, bw, 8, Math.min(1, eva.vel.clone().sub(game.player.vel).length() / 50), C.amber, 'DRIFT vs KESTREL', `${Math.round(eva.vel.clone().sub(game.player.vel).length())} m/s`);
    } else {
      const sh = body.shieldsMax ? body.shields / body.shieldsMax : 0;
      this.bar(18, y - 30, bw, 8, sh, C.blue, 'SHIELDS', `${Math.round(body.shields)}`);
      this.bar(18, y, bw, 8, body.hull / body.hullMax, body.hull / body.hullMax < 0.3 ? C.red : C.green, 'HULL', `${Math.round(body.hull)}`);
      const fl = game.activeFlight();
      if (fl) {
        this.bar(W - 18 - bw, y - 30, bw, 8, fl.throttle, C.amber, 'THROTTLE', `${Math.round(fl.throttle * 100)}%`);
        this.bar(W - 18 - bw, y, bw, 8, body.speed / fl.speedMax, C.amber, 'SPEED', `${Math.round(body.speed)} m/s`);
      }
      if (phase === 'fighter') this.bar(W / 2 - bw / 2, y, bw, 8, game.lasers / 100, C.red, 'CANNONS', `${Math.round(game.lasers)}`);
      if (phase === 'turret') this.bar(W / 2 - bw / 2, y, bw, 8, 1 - clamp(game.turretSeat.cool / game.ship.turretEvery, 0, 1), C.red, 'TURRET', 'READY');
    }
    if (game.target?.alive) this.targetCard(game, game.target); // after the canopy struts, which would cover it
    // Words on the glass.
    g.textAlign = 'center';
    if (game.warn) this.label(W / 2, 26, game.warn, C.amber, 'center');
    else if (!game.input.locked && phase !== 'tactical') this.label(W / 2, 26, 'CLICK THE VIEW TO TAKE THE STICK · CLICK A MARK TO SELECT IT', C.dim, 'center');
    if (game.beams?.length) this.label(W / 2, 64, `TRACTOR · ${game.beams.length} POD${game.beams.length > 1 ? 'S' : ''} COMING IN`, C.amber, 'center');
    const help = { helm: 'mouse or arrows steer · W S throttle · T target · V view · E stand up · J jump at a gate · Tab tactical', fighter: 'mouse or arrows fly · A D roll · W S throttle · Space fire · T target · V view · fly through a pod to scoop it · E land astern', turret: 'mouse aims · click or Space fires · T target · E climb down', eva: 'W S A D R F thrust · Shift burn · mouse look · E grab / airlock', tactical: 'click a contact: target it (Dag fires) or set a course (Vex flies) · drag orbits · wheel zooms · T next target · Tab back' }[phase];
    if (help) this.label(W / 2, H - 10, help, C.dim, 'center');
    if (game.dockPrompt) this.label(W / 2, 46, game.dockPrompt, C.green, 'center');
  }

  /** The target's card, top right of the view: what she is, what she has left, how dangerous, who is shooting her. */
  targetCard(game, e) {
    const { g, W } = this;
    const t = game.threatOf(e);
    const x = W - 214, y = 14, w = 200;
    g.fillStyle = C.panel;
    g.fillRect(x, y, w, e.shieldsMax ? 76 : 62);
    g.strokeStyle = t.color;
    g.strokeRect(x + 0.5, y + 0.5, w, e.shieldsMax ? 76 : 62);
    this.label(x + 10, y + 13, 'TARGET', C.dim);
    this.label(x + w - 10, y + 13, t.label, t.color, 'right');
    let name = `${e.name}${e.cls ? ' · ' + e.cls.cls : ''}`;
    while (name.length > 4 && g.measureText(name).width > w - 20) name = name.slice(0, -2) + '…';
    this.label(x + 10, y + 29, name, C.white);
    let yy = y + 44;
    if (e.shieldsMax) {
      this.mini(x + 10, yy, w - 70, e.shields / e.shieldsMax, C.blue);
      this.label(x + w - 10, yy + 1, `SH ${Math.round(e.shields)}`, C.blue, 'right');
      yy += 12;
    }
    this.mini(x + 10, yy, w - 70, e.hull / e.hullMax, e.hull / e.hullMax < 0.3 ? C.red : C.green);
    this.label(x + w - 10, yy + 1, `HULL ${Math.round(e.hull)}`, C.green, 'right');
    const who = game.gunnerOn === e && game.phase !== 'turret' ? 'DAG IS FIRING ON HER' : `${Math.round(e.obj.position.distanceTo(game.playerBody().obj.position))} m`;
    this.label(x + 10, yy + 13, who, C.amber);
  }

  boarding(game) {
    const { g, W, H } = this;
    const b = game.boarding;
    if (b.flash > 0) {
      g.fillStyle = `rgba(255,50,24,${(b.flash * 0.35).toFixed(3)})`;
      g.fillRect(0, 0, W, H);
    }
    // The rifle's sight.
    g.strokeStyle = C.green;
    g.lineWidth = 1.5;
    g.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      g.moveTo(W / 2 + dx * 5, H / 2 + dy * 5);
      g.lineTo(W / 2 + dx * 13, H / 2 + dy * 13);
    }
    g.stroke();
    const bw = clamp(W * 0.16, 90, 200);
    this.bar(18, H - 34, bw, 8, b.hp / 100, b.hp < 30 ? C.red : C.green, 'YOU', `${Math.max(0, Math.round(b.hp))}`);
    this.bar(W - 18 - bw, H - 34, bw, 8, 1 - b.defendersLeft() / Math.max(1, b.defenders.length), C.red, 'DEFENDERS', `${b.defendersLeft()} left`);
    if (b.seizing > 0) this.progress(b.seizing, 'SEIZING THE BRIDGE', C.green);
    this.label(W / 2, 26, `BOARDING ${b.ship.name}`, C.amber, 'center');
    this.label(W / 2, H - 10, 'W A S D move · mouse aims · click or Space fires · E at the bridge console seizes her · E at the airlock leaves', C.dim, 'center');
  }
}
