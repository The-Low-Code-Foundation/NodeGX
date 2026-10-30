// BKO-008 — what ran just now: the backend's run list (`GET /executions`), each run said with who made it. A run this
// editor made as a person (lib/asperson.mjs, `mine`) says that person; a run through the MCP door names the key the
// audit gives for its request id. Moved from the map's server.

import { KEY_SUFFIX } from './asperson.mjs';

/** `mine`: request id → { person, key }, the runs this editor made (the same Map given to `asPerson`). */
export function makeRuns({ be, mine = new Map() }) {
  const keyActors = new Map(); // request id → the key that made a run, from the audit
  return async function runs(since) {
    const q = new URLSearchParams({ limit: '60', offset: '0' });
    if (since) q.set('since', String(since));
    const { json, headers } = await be.getWithHeaders(`/executions?${q}`);
    // A run through the MCP door was made with a key: the audit names the key, by the run's request id.
    const viaKey = json.filter((r) => /\/mcp/.test(r.metadata?.triggerSource ?? '') && !keyActors.has(r.metadata?.requestId));
    if (viaKey.length) {
      const audit = await be.get('/admin/audit?action=mcp.tool.call&limit=200').catch(() => ({ entries: [] }));
      for (const e of audit.entries ?? []) if (e.requestId) keyActors.set(e.requestId, e.actor);
    }
    return {
      total: Number(headers.get('x-total-count') ?? json.length),
      runs: json.map((r) => {
        const rid = r.metadata?.requestId;
        const ours = rid && mine.get(rid);
        const actor = rid && keyActors.get(rid);
        return {
          id: r.id,
          name: r.workflowId,
          kind: r.kind,
          status: r.status,
          startedAt: r.startedAt,
          durationMs: r.durationMs,
          errorMessage: r.errorMessage ?? null,
          byMap: ours ? { person: ours.person, key: ours.key } : actor && actor.endsWith(KEY_SUFFIX) ? { person: null, key: actor } : null,
          byKey: actor && !actor.endsWith(KEY_SUFFIX) ? actor : null
        };
      })
    };
  };
}
