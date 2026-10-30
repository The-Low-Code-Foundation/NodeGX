// BKO-008 — what's in the backend and the app together, read once: the tables (the backend's, and the ones only the
// project has), the rules in both places, the groups, the people, the functions and what they touch, the triggers, the
// last few things the backend did. Moved from the map's server, where it was `buildMap`; the map adds only its look.

import { analyseProject, tableLinks, projectTables } from './project.mjs';
import { BackendError } from './backend.mjs';
import { readSecurityFile, Refusal, SECURITY_FILE } from './rules.mjs';
import { triggerFlows, readAutomationsFile, AUTOMATIONS_FILE } from './triggers.mjs';
import { personColumns, personKeys, idOf } from './people.mjs';

/** The backend's groups, plus any group the backend's rules or the app's rules file names that has no members yet. */
export function rolesIn(backendRoles, ...configs) {
  const out = backendRoles.map((r) => ({ name: r.name, members: r.users.length }));
  const named = new Set();
  for (const config of configs) JSON.stringify(config ?? {}, (k, v) => (typeof v === 'string' && v.startsWith('role:') && named.add(v.slice(5)), v));
  for (const n of named) if (!out.some((r) => r.name === n)) out.push({ name: n, members: 0 });
  return out;
}

/**
 * Everything an editor draws, from the running backend (`be`, lib/backend.mjs) and the app's folder (`project`,
 * lib/project.mjs `openProject`). Each source fails alone and `problems` says which (BKO-003).
 */
export async function readFacts({ be, project, folder = null }) {
  const health = await be.health();
  if (!health) throw new BackendError(0, `The backend at ${be.base} isn’t answering. Is it running?`);
  const problems = [];
  const ask = (what, p, fallback) => p.catch((e) => (problems.push({ what, words: e.message }), fallback));
  const [schema, perms, fnPerms, roles, users, triggers, workflows, audit] = await Promise.all([
    ask('tables', be.get('/admin/schema'), { tables: [] }),
    ask('rules', be.getWithHeaders('/admin/permissions'), { json: { config: {}, etag: null } }),
    ask('functions', be.get('/admin/permissions/functions'), { functions: [] }),
    ask('groups', be.get('/admin/roles'), { roles: [] }),
    ask('people', be.get('/admin/users?limit=200'), { users: [], total: null }),
    be.get('/admin/triggers').catch(() => ({ triggers: [] })),
    be.get('/admin/workflow-defs').catch(() => ({ workflows: [] })),
    be.get('/admin/audit?limit=12').catch(() => ({ entries: [] }))
  ]);
  const counts = await Promise.all(
    schema.tables.map((t) =>
      be.get(`/api/${encodeURIComponent(t.name)}?count=1&limit=0`).then((r) => r.count ?? null, () => null)
    )
  );
  const tableNames = schema.tables.map((t) => t.name);
  const app = analyseProject(project, tableNames);
  const file = readSecurityFile(project.files);
  const config = perms.json.config ?? {};
  const deployed = Object.fromEntries(fnPerms.functions.map((f) => [f.name, f]));
  // A table the project has and the backend doesn't (yet): drawn, and said so.
  const onBackend = new Set(tableNames);
  const missing = [...projectTables(project, file.config, app)].filter(([name]) => !onBackend.has(name));
  const declared = missing.map(([name, t]) => ({ name, columns: t.columns ?? [], indexes: [] }));
  const column = (c) => ({ name: c.name, type: c.type, ...(c.targetClass ? { targetClass: c.targetClass } : {}) });
  return {
    app: { name: app.name, folder },
    backend: { name: health.backendName, url: be.base, enforced: !!health.security?.enforced, devOpen: !!health.security?.devOpen },
    problems,
    tables: [
      ...schema.tables.map((t, i) => ({
        name: t.name,
        rows: t.name === '_User' ? users.total ?? users.users.length : counts[i],
        columns: t.columns.map(column),
        keys: (t.indexes || []).filter((x) => x.unique).map((x) => x.fields),
        people: personColumns(t)
      })),
      ...missing.map(([name, t]) => ({ name, rows: null, columns: (t.columns ?? []).map(column), keys: [], people: personColumns({ columns: t.columns ?? [] }), notOnBackend: true, from: t.from }))
    ],
    links: tableLinks([...schema.tables, ...declared]),
    personKeys: [...personKeys(schema.tables)],
    functions: app.functions.map((f) => ({
      ...f,
      deployed: !!deployed[f.name]?.deployed,
      call: deployed[f.name]?.call ?? config.functions?.[f.name]?.call ?? null,
      rateLimit: deployed[f.name]?.effectiveRateLimit ?? null
    })),
    helpers: app.helpers,
    screens: app.screens,
    calls: app.calls,
    uses: app.uses,
    config: { defaults: config.defaults, collections: config.collections ?? {}, functions: config.functions ?? {}, files: config.files, signup: config.signup },
    fileCollections: file.config?.collections ?? {},
    etag: perms.json.etag,
    fileStamp: file.stamp,
    securityFile: SECURITY_FILE,
    roles: rolesIn(roles.roles, config, file.config),
    people: problems.some((p) => p.what === 'people') ? null : users.total ?? users.users.length,
    // BKO-005: what the backend starts by itself, from the backend and the project's automations file
    triggers: triggerFlows({ backend: triggers.triggers ?? [], workflows: workflows.workflows ?? [], file: readAutomationsFile(project.files), functions: app.functions.map((f) => f.name) }),
    automationsStamp: project.files.stamp(AUTOMATIONS_FILE),
    audit: (audit.entries ?? []).map((e) => ({ at: e.at, action: e.action, outcome: e.outcome, target: e.target }))
  };
}

/** A table's rows, each with a short label in words and its plain values, for an explorer. */
export async function tableRows(be, table) {
  const schema = await be.get('/admin/schema');
  const t = schema.tables.find((x) => x.name === table);
  if (!t) throw new Refusal('No such table.');
  const results = table === '_User' ? (await be.get('/admin/users?limit=500')).users : (await be.get(`/api/${encodeURIComponent(table)}?limit=500`)).results;
  const keys = (t.indexes ?? []).filter((i) => i.unique && i.fields.length === 1).map((i) => i.fields[0]);
  const words = ['subject', 'title', 'name', 'projectName', 'label', 'email', 'username', 'body', 'content'];
  // BKO-003: an app whose rows have none of those words is labelled by its first text column
  const firstText = t.columns.find((c) => c.type === 'String' && !/Id$|^(ACL|owner|objectId)$/.test(c.name) && !words.includes(c.name))?.name;
  const people = personColumns(t).map((c) => c.name);
  return results.map((r) => {
    const w = [...words, firstText].map((k) => k && r[k]).find((v) => typeof v === 'string' && v.trim());
    // a row told apart only by several columns together reads as those values: "l-marie · what-the-web-is"
    const multi = (t.indexes ?? []).find((i) => i.unique && i.fields.length > 1);
    const key = keys.map((k) => r[k]).find((v) => typeof v === 'string') ?? (multi ? multi.fields.map((f) => r[f]).filter((v) => v !== null && v !== undefined).join(' · ') : undefined);
    const owner = people.map((k) => idOf(r[k])).find(Boolean);
    const cells = {};
    for (const c of t.columns) {
      const v = r[c.name];
      if (c.name === 'ACL' || /password|token|secret/i.test(c.name)) continue;
      cells[c.name] = v === null || v === undefined ? null : typeof v === 'object' ? JSON.stringify(v).slice(0, 120) : String(v).slice(0, 160);
    }
    return { objectId: r.objectId, label: w ? w.slice(0, 80) : key ?? r.objectId, key: key ?? null, owner: owner ?? null, cells };
  });
}
