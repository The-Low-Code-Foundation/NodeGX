// The frame around the 3D view: the top bar, the tabs, the camera bar and the buttons at the foot of the sheet.
// From reference/src/ui.js hud(), paintCamBar(), paintSheet() and paintRunSheet()'s button row.
const { rules } = use('view/common');

const TAB_KEYS = (save) => ['order', 'formation', 'gouter', 'costumes', 'build', ...(rules(save).parking ? ['parking'] : []), 'shop', 'notebook'];
const currentTab = (save, ui) => (TAB_KEYS(save).includes(ui.tab) ? ui.tab : 'order');

function top(save, ui, w) {
  const live = ui.live;
  return {
    brand: (save.school.name || '').trim() || w('school'),
    season: w('season', save.season),
    stars: w('stars', save.school.stars),
    day: live && !live.done ? `${w(`live_${live.mode}`)} · ${w.clock(live.t, false)}` : '',
    sound: save.sound !== false ? '🔊' : '🔇',
    soundTitle: w(save.sound !== false ? 'sound_on' : 'sound_off'),
    lang: w('lang'),
  };
}

const tabs = (save, ui, w) => TAB_KEYS(save).map((k) => ({ id: k, label: w(`tabs_${k}`), pressed: k === currentTab(save, ui) }));

// the buttons at the foot of the sheet, by screen
function go(save, ui, w) {
  const live = ui.live || {}, mode = live.mode;
  const b = (id, label, kind, wide) => ({ id, label, kind, wide: !!wide });
  if (ui.screen === 'run') {
    return [
      b('speed', `⏩ ${w('speed')} ×${ui.speed || 1}`, 'reh'),
      ...(mode !== 'try' ? [b('follow', `${w('follow')} ${ui.follow !== false ? '✓' : ''}`, 'reh')] : []),
      b('skipNum', w('skipNum'), 'reh'),
      ...(mode !== 'gala' ? [b('stop', w('stop'), 'reh')] : []),
      b('skip', w('skip'), 'reh', true),
    ];
  }
  if (ui.screen === 'results') return [b('back', w('back'), 'reh', true), ...(mode === 'gala' ? [b('nextSeason', w('newSeason'), 'gala', true)] : [])];
  return [b('rehearse', w('rehearse'), 'reh'), save.galaDone ? b('nextSeason', w('newSeason'), 'gala') : b('gala', w('gala'), 'gala')];
}

function cam(save, ui, w) {
  const c = ui.cam || { mode: 'school', high: false, wallMode: 1 };
  const out = [
    { id: 'rotL', label: '⟲', pressed: false }, { id: 'rotR', label: '⟳', pressed: false },
    { id: 'high', label: `⇕ ${w('views_high')}`, pressed: !!c.high },
    { id: 'school', label: `🏫 ${w('views_school')}`, pressed: c.mode === 'school' },
    { id: 'stage', label: `🎭 ${w('views_stage')}`, pressed: c.mode === 'stage' },
  ];
  if (rules(save).parking) out.push({ id: 'park', label: '🅿️', pressed: c.mode === 'park' });
  out.push({ id: 'walls', label: `🧱 ${w('views_walls')} : ${w(`wallModes_${c.wallMode}`)}`, pressed: false });
  out.push({ id: 'out', label: '−', pressed: false }, { id: 'in', label: '+', pressed: false });
  return out;
}

function intro(save, ui, w) {
  const s = save.season, key = w.has(`intro_${s}_0`) ? s : 'free';
  return { title: w(`intro_${key}_0`), body: w(`intro_${key}_1`), go: w('intro_go'), show: !!ui.introForced || save.seenIntro < s };
}

Object.assign(exports, { TAB_KEYS, currentTab, top, tabs, go, cam, intro });
