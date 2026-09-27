#!/usr/bin/env node
/**
 * RKT-001 — does every sentence in Rocket School fit on the screen?
 *
 * AC3's drive: Profiles, the New player form, Home, Race setup, a wrong-answer
 * banner and the result banner at the end of a race — in FR and EN — each read
 * at five viewports. The flow runs ONCE per language (a fresh Chrome profile
 * each, so localStorage starts empty); at every screen the viewport is resized
 * through the five sizes and re-measured, rather than replaying the flow.
 *
 * Clauses at every screen × viewport:
 *   signal  — the screen's own words are on the page (a blank page FAILS here
 *             instead of passing the absences below)
 *   doc     — document.documentElement.scrollWidth <= the REQUESTED width  (AC3)
 *             🔴 not innerWidth: under mobile emulation innerWidth stretches to
 *             the content (s1, FR Race setup at 390: scrollWidth 433 / innerWidth
 *             433), so the clause compared the page with itself.
 *   self    — every .ndl-visual-text: scrollWidth <= clientWidth + 1        (AC3)
 *   parent  — every .ndl-visual-text is no wider than its parent's content
 *             box (+1px)                                                   (AC3)
 *             🔴 the clause that sees the defect: a `white-space: pre` Text
 *             grows to its words, so its OWN scrollWidth equals its clientWidth
 *             and the overflow lands on the parent. `self` read 0 offenders on
 *             the s1 build while the FR banner's correction ran 181px out.
 *
 * Profiles and the form are always English (`Pages/Profiles`: "In English until
 * a player is chosen"); the FR pass reads them anyway and says so. The FR player
 * is made with the form's "Français" choice; the header EN/FR pill is the
 * fallback if Home does not come up in French.
 *
 * Usage:
 *   node scripts/devtools/drive-rkt001-wrap.js <deploy-dir> [--shots <dir>] [--only 390x844]
 *
 * Exits 0 when every clause passed, 1 when any did not (or a screen was not reached).
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const DIR = process.argv[2];
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1];
};
const SHOTS = arg('--shots');
const ONLY = arg('--only');
if (!DIR) {
  console.error('usage: drive-rkt001-wrap.js <deploy-dir> [--shots <dir>] [--only 390x844]');
  process.exit(2);
}
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const ALL_VPS = [
  { width: 1366, height: 768, mobile: false },
  { width: 1280, height: 720, mobile: false },
  { width: 1024, height: 768, mobile: true },
  { width: 768, height: 1024, mobile: true },
  { width: 390, height: 844, mobile: true }
];
const vpName = (v) => `${v.width}x${v.height}`;
const VPS = ONLY ? ALL_VPS.filter((v) => vpName(v) === ONLY) : ALL_VPS;
if (!VPS.length) {
  console.error(`--only ${ONLY} matches none of ${ALL_VPS.map(vpName).join(', ')}`);
  process.exit(2);
}
const WORK_VP = { width: 1366, height: 768, mobile: false };

const W = {
  en: {
    home: ['Rocket Race', 'days practised this week'],
    race: 'Rocket Race',
    start: 'Start',
    check: 'Check',
    next: 'Next',
    wrong: 'Not quite.',
    verdicts: ['Correct!', 'Fast and correct!', 'Not quite.', 'Time’s up.'],
    results: ['You reached the planet!', 'The computer got there first. Again?']
  },
  fr: {
    home: ['Course de fusées', 'jours d’entraînement cette semaine'],
    race: 'Course de fusées',
    start: 'Commencer',
    check: 'Vérifier',
    next: 'Suivant',
    wrong: 'Pas tout à fait.',
    verdicts: ['Bravo !', 'Rapide et juste !', 'Pas tout à fait.', 'Temps écoulé.'],
    results: ['Tu as atteint la planète !', 'L’ordinateur est arrivé avant. On recommence ?']
  }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The measurement at the requested width. Only rendered, non-empty Text elements count.
 * `wide` names the outermost elements whose right edge passes that width, so a `doc`
 * failure says which element made the page wider than the phone.
 */
const MEASURE = (width) => `(() => {
  const iw = window.innerWidth;
  const sw = document.documentElement.scrollWidth;
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => e.getClientRects().length && e.innerText.trim());
  const self = [], parent = [], inline = [];
  const short = (s) => s.replace(/\\s+/g, ' ').trim().slice(0, 70);
  for (const e of texts) {
    const t = short(e.innerText);
    if (e.clientWidth === 0) inline.push(t);
    if (e.scrollWidth > e.clientWidth + 1) self.push({ text: t, scrollWidth: e.scrollWidth, clientWidth: e.clientWidth });
    const p = e.parentElement;
    if (p) {
      const cs = getComputedStyle(p);
      const avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const w = e.getBoundingClientRect().width;
      if (w > avail + 1) parent.push({ text: t, width: Math.round(w), parentContent: Math.round(avail), overBy: Math.round(w - avail) });
    }
  }
  self.sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth));
  parent.sort((a, b) => b.overBy - a.overBy);
  // The deepest elements past the requested width: every ancestor of one is stretched past it too
  // (the page grows to contain it), so only a leaf of that set is the thing that is too wide.
  const past = [...document.body.querySelectorAll('*')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().right > ${width} + 1);
  const pastSet = new Set(past);
  // An SVG element's className is an SVGAnimatedString, which printed as "[object SVGAnimatedString]"; the attribute is the text.
  const trail = (e) => { const out = []; for (let a = e.parentElement; a && out.length < 3; a = a.parentElement) out.push((a.getAttribute('class') || '').split(' ').filter(Boolean).slice(-1)[0] || a.tagName.toLowerCase()); return out.join(' < '); };
  const wide = past.filter((e) => ![...e.children].some((c) => pastSet.has(c)))
    .slice(0, 4)
    .map((e) => ({ tag: e.tagName.toLowerCase(), cls: (e.getAttribute('class') || '').slice(0, 60) + ' in ' + trail(e), right: Math.round(e.getBoundingClientRect().right), width: Math.round(e.getBoundingClientRect().width), text: short(e.innerText || '') }));
  return { iw, sw, texts: texts.length, self, parent, wide, inline: inline.length, body: document.body.innerText };
})()`;

const LOCATE = (label) => `(() => {
  const all = [...document.querySelectorAll('button, .pressable, [class*="pressable"]')].filter((e) => e.getClientRects().length);
  const hit = all.find((e) => e.innerText.trim() === ${JSON.stringify(label)}) ||
    [...document.querySelectorAll('*')].reverse().find((e) => e.children.length === 0 && e.getClientRects().length && e.innerText && e.innerText.trim() === ${JSON.stringify(label)});
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, reachable: !!top && (hit === top || hit.contains(top) || top.contains(hit)) };
})()`;

const LOCATE_INPUT = (index) => `(() => {
  const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null && !i.disabled);
  const hit = inputs[${index}];
  if (!hit) return { found: false };
  hit.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = hit.getBoundingClientRect();
  return { found: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;

/** The question prompt: the largest-font Text that is not an emoji glyph. Buttons are read for option mode. */
const QUESTION = `(() => {
  const texts = [...document.querySelectorAll('.ndl-visual-text')].filter((e) => e.getClientRects().length && e.innerText.trim() && /[0-9A-Za-zÀ-ÿ?]/.test(e.innerText));
  let best = null, size = 0;
  for (const e of texts) { const f = parseFloat(getComputedStyle(e).fontSize); if (f > size) { size = f; best = e; } }
  const buttons = [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim()).filter(Boolean);
  const inputs = [...document.querySelectorAll('input')].filter((i) => i.offsetParent !== null && !i.disabled).length;
  return { prompt: best ? best.innerText.trim() : null, size, buttons, inputs, body: document.body.innerText };
})()`;

function solve(prompt) {
  if (!prompt) return null;
  const n = (s) => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));
  const out = (v) => (Number.isFinite(v) ? String(Math.round(v * 1000) / 1000) : null);
  let m;
  if ((m = prompt.match(/^([\d\s  .,]+) \+ ([\d\s  .,]+) = \?$/))) return out(n(m[1]) + n(m[2]));
  if ((m = prompt.match(/^([\d\s  .,]+) [−-] ([\d\s  .,]+) = \?$/))) return out(n(m[1]) - n(m[2]));
  if ((m = prompt.match(/^([\d\s  .,]+) × ([\d\s  .,]+) = \?$/))) return out(n(m[1]) * n(m[2]));
  if ((m = prompt.match(/^([\d\s  .,]+) ÷ ([\d\s  .,]+) = \?$/))) return out(n(m[1]) / n(m[2]));
  if ((m = prompt.match(/^\? × (\d+) = (\d+)$/))) return out(n(m[2]) / n(m[1]));
  if ((m = prompt.match(/^\? \+ (\d+) = (\d+)$/))) return out(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^(\d+) \+ \? = (\d+)$/))) return out(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^Double (\d+) = \?$/))) return out(n(m[1]) * 2);
  if ((m = prompt.match(/^Half of (\d+) = \?$/))) return out(n(m[1]) / 2);
  if ((m = prompt.match(/^(\d+) \+ (\d+) = \? \+ (\d+)$/))) return out(n(m[1]) + n(m[2]) - n(m[3]));
  if ((m = prompt.match(/^(\d+) \+ (\d+) × (\d+) = \?$/))) return out(n(m[1]) + n(m[2]) * n(m[3]));
  return null;
}

/** rows: { screen, lang, vp, reached, signal, doc, self, parent, m } */
const rows = [];
const notes = [];

async function drive(lang) {
  const w = W[lang];
  await withDeployedSite({ dir: DIR, port: 0 }, async (page) => {
    const click = async (label) => {
      const at = await page.evaluate(LOCATE(label));
      if (!at.found) return false;
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
      }
      if (!at.reachable) notes.push(`${lang}: "${label}" was clicked through a blocker`);
      await wait(700);
      return true;
    };
    const typeInto = async (index, text) => {
      const at = await page.evaluate(LOCATE_INPUT(index));
      if (!at.found) return false;
      for (const type of ['mousePressed', 'mouseReleased']) {
        await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
      }
      await wait(150);
      await page.client.send('Input.insertText', { text });
      await wait(200);
      return true;
    };
    const pressEnter = async () => {
      await page.client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await page.client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
      await wait(800);
    };
    const bodyText = async () => page.evaluate('document.body.innerText');
    const shoot = async (file) => {
      const h = await page.evaluate('Math.min(4000, Math.max(document.documentElement.scrollHeight, window.innerHeight))');
      const { data } = await page.client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: 390, height: h, scale: 1 }
      });
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
    };

    /** Resize through the viewports on the current screen and measure each. */
    const measureScreen = async (screen, signal) => {
      for (const vp of VPS) {
        await page.setViewport(vp);
        await page.evaluate('window.scrollTo(0, 0)');
        await wait(450);
        const m = await page.evaluate(MEASURE(vp.width));
        const sig = signal(m.body);
        rows.push({
          screen, lang, vp: vpName(vp), reached: true, signal: sig,
          doc: m.sw <= vp.width, self: m.self.length === 0, parent: m.parent.length === 0, m
        });
        if (m.iw !== vp.width) notes.push(`${lang} ${screen} ${vpName(vp)}: innerWidth read ${m.iw}, not ${vp.width}`);
        if (SHOTS && vp.width === 390) await shoot(path.join(SHOTS, `${lang}-${screen}-390x844.png`));
      }
      await page.setViewport(WORK_VP);
      await wait(300);
    };
    const unreached = (screen, why) => {
      for (const vp of VPS) rows.push({ screen, lang, vp: vpName(vp), reached: false, why });
      notes.push(`${lang} ${screen}: NOT REACHED — ${why}`);
    };

    await page.setViewport(WORK_VP);
    await wait(1200);

    // ── Profiles ──
    await measureScreen('profiles', (b) => b.includes('Who is playing?'));

    // ── New player form ──
    if (!(await click('New player'))) return unreached('form', 'no "New player" button'), ['home', 'setup', 'wrong', 'result'].forEach((s) => unreached(s, 'no player'));
    await wait(500);
    await measureScreen('form', (b) => b.includes('Your name') && b.includes('Français'));

    await typeInto(0, 'Léa');
    await click('CM1');
    if (lang === 'fr') await click('Français');
    if (!(await click('Let’s go!'))) return ['home', 'setup', 'wrong', 'result'].forEach((s) => unreached(s, 'no "Let’s go!" button'));
    await wait(1500);

    // ── Home ──
    let b = await bodyText();
    if (lang === 'fr' && !b.includes(w.home[0])) {
      notes.push('fr: Home was not French after "Français" in the form; pressed the header FR pill');
      await click('FR');
      await wait(1200);
      b = await bodyText();
    }
    if (!b.includes(w.home[0])) return ['home', 'setup', 'wrong', 'result'].forEach((s) => unreached(s, `Home never showed "${w.home[0]}": ${b.slice(0, 160)}`));
    await measureScreen('home', (t) => t.includes(w.home[0]) && t.includes(w.home[1]));

    // ── Race setup ──
    await click(w.race);
    await wait(1200);
    b = await bodyText();
    if (!b.includes(w.start)) return ['setup', 'wrong', 'result'].forEach((s) => unreached(s, `no "${w.start}" after the race card: ${b.slice(0, 160)}`));
    await measureScreen('setup', (t) => t.includes(w.start));

    // ── A wrong answer ──
    await click(w.start);
    await wait(1500);
    let gotWrong = false;
    const answer = async (value) => {
      const q = await page.evaluate(QUESTION);
      const opts = q.buttons.filter((x) => /^[\d\s  .,/−-]+$/.test(x));
      if (q.inputs > 0) {
        await typeInto(0, value);
        await pressEnter();
        if (!W[lang].verdicts.some((v) => (q.body || '').includes(v)) && !(await bodyText()).match(new RegExp(W[lang].verdicts.map((v) => v.replace(/[.?!]/g, '\\$&')).join('|')))) await click(w.check);
      } else if (opts.length) {
        const pick = opts.find((o) => o.replace(/[\s  ]/g, '') === String(value)) || (value === '__wrong__' ? opts[opts.length - 1] : opts[0]);
        await click(pick);
      } else {
        return { q, did: false };
      }
      await wait(900);
      return { q, did: true };
    };
    for (let tries = 0; tries < 6 && !gotWrong; tries++) {
      const q = await page.evaluate(QUESTION);
      const right = solve(q.prompt);
      const wrongValue = right === '1' ? '2' : '1';
      const opts = q.buttons.filter((x) => /^[\d\s  .,/−-]+$/.test(x));
      const r = await answer(opts.length && right ? (opts.find((o) => o.replace(/[\s  ]/g, '') !== right) || '__wrong__') : wrongValue);
      if (!r.did) break;
      b = await bodyText();
      if (b.includes(w.wrong)) gotWrong = true;
      else if (b.includes(w.next)) {
        notes.push(`${lang}: "${wrongValue}" to "${q.prompt}" was not graded wrong; next question`);
        await click(w.next);
        await wait(1000);
      }
    }
    if (gotWrong) await measureScreen('wrong', (t) => t.includes(w.wrong));
    else unreached('wrong', `no "${w.wrong}" banner after answering: ${(await bodyText()).slice(0, 200)}`);

    // ── The race to its end ──
    const isOver = (t) => w.results.some((r) => t.includes(r));
    let rounds = 0, solved = 0, unsolved = 0;
    for (let step = 0; step < 90; step++) {
      b = await bodyText();
      if (isOver(b)) break;
      const q = await page.evaluate(QUESTION);
      if (q.buttons.includes(w.next)) {
        await click(w.next);
        await wait(900);
        continue;
      }
      if (q.inputs > 0 || q.buttons.some((x) => /^[\d\s  .,/−-]+$/.test(x))) {
        const right = solve(q.prompt);
        right ? solved++ : unsolved++;
        await answer(right || '1');
        rounds++;
        continue;
      }
      await wait(1000);
    }
    b = await bodyText();
    notes.push(`${lang}: race loop answered ${rounds} rounds (${solved} solved, ${unsolved} not)`);
    if (isOver(b)) await measureScreen('result', (t) => isOver(t));
    else unreached('result', `no result banner after ${rounds} rounds: ${b.slice(0, 200)}`);

    if (page.consoleErrors.length) notes.push(`${lang}: console errors: ${JSON.stringify(page.consoleErrors.slice(0, 3))}`);
  });
}

(async () => {
  for (const lang of ['fr', 'en']) {
    try {
      await drive(lang);
    } catch (e) {
      notes.push(`${lang}: the drive threw — ${e.stack || e}`);
      rows.push({ screen: '(drive)', lang, vp: '-', reached: false, why: String(e) });
    }
  }

  const SCREENS = ['profiles', 'form', 'home', 'setup', 'wrong', 'result'];
  const cell = (r) => {
    if (!r) return 'MISSING';
    if (!r.reached) return 'NOT REACHED';
    const ac3 = r.signal && r.doc && r.self;
    const bits = [];
    if (!r.signal) bits.push('signal');
    if (!r.doc) bits.push(`doc ${r.m.sw}>${r.m.iw}`);
    if (!r.self) bits.push(`self ${r.m.self.length}`);
    return `${ac3 ? 'PASS' : 'FAIL'}${bits.length ? ` (${bits.join(', ')})` : ''} | parent ${r.parent ? 'PASS' : `FAIL (${r.m.parent.length})`}`;
  };
  console.log('\nscreen    lang viewport   clauses (signal+doc+self)        | AC3: text fits its parent');
  for (const s of SCREENS) {
    for (const lang of ['fr', 'en']) {
      for (const vp of VPS) {
        const r = rows.find((x) => x.screen === s && x.lang === lang && x.vp === vpName(vp));
        console.log(`${s.padEnd(9)} ${lang.padEnd(4)} ${vpName(vp).padEnd(10)} ${cell(r)}`);
      }
    }
  }

  console.log('\nOffenders at 390x844:');
  for (const lang of ['fr', 'en']) {
    for (const s of SCREENS) {
      const r = rows.find((x) => x.screen === s && x.lang === lang && x.vp === '390x844' && x.reached);
      if (!r) continue;
      console.log(`  ${lang} ${s}: doc scrollWidth ${r.m.sw} / innerWidth ${r.m.iw}; ${r.m.texts} texts (${r.m.inline} with clientWidth 0)`);
      for (const o of r.m.self.slice(0, 6)) console.log(`    self   "${o.text}" scrollWidth ${o.scrollWidth} clientWidth ${o.clientWidth}`);
      for (const o of r.m.wide || []) console.log(`    wide <${o.tag} class="${o.cls}"> right ${o.right} width ${o.width} "${o.text}"`);
      for (const o of r.m.parent.slice(0, 6)) console.log(`    parent "${o.text}" width ${o.width} parentContent ${o.parentContent} (+${o.overBy})`);
    }
  }
  if (notes.length) console.log('\nNotes:\n  ' + notes.join('\n  '));

  const failed = rows.filter((r) => !r.reached || !r.signal || !r.doc || !r.self || !r.parent);
  const ac3Failed = rows.filter((r) => !r.reached || !r.signal || !r.doc || !r.self);
  console.log(`\n${rows.length - failed.length}/${rows.length} screen×lang×viewport cells passed every clause; AC3 clauses failed in ${ac3Failed.length}`);
  process.exitCode = failed.length ? 1 : 0;
})();
