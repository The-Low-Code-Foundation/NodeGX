/**
 * The PostgreSQL export, applied to a real PostgreSQL — BRG-004 (phase 97).
 *
 * `SchemaManager.export.test.js` grades what the emitted SQL SAYS. This file
 * grades what PostgreSQL DOES with it, because three of BRG-004's acceptance
 * criteria are about the other side and nothing about a string can answer them:
 *
 *   AC2 — the declared unique index EXISTS, read back from `pg_indexes`.
 *   AC3 — the relation's junction table exists and holds a traversal's rows.
 *   AC4 — the generated policies actually DENY a non-owner read, update and
 *         delete on another user's row. Adversarial, in the house style of
 *         `security-enforcement.test.ts`: the denial is measured, not declared.
 *
 * 🔴 **It is skipped when no PostgreSQL is reachable**, which is a hole in CI
 * and is recorded as one in the task file rather than hidden: the run that
 * grades the criteria is a local one, against a named server, pasted into
 * `BRG-004-THE-MIGRATOR.md` §5. Point it somewhere with
 * `NODEGX_PG_TEST_URL=postgres://…`.
 *
 * It talks to the server through `psql` rather than a driver on purpose: this
 * package has no PostgreSQL dependency and BRG-005 is the task that decides
 * which one it gets. A test that forced that choice would be choosing it.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveEngine, SchemaManager } = require('../../src/api/adapters/local-sql');

const PG_URL = process.env.NODEGX_PG_TEST_URL || 'postgres:///nodegx_brg004';

function psql(sql, opts) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-qtAX', '-d', PG_URL, '-c', sql], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', opts && opts.quiet ? 'pipe' : 'pipe']
  });
}

function psqlFile(file) {
  return execFileSync('psql', ['-v', 'ON_ERROR_STOP=1', '-qtAX', '-d', PG_URL, '-f', file], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

/** One statement run as a role with a NodeGX identity, the way PostgREST does. */
function asUser(userId, sql) {
  const claims = userId === null ? null : JSON.stringify({ nodegx_user_id: userId });
  const role = userId === null ? 'anon' : 'authenticated';
  // `SET LOCAL`, not `set_config()`: the function form RETURNS a row, and that
  // row lands in the output this test reads its answer out of.
  const set = claims === null ? '' : `SET LOCAL request.jwt.claims TO '${claims}';`;
  return psql(`BEGIN; SET LOCAL ROLE ${role}; ${set} ${sql} COMMIT;`);
}

let reachable = false;
try {
  execFileSync('psql', ['-qtAX', '-d', PG_URL, '-c', 'SELECT 1'], { stdio: 'ignore' });
  reachable = true;
} catch (e) {
  reachable = false;
}

const suite = reachable ? describe : describe.skip;

const ITEM = {
  name: 'Item',
  columns: [
    { name: 'guid', type: 'String', required: true },
    { name: 'score', type: 'Number', defaultValue: 0 },
    { name: 'published', type: 'Date' },
    { name: 'where', type: 'GeoPoint' },
    { name: 'tags', type: 'Relation', targetClass: 'Tag' }
  ],
  indexes: [{ fields: ['guid'], unique: true }, { fields: ['published'], order: 'desc' }]
};

function security() {
  return {
    defaults: {
      permissions: {
        find: 'authenticated',
        get: 'authenticated',
        create: 'authenticated',
        update: 'authenticated',
        delete: 'authenticated'
      },
      creatorOwns: true
    },
    collections: {}
  };
}

suite(`the export applied to PostgreSQL (${PG_URL})`, () => {
  let dir;
  let db;
  let sm;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-pg-'));
    db = resolveEngine().open(path.join(dir, 'test.db'));
    sm = new SchemaManager(db);
    sm.ensureSchemaTable();
    sm.createTable(ITEM);
    sm.createTable({ name: 'Tag', columns: [{ name: 'label', type: 'String' }] });

    // A database only this suite uses, emptied at the start of every run — the
    // same reason a fixture file is fresh: a leftover table from a previous run
    // is an assertion about the wrong artefact.
    psql('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
    psql("DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;");
    psql("DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;");
    psql('GRANT USAGE ON SCHEMA public TO anon, authenticated;');
  });

  afterAll(() => {
    try {
      db.close();
    } catch (e) {
      /* already closed */
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('AC2 / AC3 — the schema half applies and holds what was declared', () => {
    beforeAll(() => {
      const file = path.join(dir, 'schema.sql');
      fs.writeFileSync(file, sm.generatePostgresSQL());
      psqlFile(file);
    });

    it('AC2 — the declared unique index exists, read back from pg_indexes', () => {
      const rows = psql(
        "SELECT indexname || ' :: ' || indexdef FROM pg_indexes WHERE tablename = 'Item' ORDER BY indexname"
      )
        .trim()
        .split('\n');

      const byName = Object.fromEntries(rows.map((r) => r.split(' :: ')));
      expect(Object.keys(byName).sort()).toEqual([
        'Item_pkey',
        'idx_Item_createdAt',
        'idx_Item_guid',
        'idx_Item_published',
        'idx_Item_updatedAt'
      ]);
      // The declaration that used to vanish: `unique: true` on `guid`.
      expect(byName['idx_Item_guid']).toContain('CREATE UNIQUE INDEX');
      expect(byName['idx_Item_published']).toContain('DESC');
      expect(byName['idx_Item_published']).not.toContain('UNIQUE');
    });

    it('AC2 — and the unique index refuses a duplicate, which is what it was for', () => {
      psql(`INSERT INTO "Item" ("objectId", "guid") VALUES ('i1', 'g-1');`);
      expect(() => psql(`INSERT INTO "Item" ("objectId", "guid") VALUES ('i2', 'g-1');`)).toThrow(
        /duplicate key value violates unique constraint/
      );
    });

    it('AC3 — the junction table exists under the name the adapter uses, and traverses', () => {
      psql(`INSERT INTO "Tag" ("objectId", "label") VALUES ('t1', 'red'), ('t2', 'blue');`);
      psql(`INSERT INTO "_Join_tags_Item" ("owningId", "relatedId") VALUES ('i1', 't1'), ('i1', 't2');`);

      // The traversal `getRelatedIds` performs, in PostgreSQL.
      const related = psql(`SELECT "relatedId" FROM "_Join_tags_Item" WHERE "owningId" = 'i1' ORDER BY 1;`)
        .trim()
        .split('\n');
      expect(related).toEqual(['t1', 't2']);

      // The same ids the SQLite side holds, through the adapter's own reader.
      sm.addRelation('Item', 'i1', 'tags', 't1');
      sm.addRelation('Item', 'i1', 'tags', 't2');
      expect(sm.getRelatedIds('Item', 'i1', 'tags').sort()).toEqual(related);
    });

    it('the GeoPoint column holds what the adapter writes into it', () => {
      const point = JSON.stringify({ latitude: 59.3, longitude: 18.1 });
      psql(`INSERT INTO "Item" ("objectId", "guid", "where") VALUES ('i9', 'g-9', '${point}'::jsonb);`);
      const back = psql(`SELECT "where" ->> 'latitude' FROM "Item" WHERE "objectId" = 'i9';`).trim();
      expect(back).toBe('59.3');
    });
  });

  describe('AC4 — the policies deny a non-owner, measured', () => {
    beforeAll(() => {
      psql('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
      psql('GRANT USAGE ON SCHEMA public TO anon, authenticated;');
      const file = path.join(dir, 'supabase.sql');
      fs.writeFileSync(file, sm.generateSupabaseSQL({ security: security(), userIdClaim: 'nodegx_user_id' }));
      psqlFile(file);

      // Four rows, written as the owner (the migrator's own connection).
      //
      // 🔴 `r1` and `r2` carry the flags as **booleans**, because that is what
      // the product writes: the wire refuses anything else ("ACL flag *.read
      // must be a boolean") and the JSON on disk reads
      // `{"*":{"read":true}}`. SQLite's `json_extract` returns 1 for that, which
      // is why its predicate compares to 1 — and PostgreSQL's `->>` returns
      // 'true', which is why the generated policy accepts both. A policy written
      // from the SQLite predicate alone would deny every ACL'd row in every real
      // database. `r4` is the numeric form, so both are measured rather than
      // one assumed.
      psql(
        `INSERT INTO "Item" ("objectId", "guid", "ACL") VALUES
           ('r1', 'g1', '{"u1":{"read":true,"write":true}}'::jsonb),
           ('r2', 'g2', '{"u2":{"read":true,"write":true}}'::jsonb),
           ('r3', 'g3', NULL),
           ('r4', 'g4', '{"u1":{"read":1,"write":1}}'::jsonb),
           ('r5', 'g5', '{"u1":{"read":1.0,"write":1.0}}'::jsonb),
           ('r6', 'g6', '[1,2]'::jsonb);`
      );
      // 🔴 r5 and r6 were added by BRG-005 §6.1, which measured the two ways
      // this policy's first translation diverged from the predicate it copies.
      // Neither shape can arrive through the product's own wire (it refuses a
      // non-boolean flag), which is exactly why they were not covered — and
      // exactly the population this generator's docstring says it exists for:
      // "a policy that works on the data that exists rather than the data it
      // expected". A migrated database, a fixture, another language's writer.
    });

    it('a user reads their own rows and the public one, and not the other user’s', () => {
      const seen = asUser('u1', `SELECT string_agg("objectId", ',' ORDER BY "objectId") FROM "Item";`).trim();
      // r1 (boolean flags), r3 (no ACL), r4 (numeric flags), r5 (a JSON real) —
      // and NOT r2 (another user) or r6 (an ACL that is not an object).
      expect(seen).toBe('r1,r3,r4,r5');
    });

    it('🔴 a flag stored as a JSON real grants, as the SQLite predicate does', () => {
      // The first translation compared the flag as TEXT: `(value ->> 'read') IN
      // ('1','true')`. `->>` renders 1.0 as "1.0", so this row was DENIED to its
      // own owner, where SQLite's numeric `json_extract(…) = 1` grants it. The
      // fix compares as jsonb, because '1.0'::jsonb = '1'::jsonb.
      expect(asUser('u1', `SELECT "objectId" FROM "Item" WHERE "objectId" = 'r5';`).trim()).toBe('r5');
      // And the control that proves the row is reachable at all and the denial
      // above is the ACL rather than the row being missing.
      expect(psql(`SELECT "objectId" FROM "Item" WHERE "objectId" = 'r5';`).trim()).toBe('r5');
      // The pre-fix expression, run over the same row: it denies.
      expect(
        psql(
          `SELECT count(*) FROM "Item" WHERE "objectId" = 'r5' ` +
            `AND ("ACL" -> 'u1' ->> 'read') IN ('1','true');`
        ).trim()
      ).toBe('0');
    });

    it('🔴 one ACL that is not an object hides its row, and does not fail the table', () => {
      // `jsonb_each` RAISES on a non-object, and an error inside a policy's
      // USING clause fails the statement — so without the `jsonb_typeof` guard
      // r6 would make every read of this table an error for every user, where
      // SQLite's `json_each` walks it, matches no principal and hides the row.
      // The case above already reads four rows past r6; this one names why.
      expect(() => asUser('u1', `SELECT count(*) FROM "Item";`)).not.toThrow();
      expect(asUser('u1', `SELECT count(*) FROM "Item" WHERE "objectId" = 'r6';`).trim()).toBe('0');
      // Armed: the unguarded predicate over the same row is the error itself.
      expect(() =>
        psql(
          `SELECT count(*) FROM "Item" WHERE EXISTS (` +
            `SELECT 1 FROM jsonb_each("ACL") AS _a WHERE _a.key IN ('u1'));`
        )
      ).toThrow(/cannot call jsonb_each on a non-object/);
    });

    it('a non-owner cannot UPDATE another user’s row', () => {
      const updated = asUser('u1', `UPDATE "Item" SET "guid" = 'stolen' WHERE "objectId" = 'r2' RETURNING "objectId";`);
      expect(updated.trim()).toBe('');
      // And the row is untouched, read with the owner's own privileges.
      expect(psql(`SELECT "guid" FROM "Item" WHERE "objectId" = 'r2';`).trim()).toBe('g2');
    });

    it('a non-owner cannot DELETE another user’s row', () => {
      const deleted = asUser('u1', `DELETE FROM "Item" WHERE "objectId" = 'r2' RETURNING "objectId";`);
      expect(deleted.trim()).toBe('');
      expect(psql(`SELECT count(*) FROM "Item" WHERE "objectId" = 'r2';`).trim()).toBe('1');
    });

    it('the owner CAN update their own row — the control that proves the denial is the ACL', () => {
      const updated = asUser('u2', `UPDATE "Item" SET "guid" = 'g2b' WHERE "objectId" = 'r2' RETURNING "objectId";`);
      expect(updated.trim()).toBe('r2');
      expect(psql(`SELECT "guid" FROM "Item" WHERE "objectId" = 'r2';`).trim()).toBe('g2b');
    });

    it('an anonymous caller is refused the table outright', () => {
      // `find` is `authenticated` here, so anon holds no SELECT GRANT — the
      // refusal arrives one layer BELOW the policy, and that is the stronger
      // of the two answers, not a weaker one.
      expect(() => asUser(null, `SELECT count(*) FROM "Item";`)).toThrow(/permission denied for table Item/);
    });

    it('with find: public, an anonymous caller sees the un-ACL’d row and no other', () => {
      const cfg = security();
      cfg.collections.Item = { permissions: { find: 'public', get: 'public' } };
      const file = path.join(dir, 'supabase-public.sql');
      psql('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
      psql('GRANT USAGE ON SCHEMA public TO anon, authenticated;');
      fs.writeFileSync(file, sm.generateSupabaseSQL({ security: cfg, userIdClaim: 'nodegx_user_id' }));
      psqlFile(file);
      psql(
        `INSERT INTO "Item" ("objectId", "guid", "ACL") VALUES
           ('r1', 'g1', '{"u1":{"read":1,"write":1}}'::jsonb),
           ('r3', 'g3', NULL);`
      );

      const seen = asUser(null, `SELECT string_agg("objectId", ',' ORDER BY "objectId") FROM "Item";`).trim();
      expect(seen).toBe('r3');
    });
  });
});
