/**
 * P108 IW-006 (session 4, lane H) — the shop: its rows, its purchase card, Buy, a helper used on a job, and the brain the
 * Workshop's Blocks node holds.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * | script | component | the question it answers |
 * |---|---|---|
 * | {@link SHOP_ROWS_SCRIPT} | `Logic/Shop rows` | the balance on the Island page's button; the five tabs; the items of the open tab (a picture, a price, one line, "Yours" / "Ready to use"); the line an empty tab says |
 * | {@link SHOP_CARD_SCRIPT} | `Logic/Shop card` | the purchase card of the chosen item: what she has, the cost, what is left — or how many more shells; the robot a brain is for; a copy's name; a held helper's jobs; Buy / Use it |
 * | {@link BUY_SCRIPT} | `Logic/Buy` | the purchase card's Buy: `buyItem` (SAVE_HELPERS — the ONE place spent rises) on the active profile, the model to write |
 * | {@link USE_HELPER_SCRIPT} | `Logic/Use helper` | a held helper used on one job: it leaves `owned`; rain fills the plot's tulips at once, the can and the barrow ride on the job (the island's state and the save's `live.helper`) until its finish line |
 * | {@link BRAIN_SCRIPT} | `Logic/Brain size` | the job robot's brain (its row's `brain`, else BRAIN_SIZE) for the Workshop's Blocks node |
 *
 * The rules (brief §4.2, IW-006 §2):
 * - **What the shop shows.** Robots: a copy of each kind her island has (buyItem refuses any other). Upgrades: can+,
 *   basket+ and boots once the request an islander gave it after is done (the gift moved here — COMPLETE_REQUEST gives
 *   none now) and she has a robot it fits; one she has (given or bought) says Yours; the two brains always. Helpers: all
 *   three; one she holds says Ready to use. Build and Animals are empty until IW-007 and say so in one line.
 * - **The purchase card** (D4): You have · It costs · Left after; a price she cannot pay says how many more shells and has
 *   no Buy. A copy's card has a name field; a brain's card picks the robot (only robots at the size before; one alone is
 *   picked for her). A held helper's card lists the jobs it helps now (a pinned robot at work on a job that is not done,
 *   and the helper fits it — helperFits in ENGINE) and has Use it instead of Buy.
 * - **A helper is for exactly one job** (AC4): used, it leaves `owned` at once. Rain fills every tulip of that plot and is
 *   gone. The self-filling can and the wheelbarrow ride on that job (`live.helper`) until the job crosses its finish line
 *   (islHelped, ig004Island) — then they are gone too.
 *
 * Words: the shop's item names and lines are the catalogue's (SHOP, EN + FR); every other word is an `iw6h…` key of the
 * page's table (cg003Content PAGE_WORDS, lane H's block). 🔴 No backtick and no dollar-brace inside any script text.
 *
 * @module noodl-mcp/tests/iw006Shop
 */
import { BRAIN_SIZE, SHOP_TABS } from './cg002Content';
import { SAVE_HELPERS } from './cg002Scripts';
import { ISLAND_ENGINE } from './ig004Island';

/** The shop's two components (cg003Components builds them in lane H's block; the Island page places the shop). */
export const SHOP_PATHS = { shop: '/Island/Shop', item: '/Island/Shop item' } as const;
/** Each tab's word (the tabs are drawn in SHOP_TABS order). */
export const SHOP_TAB_WORDS: Readonly<Record<string, string>> = { build: 'iw6hTabBuild', animals: 'iw6hTabAnimals', robots: 'iw6hTabRobots', upgrades: 'iw6hTabUpgrades', helpers: 'iw6hTabHelpers' };
/** The tab the shop opens on (Build and Animals are empty until IW-007: it opens where there is something to buy). */
export const SHOP_FIRST_TAB = 'robots';
/** The row ids' prefixes (a repeater's row is a Noodl Object, global by id: the shop's rows never share an id with another list's). */
export const SHOP_IDS = { tab: 'shoptab-', item: 'shopitem-', robot: 'shopbot-', plot: 'shopplot-' } as const;

/** What every shop script shares: the words, the active profile, the ids, what the shop shows. */
const SHOP_SHARED = `
var SHOP_TABS_LIST = ${JSON.stringify(SHOP_TABS)};
var SHOP_TAB_WORDS = ${JSON.stringify(SHOP_TAB_WORDS)};
var SHOP_FIRST_TAB = ${JSON.stringify(SHOP_FIRST_TAB)};
var SHOP_IDS = ${JSON.stringify(SHOP_IDS)};
function shLang(v) { return String(v) === 'fr' ? 'fr' : 'en'; }
function shWords(rows, lang) { var map = {}, list = Array.isArray(rows) ? rows : []; for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) map[list[i].key] = String(list[i][lang] || list[i].en || ''); return map; }
function shFill(text, vars) { var t = String(text || ''); for (var k in vars) t = t.split('{' + k + '}').join(String(vars[k])); return t; }
/** A row id or a bare id: the bare id (a chip publishes its row's id). */
function shBare(v, prefix) { var s = String(v === undefined || v === null ? '' : v); return s.indexOf(prefix) === 0 ? s.slice(prefix.length) : s; }
function shActive(model) { for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === model.island.activeId) return model.profiles[i]; return null; }
function shModel(raw) { return modelOf(raw && typeof raw === 'object' ? raw : {}); }
/** An upgrade she has — an islander's gift before the shop (a sticker) or bought. */
function shHasUpgrade(p, up) { return !!p && (p.owned.indexOf(up) !== -1 || p.stickers.indexOf(up) !== -1); }
function shUpgradeSpec(id) { for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].id === id) return UPGRADES[i]; return null; }
/** Does the shop show this item to her? (See the module's rules.) */
function shShows(p, it) {
  if (!p || !it) return false;
  if (it.kind === 'robot') return !!jobRobotId(p, it.robot);
  if (it.kind === 'upgrade') {
    if (shHasUpgrade(p, it.upgrade)) return true;
    var up = shUpgradeSpec(it.upgrade);
    if (!up || p.island.done.indexOf(up.unlockedBy) === -1) return false;
    var rows = robotRowsOf(p);
    for (var i = 0; i < rows.length; i++) if (up.fits.indexOf(rows[i].kind) !== -1) return true;
    return false;
  }
  return true;
}
`;

/**
 * `Logic/Shop rows` — the button's words (the balance on it), the five tabs as chips, the open tab's items. Tab is the
 * chosen tab (a chip's row id or a bare tab; none: the first tab with something to buy).
 */
export const SHOP_ROWS_SCRIPT = `${SAVE_HELPERS}
${SHOP_SHARED}
var lang = shLang(Inputs.lang), W = shWords(Inputs.words, lang);
var model = shModel(Inputs.model), p = shActive(model);
var tab = shBare(Inputs.tab, SHOP_IDS.tab);
if (SHOP_TABS_LIST.indexOf(tab) === -1) tab = SHOP_FIRST_TAB;
var bal = balanceOf(p);
var tabs = [];
for (var t = 0; t < SHOP_TABS_LIST.length; t++) tabs.push({ id: SHOP_IDS.tab + SHOP_TABS_LIST[t], label: W[SHOP_TAB_WORDS[SHOP_TABS_LIST[t]]] || SHOP_TABS_LIST[t], selected: SHOP_TABS_LIST[t] === tab, locked: false });
var items = [];
for (var i = 0; i < SHOP.length; i++) {
  var it = SHOP[i];
  if (it.tab !== tab || !shShows(p, it)) continue;
  var yours = it.kind === 'upgrade' && shHasUpgrade(p, it.upgrade), held = it.kind === 'helper' && p.owned.indexOf(it.id) !== -1;
  var tag = yours ? W.iw6hYours || '' : held ? W.iw6hHeld || '' : '';
  items.push({ id: SHOP_IDS.item + it.id, icon: it.icon, name: it.name[lang] || it.name.en, price: shFill(W.iw6hPrice, { n: it.price }), line: it.line[lang] || it.line.en, tag: tag, hasTag: !!tag, cls: 'bg-shop-item bg-press' + (yours ? ' bg-shop-item-yours' : '') + (held ? ' bg-shop-item-held' : '') });
}
var later = tab === 'build' ? W.iw6hLaterBuild || '' : tab === 'animals' ? W.iw6hLaterAnimals || '' : '';
Outputs.hasProfile = !!p;
Outputs.balance = bal;
Outputs.btnText = shFill(W.iw6hBtn, { n: bal });
Outputs.balText = shFill(W.iw6hBalance, { n: bal });
Outputs.tab = tab;
Outputs.tabs = tabs;
Outputs.items = items;
Outputs.showItems = items.length > 0;
Outputs.later = later;
Outputs.showLater = !!later;
`;

/**
 * `Logic/Shop card` — the purchase card of the chosen item (Item Id: a row id or a bare shop id; none: no card). Robot Id
 * and Plot Id are the chips chosen on it; Bought / Used what the last Buy / Use it did; State the island as it runs
 * (quiet: read when the card is asked, never a reason to draw it again every tick).
 */
export const SHOP_CARD_SCRIPT = `${ISLAND_ENGINE}
${SAVE_HELPERS}
${SHOP_SHARED}
var lang = shLang(Inputs.lang), W = shWords(Inputs.words, lang);
var model = shModel(Inputs.model), p = shActive(model);
var id = shBare(Inputs.itemId, SHOP_IDS.item), it = p ? shopItem(id) : null;
var reqs = Array.isArray(Inputs.requests) ? Inputs.requests : [];
var bal = balanceOf(p);
var out = { showCard: false, itemId: '', icon: '', name: '', line: '', have: '', cost: '', left: '', showLeft: false, short: '', showShort: false, canBuy: false, showName: false, namePlaceholder: '', showRobots: false, robots: [], robotId: '', showUse: false, plots: [], plotId: '', canUse: false, none: '', showNone: false, done: '', showDone: false, showFigures: false };
var rows = p ? robotRowsOf(p) : [];
function nameOfRobot(rid) { for (var n = 0; n < rows.length; n++) if (rows[n].id === rid) return rows[n].name; return ''; }
function titleOf(reqId, botName) { for (var q = 0; q < reqs.length; q++) if (reqs[q] && reqs[q].id === reqId && reqs[q].copyKeys) return (W[reqs[q].copyKeys.title] || reqId).split('{b}').join(botName || 'Pip'); return reqId; }
if (it && shShows(p, it)) {
  out.showCard = true;
  out.itemId = it.id;
  out.icon = it.icon;
  out.name = it.name[lang] || it.name.en;
  out.line = it.line[lang] || it.line.en;
  var held = it.kind === 'helper' && p.owned.indexOf(it.id) !== -1;
  var yours = it.kind === 'upgrade' && shHasUpgrade(p, it.upgrade);
  if (held) {
    // A held helper: the jobs it helps now — a pinned robot at work on a job not done yet, the helper fitting it.
    var st = Inputs.state && typeof Inputs.state === 'object' && Array.isArray(Inputs.state.plots) ? Inputs.state : null, ids = [];
    if (st) for (var k = 0; k < st.plots.length; k++) {
      var plot = st.plots[k], cur = st.live && st.live[plot.id];
      if (plot.status !== 'working' || !plot.job || plot.stale || !cur || cur.phase === 'wait' || cur.helper) continue;
      if (!helperFits(worldOf(islView(plot, cur)), it.helper)) continue;
      ids.push(plot.id);
      out.plots.push({ id: SHOP_IDS.plot + plot.id, label: titleOf(plot.id, nameOfRobot(plot.robotId)), selected: false, locked: false });
    }
    var want = shBare(Inputs.plotId, SHOP_IDS.plot);
    out.plotId = ids.indexOf(want) !== -1 ? want : ids.length === 1 ? ids[0] : '';
    for (var s = 0; s < out.plots.length; s++) out.plots[s].selected = out.plots[s].id === SHOP_IDS.plot + out.plotId;
    out.showUse = ids.length > 0;
    out.canUse = !!out.plotId;
    if (!ids.length) out.none = W.iw6hNoJob || '';
  } else if (yours) {
    out.done = W.iw6hYoursLine || '';
  } else {
    out.showFigures = true;
    out.have = shFill(W.iw6hHave, { n: bal });
    out.cost = shFill(W.iw6hCost, { n: it.price });
    var can = bal >= it.price, blocked = false;
    if (it.kind === 'robot') {
      if (p.island.robots.length >= CREW_CAP) { blocked = true; out.none = shFill(W.iw6hFull, { n: CREW_CAP }); }
      else {
        var spec = robotSpec(it.robot), count = 1;
        for (var c = 0; c < p.island.robots.length; c++) if (robotKindOf(p.island.robots[c]) === it.robot) count++;
        out.namePlaceholder = spec ? (spec.defaultName[lang] || spec.defaultName.en) + ' ' + count : '';
        out.showName = can;
      }
    } else if (it.kind === 'brain') {
      // Only a robot at the size before this one (12 → 16 → 20); one alone is chosen for her.
      var before = BRAIN_SIZES[BRAIN_SIZES.indexOf(it.size) - 1], okIds = [];
      for (var b = 0; b < rows.length; b++) if (rows[b].brain === before) { okIds.push(rows[b].id); out.robots.push({ id: SHOP_IDS.robot + rows[b].id, label: shFill(W.iw6hBrainOf, { r: rows[b].name, n: rows[b].brain }), selected: false, locked: false }); }
      var pick = shBare(Inputs.robotId, SHOP_IDS.robot);
      out.robotId = okIds.indexOf(pick) !== -1 ? pick : okIds.length === 1 ? okIds[0] : '';
      for (var o = 0; o < out.robots.length; o++) out.robots[o].selected = out.robots[o].id === SHOP_IDS.robot + out.robotId;
      out.showRobots = okIds.length > 0;
      if (!okIds.length) { blocked = true; out.none = W.iw6hNoBrain || ''; }
      else if (!out.robotId) blocked = true;
    }
    if (can) { out.left = shFill(W.iw6hLeft, { n: bal - it.price }); out.showLeft = true; }
    else { var more = it.price - bal; out.short = shFill(more === 1 ? W.iw6hShort1 : W.iw6hShort, { n: more }); out.showShort = true; }
    out.canBuy = can && !blocked;
  }
  // What the last Buy / Use it did, on this item's card.
  if (String(Inputs.bought || '') === it.id) out.done = W.iw6hBought || '';
  var used = String(Inputs.used || '').split('|');
  if (used[0] === it.id && used[1]) out.done = shFill(W.iw6hUsed, { what: out.name, plot: titleOf(used[1], nameOfRobot(p.island.plots[used[1]] ? p.island.plots[used[1]].robotId : '')) });
  out.showDone = !!out.done;
  out.showNone = !!out.none;
}
Outputs.showCard = out.showCard;
Outputs.itemId = out.itemId;
Outputs.icon = out.icon;
Outputs.name = out.name;
Outputs.line = out.line;
Outputs.have = out.have;
Outputs.cost = out.cost;
Outputs.left = out.left;
Outputs.showLeft = out.showLeft;
Outputs.short = out.short;
Outputs.showShort = out.showShort;
Outputs.canBuy = out.canBuy;
Outputs.showName = out.showName;
Outputs.namePlaceholder = out.namePlaceholder;
Outputs.showRobots = out.showRobots;
Outputs.robots = out.robots;
Outputs.robotId = out.robotId;
Outputs.showUse = out.showUse;
Outputs.plots = out.plots;
Outputs.plotId = out.plotId;
Outputs.canUse = out.canUse;
Outputs.none = out.none;
Outputs.showNone = out.showNone;
Outputs.done = out.done;
Outputs.showDone = out.showDone;
Outputs.showFigures = out.showFigures;
`;

/**
 * `Logic/Buy` (Go) — the purchase card's Buy: buyItem on the active profile (the one rule; the only place spent rises).
 * Bought is the item's id when it was bought ('' when refused), for the card's "It's yours!".
 */
export const BUY_SCRIPT = `${SAVE_HELPERS}
${SHOP_SHARED}
var model = shModel(Inputs.model), p = shActive(model);
var id = shBare(Inputs.itemId, SHOP_IDS.item);
var r = p ? buyItem(p, id, { robotId: shBare(Inputs.robotId, SHOP_IDS.robot), name: typeof Inputs.name === 'string' ? Inputs.name : '' }) : { ok: false, error: 'unknown', short: 0, left: 0, robotId: '' };
Outputs.model = model;
Outputs.ok = !!r.ok;
Outputs.error = String(r.error || '');
Outputs.short = Number(r.short) || 0;
Outputs.left = Number(r.left) || 0;
Outputs.robotId = String(r.robotId || '');
Outputs.bought = r.ok ? id : '';
`;

/**
 * `Logic/Use helper` (Go) — a held helper used on one job (IW-006 AC4). Item Id the helper, Plot Id the job, State the
 * island as it runs. Refused (nothing changes) unless she holds it and the job is one it helps now (a pinned robot at
 * work, the job not done, no helper riding on it already, the helper fitting it). Then it leaves `owned`; rain fills that
 * plot's tulips at once and is gone; the can and the barrow ride on the job — on the island's state (the tick reads it)
 * and in the save (the plot's `live`, with `helper`, the island's job as it stands) — until its finish line.
 */
export const USE_HELPER_SCRIPT = `${ISLAND_ENGINE}
${SAVE_HELPERS}
${SHOP_SHARED}
var model = shModel(Inputs.model), p = shActive(model);
var id = shBare(Inputs.itemId, SHOP_IDS.item), plotId = shBare(Inputs.plotId, SHOP_IDS.plot);
var it = shopItem(id);
var st = Inputs.state && typeof Inputs.state === 'object' && Array.isArray(Inputs.state.plots) && Inputs.state.live ? Inputs.state : null;
var plot = null, cur = null, error = '', next = st;
if (st) for (var i = 0; i < st.plots.length; i++) if (st.plots[i].id === plotId) plot = st.plots[i];
if (plot) cur = st.live[plot.id] || null;
if (!p || !it || it.kind !== 'helper') error = 'unknown';
else if (p.owned.indexOf(it.id) === -1) error = 'held';
else if (!plot || !cur || plot.status !== 'working' || !plot.job || plot.stale) error = 'plot';
else if (cur.phase === 'wait' || cur.helper || !helperFits(worldOf(islView(plot, cur)), it.helper)) error = 'fits';
if (!error) {
  var live = {};
  for (var k in cur) live[k] = cur[k];
  live.things = islClone(cur.things);
  live.robot = islClone(cur.robot);
  if (it.helper === 'rain') helperRain({ things: live.things });
  else { live.helper = it.helper; helperOn({ things: live.things, robots: [live.robot] }, it.helper); }
  var lives = {};
  for (var l in st.live) lives[l] = st.live[l];
  lives[plot.id] = live;
  next = {};
  for (var f in st) next[f] = st[f];
  next.live = lives;
  p.owned.splice(p.owned.indexOf(it.id), 1);
  var sv = p.island.plots[plot.id];
  if (sv) sv.live = liveOf({ things: live.things, age: live.age, seed: live.seed, spent: live.spent, helper: live.helper });
}
Outputs.model = model;
Outputs.state = next;
Outputs.ok = !error;
Outputs.error = error;
Outputs.used = error ? '' : it.id + '|' + plot.id;
`;

/** `Logic/Brain size` — the job robot's brain (its row's, else BRAIN_SIZE): the most blocks the Workshop's Blocks node holds. */
export const BRAIN_SCRIPT = `
var BRAIN_SIZE = ${BRAIN_SIZE};
var r = Inputs.robot && typeof Inputs.robot === 'object' ? Inputs.robot : null;
Outputs.size = r && Number(r.brain) > BRAIN_SIZE ? Math.floor(Number(r.brain)) : BRAIN_SIZE;
`;

/** The shop's glue scripts, registered at the END of GLUE_SCRIPTS (cg003Scripts, lane H's rows). */
export const IW006_SHOP_SCRIPTS: ReadonlyArray<{ component: string; script: string; seam: string }> = [
  { component: 'Logic/Shop rows', script: SHOP_ROWS_SCRIPT, seam: 'the shop: the balance on its button, the five tabs, the open tab’s items' },
  { component: 'Logic/Shop card', script: SHOP_CARD_SCRIPT, seam: 'the purchase card: what you have, the cost, what is left, or how many more shells; the robot, the name, the job' },
  { component: 'Logic/Buy', script: BUY_SCRIPT, seam: 'the purchase card’s Buy: the one purchase rule on her profile' },
  { component: 'Logic/Use helper', script: USE_HELPER_SCRIPT, seam: 'a held helper used on one job, until that job is done' },
  { component: 'Logic/Brain size', script: BRAIN_SCRIPT, seam: 'the job robot’s brain: the most blocks its program holds' }
];
