#!/usr/bin/env node
/**
 * P108 IW-006 (session 4, lane H) — the shop on the Island page, driven on the DEPLOYED template (the deploy
 * `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx-deploy.cjs`).
 *
 * A child's way: the shop's button, its tabs, an item, the purchase card, Buy / Use it / Not now — every one a tap on
 * what she sees (a tap lands only where `elementFromPoint` finds the thing). What is bought is read off the page and off
 * the store (the family as the page wrote it); the helpers' work off the island's own state (`gardenIsland`).
 *
 * Seams the drive names: shells are SEEDED into the saved family (lane E earns them; this lane only spends), as are the
 * robots she has (Cobble lent; a second Pip, "Pip 2", as a v5 save holds a copy) and the plots they work (each request's
 * reference program pinned, as a win pins it).
 *
 * Clauses:
 *   BUTTON <vp>-<lang>   the Island page's head carries "🐚 32 · Shop" (FR "Boutique"), whole in view, beside the title
 *   TAB <vp>-<lang> <tab> each of the five tabs at 1024 × 768, 1368 × 900 and the phone (390 × 844), EN and FR: Build and
 *                        Animals say they come later and sell nothing; Robots, Upgrades, Helpers draw each item with its
 *                        picture, its price, its name and its line, inside the page (no sideways scroll) (screenshots)
 *   SHORT <vp>-<lang>    22 shells, a new Pip (30): the card says what she has, the cost, "You need 8 more shells." — no Buy
 *   BUY <vp>-<lang>      32 shells: the card says 32 · 30 · left 2; named "Bubbles", Buy → "It's yours!" alone on the card, the button says
 *                        🐚 2, the store holds spent 30 and a Pip named Bubbles; after a reload the button still says 🐚 2
 *   BRAIN                the bigger brain for Pip (the card's chips: her three robots at 12 blocks), Buy → r1's brain 16 in
 *                        the store; the Workshop's Blocks node then takes 13 blocks (a 12-block brain refuses the 13th —
 *                        IW-004's AC5) and refuses the 17th with "Pip's brain holds 16 blocks."
 *   SELFCAN              bought, used on tulips-three from its card: it leaves owned, rides on the job (the island's state
 *                        and the save's live.helper); Pip's can is full on every tick of that job; at the finish line it
 *                        is gone (the state and, after the island's next write, nowhere) and Pip waits at home
 *   RAIN                 bought, used on tulip-door (Pip 2's job): the tulip full at once, the job done; gone from owned
 *   BARROW               bought, used on path-stones (Cobble's): Cobble carries 8 until the job is done, then 4
 *   0 console errors, 0 network errors.
 *
 * Usage: node scripts/devtools/drive-iw006-shop.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>] [--quick]
 *   --quick: the tabs at 1368 only (a smoke run while building).
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
const QUICK = process.argv.includes('--quick');
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-iw006-shop.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>] [--quick]');
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
/** The shop's catalogue as the page ships it (Shop rows' script carries it). */
const fnScript = (comp) => nodesOfComponent(comp).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript;
const SHOP = JSON.parse(/var SHOP = (\[.*?\]);\n/.exec(fnScript('Logic/Shop rows'))[1]);
const TABS = JSON.parse(/var SHOP_TABS_LIST = (\[.*?\]);\n/.exec(fnScript('Logic/Shop rows'))[1]);
const w = (lang, key, vars = {}) => {
  let t = String((WORD_ROWS.find((r) => r.key === key) || {})[lang] || '');
  for (const k of Object.keys(vars)) t = t.split(`{${k}}`).join(String(vars[k]));
  return t;
};
const tabWord = (t) => `iw6hTab${t[0].toUpperCase()}${t.slice(1)}`;
const titleOf = (lang, id, b) => w(lang, REQ(id).copyKeys.title).split('{b}').join(b);
const VIEWPORTS = [
  ['1024', { width: 1024, height: 768, mobile: false }],
  ['1368', { width: 1368, height: 900, mobile: false }],
  ['390', { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }]
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

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
    await wait(300);
    return true;
  };
  const byText = (selector, needle) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null && e.innerText.trim().includes(${JSON.stringify(needle)}))`;
  const first = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find((e) => e.offsetParent !== null)`;
  const seg = (label) => tap(byText('.bg-top .bg-seg-btn', label), `seg ${label}`);
  const STORE = `(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; return m.profiles.find((p) => p.id === m.island.activeId); })()`;
  const writeStore = async (fnBody, to = '/island') => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); ${fnBody}; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate(to);
    await wait(1500);
  };

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
  };
  /** Her island, seeded: shells, Cobble lent, a second Pip (a copy), three jobs pinned (each its reference program), rows-trick done. */
  const REF = (id) => JSON.stringify(REQ(id).referenceProgram);
  const seed = (shells) =>
    writeStore(`a.shells = { earned: ${shells}, spent: 0 }; a.owned = [];
      a.island.robots = [{ id: 'r1' }, { id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none' }, { id: 'rpip2', kind: 'pip', name: 'Pip 2', color: '#FF7A59', eye: 'round', hat: 'none' }];
      a.island.done = ['path-postbox', 'tulips-three', 'path-stones', 'tulip-door', 'rows-trick'];
      a.island.plots = { 'tulips-three': { program: ${REF('tulips-three')}, robotId: 'r1', wonAt: 1 }, 'path-stones': { program: ${REF('path-stones')}, robotId: 'cobble', wonAt: 1 }, 'tulip-door': { program: ${REF('tulip-door')}, robotId: 'rpip2', wonAt: 1 } }`);
  const BTN = `(() => { const b = document.querySelector('.bg-shop-open'); if (!b || b.offsetParent === null) return null; const r = b.getBoundingClientRect(); const h = document.querySelector('.bg-island-top h1'); const hr = h ? h.getBoundingClientRect() : null; return { text: b.innerText.trim(), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), vw: innerWidth, h1: hr ? [Math.round(hr.top), Math.round(hr.bottom)] : null }; })()`;
  const SHEET = `(() => { const s = document.querySelector('.bg-shop-panel'); return !!s && s.offsetParent !== null; })()`;
  const openShop = async (tag) => {
    await tap(first('.bg-shop-open'), `the shop's button (${tag})`);
    return until(SHEET, Boolean, 3000);
  };
  const closeShop = async (tag) => {
    if (await evaluate(SHEET)) await tap(first('.bg-shop-close'), `close the shop (${tag})`);
    await until(SHEET, (v) => !v, 2000);
  };
  const tabTap = (lang, t) => tap(byText('.bg-shop-tabs .bg-chip', w(lang, tabWord(t))), `tab ${t} (${lang})`);
  const TAB_READ = `(() => { const items = [...document.querySelectorAll('.bg-shop-items .bg-shop-item')].filter((e) => e.offsetParent !== null);
    const later = document.querySelector('.bg-shop-later'); const panel = document.querySelector('.bg-shop-panel').getBoundingClientRect();
    const sel = [...document.querySelectorAll('.bg-shop-tabs .bg-chip')].map((c) => [c.innerText.trim(), getComputedStyle(c).backgroundColor]);
    return { items: items.map((e) => ({ pic: (e.querySelector('.bg-shop-pic') || {}).innerText, price: (e.querySelector('.bg-shop-price') || {}).innerText, name: (e.querySelector('.bg-shop-name') || {}).innerText, line: (e.querySelector('.bg-shop-line') || {}).innerText, w: Math.round(e.getBoundingClientRect().width) })),
      later: later && later.offsetParent !== null ? later.innerText.trim() : '', tabs: sel.length, panel: [Math.round(panel.left), Math.round(panel.right)], vw: innerWidth, sw: document.documentElement.scrollWidth }; })()`;
  const itemTap = (name, label) => tap(byText('.bg-shop-items .bg-shop-item', name), label);
  const CARD = `(() => { const c = document.querySelector('.bg-shop-card'); if (!c || c.offsetParent === null) return null; const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : ''; };
    const vis = (s) => { const e = c.querySelector(s); return !!e && e.offsetParent !== null; };
    return { name: t('.bg-shop-card-name'), figs: [...c.querySelectorAll('.bg-shop-fig')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()), short: t('.bg-shop-short'), done: t('.bg-shop-done'), none: t('.bg-shop-none'), buy: vis('.bg-shop-buy'), use: vis('.bg-shop-use'), notNow: vis('.bg-shop-no'),
      nameBox: vis('input'), placeholder: (c.querySelector('input') || {}).placeholder || '', chips: [...c.querySelectorAll('.bg-shop-chips .bg-chip')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()) }; })()`;
  const card = () => until(CARD, Boolean, 3000);
  const shop = (id) => SHOP.find((s) => s.id === id);

  // ── BUTTON and TAB: every tab at the three widths, EN and FR ──
  for (const lang of ['en', 'fr']) {
    for (const [vp, size] of QUICK ? VIEWPORTS.filter(([v]) => v === '1368') : VIEWPORTS) {
      const tag = `${vp}-${lang}`;
      await page.setViewport(size);
      if (vp === (QUICK ? '1368' : '1024')) {
        await freshFamily(lang);
        await seed(32);
      } else {
        await page.navigate('/island');
        await wait(1500);
      }
      const btn = await until(BTN, (b) => !!b && b.text.includes('32'), 5000);
      readings[`button-${tag}`] = btn;
      await shot(`iw6h-${tag}-00-island`);
      check(`BUTTON ${tag}: the Island page's head carries "${w(lang, 'iw6hBtn', { n: 32 })}", whole in view${vp === '390' ? '' : ', level with the title'}`,
        !!btn && btn.text === w(lang, 'iw6hBtn', { n: 32 }) && btn.left >= 0 && btn.right <= btn.vw && (vp === '390' || (!!btn.h1 && btn.top < btn.h1[1] && btn.bottom > btn.h1[0])), btn);
      await openShop(tag);
      for (const t of TABS) {
        await tabTap(lang, t);
        await wait(400);
        const got = await evaluate(TAB_READ);
        readings[`tab-${tag}-${t}`] = got;
        await shot(`iw6h-${tag}-tab-${t}`);
        const inPage = got.sw <= got.vw + 1 && got.panel[0] >= 0 && got.panel[1] <= got.vw + 1;
        // P108 IW-007 (lane B): the Build tab sells its blueprints now, with its line on where a bought one goes.
        if (t === 'build') {
          const want = SHOP.filter((s) => s.tab === 'build');
          const same = got.items.length === want.length && want.every((s, i) => got.items[i].pic === s.icon && got.items[i].price === `🐚 ${s.price}` && got.items[i].name === s.name[lang] && got.items[i].line === s.line[lang]);
          check(`TAB ${tag} build: sells the ${want.length} blueprints (picture, price, name, line) and says "${w(lang, 'iw7bBuildHow')}"; inside the page`, same && got.later === w(lang, 'iw7bBuildHow') && got.tabs === 5 && inPage, got);
        } else if (t === 'animals') {
          const later = w(lang, t === 'build' ? 'iw6hLaterBuild' : 'iw6hLaterAnimals');
          check(`TAB ${tag} ${t}: says "${later}" and sells nothing yet; inside the page`, got.later === later && got.items.length === 0 && got.tabs === 5 && inPage, got);
        } else {
          const want = SHOP.filter((s) => s.tab === t && (t !== 'robots' || ['pip', 'cobble'].includes(s.robot)) && (t !== 'upgrades' || s.kind === 'brain' || s.id === 'can+' || s.id === 'basket+'));
          const same = got.items.length === want.length && want.every((s, i) => got.items[i].pic === s.icon && got.items[i].price === `🐚 ${s.price}` && got.items[i].name === s.name[lang] && got.items[i].line === s.line[lang]);
          check(`TAB ${tag} ${t}: ${want.length} items, each with its picture, price, name and line (${want.map((s) => s.id).join(', ')}); inside the page`, same && got.later === '' && inPage, { got, want: want.map((s) => s.id) });
        }
      }
      await closeShop(tag);
    }
  }

  // ── SHORT and BUY: a purchase end to end at each width (EN), and at 1368 in French ──
  const purchase = async (lang, vp, size) => {
    const tag = `${vp}-${lang}`;
    await page.setViewport(size);
    await freshFamily(lang);
    await seed(22);
    await openShop(tag);
    await tabTap(lang, 'robots');
    await itemTap(shop('robot:pip').name[lang], `a new Pip (${tag})`);
    const short = await card();
    await shot(`iw6h-${tag}-short`);
    readings[`short-${tag}`] = short;
    check(`SHORT ${tag}: 22 shells, a new Pip — "${w(lang, 'iw6hHave', { n: 22 })}", "${w(lang, 'iw6hCost', { n: 30 })}", "${w(lang, 'iw6hShort', { n: 8 })}"; no Buy, Not now`,
      !!short && short.figs.join('|') === [w(lang, 'iw6hHave', { n: 22 }), w(lang, 'iw6hCost', { n: 30 })].join('|') && short.short === w(lang, 'iw6hShort', { n: 8 }) && !short.buy && short.notNow && !short.nameBox, short);
    await tap(first('.bg-shop-no'), `Not now (${tag})`);
    const gone = await until(CARD, (c) => !c, 2000);
    check(`SHORT ${tag}: Not now puts the card away`, !gone, gone);
    await closeShop(tag);
    // 32 shells: the purchase.
    await writeStore(`a.shells = { earned: 32, spent: 0 }`);
    await openShop(tag);
    await tabTap(lang, 'robots');
    await itemTap(shop('robot:pip').name[lang], `a new Pip (${tag})`);
    const c = await card();
    await evaluate(`(() => { const el = document.querySelector('.bg-shop-card input'); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Bubbles'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await wait(300);
    await shot(`iw6h-${tag}-card`);
    await tap(first('.bg-shop-buy'), `Buy (${tag})`);
    const done = await until(CARD, (x) => !!x && !!x.done, 3000);
    const btn = await until(BTN, (b) => !!b && b.text.includes('🐚 2 '), 3000);
    await shot(`iw6h-${tag}-bought`);
    const st = await evaluate(STORE);
    const bubbles = st.island.robots.find((r) => r.name === 'Bubbles');
    readings[`buy-${tag}`] = { card: c, done, btn, shells: st.shells, bubbles };
    check(`BUY ${tag}: the card says ${w(lang, 'iw6hHave', { n: 32 })} · ${w(lang, 'iw6hCost', { n: 30 })} · ${w(lang, 'iw6hLeft', { n: 2 })}, a name box ("Pip 3"); Buy → "${w(lang, 'iw6hBought')}" alone on the card, the button ${w(lang, 'iw6hBtn', { n: 2 })}; the store spent 30 of 32 and a Pip named Bubbles`,
      !!c && c.figs.join('|') === [w(lang, 'iw6hHave', { n: 32 }), w(lang, 'iw6hCost', { n: 30 }), w(lang, 'iw6hLeft', { n: 2 })].join('|') && c.buy && c.nameBox && c.placeholder === 'Pip 3' && !!done && done.done === w(lang, 'iw6hBought') && done.figs.length === 0 && !done.short && !done.buy && !!btn && btn.text === w(lang, 'iw6hBtn', { n: 2 }) && st.shells.earned === 32 && st.shells.spent === 30 && !!bubbles && bubbles.kind === 'pip',
      readings[`buy-${tag}`]);
    await closeShop(tag);
    await page.navigate('/island');
    await wait(1600);
    const again = await until(BTN, Boolean, 4000);
    check(`BUY ${tag}: after a reload the balance is still ${w(lang, 'iw6hBtn', { n: 2 })} (AC2)`, !!again && again.text === w(lang, 'iw6hBtn', { n: 2 }), again);
  };
  for (const [vp, size] of QUICK ? VIEWPORTS.filter(([v]) => v === '1368') : VIEWPORTS) await purchase('en', vp, size);
  await purchase('fr', '1368', VIEWPORTS[1][1]);

  // ── BRAIN: the bigger brain for Pip; the Workshop's Blocks node holds 16 ──
  await page.setViewport(VIEWPORTS[1][1]);
  await freshFamily('en');
  await seed(40);
  await openShop('brain');
  await tabTap('en', 'upgrades');
  await itemTap(shop('brain16').name.en, 'a bigger brain');
  const bc = await card();
  await tap(byText('.bg-shop-card .bg-shop-chips .bg-chip', 'Pip · 12'), 'Pip · 12 blocks');
  await wait(300);
  const bc2 = await evaluate(CARD);
  await shot('iw6h-brain-card');
  await tap(first('.bg-shop-buy'), 'Buy the brain');
  await until(CARD, (x) => !!x && !!x.done, 3000);
  const bst = await evaluate(STORE);
  readings.brainCard = { bc, bc2, robots: bst.island.robots, shells: bst.shells };
  check('BRAIN: the card offers her three robots at 12 blocks; Pip chosen, Buy → Pip’s brain is 16 in the store, 25 spent', !!bc && bc.chips.length === 3 && bc.chips.every((x) => x.includes('12')) && !!bc2 && bc2.buy && bst.island.robots[0].brain === 16 && bst.shells.spent === 25, readings.brainCard);
  await closeShop('brain');
  // The Workshop: free play (Pip): 13 blocks placed (a 12-block brain refuses the 13th), the 17th refused and the line says 16.
  await tap(byText('.bg-quest', w('en', 'sandP').slice(0, 10)), 'free play');
  await until('location.pathname', (p) => p === '/workshop', 5000);
  await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal-head]')`, Boolean, 6000);
  await wait(900);
  const PROGRAM = `(() => { const p = Noodl.Variables.gardenProgram; const l = typeof p === 'string' ? JSON.parse(p || '[]') : p; return Array.isArray(l) ? l.length : -1; })()`;
  const CARD_UP = `(() => { const e = document.querySelector('.bg-card-help'); return !!e && e.offsetParent !== null; })()`;
  const palTap = async (id) => {
    await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal(${JSON.stringify(id)}); })()`);
    await wait(150);
    await tap(first(`.bg-blocks-box .gd-palette [data-pal-head="${id}"]`), `palette ${id}`);
    await wait(200);
    if (await evaluate(CARD_UP)) {
      await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
      await until(CARD_UP, (v) => v === false, 2000);
    }
  };
  const brainCtx = await evaluate(`(() => { const r = document.querySelector('.bg-blocks-box .gd-bk'); return r && r.__gardenBlocks && r.__gardenBlocks.ctx ? r.__gardenBlocks.ctx.brain : null; })()`);
  for (let k = 0; k < 13; k++) await palTap(k % 2 ? 'left' : 'fwd');
  const thirteen = await evaluate(PROGRAM);
  for (let k = 13; k < 17; k++) await palTap(k % 2 ? 'left' : 'fwd');
  await wait(400);
  const full = await evaluate(`({ n: (${PROGRAM}), line: ((document.querySelector('.bg-blocks-box .gd-bk-line[data-line="full"]') || {}).textContent || '').trim() })`);
  await shot('iw6h-brain-workshop-16');
  const fullLine = w('en', 'iw4Full').split('{b}').join('Pip').split('{n}').join('16');
  readings.brainWorkshop = { brainCtx, thirteen, full, fullLine };
  check(`BRAIN: the Workshop's Blocks node holds Pip's 16 — 13 blocks placed, the 17th refused with "${fullLine}"`, brainCtx === 16 && thirteen === 13 && full.n === 16 && full.line === fullLine, readings.brainWorkshop);

  // ── The helpers (AC4): each for exactly one job, then gone ──
  await page.setViewport(VIEWPORTS[1][1]);
  await freshFamily('en');
  await seed(40);
  await writeStore(`delete a.island.plots['path-stones']`);
  await until(`(() => { const s = Noodl.Variables.gardenIsland; return !!s && !!s.live && !!s.live['tulips-three'] && !!s.live['tulip-door'] && s.tick > 0; })()`, Boolean, 8000);
  const LIVE = (id) => `(() => { const s = Noodl.Variables.gardenIsland; const c = s && s.live && s.live[${JSON.stringify(id)}]; if (!c) return null; return { phase: c.phase, helper: c.helper || '', done: c.helperDone || '', can: c.robot.can, canMax: c.robot.canMax, basket: c.robot.basket, tick: s.tick, tulips: c.things.filter((t) => t.kind === 'tulip').map((t) => (t.have === undefined ? (t.watered ? 1 : 0) : t.have) + '/' + (t.need || 1)) }; })()`;
  const buyAndUse = async (id, plotId, robotName) => {
    await openShop(id);
    await tabTap('en', 'helpers');
    await itemTap(shop(id).name.en, shop(id).name.en);
    await card();
    await tap(first('.bg-shop-buy'), `Buy ${id}`);
    const held = await until(CARD, (x) => !!x && x.use !== undefined && x.chips.length > 0, 3000);
    await tap(byText('.bg-shop-card .bg-shop-chips .bg-chip', titleOf('en', plotId, robotName)), `${id}: the job ${plotId}`);
    await wait(300);
    await tap(first('.bg-shop-use'), `Use ${id}`);
    const used = await until(CARD, (x) => !!x && !!x.done, 3000);
    await shot(`iw6h-helper-${id}-used`);
    const st = await evaluate(STORE);
    await closeShop(id);
    return { held, used, owned: st.owned, live: (st.island.plots[plotId] || {}).live || null };
  };
  // RAIN first, on tulip-door (Pip 2's short job, before Pip 2 finishes it); then SELFCAN on tulips-three (Pip), watched to
  // its finish line; then BARROW on path-stones (pinned only then, so Cobble has not finished before the barrow is on).
  const before = await evaluate(LIVE('tulip-door'));
  const rn = await buyAndUse('rain', 'tulip-door', 'Pip 2');
  const after = await evaluate(LIVE('tulip-door'));
  await shot('iw6h-helper-rain-island');
  readings.rain = { before, rn, after };
  check('RAIN: bought and used on tulip-door from the card — its tulip full at once, never riding; gone from owned', !!before && before.tulips.some((t) => t.split('/')[0] !== t.split('/')[1]) && !!rn.used && rn.used.done === w('en', 'iw6hUsed', { what: shop('rain').name.en, plot: titleOf('en', 'tulip-door', 'Pip 2') }) && !!after && after.tulips.every((t) => t.split('/')[0] === t.split('/')[1]) && after.helper === '' && rn.owned.length === 0, readings.rain);
  const sc = await buyAndUse('selfcan', 'tulips-three', 'Pip');
  const scLive = [];
  let last = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    last = await evaluate(LIVE('tulips-three'));
    if (last) scLive.push(last);
    if (last && last.phase === 'wait') break;
    await wait(500);
  }
  await shot('iw6h-helper-selfcan-done');
  const riding = scLive.filter((x) => x.helper === 'selfcan');
  readings.selfcan = { sc, riding: riding.length, cans: [...new Set(riding.map((x) => x.can))], last };
  check('SELFCAN: bought and used on tulips-three from the card — gone from owned, riding on the job (island and save); Pip’s can full on every tick it rides; at the finish line Pip waits at home and the can is gone',
    !!sc.used && sc.used.done === w('en', 'iw6hUsed', { what: shop('selfcan').name.en, plot: titleOf('en', 'tulips-three', 'Pip') }) && sc.owned.length === 0 && !!sc.live && sc.live.helper === 'selfcan' && riding.length > 5 && riding.every((x) => x.can === x.canMax) && !!last && last.phase === 'wait' && last.helper === '', readings.selfcan);
  await writeStore(`a.island.plots['path-stones'] = { program: ${REF('path-stones')}, robotId: 'cobble', wonAt: 1 }`);
  await until(`(() => { const s = Noodl.Variables.gardenIsland; return !!s && !!s.live && !!s.live['path-stones']; })()`, Boolean, 6000);
  const own = await evaluate(LIVE('path-stones'));
  const bw = await buyAndUse('barrow', 'path-stones', 'Cobble');
  const bwLive = [];
  let lastB = null;
  const t1 = Date.now();
  while (Date.now() - t1 < 90000) {
    lastB = await evaluate(LIVE('path-stones'));
    if (lastB) bwLive.push(lastB);
    if (lastB && lastB.phase === 'wait') break;
    await wait(500);
  }
  await shot('iw6h-helper-barrow-done');
  const ridingB = bwLive.filter((x) => x.helper === 'barrow');
  readings.barrow = { own, bw, riding: ridingB.length, baskets: [...new Set(ridingB.map((x) => x.basket))], last: lastB };
  check('BARROW: used on path-stones — Cobble carries 8 while it rides; at the finish line it is gone and Cobble carries his own 4 again', !!own && own.basket === 4 && bw.owned.length === 0 && ridingB.length > 3 && ridingB.every((x) => x.basket === 8) && !!lastB && lastB.phase === 'wait' && lastB.helper === '' && lastB.basket === 4, readings.barrow);
  // The helpers tab: nothing held any more.
  await openShop('after');
  await tabTap('en', 'helpers');
  const heldAfter = await evaluate(`[...document.querySelectorAll('.bg-shop-items .bg-shop-tag')].filter((e) => e.offsetParent !== null).length`);
  await shot('iw6h-helpers-after');
  check('HELPERS: after the three jobs none is held (no “Ready to use”)', heldAfter === 0, heldAfter);
  await closeShop('after');

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
