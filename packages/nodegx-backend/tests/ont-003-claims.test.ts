/**
 * P116 ONT-003 — a schema made from what a person said, graded on two engines.
 *
 * `projectWorld()` (`@nodegx/project-contract/world`) turns `docs/world/` into a schema in the
 * backend contract's neutral terms and writes every answer as a claim. This file applies the
 * schema through the contract's schema surface and runs the claims through the conformance
 * runner, on SQLite and on PostgreSQL, built by `createAdapter()` and never by class name:
 *
 *   - **AC2** — every held claim passes on both engines; every claim labelled not held fails,
 *     at the step that says its rule (so the label is measured, not assumed);
 *   - **AC2** — every held claim fails on its mutant: the schema with that one rule taken out;
 *   - **the shapes cannot drift** — the projection's schema and claims are assigned to the
 *     runner's types below, so a change to either side is a compile error here;
 *   - **the tiles cannot drift** — the projection's storage types are the backend manager's.
 *
 * The PostgreSQL half is skipped when no server answers, as BRG-005's is; `NODEGX_PG_TEST_URL`
 * points it elsewhere, and its database is made for the run and dropped after it.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { IStorageAdapter } from '@noodl/backend-contract';
import {
  claimCases,
  formatFailures,
  runConformance,
  type Claim,
  type ClaimSchema,
  type ConformanceCase,
  type ConformanceReport
} from '@noodl/backend-contract/conformance';

// Relative on purpose: this package declares no dependency on the project contract, and a spec
// reaching a sibling's source by path says so.
import { applyMutant, projectWorld, STORAGE_TYPE, type WorldFiles, type WorldSchema } from '../../nodegx-project-contract/world';
import { KINDS } from '../src/admin/app/fieldKinds';
import { createAdapter, type PersistenceHandle } from '../src/persistence/createAdapter';
import { deletesThroughTheFacade } from './helpers/facade-deletes';

jest.setTimeout(300000);

const FIXTURES = path.join(__dirname, '../../nodegx-project-contract/tests/fixtures');

function readWorld(fixture: string): WorldFiles {
  const dir = path.join(FIXTURES, fixture, 'docs/world');
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, `${name}.json`), 'utf8'));
  const files: WorldFiles = { nouns: read('nouns'), relations: read('relations'), vocabulary: read('vocabulary') };
  // ONT-013: the fifth file, when the fixture has one.
  if (fs.existsSync(path.join(dir, 'rules.json'))) files.rules = read('rules');
  return files;
}

function project(fixture: string): WorldSchema {
  const out = projectWorld(readWorld(fixture));
  if (!out.ok) throw new Error(`${fixture} does not project:\n${out.problems.join('\n')}`);
  return out.schema;
}

// The compile-time half: the projection's output IS the runner's input, with no cast.
const asRunnerSchema = (s: WorldSchema): ClaimSchema => s;
const asRunnerClaims = (s: WorldSchema): readonly Claim[] => s.claims;

const WORLDS = ['world', 'world-every-kind', 'world-membership', 'world-categories', 'world-categories-unanswered', 'world-rules'] as const;

/** The claims of a world as cases, and each held claim on its own mutant. */
function casesFor(schema: WorldSchema): { claims: ConformanceCase[]; mutants: ConformanceCase[] } {
  const claims = claimCases(asRunnerSchema(schema), asRunnerClaims(schema), 'schema');
  const mutants = schema.claims.filter((c) => c.held).flatMap((c) => claimCases(asRunnerSchema(applyMutant(schema, c.mutant!)), [c], 'mutant'));
  return { claims, mutants };
}

function summary(report: ConformanceReport): string {
  return `${report.adapter}: ${report.passed} passed, ${report.failed} failed of ${report.total}`;
}

describe('ONT-003 — the projection, before any engine', () => {
  it('stores each tile as the backend manager does', () => {
    const manager = Object.fromEntries(KINDS.map((k) => [k.id, k.storage]));
    expect({ ...STORAGE_TYPE }).toEqual(manager);
  });

  it.each(WORLDS)('%s: every held claim names a mutant, and every claim a step that says its rule', (fixture) => {
    const schema = project(fixture);
    for (const c of schema.claims) {
      expect([c.id, c.held ? Boolean(c.mutant) : true]).toEqual([c.id, true]);
      expect([c.id, c.steps.length > 0]).toEqual([c.id, true]);
    }
  });
});

type Engine = { name: string; make: () => Promise<IStorageAdapter>; teardown: () => Promise<void>; available: boolean };

function sqlite(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  return {
    name: 'local-sql (node:sqlite)',
    available: true,
    async make() {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont003-claims-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir });
      handles.push(h);
      // R10: the backend's own delete, which keeps every link's "when it goes" rule.
      return deletesThroughTheFacade(h.adapter);
    },
    async teardown() {
      for (const h of handles) await h.adapter.disconnect();
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
    }
  };
}

const ADMIN_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg005';
const DB_NAME = `nodegx_ont003_${process.pid}_${Date.now().toString(36)}`;
function psql(url: string, sql: string): void {
  execFileSync('psql', ['-qtAX', '-d', url, '-c', sql], { stdio: 'ignore' });
}
function pgReachable(): boolean {
  try {
    psql(ADMIN_URL, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}

function postgres(): Engine {
  const dirs: string[] = [];
  const handles: PersistenceHandle[] = [];
  const u = new URL(ADMIN_URL);
  u.pathname = `/${DB_NAME}`;
  let created = false;
  return {
    name: 'postgres',
    available: pgReachable(),
    async make() {
      if (!created) {
        psql(ADMIN_URL, `CREATE DATABASE "${DB_NAME}"`);
        created = true;
      }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ont003-claims-pg-'));
      dirs.push(dir);
      const h = await createAdapter({ dataDir: dir, storageUrl: u.toString() });
      handles.push(h);
      // R10: the backend's own delete, which keeps every link's "when it goes" rule.
      return deletesThroughTheFacade(h.adapter);
    },
    async teardown() {
      for (const h of handles) {
        try {
          await h.adapter.disconnect();
        } catch {
          /* best-effort teardown */
        }
      }
      for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
      if (created) {
        try {
          psql(ADMIN_URL, `DROP DATABASE IF EXISTS "${DB_NAME}"`);
        } catch {
          /* a client still attached; the next run uses a new name anyway */
        }
      }
    }
  };
}

for (const engine of [sqlite(), postgres()]) {
  const suite = engine.available ? describe : describe.skip;
  suite(`ONT-003 — the claims, on ${engine.name}`, () => {
    afterAll(() => engine.teardown());

    describe.each(WORLDS)('%s', (fixture) => {
      const schema = project(fixture);
      const { claims, mutants } = casesFor(schema);

      it('keeps every held claim, and measures every claim labelled not held as not kept', async () => {
        const report = await runConformance(engine.make, { adapter: `${engine.name} — ${fixture}` }, { cases: claims });
        // eslint-disable-next-line no-console
        console.log(`[ONT-003 claims] ${summary(report)} (${schema.claims.filter((c) => c.held).length} held, ${schema.claims.filter((c) => !c.held).length} measured not held)`);
        if (report.failures.length) throw new Error(`${report.failures.length} claim(s) wrong on ${engine.name}:\n${formatFailures(report)}`);
        expect(report.total).toBe(schema.claims.length);
      });

      it('fails every held claim on its mutant, at the step that says the rule', async () => {
        const report = await runConformance(engine.make, { adapter: `${engine.name} — ${fixture} mutants` }, { cases: mutants });
        // eslint-disable-next-line no-console
        console.log(`[ONT-003 mutants] ${summary(report)}`);
        if (report.failures.length) throw new Error(`${report.failures.length} claim(s) grade nothing on ${engine.name}:\n${formatFailures(report)}`);
        expect(report.total).toBe(schema.claims.filter((c) => c.held).length);
      });
    });
  });
}
