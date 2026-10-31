// The heads-up display and the panels (the stone's question, crafting, the trophy case, the menu). Plain DOM.
import { SLOTS } from './weapons.mjs';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const KIND = { task: 'A thing to plan', learn: 'Something to learn', reflect: 'To think about', body: 'For your body', people: 'Someone to see' };

export function makeHud({ onSlot, onMenu }) {
  const el = {
    hotbar: $('hotbar'), health: $('healthfill'), depth: $('depth'), toasts: $('toasts'), prompt: $('prompt'),
    warn: $('warn'), stick: $('stick'), knob: $('knob'), panel: $('panel'), card: $('card'), crack: $('crack'),
    flash: $('flash'), hurt: $('hurt'), hit: $('hitmarker'), scope: $('scope'), crosshair: $('crosshair'),
    buttons: { jump: $('btnJump'), fire: $('btnFire'), aim: $('btnAim'), use: $('btnUse') }
  };
  SLOTS.forEach((s, i) => {
    const b = document.createElement('button');
    b.dataset.i = i;
    b.innerHTML = `<span>${s.label}</span><b>0</b>`;
    const pick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSlot(i);
    };
    b.addEventListener('touchstart', pick, { passive: false });
    b.addEventListener('mousedown', pick);
    el.hotbar.append(b);
  });
  const menuOpen = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onMenu();
  };
  $('menuBtn').addEventListener('touchstart', menuOpen, { passive: false });
  $('menuBtn').addEventListener('click', menuOpen);

  let panelClose = null;
  const hud = {
    el,
    touchZone: $('touch'),
    buttons: el.buttons,
    typing: () => document.activeElement?.tagName === 'TEXTAREA',
    panelOpen: () => !el.panel.hidden,

    slots(active, pack) {
      [...el.hotbar.children].forEach((b, i) => {
        b.classList.toggle('on', i === active);
        b.querySelector('b').textContent = pack[SLOTS[i].key] ?? 0;
        if (i === 0) b.querySelector('span').textContent = 'Pick · torches';
      });
    },
    vitals(health, max, depth) {
      el.health.style.width = `${(health / max) * 100}%`;
      el.depth.textContent = depth > 0 ? `${Math.round(depth)} m down` : 'the surface';
    },
    toast(text) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.textContent = text;
      el.toasts.append(t);
      setTimeout(() => t.remove(), 3700);
      while (el.toasts.children.length > 4) el.toasts.firstChild.remove();
    },
    prompt(text) {
      el.prompt.textContent = text ?? '';
      el.prompt.classList.toggle('on', !!text);
    },
    crack(p) {
      el.crack.classList.toggle('on', p > 0);
      el.crack.style.setProperty('--p', `${Math.round(p * 100)}%`);
    },
    flash() {
      el.flash.style.transition = 'none';
      el.flash.style.opacity = 0.35;
      requestAnimationFrame(() => {
        el.flash.style.transition = 'opacity 0.2s';
        el.flash.style.opacity = 0;
      });
    },
    hurt() {
      el.hurt.style.transition = 'none';
      el.hurt.style.opacity = 1;
      requestAnimationFrame(() => {
        el.hurt.style.transition = 'opacity 0.6s';
        el.hurt.style.opacity = 0;
      });
    },
    hitMarker(head) {
      el.hit.classList.toggle('head', !!head);
      el.hit.classList.add('on');
      setTimeout(() => el.hit.classList.remove('on'), 60);
    },
    scope(on) {
      el.scope.style.opacity = on ? 1 : 0;
      el.crosshair.style.opacity = on ? 0 : 1;
    },
    // Only the buttons that apply right now.
    context({ weapon, use }) {
      el.buttons.fire.hidden = !weapon;
      el.buttons.aim.hidden = weapon !== 'rifle';
      el.buttons.use.hidden = !use;
      if (use) el.buttons.use.textContent = use;
    },
    stick(on, x, y, dx = 0, dy = 0) {
      el.stick.classList.toggle('on', !!on);
      if (!on) return;
      el.stick.style.left = `${x}px`;
      el.stick.style.top = `${y}px`;
      el.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    // A dismissable bar: yellow at 15 minutes, orange at 30, red at 45. It never stops the game.
    warn(level, text) {
      const bar = document.createElement('div');
      bar.className = `bar ${level}`;
      bar.innerHTML = `<span>${esc(text)}</span><button aria-label="Dismiss">✕</button>`;
      const close = (e) => {
        e.preventDefault();
        e.stopPropagation();
        bar.remove();
      };
      bar.querySelector('button').addEventListener('click', close);
      bar.querySelector('button').addEventListener('touchstart', close, { passive: false });
      el.warn.replaceChildren(bar);
    },

    open(html, { onClose } = {}) {
      el.card.innerHTML = html;
      el.panel.hidden = false;
      panelClose = onClose ?? null;
      el.card.scrollTop = 0;
      return el.card;
    },
    close() {
      if (el.panel.hidden) return;
      el.panel.hidden = true;
      el.card.innerHTML = '';
      const f = panelClose;
      panelClose = null;
      f?.();
    },

    // The stone in a planted room: the instructions, and the answer that wakes the portal.
    lectern(plant, { answered, previous, date, source }, onAnswer) {
      const kind = KIND[plant.kind] ?? 'Planted for you';
      const when = source === 'sample' ? 'A sample room' : `Planted the night before ${esc(date)}`;
      const card = hud.open(`
        <div class="kind">${esc(kind)}</div>
        <h2>${esc(plant.title)}</h2>
        <p>${esc(plant.instructions)}</p>
        <p class="ask">${esc(plant.ask)}</p>
        <textarea id="answer" placeholder="Write it here. The portal wakes when you carve it.">${esc(previous ?? '')}</textarea>
        <p class="dim">${when}. Claude reads what you carve the next night and plants from it.${answered ? ' You have already carved an answer: the portal is open.' : ''}</p>
        <div class="row"><button class="go" id="carve">${answered ? 'Carve again' : 'Carve it into the stone'}</button><button id="later">Not now</button></div>`);
      card.querySelector('#later').onclick = () => hud.close();
      card.querySelector('#carve').onclick = async () => {
        const text = card.querySelector('#answer').value.trim();
        if (!text) {
          card.querySelector('#answer').focus();
          return;
        }
        card.querySelector('#carve').disabled = true;
        await onAnswer(text);
        hud.close();
      };
    },
    note(note, where) {
      const card = hud.open(`<div class="kind">${esc(where)}</div><h2>${esc(note.title)}</h2><p>${esc(note.text)}</p><div class="row"><button class="go" id="ok">Close</button></div>`);
      card.querySelector('#ok').onclick = () => hud.close();
    },
    craft(pack, recipes, onCraft) {
      const draw = () => {
        const rows = recipes
          .map((r, i) => `<div class="recipe"><div><b>${esc(r.makes)}</b><br><span class="small">${esc(r.from)}</span></div><button data-i="${i}" ${r.can(pack) ? '' : 'disabled'}>Make</button></div>`)
          .join('');
        const card = hud.open(`<div class="kind">Craft</div><h2>The pack</h2>
          <p class="dim">Coal ${pack.coal} · Iron ${pack.iron} · Flint ${pack.flint} · Crystal ${pack.crystal} · Rubble ${pack.rubble}</p>${rows}
          <div class="row"><button class="go" id="done">Done</button></div>`);
        card.querySelectorAll('button[data-i]').forEach((b) => (b.onclick = () => {
          onCraft(recipes[Number(b.dataset.i)]);
          draw();
        }));
        card.querySelector('#done').onclick = () => hud.close();
      };
      draw();
    },
    trophies(list) {
      const items = list.length
        ? list
            .slice()
            .reverse()
            .map((t) => `<div class="trophy"><b>${esc(t.name)}</b><p class="small">${esc(t.description)}</p><small>${esc(t.world)} · ${esc((t.at ?? '').slice(0, 10))}</small></div>`)
            .join('')
        : '<p class="dim">Empty for now. Treasure waits on the far side of the portals.</p>';
      const card = hud.open(`<div class="kind">The trophy case</div><h2>${list.length} found</h2><div class="grid">${items}</div><div class="row"><button class="go" id="ok">Close</button></div>`);
      card.querySelector('#ok').onclick = () => hud.close();
    },
    menu(actions, today) {
      const rooms = today.plants
        .map((p) => `<li>${esc(p.title)} <span class="small">· ${p.answered ? 'answered, the portal is open' : 'somewhere in the deep'}</span></li>`)
        .join('');
      const source = today.source === 'nightly' ? 'Planted last night' : today.source === 'older' ? `No new rooms last night: these are from ${esc(today.date)}` : 'Sample rooms (the nightly run is not set up yet)';
      const card = hud.open(`<div class="kind">The Dig</div><h2>Paused</h2>
        <p class="dim">${source}${today.note ? ` · ${esc(today.note)}` : ''}</p><ul>${rooms}</ul>
        <div class="menu">${actions.map((a, i) => `<button data-i="${i}">${esc(a.label)}</button>`).join('')}</div>`);
      card.querySelectorAll('button[data-i]').forEach((b) => (b.onclick = () => actions[Number(b.dataset.i)].run()));
    },
    help(touch) {
      const lines = touch
        ? ['Left thumb anywhere on the left: move. Push to the rim: run.', 'Right thumb: look. Hold still: dig. Quick tap: place a torch (or rubble, with rubble in hand).', '▲ jumps. With the rifle or bow in hand, Fire appears (hold to draw the bow). Aim zooms the rifle.', 'Use appears when you look at something you can read or take.', 'Steps up by one block on its own.']
        : ['WASD move, Shift run, Space jump.', 'Left mouse: dig (or fire). Right mouse: place a torch, or rubble with rubble in hand; aim with the rifle.', 'F places a torch whatever is in hand. E uses. 1–4 or the wheel pick from the hotbar.', 'C crafts, T opens the trophy case, Esc pauses.'];
      const card = hud.open(`<div class="kind">How to dig</div><h2>Controls</h2><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="dim">Torches keep the crawlers off: they won't walk into bright light. Dying costs nothing: you come round at your last torch.</p>
        <div class="row"><button class="go" id="ok">Close</button></div>`);
      card.querySelector('#ok').onclick = () => hud.close();
    },
    home({ world, found, minutes }, onDone, onDig) {
      const items = found.length ? `<ul>${found.map((f) => `<li><b>${esc(f.name)}</b> <span class="small">${esc(f.description)}</span></li>`).join('')}</ul>` : '<p class="dim">Nothing taken this time. It will still be there.</p>';
      const card = hud.open(`<div class="kind">Back through the portal</div><h2>Home from ${esc(world)}</h2>${items}
        <p class="dim">${minutes} minutes this session. The cave stays exactly as you left it.</p>
        <div class="row"><button class="go" id="done">Done for now</button><button id="dig">Keep digging</button></div>`);
      card.querySelector('#done').onclick = () => {
        hud.close();
        onDone();
      };
      card.querySelector('#dig').onclick = () => {
        hud.close();
        onDig();
      };
    }
  };
  return hud;
}
