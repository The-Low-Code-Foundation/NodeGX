/**
 * P108 IW-006 (session 5, lane O `iw006-owed`) — what session 4 owed: My robots' upgrade slot that sends her to the shop
 * (never to an islander), "now in the shop" under the win card's thanks, and a crew robot sent from My robots.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * | name | where it runs | the question it answers |
 * |---|---|---|
 * | {@link IW6O_CARD_HELPERS} | inside `Logic/Robot cards` (ROBOT_CARDS_SCRIPT, cg003Scripts) | a card's upgrade slot in words (hers: a gift says who gave it, a purchase says the shop; empty: the shop, its price, and — when it is not on the shelf yet — the request that puts it there); the plots a card's robot can be sent to |
 * | {@link shopNewsScript} (`Logic/Shop news`) | `Pages/Workshop`, after Complete request | the win card's "Now in the shop: …" when THIS first win put an upgrade on the shop's shelf |
 * | {@link sendRobotScript} (`Logic/Send robot`) | `Pages/My robot` | a robot's card → one of her won plots: the crew's assign rule (iw008Crew `crewAssign`, unchanged), said on that robot's card |
 *
 * The rules:
 * - **The upgrade slot** (IW-006 §5 "Session 4 merge", owed 1): the islanders no longer give upgrades (lane H: the shop
 *   sells them, COMPLETE_REQUEST gives none). An empty slot names the upgrade, says it is in the island's shop and its
 *   price (SHOP's — never a literal); not on the shelf yet (the shop's rule, iw006Shop `shShows`: its request done and a
 *   robot of hers it fits), it says which request puts it there. A slot she filled says where it came from: an islander's
 *   gift from before the shop (a sticker) names that islander — it is true — and a purchase says the shop. A tap on the
 *   slot does not open the shop (the shop's open state is a States node local to `Island/Shop`): it SAYS where.
 * - **Now in the shop** (owed 3): a first win (Complete request's Newly Done) of the request an upgrade is unlocked by,
 *   when she does not have it and a robot of hers fits it: "Now in the shop: a bigger can, 🐚 15" — under the thanks and
 *   the "+N 🐚" line, as small as the pay line (principle 2: the meter and the thanks first).
 * - **Send from My robots** (owed 4): a card of a robot she has lists the plots she has WON whose job needs its kind (and
 *   her band allows), as chips (ink where it works or helps); a tap is `crewAssign` — works it, helps the robot there, or
 *   (tapped where it already is) comes home; refused in the crew's words. The line is said on THAT robot's card.
 *   🔴 HOOK for the land (lane B, at the merge — not built here): Read family's `land` is not an input of Robot cards
 *   yet. When it is, `iw6oSendPlots` lists `LAND_ID` for a robot of ANY kind (brief §4.2: the land needs no one kind) and
 *   `Logic/Send robot` hands `crewAssign` the land's request (lane B's `landRequest`, with `needs` = the robot's kind, and
 *   `done` holding the land), because `crewAssign` finds its request in `Inputs.requests` by id.
 *
 * Words: every new key is an `iw6o…` key (cg003Content PAGE_WORDS, lane O's block, EN + FR). 🔴 No backtick and no
 * dollar-brace inside any script text (these are template literals).
 *
 * @module noodl-mcp/tests/iw006Owed
 */
import { LAND_ID, SHOP, UPGRADES } from './cg002Content';
import { SAVE_HELPERS } from './cg002Scripts';
import { assignRobotScript } from './iw008Crew';

/** The shop's upgrade items by upgrade id: what the slot and the win card say (its name — the shop's, so she finds it there — and its price, SHOP's own). */
export const IW6O_UPGRADE_ITEMS: Readonly<Record<string, { price: number; name: { en: string; fr: string } }>> = Object.fromEntries(
  SHOP.filter((i) => i.kind === 'upgrade' && i.upgrade).map((i) => [i.upgrade as string, { price: i.price, name: { en: i.name.en, fr: i.name.fr } }])
);
/** A send chip's row id: the card's prefix, then this, then the request's id (a repeater's row is global by id). */
export const IW6O_SEND_ID = 'send|';
/** The land's id (lane B's), named here so the hook above has one place to start from. */
export const IW6O_LAND = LAND_ID;

/**
 * Pasted into `Logic/Robot cards` after its own declarations (it uses that script's `w`, `fill`, `titleOf`, `reqs`,
 * `band`). `iw6oUpText(up, has, upgraded, kinds)` — the slot's words; `iw6oSendPlots(row, kind, pre)` — the chips.
 * Reads `Inputs.stickers` (an upgrade given by an islander before the shop) and `Inputs.done` (her requests done).
 */
export const IW6O_CARD_HELPERS = `
var IW6O_ITEMS = ${JSON.stringify(IW6O_UPGRADE_ITEMS)};
var IW6O_SEND_ID = ${JSON.stringify(IW6O_SEND_ID)};
var iw6oStickers = Array.isArray(Inputs.stickers) ? Inputs.stickers : [];
var iw6oDone = Array.isArray(Inputs.done) ? Inputs.done : [];
/** The slot's words: a gift (a sticker) names who gave it; bought says the shop; empty says the shop, the shop's name for it, its price, and the request that shelves it. */
function iw6oUpText(up, upWord, upWho, has, upgraded, kinds) {
  if (!up) return '';
  if (has && upgraded) return iw6oStickers.indexOf(up.id) !== -1 ? fill(w.ig5UpHas, { up: upWord, who: upWho }) : fill(w.iw6oUpMine, { up: upWord });
  var item = IW6O_ITEMS[up.id], price = item ? item.price : 0, fits = false;
  // The shop's own name for it (the card she will look for), first letter small: "in the island's shop: a bigger hod".
  var nm = item ? String(item.name[lang] || item.name.en) : upWord, shopWord = nm.charAt(0).toLowerCase() + nm.slice(1);
  for (var k = 0; k < kinds.length; k++) if (up.fits.indexOf(kinds[k]) !== -1) fits = true;
  if (iw6oDone.indexOf(up.unlockedBy) !== -1 && fits) return fill(w.iw6oUpShop, { up: shopWord, n: price });
  return fill(w.iw6oUpLater, { up: shopWord, n: price, q: titleOf(up.unlockedBy) });
}
/** The plots this robot can be sent to: every request she has won whose job needs its kind, in her band; ringed where it works or helps. */
function iw6oSendPlots(row, kind, pre) {
  var out = [];
  if (!row) return out;
  for (var q = 0; q < reqs.length; q++) {
    var rq = reqs[q];
    if (!rq || !rq.id || rq.id === 'free' || iw6oDone.indexOf(rq.id) === -1) continue;
    if ((rq.needs ? String(rq.needs) : 'pip') !== kind || Number(rq.band) > band) continue;
    out.push({ id: pre + IW6O_SEND_ID + rq.id, label: titleOf(rq.id), selected: String(row.working || '') === rq.id || String(row.helps || '') === rq.id, locked: false });
  }
  // HOOK (lane B, the land): when Robot cards reads the land, push { id: pre + IW6O_SEND_ID + LAND_ID, ... } here for
  // a robot of ANY kind (see the module's header).
  return out;
}
`;

/**
 * `Logic/Shop news` (go, after Complete request) — the win card's "Now in the shop: …": the upgrades THIS first win put on
 * the shop's shelf (its request is their `unlockedBy`, she does not have them, a robot of hers fits them), each with its
 * price. Nothing on a replay (Newly Done false) and nothing when the win shelves nothing.
 */
export const shopNewsScript = (o: { wordHelper: string }): string => `${SAVE_HELPERS}${o.wordHelper}
var model = modelOf(Inputs.model && typeof Inputs.model === 'object' ? Inputs.model : {});
var pid = String(Inputs.profileId || model.island.activeId);
var lang = langOf(Inputs.lang);
var w = wordMap(Inputs.words, lang, 'Pip');
var id = String(Inputs.requestId || ''), fresh = Inputs.newlyDone === true;
var p = null;
for (var i = 0; i < model.profiles.length; i++) if (model.profiles[i].id === pid) p = model.profiles[i];
var news = [], kinds = [];
if (p) { var rows = robotRowsOf(p); for (var r = 0; r < rows.length; r++) kinds.push(rows[r].kind); }
if (p && fresh && id) for (var u = 0; u < UPGRADES.length; u++) {
  var up = UPGRADES[u], item = shopItem(up.id), fits = false;
  if (up.unlockedBy !== id || !item) continue;
  if (p.stickers.indexOf(up.id) !== -1 || p.owned.indexOf(up.id) !== -1) continue;
  for (var k = 0; k < kinds.length; k++) if (up.fits.indexOf(kinds[k]) !== -1) fits = true;
  if (!fits) continue;
  var nm = String(item.name[lang] || item.name.en);
  news.push(fill(w.iw6oNewsItem, { up: nm.charAt(0).toLowerCase() + nm.slice(1), n: item.price }));
}
Outputs.text = news.length ? fill(w.iw6oNews, { what: news.join(' · ') }) : '';
Outputs.has = news.length > 0;
`;

/**
 * `Logic/Send robot` (go) — My robots: robot Robot Id (the card's) sent to the plot of chip Send To (a row id ending in the
 * request's id). The crew's assign rule exactly (`assignRobotScript`, lane C's text, run unchanged on the request the chip
 * names); then the line is said on THIS robot's card (Told: robotId), in My robots' words where the plot card's "here"
 * would be wrong: works on / helps on / two robots already on that plot. Answers the family (Model), Ok, Error, Role, Told.
 */
export const sendRobotScript = (o: { wordHelper: string; oliveWords: Record<string, string> }): string => `
var iw6oTo = String(Inputs.sendTo || '');
Inputs = { model: Inputs.model, profileId: Inputs.profileId, lang: Inputs.lang, words: Inputs.words, requests: Inputs.requests, now: Inputs.now, robotId: Inputs.robotId, requestId: iw6oTo.slice(iw6oTo.lastIndexOf('|') + 1) };
${assignRobotScript(o)}
var iw6oPlot = req && req.copyKeys ? (w[req.copyKeys.title] || reqId) : reqId;
var iw6oVars = { r: me, m: mate, plot: iw6oPlot };
if (res.role === 'works') line = fill(w.iw6oSentTo, iw6oVars);
else if (res.role === 'helps') line = fill(w.iw6oHelpsOn, iw6oVars);
else if (res.error === 'full') line = fill(w.iw6oFull, iw6oVars);
Outputs.told = { robotId: rid, requestId: reqId, text: line, ok: res.ok, n: Date.now() };
`;
