#!/usr/bin/env node
/**
 * P108 IW-003 (session 3, lane B) — Biscuit's three missions as jobs, the Workshop's look at 1024 × 768, and "teach
 * again", driven on the DEPLOYED template (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` +
 * `nodegx-deploy.cjs`).
 *
 * A child's way: the program is built by TAPS on the drawer (Blockly: a tap adds a block at the end, or into the
 * container she selected — its word tapped; a slot opens the node's picker), then Play; the win card, the meters and the
 * robot's walk home are read off the page (the kit's DOM and the page's own Variables). A stub Olive answers inside Chrome.
 *
 * Clauses:
 *   MISSION <id> <vp>-<lang>  each of bowl-if (Cobble), wall-until and meow-when (Pip), at 1368 × 900 EN and FR: the
 *          program built from the drawer is the reference program; Play wins; the job's meters are full (the bowls 1/1,
 *          Biscuit's basket 1/1 with the ball, the bowl 2/2) and the robot is home (screenshots)
 *   LOOK <vp>  bowl-if's and wall-until's programs, built from the drawer at 1024 × 768, 1368 × 900 and the phone (390 ×
 *          844): every block of the program is whole inside the workspace beside (or above) the drawer — its left and
 *          right edges in view (the s2 finding: "forwar", "turn lef" cut at 1024) (screenshots)
 *   ISLAND  the won plots on the island: meow-when's Pip finishes, walks home, waits; Biscuit eats (WEAR.bowl) and Pip
 *          goes back and fills the bowl again — read from the island's own state, and the plot's robot drawn at home
 *   TEACH   a v4 save whose wall-until plot holds the program that won the mission BEFORE it was rewritten (until the
 *          wall, turn left): the plot is flagged, Pip waits at home (never a step over the ticks watched), the plot card
 *          and the Workshop both say "Teach Pip again — the job changed" (EN, FR; screenshots)
 *   0 console errors, 0 network errors.
 *
 * Seams the drive names: the robots a family owns (Cobble lent, as drive-cg003-pages does), a plot unpinned between two
 * Pip missions (the robot is brought home by the save, not the plot card's button), and the v4 plot program written into
 * the save (TEACH's fixture: exactly what a v4 save that won the old wall-until holds).
 *
 * Usage: node scripts/devtools/drive-iw003-biscuit.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]
 * Exits 0 when every clause passed, 1 when any failed, 2 on a usage error.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const DIR = process.argv[2];
const PROJECT = arg('--project') || path.join(__dirname, '..', '..', 'templates', 'bot-garden');
const SHOTS = arg('--shots');
const JSON_OUT = arg('--json');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-iw003-biscuit.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const nodesOfComponent = (dir) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...dir.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const tableOf = (component) => JSON.parse(nodesOfComponent(`Data/${component}`).find((n) => n.type === 'Static Data').parameters.json);
const WORD_ROWS = tableOf('Words');
const REQUESTS = tableOf('Requests');
const REQ = (id) => REQUESTS.find((r) => r.id === id);
const w = (lang, key, name = 'Pip', vars = {}) => {
  let t = String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || '').split('{b}').join(name);
  for (const k of Object.keys(vars)) t = t.split(`{${k}}`).join(String(vars[k]));
  return t;
};
const titleOf = (lang, id) => w(lang, (REQ(id) || { copyKeys: {} }).copyKeys.title);
const WEAR_BOWL = 60;
/** The program that won wall-until before IW-003 rewrote it (a v4 plot's): walk until the wall, turn left. */
const OLD_WALL = [{ id: 1, t: 'until', slots: { sensor: 'wall_ahead' }, body: [{ id: 2, t: 'fwd' }] }, { id: 3, t: 'left' }];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};
/**
 * The engine program's shape, ids aside (what the child built vs the request's reference program). A `when` names its
 * event, meow when it names none (the engine's own default, collectHandlers: a Blockly when block writes no event slot).
 */
const shape = (list) => (Array.isArray(list) ? list : []).map((b) => b.t + (b.n ? ' ' + b.n : '') + (b.slots && b.slots.sensor ? ' ' + b.slots.sensor : '') + (b.t === 'when' ? ' ' + ((b.slots && b.slots.event) || 'meow') : '') + (b.body ? ' { ' + shape(b.body) + ' }' : '')).join(', ');

withDeployedSite({ dir: DIR }, async (page) => {
  const { client } = page;
  const evaluate = (expr) => page.evaluate(expr);
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const answer = /\/__garden\/olive\/status/.test(request.url) ? { model: 'ready', reason: '', gpu: false, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} } } : { ok: true, text: 'stub', ms: 5 };
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(answer)).toString('base64') });
    }
  });
  await client.send('Fetch.enable', { patterns: [{ urlPattern: '*/__garden/*', requestStage: 'Request' }] });

  const until = async (expr, ok, ms = 8000) => {
    const end = Date.now() + ms;
    let last = await evaluate(expr);
    while (!ok(last) && Date.now() < end) {
      await wait(150);
      last = await evaluate(expr);
    }
    return last;
  };
  const shot = async (name) => {
    if (SHOTS) await page.screenshot(path.join(SHOTS, `${name}.png`));
  };
  const where = (finder, scroll = true) =>
    evaluate(`(() => { const el = (${finder}); if (!el) return { found: false };
      if (${scroll}) el.scrollIntoView({ block: 'center', inline: 'center' });
      const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const at = document.elementFromPoint(x, y);
      return { found: true, x, y, hit: !!at && (el === at || el.contains(at)) }; })()`);
  const tap = async (finder, label) => {
    let p = await where(finder);
    for (let i = 0; i < 20 && !p.found; i++) {
      await wait(150);
      p = await where(finder);
    }
    if (p.found) {
      await wait(200);
      p = await where(finder, false);
    }
    if (!p.found || !p.hit) {
      check(`tap ${label}`, false, p);
      return false;
    }
    for (const type of ['mousePressed', 'mouseReleased']) await client.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await wait(250);
    return true;
  };
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const control = (icon) => tap(first(`.bg-controls .bg-i-${icon}`), `control ${icon}`);
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const tab = (i) => tap(`document.querySelectorAll('.bg-tabs .bg-tab')[${i}]`, `tab ${i}`);
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const reveal = (id) => evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
  const palTap = async (id) => {
    await reveal(id);
    await wait(150);
    await tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), `palette ${id}`);
    await wait(200);
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const lastRep = (t) => evaluate(`(() => { const r = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-rep')].filter((e) => e.getAttribute('data-t') === ${JSON.stringify(t)}); return r.length ? r[r.length - 1].getAttribute('data-rep') : ''; })()`);
  const pickRep = (id, label) => tap(`document.querySelector('.bg-blocks-box .gd-prog [data-head="${id}"]')`, label);
  const repSelected = (id) => evaluate(`(document.querySelector('.bg-blocks-box .gd-rep[data-rep="${id}"]') || {}).getAttribute ? document.querySelector('.bg-blocks-box .gd-rep[data-rep="${id}"]').getAttribute('data-sel') : ''`);
  const slotOn = async (blockSel, key, value, label) => {
    await tap(first(`${blockSel} .gd-slot[data-slot="${key}"]`), `${label}: slot ${key}`);
    await tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${value}"]`), `${label}: ${value}`);
  };
  /** Take a container (its word), fill its mouth from the drawer, let it go. */
  const take = async (id, label) => {
    await pickRep(id, `${label}: take it`);
    if ((await repSelected(id)) !== '1') await pickRep(id, `${label}: take it (again)`);
  };
  const letGo = async (id, label) => {
    if ((await repSelected(id)) === '1') await pickRep(id, `${label}: let it go`);
  };
  const container = async (t, slot, value, body, label) => {
    await palTap(t);
    const id = await lastRep(t);
    if (slot) await slotOn(`.bg-blocks-box .gd-rep[data-rep="${id}"]`, slot, value, label);
    await take(id, label);
    for (const op of body) await palTap(op);
    await letGo(id, label);
    return id;
  };
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l : []; })()`;
  const program = () => evaluate(PROGRAM);
  const writeStore = async (fnBody, to = '/island') => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); ${fnBody}; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate(to);
    await wait(1400);
  };
  const saved = () => evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); return a.island; })()`);

  const freshFamily = async (lang) => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    if (lang === 'fr') {
      await seg('FR');
      await wait(600);
    }
    await tap(first('button.bg-profile-new'), `new player (${lang})`);
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
    await tap(byText('button.bg-btn', w(lang, 'create')), 'create');
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    // Seam: Cobble lent (Sami lends him after the post-box walk), as drive-cg003-pages.js does.
    await writeStore(`a.island.robots = a.island.robots || [{ id: 'r1' }]; if (!a.island.robots.some((r) => (r.kind || r.id) === 'cobble')) a.island.robots.push({ id: 'cobble', kind: 'cobble' })`);
  };
  const openQuest = async (lang, id) => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    await tap(byText('.bg-quest', titleOf(lang, id)), `open ${id}`);
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal-head]')`, Boolean, 6000);
    await wait(900);
  };

  /** Each mission's reference program, built from the drawer as a child builds it. */
  const BUILD = {
    'bowl-if': async () => {
      for (const op of ['left', 'pick', 'pick', 'right']) await palTap(op);
      await palTap('repeat');
      const rep = await lastRep('repeat');
      await take(rep, 'the repeat');
      for (const op of ['fwd', 'fwd', 'left']) await palTap(op);
      await palTap('if');
      const iff = await lastRep('if');
      await slotOn(`.bg-blocks-box .gd-rep[data-rep="${iff}"]`, 'sensor', 'bowl_empty', 'the if');
      await take(iff, 'the if');
      await palTap('put');
      await letGo(iff, 'the if');
      await take(rep, 'the repeat (again)');
      await palTap('right');
      await letGo(rep, 'the repeat');
    },
    'wall-until': async () => {
      await container('until', 'sensor', 'wall_ahead', ['fwd'], 'the first until');
      for (const op of ['left', 'pick', 'left']) await palTap(op);
      await container('until', 'sensor', 'wall_ahead', ['fwd'], 'the second until');
      await palTap('put');
    },
    'meow-when': async () => {
      await container('when', null, null, ['left', 'pick', 'right', 'put'], 'the when');
    }
  };

  /** The program whole in view: every placed block's own outline inside the workspace's view (beside or above the drawer). */
  const WHOLE = `(() => { const r = ${BK}; const ws = r.__gardenBlocks.workspace(); const mm = ws.getMetricsManager(); const svg = ws.getParentSvg().getBoundingClientRect(); const abs = mm.getAbsoluteMetrics(); const view = mm.getViewMetrics();
    const L = svg.left + abs.left, T = svg.top + abs.top, R = L + view.width, B = T + view.height;
    const start = ws.getTopBlocks(false).find((b) => b.type === 'garden_start'); const all = start ? start.getDescendants(false).filter((b) => !b.isShadow()) : [];
    const blocks = all.map((b) => { const p = b.getSvgRoot().querySelector(':scope > .blocklyPath'); const q = (p || b.getSvgRoot()).getBoundingClientRect(); return { t: b.type.replace('garden_', ''), l: Math.round(q.left), r: Math.round(q.right), w: Math.round(q.width) }; });
    const cut = blocks.filter((b) => b.l < L - 1 || b.r > R + 1);
    const widest = blocks.reduce((m, b) => (b.w > (m ? m.w : 0) ? b : m), null);
    return { view: { L: Math.round(L), R: Math.round(R), T: Math.round(T), B: Math.round(B), w: Math.round(view.width) }, flyout: Math.round(abs.left), scale: +ws.scale.toFixed(2), n: blocks.length, cut, widest, pageW: innerWidth, snug: r.classList.contains('gd-snug'), narrow: r.classList.contains('gd-narrow') }; })()`;
  const whole = async (tag, id) => {
    await evaluate(`window.scrollTo(0, document.querySelector('.bg-blocks-box').getBoundingClientRect().top + scrollY - 8)`);
    await wait(600);
    const got = await evaluate(WHOLE);
    readings[`look-${tag}-${id}`] = got;
    await shot(`iw003b-look-${tag}-${id}`);
    check(`LOOK ${tag} ${id}: all ${got.n} blocks of the program are whole in the workspace's view (x ${got.view.L}–${got.view.R}, the drawer ${got.flyout} px, scale ${got.scale}; widest ${got.widest && got.widest.t} ${got.widest && got.widest.w} px) and inside the page`,
      got.n >= REQ_COUNT[id] && got.cut.length === 0 && got.view.R <= got.pageW + 1, got);
  };
  /** Blocks in each reference program (the start block aside), for LOOK's known-firing count. */
  const count = (l) => l.reduce((n, b) => n + 1 + count(b.body || []), 0);
  const REQ_COUNT = Object.fromEntries(['bowl-if', 'wall-until', 'meow-when'].map((id) => [id, count(REQ(id).referenceProgram)]));

  const WORLD = `(() => { const W = Noodl.Variables.gardenWorld; const r0 = W && W.robots && W.robots[0]; return { robot: r0 ? [r0.x, r0.y, r0.d] : null, carry: r0 ? (r0.carry || []).slice() : [], things: (W && W.things || []).filter((t) => t.capacity).map((t) => t.kind + ':' + (t.count !== undefined ? t.count : t.food) + '/' + t.capacity), balls: (W && W.things || []).filter((t) => t.kind === 'ball').length,
    meters: [...document.querySelectorAll('.bg-stage .gd-meter')].map((m) => m.getAttribute('data-kind') + ':' + m.getAttribute('data-meter') + (m.classList.contains('gd-full') ? ':full' : '')), sprites: [...document.querySelectorAll('.bg-stage [data-sprite]')].map((s) => s.getAttribute('data-sprite')).filter((s) => /ball|basket|store|bowl/.test(s)) }; })()`;
  const WIN_UP = `(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`;
  const mission = async (lang, vp, id) => {
    const tag = `${vp}-${lang}`;
    await openQuest(lang, id);
    await BUILD[id]();
    const built = await program();
    const want = shape(REQ(id).referenceProgram);
    await whole(tag, id);
    const before = await evaluate(WORLD);
    await control('play');
    const won = await until(WIN_UP, Boolean, 45000);
    const after = await evaluate(WORLD);
    await wait(900);
    await shot(`iw003b-${id}-${tag}-won`);
    const rs = REQ(id).robotStart;
    const full = after.things.length > 0 && after.things.every((t) => { const [, v] = t.split(':'); const [a, b] = v.split('/'); return Number(a) >= Number(b); });
    readings[`mission-${tag}-${id}`] = { built: shape(built), want, before, after, won };
    check(`MISSION ${id} ${tag}: the program built from the drawer is the reference (${want}); Play wins; every target full (${after.things.join(' ')}), the robot home at ${rs.x},${rs.y}`,
      shape(built) === want && won && full && !!after.robot && after.robot[0] === rs.x && after.robot[1] === rs.y && after.robot[2] === rs.d && (id !== 'wall-until' || (after.balls === 0 && after.sprites.includes('basketBall'))) && after.meters.some((m) => m.endsWith(':full')), readings[`mission-${tag}-${id}`]);
    if (won) await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
    await wait(500);
    return won;
  };
  /** Seam: the robot brought home by the save (the plot unpinned), so the next Pip mission opens in the Workshop. */
  const unpin = (id) => writeStore(`delete a.island.plots[${JSON.stringify(id)}]`);

  // ── MISSIONS at 1368 × 900, EN then FR ──
  for (const lang of ['en', 'fr']) {
    await page.setViewport({ width: 1368, height: 900, mobile: false });
    await freshFamily(lang);
    await mission(lang, '1368', 'bowl-if');
    await mission(lang, '1368', 'meow-when');
    if (lang === 'en') {
      // ── ISLAND: meow-when's plot, won and pinned — Pip finishes, walks home, waits; a bowl emptied sends him back ──
      await page.navigate('/island');
      await wait(1500);
      const LIVE = `(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live && s.live['meow-when']; if (!c) return null; const b = c.things.find((t) => t.kind === 'bowl'); return { phase: c.phase, lap: c.lap, age: c.age, at: [c.robot.x, c.robot.y, c.robot.d], bowl: b ? (b.count !== undefined ? b.count : b.food) : null, stale: !!(s.plots.find((p) => p.id === 'meow-when') || {}).stale }; })()`;
      const phases = [];
      const t0 = Date.now();
      let last = null;
      while (Date.now() - t0 < (WEAR_BOWL + 40) * 800) {
        last = await evaluate(LIVE);
        if (last) phases.push(`${last.phase}@${last.age}:${last.bowl}`);
        if (last && last.lap >= 1 && last.phase === 'wait') break;
        await wait(700);
      }
      await shot('iw003b-island-meow-when-again');
      const seq = phases.map((p) => p.split('@')[0]).filter((p, i, a) => i === 0 || a[i - 1] !== p);
      readings.island = { seq, phases: phases.slice(-6), last };
      check('ISLAND (2D, 1368): meow-when’s Pip works, finishes with the bowl full and waits at home; Biscuit eats (WEAR.bowl) and Pip goes back and fills it again — never flagged',
        !!last && !last.stale && seq[0] === 'work' && seq.includes('wait') && seq.lastIndexOf('work') > seq.indexOf('wait') && last.phase === 'wait' && last.lap >= 1 && last.bowl === 2 && last.at.join() === '1,3,1', readings.island);
    }
    await unpin('meow-when');
    await mission(lang, '1368', 'wall-until');
  }

  // ── LOOK at 1024 × 768 and on the phone (bowl-if: the widest program; wall-until: the until's sensor) ──
  for (const [vp, size] of [['1024', { width: 1024, height: 768, mobile: false }], ['390', { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }]]) {
    await page.setViewport(size);
    await freshFamily('en');
    for (const id of ['bowl-if', 'wall-until']) {
      await openQuest('en', id);
      await BUILD[id]();
      await whole(vp, id);
    }
  }

  // ── TEACH: a v4 save whose wall-until plot holds the old program (the mission as it was) ──
  for (const lang of ['en', 'fr']) {
    await page.setViewport({ width: 1368, height: 900, mobile: false });
    await freshFamily(lang);
    await writeStore(`a.island.done = ['wall-until']; a.island.plots = { 'wall-until': { program: ${JSON.stringify(OLD_WALL)}, robotId: 'r1', wonAt: 1 } }`);
    await wait(1200);
    const ST = `(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live && s.live['wall-until']; const p = s && s.plots.find((x) => x.id === 'wall-until'); return c ? { stale: !!(p && p.stale), phase: c.phase, pc: c.run.pc, at: [c.robot.x, c.robot.y, c.robot.d], tick: s.tick } : null; })()`;
    const a = await until(ST, (v) => !!v && v.tick > 0, 8000);
    await wait(8000);
    const b = await evaluate(ST);
    const plot = REQ('wall-until').plot;
    await tap(`document.querySelector('.bg-isle .gd-cell[data-x="${plot.x + 4}"][data-y="${plot.y + 1}"]')`, `the wall-until plot (${lang})`);
    const card = await until(`(() => { const c = document.querySelector('.bg-plot-card'); if (!c || c.offsetParent === null) return null; const e = c.querySelector('.bg-plot-line'); return e ? e.innerText.trim() : null; })()`, Boolean, 4000);
    await shot(`iw003b-teach-island-${lang}`);
    const line = w(lang, 'iw3bTeachAgain', 'Pip');
    readings[`teach-island-${lang}`] = { a, b, card, line };
    check(`TEACH island ${lang}: the old wall-until program on the rewritten mission is flagged; Pip waits at home (${a && a.at}) and takes no step over ${b && a ? b.tick - a.tick : '?'} ticks; the plot card says “${line}”`,
      !!a && !!b && a.stale && b.stale && a.phase === 'teach' && b.phase === 'teach' && b.pc === 0 && b.at.join() === '1,3,1' && b.tick - a.tick >= 5 && card === line, readings[`teach-island-${lang}`]);
    await openQuest(lang, 'wall-until');
    const ws = await until(`(() => { const e = document.querySelector('.bg-teach-again'); return e && e.offsetParent !== null ? e.innerText.trim() : null; })()`, Boolean, 5000);
    await shot(`iw003b-teach-workshop-${lang}`);
    readings[`teach-ws-${lang}`] = { ws, line };
    check(`TEACH Workshop ${lang}: on wall-until the Workshop says “${line}”`, ws === line, readings[`teach-ws-${lang}`]);
    if (lang === 'en') {
      // Known-firing: the same family after teaching it again (the new program won and pinned) says nothing more.
      await BUILD['wall-until']();
      await control('play');
      const won = await until(WIN_UP, Boolean, 45000);
      if (won) await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
      const st = await saved();
      await openQuest(lang, 'wall-until');
      await wait(1200);
      const gone = await evaluate(`(() => { const e = document.querySelector('.bg-teach-again'); return !!e && e.offsetParent !== null; })()`);
      readings.teachAgainWon = { won, pinned: shape(((st.plots || {})['wall-until'] || {}).program), gone };
      check('TEACH known-firing: taught again (the new program won and is pinned), the line is gone', won && !gone && readings.teachAgainWon.pinned === shape(REQ('wall-until').referenceProgram), readings.teachAgainWon);
    }
  }

  check('0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
})
  .then((out) => {
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} clauses passed${SHOTS ? `; screenshots in ${SHOTS}` : ''}`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error('DRIVE FAILED:', e && e.stack ? e.stack : e);
    process.exit(1);
  });
