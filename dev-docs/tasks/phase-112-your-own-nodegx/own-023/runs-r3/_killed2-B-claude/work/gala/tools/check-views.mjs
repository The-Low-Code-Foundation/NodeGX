// Runs the app's script files the way NodeGX does (each once, use() between them) on the starting save and on a
// played-through one, so a typo in a view or an action shows here rather than as a blank tab.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = {};
export function use(path) {
  if (cache[path]) return cache[path];
  const exports = (cache[path] = {});
  new Function('exports', 'use', readFileSync(join(root, 'app/scripts', `${path}.js`), 'utf8'))(exports, use);
  return exports;
}
const rows = JSON.parse(readFileSync(join(root, 'tools/words.json'), 'utf8'));
const T = use('game/text'), S = use('game/save'), A = use('game/actions'), F = use('view/frame'), V = use('view/prep'), FO = use('view/formation'), RUN = use('view/run'), E = use('rules/engine'), C = use('settings/check');
const missing = new Set();
for (const lang of ['fr', 'en']) {
  const w0 = T.words(rows, lang), w = Object.assign((k, ...a) => { if (!w0.has(k)) missing.add(k); return w0(k, ...a); }, w0);
  for (let season = 1; season <= 5; season++) {
    let save = S.fresh(lang); for (let s = 1; s < season; s++) save = S.nextSeason(save);
    save.school.stars = 999;
    const ui = { screen: 'prep', tab: 'order', pickNum: 'G1', selBlock: {}, selMove: 0, selChain: 1, pickDancer: 2, allMoves: false, shopCat: 'food', cam: { mode: 'school', high: false, wallMode: 1 } };
    F.top(save, ui, w); F.tabs(save, ui, w); F.go(save, ui, w); F.cam(save, ui, w); F.intro(save, ui, w);
    for (const k of ['order', 'gouter', 'costumes', 'build', 'parking', 'shop', 'notebook']) JSON.stringify(V[k](save, ui, w));
    for (const id of save.plan.order.filter((x) => save.plan.numbers[x])) JSON.stringify(FO.formation(save, { ...ui, pickNum: id }, w));
    for (const mode of ['rehearsal', 'gala', 'try']) {
      const R = E.simulate({ plan: save.plan, school: save.school, season: save.season, mode, seed: 7 });
      const live = { mode, t: R.end - 600, done: false, feed: R.trace.filter((e) => e.say).map((e) => ({ t: e.t, say: e.say })), tryId: 'G1' };
      JSON.stringify(RUN.liveSheet(R, live, w)); JSON.stringify(RUN.results(R, live, save, w));
      if (mode === 'gala') save = A.finishGala(save, R).save;
    }
    JSON.stringify(V.notebook(save, ui, w));
    // the actions
    let s2 = save;
    const apply = (r) => { if (r.save) s2 = r.save; return r; };
    apply(A.orderStep(s2, 'start', 1)); apply(A.moveCard(s2, 'P1', 1)); apply(A.gouterStep(s2, 'cake', 1)); apply(A.snack(s2, 'barres', w));
    for (const act of ['newBlock', 'copyBlock', 'addChain', 'delBlock']) apply(A.formationAct(s2, ui, act, null, w));
    apply(A.formationAct(s2, ui, 'addMove', 'echange', w)); apply(A.formationAct(s2, ui, 'renameBlock', 'Le début', w));
    if (A.formationAct(s2, ui, 'renameBlock', 'merde', w).save) throw new Error('a rude block name got through');
    apply(A.formationAct(s2, ui, 'dropDancer', { index: 0, left: 100, top: 50 }, w));
    apply(A.costume(s2, ui, 'item', 'outfit:fee', w)); apply(A.costume(s2, ui, 'hair', 'petits:couettes', w));
    apply(A.build(s2, ui, 'piece', 'plante', w)); apply(A.shop(s2, 'buy', 'up|sieges', w)); apply(A.parking(s2, 'width', 2.8, w));
    JSON.stringify(V.shop(s2, ui, w)); JSON.stringify(FO.formation(s2, ui, w));
  }
}
if (missing.size) console.log('MISSING WORDS:', [...missing].join(', '));
// the checker
const bad = [['moves', 'plie', { fr: 'Merde' }], ['moves', 'plie', { fr: 'P.U.T.A.I.N' }], ['moves', 'plie', { fr: '<script>alert(1)</script>' }], ['moves', 'plie', { fr: 'f*ck' }],
  ['moves', 'plie', { d: 9 }], ['moves', 'plie', { fx: 1 }], ['outfits', 'fee', { price: -5 }], ['outfits', 'fee', { price: '10' }], ['start', '', { stars: 1e9 }],
  ['moves', '__proto__', { fr: 'x', en: 'x', d: 1, c: 4, icon: '🌀', a: 1, b: 1, st: '*' }], ['moves', 'newOne', { fr: 'Saut' }], ['eval', 'x', { fr: 'a' }],
  ['moves', 'newTwo', { fr: 'Saut', en: 'Jump', d: 1, c: 4, icon: 'http://x', a: 1, b: 1, st: '*' }], ['outfits', 'robeX', { fr: 'Robe', en: 'Dress', min: 3, icon: '👗', themes: ['<b>'] }],
  ['moves', 'plie', { fr: 'C0NN4RD' }], ['moves', 'plie', { en: 'sh1t' }], ['moves', 'plie', { fr: 'a'.repeat(31) }], ['pieces', 'newPiece', { fr: 'x', en: 'y' }]];
for (const [t, id, f] of bad) { const r = C.checkChange(t, id, f); if (r.ok) throw new Error(`checker let through ${t}/${id} ${JSON.stringify(f)}`); }
const good = [['moves', 'plie', { fr: 'Plié royal', d: 2 }], ['outfits', 'fee', { price: 20 }], ['start', '', { stars: 80 }], ['moves', 'sautLapin', { fr: 'Saut du lapin', en: 'Bunny hop', d: 1, c: 4, icon: '🐇', a: 1, b: 2, st: 'classique jazz' }],
  ['outfits', 'pirate', { fr: 'Pirate', en: 'Pirate', min: 4, icon: '🎩', price: 25, themes: ['marins'] }], ['moves', 'plie', { fr: 'Pas de bourrée' }], ['numbers', 'G2', { fr: 'La mort du cygne' }]];
for (const [t, id, f] of good) { const r = C.checkChange(t, id, f); if (!r.ok) throw new Error(`checker refused ${t}/${id}: ${r.reason}`); }
// applyRows takes what the checker lets through, and the game still plays
const D = use('rules/data');
const { over } = C.toRows(good.map(([table, rowId, fields]) => ({ table, rowId, fields })));
D.applyRows(over);
if (D.MOVES.plie.fr !== 'Pas de bourrée' || D.OUTFITS.fee.price !== 20 || !D.MOVES.sautLapin || D.START.stars !== 80) throw new Error('applyRows did not take the changes');
if (S.fresh().school.stars !== 80) throw new Error('a new school does not start with the new stars');
E.simulate({ plan: use('rules/plan').defaultPlan(), school: S.fresh().school, season: 1, mode: 'gala', seed: 3 });
console.log('views, actions and the checker all ran');
