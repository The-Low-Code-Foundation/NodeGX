#!/usr/bin/env node
/**
 * P109 ISL-008 AC6 — which of Olive's Island's `!important`s exist only to beat a node's DEFAULT, measured in the page.
 *
 * Since ISL-008 a node writes inline only what its author set; its defaults sit in a `.ndl-d-*` class first in
 * `<head>`, which any author class beats by source order. So an `!important` that beat a default inline is now dead
 * weight, and one that beats an author-set (panel, wired, kit) inline value still matters. Which is which is a fact
 * about the RUNNING page, not the sheet: a class can be wired, a node can be a kit's, a value can be set in a state.
 *
 * The instrument, run inside the page in ONE synchronous evaluate (so no frame, no React render, no drive read sees a
 * changed sheet):
 *   for each `!important` declaration of the island's sheet (parsed from the `<style>` the CSS Definition writes),
 *   whose rule applies now (its `@media` matches) and matches at least one element:
 *     NEW — rewrite that one rule's declarations with only that `!important` removed, read the computed value of
 *           every longhand it sets on every element it matches (pseudo-elements too), put the rule back. Any value
 *           that moved means the `!important` still beats something.
 *     OLD — the same, after copying every element's `.ndl-d-*` declarations back INLINE (what the runtime did before
 *           ISL-008), restored afterwards. Any value that moved means it beat a default — or something else.
 *   removable = seen, OLD moved somewhere, NEW moved nowhere. keep = NEW moved somewhere. neither = seen, never moved.
 *   unseen = no state of any drive matched it (kept: a floor, like s15's census).
 *
 * Hooked into every drive through `drive-deployed.js` when `ISL008_IMPORTANT_CENSUS=<json>` is set: it runs before
 * each press, key, touch and navigation, skips a state whose match signature it has already measured, and merges into
 * the JSON, so several drives accumulate into one census.
 *
 *   isl008-important-census.js report <json>          the table, each row with its line in cg007Look.ts
 *   isl008-important-census.js strip <json> [--write] remove the removable `!important`s from cg007Look.ts
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOOK = path.join(ROOT, 'packages', 'noodl-mcp', 'tests', 'cg007Look.ts');
const MARK = "Olive's Island, the look";

/** Runs in the page. `prior` = { seen: [signature…], n: {k:true}, o: {k:true} }. */
function inPage(prior, MARK) {
  const styleEl = Array.from(document.querySelectorAll('style')).find((s) => (s.textContent || '').indexOf(MARK) !== -1);
  if (!styleEl || !styleEl.sheet) return { ready: false };
  const text = styleEl.textContent;

  function parse(src) {
    const s = src.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));
    const rules = [];
    const decls = [];
    function scan(from, to, stopAt) {
      // Index of the first top-level char in stopAt, outside quotes and brackets.
      let depth = 0;
      let q = null;
      for (let i = from; i < to; i++) {
        const c = s[i];
        if (q) {
          if (c === '\\') i++;
          else if (c === q) q = null;
          continue;
        }
        if (c === '"' || c === "'") q = c;
        else if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (depth === 0 && stopAt.indexOf(c) !== -1) return i;
      }
      return -1;
    }
    function close(open, to) {
      let depth = 0;
      let q = null;
      for (let i = open; i < to; i++) {
        const c = s[i];
        if (q) {
          if (c === '\\') i++;
          else if (c === q) q = null;
          continue;
        }
        if (c === '"' || c === "'") q = c;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) return i;
      }
      return to;
    }
    function block(from, to, media) {
      let i = from;
      while (i < to) {
        while (i < to && /\s/.test(s[i])) i++;
        if (i >= to) break;
        const stop = scan(i, to, '{;');
        if (stop === -1) break;
        const prelude = s.slice(i, stop).trim();
        if (s[stop] === ';') {
          i = stop + 1;
          continue;
        }
        const end = close(stop, to);
        if (/^@(media|supports)/i.test(prelude)) block(stop + 1, end, media.concat(prelude));
        else if (prelude[0] !== '@') {
          const body = src.slice(stop + 1, end);
          const pieces = [];
          let j = stop + 1;
          while (j <= end) {
            const k = scan(j, end, ';');
            const e = k === -1 ? end : k;
            pieces.push({ from: j, to: e });
            j = e + 1;
          }
          const rule = { ord: rules.length, selector: prelude, body, pieces: [], media };
          for (const p of pieces) {
            const raw = src.slice(p.from, p.to);
            const clean = s.slice(p.from, p.to);
            const colon = clean.indexOf(':');
            if (colon === -1) {
              rule.pieces.push({ raw });
              continue;
            }
            const prop = clean.slice(0, colon).trim().toLowerCase();
            let value = clean.slice(colon + 1).trim();
            const important = /!\s*important\s*$/i.test(value);
            value = value.replace(/!\s*important\s*$/i, '').trim();
            const piece = { raw, prop, value, important };
            if (important) {
              piece.k = decls.length;
              decls.push({ k: decls.length, rule: rule.ord, prop, value, selector: prelude, media: media.join(' / ') });
            }
            rule.pieces.push(piece);
          }
          rules.push(rule);
        }
        i = end + 1;
      }
    }
    block(0, s.length, []);
    return { text: src, rules, decls };
  }

  let P = window.__islImportantParsed;
  if (!P || P.text !== text) {
    P = parse(text);
    // Align the parsed style rules with the CSSOM's (a rule Chrome drops would shift every later one).
    const om = [];
    (function walk(list) {
      for (const r of Array.from(list)) {
        if (r.type === 1) om.push(r);
        else if ((r.type === 4 || r.type === 12) && r.cssRules) walk(r.cssRules);
      }
    })(styleEl.sheet.cssRules);
    // Chrome serialises `*::before` as `::before` and `:before` as `::before`.
    const norm = (x) =>
      x.replace(/\s+/g, '').replace(/(^|[^:]):(before|after)/g, '$1::$2').replace(/\*(?=[:.[#])/g, '').replace(/'/g, '"').toLowerCase();
    let j = 0;
    const dropped = [];
    for (const rule of P.rules) {
      const want = norm(rule.selector);
      // Resync over a rule either side dropped (look a few CSSOM rules ahead), never cascade a miss.
      let hit = -1;
      for (let t = j; t < Math.min(om.length, j + 4); t++) if (norm(om[t].selectorText) === want) { hit = t; break; }
      if (hit !== -1) {
        rule.om = om[hit];
        j = hit + 1;
      } else dropped.push(rule.selector + ' ≠ ' + (om[j] ? om[j].selectorText : '(end)'));
    }
    P.dropped = dropped;
    window.__islImportantParsed = P;
  }

  function applies(rule) {
    for (let p = rule.om && rule.om.parentRule; p; p = p.parentRule) {
      if (p.media && !window.matchMedia(p.media.mediaText).matches) return false;
      if (p.type === 12 && !CSS.supports(p.conditionText)) return false;
    }
    return !!rule.om;
  }
  function splitList(sel) {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < sel.length; i++) {
      const c = sel[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === ',' && depth === 0) {
        out.push(sel.slice(start, i));
        start = i + 1;
      }
    }
    out.push(sel.slice(start));
    return out.map((x) => x.trim());
  }
  function targets(rule) {
    if (rule.targets) return rule.targets;
    const pairs = [];
    for (const part of splitList(rule.selector)) {
      const m = part.match(/::?(before|after|placeholder|marker|selection|-webkit-[a-z-]+)\s*$/i);
      const pseudo = m ? '::' + m[1] : null;
      const base = (m ? part.slice(0, m.index) : part).trim() || '*';
      let els = [];
      try {
        els = Array.from(document.querySelectorAll(base));
      } catch (e) {
        els = [];
      }
      for (const el of els.slice(0, 80)) pairs.push([el, pseudo]);
    }
    rule.targets = pairs;
    return pairs;
  }
  const lhCache = {};
  function longhands(prop, value) {
    const key = prop + ':' + value;
    if (lhCache[key]) return lhCache[key];
    let out = [prop];
    if (prop.indexOf('--') !== 0) {
      const st = document.createElement('div').style;
      st.setProperty(prop, value);
      const l = [];
      for (let i = 0; i < st.length; i++) l.push(st[i]);
      if (l.length) out = l;
    }
    return (lhCache[key] = out);
  }
  const label = (el) => (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).filter((c) => c.indexOf('ndl-d-') !== 0).slice(0, 3).join('.') : el.tagName.toLowerCase());
  function read(pairs, lhs) {
    const out = [];
    for (const [el, pseudo] of pairs) {
      const cs = getComputedStyle(el, pseudo);
      for (const lh of lhs) out.push(cs.getPropertyValue(lh));
    }
    return out;
  }
  function bodyWithout(rule, ks) {
    return rule.pieces.map((p) => (ks.has(p.k) ? p.raw.replace(/!\s*important\s*$/i, '') : p.raw)).join(';');
  }

  for (const rule of P.rules) rule.targets = null;
  const live = P.decls.filter((d) => {
    const rule = P.rules[d.rule];
    return applies(rule) && targets(rule).length > 0;
  });
  const sig = window.innerWidth + '|' + live.map((d) => d.k + ':' + P.rules[d.rule].targets.length).join(',') + '|' + document.querySelectorAll('[style]').length;
  if (prior.seen.indexOf(sig) !== -1) return { ready: true, skip: true, sig, total: P.decls.length, dropped: P.dropped };

  /** Remove every candidate's `!important` at once, read; only the candidates whose values moved are re-measured alone. */
  function measure(skip) {
    const res = {};
    const plan = live
      .filter((d) => !skip[d.k])
      .map((d) => ({ d, rule: P.rules[d.rule], pairs: P.rules[d.rule].targets, lhs: longhands(d.prop, d.value) }));
    if (!plan.length) return res;
    const toggle = (xs) => {
      const byRule = new Map();
      for (const x of xs) (byRule.get(x.rule) || byRule.set(x.rule, new Set()).get(x.rule)).add(x.d.k);
      for (const [rule, ks] of byRule) rule.om.style.cssText = bodyWithout(rule, ks);
      return () => {
        for (const rule of byRule.keys()) rule.om.style.cssText = rule.body;
      };
    };
    const diff = (x, b, a) => {
      for (let i = 0; i < b.length; i++)
        if (b[i] !== a[i]) {
          const [el, pseudo] = x.pairs[Math.floor(i / x.lhs.length)];
          return label(el) + (pseudo || '') + ' ' + x.lhs[i % x.lhs.length] + ': ' + b[i] + ' → ' + a[i];
        }
      return null;
    };
    const before = plan.map((x) => read(x.pairs, x.lhs));
    let undo = toggle(plan);
    const after = plan.map((x) => read(x.pairs, x.lhs));
    undo();
    const suspects = plan.filter((x, i) => diff(x, before[i], after[i]));
    if (prior.verify) {
      // The combined strip IS the answer here: report what it moves.
      plan.forEach((x, i) => {
        const d = diff(x, before[i], after[i]);
        if (d) res[x.d.k] = d;
      });
      return res;
    }
    for (const x of suspects) {
      const b = read(x.pairs, x.lhs);
      undo = toggle([x]);
      const a = read(x.pairs, x.lhs);
      undo();
      const d = diff(x, b, a);
      if (d) res[x.d.k] = d;
    }
    return res;
  }

  // Verify mode: only the removable set, all at once, in both modes — NEW must move nothing; OLD (the sabotage arm:
  // defaults inline again, as before ISL-008) must move something, or the strip was never load-bearing.
  const only = {};
  if (prior.verify) for (const d of P.decls) if (prior.verify.indexOf(d.k) === -1) only[d.k] = true;

  const n = measure(prior.verify ? only : prior.n);
  // OLD: the defaults back inline, as the runtime wrote them before ISL-008.
  const defaultsEl = document.getElementById('noodl-default-styles');
  const byClass = {};
  if (defaultsEl && defaultsEl.sheet) {
    for (const r of Array.from(defaultsEl.sheet.cssRules)) {
      const m = r.selectorText && r.selectorText.match(/^\.(ndl-d-[A-Za-z0-9]+)$/);
      if (m) byClass[m[1]] = r.style;
    }
  }
  const touched = [];
  for (const el of Array.from(document.querySelectorAll('[class*="ndl-d-"]'))) {
    const cls = Array.from(el.classList).filter((c) => byClass[c]);
    if (!cls.length) continue;
    touched.push([el, el.getAttribute('style')]);
    for (const c of cls) {
      const st = byClass[c];
      for (let i = 0; i < st.length; i++) if (el.style.getPropertyValue(st[i]) === '') el.style.setProperty(st[i], st.getPropertyValue(st[i]));
    }
  }
  const o = measure(prior.verify ? only : Object.assign({}, prior.o, prior.n, n));
  for (const [el, attr] of touched) {
    if (attr === null) el.removeAttribute('style');
    else el.setAttribute('style', attr);
  }
  return { ready: true, sig, total: P.decls.length, dropped: P.dropped, live: live.map((d) => d.k), n, o, inlined: touched.length, decls: P.decls };
}

/** Wrap a CDP client so every press, key, touch and navigation is preceded by one census run. */
function attach(client, file, where) {
  // ISL008_IMPORTANT_VERIFY=<census json>: measure the combined strip of that census's removable set instead.
  const verify = process.env.ISL008_IMPORTANT_VERIFY
    ? classify(JSON.parse(fs.readFileSync(process.env.ISL008_IMPORTANT_VERIFY, 'utf8'))).filter((r) => r.kind === 'removable').map((r) => r.k)
    : null;
  const send = client.send.bind(client);
  let busy = false;
  const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { runs: 0, measured: 0, seen: [], decls: {}, drives: [] };
  state.drives.push(where);
  const save = () => fs.writeFileSync(file, JSON.stringify(state, null, 1));
  async function run() {
    if (busy) return;
    busy = true;
    try {
      const prior = { seen: state.seen, n: {}, o: {}, verify: verify || undefined };
      for (const [k, d] of Object.entries(state.decls)) {
        if (d.n) prior.n[k] = true;
        if (d.o) prior.o[k] = true;
      }
      const r = await send('Runtime.evaluate', { expression: `(${inPage.toString()})(${JSON.stringify(prior)}, ${JSON.stringify(MARK)})`, returnByValue: true });
      const v = r && r.result && r.result.value;
      state.runs++;
      if (!v || !v.ready) return;
      state.total = v.total;
      state.dropped = v.dropped;
      if (v.skip) return;
      state.measured++;
      state.seen.push(v.sig);
      for (const d of v.decls) if (!state.decls[d.k]) state.decls[d.k] = { sel: d.selector, prop: d.prop, value: d.value.slice(0, 80), media: d.media, seen: 0 };
      for (const k of v.live) state.decls[k].seen++;
      for (const [k, ex] of Object.entries(v.n)) if (!state.decls[k].n) state.decls[k].n = `${where}: ${ex}`;
      for (const [k, ex] of Object.entries(v.o)) if (!state.decls[k].o) state.decls[k].o = `${where}: ${ex}`;
      save();
    } catch (e) {
      state.errors = (state.errors || []).concat(String(e && e.message ? e.message : e).slice(0, 200)).slice(-10);
    } finally {
      busy = false;
    }
  }
  client.send = async (method, params) => {
    const p = params || {};
    if (
      (method === 'Input.dispatchMouseEvent' && p.type === 'mousePressed') ||
      (method === 'Input.dispatchTouchEvent' && p.type === 'touchStart') ||
      (method === 'Input.dispatchKeyEvent' && p.type === 'keyDown') ||
      method === 'Page.navigate'
    )
      await run();
    return send(method, params);
  };
  return { run, save };
}

/** Each non-comment `!important` of GARDEN_CSS's literal in cg007Look.ts, in order: its offset and line. */
function sourceSites(src) {
  const open = src.indexOf('export const GARDEN_CSS = `');
  const start = src.indexOf('`', open) + 1;
  const end = src.indexOf('\n`;', start);
  const body = src.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));
  const sites = [];
  const re = /\s*!\s*important/g;
  let m;
  while ((m = re.exec(body))) sites.push({ at: start + m.index, len: m[0].length, line: src.slice(0, start + m.index).split('\n').length });
  return sites;
}

function classify(state) {
  const rows = Object.entries(state.decls).map(([k, d]) => {
    const kind = !d.seen ? 'unseen' : d.n ? 'keep' : d.o ? 'removable' : 'neither';
    return { k: Number(k), kind, ...d };
  });
  return rows.sort((a, b) => a.k - b.k);
}

if (require.main === module) {
  const [, , mode, file, flag] = process.argv;
  if ((mode !== 'report' && mode !== 'strip') || !file) {
    console.error('usage: isl008-important-census.js report|strip <json> [--write]');
    process.exit(2);
  }
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  const src = fs.readFileSync(LOOK, 'utf8');
  const sites = sourceSites(src);
  const rows = classify(state);
  if (sites.length !== state.total) {
    console.error(`source has ${sites.length} !important in GARDEN_CSS, the page's sheet ${state.total}: regenerate, deploy and measure again`);
    process.exit(1);
  }
  const counts = rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {});
  if (mode === 'report') {
    console.log(JSON.stringify({ total: state.total, decided: rows.length, counts, runs: state.runs, measured: state.measured, drives: state.drives, dropped: state.dropped, errors: state.errors }, null, 1));
    for (const r of rows) console.log(`${r.kind.padEnd(9)} L${sites[r.k].line}\t${r.sel} { ${r.prop}: ${r.value} }${r.media ? '  @' + r.media : ''}\n\t\t${r.n || r.o || ''}`);
  } else {
    const removable = rows.filter((r) => r.kind === 'removable').map((r) => sites[r.k]).sort((a, b) => b.at - a.at);
    let out = src;
    for (const s of removable) out = out.slice(0, s.at) + out.slice(s.at + s.len);
    console.log(JSON.stringify({ before: sites.length, removed: removable.length, after: sourceSites(out).length }));
    if (flag === '--write') fs.writeFileSync(LOOK, out);
  }
}

module.exports = { attach, inPage, sourceSites, classify };
