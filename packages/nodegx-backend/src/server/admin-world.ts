/**
 * `POST /admin/world/migrate` — a changed sentence about the person's world, run on their records.
 *
 * P116 ONT-007 (the route, s11). The body is a plan `@nodegx/project-contract/world`'s
 * `planMigration()` made — data: a backup, `POST /admin/schema` bodies, data moves in the
 * person's words and the checks a dry run reads first. The executor is the backend contract's
 * own (`runMigration`, README §9 R9), the one the conformance specs grade on both engines.
 *
 *   { plan }                                   → the dry run: what it would do, in its own words,
 *                                                what stops it, what it would lose, the rules it moves
 *   { plan, run: true [, acceptLosses] }       → the backup (`POST /admin/backups`' own), the steps,
 *                                                then the permission rules moved and re-said
 *   { …, backupTakenElsewhere: "<where>" }     → on an engine this backend cannot back up (PostgreSQL),
 *                                                the person's word that a backup exists, kept in the audit
 *
 * Admin-only, the same power as `POST /admin/schema` — but not more: a plan cannot rename, drop or
 * delete what the schema route would refuse to (the four fields every record carries, the
 * backend's own account fields, its `_`-tables).
 *
 * The rules (BMG-016): `security.json` keeps rules by collection NAME, so after a rename the rules
 * under the old name protect nothing and the collection falls to `defaults`. They are moved — and
 * every `{ path }` rule's hops re-said — in the running config the moment the steps that renamed
 * have run, so the next request is judged by them. A run that stops part way moves the rules for
 * the steps that ran, never the rest.
 *
 * @module nodegx-backend/server/admin-world
 */

import type { IStorageFacade, MigrationPlanData, MigrationRulesBody, MigrationRun } from '@noodl/backend-contract';
import { dryRunMigration, migrationContextOf, migrationPlanProblems, rulesAfterMigration, runMigration } from '@noodl/backend-contract';

import type { BackupSubsystem } from '../backup/BackupSubsystem';
import { BackupNotFileBackedError } from '../backup/BackupManager';
import type { CollectionRules, SecurityConfig } from '../security/model';
import { onlyWhileSchemaProblems, validateSecurityConfig, type DeclaredTable } from '../security/model';
import type { SecurityState } from '../security/state';
import { isVisibleAccountColumn } from '../users/accountColumns';
import type { RequestContext } from './HttpServer';
import { HttpError, readJSONBody, sendJSON } from './http-util';
import { seriesProblem } from '@noodl/runtime/src/api/adapters/series';

/** The four columns every record carries (byob-admin.ts' `SYSTEM_FIELDS`). */
const SYSTEM_FIELDS: readonly string[] = ['objectId', 'createdAt', 'updatedAt', 'ACL'];

export interface AdminWorldDeps {
  facade: IStorageFacade;
  security: SecurityState;
  /** Absent only in a harness that builds the routes bare: then nothing can be backed up, and nothing runs. */
  backups?: BackupSubsystem;
}

/** What the route answers, run or not. */
export interface WorldMigrateResponse {
  ran: MigrationRun['ran'];
  /** Why it did not run, in words (`ran: false`). */
  why?: string;
  dryRun: MigrationRun['dryRun'];
  /** The plan's steps, as it says them — what the person said yes to. */
  says: string[];
  /** The rules moved and re-said (or, on a dry run, that would be). */
  rules: { moved: Array<{ from: string; to: string }>; rewritten: Array<{ at: string; names: Record<string, string> }> };
  /** The archive the backup wrote, or where the person said theirs is. */
  backup?: { archive: string } | { elsewhere: string };
  steps?: number;
  failed?: { step: number; says: string; message: string };
}

/**
 * What a plan may not touch, in words — the refusals `POST /admin/schema` makes, said once for a
 * whole plan, before anything runs.
 */
export function planTouchesWhatTheSchemaRouteRefuses(plan: MigrationPlanData): string[] {
  const out: string[] = [];
  const own = (t: string) => t.startsWith('_') && t !== '_User';
  for (const [i, s] of plan.steps.entries()) {
    const at = `step ${i + 1} ("${s.says}")`;
    if ('schema' in s) {
      const b = s.schema;
      if (own(b.table)) out.push(`${at} changes "${b.table}", one of the backend's own collections`);
      if (b.action === 'renameTable' && (own(b.newName) || b.newName === '_User')) out.push(`${at} renames a collection to "${b.newName}", a name the backend keeps`);
      if (b.table === '_User' && (b.action === 'renameTable' || b.action === 'deleteTable')) out.push(`${at} renames or deletes the accounts`);
      if (b.table === '_User' && b.action === 'describeTable') out.push(`${at} says again what the accounts are; their words are the backend's`);
      // P116 ONT-015: a series the store could not hand out — refused by the route, so by the plan before the backup.
      const series: Array<{ name: string; type?: string; series?: unknown }> =
        b.action === 'createTable' ? b.columns : b.action === 'addColumn' ? [b.column] : b.action === 'setSeries' ? Object.entries(b.columns).filter(([, v]) => v !== null).map(([name, v]) => ({ name, series: v })) : [];
      for (const c of series) {
        const problem = seriesProblem(c.name, c.series, c.type);
        if (problem) out.push(`${at}: ${problem}`);
      }
      const fields = b.action === 'dropColumn' ? [b.column] : b.action === 'renameColumn' ? [b.oldName] : b.action === 'setRequired' ? Object.keys(b.columns) : [];
      for (const field of fields) {
        if (SYSTEM_FIELDS.includes(field)) out.push(`${at}: "${field}" is set by the backend on every record`);
        else if (b.table === '_User' && (!isVisibleAccountColumn(field) || field === 'username' || field === 'email'))
          out.push(`${at}: "${field}" is one of the backend's own account fields`);
      }
    } else if ('rules' in s) {
      if (s.rules.collection.startsWith('_')) out.push(`${at} puts rules on "${s.rules.collection}", one of the backend's own collections`);
    } else if ('move' in s) {
      const m = s.move;
      const writes = 'linkToRecord' in m ? [m.linkToRecord.record] : 'recordToLink' in m ? [m.recordToLink.into] : [m.fieldAcross.back ? m.fieldAcross.from : m.fieldAcross.to];
      const field = 'fieldAcross' in m ? m.fieldAcross.field : 'recordToLink' in m ? m.recordToLink.field : undefined;
      for (const t of writes) {
        if (own(t)) out.push(`${at} writes into "${t}", one of the backend's own collections`);
        if (t === '_User' && field !== undefined && (!isVisibleAccountColumn(field) || SYSTEM_FIELDS.includes(field)))
          out.push(`${at} writes "${field}", one of the backend's own account fields`);
      }
    }
  }
  return out;
}

const isWords = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** The keys of `onlyWhile` a world writes (ONT-014, ONT-011 step 2): the rest is a person's. */
const WORLD_UPDATE_KEYS = ['frozen', 'except', 'moves'] as const;
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * P116 ONT-014 — `collections` with a world's `rules` steps applied. The world owns the clauses it
 * projects on a collection it makes: `update.frozen` (with `unless`), `update.except`, `update.moves`
 * and `delete` (`"never"`, or a condition). `where`, `except`-less conditions and `says` are the
 * person's, said in the manager or `security.json`, and stay. Pure.
 *
 * **Provenance (s18, the reach review):** a step that carries `was` (what the world said before)
 * lets the route tell the world's own earlier writing from a rule a person wrote by hand on the
 * same collection: a clause equal to `was` is the world's and is replaced; one that differs is the
 * person's and is KEPT, unless the world now says that clause too — then {@link worldRuleLosses}
 * names it and the run waits for `acceptLosses`. A step without `was` (a plan written by hand) is
 * the slot rule: the world's clauses replace what is there.
 */
export function withWorldRules(collections: SecurityConfig['collections'], bodies: MigrationRulesBody[]): SecurityConfig['collections'] {
  const out: SecurityConfig['collections'] = JSON.parse(JSON.stringify(collections));
  for (const { collection, onlyWhile, was, fields, wasFields } of bodies) {
    const entry: CollectionRules = out[collection] ?? {};
    // ONT-011 step 4: who reads one field, per field. The world's earlier rule (equal to `wasFields`)
    // goes; one that differs is the person's and stays, unless the world now says that field too
    // ({@link worldRuleLosses} names it). Without `wasFields` the world's fields are set, nothing removed.
    if (fields !== undefined) {
      const have: Record<string, unknown> = { ...(entry.fields ?? {}) };
      for (const [f, rule] of Object.entries(wasFields ?? {})) if (same(have[f], rule)) delete have[f];
      for (const [f, rule] of Object.entries(fields ?? {})) have[f] = rule;
      if (Object.keys(have).length) entry.fields = have as CollectionRules['fields'];
      else delete entry.fields;
    }
    const ow: NonNullable<CollectionRules['onlyWhile']> = { ...(entry.onlyWhile ?? {}) };
    const update: Record<string, unknown> = { ...(ow.update ?? {}) };
    const worldUpdate = (onlyWhile?.update ?? {}) as Record<string, unknown>;
    const wasUpdate = (was?.update ?? {}) as Record<string, unknown>;
    // Without `was` (a plan written by hand), the slot rule as s17 built it: `frozen` and "never" only.
    const owned: readonly string[] = was === undefined ? ['frozen'] : WORLD_UPDATE_KEYS;
    for (const key of owned) {
      const hand = was !== undefined && key in update && !same(update[key], wasUpdate[key]);
      if (hand && !(key in worldUpdate)) continue; // the person's, and the world says nothing: kept
      delete update[key];
      if (key in worldUpdate) update[key] = worldUpdate[key];
    }
    if (Object.keys(update).length) ow.update = update as NonNullable<CollectionRules['onlyWhile']>['update'];
    else delete ow.update;
    const handDelete = was !== undefined && ow.delete !== undefined && !same(ow.delete, was?.delete);
    if (onlyWhile?.delete !== undefined) ow.delete = onlyWhile.delete;
    else if (!handDelete && (ow.delete === 'never' || (was !== undefined && ow.delete !== undefined))) delete ow.delete;
    if (ow.update || ow.delete) entry.onlyWhile = ow;
    else delete entry.onlyWhile;
    if (Object.keys(entry).length) out[collection] = entry;
    else delete out[collection];
  }
  return out;
}

/**
 * The reach review (ONT-014 AC6): what a world's `rules` steps would take away that a PERSON wrote,
 * said in words. With `was` on the step, a clause is the person's when it differs from what the
 * world said before; it is lost when the world now says that clause differently. Without `was` (a
 * plan written by hand), a `frozen` with `unless` or `says` on a world collection is taken as
 * hand-written, since the hand plans of ONT-007's spec never write those. The route lists these in
 * a dry run and refuses a run that has not accepted them (`acceptLosses`, as for a dropped column's
 * values).
 */
export function worldRuleLosses(collections: SecurityConfig['collections'], bodies: MigrationRulesBody[]): string[] {
  const out: string[] = [];
  const words = (v: unknown): string => JSON.stringify(v);
  // ONT-011 step 4: a field rule the person wrote, on a field the world now says is secret.
  for (const { collection, fields, wasFields } of bodies) {
    const have = (collections[collection]?.fields ?? {}) as Record<string, unknown>;
    for (const [f, rule] of Object.entries(fields ?? {})) {
      if (!(f in have) || same(have[f], rule) || same(have[f], wasFields?.[f])) continue;
      out.push(`"${collection}": who reads "${f}", written by hand (${words(have[f])}), would be replaced by the world's (nobody but the backend's own key: ${words(rule)}) — say it in the world, take it out by hand, or accept the loss`);
    }
  }
  for (const { collection, onlyWhile, was } of bodies) {
    const have = collections[collection]?.onlyWhile;
    if (!have) continue;
    if (was !== undefined) {
      const update = (have.update ?? {}) as Record<string, unknown>;
      const worldUpdate = (onlyWhile?.update ?? {}) as Record<string, unknown>;
      const wasUpdate = (was?.update ?? {}) as Record<string, unknown>;
      for (const key of WORLD_UPDATE_KEYS) {
        if (!(key in update) || same(update[key], wasUpdate[key])) continue; // absent, or the world's own
        if (!(key in worldUpdate) || same(update[key], worldUpdate[key])) continue; // kept, or the same
        out.push(`"${collection}": "${key}" written by hand (${words(update[key])}) would be replaced by the world's (${words(worldUpdate[key])}) — say it in the world, take it out by hand, or accept the loss`);
      }
      if (have.delete !== undefined && !same(have.delete, was?.delete) && onlyWhile?.delete !== undefined && !same(have.delete, onlyWhile.delete))
        out.push(`"${collection}": "delete" written by hand (${words(have.delete)}) would be replaced by the world's (${words(onlyWhile.delete)}) — say it in the world, take it out by hand, or accept the loss`);
      continue;
    }
    const hand = have.update?.frozen;
    if (!hand || (!hand.unless && !hand.says)) continue;
    const world = onlyWhile?.update?.frozen;
    if (world && same(world, hand)) continue;
    const say = (f: { fields: string[] | '*'; unless?: Record<string, unknown>; says?: string }): string =>
      `${f.fields === '*' ? 'the whole record' : f.fields.map((x) => `"${x}"`).join(', ')}${f.unless ? ` unless ${JSON.stringify(f.unless)}` : ''}${f.says ? ` ("${f.says}")` : ''}`;
    out.push(`"${collection}": the frozen rule written by hand (${say(hand)}) would be replaced by the world's (${world ? say(world) : 'none'}) — say it in the world, take it out by hand, or accept the loss`);
  }
  return out;
}

/**
 * P116 ONT-014 AC3 — each collection's declared columns and checks as the plan's schema steps leave
 * them, read lazily over today's schema: what a `moves` rule the migration writes is kept on. A step
 * this does not model (an index, a description, a link's rule) changes neither columns nor checks.
 */
export function tablesAfterPlan(
  steps: MigrationPlanData['steps'],
  tableOf: (collection: string) => DeclaredTable | null | undefined
): (collection: string) => DeclaredTable | undefined {
  const after = new Map<string, DeclaredTable | undefined>();
  const at = (table: string): DeclaredTable | undefined => {
    if (!after.has(table)) {
      const now = tableOf(table);
      after.set(table, now ? { columns: [...(now.columns ?? [])], checks: [...(now.checks ?? [])] } : undefined);
    }
    return after.get(table);
  };
  for (const step of steps) {
    if (!('schema' in step)) continue;
    const s = step.schema;
    // Create-if-absent (`byob-admin.ts`): a table that is there already keeps its columns.
    if (s.action === 'createTable') {
      const inline = (s as { checks?: DeclaredTable['checks'] }).checks;
      const t = at(s.table) ?? { columns: [...s.columns], checks: [] };
      if (inline) t.checks = [...inline]; // the route applies a push's checks either way
      after.set(s.table, t);
    }
    else if (s.action === 'deleteTable') after.set(s.table, undefined);
    else if (s.action === 'renameTable') {
      after.set(s.newName, at(s.table));
      after.set(s.table, undefined);
    } else {
      const t = at(s.table);
      if (!t) continue;
      if (s.action === 'addColumn') t.columns = [...(t.columns ?? []), s.column];
      else if (s.action === 'dropColumn') t.columns = t.columns?.filter((c) => c.name !== s.column);
      else if (s.action === 'renameColumn') t.columns = t.columns?.map((c) => (c.name === s.oldName ? { ...c, name: s.newName } : c));
      else if (s.action === 'setChecks') t.checks = [...s.checks];
    }
  }
  return at;
}

export class AdminWorldRoutes {
  constructor(private readonly deps: AdminWorldDeps) {}

  async migrate(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const problems = migrationPlanProblems(body.plan);
    if (problems.length) throw new HttpError(400, `This is not a plan the migration can run:\n${problems.map((p) => `- ${p}`).join('\n')}`);
    const plan = body.plan as MigrationPlanData;
    const touches = planTouchesWhatTheSchemaRouteRefuses(plan);
    if (touches.length) throw new HttpError(400, `Nothing was changed:\n${touches.map((p) => `- ${p}`).join('\n')}`);

    const { facade, security } = this.deps;
    const sm = facade.schemaManager;
    if (!sm) throw new HttpError(500, 'Schema manager not available');
    // ONT-014: a `rules` step is recorded during the run and written after it, once the rules of a
    // renamed collection have moved to its new name — written during, the move would overwrite it.
    const kept: MigrationRulesBody[] = [];
    const mctx = { ...migrationContextOf(facade), rules: (body: MigrationRulesBody) => void kept.push(body) };
    const worldRules = plan.steps.flatMap((s) => ('rules' in s ? [s.rules] : []));
    // Read before the run, by the names the schema has now: a hop's landing collection is a link's target.
    const targetOf = (collection: string, field: string): string | undefined =>
      sm.getTableSchema(collection)?.columns?.find((c) => c.name === field)?.targetClass;
    const rulesFor = (steps: MigrationPlanData['steps']) => rulesAfterMigration({ steps }, security.config, targetOf);
    const after = rulesFor(plan.steps);
    const says = plan.steps.map((s) => s.says);
    // ONT-014 AC3: a move the world writes, read against the columns and choices the plan leaves.
    const unkeepable = onlyWhileSchemaProblems(withWorldRules(after.collections, worldRules), tablesAfterPlan(plan.steps, (c) => sm.getTableSchema(c)));

    // The reach review: a hand-written rule the world's steps would replace is a loss, said and accepted, never silent.
    const handRules = worldRuleLosses(security.config.collections, worldRules);
    if (body.run !== true) {
      const dryRun = await dryRunMigration(mctx, plan);
      const why = [...plan.refused, ...dryRun.refusals.map((r) => `${r.says} (${r.rows})`), ...after.problems, ...unkeepable, ...(body.acceptLosses === true ? [] : handRules)];
      sendJSON(ctx.res, 200, {
        ran: false,
        ...(why.length ? { why: why.join('; ') } : {}),
        dryRun,
        says,
        rules: { moved: after.moved, rewritten: after.rewritten }
      } satisfies WorldMigrateResponse);
      return;
    }

    // The rules the full run leaves must be a config the backend would start with — checked before
    // anything moves, so a run never ends with rules the validator refuses and nothing saved.
    if (after.problems.length) throw new HttpError(409, `The permission rules cannot be carried, so nothing was changed:\n${after.problems.map((p) => `- ${p}`).join('\n')}`);
    const invalid = validateSecurityConfig({ ...security.config, collections: withWorldRules(after.collections, worldRules) } as SecurityConfig);
    if (!invalid.length) invalid.push(...unkeepable);
    if (invalid.length) throw new HttpError(409, `The permission rules after this migration would be refused:\n${invalid.map((e) => `- ${e}`).join('\n')}`);
    if (handRules.length && body.acceptLosses !== true)
      throw new HttpError(409, `This migration would replace a rule written by hand, so nothing was changed:\n${handRules.map((e) => `- ${e}`).join('\n')}\nRun it again with acceptLosses to let it.`);

    const elsewhere = isWords(body.backupTakenElsewhere) ? body.backupTakenElsewhere.trim() : undefined;
    const backups = this.deps.backups;
    const run = await runMigration(mctx, plan, {
      acceptLosses: body.acceptLosses === true,
      ...(backups
        ? {
            backup: async (): Promise<{ archive: string } | { elsewhere: string }> => {
              try {
                const made = await backups.manager.createBackup({ triggerType: 'manual', source: 'world migration' });
                return { archive: made.archivePath };
              } catch (e) {
                if (!(e instanceof BackupNotFileBackedError)) throw e;
                if (elsewhere) return { elsewhere };
                // Thrown before the first step: nothing has moved.
                throw new HttpError(409, `${e.message} Nothing was changed. Take one with your database's own tooling and say where (backupTakenElsewhere); then the migration runs.`);
              }
            }
          }
        : {})
    });

    // The rules follow what happened: every step that ran, and only those.
    const moved = run.ran === false ? null : rulesFor(plan.steps.slice(0, run.steps));
    if (moved && (moved.moved.length || moved.rewritten.length)) {
      for (const { from } of moved.moved) delete security.config.collections[from];
      Object.assign(security.config.collections, moved.collections);
      security.save();
    }
    if (kept.length) {
      // In place, as the move above writes: the config object is the one every reader holds.
      const collections = security.config.collections;
      const next = withWorldRules(collections, kept);
      for (const name of Object.keys(collections)) if (!(name in next)) delete collections[name];
      Object.assign(collections, next);
      security.save();
    }
    const backup = run.ran === false ? undefined : (run.backup as WorldMigrateResponse['backup']);
    ctx.audit({
      worldMigration: {
        ran: run.ran,
        steps: run.ran === false ? 0 : run.steps,
        ...(backup ? { backup } : {}),
        ...(moved && moved.moved.length ? { rulesMoved: moved.moved } : {}),
        ...(run.ran === 'partly' ? { failed: run.failed } : {})
      }
    });
    const answer: WorldMigrateResponse = {
      ran: run.ran,
      ...(run.ran === false ? { why: run.why } : {}),
      dryRun: run.dryRun,
      says,
      rules: moved ? { moved: moved.moved, rewritten: moved.rewritten } : { moved: [], rewritten: [] },
      ...(backup ? { backup } : {}),
      ...(run.ran === false ? {} : { steps: run.steps }),
      ...(run.ran === 'partly' ? { failed: run.failed } : {})
    };
    // Refused (nothing moved) is the person's to act on; part way is the backend's failure, and the backup undoes it.
    sendJSON(ctx.res, run.ran === true ? 200 : run.ran === false ? 409 : 500, answer);
  }
}
