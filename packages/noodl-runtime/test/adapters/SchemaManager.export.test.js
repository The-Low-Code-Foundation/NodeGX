/**
 * The PostgreSQL / Supabase export — BRG-004 (phase 97), and the three defects
 * the phase was scoped on.
 *
 * Before this task the two generators had **one** test in the monorepo and it
 * asserted `toContain('CREATE TABLE')`. Everything they got wrong was inside
 * that assertion's blind spot: declared indexes dropped (BRG-D2), relation
 * columns dropped with no warning (BRG-D3), and four
 * `TO authenticated … USING (true)` policies per table over a backend that
 * enforces row ACLs in the SQL it builds (BRG-D1).
 *
 * So these cases are written against what the emitted SQL SAYS. The half that
 * needs a real PostgreSQL to answer — that the DDL applies, that `pg_indexes`
 * reports the unique index, and that the policies actually deny a non-owner —
 * is `SchemaManager.export.postgres.test.js`, beside this file.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { resolveEngine, SchemaManager } = require('../../src/api/adapters/local-sql');

const engine = resolveEngine();

function freshManager() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brg004-export-'));
  const db = engine.open(path.join(dir, 'test.db'));
  const sm = new SchemaManager(db);
  sm.ensureSchemaTable();
  return { sm, db, dir };
}

/** A collection with one of everything the export has to carry. */
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

/** The security config shape the export reads, at the backend's own defaults. */
function defaultSecurity() {
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

const SUPABASE_OPTIONS = { security: defaultSecurity(), userIdClaim: 'nodegx_user_id' };

/** The refusal, or a failure naming what came back instead of one. */
function refusalFrom(fn) {
  try {
    fn();
  } catch (e) {
    if (e && e.code === 'CANNOT_CROSS') return e;
    throw e;
  }
  throw new Error('expected a CANNOT_CROSS refusal, and the export returned SQL instead');
}

describe('SchemaManager — the PostgreSQL export (BRG-004)', () => {
  let ctx;

  beforeEach(() => {
    ctx = freshManager();
  });

  afterEach(() => {
    try {
      ctx.db.close();
    } catch (e) {
      /* the engine may already be closed */
    }
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  describe('BRG-D2 — declared indexes cross, unique included', () => {
    it('emits every declared index under the name SQLite gave it', () => {
      ctx.sm.createTable(ITEM);
      const sql = ctx.sm.generatePostgresSQL();

      // The same derived name, so a reconcile on the other side agrees with
      // this one about which index is which.
      expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "idx_Item_guid" ON "Item" ("guid");');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS "idx_Item_published" ON "Item" ("published" DESC);');
    });

    it('does not make a non-unique declaration unique, or the reverse', () => {
      ctx.sm.createTable(ITEM);
      const sql = ctx.sm.generatePostgresSQL();
      expect(sql).not.toContain('CREATE UNIQUE INDEX IF NOT EXISTS "idx_Item_published"');
    });

    it('still emits the two built-in indexes', () => {
      ctx.sm.createTable({ name: 'Plain', columns: [{ name: 'a', type: 'String' }] });
      const sql = ctx.sm.generatePostgresSQL();
      expect(sql).toContain('"idx_Plain_createdAt"');
      expect(sql).toContain('"idx_Plain_updatedAt"');
    });
  });

  describe('BRG-D3 — relations cross', () => {
    it('emits the junction table under the name the adapter actually uses', () => {
      ctx.sm.createTable(ITEM);
      const sql = ctx.sm.generatePostgresSQL();

      // `_createJunctionTable` builds `_Join_<field>_<Class>`; anything else is
      // a table the adapter cannot find.
      const live = ctx.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '\\_Join\\_%' ESCAPE '\\'")
        .all()
        .map((r) => r.name);
      expect(live).toEqual(['_Join_tags_Item']);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "_Join_tags_Item" (');
      expect(sql).toContain('PRIMARY KEY ("owningId", "relatedId")');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS "idx__Join_tags_Item_owning"');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS "idx__Join_tags_Item_related"');
    });

    it('names the relation and its target, rather than dropping the column in silence', () => {
      ctx.sm.createTable(ITEM);
      const sql = ctx.sm.generatePostgresSQL();
      expect(sql).toContain('-- Relation: Item.tags -> Tag');
      // The column itself is NOT a column on either side: its rows live in the
      // junction table.
      expect(sql).not.toContain('"tags" ');
    });
  });

  describe('the column definitions', () => {
    it('carries required, defaults, and a GeoPoint the app can read back', () => {
      ctx.sm.createTable(ITEM);
      const sql = ctx.sm.generatePostgresSQL();
      expect(sql).toContain('"guid" TEXT NOT NULL');
      expect(sql).toContain('"score" NUMERIC DEFAULT 0');
      expect(sql).toContain('"published" TIMESTAMPTZ');
      // A GeoPoint is stored as a JSON string and read back as one. `POINT` was
      // a column the adapter could not have used.
      expect(sql).toContain('"where" JSONB');
    });

    it('every type SQLite stores as a column has a PostgreSQL type', () => {
      // The invariant BRG-D3 was a breach of, asserted rather than believed.
      const { sqlite, postgres } = SchemaManager.TYPE_MAPS;
      const missing = Object.keys(sqlite).filter((t) => sqlite[t] && !postgres[t]);
      expect(missing).toEqual([]);
    });

    it('refuses a type it has no PostgreSQL answer for, by name', () => {
      ctx.sm.createTable({ name: 'Item', columns: [{ name: 'published', type: 'Date' }] });
      const { postgres } = SchemaManager.TYPE_MAPS;
      const saved = postgres.Date;
      delete postgres.Date;
      try {
        const refusal = refusalFrom(() => ctx.sm.generatePostgresSQL());
        expect(refusal.construct).toBe('column type Date');
        expect(refusal.table).toBe('Item');
        expect(refusal.message).toContain('"published"');
      } finally {
        postgres.Date = saved;
      }
    });
  });

  describe('the updatedAt trigger', () => {
    it('is not emitted on the NodeGX path, where the app stamps the column itself', () => {
      ctx.sm.createTable(ITEM);
      expect(ctx.sm.generatePostgresSQL()).not.toContain('CREATE TRIGGER');
    });

    it('is emitted on the Supabase path, where a third party writes rows directly', () => {
      ctx.sm.createTable(ITEM);
      expect(ctx.sm.generateSupabaseSQL(SUPABASE_OPTIONS)).toContain('CREATE TRIGGER "touch_Item_updatedAt"');
    });
  });
});

describe('SchemaManager — the Supabase export (BRG-D1)', () => {
  let ctx;

  beforeEach(() => {
    ctx = freshManager();
    ctx.sm.createTable(ITEM);
  });

  afterEach(() => {
    try {
      ctx.db.close();
    } catch (e) {
      /* already closed */
    }
    fs.rmSync(ctx.dir, { recursive: true, force: true });
  });

  it('🔴 never emits USING (true) again', () => {
    const sql = ctx.sm.generateSupabaseSQL(SUPABASE_OPTIONS);
    expect(sql).not.toContain('USING (true)');
    expect(sql).not.toContain('WITH CHECK (true)');
    expect(sql).not.toContain('customize based on ACL');
  });

  it('translates the row ACL predicate the backend actually enforces', () => {
    const sql = ctx.sm.generateSupabaseSQL(SUPABASE_OPTIONS);
    // `buildAclPredicate`: a row with no ACL is public, and a row with one
    // qualifies when an entry keyed '*' or by this caller grants the access.
    expect(sql).toContain('"ACL" IS NULL OR EXISTS (');
    expect(sql).toContain("SELECT 1 FROM jsonb_each(\"ACL\") AS _acl");
    expect(sql).toContain("WHERE _acl.key IN ('*', (current_setting('request.jwt.claims', true)::jsonb ->> 'nodegx_user_id'))");
    expect(sql).toContain("AND (_acl.value ->> 'read') IN ('1', 'true')");
    expect(sql).toContain("AND (_acl.value ->> 'write') IN ('1', 'true')");
  });

  it('refuses without the CLP configuration', () => {
    const refusal = refusalFrom(() => ctx.sm.generateSupabaseSQL({ userIdClaim: 'sub' }));
    expect(refusal.construct).toBe('the CLP configuration');
  });

  it('refuses without an identity mapping, because ACL keys are NodeGX user ids', () => {
    const refusal = refusalFrom(() => ctx.sm.generateSupabaseSQL({ security: defaultSecurity() }));
    expect(refusal.construct).toBe('the identity mapping');
  });

  it('emits no policy at all for an operation the config gives to nobody', () => {
    const security = defaultSecurity();
    security.collections.Item = { permissions: { delete: 'nobody' } };
    const sql = ctx.sm.generateSupabaseSQL({ security, userIdClaim: 'nodegx_user_id' });

    expect(sql).not.toContain('FOR DELETE');
    expect(sql).toContain('-- No DELETE policy: security.json allows DELETE to nobody');
    // …and the others are still there, so this is a hole in one place and not
    // a table nobody can touch.
    expect(sql).toContain('"nodegx_Item_select" ON "Item" FOR SELECT TO authenticated');
  });

  it('grants a public rule to anon as well as authenticated', () => {
    const security = defaultSecurity();
    security.collections.Item = { permissions: { find: 'public', get: 'public' } };
    const sql = ctx.sm.generateSupabaseSQL({ security, userIdClaim: 'nodegx_user_id' });
    expect(sql).toContain('FOR SELECT TO anon, authenticated');
  });

  it('refuses a role-based collection permission', () => {
    const security = defaultSecurity();
    security.collections.Item = { permissions: { update: 'role:editor' } };
    const refusal = refusalFrom(() => ctx.sm.generateSupabaseSQL({ security, userIdClaim: 'nodegx_user_id' }));
    expect(refusal.construct).toBe('role-based collection permissions');
    expect(refusal.table).toBe('Item');
    expect(refusal.message).toContain('role:editor');
  });

  it('refuses when find and get differ, because PostgREST answers both with a SELECT', () => {
    const security = defaultSecurity();
    security.collections.Item = { permissions: { find: 'nobody', get: 'authenticated' } };
    const refusal = refusalFrom(() => ctx.sm.generateSupabaseSQL({ security, userIdClaim: 'nodegx_user_id' }));
    expect(refusal.construct).toBe('find and get differing');
  });

  it('refuses a table holding role-keyed row ACLs, with the count', () => {
    // The configuration says nothing about this: an administrator granting a
    // team access writes `role:editors` into the ROW.
    ctx.db
      .prepare('INSERT INTO "Item" ("objectId", "guid", "ACL") VALUES (?, ?, ?)')
      .run('a1', 'g1', JSON.stringify({ 'role:editors': { read: 1, write: 1 } }));
    ctx.db
      .prepare('INSERT INTO "Item" ("objectId", "guid", "ACL") VALUES (?, ?, ?)')
      .run('a2', 'g2', JSON.stringify({ 'role:editors': { read: 1 } }));
    ctx.db
      .prepare('INSERT INTO "Item" ("objectId", "guid", "ACL") VALUES (?, ?, ?)')
      .run('a3', 'g3', JSON.stringify({ u1: { read: 1, write: 1 } }));

    const refusal = refusalFrom(() => ctx.sm.generateSupabaseSQL(SUPABASE_OPTIONS));
    expect(refusal.construct).toBe('role-keyed row ACLs');
    expect(refusal.table).toBe('Item');
    expect(refusal.detail.rows).toBe(2);
    expect(refusal.message).toContain('role:editors');
  });

  it('does not refuse a table whose ACLs name only users and everyone', () => {
    ctx.db
      .prepare('INSERT INTO "Item" ("objectId", "guid", "ACL") VALUES (?, ?, ?)')
      .run('a1', 'g1', JSON.stringify({ '*': { read: 1 }, u1: { read: 1, write: 1 } }));
    expect(() => ctx.sm.generateSupabaseSQL(SUPABASE_OPTIONS)).not.toThrow();
  });
});
