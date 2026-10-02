#!/usr/bin/env node
/**
 * P108 IW-003 (session 4, lane L) — the seven look items session 3 left open (IW-003 §7 "Open after the merge"), driven
 * on the DEPLOYED template (the deploy `drive-pages.sh` makes: `drive-cg003-pages.js assemble` + `nodegx deploy`).
 * Every clause reads what a child sees on the page (the Blockly workspace's own boxes, the drawer's own blocks, the
 * owl's line, the pad's and the world's rectangles, the island's islanders), never only the engine's state.
 *
 * Clauses:
 *   FIT <vp>-<lang> <id>   (item 1) each request's REFERENCE program, loaded into the Workshop's workspace, is whole in
 *          the view at 1024 × 768, 1368 × 900 and 390 × 844, EN and FR: every block's outline inside the view beside (or
 *          above) the drawer, and never smaller than the fit's floor. The widest one's screenshot at each size.
 *   READ <vp>-<lang> <id>  (item 2) the envelopes' read block — in the drawer, on the pad's key and on its card — reads
 *          the envelope ("read the envelope" / « lire l’enveloppe »); Mamie's note keeps "read the note" (the control).
 *   SEEK <vp>-<lang> <id>  (item 3) the drawer's "go to nearest" starts on the first thing THIS request's job seeks
 *          (the kind of its reference program's first go to nearest): rock on the stones and the bench, egg on the eggs.
 *   PAD 390-<lang> <id>    (item 4) on the phone, with the pad up (Drive), no key of the pad lies over the world, and
 *          sami-thanks' door (Mamie Rose's, where the letter goes) is the thing under its own centre; AC4 still holds
 *          on the tulips (Play and the owl on the first screen, no sideways scroll).
 *   HINT <lang>            (item 5) after a run that puts ONE egg in the eggs' basket, the owl counts what fills the
 *          basket ("N of 4 done", N the basket's eggs), not its one target ("0 of 1 done").
 *   SAMI <case>            (item 7) one Sami on the island: his bench built (won; won with his other requests done;
 *          pinned and at work), counted as every Sami sprite the island draws (standing by a plot, sitting on the bench).
 *   (item 6, the kits' full meter, is graded on the kits themselves: `tests/iwLook.test.ts` and the kit fixture drives.)
 *   0 console errors, 0 network errors.
 *
 * Seams the drive names: the robots a family owns (Cobble, Echo and Pocket lent, as the lane drives do); the program put
 * in the Workshop's `gardenProgram` Variable (what the block list edits — a child builds the same by taps: lane drives);
 * the SAMI cases' `done` / `plots` written into the save.
 *
 * Usage: node scripts/devtools/drive-iw-look.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>]
 *        [--only fit,read,seek,pad,hint,sami]
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
const ONLY = (arg('--only') || 'fit,read,seek,pad,hint,sami').split(',');
/** --vps 1024,390 and --langs en: a subset of FIT/READ/SEEK's sizes and languages (every one when absent). */
const VPS = (arg('--vps') || '1024,1368,390').split(',');
const LANGS_RUN = (arg('--langs') || 'en,fr').split(',');
/** --ids wall-until,eggs-count: only these requests in FIT/READ/SEEK (every one when absent). */
const IDS = arg('--ids') ? arg('--ids').split(',') : null;
if (!DIR || DIR.startsWith('--')) {
  console.error('usage: drive-iw-look.js <deploy-dir> --project <project-dir> [--shots <dir>] [--json <file>] [--only …]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const nodesOfComponent = (dir) => {
  const nodes = JSON.parse(fs.readFileSync(path.join(PROJECT, 'components', ...dir.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(nodes) ? nodes : nodes.nodes || Object.values(nodes);
};
const tableOf = (component) => JSON.parse(nodesOfComponent(`Data/${component}`).find((n) => n.type === 'Static Data').parameters.json);
const WORD_ROWS = tableOf('Words');
const HINT_ROWS = tableOf('Hints');
const REQUESTS = tableOf('Requests');
const REQ = (id) => REQUESTS.find((r) => r.id === id);
const fillIn = (t, name, vars) => {
  let s = String(t || '').split('{b}').join(name);
  for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
};
const w = (lang, key, name = 'Pip', vars = {}) => fillIn((WORD_ROWS.find((r) => r.key === key) || {})[lang], name, vars);
const hint = (lang, key, name, vars = {}) => fillIn((HINT_ROWS.find((r) => r.key === key) || {})[lang], name, vars);
const titleOf = (lang, id) => w(lang, (REQ(id) || { copyKeys: {} }).copyKeys.title);
/** The fit's floor (blocks.js FIT_MIN): a program shown smaller than this is not one a child reads. */
const FIT_FLOOR = 0.5;
/** With the drawer at the foot (a phone, or flipped there): the zoom's own minScale (blocks.js FIT_MIN_STRIP). */
const FIT_FLOOR_STRIP = 0.45;
/** The kind of a program's first go to nearest (depth first): what the job seeks first. */
const firstSeek = (list) => {
  for (const b of list || []) {
    if (b.t === 'go_nearest' && b.slots && b.slots.kind) return b.slots.kind;
    const inner = firstSeek(b.body);
    if (inner) return inner;
  }
  return null;
};
const count = (l) => (l || []).reduce((n, b) => n + 1 + count(b.body), 0);
const BOT = { r1: 'Pip', cobble: 'Cobble', echo: 'Echo', pocket: 'Pocket' };
const botOf = (id) => BOT[(REQ(id) || {}).needs || 'r1'] || 'Pip';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const readings = {};
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${typeof saw === 'string' ? saw : JSON.stringify(saw)}`}`);
};

const VIEWPORTS = { 1024: { width: 1024, height: 768, mobile: false }, 1368: { width: 1368, height: 900, mobile: false }, 390: { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 } };

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
  const BK = `document.querySelector('.bg-blocks-box .gd-bk')`;
  const writeStore = async (fnBody, to = '/island') => {
    await evaluate(`(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); const m = v.model; const a = m.profiles.find((p) => p.id === m.island.activeId); ${fnBody}; localStorage.setItem(k, JSON.stringify(v)); })()`);
    await page.navigate(to);
    await wait(1400);
  };

  const freshFamily = async (lang, band = '10–12') => {
    const origin = await evaluate('location.origin');
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,indexeddb,cache_storage,service_workers' });
    await page.navigate('/');
    await wait(900);
    if (lang === 'fr') {
      await seg('FR');
      await wait(600);
    }
    await tap(first('button.bg-profile-new'), `new player (${lang})`);
    await until(`[...document.querySelectorAll('input')].some((e) => e.offsetParent !== null)`, Boolean, 6000);
    await evaluate(`(() => { const el = [...document.querySelectorAll('input')].find((e) => e.offsetParent !== null); el.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, 'Ada'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); })()`);
    await wait(250);
    await tap(byText('.bg-seg-btn', band), `band ${band} in the form`);
    await tap(byText('button.bg-btn', w(lang, 'create')), 'create');
    await until('location.pathname', (p) => p === '/island');
    await wait(700);
    // Seam: Cobble, Echo and Pocket lent (the island's lend chain is drive-ig005-robots.js's to grade).
    await writeStore(`a.island.robots = a.island.robots || [{ id: 'r1' }]; for (const kind of ['cobble', 'echo', 'pocket']) if (!a.island.robots.some((r) => (r.kind || r.id) === kind)) a.island.robots.push({ id: kind, kind })`);
  };
  const openQuest = async (lang, id) => {
    await tab(0);
    await until('location.pathname', (p) => p === '/island');
    await wait(600);
    const ok = await tap(byText('.bg-quest', titleOf(lang, id)), `open ${id} (${lang})`);
    if (!ok) return false;
    await until('location.pathname', (p) => p === '/workshop');
    await until(`!!document.querySelector('.bg-blocks-box .gd-palette [data-pal-head]')`, Boolean, 8000);
    await wait(900);
    return true;
  };
  /** Seam: the program a child would build, put where the block list puts it; the workspace loads and fits it. */
  const putProgram = async (list) => {
    await evaluate(`(() => { Noodl.Variables.gardenProgram = ${JSON.stringify(JSON.stringify(list))}; })()`);
    await wait(1400);
  };

  /** The program whole in view: every placed block's own outline inside the workspace's view (beside or above the drawer). */
  const WHOLE = `(() => { const r = ${BK}; const ws = r.__gardenBlocks.workspace(); const mm = ws.getMetricsManager(); const svg = ws.getParentSvg().getBoundingClientRect(); const abs = mm.getAbsoluteMetrics(); const view = mm.getViewMetrics();
    const L = svg.left + abs.left, T = svg.top + abs.top, R = L + view.width, B = T + view.height;
    const start = ws.getTopBlocks(false).find((b) => b.type === 'garden_start'); const all = start ? start.getDescendants(false).filter((b) => !b.isShadow()) : [];
    const blocks = all.map((b) => { const p = b.getSvgRoot().querySelector(':scope > .blocklyPath'); const q = (p || b.getSvgRoot()).getBoundingClientRect(); return { t: b.type.replace('garden_', ''), l: Math.round(q.left), r: Math.round(q.right), w: Math.round(q.width) }; });
    const cut = blocks.filter((b) => b.l < L - 1 || b.r > R + 1);
    const stack = blocks.length ? { l: Math.min(...blocks.map((b) => b.l)), r: Math.max(...blocks.map((b) => b.r)) } : null;
    return { view: { L: Math.round(L), R: Math.round(R), T: Math.round(T), B: Math.round(B), w: Math.round(view.width) }, flyout: Math.round(abs.left), flyoutTop: Math.round(abs.top), scale: +ws.scale.toFixed(2), n: blocks.length, cut, stack, stackW: stack ? stack.r - stack.l : 0, pageW: innerWidth, snug: r.classList.contains('gd-snug'), narrow: r.classList.contains('gd-narrow'), strip: !!ws.horizontalLayout }; })()`;
  /** The drawer's own blocks: go to nearest's kind (value and the word shown) and Olive's read's words. */
  const DRAWER = `(() => { const r = ${BK}; const ws = r.__gardenBlocks.workspace(); const fly = ws.getFlyout(); const fws = fly && fly.getWorkspace(); const tops = fws ? fws.getTopBlocks(false) : [];
    const gn = tops.find((b) => b.type === 'garden_go_nearest'); const f = gn && gn.getField('KIND');
    const rd = tops.find((b) => b.type === 'garden_olive' && /read/.test(JSON.stringify(b.saveExtraState ? b.saveExtraState() : {})));
    const key = [...document.querySelectorAll('.bg-key-olive-read')].find((e) => e.offsetParent !== null);
    return { seek: f ? f.getValue() : null, seekText: f ? f.getText() : null, read: rd ? rd.getSvgRoot().textContent.replace(/\\s+/g, ' ').trim() : null, readKey: key ? key.textContent.trim() : null }; })()`;

  // ── FIT (item 1), READ (item 2), SEEK (item 3): every request, at the three sizes, EN and FR ──
  const FIT_IDS = REQUESTS.filter((r) => Array.isArray(r.referenceProgram) && r.referenceProgram.length).map((r) => r.id);
  if (ONLY.some((o) => ['fit', 'read', 'seek'].includes(o))) {
    for (const vp of VPS) {
      for (const lang of LANGS_RUN) {
        await page.setViewport(VIEWPORTS[vp]);
        await freshFamily(lang);
        const tag = `${vp}-${lang}`;
        let widest = null;
        for (const id of FIT_IDS) {
          if (IDS && !IDS.includes(id)) continue;
          if (!(await openQuest(lang, id))) continue;
          if (ONLY.includes('seek') || ONLY.includes('read')) {
            const d = await evaluate(DRAWER);
            readings[`drawer-${tag}-${id}`] = d;
            const want = firstSeek(REQ(id).referenceProgram);
            if (ONLY.includes('seek') && (REQ(id).palette || []).includes('go_nearest')) {
              check(`SEEK ${tag} ${id}: the drawer’s “go to nearest” starts on what this job seeks first (${want}), and says so (“${d.seekText}”)`, d.seek === want && !!d.seekText && d.seekText.includes(w(lang, 'iw4K_' + want).replace(/^\S+\s/, '')), d);
            }
            if (ONLY.includes('read') && (REQ(id).rungs || []).includes('read')) {
              const envelopes = (REQ(id).things || []).some((t) => t.kind === 'letter' && t.to);
              const word = envelopes ? w(lang, 'iwlReadEnvelope') : w(lang, 'rungRead');
              check(`READ ${tag} ${id}: the drawer’s read block and the pad’s read key say “${word || '(no word)'}”${envelopes ? ' — the envelope, not the note' : ' (Mamie’s note: the control)'}`, !!word && !!d.read && d.read.includes(word) && d.readKey === word && (!envelopes || !d.read.includes(w(lang, 'rungRead'))), { ...d, word });
              if (vp === '1368') {
                // The card: the ? on the drawer's read opens it (title, line, the example) — a first tap would too, but the
                // card is seen once per profile (Mamie's note opened it first), and the ? places nothing.
                const CARD = `(() => { const e = document.querySelector('.bg-card-help'); if (!e || e.offsetParent === null) return null; const t = e.querySelector('h1,h2,h3,.bg-card-title'); return { title: t ? t.innerText.trim() : '', text: e.innerText.replace(/\\s+/g, ' ').trim() }; })()`;
                await evaluate(`(() => { const r = ${BK}; return !!r && !!r.__gardenBlocks && r.__gardenBlocks.reveal('olive:read'); })()`);
                await wait(200);
                await tap(first(`.bg-blocks-box .gd-palette .gd-pal-item[data-pal-item="olive:read"] .gd-help`), `the ? on the drawer’s read (${id})`);
                const card = await until(CARD, Boolean, 3000);
                readings[`card-${tag}-${id}`] = card;
                await shot(`iwl-read-card-${tag}-${id}`);
                // The line with the robot's name as the page gives it (Pocket is Poche in French): every part around {b}.
                const lineKey = envelopes ? 'iwlCdReadEnvelope' : 'cdOliveRead';
                const parts = String((WORD_ROWS.find((r) => r.key === lineKey) || {})[lang] || '').split('{b}').filter(Boolean);
                const line = w(lang, lineKey, botOf(id));
                check(`READ ${tag} ${id}: the read block’s card is titled “${word}”, says “${line.slice(0, 48)}…”, and its example’s read block says “${word}” too`, !!card && card.text.startsWith(word) && parts.length > 0 && parts.every((p) => card.text.includes(p)) && (!envelopes || !card.text.includes(w(lang, 'rungRead'))), { card, word, parts });
                if (card) await tap(first('.bg-card-help .bg-card-ok'), `Got it (${id})`);
                await wait(300);
                await shot(`iwl-read-drawer-${tag}-${id}`);
              }
            }
          }
          if (ONLY.includes('fit')) {
            const prog = REQ(id).referenceProgram;
            // Whether the drawer was already at the foot before this program came in (a strip is per size and palette).
            const stripBefore = await evaluate(`(() => { const r = ${BK}; return !!(r && r.__gardenBlocks && r.__gardenBlocks.workspace().horizontalLayout); })()`);
            await putProgram(prog);
            await evaluate(`window.scrollTo(0, document.querySelector('.bg-blocks-box').getBoundingClientRect().top + scrollY - 8)`);
            await wait(500);
            const got = await evaluate(WHOLE);
            got.stripBefore = stripBefore;
            got.fitSeen = await evaluate(`(() => { const r = ${BK}; return r && r.__gardenBlocks ? { last: r.__gardenBlocks.fitSeen || null, flip: r.__gardenBlocks.flipSeen || null } : null; })()`);
            readings[`fit-${tag}-${id}`] = got;
            if (!widest || got.stackW > widest.got.stackW) widest = { id, got };
            if (id === 'sami-bench' || id === 'bowl-if' || id === 'eggs-count') await shot(`iwl-fit-${tag}-${id}`);
            check(`FIT ${tag} ${id}: the reference program’s ${count(prog)} blocks are whole in the workspace’s view (x ${got.view.L}–${got.view.R}, scale ${got.scale}${got.strip ? ', the drawer at the foot' : `, the drawer ${got.flyout} px`}; the stack ${got.stackW} px) and inside the page`,
              got.n >= count(prog) && got.cut.length === 0 && got.view.R <= got.pageW + 1 && got.scale >= (got.strip ? FIT_FLOOR_STRIP : FIT_FLOOR) - 0.005, got);
          }
        }
        if (widest) {
          readings[`fit-widest-${tag}`] = { id: widest.id, stackW: widest.got.stackW, scale: widest.got.scale };
          if (ONLY.includes('fit') && widest.id !== 'sami-bench') {
            await openQuest(lang, widest.id);
            await putProgram(REQ(widest.id).referenceProgram);
            await shot(`iwl-fit-${tag}-widest-${widest.id}`);
          }
        }
      }
    }
  }

  // ── PAD (item 4): the phone, the pad up (Drive): clear of the world; AC4 still holds ──
  const PADWORLD = `(() => { const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
    const pad = [...document.querySelectorAll('.bg-pad')].find((e) => e.offsetParent !== null); const world = [...document.querySelectorAll('.bg-stage .gd-world')].find((e) => e.offsetParent !== null);
    const keys = pad ? [...pad.querySelectorAll('.bg-key')].filter((k) => k.offsetParent !== null).map(box) : [];
    const wb = box(world); const over = wb ? keys.filter((k) => k.left < wb.right && k.right > wb.left && k.top < wb.bottom && k.bottom > wb.top).length : -1;
    const note = [...document.querySelectorAll('.bg-steps-note')].find((e) => e.offsetParent !== null);
    const ctl = [...document.querySelectorAll('.bg-controls')].find((e) => e.offsetParent !== null);
    return { note: box(note), noteIn: note ? String(note.parentElement.className).slice(0, 40) : null, controls: box(ctl), btns: ctl ? [...ctl.querySelectorAll('.bg-btn')].filter((b) => b.offsetParent !== null).map((b) => b.innerText.trim() + '@' + Math.round(b.getBoundingClientRect().top) + ':' + Math.round(b.getBoundingClientRect().width)) : [], stage: box([...document.querySelectorAll('.bg-stage')].find((e) => e.offsetParent !== null)), pad: box(pad), world: wb, keys: keys.length, over, keyW: keys.length ? keys[0].right - keys[0].left : 0, play: box([...document.querySelectorAll('.bg-controls .bg-i-play')].find((e) => e.offsetParent !== null)), owl: box([...document.querySelectorAll('.bg-owl')].find((e) => e.offsetParent !== null)), vh: innerHeight, vw: innerWidth, sx: document.scrollingElement.scrollWidth }; })()`;
  if (ONLY.includes('pad')) {
    for (const lang of ['en', 'fr']) {
      await page.setViewport(VIEWPORTS['390']);
      await freshFamily(lang);
      for (const id of ['tulips-three', 'sami-thanks', 'envelopes', 'eggs-count']) {
        await openQuest(lang, id);
        await evaluate('window.scrollTo(0, 0)');
        await wait(500);
        const r = await evaluate(PADWORLD);
        readings[`pad-390-${lang}-${id}`] = r;
        await shot(`iwl-pad-390-${lang}-${id}`);
        check(`PAD 390-${lang} ${id}: the pad is up (${r.keys} keys, ${r.keyW} px) and none of its keys lies over the world`, r.keys > 0 && r.over === 0 && r.keyW >= 44, r);
        if (id === 'tulips-three') {
          check(`PAD 390-${lang} ${id} (AC4): Play (bottom ${r.play && r.play.bottom}) and the owl (top ${r.owl && r.owl.top}) on the first screen of ${r.vh}, no sideways scroll`, !!r.play && r.play.bottom <= r.vh && !!r.owl && r.owl.top < r.vh && r.sx <= r.vw, r);
        }
        if (id === 'sami-thanks') {
          const door = (REQ(id).things || []).find((t) => t.kind === 'door');
          const hit = await evaluate(`(() => { const c = document.querySelector('.bg-stage .gd-cell[data-x="${door.x}"][data-y="${door.y}"]'); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { cell: !!at && (c === at || c.contains(at)), key: !!at && !!at.closest('.bg-pad'), at: at ? at.className && at.className.baseVal !== undefined ? at.className.baseVal : String(at.className) : null }; })()`);
          readings[`pad-door-${lang}`] = hit;
          check(`PAD 390-${lang} sami-thanks: Mamie Rose’s door (${door.x},${door.y}) is what a finger finds at its centre, not a pad key`, !!hit && hit.cell && !hit.key, hit);
        }
      }
    }
  }

  // ── HINT (item 5): one egg into the basket, then the owl ──
  if (ONLY.includes('hint')) {
    for (const lang of ['en', 'fr']) {
      await page.setViewport(VIEWPORTS['1368']);
      await freshFamily(lang);
      await openQuest(lang, 'eggs-count');
      const ref = REQ('eggs-count').referenceProgram[0].body;
      await putProgram(ref.map((b, i) => ({ ...b, id: 500 + i })));
      await control('play');
      const BASKET = `(() => { const W = Noodl.Variables.gardenWorld || {}; const b = (W.things || []).find((t) => t.kind === 'basket'); return b ? { count: b.count || 0, capacity: b.capacity } : null; })()`;
      const owl = await until(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`, (t) => /\d/.test(t), 30000);
      await wait(600);
      const basket = await evaluate(BASKET);
      const said = await evaluate(`(document.querySelector('.bg-owl-say') || {}).innerText || ''`);
      const want = basket ? hint(lang, 'iw3Job', 'Pocket', { w: basket.count, t: basket.capacity }) : '(no basket)';
      readings[`hint-${lang}`] = { owl, said, basket, want };
      await shot(`iwl-hint-1368-${lang}-eggs`);
      check(`HINT ${lang} eggs-count: one egg put, the basket ${basket && basket.count}/${basket && basket.capacity}; the owl says “${want}”`, !!basket && basket.count < basket.capacity && said.includes(want) && !said.includes(hint(lang, 'iw3Job', 'Pocket', { w: 0, t: 1 })), readings[`hint-${lang}`]);
    }
  }

  // ── SAMI (item 7): one Sami on the island ──
  if (ONLY.includes('sami')) {
    await page.setViewport(VIEWPORTS['1368']);
    const SAMIS = `(() => { const isle = document.querySelector('.bg-isle') || document; const all = [...isle.querySelectorAll('[data-who="sami"]')].filter((e) => !e.classList.contains('gd-isl-say') && e.getBoundingClientRect().width > 0);
      const bench = (Noodl.Variables.gardenIsland && Noodl.Variables.gardenIsland.plots || []).find((p) => p.id === 'sami-bench');
      return { n: all.length, sitting: all.filter((e) => e.getAttribute('data-sits') === 'bench').length, standing: all.filter((e) => e.classList.contains('gd-islander')).length, three: document.querySelectorAll('[data-gd3-world]').length, bench: bench ? bench.status : null }; })()`;
    const samiIds = REQUESTS.filter((r) => r.islander === 'sami').map((r) => r.id);
    const CASES = [
      ['bench won, his other requests open', `a.island.done = ['sami-bench']; a.island.plots = {}`],
      ['all his requests done', `a.island.done = ${JSON.stringify(samiIds)}; a.island.plots = {}`],
      ['the bench pinned and at work', `a.island.done = ['sami-bench']; a.island.plots = { 'sami-bench': { program: ${JSON.stringify(REQ('sami-bench').referenceProgram)}, robotId: 'cobble', wonAt: 1 } }`]
    ];
    await freshFamily('en');
    for (const [label, body] of CASES) {
      await writeStore(body);
      await wait(1500);
      const got = await evaluate(SAMIS);
      readings[`sami-${label}`] = got;
      await shot(`iwl-sami-${label.replace(/[^a-z]+/g, '-')}`);
      check(`SAMI ${label}: the island draws one Sami (${got.standing} standing, ${got.sitting} on the bench; the bench plot ${got.bench})`, got.n === 1, got);
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
