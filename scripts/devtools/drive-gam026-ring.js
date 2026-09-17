#!/usr/bin/env node
/**
 * P88 GAM-026 — every control a keyboard reaches shows where it is.
 *
 * Session 23 rang the Button, the two deprecated controls, the Select and both Ranges with
 * `:focus-visible { outline }` on the focused element. The CURRENT Checkbox, Radio Button and
 * Dropdown put their real `<input>` at `opacity: 0` inside a wrapper that draws the visible box,
 * so a ring on the focused element paints nothing a person can see. That is what this grades.
 *
 * 🔴 **The ring is a VISIBILITY claim, so it is read on the element a person LOOKS at**, not on
 * whatever has the focus. For each control the drive finds the focused element, then walks up to
 * the nearest ancestor that is actually visible (opacity > 0.05 and a box with area) and reads the
 * outline there. `outline-style: none` on a visible box is the defect; a ring on an invisible
 * input is the same defect wearing a passing reading — s23's `outline: auto` trap, one level up.
 *
 * Clauses, per control, per arm:
 *   focus   — Tab (or a click, in the mouse arm) put the focus on this control's input
 *   fv      — that input matches `:focus-visible`   (the known-firing signal: without it a ring
 *             that is missing and a ring that is correctly withheld read identically)
 *   ring    — the VISIBLE element draws a ring: outline-style solid, width >= 2px, an offset
 *   colour  — that ring's colour is the project's `--ring` token, not a browser default
 *   noRing  — (mouse arm) the visible element draws NO ring after a real pointer click
 *
 * Usage:
 *   node scripts/devtools/drive-gam026-ring.js <deploy-dir> [--shots <dir>] [--mouse] [--json <file>]
 * Exits 0 when every clause passed.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};
if (!dir) {
  console.error('usage: drive-gam026-ring.js <deploy-dir> [--shots <dir>] [--mouse] [--json <file>]');
  process.exit(2);
}
const shots = opt('shots');
if (shots) fs.mkdirSync(shots, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The reading, run in the page. `document.activeElement` is the focused input; the element a
 * person sees is the first ancestor (or the input itself) with real opacity and a real box.
 */
const READ = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { focus: false };
  const visible = (n) => {
    const cs = getComputedStyle(n);
    const r = n.getBoundingClientRect();
    return Number(cs.opacity) > 0.05 && cs.visibility !== 'hidden' && r.width > 1 && r.height > 1;
  };
  let seen = el, hops = 0;
  while (seen && !visible(seen) && hops < 4) { seen = seen.parentElement; hops++; }
  const cs = seen ? getComputedStyle(seen) : null;
  const r = seen ? seen.getBoundingClientRect() : null;
  let fv = false;
  try { fv = el.matches(':focus-visible'); } catch (e) { fv = false; }
  return {
    focus: true,
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || '',
    cls: String(el.className || '').slice(0, 120),
    fv,
    hops,
    seenTag: seen ? seen.tagName.toLowerCase() : null,
    seenCls: seen ? String(seen.className || '').slice(0, 120) : null,
    outlineStyle: cs ? cs.outlineStyle : null,
    outlineWidth: cs ? cs.outlineWidth : null,
    outlineColor: cs ? cs.outlineColor : null,
    outlineOffset: cs ? cs.outlineOffset : null,
    boxShadow: cs ? cs.boxShadow : null,
    ringToken: getComputedStyle(document.documentElement).getPropertyValue('--ring').trim() ||
               getComputedStyle(document.body).getPropertyValue('--ring').trim(),
    rect: r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } : null
  };
})()`;

/** What each control is called in the report, matched on the focused element. */
function nameOf(read) {
  const c = read.cls || '';
  if (/ndl-controls-checkbox-2/.test(c)) return 'checkbox';
  if (/ndl-controls-radio-2/.test(c)) return 'radio';
  if (read.tag === 'select') return 'dropdown';
  if (read.tag === 'button') return 'button';
  if (read.tag === 'input' && read.type === 'text') return 'textinput';
  return `${read.tag}${read.type ? '/' + read.type : ''}`;
}

/** rgb(a) → [r,g,b]; anything else → null. */
function rgb(s) {
  const m = String(s || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map((n) => parseFloat(n));
  return [p[0], p[1], p[2]];
}
function sameColour(a, b) {
  const x = rgb(a);
  const y = rgb(b);
  if (!x || !y) return false;
  return x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
}
/** The project's `--ring` value as the browser would paint it. */
async function tokenRgb(page, token) {
  if (!token) return null;
  const v = await page.evaluate(`(() => {
    const d = document.createElement('div');
    d.style.color = ${JSON.stringify(token)};
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    return c;
  })()`);
  return v;
}

(async () => {
  const rows = [];
  const mouse = flag('mouse');
  await withDeployedSite({ dir }, async (page) => {
    await page.setViewport({ width: 1366, height: 768 });
    // Keys reach the page only with focus emulation on this same connection.
    await page.client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await wait(800);

    const send = (m, p) => page.client.send(m, p);
    const key = async (k, code, vk) => {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
      await wait(160);
    };
    const tab = () => key('Tab', 'Tab', 9);

    const wanted = ['button', 'checkbox', 'radio', 'dropdown', 'textinput'];
    const token = await page.evaluate(
      `getComputedStyle(document.documentElement).getPropertyValue('--ring').trim() || getComputedStyle(document.body).getPropertyValue('--ring').trim()`
    );
    const tokenPaint = await tokenRgb(page, token);

    if (mouse) {
      /**
       * The arm s23 never graded. A real pointer press on each control — the same reading, and
       * the claim is the opposite one: a mouse user gets NO ring. Run in the same process as a
       * Tab round below, so "no ring" cannot pass by the ring being broken everywhere.
       */
      for (const want of wanted) {
        const at = await page.evaluate(`(() => {
          const pick = {
            button: 'button',
            checkbox: '.ndl-controls-checkbox-2',
            radio: '.ndl-controls-radio-2',
            dropdown: 'select',
            textinput: 'input[type="text"]'
          }[${JSON.stringify(want)}];
          const el = document.querySelector(pick);
          if (!el) return null;
          const box = el.getBoundingClientRect().width > 1 ? el : el.parentElement;
          const r = box.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        })()`);
        if (!at) {
          rows.push({ control: want, arm: 'mouse', failed: ['present'] });
          continue;
        }
        for (const type of ['mousePressed', 'mouseReleased']) {
          await send('Input.dispatchMouseEvent', {
            type,
            x: Math.round(at.x),
            y: Math.round(at.y),
            button: 'left',
            clickCount: 1
          });
        }
        await wait(220);
        const read = await page.evaluate(READ);
        const failed = [];
        if (!read.focus) failed.push('focus');
        const ringed = read.outlineStyle && read.outlineStyle !== 'none' && parseFloat(read.outlineWidth) >= 1;
        /**
         * 🔴 **`:focus-visible` after a click is the BROWSER's ruling, not ours, and it is not
         * the same for every control.** Measured in Chromium on this page: a click on the Button,
         * the Checkbox and the Radio leaves `:focus-visible` false — a mouse user gets no ring.
         * A click into the Dropdown and the Text Input leaves it TRUE, because typing is the next
         * thing you do in either, and a native `<select>` shows its own ring on a click for that
         * reason. So "a mouse click draws no ring" is graded where the platform makes that claim,
         * and everywhere else the claim is the exact one the rule makes: the ring follows
         * `:focus-visible` and nothing else. Writing `noRing` for all five would be an assertion
         * written from the intent, losing to the decision the platform already made.
         */
        if (['button', 'checkbox', 'radio'].includes(want)) {
          if (read.fv) failed.push('mouseModality');
          if (ringed) failed.push('noRing');
        } else if (want === 'textinput') {
          if (ringed) failed.push('noRing');
        } else if (Boolean(ringed) !== Boolean(read.fv)) {
          failed.push('followsFv');
        }
        rows.push({ control: want, arm: 'mouse', focused: read.focus ? nameOf(read) : null, fv: read.fv, read, failed });
        if (shots) await page.screenshot(path.join(shots, `mouse-${want}.png`));
      }
    }

    /** The Tab round: from the top of the document, each control in turn. */
    await page.evaluate(`(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0,0); })()`);
    const seen = new Map();
    for (let i = 0; i < 14 && seen.size < wanted.length; i++) {
      await tab();
      const read = await page.evaluate(READ);
      if (!read.focus) continue;
      const name = nameOf(read);
      if (!wanted.includes(name) || seen.has(name)) continue;
      seen.set(name, read);
      if (shots) await page.screenshot(path.join(shots, `tab-${name}.png`));
    }

    for (const want of wanted) {
      const read = seen.get(want);
      if (!read) {
        rows.push({ control: want, arm: 'tab', failed: ['focus'] });
        continue;
      }
      const failed = [];
      if (!read.fv) failed.push('fv');
      const width = parseFloat(read.outlineWidth);
      const ringed = read.outlineStyle === 'solid' && width >= 2 && parseFloat(read.outlineOffset) !== 0;
      // The Text Input owes no ring: its caret is the indicator (s23's NO_RING list).
      if (want === 'textinput') {
        if (ringed) failed.push('noRing');
      } else {
        if (!ringed) failed.push('ring');
        else if (tokenPaint && !sameColour(read.outlineColor, tokenPaint)) failed.push('colour');
      }
      rows.push({ control: want, arm: 'tab', focused: nameOf(read), fv: read.fv, read, failed });
    }

    rows.push({ control: '(page)', arm: 'both', consoleErrors: page.consoleErrors.slice(0, 5), token, tokenPaint, failed: [] });
  });

  const bad = rows.filter((r) => r.failed && r.failed.length);
  for (const r of rows) {
    if (r.control === '(page)') {
      console.log(`token --ring: ${r.token || '(none)'} → ${r.tokenPaint || '(unset)'}; console errors: ${r.consoleErrors.length}`);
      continue;
    }
    const d = r.read || {};
    console.log(
      `${r.failed.length ? 'RED ' : 'pass'} ${r.arm.padEnd(5)} ${r.control.padEnd(10)} ` +
        `fv=${r.fv} seen=${d.seenTag || '-'}${d.hops ? `(+${d.hops})` : ''} ` +
        `outline=${d.outlineStyle || '-'} ${d.outlineWidth || ''} ${d.outlineColor || ''} off=${d.outlineOffset || ''}` +
        (r.failed.length ? `  failed: ${r.failed.join(',')}` : '')
    );
  }
  const jsonOut = opt('json');
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 2));
  console.log(bad.length ? `\n${bad.length} RED of ${rows.length - 1}` : `\nALL PASS (${rows.length - 1} readings)`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
