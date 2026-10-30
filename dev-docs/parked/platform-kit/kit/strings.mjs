// Words a player reads live in strings/<language>.json, never in the code: { "grit": "Grit", "welcome": "…" }.
// loadStrings() once at start; then strings.grit, or say('found', { n: 3 }) for "Found {n} cans".
export const strings = {};

export async function loadStrings(language = 'en') {
  const r = await fetch(`strings/${language}.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`strings/${language}.json: HTTP ${r.status}`);
  Object.assign(strings, await r.json());
  return strings;
}

/** A string with its {placeholders} filled. A missing key shows as ⟨key⟩, so it is seen, not hidden. */
export function say(key, values = {}) {
  const s = strings[key];
  if (s === undefined) return `⟨${key}⟩`;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(values[k] ?? `{${k}}`));
}
