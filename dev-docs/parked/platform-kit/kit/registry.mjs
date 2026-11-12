// The registry: every knob group, model, place and shelf registers itself here when its module loads, so the game can
// print what it is made of (`node tools/what.mjs`, or `__play.what()` in the page's console). Nothing reads the code
// to make this page: what is not registered is not on it.
import { show } from './knobs.mjs';

export const registry = { knobs: new Map(), models: new Map(), places: new Map(), shelves: new Map() };

export function register(kind, id, entry) {
  const book = registry[kind];
  if (!book) throw new Error(`registry: no kind "${kind}"`);
  if (book.has(id) && book.get(id) !== entry) throw new Error(`registry: two ${kind} called "${id}"`);
  book.set(id, entry);
  return entry;
}

const line = (decl, values) =>
  Object.entries(decl)
    .map(([k, s]) => `${s.label ?? k} ${show(s, values[k])}${s.type === 'number' || s.type === 'int' ? ` (${s.min}–${s.max})` : ''}`)
    .join(' · ');

// The page, as text: one block per kind, one line per thing, its changed values counted.
export function what() {
  const out = [];
  const changed = (n) => (n ? ` · ${n} changed from the declaration` : '');
  out.push('KNOBS');
  for (const [group, k] of registry.knobs) out.push(`  ${group.padEnd(18)} ${line(k.decl, k.values)}${changed(Object.keys(k.changes()).length)}`);
  out.push('MODELS');
  for (const [id, m] of registry.models) {
    out.push(`  ${id.padEnd(18)} ${m.help ?? ''}`.trimEnd());
    out.push(`  ${''.padEnd(18)} parts: ${Object.keys(m.parts).join(' · ')}`);
    if (m.knobs) out.push(`  ${''.padEnd(18)} knobs: ${m.knobs.$.group}`);
  }
  out.push('PLACES');
  for (const [id, p] of registry.places) out.push(`  ${id.padEnd(18)} ${p.label ?? ''}${p.size ? ` (${p.size[0]} × ${p.size[1]} m)` : ''} · spawns: ${Object.keys(p.spawns ?? {}).join(', ') || 'none'} · drive: ${p.drive}`);
  out.push('SHELVES');
  for (const [id, s] of registry.shelves) out.push(`  ${id.padEnd(18)} ${s.summary}`);
  return out.join('\n');
}

// What the checker reads in the page (tools/check.mjs): the counts, and every declaration as data.
export function census() {
  return {
    knobs: [...registry.knobs].map(([g, k]) => ({ group: g, decl: k.decl, values: k.values, changes: k.changes() })),
    models: [...registry.models].map(([id, m]) => ({ id, parts: Object.keys(m.parts), knobs: m.knobs?.$.group ?? null })),
    places: [...registry.places].map(([id, p]) => ({ id, drive: p.drive, spawns: Object.keys(p.spawns ?? {}) })),
    shelves: [...registry.shelves.keys()]
  };
}

if (typeof window !== 'undefined') window.__play = Object.assign(window.__play ?? {}, { registry, what, census });
