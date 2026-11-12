/**
 * P115 HST-014 — a project's collections, rules and roles, applied to its RUNNING backend through the admin API.
 *
 * The spike's `seed-campus.mjs` booted the backend FRESH to give it the project's rules: every record, account and file
 * went with it. A deploy must never do that (HST-014 AC2). So the project reaches a backend that keeps everything it
 * has, the way the MCP's own tools reach a local one: P127 R1, *the project's files are the truth, the backend a copy
 * loaded from them*, applied additively.
 *
 *   1. collections  `metadata.dbCollections` → `POST /admin/schema/apply`, as the UNION of the project and the
 *                   backend: a table or column the backend has and the project lacks is kept (and named), a column
 *                   whose type differs keeps the backend's (and is named). Never destructive, so never refused for it.
 *                   First, because a rule is read against the schema it is kept on (ONT-014).
 *   2. rules        `nodegx.security.json` → `PUT /admin/permissions`, when it differs from what the backend enforces.
 *   3. roles        on a FIRST deploy only, each role the rules name (`role:owner`) that the backend lacks is made
 *                   (`POST /admin/roles`). Not on a later one: a role the owner deleted on purpose must not come back
 *                   (the reason P127 BKO-006 did not make a backend create them at every start).
 *
 * Who belongs to a role, the records, the accounts and the files are data, and are never touched here.
 *
 * Transport-free (`AdminCall`), so jest runs it against a real `BackendService` in Node.
 */
import { namedRoles } from '../src/admin/app/roleUses';

export interface AdminAnswer {
  status: number;
  json: unknown;
  text: string;
}
export type AdminCall = (method: string, path: string, body?: unknown) => Promise<AdminAnswer>;

export interface ProjectColumn {
  name: string;
  type?: string;
  [k: string]: unknown;
}
export interface ProjectCollection {
  name: string;
  columns?: ProjectColumn[];
  indexes?: unknown[];
  checks?: unknown[];
}

export interface ProjectBackendState {
  /** `nodegx.security.json`, parsed, or null when the project has none. */
  policy: Record<string, unknown> | null;
  /** `nodegx.project.json` → `metadata.dbCollections`. */
  collections: ProjectCollection[];
}

export interface ApplyReport {
  /** One sentence per thing done or kept, in order, for the person. */
  lines: string[];
  rulesChanged: boolean;
  rolesMade: string[];
  tablesAdded: string[];
  columnsAdded: string[];
  /** What the backend has that the project does not say, kept. */
  kept: string[];
}

export class ApplyError extends Error {}

async function must(call: AdminCall, method: string, path: string, body?: unknown): Promise<AdminAnswer> {
  const answer = await call(method, path, body);
  if (answer.status >= 300) {
    const said = (answer.json as { error?: string } | null)?.error ?? answer.text.slice(0, 600);
    throw new ApplyError(`${method} /${path.replace(/^\//, '')} answered ${answer.status}: ${said}`);
  }
  return answer;
}

/** A collection the person declares: system tables (`_User`, `_Role` …) are the backend's own. */
const declared = (c: ProjectCollection) => !!c.name && !c.name.startsWith('_');

/** Key order does not make two rule sets different. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

interface LiveTable {
  name: string;
  columns?: Array<{ name: string; type?: string }>;
}

async function applyCollections(call: AdminCall, collections: ProjectCollection[], report: ApplyReport): Promise<void> {
  const mine = collections.filter(declared);
  const live = (((await must(call, 'GET', '/admin/schema')).json as { tables?: LiveTable[] })?.tables ?? []).filter(
    (t) => t.name && !t.name.startsWith('_')
  );
  const liveByName = new Map(live.map((t) => [t.name, t]));
  const tables: Array<Record<string, unknown>> = [];

  for (const c of mine) {
    const there = liveByName.get(c.name);
    const columns: ProjectColumn[] = [...(there?.columns ?? [])];
    const have = new Map(columns.map((col) => [col.name, col]));
    for (const col of c.columns ?? []) {
      const theirs = have.get(col.name);
      if (!theirs) columns.push(col);
      else if (theirs.type && col.type && theirs.type !== col.type) {
        report.kept.push(`${c.name}.${col.name} stays ${theirs.type} on the backend (the project says ${col.type})`);
      }
    }
    for (const col of there?.columns ?? []) {
      if (!(c.columns ?? []).some((p) => p.name === col.name) && !SYSTEM_COLUMNS.has(col.name)) {
        report.kept.push(`${c.name}.${col.name} (on the backend, not in the project)`);
      }
    }
    tables.push({ name: c.name, columns, ...(c.indexes ? { indexes: c.indexes } : {}), ...(c.checks ? { checks: c.checks } : {}) });
  }
  // A collection the backend declares and the project does not: asked of the backend's OWN diff, which reads its
  // declared collections. `GET /admin/schema` lists every table in the database, and on a Worker the execution
  // history's tables share it (`nodeSqlite.ts`): sending those back declared them as the app's collections (s12).
  const diff = (await must(call, 'POST', '/admin/schema/diff', { source: { tables } })).json as {
    diff?: { tables?: { removed?: string[] } };
  };
  for (const name of diff?.diff?.tables?.removed ?? []) {
    tables.push({ name, columns: liveByName.get(name)?.columns ?? [] });
    report.kept.push(`${name} (a collection on the backend, not in the project)`);
  }
  if (!tables.length) return;

  const applied = (await must(call, 'POST', '/admin/schema/apply', { source: { tables }, allowDestructive: false })).json as {
    result?: { appliedTables?: string[]; appliedColumns?: string[]; skipped?: string[] };
  };
  const result = applied?.result ?? {};
  report.tablesAdded.push(...(result.appliedTables ?? []));
  report.columnsAdded.push(...(result.appliedColumns ?? []));
  if (report.tablesAdded.length) report.lines.push(`Collections made: ${report.tablesAdded.join(', ')}.`);
  if (report.columnsAdded.length) report.lines.push(`Columns added: ${report.columnsAdded.join(', ')}.`);
  if (!report.tablesAdded.length && !report.columnsAdded.length) {
    report.lines.push(`Collections: the backend already has every one the project declares (${mine.map((c) => c.name).join(', ') || 'none'}).`);
  }
  for (const s of result.skipped ?? []) report.lines.push(`Not applied: ${s}.`);
}

/** The columns every record has; never "kept" news. */
const SYSTEM_COLUMNS = new Set(['objectId', 'createdAt', 'updatedAt', 'ACL', '_rperm', '_wperm']);

async function applyRules(call: AdminCall, policy: Record<string, unknown> | null, report: ApplyReport): Promise<void> {
  if (!policy) {
    report.lines.push('Rules: the project has no nodegx.security.json, so the backend keeps the rules it has.');
    return;
  }
  const current = ((await must(call, 'GET', '/admin/permissions')).json as { config?: unknown })?.config;
  if (canonical(current) === canonical(policy)) {
    report.lines.push('Rules: the backend already enforces nodegx.security.json.');
    return;
  }
  await must(call, 'PUT', '/admin/permissions', policy);
  report.rulesChanged = true;
  report.lines.push('Rules: set from nodegx.security.json.');
}

async function applyRoles(call: AdminCall, policy: Record<string, unknown> | null, firstDeploy: boolean, report: ApplyReport): Promise<void> {
  const named = namedRoles(policy as never);
  if (!named.length) return;
  const answer = (await must(call, 'GET', '/admin/roles')).json as { roles?: Array<{ name: string }> } | Array<{ name: string }>;
  const roles = Array.isArray(answer) ? answer : answer?.roles ?? [];
  const missing = named.filter((n) => !roles.some((r) => r.name === n));
  if (!missing.length) return;
  if (!firstDeploy) {
    report.lines.push(
      `Roles the rules name but the backend lacks: ${missing.join(', ')}. Not made on a redeploy (one may have been ` +
        `deleted on purpose): make it on the backend's Roles page, or deploy with --make-roles.`
    );
    return;
  }
  for (const name of missing) {
    await must(call, 'POST', '/admin/roles', { name });
    report.rolesMade.push(name);
  }
  report.lines.push(`Roles made (the rules name them): ${report.rolesMade.join(', ')}. Who is in each is yours to say.`);
}

export async function applyProject(
  call: AdminCall,
  project: ProjectBackendState,
  options: { firstDeploy: boolean }
): Promise<ApplyReport> {
  const report: ApplyReport = { lines: [], rulesChanged: false, rolesMade: [], tablesAdded: [], columnsAdded: [], kept: [] };
  await applyCollections(call, project.collections, report);
  await applyRules(call, project.policy, report);
  await applyRoles(call, project.policy, options.firstDeploy, report);
  if (report.kept.length) report.lines.push(`Kept on the backend: ${report.kept.join('; ')}.`);
  return report;
}
