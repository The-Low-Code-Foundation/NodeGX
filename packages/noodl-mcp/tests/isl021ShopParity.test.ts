/**
 * P109 ISL-021 AC7 — the shop drive's `SHORT` and `BUY` clauses as `drive_page` step lists.
 *
 * `scripts/devtools/drive-iw006-shop.js` proves the shop by a hand-written CDP script on the DEPLOYED garden. Its two
 * purchase clauses are rewritten here as data a model could send, one list per language at 1368 × 900, and graded
 * the same way: the card's figures, the "need more" line, Buy → "It's yours!", the store's spent shells and the new
 * Pip, and the balance after a reload. Each `read` returns the evidence object and `expect` grades it, so a failure
 * names what the page showed.
 *
 * 🔴 The red arm is the AC's own: a copy with the Buy button's one wire (`shBuy.onClick → shBuyFn.go`) removed. Both
 * languages must go red on BUY and stay green on SHORT; the same copy deployed is what the CDP drive is run on (the
 * comparison is recorded in ISL-021 §8, because the deploy is a separate heavy job).
 *
 * Every expected word is read from the template's own Words table and every price from the Shop rows script, as
 * the CDP drive reads them, so a retuned shop moves both together.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { call, connect, type TestSession } from './helpers';
import type { DrivePagePayload } from '../src/render';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const harness = require('../../../scripts/devtools/render-report.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveTemplateCopy } = require('../../../scripts/library/resolve-template-kits.js');

const GARDEN = path.join(__dirname, '..', '..', '..', 'templates', 'bot-garden');

type Lang = 'en' | 'fr';
interface Node {
  id: string;
  type: string;
  parameters?: Record<string, unknown>;
}

function nodesOf(dir: string, component: string): Node[] {
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'components', ...component.split('/'), 'nodes.json'), 'utf8'));
  return Array.isArray(raw) ? raw : raw.nodes ?? Object.values(raw);
}

const ready = fs.existsSync(GARDEN) && harness.checkPrerequisites(GARDEN).ok === true;
if (!ready) {
  // eslint-disable-next-line no-console
  console.warn('[isl021 AC7] SKIPPING: the viewer bundle or a Chrome is missing (render-report checkPrerequisites).');
}
const describeOrSkip = ready ? describe : describe.skip;

const WORDS = ready
  ? (JSON.parse(String(nodesOf(GARDEN, 'Data/Words').find((n) => n.type === 'Static Data')?.parameters?.json)) as Array<
      Record<string, string>
    >)
  : [];
// P109 ISL-005: the Function's own text plus the script files it lists under Uses (the shop table sits in save.js).
const SHOP_FN = ready ? nodesOf(GARDEN, 'Logic/Shop rows').find((n) => n.type === 'JavaScriptFunction') : undefined;
const SHOP_SCRIPT = SHOP_FN
  ? [
      ...String(SHOP_FN.parameters?.uses ?? '')
        .split(',')
        .filter(Boolean)
        .map((file) => fs.readFileSync(path.join(GARDEN, 'scripts', file.trim()), 'utf8')),
      String(SHOP_FN.parameters?.functionScript)
    ].join('\n')
  : '';
const REQUESTS = ready
  ? (JSON.parse(String(nodesOf(GARDEN, 'Data/Requests').find((n) => n.type === 'Static Data')?.parameters?.json)) as Array<{
      id: string;
      referenceProgram: unknown;
    }>)
  : [];
const REF = (id: string) => JSON.stringify(REQUESTS.find((r) => r.id === id)?.referenceProgram);
const SHOP = ready ? (JSON.parse(/var SHOP = (\[.*?\]);\n/.exec(SHOP_SCRIPT)?.[1] ?? '[]') as Array<{ id: string; price: number; name: Record<Lang, string> }>) : [];

function w(lang: Lang, key: string, vars: Record<string, number> = {}): string {
  let t = String(WORDS.find((r) => r.key === key)?.[lang] ?? '');
  for (const k of Object.keys(vars)) t = t.split(`{${k}}`).join(String(vars[k]));
  return t;
}

/** The saved family's active profile, as the CDP drive's STORE reads it. */
const STORE = `(() => { const k = Object.keys(localStorage).find((x) => /bot-garden/.test(x)); const v = JSON.parse(localStorage.getItem(k)); return { v, k, a: v.model.profiles.find((p) => p.id === v.model.island.activeId) }; })()`;
/**
 * Edit the saved family in place — the drive's `writeStore` — as a `seed_storage` edit, so the island's own save
 * (7–23 ms after a page appears, or not at all) cannot overwrite it before the `navigate` that follows reloads it.
 */
const writeStore = (body: string) => ({
  seed_storage: 'noodl_store_bot-garden',
  edit: `const a = v.model.profiles.find((p) => p.id === v.model.island.activeId); ${body}`
});
/** The purchase card, as the drive's CARD reads it, projected to the fields a clause grades. */
const CARD = `(() => { const c = document.querySelector('.bg-shop-card'); if (!c || c.offsetParent === null) return null;
  const t = (s) => { const e = c.querySelector(s); return e && e.offsetParent !== null ? e.innerText.trim() : ''; };
  const vis = (s) => { const e = c.querySelector(s); return !!e && e.offsetParent !== null; };
  return { figs: [...c.querySelectorAll('.bg-shop-fig')].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim()),
    short: t('.bg-shop-short'), done: t('.bg-shop-done'), buy: vis('.bg-shop-buy'), notNow: vis('.bg-shop-no'),
    nameBox: vis('input'), placeholder: (c.querySelector('input') || {}).placeholder || '' }; })()`;
const BTN = `(() => { const b = document.querySelector('.bg-shop-open'); return b && b.offsetParent !== null ? b.innerText.trim() : null; })()`;
const PANEL_GONE = `(() => { const s = document.querySelector('.bg-shop-panel'); return !s || s.offsetParent === null; })()`;

/** One list for one language, and the CDP drive's clause each step's verdict belongs to. */
function shopSteps(lang: Lang): { steps: Array<Record<string, unknown>>; clause: string[] } {
  const pip = SHOP.find((s) => s.id === 'robot:pip');
  if (!pip) throw new Error('the Shop rows script no longer sells robot:pip');
  const PIP = pip.price;
  const steps: Array<Record<string, unknown>> = [];
  const clause: string[] = [];
  const add = (c: string, ...s: Array<Record<string, unknown>>) => {
    for (const x of s) {
      steps.push(x);
      clause.push(c);
    }
  };
  const openRobotsPip = (c: string) =>
    add(
      c,
      { tap: { selector: '.bg-shop-open' } },
      { wait_for: { selector: '.bg-shop-panel' } },
      { tap: { text_contains: w(lang, 'iw6hTabRobots') } },
      // The item by the Pip's own name, as the drive's itemTap finds it.
      { tap: pip.name[lang] },
      { wait_for: { selector: '.bg-shop-card' } }
    );
  // The drive's freshFamily: a cleared origin, a new player "Ada" aged 10–12, on the island.
  add(
    'setup',
    { clear_storage: true },
    { navigate: '/' },
    ...(lang === 'fr' ? [{ tap: 'FR' }] : []),
    { tap: { selector: 'button.bg-profile-new' } },
    { type: 'Ada', into: { selector: 'input' } },
    { tap: '10–12' },
    { tap: w(lang, 'create') },
    { wait_for: { url: 'island' }, timeout_ms: 8000 },
    // The drive's seed(PIP - 8), whole: the robots matter to the card (a second Pip makes the new one "Pip 3").
    writeStore(`a.shells = { earned: ${PIP - 8}, spent: 0 }; a.owned = [];
          a.island.robots = [{ id: 'r1' }, { id: 'cobble', kind: 'cobble', name: 'Cobble', color: '#7A8CA3', eye: 'round', hat: 'none' }, { id: 'rpip2', kind: 'pip', name: 'Pip 2', color: '#FF7A59', eye: 'round', hat: 'none' }];
          a.island.done = ['path-postbox', 'tulips-three', 'path-stones', 'tulip-door', 'rows-trick'];
          a.island.plots = { 'tulips-three': { program: ${REF('tulips-three')}, robotId: 'r1', wonAt: 1 }, 'path-stones': { program: ${REF('path-stones')}, robotId: 'cobble', wonAt: 1 }, 'tulip-door': { program: ${REF('tulip-door')}, robotId: 'rpip2', wonAt: 1 } }`),
    { navigate: '/island' },
    { wait_for: { selector: '.bg-shop-open' } }
  );
  openRobotsPip('SHORT');
  add(
    'SHORT',
    {
      read: { expression: `(() => { const c = ${CARD}; return c && { figs: c.figs, short: c.short, buy: c.buy, notNow: c.notNow, nameBox: c.nameBox }; })()` },
      expect: { figs: [w(lang, 'iw6hHave', { n: PIP - 8 }), w(lang, 'iw6hCost', { n: PIP })], short: w(lang, 'iw6hShort', { n: 8 }), buy: false, notNow: true, nameBox: false }
    },
    { tap: { selector: '.bg-shop-no' } },
    { wait_for: { expression: `${CARD} === null` }, timeout_ms: 2000 },
    { tap: { selector: '.bg-shop-close' } },
    { wait_for: { expression: PANEL_GONE }, timeout_ms: 2000 }
  );
  // A copy's price + 2 shells: the purchase.
  add('BUY', writeStore(`a.shells = { earned: ${PIP + 2}, spent: 0 }`), { navigate: '/island' }, { wait_for: { selector: '.bg-shop-open' } });
  openRobotsPip('BUY');
  add(
    'BUY',
    {
      read: { expression: `(() => { const c = ${CARD}; return c && { figs: c.figs, buy: c.buy, nameBox: c.nameBox, placeholder: c.placeholder }; })()` },
      expect: { figs: [w(lang, 'iw6hHave', { n: PIP + 2 }), w(lang, 'iw6hCost', { n: PIP }), w(lang, 'iw6hLeft', { n: 2 })], buy: true, nameBox: true, placeholder: 'Pip 3' }
    },
    { type: 'Bubbles', into: { selector: '.bg-shop-card input' } },
    { tap: { selector: '.bg-shop-buy' } },
    { wait_for: { expression: `(${CARD} || {}).done !== ''` }, timeout_ms: 3000 },
    {
      read: { expression: `(() => { const c = ${CARD}; return c && { done: c.done, figs: c.figs.length, short: c.short, buy: c.buy }; })()` },
      expect: { done: w(lang, 'iw6hBought'), figs: 0, short: '', buy: false }
    },
    { wait_for: { expression: `(${BTN} || '') === ${JSON.stringify(w(lang, 'iw6hBtn', { n: 2 }))}` }, timeout_ms: 3000 },
    {
      read: { expression: `(() => { const { a } = ${STORE}; const b = a.island.robots.find((r) => r.name === 'Bubbles'); return { earned: a.shells.earned, spent: a.shells.spent, bubbles: b ? b.kind : null }; })()` },
      expect: { earned: PIP + 2, spent: PIP, bubbles: 'pip' }
    }
  );
  // AC2 of IW-006: after a reload the balance is still 🐚 2.
  add(
    'BUY reload',
    { tap: { selector: '.bg-shop-close' } },
    { wait_for: { expression: PANEL_GONE }, timeout_ms: 2000 },
    { navigate: '/island' },
    { wait_for: { selector: '.bg-shop-open' }, timeout_ms: 4000 },
    { read: { expression: BTN }, expect: w(lang, 'iw6hBtn', { n: 2 }) }
  );
  return { steps, clause };
}

async function driveShop(session: TestSession, lang: Lang): Promise<{ result: DrivePagePayload; failedClause: string | null }> {
  const { steps, clause } = shopSteps(lang);
  const res = (await session.client.callTool({ name: 'drive_page', arguments: { steps, viewport: '1368x900' } })) as {
    isError?: boolean;
    content: Array<{ text?: string }>;
  };
  if (res.isError) throw new Error(`drive_page refused: ${res.content[0]?.text}`);
  const result = JSON.parse(res.content[1]?.text ?? '{}') as DrivePagePayload;
  const failed = result.steps.find((r) => !r.ok);
  return { result, failedClause: failed ? clause[failed.n - 1] : null };
}

/** A fresh copy of the garden; `breakBuy` removes the Buy button's one wire. */
function gardenCopy(breakBuy: boolean): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), breakBuy ? 'isl021-nobuy-' : 'isl021-shop-'));
  fs.cpSync(GARDEN, dir, { recursive: true });
  // ISL-017 ruling 2: the template carries its kits' record, not the kits.
  resolveTemplateCopy(dir);
  if (breakBuy) {
    const file = path.join(dir, 'components', 'Island', 'Shop', 'connections.json');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list: Array<{ fromId: string; fromProperty: string }> = Array.isArray(raw) ? raw : raw.connections;
    const kept = list.filter((c) => !(c.fromId === 'shBuy' && c.fromProperty === 'onClick'));
    if (kept.length !== list.length - 1) throw new Error(`expected exactly one shBuy.onClick wire, found ${list.length - kept.length}`);
    fs.writeFileSync(file, JSON.stringify(Array.isArray(raw) ? kept : { ...raw, connections: kept }, null, 2));
  }
  return dir;
}

describeOrSkip('P109 ISL-021 AC7 — the shop drive’s SHORT and BUY as drive_page step lists', () => {
  const dirs: string[] = [];
  const open = async (breakBuy: boolean): Promise<TestSession> => {
    const dir = gardenCopy(breakBuy);
    dirs.push(dir);
    const session = await connect(dir, false);
    await call(session, 'find_tools', { group: 'explore' });
    return session;
  };
  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  it.each(['en', 'fr'] as Lang[])('%s — SHORT and BUY pass on the template, through the reload', async (lang) => {
    const session = await open(false);
    try {
      const { result, failedClause } = await driveShop(session, lang);
      const failed = result.steps.find((r) => !r.ok);
      expect({ verdict: result.verdict, failedClause, failed: failed ? `${failed.n} ${failed.do}: ${failed.error} (the step before pressed ${result.steps[failed.n - 2]?.pressed})` : null }).toEqual({
        verdict: 'passed',
        failedClause: null,
        failed: null
      });
    } finally {
      await session.close();
    }
  }, 180_000);

  it.each(['en', 'fr'] as Lang[])('%s — 🔴 with the Buy button’s wire removed, SHORT still passes and the run goes red on BUY', async (lang) => {
    const session = await open(true);
    try {
      const { result, failedClause } = await driveShop(session, lang);
      expect({ verdict: result.verdict, failedClause }).toEqual({ verdict: 'failed', failedClause: 'BUY' });
    } finally {
      await session.close();
    }
  }, 180_000);
});
