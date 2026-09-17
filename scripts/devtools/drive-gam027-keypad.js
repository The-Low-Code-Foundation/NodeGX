#!/usr/bin/env node
/**
 * P88 GAM-027 — a keypad key that does not take the cursor.
 *
 * The person sentence: tapping a key types into the answer box and the cursor stays in the box,
 * so the next key — or the next digit typed on the real keyboard — goes where they are looking.
 *
 * 🔴 **A control pair on ONE page, in ONE run.** Key `7` has `Keeps Focus` on and key `4` does
 * not; they are identical otherwise, and both are wired to the same field's `Insert Text`. So the
 * `4` row is the known-firing signal: if it did not move the caret, the drive is not pressing, and
 * the `7` row proves nothing. Each arm is the other's control.
 *
 * Clauses, per key:
 *   inserted  — the digit reached the field (the press did something at all)
 *   focus     — after the tap, document.activeElement is still the field   (the `7` claim)
 *   caret     — the caret sits immediately after the inserted digit, not at the end
 *   typed     — a digit typed on the real keyboard afterwards lands in the field, at the caret
 * and for the plain key the same readings are taken and the EXPECTATION is reversed: focus must
 * have left the field, which is what makes this pair a measurement rather than a hope.
 *
 * Usage: node scripts/devtools/drive-gam027-keypad.js <deploy-dir> [--shots <dir>] [--viewport 390x844]
 * Exits 0 when every clause in every row passed.
 */
const fs = require('fs');
const path = require('path');
const { withDeployedSite } = require('./drive-deployed.js');

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const opt = (n) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : null;
};
if (!dir) {
  console.error('usage: drive-gam027-keypad.js <deploy-dir> [--shots <dir>] [--viewport WxH]');
  process.exit(2);
}
const shots = opt('shots');
if (shots) fs.mkdirSync(shots, { recursive: true });
const [vw, vh] = (opt('viewport') || '1024x768').split('x').map(Number);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** What the field holds, where its caret is, and whether it still has the keyboard. */
const READ = `(() => {
  const input = document.querySelector('input[type="text"], input:not([type])');
  const active = document.activeElement;
  return {
    value: input ? input.value : null,
    start: input ? input.selectionStart : null,
    end: input ? input.selectionEnd : null,
    fieldHasFocus: Boolean(input) && active === input,
    activeTag: active ? active.tagName.toLowerCase() : null,
    activeText: active && active.innerText ? active.innerText.trim().slice(0, 12) : ''
  };
})()`;

(async () => {
  const rows = [];
  await withDeployedSite({ dir }, async (page) => {
    await page.setViewport({ width: vw, height: vh });
    await page.client.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await wait(600);
    const send = (m, p) => page.client.send(m, p);

    const typeDigit = async (digit) => {
      for (const type of ['keyDown', 'keyUp']) {
        await send('Input.dispatchKeyEvent', {
          type,
          key: digit,
          code: `Digit${digit}`,
          windowsVirtualKeyCode: digit.charCodeAt(0),
          ...(type === 'keyDown' ? { text: digit, unmodifiedText: digit } : {})
        });
      }
      await wait(140);
    };

    /** Put the person back where a keypad starts: `12` typed, caret between the 1 and the 2. */
    const reset = async () => {
      const at = await page.evaluate(`(() => {
        const i = document.querySelector('input[type="text"], input:not([type])');
        i.focus();
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(i, '');
        i.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      })()`);
      if (!at) throw new Error('no field on the page');
      await typeDigit('1');
      await typeDigit('2');
      await page.evaluate(`(() => {
        const i = document.querySelector('input[type="text"], input:not([type])');
        i.setSelectionRange(1, 1);
        return i.value;
      })()`);
      await wait(120);
    };

    for (const { label, keeps } of [{ label: '7', keeps: true }, { label: '4', keeps: false }]) {
      await reset();
      const before = await page.evaluate(READ);
      const at = await page.evaluate(`(() => {
        const b = [...document.querySelectorAll('button')].find((e) => e.innerText.trim() === ${JSON.stringify(label)});
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      })()`);
      if (!at) {
        rows.push({ key: label, keeps, failed: ['present'] });
        continue;
      }
      for (const type of ['mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: Math.round(at.x), y: Math.round(at.y), button: 'left', clickCount: 1 });
      }
      await wait(320);
      const after = await page.evaluate(READ);
      if (shots) await page.screenshot(path.join(shots, `key-${label}.png`));

      // Then the real keyboard, which is the half a person actually notices.
      await typeDigit('5');
      const typed = await page.evaluate(READ);

      const failed = [];
      const inserted = after.value !== before.value;
      if (!inserted) failed.push('inserted');
      if (keeps) {
        if (!after.fieldHasFocus) failed.push('focus');
        // `12` with the caret after the `1`, insert `9` → `192`, caret at 2.
        if (after.start !== 2) failed.push('caret');
        if (typed.value !== '1952') failed.push('typed');
      } else {
        // The known-firing half: a plain key DOES take the keyboard. If this passes, the drive presses.
        if (after.fieldHasFocus) failed.push('plainKeyKeptFocus(control)');
      }
      rows.push({ key: label, keeps, before, after, typed, failed });
    }
    rows.push({ key: '(page)', consoleErrors: page.consoleErrors.slice(0, 5), failed: [] });
  });

  const bad = rows.filter((r) => r.failed && r.failed.length);
  for (const r of rows) {
    if (r.key === '(page)') {
      console.log(`console errors: ${r.consoleErrors.length}${r.consoleErrors.length ? ' — ' + r.consoleErrors[0] : ''}`);
      continue;
    }
    const a = r.after || {};
    const t = r.typed || {};
    console.log(
      `${r.failed.length ? 'RED ' : 'pass'} key ${r.key} (Keeps Focus ${r.keeps ? 'ON ' : 'off'}) ` +
        `value ${JSON.stringify(r.before && r.before.value)}→${JSON.stringify(a.value)} caret ${a.start} ` +
        `field has focus: ${a.fieldHasFocus} (active <${a.activeTag}> ${JSON.stringify(a.activeText)}) ` +
        `then typed 5 → ${JSON.stringify(t.value)}` +
        (r.failed.length ? `  failed: ${r.failed.join(',')}` : '')
    );
  }
  console.log(bad.length ? `\n${bad.length} RED of ${rows.length - 1}` : `\nALL PASS (${rows.length - 1} keys)`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
