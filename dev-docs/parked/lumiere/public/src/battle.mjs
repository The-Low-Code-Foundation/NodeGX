// A fight, Final Fantasy style (SCOPE.md §5): she stands on the right, the creatures on the left. On her turn the
// command window offers Magic (a Rocket School question), Items (free: no turn lost) and Run. A right answer casts
// (answered in the first third of the time: Brilliant!, half as much again; out of magic: a staff bonk). A wrong
// answer, or the clock running out, shows the right answer and its explanation while the next creature strikes.
// Ends with 'won' (every creature freed), 'ko' (her health at 0) or 'ran'.
import * as THREE from 'three';
import { makeCreature } from './creatures.mjs';
import { ask, record } from './school/school.mjs';
import { CREATURE_NAMES, DEPTHS, SPELL_COST, BONK, BRILLIANT, ITEMS, hitFor } from './data.mjs';
import { sfx } from './audio.mjs';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LETTERS = ['A', 'B', 'C', 'D'];

export class Battle {
  // game: the page (camera moves, the heroine's numbers, the bag, the chooser, settings); room: data.mjs ROOMS row.
  constructor(game, place, room) {
    this.game = game;
    this.place = place;
    this.room = room;
    this.hero = game.hero;
    this.fx = game.fx;
    this.foes = [];
    this.over = false;
    this.target = 0;
    this.question = null;
    this.paused = false;
  }

  get stats() {
    return this.game.stats();
  }

  async start() {
    const b = this.place.battle;
    const hero = this.hero;
    this.ui = $('#battle');
    this.ui.hidden = false;
    hero.group.position.set(b.hero[0], 0, b.hero[1]);
    const centre = new THREE.Vector3();
    for (const f of b.foes) centre.add(new THREE.Vector3(f[0], 0, f[1]));
    centre.divideScalar(b.foes.length);
    // Turned by its yaw alone. `lookAt` can store a turn as (π, y, π), and walking only steers `rotation.y`, so after a
    // won fight she walked mirrored, backwards ("still walks backwards … after clearing them", Richard, 11-12).
    hero.group.rotation.set(0, Math.atan2(centre.x - b.hero[0], centre.z - b.hero[1]), 0);
    hero.play('Idle_Loop', { fade: 0.2 });
    this.game.camTo(b.camera, b.look, 1.6);
    // The creatures rise out of the dark, one after another.
    const depth = DEPTHS[this.room.depth];
    for (const [i, kind] of this.room.creatures.entries()) {
      const c = makeCreature(kind, { seed: i });
      const spot = b.foes[i] ?? b.foes[0];
      c.group.position.set(spot[0], 0, spot[1]);
      c.group.lookAt(b.hero[0], 0, b.hero[1]);
      this.place.scene.add(c.group);
      this.foes.push({ c, kind, name: this.room.creatures.length > 1 ? `${CREATURE_NAMES[kind]} ${LETTERS[i]}` : CREATURE_NAMES[kind], hp: this.room.hp ?? depth.hp, max: this.room.hp ?? depth.hp, freed: false });
    }
    this.renderFoes();
    this.renderParty();
    sfx('creature');
    await Promise.all(this.foes.map((f, i) => wait(i * 350).then(() => f.c.wake())));
    const names = [...new Set(this.foes.map((f) => CREATURE_NAMES[f.kind]))];
    await this.banner(this.foes.length > 1 ? `${this.foes.length} ${names[0]}s block the way!` : `A ${names[0]} wakes up!`, 1400);
    this.command();
  }

  update(dt) {
    for (const f of this.foes) f.c.update(dt);
    if (this.question && this.question.limit && !this.paused && !this.question.answered) {
      this.question.left -= dt;
      const left = Math.max(0, this.question.left / this.question.limit);
      const ring = $('#q-moon circle.left');
      if (ring) ring.style.strokeDashoffset = String(113 * (1 - left));
      $('#q-moon').classList.toggle('late', left < 0.25);
      if (this.question.left <= 0) this.answer(-1);
    }
  }

  // ---- the windows ----
  renderFoes() {
    const el = $('#foes');
    el.innerHTML = '';
    this.foes.forEach((f, i) => {
      if (f.freed) return;
      const row = document.createElement('button');
      row.className = `foe${i === this.target ? ' target' : ''}`;
      row.innerHTML = `<span class="name">${f.name}</span><span class="bar"><i style="width:${(100 * f.hp) / f.max}%"></i></span>`;
      row.onclick = () => {
        this.target = i;
        sfx('click');
        this.renderFoes();
      };
      el.appendChild(row);
    });
  }
  renderParty() {
    const s = this.stats, g = this.game.save;
    $('#party').innerHTML = `<div class="who">${escapeHtml(g.name)}</div>
      <div class="meter hp"><b>HP</b><span class="bar"><i style="width:${(100 * g.hp) / s.maxHp}%"></i></span><em>${Math.ceil(g.hp)}/${s.maxHp}</em></div>
      <div class="meter mp"><b>MP</b><span class="bar"><i style="width:${(100 * g.mp) / s.maxMp}%"></i></span><em>${Math.ceil(g.mp)}/${s.maxMp}</em></div>`;
    this.game.renderHud();
  }
  async banner(text, ms = 1200, kind = '') {
    const el = $('#banner');
    el.className = kind;
    el.textContent = text;
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    await wait(ms);
    el.hidden = true;
  }

  // ---- her turn ----
  command() {
    if (this.over) return;
    if (this.foes[this.target]?.freed) this.target = this.foes.findIndex((f) => !f.freed);
    this.renderFoes();
    const s = this.stats, g = this.game.save;
    const el = $('#commands');
    const magic = g.mp >= SPELL_COST ? `✨ Magic <small>${SPELL_COST} MP</small>` : '🪄 Staff bonk <small>no magic left</small>';
    const items = Object.values(g.bag).some((n) => n > 0);
    el.innerHTML = `<button data-c="magic">${magic}</button><button data-c="items" ${items ? '' : 'disabled'}>🧪 Items</button><button data-c="run">🏃 Run away</button>`;
    el.hidden = false;
    $('#hint').textContent = this.foes.filter((f) => !f.freed).length > 1 ? 'Tap a creature’s name to aim at it.' : '';
    el.querySelector('[data-c=magic]').onclick = () => (sfx('click'), (el.hidden = true), this.ask());
    el.querySelector('[data-c=items]').onclick = () => (sfx('click'), this.items());
    el.querySelector('[data-c=run]').onclick = () => (sfx('click'), (el.hidden = true), this.end('ran'));
    void s;
  }

  items() {
    const el = $('#commands');
    const g = this.game.save;
    el.innerHTML =
      Object.entries(ITEMS)
        .filter(([id]) => g.bag[id] > 0)
        .map(([id, it]) => `<button data-i="${id}">${it.icon} ${it.name} ×${g.bag[id]}<small>${it.text}</small></button>`)
        .join('') + '<button data-i="back">↩ Back</button>';
    el.querySelectorAll('button').forEach((b) => {
      b.onclick = () => {
        sfx('click');
        if (b.dataset.i === 'back') return this.command();
        this.game.useItem(b.dataset.i);
        this.renderParty();
        this.command();
      };
    });
  }

  ask() {
    const q = ask(this.game.chooserFor());
    const limit = this.game.timerSeconds();
    this.question = { q, limit, left: limit, answered: false };
    const el = $('#question');
    el.hidden = false;
    $('#q-prompt').textContent = q.prompt;
    $('#q-moon').hidden = !limit;
    $('#q-moon').classList.remove('late');
    const ring = $('#q-moon circle.left');
    if (ring) ring.style.strokeDashoffset = '0';
    $('#q-explain').hidden = true;
    const box = $('#q-choices');
    box.innerHTML = '';
    q.choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="letter">${LETTERS[i]}</span><span>${escapeHtml(c)}</span>`;
      b.onclick = () => this.answer(i);
      box.appendChild(b);
    });
    this.hero.charge = 0.3;
    sfx('charge');
  }

  async answer(i) {
    const Q = this.question;
    if (!Q || Q.answered) return;
    Q.answered = true;
    const right = i === Q.q.answer;
    record(Q.q, right);
    const buttons = [...$('#q-choices').children];
    buttons.forEach((b, k) => {
      b.disabled = true;
      if (k === Q.q.answer) b.classList.add('right');
      else if (k === i) b.classList.add('wrong');
    });
    this.game.log?.({ right, prompt: Q.q.prompt });
    if (right) {
      const brilliant = Q.limit > 0 && Q.left > (Q.limit * 2) / 3;
      await wait(450);
      $('#question').hidden = true;
      this.question = null;
      await this.cast(brilliant);
    } else {
      sfx('wrong');
      $('#q-explain').hidden = false;
      $('#q-explain').innerHTML = `${i < 0 ? 'Time’s up! ' : ''}The answer was <b>${escapeHtml(Q.q.choices[Q.q.answer])}</b>.${Q.q.explain ? ` <span>${escapeHtml(Q.q.explain)}</span>` : ''}`;
      await wait(900);
      await this.strike();
      // The explanation stays up until the next command, so there is time to read it.
      await wait(600);
      $('#question').hidden = true;
      this.question = null;
    }
    if (!this.over) this.command();
  }

  async cast(brilliant) {
    const g = this.game.save, s = this.stats;
    const foe = this.foes[this.target];
    const hero = this.hero;
    const spell = g.mp >= SPELL_COST;
    if (spell) g.mp -= SPELL_COST;
    let dmg = spell ? s.power : Math.max(1, Math.round(s.power * BONK));
    if (brilliant) dmg = Math.round(dmg * BRILLIANT);
    this.renderParty();
    this.game.nudge(foe.c.group.position, 0.12, 0.6);
    if (brilliant) {
      sfx('brilliant');
      this.fx.number(hero.group.position.clone().setY(2.1), 'Brilliant!', 'word');
    }
    hero.charge = 1;
    hero.play('Spell_Simple_Shoot', { once: true, fade: 0.15 });
    await wait(hero.duration('Spell_Simple_Shoot') * 380);
    const from = hero.bones.leftHand.getWorldPosition(new THREE.Vector3());
    sfx(spell ? 'cast' : 'zap');
    const colours = spell ? { colour: brilliant ? 0xffe28a : 0xc9a6ff, trail: brilliant ? [0xffffff, 0xffe28a, 0xffb3d9] : [0xffffff, 0xffd6f6, 0xb9a3ff] } : { colour: 0xffd6a0, trail: [0xffd6a0, 0xffffff], size: 0.1 };
    await this.fx.bolt(from, foe.c.core, { ...colours, size: brilliant ? 0.24 : colours.size ?? 0.16, time: 0.5 });
    hero.charge = 0;
    this.fx.shake(brilliant ? 0.12 : 0.06);
    foe.hp = Math.max(0, foe.hp - dmg);
    this.fx.number(foe.c.core.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.4, 0)), String(dmg), brilliant ? 'crit' : 'hit');
    this.renderFoes();
    await foe.c.hurt();
    hero.play('Idle_Loop', { fade: 0.3 });
    this.game.camBack(0.6);
    if (foe.hp <= 0) await this.free(foe);
  }

  async free(foe) {
    foe.freed = true;
    sfx('reward');
    await foe.c.free();
    foe.c.group.removeFromParent();
    this.renderFoes();
    if (this.foes.every((f) => f.freed)) await this.victory();
  }

  // The next creature strikes her.
  async strike() {
    const alive = this.foes.filter((f) => !f.freed);
    const foe = alive[(this.strikes = (this.strikes ?? -1) + 1) % alive.length];
    const hero = this.hero;
    sfx('creature');
    this.game.nudge(hero.group.position, 0.12, 0.6);
    const chest = hero.group.position.clone().setY(1.15);
    await foe.c.attack(chest);
    const dmg = hitFor(this.room.depth, this.stats);
    const g = this.game.save;
    g.hp = Math.max(0, g.hp - dmg);
    sfx('hurt');
    this.fx.shake(0.14, 0.4);
    this.fx.flash(chest, 0xff5f8a, 10, 0.3);
    this.fx.number(chest.clone().setY(2.0), String(dmg), 'hurt');
    $('#battle').classList.add('ouch');
    setTimeout(() => $('#battle').classList.remove('ouch'), 350);
    this.renderParty();
    if (g.hp <= 0) {
      this.over = true;
      hero.face.mood = 'sad';
      await hero.once('Death01', { fade: 0.1 });
      sfx('knockout');
      await wait(500);
      return this.end('ko');
    }
    hero.face.mood = 'surprised';
    await hero.once('Hit_Chest', { fade: 0.08 });
    hero.face.mood = 'neutral';
    hero.play('Idle_Loop', { fade: 0.3 });
    this.game.camBack(0.6);
  }

  async victory() {
    this.over = true;
    $('#commands').hidden = true;
    sfx('win');
    this.hero.face.mood = 'happy';
    this.hero.play('Dance_Loop', { fade: 0.3 });
    await this.banner('Victory!', 1800, 'victory');
    this.hero.play('Idle_Loop', { fade: 0.4 });
    this.end('won');
  }

  end(how) {
    this.over = true;
    this.question = null;
    $('#question').hidden = true;
    $('#commands').hidden = true;
    for (const f of this.foes) {
      if (!f.freed) f.c.group.removeFromParent();
      f.c.dispose?.();
    }
    this.ui.hidden = true;
    this.game.battleOver(how, this);
  }

  // For the drives: answer the current question right or wrong.
  test(right) {
    if (!this.question) return false;
    const q = this.question.q;
    this.answer(right ? q.answer : (q.answer + 1) % q.choices.length);
    return true;
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
