/**
 * The written answer for an Olive request (P105 CG-005 AC4): what the game shows when Olive does not answer — no model,
 * the 12 s timeout, a refused output, no shell at all. A ✅ rung's written answer is RIGHT, so the program still works;
 * a 🎓 rung's is the readout's own CANNED MISTAKE, so the lesson survives without a model. The data is the rung
 * table's `written` section (`olive-templates.json`); this is the one reader of it.
 *
 * 🔴 This function's SOURCE is embedded verbatim in the page's Function scripts (`cg005Olive.ts` reads
 * `writtenAnswer.toString()`), so the page and this file cannot drift. Keep it ES5, self-contained, with no backtick
 * and no dollar-brace (the TPL-007 script rule): it runs inside a template-literal script.
 */
'use strict';

function writtenAnswer(table, rung, values, lang) {
  var w = table && table.written ? table.written[rung] : null;
  if (!w || typeof w !== 'object') return null;
  var a = w[lang === 'en' ? 'en' : 'fr'];
  var v = values && typeof values === 'object' && !Array.isArray(values) ? values : {};
  if (a && a.by) {
    var key = [];
    for (var i = 0; i < a.by.length; i++) key.push(v[a.by[i]] === undefined || v[a.by[i]] === null ? '' : String(v[a.by[i]]));
    var hit = a.map ? a.map[key.join('|')] : null;
    a = hit || a['else'] || null;
  }
  if (!a || typeof a !== 'object') return null;
  if (a.text !== undefined) {
    return {
      text: String(a.text).replace(/\{(\w+)\}/g, function (m, k) {
        return v[k] !== undefined && v[k] !== null ? String(v[k]) : m;
      })
    };
  }
  if (a.sum) {
    var s = 0;
    for (var j = 0; j < a.sum.length; j++) s += Number(v[a.sum[j]]) || 0;
    return { value: s };
  }
  if (a.number !== undefined) return { value: Number(v[a.number]) || 0 };
  if (a.value !== undefined) return { value: JSON.parse(JSON.stringify(a.value)) };
  return null;
}

module.exports = { writtenAnswer };
