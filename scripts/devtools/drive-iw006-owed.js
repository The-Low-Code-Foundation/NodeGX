#!/usr/bin/env node
/**
 * P108 IW-006 owed (session 5, lane O `iw006-owed`) — what session 4 owed, driven the way a child meets it on the DEPLOYED
 * template (the deploy `drive-all.sh` makes: `drive-cg003-pages.js assemble` + `nodegx-deploy.cjs`).
 *
 * The family is made the game's way: a new player on the page; the wins she did not play here recorded by the deployed
 * project's own `Logic/Complete request` (path-postbox, tulip-door — Pip's; the post box lends Cobble), a copy bought by
 * the project's own `buyItem` (the shop's one purchase rule; lane H's drive grades the shop itself), written into the
 * page's store. Every word, price and title is read from the deployed project — nothing is typed that another lane owns.
 *
 * Clauses:
 *   N1  (EN, 1024 × 768) path-stones built from the drawer (repeat 4 { go to nearest rock, repeat 4 { pick up }, go to
 *       nearest site, repeat 4 { put down } }) and played with Cobble → the win card: the thanks, the "+N 🐚" line, THEN
 *       "Now in the shop: a bigger hod, 🐚 N" — under the pay line, smaller than the thanks (principle 2).
 *   N2  Keep tinkering → Play again → the win card again with NO shop line (a replay shelves nothing).
 *   U1  My robots (EN 1024): Cobble's slot "Empty slot · … · in the island’s shop for 🐚 N" (the hod is on the shelf);
 *       Pip's "… in the shop after “<rows-trick>”, for 🐚 N"; the cards still to be lent the same; no slot names an
 *       islander. The island's shop lists the hod on Upgrades at the same price (the slot says what the shop shows).
 *   S1  My robots: Bubbles (a Pip copy at home) has a chip per job Pip's kind has won; a tap on the post box → Bubbles
 *       works it (the line on HIS card, his chip ringed, the store pins the plot to him); the island's plot card says
 *       "Bubbles works here". A tap on the tulip door → he helps Pip there; tapped again → home.
 *   N3/U2/S2  the same in French at 1368 × 900 (a fresh family): the win card's line, the slots, a send.
 *   S3  My robots at 390 × 844 (FR): the send chips wrap inside the card, no sideways scroll.
 *   E   0 console errors, 0 network errors.
 *
 * Usage: node scripts/devtools/drive-iw006-owed.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]
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
  console.error('usage: drive-iw006-owed.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

// ── What the deployed project says ──
function nodesOf(component) {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
}
const staticRows = (c) => JSON.parse(nodesOf(c).find((n) => n.type === 'Static Data').parameters.json);
const functionScript = (c) => String(nodesOf(c).find((n) => n.type === 'JavaScriptFunction').parameters.functionScript);
const pageRun = (c, inputs, tail = '') => {
  const out = {};
  // eslint-disable-next-line no-new-func
  new Function('Inputs', 'Outputs', functionScript(c) + tail)(JSON.parse(JSON.stringify(inputs)), out);
  return out;
};
const WORD_ROWS = staticRows('Data/Words');
const WORDS = { en: {}, fr: {} };
for (const r of WORD_ROWS) {
  WORDS.en[r.key] = r.en;
  WORDS.fr[r.key] = r.fr;
}
const fill = (text, vars) => Object.entries(vars).reduce((t, [k, v]) => t.split(`{${k}}`).join(String(v)), String(text));
const w = (lang, key, vars = {}) => fill(String(WORDS[lang][key] || ''), vars);
const REQUESTS = staticRows('Data/Requests');
const req = (id) => REQUESTS.find((r) => r.id === id);
const titleOf = (lang, id) => w(lang, req(id).copyKeys.title).split('{b}').join('Pip');
/** The save helpers out of the page's own scripts: the purchase rule, the wallet, the catalogue, the upgrades. */
const SAVE = pageRun('Logic/Bring home', { model: {} }, '\n;Outputs.buyItem = buyItem; Outputs.earnShells = earnShells; Outputs.modelOf = modelOf; Outputs.SHOP = SHOP; Outputs.UPGRADES = UPGRADES;');
const SHOP = SAVE.SHOP;
const price = (id) => SHOP.find((i) => i.id === id).price;
const shopName = (lang, id) => SHOP.find((i) => i.id === id).name[lang];
const UP_WORD = { 'can+': 'ig5UpCan', 'basket+': 'ig5UpBasket', boots: 'ig5UpBoots' };
const ISLANDER_NAMES = ['islMamie', 'islSami', 'islBiscuit'].flatMap((k) => [w('en', k), w('fr', k)]).filter(Boolean);
const upOf = (id) => SAVE.UPGRADES.find((u) => u.id === id);
/** The win card's shop line for an upgrade (Logic/Shop news's words). */
const newsLine = (lang, upId) => {
  const nm = shopName(lang, upId);
  return w(lang, 'iw6oNews', { what: w(lang, 'iw6oNewsItem', { up: nm.charAt(0).toLowerCase() + nm.slice(1), n: price(upId) }) });
};
/** A slot as Robot cards writes it, empty: on the shelf, or still after its request. */
const slotShelf = (lang, upId) => w(lang, 'iw6oUpShop', { up: w(lang, UP_WORD[upId]), n: price(upId) });
const slotLater = (lang, upId) => w(lang, 'iw6oUpLater', { up: w(lang, UP_WORD[upId]), n: price(upId), q: titleOf(lang, upOf(upId).unlockedBy) });

const win = (model, id, robotId = 'r1') =>
  pageRun('Logic/Complete request', { model, requestId: id, tricks: req(id).tricks, reward: req(id).reward, program: JSON.stringify(req(id).referenceProgram), robotId, now: 1759300000000 }).model;
function buyCopy(model, name) {
  const p = model.profiles.find((x) => x.id === model.island.activeId);
  SAVE.earnShells(p, price('robot:pip'));
  const out = SAVE.buyItem(p, 'robot:pip', { name });
  if (!out.ok) throw new Error(`buy ${name}: ${out.error}`);
  return out.robotId;
}

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
  // A stub Olive (path-stones does not ask her; the status call is answered so the page is quiet).
  client.on((msg) => {
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId } = msg.params;
      const body = { model: 'ready', reason: '', gpu: false, loadMs: 1, lastMs: 1, asked: 0, fallbacks: 0, busy: false, queued: 0, exam: { at: '2026-09-28T00:00:00.000Z', ms: 1, passed: 20, failed: 0, rungs: {} }, ok: true, text: 'stub', ms: 1 };
      client.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
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
  const STORE_KEY = `Object.keys(localStorage).find((x) => /bot-garden/.test(x))`;
  const stored = () => evaluate(`(() => { const k = ${STORE_KEY}; if (!k) return null; try { const v = JSON.parse(localStorage.getItem(k)); return v.model || v; } catch (e) { return null; } })()`);
  const store = (model) => evaluate(`(() => { const k = ${STORE_KEY}; const v = JSON.parse(localStorage.getItem(k)); v.model = ${JSON.stringify(model)}; localStorage.setItem(k, JSON.stringify(v)); return true; })()`);
  const activeOf = (m) => (m && Array.isArray(m.profiles) ? m.profiles.find((p) => p.id === (m.island || {}).activeId) : null);
  const freshFamily = async () => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
  };
  const newPlayer = async (name, lang) => {
    await tap(first('button.bg-profile-new'), `new player ${name}`);
    await until(`[...document.querySelectorAll('input')].some((e) => e.offsetParent !== null)`, Boolean, 6000);
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, ${JSON.stringify(name)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    await tap(byText('.bg-seg-btn', '10–12'), 'band 10–12 in the form');
    await tap(byText('button.bg-btn', w('en', 'create')), 'create');
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    if (lang === 'fr') {
      await seg('FR');
      await wait(800);
    }
  };

  // ── The drawer (drive-cg003-pages.js's own helpers, lane S's stones) ──
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
  const blockAt = (id) => `${BK}.__gardenBlocks.workspace().getBlockById(${JSON.stringify(String(id))})`;
  const fieldOf = (id, field) => `((b) => { const f = b && b.getField(${JSON.stringify(field)}); return f && f.getSvgRoot ? f.getSvgRoot() : null; })(${blockAt(id)})`;
  const newest = (t) => evaluate(`(() => { const l = [...document.querySelectorAll('.bg-blocks-box .gd-prog .gd-blk[data-t="${t}"]')].map((e) => Number(e.getAttribute('data-id'))).filter((n) => isFinite(n)); return l.length ? String(Math.max(...l)) : ''; })()`);
  const select = async (id) => {
    const sel = () => evaluate(`((b) => { const r = b && b.getSvgRoot(); return r ? r.getAttribute('data-sel') : ''; })(${blockAt(id)})`);
    for (let k = 0; k < 3 && (await sel()) !== '1'; k++) await tap(fieldOf(id, 'WORD'), `take the repeat ${id}`);
  };
  const slot = async (id, field, opt) => {
    await tap(fieldOf(id, field), `${field} of ${id}`);
    await wait(200);
    await tap(first(`.bg-blocks-box .gd-picker .gd-opt[data-opt="${opt}"]`), `${opt}`);
  };
  const buildStones = async () => {
    await palTap('repeat');
    const r1 = await newest('repeat');
    await slot(r1, 'N', '4');
    await select(r1);
    await palTap('go_nearest');
    await slot(await newest('go_nearest'), 'KIND', 'rock');
    await select(r1);
    await palTap('repeat');
    const r2 = await newest('repeat');
    await slot(r2, 'N', '4');
    await select(r2);
    await palTap('pick');
    await select(r1);
    await palTap('go_nearest');
    await slot(await newest('go_nearest'), 'KIND', 'site');
    await select(r1);
    await palTap('repeat');
    const r3 = await newest('repeat');
    await slot(r3, 'N', '4');
    await select(r3);
    await palTap('put');
    if (await evaluate(CARD_UP)) await tap(first('.bg-card-help .bg-card-ok'), 'Got it (the stones)');
    return evaluate(`(() => { const p = Noodl.Variables.gardenProgram; return typeof p === 'string' ? JSON.parse(p || '[]') : p || []; })()`);
  };
  const countBlocks = (list) => (Array.isArray(list) ? list : []).reduce((n, b) => n + 1 + countBlocks(b.body), 0);
  const WIN_UP = `(() => { const e = document.querySelector('.bg-win-card'); return !!e && e.offsetParent !== null; })()`;
  /** The win card as a child sees it: the thanks (its biggest words), the pay line, the shop line — sizes and tops. */
  const WIN = `(() => { const c = document.querySelector('.bg-win-card'); if (!c || c.offsetParent === null) return { up: false };
    const texts = [...c.querySelectorAll('*')].filter((e) => e.offsetParent !== null && e.children.length === 0 && e.innerText && e.innerText.trim());
    const big = texts.map((e) => ({ t: e.innerText.trim(), fs: parseFloat(getComputedStyle(e).fontSize), top: e.getBoundingClientRect().top })).sort((a, b) => b.fs - a.fs)[0] || null;
    const line = (s) => { const p = c.querySelector(s); return p && p.offsetParent !== null && p.innerText.trim() ? { t: p.innerText.trim(), fs: parseFloat(getComputedStyle(p).fontSize), top: p.getBoundingClientRect().top } : null; };
    return { up: true, thanks: big, pay: line('.bg-win-pay'), shop: line('.bg-win-shop') }; })()`;

  /** N1/N2 (and N3 in French): Cobble wins path-stones in the Workshop; the win card; then a replay. */
  async function stonesWin(lang, tag) {
    let m = await stored();
    m = win(m, 'path-postbox');
    m = win(m, 'tulip-door');
    await store(m);
    await page.navigate('/island');
    await wait(1200);
    await tap(byText('.bg-quest', titleOf(lang, 'path-stones')), 'open path-stones');
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal="fwd"]')`, Boolean, 8000);
    await wait(900);
    const built = await buildStones();
    await control('play');
    const won = await until(WIN_UP, Boolean, 120000);
    const card = await until(WIN, (v) => !!v.shop || !v.up, 5000);
    await wait(400);
    const card2 = await evaluate(WIN);
    readings[`n1-${tag}`] = { blocks: countBlocks(built), won, card: card2 };
    await shot(`iw6o-${tag}-win-shop`);
    const want = newsLine(lang, 'basket+');
    check(`N1 ${tag}: path-stones built from the drawer (${countBlocks(built)} blocks) and won with Cobble → the win card says “${want}” — after the thanks and the pay line, smaller than the thanks`,
      !!won && card2.up && !!card2.shop && card2.shop.t === want && !!card2.thanks && card2.shop.fs < card2.thanks.fs && !!card2.pay && card2.shop.top > card2.pay.top && card2.pay.top > card2.thanks.top, { card: card2, want, first: card });
    // N2: a replay shelves nothing.
    await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
    await wait(600);
    await control('play');
    const won2 = await until(WIN_UP, Boolean, 120000);
    await wait(1500);
    const again = await evaluate(WIN);
    readings[`n2-${tag}`] = again;
    await shot(`iw6o-${tag}-win-replay`);
    check(`N2 ${tag}: Keep tinkering → Play again → the win card again with NO shop line (and no pay line: done and not worn)`, !!won2 && again.up && again.shop === null && again.pay === null, again);
    await tap(byText('.bg-win-card button', w(lang, 'winStay')), 'Keep tinkering');
    await wait(400);
  }

  const CARDS = `[...document.querySelectorAll('.bg-robot-card')].filter((c) => c.offsetParent !== null).map((c) => { const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : null; }; const inp = c.querySelector('input'); return { name: inp && inp.offsetParent !== null ? inp.value : t('h3'), up: t('.bg-robot-up'), where: t('.bg-robot-where'), send: [...c.querySelectorAll('.bg-robot-send .bg-chip')].filter((e) => e.offsetParent !== null).map((e) => ({ t: e.innerText.trim(), bg: getComputedStyle(e).backgroundColor })), sendWord: t('.bg-robot-send .bg-caps'), said: t('.bg-robot-said'), locked: c.className.includes('bg-robot-locked'), cls: c.className }; })`;
  const cardNamed = (name) => `[...document.querySelectorAll('.bg-robot-card')].find((c) => c.offsetParent !== null && ((c.querySelector('input') || {}).value === ${JSON.stringify(name)}))`;
  const sendChip = (name, title) => `[...(${cardNamed(name)}).querySelectorAll('.bg-robot-send .bg-chip')].find((e) => e.offsetParent !== null && e.innerText.trim() === ${JSON.stringify(title)})`;
  const openRobots = async () => {
    await tab(2);
    await until('location.pathname', (p) => p === '/robot');
    await until(`document.querySelectorAll('.bg-robot-card').length`, (n) => n >= 4, 8000);
    await wait(900);
  };

  /** U1/U2: the slots on My robots, and the shop that agrees. */
  async function slots(lang, tag) {
    await openRobots();
    const cards = await evaluate(CARDS);
    const of = (cls) => cards.find((c) => c.cls.includes(`bg-robot-${cls}`));
    const pip = of('pip'), cobble = of('cobble'), pocket = of('pocket'), echo = of('echo');
    readings[`u-${tag}`] = cards.map((c) => ({ name: c.name, up: c.up }));
    const noIslander = cards.every((c) => !!c.up && !ISLANDER_NAMES.some((n) => c.up.includes(n)));
    await evaluate(`(() => { const c = [...document.querySelectorAll('.bg-robot-card')].find((x) => x.className.includes('bg-robot-cobble')); if (c) c.querySelector('.bg-robot-up').scrollIntoView({ block: 'center' }); })()`);
    await wait(300);
    await shot(`iw6o-${tag}-robots-slot`);
    check(`U ${tag}: My robots — Cobble’s slot “${slotShelf(lang, 'basket+')}” (on the shelf: path-stones done); Pip’s “${slotLater(lang, 'can+')}”; Pocket’s and Echo’s (still to be lent) the same way; no slot names an islander`,
      !!cobble && cobble.up === slotShelf(lang, 'basket+') && !!pip && pip.up === slotLater(lang, 'can+') && !!pocket && pocket.up === slotLater(lang, 'boots') && !!echo && echo.up === slotLater(lang, 'can+') && noIslander, readings[`u-${tag}`]);
    // The shop agrees: the hod on its Upgrades tab at that price.
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(900);
    await tap(first('.bg-shop-open'), 'the shop');
    await tap(byText('.bg-shop-tabs .bg-chip', w(lang, 'iw6hTabUpgrades')), 'Upgrades');
    await wait(500);
    const items = await evaluate(`[...document.querySelectorAll('.bg-shop-item')].filter((e) => e.offsetParent !== null).map((e) => ({ name: (e.querySelector('.bg-shop-name') || {}).innerText, price: (e.querySelector('.bg-shop-price') || {}).innerText }))`);
    readings[`u-shop-${tag}`] = items;
    check(`U ${tag}: the island’s shop lists “${shopName(lang, 'basket+')}” on Upgrades at 🐚 ${price('basket+')} — what Cobble’s slot says — and not the bigger can (Pip’s slot says “after”)`, items.some((i) => i.name === shopName(lang, 'basket+') && i.price === `🐚 ${price('basket+')}`) && !items.some((i) => i.name === shopName(lang, 'can+')), items);
    await tap(first('.bg-shop-close'), 'close the shop');
  }

  /** S1/S2: Bubbles sent from his card. */
  async function send(lang, tag) {
    let m = await stored();
    buyCopy(m, 'Bubbles');
    await store(m);
    await page.navigate('/robot');
    await until(`document.querySelectorAll('.bg-robot-card').length`, (n) => n >= 5, 8000);
    await wait(1200);
    const post = titleOf(lang, 'path-postbox'), door = titleOf(lang, 'tulip-door');
    const before = (await evaluate(CARDS)).find((c) => c.name === 'Bubbles');
    check(`S ${tag}: Bubbles’s card — “${w(lang, 'iw6oSendTo', { r: 'Bubbles' })}”, a chip per job Pip’s kind has won (${post}; ${door}), none ringed`, !!before && !!before.sendWord && before.sendWord.toLowerCase() === w(lang, 'iw6oSendTo', { r: 'Bubbles' }).toLowerCase() && before.send.map((c) => c.t).join('|') === [post, door].join('|') && before.send.every((c) => c.bg === before.send[0].bg), before);
    // Works: the post box (Pip left it for the tulip door).
    await tap(sendChip('Bubbles', post), `Bubbles → ${post}`);
    const said = await until(`(() => { const c = ${cardNamed('Bubbles')}; const s = c && c.querySelector('.bg-robot-said'); return s && s.offsetParent !== null ? s.innerText.trim() : ''; })()`, (t) => !!t, 5000);
    await wait(600);
    const after = (await evaluate(CARDS)).find((c) => c.name === 'Bubbles');
    const st = activeOf(await stored());
    const bubbles = st.island.robots.find((r) => r.name === 'Bubbles');
    readings[`s-works-${tag}`] = { said, after, plot: st.island.plots['path-postbox'] };
    await evaluate(`(() => { const c = ${cardNamed('Bubbles')}; if (c) c.querySelector('.bg-robot-send').scrollIntoView({ block: 'center' }); })()`);
    await wait(300);
    await shot(`iw6o-${tag}-robots-sent`);
    const ringed = after && after.send.find((c) => c.t === post), plain = after && after.send.find((c) => c.t === door);
    check(`S ${tag}: a tap on “${post}” → “${w(lang, 'iw6oSentTo', { r: 'Bubbles', plot: post })}” on Bubbles’s card, his chip ringed; the store pins the post box to him (the crew’s rule: he runs the plot’s own program)`, said === w(lang, 'iw6oSentTo', { r: 'Bubbles', plot: post }) && !!ringed && !!plain && ringed.bg !== plain.bg && !!bubbles && st.island.plots['path-postbox'].robotId === bubbles.id, readings[`s-works-${tag}`]);
    // The island: the post box's card says Bubbles works there.
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(1200);
    const pr = req('path-postbox');
    await tap(`document.querySelector('.bg-isle .gd-cell[data-x="${pr.plot.x + 4}"][data-y="${pr.plot.y + 2}"]')`, `the post box's plot`);
    const here = await until(`(() => { const e = document.querySelector('.bg-plot-card .bg-crew-here'); return e && e.offsetParent !== null ? e.innerText.trim() : ''; })()`, (t) => !!t, 5000);
    readings[`s-island-${tag}`] = here;
    await shot(`iw6o-${tag}-island-card`);
    check(`S ${tag}: on the island the post box’s card says “${w(lang, 'iw8cWorks', { r: 'Bubbles' })}”`, here.includes(w(lang, 'iw8cWorks', { r: 'Bubbles' })), here);
    if (lang === 'fr') return;
    // Helps: the tulip door, where Pip works; then tapped again: home.
    await openRobots();
    await tap(sendChip('Bubbles', door), `Bubbles → ${door}`);
    const helps = await until(`(() => { const c = ${cardNamed('Bubbles')}; const s = c && c.querySelector('.bg-robot-said'); return s && s.offsetParent !== null ? s.innerText.trim() : ''; })()`, (t) => t === w(lang, 'iw6oHelpsOn', { r: 'Bubbles', m: 'Pip', plot: door }), 5000);
    await wait(600);
    const st2 = activeOf(await stored());
    const b2 = st2.island.robots.find((r) => r.name === 'Bubbles');
    check(`S ${tag}: a tap on “${door}” → “${w(lang, 'iw6oHelpsOn', { r: 'Bubbles', m: 'Pip', plot: door })}”; the store: he helps there, the post box nobody’s`, helps === w(lang, 'iw6oHelpsOn', { r: 'Bubbles', m: 'Pip', plot: door }) && !!b2 && b2.helps === 'tulip-door' && st2.island.plots['path-postbox'].robotId === '', { helps, b2, post: st2.island.plots['path-postbox'] });
    await tap(sendChip('Bubbles', door), `Bubbles → ${door} again`);
    const home = await until(`(() => { const c = ${cardNamed('Bubbles')}; const s = c && c.querySelector('.bg-robot-said'); return s && s.offsetParent !== null ? s.innerText.trim() : ''; })()`, (t) => t === w(lang, 'iw8cGoneHome', { r: 'Bubbles' }), 5000);
    await wait(600);
    const b3 = activeOf(await stored()).island.robots.find((r) => r.name === 'Bubbles');
    const where = (await evaluate(CARDS)).find((c) => c.name === 'Bubbles');
    check(`S ${tag}: tapped again → “${w(lang, 'iw8cGoneHome', { r: 'Bubbles' })}”, he helps nowhere, his card says “${w(lang, 'ig5AtHome')}”`, home === w(lang, 'iw8cGoneHome', { r: 'Bubbles' }) && !!b3 && !b3.helps && !!where && where.where === w(lang, 'ig5AtHome'), { home, b3, where: where && where.where });
  }

  // ── English, 1024 × 768 ──
  await page.setViewport({ width: 1024, height: 768, mobile: false });
  await freshFamily();
  await newPlayer('Ada', 'en');
  await stonesWin('en', '1024-en');
  await slots('en', '1024-en');
  await send('en', '1024-en');

  // ── French, 1368 × 900 (a fresh family) ──
  await page.setViewport({ width: 1368, height: 900, mobile: false });
  await freshFamily();
  await newPlayer('Léa', 'fr');
  await stonesWin('fr', '1368-fr');
  await slots('fr', '1368-fr');
  await send('fr', '1368-fr');

  // ── S3: the phone (FR): the send chips wrap inside the card, no sideways scroll ──
  await page.setViewport({ width: 390, height: 844, mobile: true });
  await openRobots();
  const phone = await evaluate(`(() => { const vw = document.documentElement.clientWidth; const cs = [...document.querySelectorAll('.bg-robot-send')].filter((e) => e.offsetParent !== null); const chips = cs.flatMap((s) => [...s.querySelectorAll('.bg-chip')].filter((e) => e.offsetParent !== null)); return { vw, sideways: document.scrollingElement.scrollWidth > vw + 1, sends: cs.length, chips: chips.length, outside: chips.filter((e) => { const r = e.getBoundingClientRect(); return r.left < -1 || r.right > vw + 1; }).length }; })()`);
  await evaluate(`(() => { const s = [...document.querySelectorAll('.bg-robot-send')].find((e) => e.offsetParent !== null); if (s) s.scrollIntoView({ block: 'center' }); })()`);
  await wait(300);
  await shot('iw6o-390-fr-robots-send');
  readings.s3 = phone;
  check('S3 (390 × 844, FR): My robots’ send chips are inside the page — no sideways scroll, every chip within the width', phone.sends >= 2 && phone.chips >= 2 && !phone.sideways && phone.outside === 0, phone);

  check('E: 0 console errors through the whole drive', page.consoleErrors.length === 0, page.consoleErrors.slice(0, 5));
  check('E: 0 network errors through the whole drive', page.networkErrors.length === 0, page.networkErrors.slice(0, 5));
  return { dir: DIR, results, readings, consoleErrors: page.consoleErrors.slice(), networkErrors: page.networkErrors.slice() };
})
  .then((out) => {
    if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1));
    const failed = out.results.filter((r) => !r.ok).length;
    console.log(`\n${out.results.length - failed}/${out.results.length} clauses passed`);
    process.exit(failed ? 1 : 0);
  })
  .catch((e) => {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  });
