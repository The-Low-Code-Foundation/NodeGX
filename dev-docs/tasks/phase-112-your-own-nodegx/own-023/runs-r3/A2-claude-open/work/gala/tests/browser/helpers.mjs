// What every browser test needs: the game's own server on a free port with its own settings folder, a Chromium page at
// the MacBook's size that records every console error, and the grown-ups' gate opened the way a grown-up does.
// A developer tool only: the game never imports this (nor playwright).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MAC = { width: 1426, height: 690 }, PHONE = { width: 390, height: 844 };
export const SHOTS = process.env.SHOTS ? join(ROOT, 'changes', process.env.SHOTS) : null;

// the server from `dir` (a copy of the folder, for the upgrade test), keeping its files in `data`
export async function startServer({ dir = ROOT, data } = {}) {
  data = data || await mkdtemp(join(tmpdir(), 'gala-data-'));
  const proc = spawn(process.execPath, [join(dir, 'serve.mjs')], { cwd: dir, env: { ...process.env, PORT: '0', GALA_DIR: data }, stdio: ['ignore', 'pipe', 'inherit'] });
  const port = await new Promise((res, rej) => {
    let out = ''; proc.stdout.on('data', (b) => { out += b; const m = out.match(/localhost:(\d+)/); if (m) res(+m[1]); });
    proc.on('exit', (c) => rej(new Error(`server exited ${c}`)));
  });
  return { url: `http://localhost:${port}/`, port, data, stop: () => new Promise((r) => { proc.once('exit', r); proc.kill(); }) };
}
export const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// a page that records errors; the web fonts are answered empty, so a test never depends on the internet
export async function openGame(browser, url, { viewport = MAC, context = null } = {}) {
  const ctx = context || await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push(String(e)));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(url);
  await ready(page);
  return page;
}
export async function ready(page) {
  await page.waitForFunction(() => window.__game && window.__game.frames > 3, null, { timeout: 30000 });
  // the season's welcome card: closed, as a player would
  const go = page.locator('#introGo'); if (await go.isVisible()) await go.click();
}
// hold ⚙️ for two seconds, then type the sum's answer
export async function holdGear(page, ms = 2300) {
  const box = await page.locator('#gearBtn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(ms); await page.mouse.up();
}
export async function answerGate(page, right = true) {
  const q = await page.locator('#gateQ').textContent(), [a, b] = q.match(/\d+/g).map(Number);
  await page.fill('#gateIn', String(right ? a * b : a * b + 1)); await page.click('#gateOk');
}
export async function openSettings(page) {
  await holdGear(page); await page.locator('#gateQ').waitFor(); await answerGate(page);
  await page.locator('#grown .gpanel').waitFor();
}
export const tab = (page, k) => page.click(`[data-gtab="${k}"]`);
// open a row of the settings (its fields show), by its table and id
export async function row(page, table, id) {
  const d = page.locator(`details[data-row="${table}|${id}"]`);
  if ((await d.getAttribute('open')) === null) await d.locator('summary').click();
  return d;
}
export const fieldIn = (page, table, id, f, kind = 'text') => page.locator(`#grown input[data-k="${kind}"][data-t="${table}"][data-id="${id}"][data-f="${f}"]`);
export async function type(page, table, id, f, value, kind = 'text') { const el = fieldIn(page, table, id, f, kind); await el.fill(String(value)); await el.press('Enter'); }
// close the screen: the game reloads with the settings applied
export async function closeSettings(page) {
  await Promise.all([page.waitForEvent('load'), page.click('#gClose')]);
  await ready(page);
}
export const settingsFile = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__game.settings.file)));
export async function shot(page, name) { if (!SHOTS) return; await mkdir(SHOTS, { recursive: true }); await page.screenshot({ path: join(SHOTS, `${name}.png`) }); }
// the toast's words, once it says something matching
export async function toastSays(page, re) {
  await page.waitForFunction((src) => new RegExp(src).test(document.querySelector('#toast').textContent), re.source, { timeout: 10000 });
  return page.locator('#toast').textContent();
}
