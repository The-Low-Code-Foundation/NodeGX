/**
 * P134 HTX-002. The HTML export's arm for the desks: the same steps and the same readings the runtime arm
 * (`runtime-mounted-arm.js`) and the React arm (`export-react-arm.js`) take, on an HTML export's folder run in jsdom
 * (`html-in-jsdom.ts`: `app.js` and what it imports, from the export's own files only).
 *
 * A reading is the text of every `<p>` in document order (a Text draws a `<p>` unless its Tag says otherwise, as in the
 * React export), then, with `fields`, each field's text by its placeholder and which field has the focus. A step is a
 * button's words (a click), `type:<placeholder>:<text>` (focus, write as a keystroke does, blur) or
 * `enter:<placeholder>` (an Enter keydown), as the runtime arm takes them.
 */

import { openHtmlExport, type HtmlPage } from './html-in-jsdom';

const read = (page: HtmlPage, fields: boolean): string[] => {
  const doc = page.document;
  const texts = [...doc.querySelectorAll('p')].map((p: any) => (p.textContent ?? '').trim());
  if (!fields) return texts;
  const els = [...doc.querySelectorAll('input, textarea')] as any[];
  const name = (el: any) => `[${el.getAttribute('placeholder') ?? ''}]`;
  const active = els.find((el) => el === doc.activeElement);
  return [...texts, ...els.map((el) => `${name(el)}=${el.value}`), `focus=${active ? name(active) : 'none'}`];
};

/** Waits until two readings in a row agree: the effects, and the timers a Function's run at load sets, have all run. */
async function settled(page: HtmlPage, fields: boolean): Promise<void> {
  let last = '';
  for (let i = 0; i < 10; i++) {
    await page.settle();
    const now = JSON.stringify(read(page, fields));
    if (now === last) return;
    last = now;
  }
  throw new Error('the page did not settle');
}

function step(page: HtmlPage, label: string): void {
  const w = page.window;
  const doc = page.document;
  const typed = /^(type|enter):([^:]*)(?::([\s\S]*))?$/.exec(label);
  if (typed) {
    const el = ([...doc.querySelectorAll('input, textarea')] as any[]).find((e) => (e.getAttribute('placeholder') ?? '') === typed[2]);
    if (!el) throw new Error(`no field "${typed[2]}"`);
    if (typed[1] === 'enter') {
      el.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      return;
    }
    el.focus();
    const proto = el.tagName === 'TEXTAREA' ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, typed[3] ?? '');
    el.dispatchEvent(new w.Event('input', { bubbles: true }));
    el.blur();
    return;
  }
  const button = ([...doc.querySelectorAll('button')] as any[]).find((b) => (b.textContent ?? '').trim() === label);
  if (!button) throw new Error(`no button "${label}"`);
  button.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
}

/** Per scenario: one reading after load, and one after each step. */
export async function htmlArm(files: Record<string, string>, scenarios: string[][], options: { fields?: boolean } = {}): Promise<string[][][]> {
  const out: string[][][] = [];
  for (const steps of scenarios) {
    const page = await openHtmlExport(files);
    try {
      await settled(page, options.fields === true);
      const readings = [read(page, options.fields === true)];
      for (const label of steps) {
        step(page, label);
        await settled(page, options.fields === true);
        readings.push(read(page, options.fields === true));
      }
      out.push(readings);
    } finally {
      page.close();
    }
  }
  return out;
}
