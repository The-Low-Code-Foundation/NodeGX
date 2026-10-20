// Opens the map in the installed Chrome (headless) and takes pictures, the way a person would look.
//   node test/shoot.mjs <url> <out.png> [actions…]
// actions: click:<node id>  lens:<all|anon|learner|staff>  wait:<ms>  pill:<field>=<value>
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const [url, out, ...actions] = process.argv.slice(2);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--no-default-browser-check'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1680, height: 1000, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__map?.map && window.__map.nodes.length > 0, { timeout: 20000 });
  for (const a of actions) {
    const [k, v] = [a.slice(0, a.indexOf(':')), a.slice(a.indexOf(':') + 1)];
    if (k === 'wait') await new Promise((r) => setTimeout(r, Number(v)));
    if (k === 'lens') await page.click(`.lens button[data-lens="${v}"]`);
    if (k === 'click') {
      // click the block where it is drawn on the canvas
      const pos = await page.evaluate((id) => {
        const s = window.__map, n = s.byId[id];
        return n && [n.x * s.cam.z + s.cam.x + 30, (n.y + n.h / 2) * s.cam.z + s.cam.y];
      }, v);
      if (!pos) throw new Error(`no block ${v}`);
      await page.mouse.click(pos[0], pos[1]);
    }
    if (k === 'pill') {
      const [field, value] = v.split('=');
      await page.click(`.pill[data-field="${field}"][data-value="${value}"]`);
    }
    if (k === 'press') await page.click(v);
    // post:<url> — a call with no one signed in, as a stranger's browser would make (the backend refuses it and records the run)
    if (k === 'post') await fetch(v, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    // postadmin:<url> — the same with the admin credential (from ../ADMIN-TOKEN): it passes the rule gate, the
    // function itself refuses it ("Unauthenticated requests not accepted."), and that refusal is recorded as a run
    if (k === 'postadmin') {
      const token = fs.readFileSync(new URL('../../ADMIN-TOKEN', import.meta.url), 'utf8').split('\n')[0].trim();
      await fetch(v, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}' });
    }
    if (k === 'waitrun') {
      await page.waitForFunction((n) => window.__map.runs[0]?.name === n, { timeout: 15000 }, v);
      await new Promise((r) => setTimeout(r, 350));
    }
    if (k === 'text') console.log(await page.$eval(v, (el) => el.innerText));
  }
  await page.screenshot({ path: out });
  if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
  else console.log('no page errors');
} finally {
  await browser.close();
}
