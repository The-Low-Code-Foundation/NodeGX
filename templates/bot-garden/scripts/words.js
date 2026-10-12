function wordMap(rows, lang, name) {
  var map = {};
  var list = Array.isArray(rows) ? rows : [];
  for (var i = 0; i < list.length; i++) if (list[i] && list[i].key) map[list[i].key] = String(list[i][lang] || list[i].en || '').split('{b}').join(name);
  return map;
}
function fill(text, vars) { var t = String(text || ''); for (var k in vars) t = t.split('{' + k + '}').join(String(vars[k])); return t; }
function langOf(v) { return String(v) === 'fr' ? 'fr' : 'en'; }
function nameOf(v) { var n = String(v || '').trim(); return n || 'Pip'; }
// P108 IW-003 (lane M): sayNone:<kind> (the step's none, by what was sought) as its word key — iw3mNone<Kind> when the
// table has one, else the plain sayNone; any other key comes back as it was.
function noneKeyOf(key, words) { var k = String(key || ''); if (k.indexOf('sayNone:') !== 0) return k; var kind = k.slice(8), wk = 'iw3mNone' + kind.charAt(0).toUpperCase() + kind.slice(1); return words && words[wk] ? wk : 'sayNone'; }

// What this file gives: Scripts.words.<name> in a Function, use('words') in another file.
exports.fill = fill; exports.langOf = langOf; exports.nameOf = nameOf; exports.noneKeyOf = noneKeyOf;
exports.wordMap = wordMap;
