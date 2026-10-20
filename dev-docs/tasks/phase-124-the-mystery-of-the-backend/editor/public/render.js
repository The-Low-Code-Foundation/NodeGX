// A function's real answer, shown the way a screen shows it: lists of things with their words,
// counts, and plain facts. Never JSON. `needles` are ids to highlight (one row's reach).

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TITLE_KEYS = ['title', 'subject', 'name', 'projectName', 'label', 'displayName', 'email', 'username', 'heading', 'text', 'body', 'conceptId', 'learnerId', 'id'];
const FACT_KEYS = ['kind', 'state', 'status', 'authorRole', 'body', 'at', 'when', 'dueAt', 'endsOn', 'completedAt', 'count', 'unread', 'version', 'position'];
const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

export function words(key) {
  const s = String(key).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function scalar(v) {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  if (typeof v === 'string' && ISO.test(v)) {
    const d = new Date(v);
    if (!isNaN(d)) return v.length > 10 ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  }
  const s = String(v);
  return s.length > 220 ? s.slice(0, 220) + '…' : s;
}

const isScalar = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);
const has = (v, needles) => needles.length && needles.some((n) => JSON.stringify(v ?? null).includes(n));

function titleOf(o) {
  for (const k of TITLE_KEYS) if (typeof o[k] === 'string' && o[k].trim()) return [k, o[k]];
  return [null, null];
}

function item(o, needles, depth) {
  if (isScalar(o)) return `<li class="ans-item">${esc(scalar(o))}</li>`;
  const [tk, title] = titleOf(o);
  const facts = [];
  for (const k of FACT_KEYS) if (k !== tk && isScalar(o[k]) && o[k] !== null && o[k] !== '') facts.push(k === 'body' ? `“${esc(scalar(o[k]))}”` : `${esc(words(k).toLowerCase())}: <b>${esc(scalar(o[k]))}</b>`);
  const nested = Object.entries(o).filter(([, v]) => v && typeof v === 'object' && (Array.isArray(v) ? v.length : Object.keys(v).length));
  const hot = has(o, needles);
  return `<li class="ans-item ${hot ? 'hot' : ''}"><div class="ans-title">${esc(scalar(title ?? '(untitled)'))}</div>${facts.length ? `<div class="ans-facts">${facts.join(' · ')}</div>` : ''}${
    depth < 2 && nested.length ? nested.map(([k, v]) => `<div class="ans-sub"><span class="ans-key">${esc(words(k))}</span>${value(v, needles, depth + 1)}</div>`).join('') : ''
  }</li>`;
}

function list(arr, needles, depth) {
  if (!arr.length) return '<span class="ans-none">none</span>';
  if (arr.every(isScalar)) return `<div class="chips">${arr.slice(0, 40).map((v) => `<span class="chip ${has(v, needles) ? 'hot' : ''}">${esc(scalar(v))}</span>`).join('')}${arr.length > 40 ? ` <span class="ans-none">and ${arr.length - 40} more</span>` : ''}</div>`;
  const kinds = {};
  for (const o of arr) if (o && typeof o.kind === 'string') kinds[o.kind] = (kinds[o.kind] ?? 0) + 1;
  const kindLine = Object.keys(kinds).length > 1 ? ` <span class="ans-none">(${Object.entries(kinds).map(([k, n]) => `${n} ${esc(k)}${n === 1 ? '' : 's'}`).join(', ')})</span>` : '';
  const max = depth === 0 ? 40 : 15;
  return `<div class="ans-count">${arr.length} ${arr.length === 1 ? 'thing' : 'things'}${kindLine}</div><ul class="ans-list">${arr.slice(0, max).map((o) => item(o, needles, depth)).join('')}</ul>${arr.length > max ? `<div class="ans-none">and ${arr.length - max} more</div>` : ''}`;
}

function object(o, needles, depth) {
  const entries = Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (!entries.length) return '<span class="ans-none">nothing</span>';
  const scalars = entries.filter(([, v]) => isScalar(v));
  const deeper = entries.filter(([, v]) => !isScalar(v));
  return `${scalars.length ? `<dl class="ans-dl">${scalars.map(([k, v]) => `<dt>${esc(words(k))}</dt><dd class="${has(v, needles) ? 'hot' : ''}">${esc(scalar(v))}</dd>`).join('')}</dl>` : ''}${
    depth < 3 ? deeper.map(([k, v]) => `<div class="ans-sub"><span class="ans-key">${esc(words(k))}</span>${value(v, needles, depth + 1)}</div>`).join('') : deeper.length ? '<span class="ans-none">more inside</span>' : ''
  }`;
}

export function value(v, needles = [], depth = 0) {
  if (v === null || v === undefined) return '<span class="ans-none">nothing</span>';
  if (isScalar(v)) return `<span class="${has(v, needles) ? 'hot' : ''}">${esc(scalar(v))}</span>`;
  if (Array.isArray(v)) return list(v, needles, depth);
  // { rows: [ … ] } is how these functions hand back a list
  const keys = Object.keys(v);
  if (keys.length === 1 && Array.isArray(v[keys[0]])) {
    const only = v[keys[0]];
    if (only.length === 1 && only[0] && typeof only[0] === 'object') return object(only[0], needles, depth);
    return list(only, needles, depth);
  }
  return object(v, needles, depth);
}

/** The row itself, in words. */
export function row(r) {
  const skip = new Set(['ACL']);
  return `<dl class="ans-dl">${Object.entries(r)
    .filter(([k, v]) => !skip.has(k) && v !== null && v !== '')
    .map(([k, v]) => `<dt>${esc(words(k))}</dt><dd>${isScalar(v) ? esc(scalar(v)) : value(v, [], 2)}</dd>`)
    .join('')}</dl>`;
}
