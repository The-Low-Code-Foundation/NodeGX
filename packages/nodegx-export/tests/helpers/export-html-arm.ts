/**
 * P134 HTX-002. The HTML export's arm for the desks: the same steps and the same readings the runtime arm
 * (`runtime-mounted-arm.js`) and the React arm (`export-react-arm.js`) take, on an HTML export's folder run in jsdom
 * (`html-in-jsdom.ts`: `app.js` and what it imports, from the export's own files only).
 *
 * A reading is the text of every `<p>` in document order (a Text draws a `<p>` unless its Tag says otherwise, as in the
 * React export), then, with `fields`, each field's text by its placeholder and which field has the focus. A step is a
 * button's words (a click), `type:<placeholder>:<text>` (focus, write as a keystroke does, blur) or
 * `enter:<placeholder>` (an Enter keydown), as the runtime arm takes them.
 *
 * `storage: { keys, seeds? }` is the runtime arm's (P18 session 139): before scenario i the browser's storage holds
 * `seeds[i]`, as a reload would leave it, and every reading ends with `storage=<text, or null>` for each key.
 *
 * P134 HTX-003 (session 5). `boxes` appends each checkbox, `[name]=on|off` in document order (its label's text, or `#1`,
 * `#2`… unlabelled: the runtime arm's `boxNames`), and a step `tick:<name>` clicks it as a person does.
 */

import { openHtmlExport, type HtmlPage } from './html-in-jsdom';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createFakeBackend } = require('./fake-parse-backend') as { createFakeBackend: (spec: unknown) => { log: unknown[]; fetch: unknown } };

export interface HtmlArmOptions {
  fields?: boolean;
  boxes?: boolean;
  storage?: { keys: string[]; seeds?: Array<Record<string, string>> };
  /**
   * P134 HTX-004, the runtime and React arms' option (P18 session 134): the page's `fetch` is `fake-parse-backend.js`, fresh
   * per scenario, with `session` stored where the running app keeps it (`Parse/<appId>/currentUser`). Read with
   * {@link htmlBackendArm}, which hands back each scenario's readings and the requests the backend was sent.
   */
  backend?: { spec: unknown; appId: string; session?: unknown };
  /** Console errors a scenario may report (a refused verb's line on the error channel), by their text. */
  allowErrors?: string[];
}

const FIELDS = 'input:not([type="checkbox"]), textarea';

/** Each checkbox and its name: the text of the `<label>` naming it (its `for`, or the one it sits in), else `#1`, `#2`…. */
const boxNames = (doc: any): Array<{ el: any; name: string }> => {
  let bare = 0;
  return ([...doc.querySelectorAll('input[type="checkbox"]')] as any[]).map((el) => {
    const label = (el.id ? doc.querySelector(`label[for="${el.id}"]`) : null) ?? el.closest('label');
    return { el, name: label ? (label.textContent ?? '').trim() : `#${++bare}` };
  });
};

const read = (page: HtmlPage, options: HtmlArmOptions): string[] => {
  const doc = page.document;
  const texts = [...doc.querySelectorAll('p')].map((p: any) => (p.textContent ?? '').trim());
  const stored = (options.storage?.keys ?? []).map((k) => `storage=${page.window.localStorage.getItem(k)}`);
  const boxes = options.boxes === true ? boxNames(doc).map((b) => `[${b.name}]=${b.el.checked ? 'on' : 'off'}`) : [];
  if (options.fields !== true) return [...texts, ...boxes, ...stored];
  const els = [...doc.querySelectorAll(FIELDS)] as any[];
  const name = (el: any) => `[${el.getAttribute('placeholder') ?? ''}]`;
  const active = els.find((el) => el === doc.activeElement);
  return [...texts, ...els.map((el) => `${name(el)}=${el.value}`), `focus=${active ? name(active) : 'none'}`, ...boxes, ...stored];
};

/** Waits until two readings in a row agree: the effects, and the timers a Function's run at load sets, have all run. */
async function settled(page: HtmlPage, options: HtmlArmOptions): Promise<void> {
  let last = '';
  for (let i = 0; i < 10; i++) {
    await page.settle();
    const now = JSON.stringify(read(page, options));
    if (now === last) return;
    last = now;
  }
  throw new Error('the page did not settle');
}

function step(page: HtmlPage, label: string): void {
  const w = page.window;
  const doc = page.document;
  const ticked = /^tick:([\s\S]*)$/.exec(label);
  if (ticked) {
    const found = boxNames(doc).find((b) => b.name === ticked[1]);
    if (!found) throw new Error(`no checkbox "${ticked[1]}"`);
    found.el.click();
    return;
  }
  const typed = /^(type|enter):([^:]*)(?::([\s\S]*))?$/.exec(label);
  if (typed) {
    const el = ([...doc.querySelectorAll(FIELDS)] as any[]).find((e) => (e.getAttribute('placeholder') ?? '') === typed[2]);
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
export async function htmlArm(files: Record<string, string>, scenarios: string[][], options: HtmlArmOptions = {}): Promise<string[][][]> {
  return (await htmlBackendArm(files, scenarios, options)).map((s) => s.readings);
}

/** Per scenario: the readings, and every request the backend was sent (none without `backend`). */
export async function htmlBackendArm(files: Record<string, string>, scenarios: string[][], options: HtmlArmOptions = {}): Promise<Array<{ readings: string[][]; requests: unknown[] }>> {
  const out: Array<{ readings: string[][]; requests: unknown[] }> = [];
  for (const [index, steps] of scenarios.entries()) {
    const backend = options.backend;
    const fake = backend !== undefined ? createFakeBackend(backend.spec) : undefined;
    const prepare = (w: any) => {
      if (fake === undefined) return;
      w.fetch = fake.fetch;
      if (backend!.session) w.localStorage.setItem(`Parse/${backend!.appId}/currentUser`, JSON.stringify(backend!.session));
    };
    const page = await openHtmlExport(files, '', options.storage?.seeds?.[index] ?? {}, { prepare, allowErrors: options.allowErrors });
    try {
      await settled(page, options);
      const readings = [read(page, options)];
      for (const label of steps) {
        step(page, label);
        await settled(page, options);
        readings.push(read(page, options));
      }
      out.push({ readings, requests: fake?.log ?? [] });
    } finally {
      page.close();
    }
  }
  return out;
}
