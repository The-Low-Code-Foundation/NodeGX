// BKO-008 — what one person can reach, row by row (lib/reach.mjs), on a world read once a quarter of a minute: the
// backend limits admin requests. `forget()` after any change to the rules, so the next look is on the new ones.
// Moved from the map's server.

import { analyseProject } from './project.mjs';
import { Refusal } from './rules.mjs';
import { loadWorld, personReach, anonymousReach } from './reach.mjs';

/** `ap`: lib/asperson.mjs `asPerson(be, …)`, the door the runs go through as each person. */
export function makeLens({ be, project, ap }) {
  let worldCache = null;
  async function reachWorld() {
    if (worldCache && Date.now() - worldCache.at < 15_000) return worldCache;
    const world = await loadWorld(be);
    const app = analyseProject(project, world.schema.tables.map((t) => t.name));
    const perms = await be.get('/admin/permissions');
    worldCache = { at: Date.now(), world, app, config: perms.config };
    return worldCache;
  }

  /** One person (an `_User` objectId), or someone not signed in (no id). `emit` hears each step as it happens. */
  async function reachOf(personId, emit = () => {}) {
    const w = await reachWorld();
    if (!personId) {
      const summary = await anonymousReach({ be, app: w.app, world: w.world, config: w.config });
      emit({ type: 'start', person: summary.person, tools: summary.tools, notAllowed: w.app.functions.map((f) => f.name).filter((f) => !summary.tools.includes(f)), readers: [], direct: [] });
      for (const c of summary.changers) emit({ type: 'skip', ...c, writes: w.app.functions.find((f) => f.name === c.fn)?.touches.filter((t) => t.hows.some((h) => h !== 'reads' && h !== 'mentions')).map((t) => t.table) ?? [] });
      emit({ type: 'done', summary });
      return summary;
    }
    const user = w.world.rowsByTable._User.find((u) => u.objectId === personId);
    if (!user) throw new Refusal('No such person in the backend.');
    return personReach({ be, ap, app: w.app, world: w.world, config: w.config, user, emit });
  }

  /** Everyone in turn, and someone not signed in first: how much each reaches. */
  async function everyone(emit = () => {}) {
    const w = await reachWorld();
    const out = [];
    const people = [null, ...w.world.rowsByTable._User.map((u) => u.objectId)];
    for (const id of people) {
      const s = await reachOf(id, () => {});
      const brief = { person: s.person, reachedRows: s.reachedRows, totalRows: s.totalRows, tables: s.tables, tools: s.tools.length, readers: s.readers.length };
      out.push(brief);
      emit({ type: 'person', ...brief });
    }
    emit({ type: 'done' });
    return out;
  }

  return { reachOf, everyone, forget: () => (worldCache = null) };
}
