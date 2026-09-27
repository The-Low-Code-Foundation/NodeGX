/**
 * TPL-008 — light and dark, driven: the todo list follows the system, and the switch at
 * the top right overrides it.
 *
 * Richard (2026-09-14): *"can we have dark and light mode, matching system by default but
 * with a little icon at the top right for changing?"*
 *
 * The subject is the browser-only demo (`templates/todo-list-demo/`). The theme lives in
 * `App` and `Todo/Theme switch`, which the demo takes from the template unchanged, so no
 * backend is needed to grade it. The template's own drive reads the switch on its Sign in
 * page, which only the template has.
 *
 * ## What makes it a measurement
 *
 * - 🔴 **The system setting is emulated over the page's own CDP connection**
 *   (`Emulation.setEmulatedMedia`) and the page is read at each setting, so "follows the
 *   system" is two readings that differ, not one that happens to match.
 * - **Colours are read as the browser computed them** on the page ground, a task title
 *   and the dialog panel — the dark token reached the nodes, not only the stylesheet.
 * - 🔴 **"The other icon is hidden" is an absence**, so it sits beside its control: both
 *   buttons are in the page (`inDom: 2`), and exactly one is drawn and on top at its centre.
 * - The choice is read where the next visit reads it (`localStorage`), and through a reload.
 *
 * | clause | § |
 * |---|---|
 * | a light system draws light, with the moon | §0 |
 * | the system turning dark redraws dark, with the sun, and no click | §1 |
 * | the switch overrides the system, and remembers it | §2 |
 * | the choice survives a reload | §3 |
 * | choosing the system's own theme forgets the choice; the dialog follows | §4 |
 * | with nothing remembered, the page follows the system again | §5 |
 * | dark chosen on a light system | §6 |
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { placeStarterAssets } from './helpers/judge';
import { clickButton } from './helpers/members-drive';
import { withRenderedPage } from './helpers/site-drive';
import { clickButtonBeside, clickThemeSwitch, clickWords, text, themeSwitches, until, wait } from './helpers/todo-drive';

jest.setTimeout(600_000);

const REPO = path.join(__dirname, '..', '..', '..');
const DEMO_DIR = path.join(REPO, 'templates', 'todo-list-demo');
/** `THEME_STORAGE_KEY` in `packages/noodl-mcp/tests/tpl008Theme.ts`. */
const THEME_KEY = 'nodegx-todo-list-theme';
const VAT = 'Chase the accountant about VAT';
const MOT = 'Book the van in for its MOT';

/** `--background`, `--foreground` and `--surface` of each palette, as the browser reports them. */
const LIGHT = { ground: 'rgb(245, 245, 243)', text: 'rgb(29, 31, 33)', panel: 'rgb(255, 255, 255)' };
const DARK = { ground: 'rgb(22, 23, 24)', text: 'rgb(231, 231, 228)', panel: 'rgb(31, 32, 34)' };

interface Look {
  ground: string;
  text: string;
  attr: string | null;
  stored: string | null;
}

const LOOK = `(function () {
  var title = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
    return e.children.length === 0 && (e.textContent || '').trim() === ${JSON.stringify(VAT)};
  })[0];
  return JSON.stringify({
    ground: getComputedStyle(document.body).backgroundColor,
    text: title ? getComputedStyle(title).color : 'absent',
    attr: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem(${JSON.stringify(THEME_KEY)})
  });
})()`;

/** The dialog panel's own fill: the first painted box around its question. */
const PANEL = `(function () {
  var h = Array.prototype.filter.call(document.querySelectorAll('body *'), function (e) {
    return e.children.length === 0 && (e.textContent || '').trim() === 'What happened?';
  })[0];
  for (var el = h; el; el = el.parentElement) {
    var bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
  }
  return 'absent';
})()`;

describe('TPL-008 — light and dark, driven', () => {
  let driveError = '';
  let stoppedAt = '';
  const R: Record<string, unknown> = {};

  beforeAll(async () => {
    const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl008-theme-drive-'));
    fs.cpSync(DEMO_DIR, projectDir, { recursive: true });
    const placed = placeStarterAssets(projectDir);
    if (placed.failed.length) throw new Error(`starter assets failed: ${placed.failed.join(', ')}`);

    await withRenderedPage({ projectDir }, async (page) => {
      await page.setViewport({ width: 1280, height: 1000 });
      const client = (page as unknown as { client: { send(m: string, p?: unknown): Promise<{ data: string }> } }).client;
      const system = (value: 'light' | 'dark') =>
        client.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value }] });
      const shot = async (name: string): Promise<void> => {
        const dir = process.env.TPL008_SHOTS;
        if (!dir) return;
        fs.mkdirSync(dir, { recursive: true });
        const res = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(res.data, 'base64'));
      };
      const look = async (): Promise<Look> => JSON.parse(String(await page.evaluate(LOOK))) as Look;
      const settled = (label: string, ground: string) => until(label, look, (l) => l.ground === ground && l.text !== 'absent', 8000);
      const errorsByStep: Record<string, string[]> = {};
      let seen = 0;
      const step = (name: string) => {
        if (page.consoleErrors.length > seen) {
          errorsByStep[stoppedAt || 'boot'] = page.consoleErrors.slice(seen);
          seen = page.consoleErrors.length;
        }
        stoppedAt = name;
      };
      R.errorsByStep = errorsByStep;
      try {
        // ── §0 A light system, nothing chosen ─────────────────────────────────
        step('§0 light system');
        await system('light');
        await until('example list drawn', () => text(page), (s) => s.includes(VAT));
        await page.evaluate(`localStorage.removeItem(${JSON.stringify(THEME_KEY)})`);
        await page.navigate('/');
        await until('example list drawn again', () => text(page), (s) => s.includes(VAT));
        await wait(1000);
        R.s0 = { ...(await settled('drawn light', LIGHT.ground)), switches: await themeSwitches(page) };
        await shot('theme-0-light');

        // ── §1 The system turns dark ──────────────────────────────────────────
        step('§1 system turns dark');
        await system('dark');
        R.s1 = { ...(await settled('redrawn dark', DARK.ground)), switches: await themeSwitches(page) };
        await shot('theme-1-dark-by-system');

        // ── §2 The switch: light, on a dark system ────────────────────────────
        step('§2 choose light');
        await clickThemeSwitch(page);
        R.s2 = { ...(await settled('switched to light', LIGHT.ground)), switches: await themeSwitches(page) };

        // ── §3 A reload keeps the choice ──────────────────────────────────────
        step('§3 reload');
        await page.navigate('/');
        await until('drawn after reload', () => text(page), (s) => s.includes(VAT));
        await wait(1500);
        R.s3 = await look();

        // ── §4 Choosing dark — the system's own — forgets the choice ──────────
        step('§4 choose dark on a dark system');
        await clickThemeSwitch(page);
        R.s4 = { ...(await settled('switched to dark', DARK.ground)), switches: await themeSwitches(page) };
        step('§4 dialog');
        await clickButtonBeside(page, MOT, 3, 2);
        await until('close dialog', () => text(page), (s) => s.includes('What happened?'));
        await wait(500);
        R.panel = await page.evaluate(PANEL);
        await shot('theme-2-dialog-dark');
        await clickButton(page, 'Cancel');
        await until('dialog closed', () => text(page), (s) => !s.includes('What happened?'));

        // ── §5 Nothing remembered: the system turning light is followed ───────
        step('§5 system turns light');
        await system('light');
        R.s5 = await settled('follows the system again', LIGHT.ground);

        // ── §6 The switch: dark, on a light system ────────────────────────────
        step('§6 choose dark on a light system');
        await clickThemeSwitch(page);
        R.s6 = { ...(await settled('switched to dark', DARK.ground)), switches: await themeSwitches(page) };
        await clickWords(page, VAT);
        await until('task opened', () => text(page), (s) => s.includes('Next actions'));
        await wait(800);
        await shot('theme-3-detail-dark');
        step('finished');
        stoppedAt = 'finished';
        R.consoleErrors = [...page.consoleErrors];
      } catch (error) {
        driveError = error instanceof Error ? error.message : String(error);
        R.consoleErrors = [...page.consoleErrors];
        R.textAtFailure = (await text(page).catch(() => '')).slice(0, 2000);
      }
    });
  });

  it('drives to the end without a step failing', () => {
    expect({ stoppedAt, driveError, textAtFailure: R.textAtFailure }).toEqual({ stoppedAt: 'finished', driveError: '', textAtFailure: undefined });
  });

  it('§0 a light system draws light, and only the moon shows — with both switches in the page', () => {
    expect(R.s0).toEqual({ ground: LIGHT.ground, text: LIGHT.text, attr: null, stored: null, switches: { inDom: 2, shown: ['Use dark theme'] } });
  });

  it('§1 when the system turns dark the page redraws dark and shows the sun, with no click and nothing remembered', () => {
    expect(R.s1).toEqual({ ground: DARK.ground, text: DARK.text, attr: null, stored: null, switches: { inDom: 2, shown: ['Use light theme'] } });
  });

  it('§2 the switch overrides a dark system, and remembers it', () => {
    expect(R.s2).toEqual({ ground: LIGHT.ground, text: LIGHT.text, attr: 'light', stored: 'light', switches: { inDom: 2, shown: ['Use dark theme'] } });
  });

  it('§3 the choice survives a reload', () => {
    expect(R.s3).toEqual({ ground: LIGHT.ground, text: LIGHT.text, attr: 'light', stored: 'light' });
  });

  it('§4 choosing the system’s own theme forgets the choice — and the dialog panel is dark too', () => {
    expect(R.s4).toEqual({ ground: DARK.ground, text: DARK.text, attr: null, stored: null, switches: { inDom: 2, shown: ['Use light theme'] } });
    expect(R.panel).toBe(DARK.panel);
  });

  it('§5 with nothing remembered, the system turning light is followed', () => {
    expect(R.s5).toEqual({ ground: LIGHT.ground, text: LIGHT.text, attr: null, stored: null });
  });

  it('§6 dark can be chosen on a light system', () => {
    expect(R.s6).toEqual({ ground: DARK.ground, text: DARK.text, attr: 'dark', stored: 'dark', switches: { inDom: 2, shown: ['Use light theme'] } });
  });

  it('logs no console errors on the way', () => {
    expect({ errors: R.consoleErrors, byStep: R.errorsByStep }).toEqual({ errors: [], byStep: {} });
  });
});
