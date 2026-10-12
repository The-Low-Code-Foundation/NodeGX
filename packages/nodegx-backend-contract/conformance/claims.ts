/**
 * Claims — a schema made from someone's words, and the sentences it must keep.
 *
 * P116 ONT-003. A person says what their world is ("a member is on an account, from the day
 * they join"); `@nodegx/project-contract/world` projects that to a schema in this contract's
 * neutral terms and writes each answer as a claim: steps in the data plane, and which of them
 * says the rule. This module applies the schema through the schema surface (never SQL) and
 * runs the steps, so the same claims grade every adapter.
 *
 * It names no world and imports nothing from the project contract: a claim is data. The
 * shapes below are the projection's own, restated structurally; `nodegx-backend`'s ONT-003
 * spec assigns one to the other, so the two cannot drift without a compile error.
 *
 * ## Three ways to grade a claim
 *
 * - **held** — the store keeps the rule: every step must pass.
 * - **not held** — the projection says the store does not keep it (a link's target deleted,
 *   a field set once). It must fail, and **at a step that says the rule** — a claim that
 *   failed while making its rows measured nothing. A not-held claim that passes means the
 *   label is wrong: the store keeps it, and the projection should say so.
 * - **on its mutant** — the schema with the claim's one rule taken out. Must fail at a step
 *   that says the rule; one that still passes grades nothing (the default equals the test
 *   value).
 *
 * @module conformance/claims
 */

import type { OnlyWhileRule, StorageAclOption, StorageCheckDecl, StorageColumn, StorageIndexDecl } from '../src/storage';

import { AdapterRefusal, ConformanceError, type ConformanceContext, type Row } from './context';
import type { ConformanceCase } from './index';

/** A column as a projected schema carries it: the storage column plus what the schema API also takes. */
export interface ClaimColumn extends StorageColumn {
  required?: boolean;
  description?: string;
}

export interface ClaimCollection {
  name: string;
  columns: ClaimColumn[];
  checks: StorageCheckDecl[];
  indexes: StorageIndexDecl[];
  /**
   * P116 ONT-014 — the collection's rules on a record's old values (`security.json` `onlyWhile`).
   * Not the adapter's to keep: the backend's facade keeps them, for a caller the row ACL binds. So
   * a claim's `byPerson` change and remove steps on this collection carry them as DATA in a write ACL
   * (`StorageAclOption.onlyWhile`), and an adapter that is not behind the facade ignores them —
   * the claim then fails, which is the truth about that adapter.
   */
  onlyWhile?: { update?: OnlyWhileRule; delete?: OnlyWhileRule | 'never' };
  /**
   * P116 ONT-011 step 4 — who reads one field (`security.json` `collections.<c>.fields`, R-a). Kept
   * by the backend's facade, like `onlyWhile`: a claim's `unseen` step reads as a person signed in
   * with no role, and hands the fields such a person may not read over as DATA in the read ACL
   * (`StorageAclOption.hidden`). A rule that names a role or a path hides the field too — the
   * claim's reader holds no role and reaches no row.
   */
  fields?: Record<string, { read: unknown }>;
}

export interface ClaimSchema {
  collections: ClaimCollection[];
}

export type ClaimValue = string | number | boolean | { ref: string } | { date: string };
export type ClaimData = Record<string, ClaimValue>;

export type ClaimStep =
  | { make: string; as: string; data: ClaimData }
  | { refuse: string; data: ClaimData }
  | { change: string; row: string; data: ClaimData; refused?: true; byPerson?: true }
  | { remove: string; row: string; refused?: true; byPerson?: true }
  | { pair: string; row: string; field: string; with: string }
  | { paired: string; row: string; field: string; count: number }
  | { gone: string; row: string }
  | { empty: string; row: string; field: string }
  /** P116 ONT-006: the row is still there */
  | { there: string; row: string }
  /** P116 ONT-006: the row is there and the field holds exactly `value` */
  | { holds: string; row: string; field: string; value: ClaimValue }
  /** P116 ONT-011 step 4: a person signed in with no role reads the row, and it comes back without the field */
  | { unseen: string; row: string; field: string }
  /**
   * P116 ONT-015: each row holds a value in the field (the store gave it one), and no two hold the
   * same. A row removed since is read as an earlier `numbered` step saw it: a number never comes back.
   */
  | { numbered: string; field: string; rows: string[] };

export interface Claim {
  id: string;
  says: string;
  held: boolean;
  steps: ClaimStep[];
}

/** Whether a step is one that says the rule, rather than one that makes the rows it needs. */
export function saysTheRule(step: ClaimStep): boolean {
  if ('refuse' in step || 'paired' in step || 'gone' in step || 'empty' in step || 'there' in step || 'holds' in step || 'unseen' in step || 'numbered' in step) return true;
  if ('change' in step || 'remove' in step) return step.refused === true;
  return false;
}

/** Where a run of a claim's steps stopped. `at` is the failing step's index, or -1 when every step passed. */
export interface ClaimRun {
  at: number;
  message?: string;
}

/** The collections a claim's steps reach, with every collection their links point at. */
function reached(schema: ClaimSchema, claim: Claim): ClaimCollection[] {
  const byName = new Map(schema.collections.map((c) => [c.name, c]));
  const want = new Set<string>();
  const add = (name: string): void => {
    if (want.has(name) || !byName.has(name)) return;
    want.add(name);
    for (const col of byName.get(name)!.columns) if (col.targetClass) add(col.targetClass);
  };
  for (const step of claim.steps) {
    const s = step as Record<string, unknown>;
    for (const key of ['make', 'refuse', 'change', 'remove', 'pair', 'paired', 'gone', 'empty', 'there', 'holds', 'unseen', 'numbered']) if (typeof s[key] === 'string') add(s[key] as string);
  }
  return schema.collections.filter((c) => want.has(c.name));
}

/**
 * Applies the part of `schema` a claim reaches under fresh names, then runs its steps. Never
 * throws for a step: the result says where it stopped. Throws only when the schema surface
 * cannot take the schema at all.
 *
 * `{ apply: false }` (P116 ONT-007) runs the steps on the tables as they stand, applying
 * nothing: the grade of a migration. Applying would declare the very rules the migration was
 * meant to leave behind, and a migration that forgot one would pass for a reason the claim never
 * names — measured: a plan without its `setChecks` step passed every claim until this option.
 */
export async function runClaim(ctx: ConformanceContext, schema: ClaimSchema, claim: Claim, options: { apply?: boolean } = {}): Promise<ClaimRun> {
  const collections = reached(schema, claim);
  const names = new Map<string, string>();
  for (const c of collections) names.set(c.name, ctx.collection(c.name));
  const real = (name: string): string => names.get(name) ?? name;
  const byName = new Map(collections.map((c) => [c.name, c]));
  // ONT-014: a write as a person makes it — the row ACL's public key, and the rules of every
  // collection the claim reaches (a delete is judged by the rows its links take with it, R-i).
  const rulesByCollection = Object.fromEntries(collections.filter((c) => c.onlyWhile).map((c) => [real(c.name), c.onlyWhile!]));
  const writeAcl = (name: string): StorageAclOption | undefined =>
    byName.get(name)?.onlyWhile ? { access: 'write', keys: ['*'], onlyWhile: rulesByCollection } : undefined;
  // ONT-011 step 4: a read as that person — the row ACL's public key, and the fields they may not read.
  const anyoneSignedIn = (read: unknown): boolean => (Array.isArray(read) ? read : [read]).some((atom) => atom === 'public' || atom === 'authenticated');
  const readAcl = (name: string): StorageAclOption => {
    const hidden = Object.entries(byName.get(name)?.fields ?? {})
      .filter(([, rule]) => !anyoneSignedIn(rule.read))
      .map(([field]) => ({ field }));
    return { access: 'read', keys: ['*'], ...(hidden.length ? { hidden: { [real(name)]: hidden } } : {}) };
  };

  for (const c of options.apply === false ? [] : collections) {
    const columns = c.columns.map((col) => (col.targetClass ? { ...col, targetClass: real(col.targetClass) } : { ...col }));
    ctx.schema.createTable({ name: real(c.name), columns });
    if (c.checks.length) {
      if (typeof ctx.schema.reconcileChecks !== 'function') throw new AdapterRefusal('the schema surface has no reconcileChecks');
      ctx.schema.reconcileChecks(real(c.name), c.checks);
    }
    if (c.indexes.length) {
      if (typeof ctx.schema.reconcileIndexes !== 'function') throw new AdapterRefusal('the schema surface has no reconcileIndexes');
      ctx.schema.reconcileIndexes(real(c.name), c.indexes);
    }
  }

  const rows = new Map<string, string>();
  const id = (row: string): string => {
    const v = rows.get(row);
    if (v === undefined) throw new ConformanceError(`no row called ${row} was made`);
    return v;
  };
  const column = (coll: string, field: string): ClaimColumn | undefined => byName.get(coll)?.columns.find((c) => c.name === field);
  const value = (coll: string, field: string, v: ClaimValue): unknown => {
    if (typeof v !== 'object') return v;
    if ('date' in v) return { __type: 'Date', iso: v.date };
    const col = column(coll, field);
    if (col && col.type === 'Pointer') return { __type: 'Pointer', className: real(col.targetClass || ''), objectId: id(v.ref) };
    return id(v.ref);
  };
  const data = (coll: string, d: ClaimData): Row => {
    const out: Row = {};
    for (const k of Object.keys(d)) out[k] = value(coll, k, d[k]);
    return out;
  };
  const idOf = (v: unknown): unknown => (v && typeof v === 'object' && 'objectId' in (v as Row) ? (v as Row).objectId : v);
  const entries = async (coll: string, row: string, field: string): Promise<unknown[]> => {
    if (column(coll, field)?.type === 'Relation') {
      const related = ctx.schema.getRelatedIds(real(coll), id(row), field);
      return Array.isArray(related) ? related : [];
    }
    const got = await ctx.fetch(real(coll), id(row));
    return Array.isArray(got[field]) ? (got[field] as unknown[]) : [];
  };

  // ONT-015: the numbers a `numbered` step read, by row and field — what a row removed since was given.
  const numbers = new Map<string, unknown>();

  for (let i = 0; i < claim.steps.length; i++) {
    const step = claim.steps[i];
    try {
      if ('make' in step) {
        const made = await ctx.create(real(step.make), data(step.make, step.data));
        rows.set(step.as, String(made.objectId));
      } else if ('refuse' in step) {
        await ctx.refused(() => ctx.create(real(step.refuse), data(step.refuse, step.data)));
      } else if ('change' in step) {
        const save = () => ctx.save(real(step.change), id(step.row), data(step.change, step.data), step.byPerson ? writeAcl(step.change) : undefined);
        if (step.refused) await ctx.refused(save);
        else await save();
      } else if ('remove' in step) {
        const remove = () => ctx.remove(real(step.remove), id(step.row), step.byPerson ? writeAcl(step.remove) : undefined);
        if (step.refused) await ctx.refused(remove);
        else await remove();
      } else if ('pair' in step) {
        if (column(step.pair, step.field)?.type === 'Relation') await ctx.addRelation(real(step.pair), id(step.row), step.field, id(step.with));
        else {
          const now = await entries(step.pair, step.row, step.field);
          await ctx.save(real(step.pair), id(step.row), { [step.field]: [...now, id(step.with)] });
        }
      } else if ('paired' in step) {
        const now = await entries(step.paired, step.row, step.field);
        if (now.length !== step.count) throw new ConformanceError(`${step.field} holds ${now.length} entries, not ${step.count}`);
      } else if ('gone' in step) {
        const left = await ctx.count(real(step.gone), { objectId: id(step.row) });
        if (left !== 0) throw new ConformanceError(`the ${step.gone} row is still there`);
      } else if ('there' in step) {
        const left = await ctx.count(real(step.there), { objectId: id(step.row) });
        if (left !== 1) throw new ConformanceError(`the ${step.there} row is gone`);
      } else if ('holds' in step) {
        const got = await ctx.fetch(real(step.holds), id(step.row));
        const want = value(step.holds, step.field, step.value);
        const held = got[step.field];
        const same =
          typeof want === 'object' && want !== null && '__type' in (want as Row)
            ? (want as Row).__type === 'Date'
              ? held !== null && typeof held === 'object' && 'iso' in (held as Row)
                ? new Date(String((held as Row).iso)).getTime() === new Date(String((want as Row).iso)).getTime()
                : new Date(String(held)).getTime() === new Date(String((want as Row).iso)).getTime()
              : idOf(held) === (want as Row).objectId
            : held === want;
        if (!same) throw new ConformanceError(`${step.field} holds ${JSON.stringify(held)}, not ${JSON.stringify(want)}`);
      } else if ('unseen' in step) {
        const got = await ctx.fetch(real(step.unseen), id(step.row), readAcl(step.unseen));
        if (String(got.objectId) !== id(step.row)) throw new ConformanceError(`the ${step.unseen} row did not come back to a person`);
        if (step.field in got) throw new ConformanceError(`${step.field} came back to a person who may not read it: ${JSON.stringify(got[step.field])}`);
      } else if ('numbered' in step) {
        const seen = new Map<unknown, string>();
        for (const row of step.rows) {
          const key = `${row}.${step.field}`;
          const there = (await ctx.count(real(step.numbered), { objectId: id(row) })) === 1;
          if (there) numbers.set(key, (await ctx.fetch(real(step.numbered), id(row)))[step.field]);
          else if (!numbers.has(key)) throw new ConformanceError(`the ${step.numbered} row ${row} is gone, and no earlier step read its ${step.field}`);
          const n = numbers.get(key);
          if (n === undefined || n === null || n === '') throw new ConformanceError(`${row} was given no ${step.field}`);
          if (seen.has(n)) throw new ConformanceError(`${row} and ${seen.get(n)} were both given ${step.field} ${JSON.stringify(n)}`);
          seen.set(n, row);
        }
      } else {
        const got = await ctx.fetch(real(step.empty), id(step.row));
        const v = idOf(got[step.field]);
        if (v !== undefined && v !== null && v !== '') throw new ConformanceError(`${step.field} still holds ${JSON.stringify(v)}`);
      }
    } catch (err) {
      return { at: i, message: err instanceof Error ? err.message : String(err) };
    }
  }
  return { at: -1 };
}

const describeStep = (step: ClaimStep): string => JSON.stringify(step);

/**
 * The claims as conformance cases (area `claims`), for `runConformance(…, { cases })`.
 *
 * `against: 'schema'` grades each claim as it is labelled — a held claim passes, a not-held
 * claim fails at a step that says the rule. `against: 'mutant'` grades a held claim on the
 * schema with its rule taken out (the caller passes that schema): it must fail at such a step.
 */
export function claimCases(schema: ClaimSchema, claims: readonly Claim[], against: 'schema' | 'mutant' = 'schema'): ConformanceCase[] {
  return claims.map((claim) => ({
    id: `claims/${against === 'mutant' ? 'mutant/' : claim.held ? '' : 'not-held/'}${claim.id}`,
    area: 'claims' as const,
    pins: claim.says,
    async run(ctx: ConformanceContext): Promise<void> {
      const run = await runClaim(ctx, schema, claim);
      const failedOnTheRule = run.at >= 0 && saysTheRule(claim.steps[run.at]);
      if (against === 'schema' && claim.held) {
        if (run.at >= 0) throw new ConformanceError(`"${claim.says}" is not kept: step ${run.at} ${describeStep(claim.steps[run.at])} — ${run.message}`);
        return;
      }
      if (failedOnTheRule) return;
      if (run.at >= 0)
        throw new ConformanceError(
          `"${claim.says}" failed at step ${run.at} ${describeStep(claim.steps[run.at])}, which makes a row rather than says the rule — it measured nothing: ${run.message}`
        );
      throw new ConformanceError(
        against === 'mutant'
          ? `"${claim.says}" passed on the schema without its rule — the claim grades nothing`
          : `"${claim.says}" is labelled not held, and the store kept it — the label is wrong`
      );
    }
  }));
}
