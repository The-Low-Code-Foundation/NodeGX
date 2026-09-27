#!/usr/bin/env node
/**
 * THE SAME PAGES, FROM A BACKEND (TASK-L171 criteria 1, 2, 5, 7, 8).
 *
 * Two verbs:
 *
 *   capture — load each page in headless Chrome and record `#root`, normalised,
 *             with its sha256, every console error and page error, and every
 *             `/functions/*` response the page made (status and body). Optionally
 *             signed in as one of the seed's users.
 *   compare — two captures, page by page: identical, or the differing lines.
 *
 *   node tools/check-pages.mjs capture --app http://127.0.0.1:8601 --out head.json
 *   node tools/check-pages.mjs capture --app http://127.0.0.1:8602 --out swap.json \
 *        --as sam.okafor@example.test --backend http://127.0.0.1:8577 --token <admin credential> \
 *        --pages course=/course,lesson=/lesson?concept=scoping-what-to-build
 *   node tools/check-pages.mjs compare head.json swap.json
 *
 * WHY `#root` AND NOT THE BODY (sprint 47, L163): the body carries the project
 * JSON inlined into a <script>, so a string table growing a key NOTHING renders
 * moves every body hash. `#root` is what a person sees.
 *
 * WHY `input-<uuid>` IS NORMALISED (L167): the runtime mints a fresh id per
 * render for every input, so two renders of one page never share one.
 *
 * `/course` DRIFTS WITH THE CLOCK (L163): the pace line's last vertex is NOW.
 * Capture both sides of a comparison in one window, and attribute that vertex
 * rather than calling the page changed.
 *
 * SIGNING IN WITHOUT THE MAIL (`--as`): a session is minted with the admin
 * credential, exactly as check-read-functions does, and written where the
 * runtime keeps one — `Parse/<appId>/currentUser` — before the first script
 * runs. This is a MEASURING instrument, not a way in: the product's way in is
 * the magic link, and criterion 4/6 drive that end to end, through Mailpit.
 * Every minted session is deleted afterwards and the deletion is read back.
 *
 * puppeteer-core comes from the product repo (DBT_REPO), the way the kit's
 * build and check-read-functions find their dependencies. No browser download:
 * it drives the installed Chrome.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..');
const DBT_REPO = process.env.DBT_REPO || resolve(here, '..', '..', '..', '..', 'digital-bricks-training');
const argv = process.argv.slice(2);
const verb = argv[0];
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : fallback;
};

const sha = (s) => createHash('sha256').update(s).digest('hex');
const normalise = (html) => html.replace(/input-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'input-<uuid>');

const DEFAULT_PAGES = 'home=/,course=/course,lesson=/lesson,people=/people,learner=/learner';
const parsePages = (spec) =>
  spec.split(',').map((p) => {
    const i = p.indexOf('=');
    return { name: p.slice(0, i), path: p.slice(i + 1) };
  });


/*
 * THE DOM AUDIT (criterion 7, --audit). Run in the page. It reports, with the
 * element each hit belongs to, so a hit can be ATTRIBUTED rather than counted
 * (L91): a colour in the red band that is not the accent, any use of --warm, a
 * colour literal written inline on a property that paints, a percentage, a
 * cross, a fraction, and horizontal overflow. `--calibrate` first injects
 * `1 of 3 · 40% behind ✗` in #ff0000, and a span in var(--warm), into #root so every counter is SEEN to
 * fire before a zero is believed (L105: a zero from a blind counter is nothing).
 */
function auditInPage(calibrate) {
  const root = document.getElementById('root') || document.body;
  if (calibrate) {
    const probe = document.createElement('p');
    probe.className = 'calibration-probe';
    probe.setAttribute('style', 'color: #ff0000');
    probe.textContent = '1 of 3 · 40% behind ✗';
    const warmProbe = document.createElement('span');
    warmProbe.className = 'calibration-probe-warm';
    warmProbe.setAttribute('style', 'color: var(--warm)');
    warmProbe.textContent = ' warm';
    probe.appendChild(warmProbe);
    root.appendChild(probe);
  }
  const resolve = (value) => {
    const d = document.createElement('div');
    d.style.color = value;
    document.body.appendChild(d);
    const c = getComputedStyle(d).color;
    d.remove();
    return c;
  };
  const rgb = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map((x) => parseFloat(x));
    if (a === 0) return null;
    return [r, g, b];
  };
  const hueSat = ([r, g, b]) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s, l };
  };
  const ACCENT = ['var(--primary)', 'var(--thread)', 'var(--thread-deep)', 'var(--thread-tint)', 'var(--primary-hover)'].map(resolve);
  const WARM = resolve('var(--warm)');
  const warmDefined = WARM !== resolve('var(--no-such-token-here)');
  const describe = (el) => (el.getAttribute('class') || el.tagName.toLowerCase()).toString().trim().split(/\s+/).slice(0, 3).join('.');
  const reds = [], accentReds = [], warm = [], inline = [];
  const props = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'fill', 'stroke'];
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    for (const prop of props) {
      if (prop.startsWith('border')) {
        const side = prop.replace('border', '').replace('Color', '');
        if (cs['border' + side + 'Style'] === 'none' || parseFloat(cs['border' + side + 'Width']) === 0) continue;
      }
      const v = cs[prop];
      const c = rgb(v);
      if (!c) continue;
      if (warmDefined && v === WARM) warm.push(`${describe(el)} ${prop}`);
      const { h, s, l } = hueSat(c);
      if ((h <= 20 || h >= 345) && s > 0.5 && l > 0.2 && l < 0.85) {
        if (ACCENT.includes(v)) accentReds.push(`${describe(el)} ${prop}`);
        else reds.push(`${describe(el)} ${prop} ${v}`);
      }
    }
    const style = el.getAttribute('style') || '';
    for (const decl of style.split(';')) {
      const [k, val] = decl.split(':').map((x) => (x || '').trim());
      if (!k || !val) continue;
      if (!/color|background|fill|stroke/.test(k)) continue;
      if (!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(val)) continue;
      if (/border/.test(k)) {
        const side = (k.match(/border-(top|right|bottom|left)/) || [])[1];
        const st = side ? cs['border' + side[0].toUpperCase() + side.slice(1) + 'Style'] : cs.borderTopStyle;
        if (st === 'none') continue; // the runtime writes rgb(0,0,0) on sides that paint nothing (L168)
      }
      inline.push(`${describe(el)} ${k}: ${val}`);
    }
  }
  const textHits = (re) => {
    const out = [];
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = n.nodeValue;
      if (re.test(t)) out.push(`${describe(n.parentElement)}: ${t.trim().slice(0, 60)}`);
    }
    return out;
  };
  // Fractions over ELEMENTS, not text nodes: a count split across <b>s is one
  // fraction on screen and zero in any single text node (L129).
  const fractions = [];
  for (const el of root.querySelectorAll('*')) {
    const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
    if (!own) continue;
    const t = el.innerText || '';
    if (/\b\d+\s*(\/|of)\s*\d+\b/.test(t)) fractions.push(`${describe(el)}: ${t.trim().slice(0, 60)}`);
  }
  return {
    reds, accentReds: accentReds.length, warm, warmDefined, inline,
    pct: textHits(/\d+\s?%/), cross: textHits(/[✗✘]/), fractions,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  };
}

async function capture() {
  const APP = String(arg('app', '')).replace(/\/$/, '');
  const OUT = arg('out');
  if (!APP || !OUT) {
    console.error('check-pages capture: --app <url> and --out <file> are required.');
    process.exit(2);
  }
  const pages = parsePages(arg('pages', DEFAULT_PAGES));
  const AS = arg('as');
  const BACKEND = String(arg('backend', '')).replace(/\/$/, '');
  const TOKEN = arg('token', process.env.NODEGX_ADMIN_TOKEN);
  const SETTLE = Number(arg('settle', 1500));
  const WIDTH = Number(arg('width', 1280));
  const HEIGHT = Number(arg('height', 900));
  const AUDIT = argv.includes('--audit');
  const CALIBRATE = argv.includes('--calibrate');

  const req = createRequire(join(DBT_REPO, 'package.json'));
  if (!existsSync(join(DBT_REPO, 'node_modules', 'puppeteer-core'))) {
    console.error(`check-pages: no puppeteer-core under ${DBT_REPO}/node_modules — set DBT_REPO.`);
    process.exit(2);
  }
  const puppeteer = req('puppeteer-core');
  const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

  // ── A session, if asked for ────────────────────────────────────────────────
  let session = null;
  if (AS) {
    if (!BACKEND || !TOKEN) {
      console.error('check-pages: --as needs --backend and --token.');
      process.exit(2);
    }
    const admin = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
    const users = await (await fetch(`${BACKEND}/classes/_User?limit=1000`, { headers: admin })).json();
    const user = users.results.find((u) => u.username === AS);
    if (!user) throw new Error(`check-pages: no user "${AS}" on ${BACKEND}`);
    const token = `check-pages-${randomBytes(12).toString('hex')}`;
    const made = await (
      await fetch(`${BACKEND}/classes/_Session`, { method: 'POST', headers: admin, body: JSON.stringify({ sessionToken: token, userId: user.objectId }) })
    ).json();
    const project = JSON.parse(readFileSync(join(TEMPLATE, 'nodegx.project.json'), 'utf8'));
    const appId = project.metadata && project.metadata.cloudservices && project.metadata.cloudservices.appId;
    if (!appId) throw new Error('check-pages: --as needs metadata.cloudservices.appId in nodegx.project.json');
    session = {
      key: `Parse/${appId}/currentUser`,
      value: JSON.stringify({ objectId: user.objectId, username: user.username, email: user.email, sessionToken: token }),
      objectId: made.objectId,
      admin
    };
  }

  const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-first-run'] });
  const result = { app: APP, as: AS || null, capturedAt: new Date().toISOString(), width: WIDTH, pages: {} };
  try {
    for (const { name, path } of pages) {
      const page = await browser.newPage();
      await page.setViewport({ width: WIDTH, height: HEIGHT });
      if (session) {
        await page.evaluateOnNewDocument((k, v) => {
          try {
            localStorage.setItem(k, v);
          } catch (e) {}
        }, session.key, session.value);
      }
      const consoleErrors = [];
      const pageErrors = [];
      const functions = [];
      const failedRequests = [];
      const hydration = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
        // Errors and warnings only: React's DevTools INFO line names hydration too,
        // and counting it was a false positive this repo has recorded (L133).
        if ((m.type() === 'error' || m.type() === 'warn' || m.type() === 'warning') && /hydrat/i.test(m.text())) hydration.push(m.text().slice(0, 200));
      });
      page.on('pageerror', (e) => pageErrors.push(String(e && e.message ? e.message : e)));
      page.on('response', async (r) => {
        const u = r.url();
        if (r.status() >= 400) failedRequests.push(`${r.status()} ${u.replace(APP, '')}`);
        if (!/\/functions\//.test(u)) return;
        let body = '';
        try {
          body = await r.text();
        } catch (e) {}
        functions.push({ url: u.replace(APP, ''), status: r.status(), body });
      });
      await page.goto(APP + path, { waitUntil: 'networkidle0', timeout: 60000 });
      // Wait for #root to stop changing, then settle once more.
      let last = '';
      for (let i = 0; i < 20; i++) {
        const now = await page.evaluate(() => (document.getElementById('root') || document.body).innerHTML);
        if (now === last && now.length > 0) break;
        last = now;
        await new Promise((r) => setTimeout(r, 500));
      }
      await new Promise((r) => setTimeout(r, SETTLE));
      const html = normalise(await page.evaluate(() => (document.getElementById('root') || document.body).innerHTML));
      const finalPath = await page.evaluate(() => location.pathname + location.search);
      const audit = AUDIT ? await page.evaluate(auditInPage, CALIBRATE) : undefined;
      result.pages[name] = { path, finalPath, sha256: sha(html), length: html.length, html, consoleErrors, pageErrors, failedRequests, functions, audit, hydration };
      console.log(`${name.padEnd(8)} ${path.padEnd(44)} → ${finalPath.padEnd(30)} ${sha(html).slice(0, 12)} ${String(html.length).padStart(7)}B  errors ${consoleErrors.length}/${pageErrors.length}  fn ${functions.map((f) => f.status).join(',') || '-'}`);
      if (audit) console.log(`         audit: hydration ${hydration.length} reds ${audit.reds.length} accent ${audit.accentReds} warm ${audit.warm.length} inline ${audit.inline.length} pct ${audit.pct.length} cross ${audit.cross.length} frac ${audit.fractions.length} overflow ${audit.overflow}`);
      await page.close();
    }
  } finally {
    await browser.close();
    if (session) {
      await fetch(`${BACKEND}/classes/_Session/${session.objectId}`, { method: 'DELETE', headers: session.admin });
      const gone = await fetch(`${BACKEND}/classes/_Session/${session.objectId}`, { headers: session.admin });
      if (gone.status !== 404) console.error(`check-pages: the minted session was NOT deleted (${gone.status}).`);
    }
  }
  writeFileSync(OUT, JSON.stringify(result, null, 2));
}

function compare() {
  const [a, b] = argv.slice(1).filter((x) => !x.startsWith('--'));
  const A = JSON.parse(readFileSync(a, 'utf8'));
  const B = JSON.parse(readFileSync(b, 'utf8'));
  let differ = 0;
  for (const name of Object.keys(A.pages)) {
    const pa = A.pages[name];
    const pb = B.pages[name];
    if (!pb) {
      console.log(`${name}: only in ${a}`);
      continue;
    }
    if (pa.sha256 === pb.sha256) {
      console.log(`${name.padEnd(8)} IDENTICAL  ${pa.sha256.slice(0, 12)}  ${pa.length}B`);
      continue;
    }
    differ++;
    console.log(`${name.padEnd(8)} DIFFERS    ${pa.sha256.slice(0, 12)} ${pa.length}B → ${pb.sha256.slice(0, 12)} ${pb.length}B`);
    const la = pa.html.split(/(?=<)/);
    const lb = pb.html.split(/(?=<)/);
    // A bounded positional diff: enough to attribute a difference by name.
    let shown = 0;
    let i = 0;
    let j = 0;
    while ((i < la.length || j < lb.length) && shown < 12) {
      if (la[i] === lb[j]) {
        i++;
        j++;
        continue;
      }
      const ahead = lb.indexOf(la[i], j);
      const back = la.indexOf(lb[j], i);
      if (ahead > -1 && (back === -1 || ahead - j <= back - i)) {
        console.log(`   + ${lb.slice(j, ahead).join('').slice(0, 300)}`);
        j = ahead;
      } else if (back > -1) {
        console.log(`   - ${la.slice(i, back).join('').slice(0, 300)}`);
        i = back;
      } else {
        console.log(`   - ${String(la[i]).slice(0, 300)}\n   + ${String(lb[j]).slice(0, 300)}`);
        i++;
        j++;
      }
      shown++;
    }
  }
  process.exitCode = differ ? 1 : 0;
}

if (verb === 'capture') await capture();
else if (verb === 'compare') compare();
else {
  console.error('usage: check-pages.mjs capture|compare …');
  process.exit(2);
}
