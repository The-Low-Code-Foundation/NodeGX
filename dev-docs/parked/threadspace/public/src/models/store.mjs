// Where a saved design lives. Run with `npm start`, the shipyard posts it to the server, which writes
// `public/ships/<id>.json`. The static copy on nodegx.io (`tools/build-static.mjs` marks its pages `<html data-static>`)
// has no server to post to, so the design is kept in this browser instead, under one key per ship, and read before
// the shipped file.

export const STATIC = document.documentElement.hasAttribute('data-static');
const KEY = (id) => `threadspace-design-${id}`;

/** The saved values for a ship, or {} when nothing was saved. */
export async function readDesign(id) {
  if (STATIC) {
    try {
      const kept = localStorage.getItem(KEY(id));
      if (kept) return JSON.parse(kept).values ?? {};
    } catch {}
  }
  try {
    const r = await fetch(`/ships/${id}.json`, { cache: 'no-store' });
    if (!r.ok) return {};
    return (await r.json()).values ?? {};
  } catch {
    return {};
  }
}

/** Saves the values that differ from the defaults. Resolves to { ok, error? }. */
export async function writeDesign(id, values) {
  if (STATIC) {
    try {
      localStorage.setItem(KEY(id), JSON.stringify({ values, savedAt: new Date().toISOString() }));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `this browser would not keep it (${e.message})` };
    }
  }
  const r = await fetch(`/api/design/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ values }) });
  if (r.status === 404) throw new Error('the game’s server predates the shipyard. Stop `npm start` and start it again');
  return r.json();
}

/** Where a save goes, in words for the shipyard's status line. */
export const SAVED_IN = (id) => (STATIC ? 'this browser' : `public/ships/${id}.json`);
