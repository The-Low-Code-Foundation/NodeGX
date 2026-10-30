// The owner's changes, as files: design/<kind>/<id>.json = { values, savedAt }, holding only what differs from the
// declaration. Knob groups are kind "knobs" (design/knobs/<group>.json); anything else that keeps a person's choices
// (one dweller's look, one room's layout) picks its own kind. tools/serve.mjs writes the files; the browser keeps
// nothing. `?design=default` in the page's address ignores every file (see the game as declared).
import { registry } from './registry.mjs';

const declared = typeof location !== 'undefined' && new URLSearchParams(location.search).get('design') === 'default';

/** The values saved for one thing, or {} (no file, or ?design=default). */
export async function readDesign(kind, id) {
  if (declared) return {};
  try {
    const r = await fetch(`design/${kind}/${id}.json`, { cache: 'no-store' });
    return r.ok ? ((await r.json()).values ?? {}) : {};
  } catch {
    return {};
  }
}

/** Writes one thing's values (only what differs from its declaration; {} removes the file). */
export async function writeDesign(kind, id, values) {
  const r = await fetch(`__design/${kind}/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) });
  const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
  if (!j.ok) throw new Error(`saving design/${kind}/${id}.json: ${j.error}`);
  return j.file;
}

/** Applies every knob group's saved file. Call once after the game's modules have loaded, before building. */
export async function loadDesigns() {
  const loaded = [];
  await Promise.all(
    [...registry.knobs].map(async ([group, k]) => {
      const values = await readDesign('knobs', group);
      if (Object.keys(values).length) loaded.push(group);
      k.load(values);
    })
  );
  return loaded;
}

/** Saves one knob group's changes to its file. */
export const saveKnobs = (group) => writeDesign('knobs', group, registry.knobs.get(group).changes());

/** Reads every file again (someone saved while the game was open): changed knobs tell their listeners, models refit. */
export const reloadDesigns = loadDesigns;

/** The round-trip check: every knob group's file, read back, resolves to what the group holds now. */
export async function roundTrip() {
  const bad = [];
  for (const [group, k] of registry.knobs) {
    const file = await readDesign('knobs', group);
    const now = k.changes();
    if (JSON.stringify(sorted(file)) !== JSON.stringify(sorted(now))) bad.push(`design/knobs/${group}.json holds ${JSON.stringify(file)}, the game holds ${JSON.stringify(now)}`);
  }
  return bad;
}
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

if (typeof window !== 'undefined') window.__play = Object.assign(window.__play ?? {}, { roundTrip, loadDesigns, saveKnobs });
