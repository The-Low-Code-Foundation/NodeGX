// One press → what changes. Every button in the game sends an event on the channel "gala-act" with an `act` (what
// kind of press: "order:up", "tab", "go") and an `arg` (which card, which tab…). The Game page's dispatcher Function
// hands both here with the save, the screen state and the 3D stage, and writes back what this returns:
//   { save, ui, toast } — a new save, a patch for the screen state, a sentence for the toast.
// The 3D stage is told directly (begin a run, turn the camera): it is the one thing here that is not state.
const A = use('game/actions');
const S = use('game/save');
const { simulate } = use('rules/engine');
const { NUMBERS, seasonRules } = use('rules/data');
const { sayText } = use('view/run');

const UI0 = { screen: 'prep', tab: 'order', pickNum: 'G1', selBlock: {}, selMove: null, selChain: null, allMoves: false, editB: false, pickDancer: null, armed: null, selected: null, pickedRoom: null, shopCat: 'hall', speed: 1, follow: true, introForced: false, confirm: null, renaming: false };
const num = (x) => Number(x);
const split = (s) => { const i = String(s).indexOf(':'); return i < 0 ? [String(s), ''] : [String(s).slice(0, i), String(s).slice(i + 1)]; };

function tabChange(save, ui, k) {
  const patch = { tab: k, armed: null, confirm: null, renaming: false };
  if (k !== 'build') patch.selected = null;
  if (k === 'build') patch.pickedRoom = 'dr';
  else if (['formation', 'costumes', 'parking'].includes(k) || ui.pickedRoom === 'dr') patch.pickedRoom = null;
  return { ui: patch };
}

function begin(save, ui, stage, mode, tryId) {
  if (!stage || (mode === 'gala' && save.galaDone)) return {};
  const res = stage.beginRun(mode, tryId);
  if (!res) return {};
  return { ui: { screen: 'run', res, live: { mode, t: 0, done: false, feed: [], tryId: tryId || null }, speed: 1, pickedRoom: null, armed: null, selected: null, confirm: null } };
}
function stop(stage) {
  if (stage) stage.stopRun();
  return { ui: { screen: 'prep', res: null, live: null } };
}

function dispatch(act, arg, save, ui, w, stage) {
  ui = { ...UI0, ...(ui || {}) };
  const [group, what] = split(act);
  const out = (r) => r || {};
  switch (group) {
    case 'tab': return tabChange(save, ui, String(arg));
    case 'lang': return { save: { ...save, lang: save.lang === 'en' ? 'fr' : 'en' } };
    case 'sound': { const on = save.sound === false; if (on && stage) stage.wake(); return { save: { ...save, sound: on } }; }
    case 'intro': return { ui: { introForced: true } };
    case 'introGo': {
      const r = { save: { ...save, seenIntro: save.season }, ui: { introForced: false } };
      if (save.season === 2) Object.assign(r.ui, tabChange(save, ui, 'parking').ui);
      return r;
    }
    case 'cam': if (stage) stage.camCmd(String(arg)); return {};
    case 'go': {
      const id = String(arg);
      if (id === 'rehearse') return begin(save, ui, stage, 'rehearsal');
      if (id === 'gala') return begin(save, ui, stage, 'gala');
      if (id === 'speed') { const s = ui.speed >= 8 ? 1 : ui.speed * 2; if (stage) stage.setSpeed(s); return { ui: { speed: s } }; }
      if (id === 'follow') { const f = !ui.follow; if (stage) stage.setFollow(f); return { ui: { follow: f } }; }
      if (id === 'skipNum') { if (stage) stage.skipNumber(); return {}; }
      if (id === 'skip') { if (stage) stage.skipToEnd(); return {}; }
      if (id === 'stop' || id === 'back') return stop(stage);
      if (id === 'nextSeason') { stop(stage); return { save: S.nextSeason(save), ui: { ...UI0, screen: 'prep', res: null, live: null } }; }
      return {};
    }
    case 'try': return begin(save, ui, stage, 'try', ui.pickNum && NUMBERS[ui.pickNum] ? ui.pickNum : 'G1');
    // the 3D stage reports
    case 'runDone': {
      const live = arg || ui.live || {};
      const r = { ui: { screen: 'results', live } };
      if (live.mode === 'gala' && ui.res && !save.galaDone) r.save = A.finishGala(save, ui.res).save;
      return r;
    }
    case 'say': return Array.isArray(arg) ? { toast: sayText(arg, w) } : {};
    case 'stageUi': return { ui: arg && typeof arg === 'object' ? arg : {} };
    case 'place': return out(A.build(save, ui, 'place', arg, w));
    case 'key': return out(A.build(save, ui, String(arg), null, w));
    // the tabs
    case 'order': {
      if (what === 'up' || what === 'down') return out(A.moveCard(save, String(arg), what === 'up' ? -1 : 1));
      const [which, d] = split(what); return out(A.orderStep(save, which, num(d)));
    }
    case 'form': {
      if (what === 'renameAsk') return { ui: { renaming: true } };
      if (what === 'renameCancel') return { ui: { renaming: false } };
      if (what === 'delAsk') return { ui: { confirm: 'delBlock' } };
      if (what === 'confirmNo') return { ui: { confirm: null } };
      if (what === 'renameBlock') { const r = out(A.formationAct(save, ui, 'renameBlock', arg, w)); if (r.save) r.ui = { renaming: false }; return r; }
      if (what === 'delBlock') { const r = out(A.formationAct(save, ui, 'delBlock', null, w)); r.ui = { ...(r.ui || {}), confirm: null }; return r; }
      const idx = (prefix) => num(String(arg).split(prefix).pop());
      if (what === 'step') return out(A.formationAct(save, ui, 'step', idx('s'), w));
      if (what === 'chain') return out(A.formationAct(save, ui, 'chain', idx('c'), w));
      if (what === 'pickDancer') return out(A.formationAct(save, ui, 'pickDancer', idx('-'), w));
      if (what === 'stepTool' || what === 'chainTool') return out(A.formationAct(save, ui, what, arg === 'x' ? 'x' : num(arg), w));
      if (what === 'dropDancer') return out(A.formationAct(save, ui, 'dropDancer', { ...arg, index: num(String(arg.id).split('-').pop()) }, w));
      return out(A.formationAct(save, ui, what, arg, w));
    }
    case 'gouter': {
      if (what === 'snack') return out(A.snack(save, String(arg), w));
      const [which, d] = split(what); return out(A.gouterStep(save, which, num(d)));
    }
    case 'cos': return out(A.costume(save, ui, what, String(arg), w));
    case 'build': {
      if (what === 'goLoge') return { ui: { pickedRoom: 'dr' } };
      return out(A.build(save, ui, what, arg, w));
    }
    case 'park': return out(A.parking(save, what, arg, w));
    case 'shop': {
      if (what === 'cat') return { ui: { shopCat: String(arg) } };
      return out(A.shop(save, what, String(arg), w));
    }
    case 'note': {
      if (what === 'resetAsk') return { ui: { confirm: 'reset' } };
      if (what === 'resetNo') return { ui: { confirm: null } };
      if (what === 'resetYes') { stop(stage); return { save: S.fresh(save.lang), ui: { ...UI0 } }; }
      return {};
    }
    default: return {};
  }
}

// what the stage's sync needs to know is worth a re-sync: anything but the live evening
const syncKey = (save, ui) => JSON.stringify([save, ui && { ...ui, res: null, live: null }]);

Object.assign(exports, { dispatch, UI0, syncKey, seasonRulesOf: seasonRules, simulate });
