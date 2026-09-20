/**
 * The coverage register, and the gate that refuses to believe it.
 *
 * BRG-003 §3.5 — *"a CI check that fails when a new capability appears on the
 * facade or the schema surface without a conformance case or an explicit
 * declaration. This is what converts the invisible permanent tax into a visible
 * one, and it works from the day it lands with SQLite as the only adapter."*
 *
 * ## The tax, and why a gate is the only thing that collects it
 *
 * The phase exists because `generatePostgresSQL()` drops every declared index
 * and emits four `USING (true)` policies over a `creatorOwns` backend, and
 * **nobody could have caught it at review** — there was no written interface
 * and nothing counting. FED-002 added an index declaration in phase 96 and
 * portability quietly stopped holding. The cost of that is paid forever, in
 * arrears, by whoever finds it.
 *
 * So: every member of the storage surface is either exercised by a case, or it
 * is written down here as **not** exercised, with a reason and the task that
 * owes it. There is no third state, and silence is not one of them.
 *
 * ## Two gates, two mechanisms, one artefact
 *
 * 1. **Compile time, free.** The three registers below are mapped types over
 *    `keyof IStorageFacade`, `keyof IStorageSchema` and `keyof IStorageAdapter`
 *    with `-?` so optional members count too. Add a method to an interface and
 *    this file stops compiling, naming the method. That is `npm run
 *    typecheck:contract`, which this task adds to CI — the package had a
 *    `typecheck` script that no workflow had ever called.
 * 2. **Run time, tested.** {@link checkCoverage} reads the surface back out of
 *    `storage.ts` ({@link ./surface}) and the coverage out of a recorded run
 *    ({@link ./recorder}), and reports every disagreement. This is the half
 *    that can be shown to fail, which is the standard AC3 already set for the
 *    suite: *a detector that cannot fail proves nothing.*
 *
 * 🔴 **`cases` is a claim the gate checks, not a claim the gate takes.** An
 * entry saying a case covers a member is rejected unless that case was recorded
 * reaching it. This is the same reading as
 * `verify-the-consequence-not-just-the-mechanism`: an annotation is true when
 * written and silently false after the next refactor.
 *
 * @module conformance/coverage
 */

import type { IStorageAdapter, IStorageFacade, IStorageSchema } from '../src/storage';

import { adapterMembers, type StorageSurface } from './surface';

/**
 * Exercised by these conformance cases.
 *
 * Checked two ways: every id must exist in `CONFORMANCE_CASES`, and at least
 * one of them must have been **recorded** reaching this member during a run.
 */
export interface CoveredByCases {
  kind: 'cases';
  cases: readonly string[];
}

/**
 * Not reached directly, but a strict delegation to a member that is.
 *
 * Only legitimate where the member adds no behaviour of its own — the facade's
 * twelve `raw*` methods are each a single `this.call('<name>', …)` over the
 * data plane, so a case pinning `adapter:query` pins what `rawQuery` promises.
 * **The gate follows the pointer**: a `through` aimed at an uncovered member is
 * a finding, not a pass, so this cannot be used to launder a gap one hop.
 */
export interface CoveredThrough {
  kind: 'through';
  /** `adapter:query`, `schema:addColumn` — a member in the recorded namespace. */
  member: string;
  /** Where the delegation was read, so the next reader re-reads rather than trusts. */
  why: string;
}

/**
 * In the promise and **not** covered. This is the tax, made visible.
 *
 * Every entry needs the task that owes the case. A gap with no owner is
 * rediscovered later at full price — the reading in
 * `an-unowned-row-gets-rediscovered-at-full-price`.
 */
export interface Uncovered {
  kind: 'uncovered';
  why: string;
  /** The task that owes it — `BRG-004`, `BRG-003 AC2`, … */
  owes: string;
}

/**
 * Deliberately outside the promise, forever. Not a gap and not owed.
 *
 * `getDatabase()` is the shape of this: BRG-002 fenced it, and a conformance
 * case depending on a raw handle would be a case no second adapter can pass.
 */
export interface NotInThePromise {
  kind: 'not-in-the-promise';
  why: string;
}

export type CoverageEntry = CoveredByCases | CoveredThrough | Uncovered | NotInThePromise;

/** Every member of `IStorageAdapter`, including the data plane it extends. */
export const ADAPTER_COVERAGE: { readonly [K in keyof IStorageAdapter]-?: CoverageEntry } = {
  // --- the data plane (IStorageDataPlane), which is what the cases drive ---
  query: { kind: 'cases', cases: ['records/count-matches-the-visible-set', 'acl/a-user-sees-public-plus-their-own'] },
  fetch: { kind: 'cases', cases: ['records/fetch-by-objectId', 'records/fetch-accepts-id-and-objectId'] },
  create: { kind: 'cases', cases: ['records/create-returns-the-stored-row'] },
  save: { kind: 'cases', cases: ['records/save-updates-in-place', 'acl/a-non-owner-cannot-save'] },
  delete: { kind: 'cases', cases: ['records/delete-removes-the-row', 'acl/a-non-owner-cannot-delete'] },
  count: { kind: 'cases', cases: ['records/count-matches-the-visible-set', 'acl/count-counts-only-visible-rows'] },
  aggregate: {
    kind: 'cases',
    cases: ['records/aggregate-sum-avg-min-max', 'acl/aggregate-computes-only-over-visible-rows']
  },
  distinct: {
    kind: 'cases',
    cases: ['records/distinct-returns-each-value-once', 'acl/distinct-reveals-only-visible-values']
  },
  increment: {
    kind: 'cases',
    cases: ['records/increment-is-atomic-on-the-stored-value', 'acl/a-non-owner-cannot-increment']
  },
  addRelation: { kind: 'cases', cases: ['relations/add-then-read-back'] },
  removeRelation: { kind: 'cases', cases: ['relations/remove-detaches-only-the-named-target'] },
  search: {
    kind: 'cases',
    cases: ['records/search-finds-a-row-by-its-text', 'acl/search-returns-only-visible-rows']
  },

  // --- the adapter's own members ---
  schemaManager: { kind: 'cases', cases: ['schema/create-table-then-list-it'] },
  connect: {
    kind: 'uncovered',
    why:
      'The suite is handed an adapter that is already connected (§3.1: "makeAdapter returns a connected adapter; ' +
      'the suite does not connect or disconnect it, because teardown differs per adapter"). Connection is the one ' +
      'thing a conformance harness cannot own without knowing what it is conforming.',
    owes: 'BRG-005'
  },
  disconnect: {
    kind: 'uncovered',
    why: 'Same boundary as connect() — the runner owns the lifecycle, not the suite.',
    owes: 'BRG-005'
  },
  getPersistenceStatus: {
    kind: 'uncovered',
    why:
      'Read at exactly one place (RUN-004: a service that cannot persist and was not told it may run ephemerally ' +
      'refuses to start), and what it reports is per-adapter by construction — `engine` is a name, `mode` is a ' +
      'deployment fact. A case would pin the shape, which the type already does, and nothing else.',
    owes: 'BRG-005'
  },
  on: {
    kind: 'uncovered',
    why:
      'The change tap — §5.5 names this as one of three uncovered areas and says why: `on`/`off` are optional and ' +
      'feature-detected, and the real consumer is `ChangeBus` in nodegx-backend, not the adapter. It wants a case ' +
      'that drives the bus, which is a second harness.',
    owes: 'BRG-003 AC2'
  },
  off: { kind: 'uncovered', why: 'Same as `on` — the change tap needs a bus-level harness.', owes: 'BRG-003 AC2' },
  transaction: {
    kind: 'uncovered',
    why:
      'Still synchronous, and §5.5 records the blocker: BRG-002 §3.1 moved the only caller to `upsertBatch`, whose ' +
      'implementation is the one facade method still SQLite-specific. Testing rollback portably needs that resolved ' +
      'first, so a case written today would pin the SQLite shape.',
    owes: 'BRG-003 AC2'
  },
  getDatabase: {
    kind: 'not-in-the-promise',
    why:
      'The raw-handle escape BRG-002 fenced. `ConformanceContext` deliberately does not expose it, so no case can ' +
      'depend on it even by accident — a case that did would be a case no second adapter could ever pass.'
  }
};

/** Every member of `IStorageSchema`. */
export const SCHEMA_COVERAGE: { readonly [K in keyof IStorageSchema]-?: CoverageEntry } = {
  createTable: { kind: 'cases', cases: ['schema/create-table-then-list-it'] },
  addColumn: { kind: 'cases', cases: ['schema/add-column-is-visible-to-reads'] },
  getTableSchema: {
    kind: 'cases',
    cases: ['schema/table-schema-reports-its-columns', 'schema/unknown-table-reports-null-not-an-empty-schema']
  },
  listTables: { kind: 'cases', cases: ['schema/create-table-then-list-it'] },
  reconcileIndexes: { kind: 'cases', cases: ['schema/declared-index-is-built', 'schema/unique-index-refuses-a-duplicate'] },
  indexStatus: { kind: 'cases', cases: ['schema/declared-index-is-built'] },
  getRelatedIds: { kind: 'cases', cases: ['relations/add-then-read-back'] },
  getRelationOwners: { kind: 'cases', cases: ['relations/inverse-lookup-finds-the-owners'] },

  addRelation: {
    kind: 'through',
    member: 'adapter:addRelation',
    why:
      'The adapter writes relations through its own schema manager — `LocalSQLAdapter.ts:1255` calls ' +
      '`this.schemaManager.addRelation(...)` inside `addRelation()`. ⚠️ The recorder cannot see that call: it wraps ' +
      'the reference the SUITE holds, and the adapter uses its own. So "no case reached it" here means "no case ' +
      'reached it directly", which is why this is `through` and not `uncovered`.'
  },
  removeRelation: {
    kind: 'through',
    member: 'adapter:removeRelation',
    why: 'Same shape as addRelation — `LocalSQLAdapter.ts:1269` calls `this.schemaManager.removeRelation(...)`.'
  },

  renameColumn: {
    kind: 'uncovered',
    why:
      'A migration-path member, reached from the editor schema UI rather than from anything a deployed app runs. ' +
      'BRG-004 moves schemas across and is where a rename has to survive the crossing.',
    owes: 'BRG-004'
  },
  changeColumnType: {
    kind: 'uncovered',
    why: 'Optional and feature-detected, and the type-affinity rules it depends on are exactly what diverges. Belongs to the migrator.',
    owes: 'BRG-004'
  },
  deleteTable: { kind: 'uncovered', why: 'Optional; same migration path as renameColumn.', owes: 'BRG-004' },
  exportSchemas: {
    kind: 'uncovered',
    why: 'The read half of the export path the two generators below sit on. BRG-004 owns that path end to end.',
    owes: 'BRG-004'
  },
  generatePostgresSQL: {
    kind: 'not-in-the-promise',
    why:
      'A migration concern, not a storage one: a PostgreSQL adapter has no business emitting PostgreSQL DDL for ' +
      'itself, so a conformance case here would be one no second adapter can pass. It was `uncovered` and owed to ' +
      'BRG-004 because it was WRONG (BRG-D2, BRG-D3) and had one test asserting `toContain("CREATE TABLE")`. ' +
      'BRG-004 repaired it and it is now held by 20 cases in ' +
      'noodl-runtime/test/adapters/SchemaManager.export.test.js and 10 more in the `.postgres.` sibling, which ' +
      'applies the emitted DDL to a real PostgreSQL and reads the indexes back out of `pg_indexes`.'
  },
  generateSupabaseSQL: {
    kind: 'not-in-the-promise',
    why:
      'Same boundary as its sibling. It was the worse of the two — four `TO authenticated … USING (true)` policies ' +
      'per table over a backend whose default is `creatorOwns` — and BRG-004 replaced them with policies generated ' +
      'from the live CLP and the row ACL, refusing by name rather than approximating (`code: CANNOT_CROSS`). The ' +
      'adversarial half is measured, not declared: the `.postgres.` spec applies the policies and proves a ' +
      'non-owner is denied read, update and delete on another user\'s row, with the owner as the control.'
  },
  hasFts5Support: {
    kind: 'not-in-the-promise',
    why:
      'FTS5 is a SQLite feature by name. A portable suite asks whether search works (`adapter:search`), never whether ' +
      'a named engine extension is present — §3.4 is where the two answers are allowed to differ.'
  },
  hasSearchIndex: {
    kind: 'uncovered',
    why:
      'The search-index lifecycle (build, query, drop) is one story and the cases cover only the query end. It wants ' +
      'the §3.4 declaration mechanism, because ranking genuinely differs between FTS5 and tsvector.',
    owes: 'BRG-003 AC5'
  },
  rebuildSearchIndex: {
    kind: 'cases',
    cases: ['records/search-finds-a-row-by-its-text', 'acl/search-returns-only-visible-rows'],
    // Covered as the setup every search case needs, not as a story of its own:
    // what is pinned is "a rebuilt index answers", not "a rebuild is
    // idempotent" or "a rebuild after a drop recovers". Those stay with
    // hasSearchIndex / dropSearchIndex and BRG-003 AC5.
  },
  dropSearchIndex: { kind: 'uncovered', why: 'Same story as hasSearchIndex.', owes: 'BRG-003 AC5' }
};

/** Every member of `IStorageFacade`. */
export const FACADE_COVERAGE: { readonly [K in keyof IStorageFacade]-?: CoverageEntry } = {
  // The twelve promisifications. Each is one line — `this.call('<name>', …)` —
  // and the gate test in nodegx-backend reads that dispatch string back off the
  // compiled method rather than trusting these entries.
  rawQuery: { kind: 'through', member: 'adapter:query', why: "AdapterFacade.rawQuery = this.call('query', …)" },
  rawQueryAll: {
    kind: 'through',
    member: 'adapter:query',
    why:
      "AdapterFacade.rawQueryAll = this.call('query', …) — the same adapter member as rawQuery, with the PRD-001 " +
      'page cap explicitly off. The DIFFERENCE between the two is a product rule and not a portability one: a ' +
      'conformance case for it would assert that an adapter has a limit, when what the suite asks is whether two ' +
      'adapters behave the same, and they do — both honour the `limit` the facade hands them (records/' +
      'limit-skip-and-count-compose). PRD-001 §3.5 is the long form of that reasoning.'
  },
  rawSearch: { kind: 'through', member: 'adapter:search', why: "AdapterFacade.rawSearch = this.call('search', …)" },
  rawFetch: { kind: 'through', member: 'adapter:fetch', why: "AdapterFacade.rawFetch = this.call('fetch', …)" },
  rawCreate: { kind: 'through', member: 'adapter:create', why: "AdapterFacade.rawCreate = this.call('create', …)" },
  rawSave: { kind: 'through', member: 'adapter:save', why: "AdapterFacade.rawSave = this.call('save', …)" },
  rawDelete: { kind: 'through', member: 'adapter:delete', why: "AdapterFacade.rawDelete = this.call('delete', …)" },
  rawCount: { kind: 'through', member: 'adapter:count', why: "AdapterFacade.rawCount = this.call('count', …)" },
  rawIncrement: {
    kind: 'through',
    member: 'adapter:increment',
    why: "AdapterFacade.rawIncrement = this.call('increment', …)"
  },
  rawAggregate: {
    kind: 'through',
    member: 'adapter:aggregate',
    why: "AdapterFacade.rawAggregate = this.call('aggregate', …)"
  },
  rawDistinct: {
    kind: 'through',
    member: 'adapter:distinct',
    why: "AdapterFacade.rawDistinct = this.call('distinct', …)"
  },
  addRelation: {
    kind: 'through',
    member: 'adapter:addRelation',
    why: "AdapterFacade.addRelation = this.call('addRelation', …)"
  },
  removeRelation: {
    kind: 'through',
    member: 'adapter:removeRelation',
    why: "AdapterFacade.removeRelation = this.call('removeRelation', …)"
  },
  schemaManager: {
    kind: 'through',
    member: 'adapter:schemaManager',
    why: 'The facade re-exposes the adapter’s schema manager; the schema surface is registered above in its own right.'
  },

  // The wire half — real translation, and the largest remaining piece of AC2.
  wireQuery: {
    kind: 'uncovered',
    why:
      '§5.5: the `wire*` envelopes and `include=` expansion live on IStorageFacade, not on the adapter, so they need ' +
      'a second harness taking a facade. This is NOT a promisification — it rewrites rows into `{__type}` envelopes ' +
      'and expands `include=`, which is what every data node on the canvas actually receives.',
    owes: 'BRG-003 AC2'
  },
  wireFetch: { kind: 'uncovered', why: 'Same harness as wireQuery — the `{__type}` envelope translation.', owes: 'BRG-003 AC2' },
  wireSearch: { kind: 'uncovered', why: 'Same harness as wireQuery.', owes: 'BRG-003 AC2' },
  wireRecord: { kind: 'uncovered', why: 'Same harness as wireQuery — the single-record envelope.', owes: 'BRG-003 AC2' },

  // The import path.
  getColumns: {
    kind: 'uncovered',
    why: 'BAK-007’s import path. It is facade-level and has no adapter member behind it, so it needs the facade harness.',
    owes: 'BRG-003 AC2'
  },
  existingIds: { kind: 'uncovered', why: 'BAK-007’s import path — the dedupe read.', owes: 'BRG-003 AC2' },
  ensureImportShape: {
    kind: 'uncovered',
    why: 'BAK-007’s import path — it reconciles columns before a bulk write.',
    owes: 'BRG-003 AC2'
  },
  upsertBatch: {
    kind: 'uncovered',
    why:
      '🔴 §5.5 names this one specifically: it is the one facade method whose implementation is still SQLite-specific, ' +
      'and BRG-002 §3.1 moved `transaction()`’s only caller into it. A case written against it today would pin SQLite.',
    owes: 'BRG-003 AC2'
  }
};

/** One thing the gate found wrong, in the words a build log should print. */
export interface CoverageFinding {
  surface: 'adapter' | 'schema' | 'facade';
  member: string;
  problem: string;
}

/** What a run of the gate reports. */
export interface CoverageReport {
  findings: readonly CoverageFinding[];
  /** Members declared `uncovered` — the tax, counted. Held by a ratchet. */
  uncovered: readonly string[];
}

const REGISTERS: Record<'adapter' | 'schema' | 'facade', Record<string, CoverageEntry>> = {
  adapter: ADAPTER_COVERAGE as Record<string, CoverageEntry>,
  schema: SCHEMA_COVERAGE as Record<string, CoverageEntry>,
  facade: FACADE_COVERAGE as Record<string, CoverageEntry>
};

/** The namespace a member of each surface is recorded under. */
const NAMESPACE: Record<'adapter' | 'schema' | 'facade', string | null> = {
  adapter: 'adapter',
  schema: 'schema',
  // Nothing in the suite touches the facade — it is not the adapter, and the
  // cases are written against a connected adapter. Every facade entry is
  // therefore `through` or `uncovered`, and `cases` is refused outright.
  facade: null
};

export interface CheckOptions {
  surface: StorageSurface;
  /** `CONFORMANCE_CASES.map(c => c.id)` — the ids that exist. */
  caseIds: readonly string[];
  /** Case ids recorded reaching a member, from a {@link ./recorder} run. */
  callersOf(member: string): readonly string[];
}

/**
 * Check the register against the surface and against a recorded run.
 *
 * The failure message names the member, because AC6 asks for exactly that: the
 * point of the gate is that whoever added the method reads its name in the
 * build log and does not have to go looking for what they broke.
 */
export function checkCoverage(options: CheckOptions): CoverageReport {
  const { surface, caseIds, callersOf } = options;
  const findings: CoverageFinding[] = [];
  const uncovered: string[] = [];
  const known = new Set(caseIds);

  const surfaces: Record<'adapter' | 'schema' | 'facade', readonly string[]> = {
    adapter: adapterMembers(surface),
    schema: surface.schema,
    facade: surface.facade
  };

  /** Does `member` (in recorded namespace form) resolve to something covered? */
  const isCovered = (qualified: string): boolean => {
    const [ns, name] = qualified.split(':');
    const register = ns === 'schema' ? REGISTERS.schema : REGISTERS.adapter;
    const entry = register[name];
    if (!entry) return false;
    if (entry.kind === 'cases') return callersOf(qualified).length > 0;
    // One hop only. A chain of `through` entries would be a way to point a gap
    // at itself through a ring, and no legitimate delegation is two deep.
    if (entry.kind === 'through') {
      const [ns2, name2] = entry.member.split(':');
      const reg2 = ns2 === 'schema' ? REGISTERS.schema : REGISTERS.adapter;
      const e2 = reg2[name2];
      return e2?.kind === 'cases' && callersOf(entry.member).length > 0;
    }
    return false;
  };

  for (const which of ['adapter', 'schema', 'facade'] as const) {
    const register = REGISTERS[which];
    const namespace = NAMESPACE[which];

    for (const member of surfaces[which]) {
      const entry = register[member];

      if (!entry) {
        // AC6's headline. Unreachable while the mapped types compile, and kept
        // anyway: a `tsc` that is not run is not a gate, and this file's whole
        // subject is a check nobody was running.
        findings.push({
          surface: which,
          member,
          problem:
            `${which}.${member} is on the storage surface with no conformance case and no declaration. ` +
            `Add a case, or declare it in conformance/coverage.ts with a reason and the task that owes it.`
        });
        continue;
      }

      switch (entry.kind) {
        case 'cases': {
          if (!namespace) {
            findings.push({
              surface: which,
              member,
              problem: `${which}.${member} claims conformance cases, but no case can reach the facade — the suite runs against an adapter. Use 'through' or 'uncovered'.`
            });
            break;
          }
          const missing = entry.cases.filter((id) => !known.has(id));
          if (missing.length > 0) {
            findings.push({
              surface: which,
              member,
              problem: `${which}.${member} names ${missing.length} case(s) that do not exist: ${missing.join(', ')}`
            });
          }
          const qualified = `${namespace}:${member}`;
          const actual = callersOf(qualified);
          const claimedAndReal = entry.cases.filter((id) => actual.includes(id));
          if (claimedAndReal.length === 0) {
            findings.push({
              surface: which,
              member,
              problem:
                `${which}.${member} is declared covered by [${entry.cases.join(', ')}], but a recorded run shows ` +
                `none of them reached it` +
                (actual.length > 0 ? ` (these did: ${actual.slice(0, 3).join(', ')})` : ' (nothing reached it at all)')
            });
          }
          break;
        }

        case 'through': {
          if (!isCovered(entry.member)) {
            findings.push({
              surface: which,
              member,
              problem:
                `${which}.${member} is declared covered through ${entry.member}, but ${entry.member} is not itself ` +
                `covered — a delegation cannot launder a gap one hop`
            });
          }
          break;
        }

        case 'uncovered': {
          uncovered.push(`${which}.${member}`);
          // The register has to be honest in BOTH directions. A member declared
          // uncovered that cases do in fact reach understates what the suite
          // pins, and an understated gap is one nobody closes because the list
          // says it is already owed to a later task.
          if (namespace) {
            const actual = callersOf(`${namespace}:${member}`);
            if (actual.length > 0) {
              findings.push({
                surface: which,
                member,
                problem:
                  `${which}.${member} is declared uncovered, but a recorded run shows ${actual.length} case(s) ` +
                  `reaching it (${actual.slice(0, 3).join(', ')}) — declare the cases instead`
              });
            }
          }
          if (!entry.why.trim() || !entry.owes.trim()) {
            findings.push({
              surface: which,
              member,
              problem: `${which}.${member} is declared uncovered with no reason or no owing task — an unowned gap is rediscovered later at full price`
            });
          }
          break;
        }

        case 'not-in-the-promise': {
          if (!entry.why.trim()) {
            findings.push({
              surface: which,
              member,
              problem: `${which}.${member} is declared out of the promise with no reason`
            });
          }
          break;
        }
      }
    }

    // The other direction: a register entry for a member that no longer exists.
    // The mapped types catch a rename at compile time; this catches the case
    // where the gate is run against a surface the register was not written for.
    const present = new Set(surfaces[which]);
    for (const member of Object.keys(register)) {
      if (!present.has(member)) {
        findings.push({
          surface: which,
          member,
          problem: `${which}.${member} is in the coverage register but is no longer declared on the interface — a stale entry hides a member that did go uncounted`
        });
      }
    }
  }

  return { findings, uncovered };
}

/** One line per finding, for a build log. */
export function formatCoverageFindings(report: CoverageReport): string {
  return report.findings.map((f) => `  [${f.surface}] ${f.member}\n      ${f.problem}`).join('\n');
}
