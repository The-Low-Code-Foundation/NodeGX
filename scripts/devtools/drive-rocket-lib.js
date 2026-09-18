#!/usr/bin/env node
/**
 * The shared instrument for driving the DEPLOYED Rocket School.
 *
 * `drive-tpl007-rocket.js` grew a journey's worth of helpers inline, and every
 * new task's drive wanted the same ones. This is those helpers, with the three
 * faults its first P95 run exposed fixed:
 *
 * 🔴 **A click must scroll first.** The new-player form's "Let's go!" sits at
 *    y≈850. At four of the five viewports §5 requires — including 1366×768 and
 *    390×844 — that is BELOW THE FOLD, `elementFromPoint` returns null, and the
 *    press lands on nothing. The page scrolls (scrollHeight 939), so a child
 *    reaches it and the drive must too. The old drive only ever passed because
 *    it used a 1100×1500 viewport, which is none of the five.
 *
 * 🔴 **A keypad digit is not an answer.** The race answers through the kit's
 *    pad: `[data-pad-key="7"]` types a character into `[data-pad-field]` and
 *    `[data-pad-submit]` commits it. The old drive treated the digit "1" as a
 *    complete answer and never pressed Check, so every question read ungraded
 *    and the product looked broken when the instrument was.
 *
 * 🔴 **A Modal measures a ghost.** A single programmatic click inside one hits
 *    the measuring copy. `click(label, { times: 2 })` presses twice; every
 *    press inside a dialog should use it.
 *
 * Scrolling is instant, never smooth — a smooth scroll leaves `scrollTop` at 0
 * for the next synchronous read, and the click then goes to the old place.
 */
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** The five viewports §5 requires of every drive. FR + AZERTY is the primary arm. */
const VIEWPORTS = {
  '1366x768': { name: '1366x768', width: 1366, height: 768 },
  '1280x720': { name: '1280x720', width: 1280, height: 720 },
  '1024x768': { name: '1024x768', width: 1024, height: 768, mobile: true },
  '768x1024': { name: '768x1024', width: 768, height: 1024, mobile: true },
  '390x844': { name: '390x844', width: 390, height: 844, mobile: true }
};

/** The page as text: the controls, the pad, the boxes, and what the kit drew. */
const READ = `(() => {
  const vis = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
  return {
    buttons: [...document.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()).filter(Boolean),
    inputs: [...document.querySelectorAll('input')].filter(vis).map((i) => ({ placeholder: i.placeholder, value: i.value })),
    padKeys: [...document.querySelectorAll('[data-pad-key]')].filter(vis).map((e) => e.getAttribute('data-pad-key')),
    padSubmit: [...document.querySelectorAll('[data-pad-submit]')].filter(vis).length,
    padField: (() => { const e = document.querySelector('[data-pad-field]'); return e ? { kind: e.getAttribute('data-pad-field'), text: e.getAttribute('data-pad-text') || '' } : null; })(),
    keys: [...document.querySelectorAll('[data-key]')].filter(vis).length,
    rockets: document.querySelectorAll('svg image').length,
    text: document.body.innerText
  };
})()`;

/**
 * Where `label` is, AFTER scrolling it into view, and whether anything is on top.
 * Returns viewport coordinates good for `Input.dispatchMouseEvent`.
 */
const LOCATE = (label, opts = {}) => `(() => {
  const want = ${JSON.stringify(label)};
  const exact = ${opts.exact === false ? 'false' : 'true'};
  const vis = (e) => e.getClientRects().length > 0;
  const matches = (t) => exact ? t === want : t.includes(want);
  const pressables = [...document.querySelectorAll('button, .pressable, [class*="pressable"], [role="button"]')].filter(vis);
  let hit = pressables.find((e) => matches(e.innerText.trim()));
  if (!hit) {
    const leaf = [...document.querySelectorAll('*')].reverse()
      .find((e) => vis(e) && e.children.length === 0 && e.innerText && matches(e.innerText.trim()));
    // a leaf's own box can be smaller than the thing a person presses
    hit = leaf ? (leaf.closest('button, .pressable, [class*="pressable"], [role="button"]') || leaf) : null;
  }
  if (!hit) return { found: false };
  // 🔴 instant, never smooth: a smooth scroll leaves scrollTop at 0 for the read below
  hit.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return {
    found: true, x, y, w: Math.round(r.width), h: Math.round(r.height),
    onScreen: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
    reachable: Boolean(top) && (hit === top || hit.contains(top) || top.contains(hit)),
    onTop: top ? String(top.className || top.tagName).slice(0, 60) : 'NOTHING (off-viewport)'
  };
})()`;

/** The same, for an arbitrary selector. */
const LOCATE_SEL = (sel, index = 0) => `(() => {
  const all = [...document.querySelectorAll(${JSON.stringify(sel)})].filter((e) => e.getClientRects().length > 0);
  const hit = all[${index}];
  if (!hit) return { found: false, count: all.length };
  hit.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = hit.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const top = document.elementFromPoint(x, y);
  return { found: true, x, y, w: Math.round(r.width), h: Math.round(r.height), count: all.length,
    reachable: Boolean(top) && (hit === top || hit.contains(top) || top.contains(hit)),
    onTop: top ? String(top.className || top.tagName).slice(0, 60) : 'NOTHING (off-viewport)' };
})()`;

/** The question on screen, in either language. */
const QUESTION = `(() => {
  const lines = document.body.innerText.split('\\n').map((s) => s.trim()).filter(Boolean);
  const q = lines.find((l) => (/[?=]/.test(l) && !/Who is playing|Qui joue/.test(l))
    || /^(Double|Half of|Write in digits:|Round|Écris|Arrondis|Moitié)/.test(l));
  return q || null;
})()`;

/**
 * A number written in English or French words, as a number. `null` when the
 * words are not a number.
 *
 * "Write in digits: five thousand and eighty-three" is a whole band of the
 * curriculum from CE2 up, and a drive that cannot answer it breaks its own
 * chain and then reports the comeback as dead.
 */
function wordsToNumber(text) {
  const SMALL = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    // French. "vingt" is handled below too, because "quatre-vingt" is 4 × 20.
    zéro: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9,
    dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16,
    vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60
  };
  const HUNDRED = new Set(['hundred', 'cent', 'cents']);
  const SCALE = { thousand: 1000, thousands: 1000, mille: 1000, milles: 1000,
    million: 1e6, millions: 1e6, billion: 1e9, billions: 1e9, milliard: 1e9, milliards: 1e9 };

  const words = String(text).toLowerCase().replace(/[,‐-―-]/g, ' ').split(/\s+/).filter(Boolean)
    .filter((w) => w !== 'and' && w !== 'et');
  if (!words.length) return null;

  let total = 0, chunk = 0, saw = false, prev = '';
  for (const w of words) {
    if (HUNDRED.has(w)) { chunk = (chunk || 1) * 100; saw = true; }
    else if (w in SCALE) { total += (chunk || 1) * SCALE[w]; chunk = 0; saw = true; }
    else if (w === 'vingt' || w === 'vingts') {
      // 🔴 "quatre-vingt" is 80, not 4 then 20 — the only place French
      // multiplies below a hundred, and getting it wrong turns 429,000,000
      // into 133,000,000.
      if (prev === 'quatre') chunk = chunk - 4 + 80; else chunk += 20;
      saw = true;
    } else if (w in SMALL) { chunk += SMALL[w]; saw = true; }
    else return null;                       // an unknown word means this is not a number
    prev = w;
  }
  return saw ? total + chunk : null;
}

/**
 * Work out the answer to a prompt the games ask. Returns a string, or null.
 *
 * 🔴 Answers are NOT rounded to three places. `6.85 ÷ 100` is `0.0685`, and
 * rounding it to `0.068` is a wrong answer that reads as a broken feature.
 */
function solve(prompt) {
  if (!prompt) return null;
  /**
   * A number as either language writes it.
   *
   * 🔴 A comma means opposite things in the two arms: English groups thousands
   * with it (`4,537`), French uses it as the DECIMAL point (`40,5`). Stripping
   * commas unconditionally turned French `40,5 × 0,1` into `405 × 01`. French
   * groups thousands with a space instead, so spaces always go and a comma is a
   * decimal point unless it is grouping three digits at a time.
   */
  const n = (s) => {
    let t = String(s).replace(/[\s  ]/g, '');
    // A thousands group never starts with 0, which is what tells `4,537`
    // (grouped) from `0,125` (a French decimal that looks just like one).
    if (/^[1-9]\d{0,2}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
    else t = t.replace(',', '.');                                 // 40,5 — decimal
    return Number(t);
  };
  /** Enough places for the curriculum's decimals, with float noise trimmed. */
  const round = (v) => {
    if (!isFinite(v)) return null;
    const s = Number(v.toPrecision(12));
    return String(Number.isInteger(s) ? s : s);
  };
  let m;

  // "Write in digits: five thousand and eighty-three"
  if ((m = prompt.match(/^(?:Write in digits|Écris en chiffres)\s*:\s*(.+)$/i))) {
    const v = wordsToNumber(m[1]);
    return v === null ? null : String(v);
  }
  // French rounding: "Arrondis 9 580 à la centaine", "Arrondis 7,52 au dixième"
  if ((m = prompt.match(/^Arrondis ([\d.,\s ]+) (?:à la |au |à l['’])(unité|dizaine|centaine|millier|dixième|centième)/i))) {
    const q = { 'unité': 1, dizaine: 10, centaine: 100, millier: 1000, 'dixième': 0.1, 'centième': 0.01 }[m[2].toLowerCase()];
    return round(Math.round(n(m[1]) / q) * q);
  }
  if ((m = prompt.match(/^(\d+)\s*\/\s*(\d+) de ([\d.,\s ]+) = \?$/i))) return round((n(m[1]) / n(m[2])) * n(m[3]));
  if ((m = prompt.match(/^([\d.,]+)\s*% de ([\d.,\s ]+) = \?$/i))) return round((n(m[1]) / 100) * n(m[2]));
  if ((m = prompt.match(/^(?:The remainder of|Le reste de) ([\d.,\s]+) ÷ ([\d.,\s]+)/i))) return String(n(m[1]) % n(m[2]));
  if ((m = prompt.match(/^(?:The quotient of|Le quotient de) ([\d.,\s]+) ÷ ([\d.,\s]+)/i))) return String(Math.floor(n(m[1]) / n(m[2])));
  if ((m = prompt.match(/^(\d+)\s*\/\s*(\d+) of ([\d.,\s]+) = \?$/i))) return round((n(m[1]) / n(m[2])) * n(m[3]));
  if ((m = prompt.match(/^([\d.,]+)\s*% of ([\d.,\s]+) = \?$/i))) return round((n(m[1]) / 100) * n(m[2]));
  if ((m = prompt.match(/^(\d+)\s*\/\s*(\d+) = \?$/))) return round(n(m[1]) / n(m[2]));
  if ((m = prompt.match(/^(?:Round|Arrondis) ([\d.,\s]+) to the nearest (whole|tenth|hundredth)/i))) {
    const q = { whole: 1, tenth: 0.1, hundredth: 0.01 }[m[2].toLowerCase()];
    return round(Math.round(n(m[1]) / q) * q);
  }
  if ((m = prompt.match(/^([\d.,\s]+) \+ ([\d.,\s]+) = \?$/))) return round(n(m[1]) + n(m[2]));
  if ((m = prompt.match(/^([\d.,\s]+) [−-] ([\d.,\s]+) = \?$/))) return round(n(m[1]) - n(m[2]));
  if ((m = prompt.match(/^([\d.,\s]+) × ([\d.,\s]+) = \?$/))) return round(n(m[1]) * n(m[2]));
  if ((m = prompt.match(/^([\d.,\s]+) ÷ ([\d.,\s]+) = \?$/))) return round(n(m[1]) / n(m[2]));
  if ((m = prompt.match(/^\? × ([\d.,\s]+) = ([\d.,\s]+)$/))) return round(n(m[2]) / n(m[1]));
  if ((m = prompt.match(/^([\d.,\s]+) × \? = ([\d.,\s]+)$/))) return round(n(m[2]) / n(m[1]));
  if ((m = prompt.match(/^\? \+ ([\d.,\s]+) = ([\d.,\s]+)$/))) return round(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^([\d.,\s]+) \+ \? = ([\d.,\s]+)$/))) return round(n(m[2]) - n(m[1]));
  if ((m = prompt.match(/^\? [−-] ([\d.,\s]+) = ([\d.,\s]+)$/))) return round(n(m[2]) + n(m[1]));
  if ((m = prompt.match(/^(?:Double|Le double de) ([\d.,\s ]+) = \?$/))) return round(n(m[1]) * 2);
  if ((m = prompt.match(/^(?:Half of|La moitié de|Moitié de) ([\d.,\s ]+) = \?$/i))) return round(n(m[1]) / 2);
  if ((m = prompt.match(/^([\d.,\s]+) \+ ([\d.,\s]+) = \? \+ ([\d.,\s]+)$/))) return round(n(m[1]) + n(m[2]) - n(m[3]));
  if ((m = prompt.match(/^([\d.,\s]+) \+ ([\d.,\s]+) × ([\d.,\s]+) = \?$/))) return round(n(m[1]) + n(m[2]) * n(m[3]));
  if ((m = prompt.match(/^([\d.,\s]+) \+ ([\d.,\s]+) \+ ([\d.,\s]+) = \?$/))) return round(n(m[1]) + n(m[2]) + n(m[3]));
  if ((m = prompt.match(/^(\d+)\s*\/\s*(\d+) × ([\d.,\s]+) = \?$/))) return round((n(m[1]) / n(m[2])) * n(m[3]));
  // "3 notebooks cost 15 €. How much do 7 notebooks cost?" — a unit-rate word problem
  if ((m = prompt.match(/^([\d.,]+) \w+ (?:cost|coûtent) ([\d.,]+)\s*€?\.\s*(?:How much do|Combien coûtent) ([\d.,]+)/i)))
    return round((n(m[2]) / n(m[1])) * n(m[3]));
  if ((m = prompt.match(/^(?:Which fraction is bigger|Quelle fraction est la plus grande)\s*:\s*(\d+\s*\/\s*\d+)\s+(?:or|ou)\s+(\d+\s*\/\s*\d+)/i))) {
    const val = (f) => { const [a, b] = f.split('/').map((x) => Number(x.trim())); return a / b; };
    return (val(m[1]) >= val(m[2]) ? m[1] : m[2]).replace(/\s/g, '');
  }

  // Option questions. These are asked as four buttons, and `solve` must name the
  // right one or the drive breaks its own chain and reports a dead feature.
  // 🔴 The place can be two words ("ten thousands", "hundred millions"), so the
  // name is parsed rather than looked up in a list of the four simple ones.
  if ((m = prompt.match(/^(?:In|Dans) ([\d ,\s]+), (?:which digit is in the|quel chiffre est aux?) ([a-zéû ]+?) place/i))) {
    const digits = m[1].replace(/[^\d]/g, '');
    const words = m[2].trim().toLowerCase().split(/\s+/);
    const BASE = { ones: 0, unités: 0, tens: 1, dizaines: 1, hundreds: 2, centaines: 2,
      thousands: 3, milliers: 3, millions: 6, billions: 9, milliards: 9 };
    let place = null;
    if (words.length === 1) place = BASE[words[0]];
    else if (words.length === 2 && BASE[words[1]] !== undefined) {
      const mult = { ten: 1, dix: 1, hundred: 2, cent: 2 }[words[0]];
      if (mult !== undefined) place = BASE[words[1]] + mult;
    }
    if (place === null || place === undefined) return null;
    return digits[digits.length - 1 - place] || null;
  }
  // 🔴 The numbers may carry a French thousands SPACE ("4 353"), so the operand
  // pattern has to allow spaces — and then `or`/`ou` is what ends the first one.
  if ((m = prompt.match(/^(?:Which is bigger|Lequel est le plus grand)\s*:\s*([\d.,\s ]+?)\s+(?:or|ou)\s+([\d.,\s ]+?)\s*\??$/i)))
    return (n(m[1]) >= n(m[2]) ? m[1] : m[2]).trim();
  if ((m = prompt.match(/^(?:Which is smaller|Lequel est le plus petit)\s*:\s*([\d.,\s ]+?)\s+(?:or|ou)\s+([\d.,\s ]+?)\s*\??$/i)))
    return (n(m[1]) <= n(m[2]) ? m[1] : m[2]).trim();

  // "Dans 279 907, quel est le chiffre des dizaines de mille ?" — the French
  // form names the place quite differently from the English one, and the place
  // itself can be three words.
  if ((m = prompt.match(/^Dans ([\d.,\s ]+), quel est le chiffre des ([a-zéèû ]+?)\s*\??$/i))) {
    const digits = m[1].replace(/[^\d]/g, '');
    const PLACE = { 'unités': 0, 'dizaines': 1, 'centaines': 2, 'milliers': 3, 'mille': 3,
      'dizaines de mille': 4, 'centaines de mille': 5, 'millions': 6,
      'dizaines de millions': 7, 'centaines de millions': 8, 'milliards': 9 };
    const place = PLACE[m[2].trim().toLowerCase()];
    if (place === undefined) return null;
    return digits[digits.length - 1 - place] || null;
  }
  if ((m = prompt.match(/^(?:Round|Arrondis) ([\d.,\s]+) to the nearest (\d+)/i)))
    return round(Math.round(n(m[1]) / n(m[2])) * n(m[2]));

  if (/^[a-zà-ÿ]{1,14}( [a-zà-ÿ]{1,14}){0,2}$/i.test(prompt)) return prompt; // a typing word
  return null;
}

/**
 * Wrap a deployed Rocket School in a driven page with the helpers every
 * scenario wants. `fn` gets `(d)` — the driver — and returns nothing; the
 * clause tally is `d.results`.
 */
async function withRocket({ dir, origin, shots, viewport }, fn) {
  const opts = origin ? { origin } : { dir, port: 0 };
  return withDeployedSite(opts, async (page) => {
    const results = [];
    let shotSeq = 0;

    const d = {
      page,
      results,
      VIEWPORTS,
      solve,

      /** Record a clause. `saw` is printed only on failure, and is what was actually read. */
      check(name, ok, saw) {
        results.push({ name, ok: Boolean(ok), saw });
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n        saw: ${String(saw).slice(0, 700)}`}`);
        return Boolean(ok);
      },

      /** Read the page. */
      read: () => page.evaluate(READ),
      evaluate: (expr) => page.evaluate(expr),
      question: () => page.evaluate(QUESTION),

      /** Screenshot, numbered in order so a run reads as a strip. */
      async snap(name) {
        shotSeq += 1;
        const file = `${String(shotSeq).padStart(2, '0')}-${name}.png`;
        if (shots) await page.screenshot(path.join(shots, file));
        return page.evaluate(READ);
      },

      async viewport(vp) {
        const v = typeof vp === 'string' ? VIEWPORTS[vp] : vp;
        await page.setViewport(v);
        await wait(500);
        return v;
      },

      /** Where is `label`, after scrolling it into view? */
      locate: (label, o) => page.evaluate(LOCATE(label, o)),
      locateSel: (sel, i) => page.evaluate(LOCATE_SEL(sel, i)),

      /**
       * Press `label`. Scrolls it into view first, then dispatches real mouse
       * events at its centre. `times: 2` for anything inside a Modal.
       */
      async click(label, o = {}) {
        const at = await page.evaluate(LOCATE(label, o));
        if (!at.found) return false;
        if (!at.reachable) console.warn(`  ⚠ "${label}" pressed THROUGH a blocker (${at.onTop})`);
        for (let i = 0; i < (o.times || 1); i++) {
          for (const type of ['mousePressed', 'mouseReleased'])
            await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
          await wait(o.gap || 250);
        }
        await wait(o.settle === undefined ? 600 : o.settle);
        return true;
      },

      /**
       * Press `label` until `expr` (a JS expression string) reads true, at most
       * `max` times.
       *
       * 🔴 This is the honest form of the two-tap rule. A Modal in this editor
       * can measure a ghost copy and swallow the first press — but when it does
       * NOT, a blind second press lands on whatever the first press revealed.
       * That is not hypothetical: pressing "No" twice on the buy card closed it
       * and then re-opened the tile underneath, and the drive bought a 40 ⭐
       * item while grading a 120 ⭐ one. Press, look, press again only if
       * nothing happened.
       */
      async pressUntil(label, expr, o = {}) {
        const max = o.max || 2;
        for (let i = 0; i < max; i++) {
          const pressed = await d.click(label, { ...o, times: 1 });
          if (!pressed) return false;
          if (await page.evaluate(`Boolean(${expr})`)) return true;
        }
        return false;
      },

      /** True while the page still shows `re` (a regex source). */
      showing: (re) => page.evaluate(`new RegExp(${JSON.stringify(re)}).test(document.body.innerText)`),

      async clickSel(sel, o = {}) {
        const at = await page.evaluate(LOCATE_SEL(sel, o.index || 0));
        if (!at.found) return false;
        for (let i = 0; i < (o.times || 1); i++) {
          for (const type of ['mousePressed', 'mouseReleased'])
            await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
          await wait(o.gap || 250);
        }
        await wait(o.settle === undefined ? 600 : o.settle);
        return true;
      },

      /** Focus the nth visible text box and insert `text`. */
      async typeInto(index, text) {
        const at = await page.evaluate(LOCATE_SEL('input', index));
        if (!at.found) return false;
        for (const type of ['mousePressed', 'mouseReleased'])
          await page.client.send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
        await wait(150);
        await page.client.send('Input.insertText', { text });
        await wait(250);
        return true;
      },

      async pressEnter() {
        for (const type of ['keyDown', 'keyUp'])
          await page.client.send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
        await wait(700);
      },

      /**
       * Answer the question on screen the way a child does.
       *
       * `wrong: true` answers deliberately wrong — what PLY-004 and PLY-006
       * need, because their whole subject is what a run of misses does.
       * Returns { prompt, answer, how } or null when nothing could be read.
       */
      async answer({ wrong = false } = {}) {
        const s = await page.evaluate(READ);
        const prompt = await page.evaluate(QUESTION);
        let want = solve(prompt);

        // Options: four buttons, one of them right.
        const optionish = s.buttons.filter((b) => !/^(Check|Vérifier|Home|Accueil|Switch|Start|Départ|Next|Suivant|Restart|Show me how|Change the race|Recommencer|Changer de course)$/.test(b));
        const numericOptions = optionish.filter((b) => /^-?[\d.,\s /]+$/.test(b));
        if (!s.padKeys.length && numericOptions.length >= 2) {
          // 🔴 Match the option by VALUE, not by spelling. `solve` returns
          // "0.2" and the French button is labelled "0,2"; comparing the
          // strings never matches, so the drive pressed the first option and
          // marked a working question wrong.
          const asNum = (x) => {
            let t = String(x).replace(/[\s  ]/g, '');
            if (/^[1-9]\d{0,2}(,\d{3})+$/.test(t)) t = t.replace(/,/g, ''); else t = t.replace(',', '.');
            if (/^-?\d+\/\d+$/.test(t)) { const [a, b] = t.split('/').map(Number); return a / b; }
            return Number(t);
          };
          const same = (a, b) => { const x = asNum(a), y = asNum(b); return isFinite(x) && isFinite(y) && Math.abs(x - y) < 1e-9; };
          const right = want === null ? null : numericOptions.find((b) => same(b, want));
          const pick = wrong
            ? (numericOptions.find((b) => !right || b !== right) || numericOptions[0])
            : (right || numericOptions[0]);
          await d.click(pick);
          return { prompt, answer: pick, how: 'option' };
        }

        // The kit's pad: type the characters, then commit.
        if (s.padKeys.length) {
          if (want === null) want = '1';
          let typed = wrong ? String((Number(want) || 0) + 1) : String(want);
          if (wrong && typed === String(want)) typed = String(Number(want) + 2);
          for (const ch of typed) {
            const ok = await d.clickSel(`[data-pad-key="${ch}"]`, { settle: 90, gap: 60 });
            if (!ok) return { prompt, answer: typed, how: 'pad-missing-key:' + ch };
          }
          await d.clickSel('[data-pad-submit]', { settle: 800 });
          return { prompt, answer: typed, how: 'pad' };
        }

        // A plain text box.
        if (s.inputs.length) {
          const typed = wrong ? 'zzzz' : (want === null ? '0' : String(want));
          await d.typeInto(0, typed);
          await d.pressEnter();
          return { prompt, answer: typed, how: 'input' };
        }
        return null;
      },

      /** The whole persisted store, parsed. */
      async store() {
        const raw = await page.evaluate(`(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return JSON.stringify(o); })()`);
        const flat = JSON.parse(raw);
        const out = {};
        for (const [k, v] of Object.entries(flat)) { try { out[k] = JSON.parse(v); } catch { out[k] = v; } }
        return out;
      },

      /** Write one key of the store and reload, so the app boots on it. */
      async seedStore(key, value) {
        await page.evaluate(`(() => { localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(value))}); return 1; })()`);
        await page.navigate('/');
        await wait(1500);
      },

      wait
    };

    await page.setViewport(viewport ? (typeof viewport === 'string' ? VIEWPORTS[viewport] : viewport) : VIEWPORTS['1366x768']);
    await wait(1200);
    await fn(d);

    const passed = results.filter((r) => r.ok).length;
    console.log(`\n${passed}/${results.length} clauses passed`);
    return { passed, total: results.length, results };
  });
}

module.exports = { withRocket, VIEWPORTS, READ, LOCATE, LOCATE_SEL, QUESTION, solve, wait };
