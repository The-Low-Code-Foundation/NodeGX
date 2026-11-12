// Words for the screen. The words themselves are rows in the App's "Words" Static Data node ({ key, fr, en });
// this file only fills a row's template: {0} {1}… are the arguments, {0:s} is "s" when argument 0 is more than 1,
// {0:lower} lower-cases it. It also formats clock times, durations and numbers the way reference/src/i18n.js did.
const { CLS, NUMBERS, NAMES, MOVES } = use('rules/data');

// rows → { key: text } for one language
function dictionary(rows, lang) {
  const d = {};
  for (const r of rows || []) d[r.key] = r[lang] || r.fr;
  return d;
}

function fill(template, args) {
  return String(template).replace(/\{(\d)(?::(s|lower))?\}/g, (_, i, how) => {
    const v = args[+i];
    if (how === 's') return Number(v) > 1 ? 's' : '';
    if (how === 'lower') return String(v ?? '').toLowerCase();
    return v === undefined || v === null ? '' : String(v);
  });
}

const pad = (n) => String(n).padStart(2, '0');

// the words of one language, with the formatting helpers the sentences need
function words(rows, lang) {
  const d = dictionary(rows, lang);
  const w = (key, ...args) => (d[key] === undefined ? key : fill(d[key], args));
  w.lang = lang;
  w.has = (key) => d[key] !== undefined;
  w.clock = (t, secs = true) => {
    t = Math.round(t);
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    if (lang === 'fr') return secs && s ? `${h} h ${pad(m)} min ${pad(s)} s` : `${h} h ${pad(m)}`;
    return secs && s ? `${h}:${pad(m)}:${pad(s)}` : `${h}:${pad(m)}`;
  };
  w.dur = (s) => {
    s = Math.round(Math.abs(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m && r ? `${m} min ${r} s` : m ? `${m} min` : `${r} s`;
  };
  w.num = (x, dec = 1) => {
    const v = Number.isInteger(x) ? String(x) : Number(x).toFixed(dec).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    return lang === 'fr' ? v.replace('.', ',') : v;
  };
  // a row of a game table carries its own name in both languages
  w.nm = (o) => (o ? o[lang] || o.fr || '' : '');
  w.cls = (c) => w.nm(CLS[c]);
  w.numName = (id) => w.nm(NUMBERS[id]);
  w.dancer = (cls, i) => (NAMES[cls] && NAMES[cls][i]) || `${cls} ${i + 1}`;
  w.move = (id) => w.nm(MOVES[id]);
  w.item = (id) => (NUMBERS[id] ? w.numName(id) : w(`items_${id}`));
  return w;
}

Object.assign(exports, { dictionary, fill, words });
