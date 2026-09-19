/**
 * The PostgreSQL DDL for one collection — BRG-004's generator, as a function.
 *
 * BRG-005 §6.2 said the adapter's `PgSchemaManager` *"reuses BRG-004's repaired
 * `generatePostgresSQL` rather than growing a second generator"*. That
 * generator was a loop inside a method of the SQLite `SchemaManager`, over
 * every table it could read; the adapter needs the same DDL for **one** table it
 * is about to create. So the loop body moved here, unchanged, and both callers
 * now emit it: `generatePostgresSQL` joins these lines into the `.sql` file the
 * migrator writes, and `PgSchemaManager.createTable` runs them. A table the
 * migrator creates and a table the adapter creates on first write are
 * therefore the same table, line for line — which is the only reason a
 * database can be filled by one and then served by the other.
 *
 * The text is byte-identical to what the loop emitted before it moved.
 * `SchemaManager.export.test.js` and its `.postgres.` sibling are the proof;
 * neither changed.
 *
 * @module adapters/postgres/ddl
 */

import {
  builtInIndexNames,
  indexName,
  junctionTableName,
  MigrationRefusal,
  normalizeIndexDecls,
  POSTGRES_TYPE_MAP,
  quoteLiteral,
  sanitizeIdent,
  TYPE_MAP,
  type SchemaColumn,
  type TableSchema
} from '../local-sql/schemaCommon';
import { escapeColumn, escapeTable } from '../local-sql/QueryBuilder';

/**
 * One relation column as the junction table it is actually stored in.
 *
 * The name is reproduced EXACTLY as the SQLite adapter builds it, down to the
 * same sanitisation, rather than given a nicer one: the junction table's name
 * is the adapter's private convention, and a junction the adapter cannot find
 * by name is a relation that does not traverse on the other side.
 *
 * A `Relation` column with no `targetClass` has no junction table in SQLite
 * either — nothing was stored, so there is nothing to carry.
 */
export function relationJunctions(schema: TableSchema): Array<{ table: string; field: string; targetClass: string }> {
  const out: Array<{ table: string; field: string; targetClass: string }> = [];
  for (const col of schema.columns || []) {
    if (col.type === 'Relation' && col.targetClass) {
      out.push({
        table: junctionTableName(sanitizeIdent(schema.name), sanitizeIdent(col.name)),
        field: col.name,
        targetClass: col.targetClass
      });
    }
  }
  return out;
}

/** One column definition, in Postgres, or a refusal naming the type. */
export function columnToPostgres(schema: TableSchema, col: SchemaColumn): string | null {
  if (col.type === 'Relation') return null; // carried by a junction table

  const sqliteType = TYPE_MAP[col.type];
  if (!sqliteType) {
    // Not a column on this side either — `_columnToSQL` returns null for it,
    // so SQLite holds nothing to carry. Parity, not a loss.
    return null;
  }

  const pgType = POSTGRES_TYPE_MAP[col.type];
  if (!pgType) {
    // A type SQLite stores and this map has no answer for. That is BRG-D3's
    // exact shape — a column that silently is not there on the other side —
    // and it is the drift a future type will arrive as.
    throw new MigrationRefusal(
      `Column "${col.name}" on "${schema.name}" is a ${col.type}, and this export has no PostgreSQL ` +
        `type for it. It is stored on SQLite, so exporting the table without it would lose data silently.`,
      `column type ${col.type}`,
      schema.name
    );
  }

  let def = `${escapeColumn(col.name)} ${pgType}`;
  if (col.required) def += ' NOT NULL';
  if (col.defaultValue !== undefined) {
    // Dropped entirely before this task: a column declared with a default
    // arrived on the other side without one.
    if (typeof col.defaultValue === 'string') {
      def += ` DEFAULT ${quoteLiteral(col.defaultValue)}`;
    } else if (typeof col.defaultValue === 'boolean') {
      def += ` DEFAULT ${col.defaultValue ? 'TRUE' : 'FALSE'}`;
    } else if (typeof col.defaultValue === 'number') {
      def += ` DEFAULT ${col.defaultValue}`;
    } else {
      throw new MigrationRefusal(
        `The default value declared for "${col.name}" on "${schema.name}" is a ` +
          `${Array.isArray(col.defaultValue) ? 'array' : typeof col.defaultValue}, which this export cannot write ` +
          'as a PostgreSQL default.',
        'column default value',
        schema.name
      );
    }
  }
  return def;
}

/** The junction table DDL, as lines — shared by the table DDL and by a relation added after the fact. */
export function junctionDDL(junctionTable: string): string[] {
  const jt = escapeTable(junctionTable);
  return [
    `CREATE TABLE IF NOT EXISTS ${jt} (`,
    '  "owningId" TEXT NOT NULL,',
    '  "relatedId" TEXT NOT NULL,',
    '  PRIMARY KEY ("owningId", "relatedId")',
    ');',
    // No foreign keys, for the same reason SQLite has none here: the
    // adapter deletes a record without touching its junction rows, and an
    // FK would turn a copy of that state into a failed insert.
    `CREATE INDEX IF NOT EXISTS "idx_${junctionTable}_owning" ON ${jt}("owningId");`,
    `CREATE INDEX IF NOT EXISTS "idx_${junctionTable}_related" ON ${jt}("relatedId");`
  ];
}

/** The `CREATE INDEX` for one declared index, under the derived name. */
export function declaredIndexDDL(tableName: string, decl: { fields: string[]; unique?: boolean; order?: 'asc' | 'desc' }): string {
  const name = indexName(tableName, decl.fields);
  const cols = decl.fields.map((f) => `${escapeColumn(f)}${decl.order === 'desc' ? ' DESC' : ''}`).join(', ');
  return `CREATE${decl.unique ? ' UNIQUE' : ''} INDEX IF NOT EXISTS "${name}" ON ${escapeTable(tableName)} (${cols});`;
}

/**
 * PostgreSQL DDL for one collection: columns, the two built-in indexes,
 * **every declared index including `unique`** (BRG-D2) and **every relation's
 * junction table** (BRG-D3). Lines, with the comments the `.sql` file carries;
 * joined with `\n` they are one multi-statement script.
 *
 * @throws MigrationRefusal — `code: 'CANNOT_CROSS'` — for anything it will
 *   not approximate.
 */
export function tableDDL(schema: TableSchema, options: { touchTrigger?: boolean } = {}): string[] {
  const out: string[] = [];
  const table = escapeTable(schema.name);
  out.push(`-- Collection: ${schema.name}`);

  const columnDefs = [
    '"objectId" TEXT PRIMARY KEY',
    '"createdAt" TIMESTAMPTZ DEFAULT NOW()',
    '"updatedAt" TIMESTAMPTZ DEFAULT NOW()',
    '"ACL" JSONB'
  ];
  for (const col of schema.columns || []) {
    const def = columnToPostgres(schema, col);
    if (def) columnDefs.push(def);
  }

  out.push(`CREATE TABLE IF NOT EXISTS ${table} (`);
  out.push(`  ${columnDefs.join(',\n  ')}`);
  out.push(');');
  out.push('');

  // The two indexes every table gets on creation, under the SAME names
  // `builtInIndexNames` uses, so a reconcile on the other side agrees with
  // this one about which indexes it did not create.
  const builtIn = builtInIndexNames(schema.name);
  out.push(`CREATE INDEX IF NOT EXISTS "${builtIn[0]}" ON ${table}("createdAt");`);
  out.push(`CREATE INDEX IF NOT EXISTS "${builtIn[1]}" ON ${table}("updatedAt");`);

  // BRG-D2. FED-002 landed an index declaration in phase 96 and this export
  // kept emitting the two above and nothing else — so a collection whose
  // `id` is `unique: true` arrived as a table with no unique constraint and
  // the dedupe guarantee silently stopped being one.
  const declared = normalizeIndexDecls(schema.indexes);
  for (const decl of declared) {
    out.push(declaredIndexDDL(schema.name, decl));
  }
  out.push('');

  // BRG-D3. `Relation: null` in the type map plus `if (pgType)` meant a
  // relation column was skipped with no warning, no comment and no error —
  // and the junction table holding its rows was never mentioned at all.
  for (const j of relationJunctions(schema)) {
    out.push(`-- Relation: ${schema.name}.${j.field} -> ${j.targetClass}`);
    out.push(...junctionDDL(j.table));
    out.push('');
  }

  if (options.touchTrigger) {
    // Only ever emitted for a database a third party writes directly
    // (`generateSupabaseSQL`). On the NodeGX path the app stamps
    // `updatedAt` itself, and a trigger doing it again would overwrite the
    // value the app just wrote — a divergence between what a caller writes
    // and what it reads back, which is the whole failure mode of this phase.
    out.push(`CREATE OR REPLACE FUNCTION nodegx_touch_updated_at()`);
    out.push(`RETURNS TRIGGER AS $$`);
    out.push(`BEGIN`);
    out.push(`  NEW."updatedAt" = NOW();`);
    out.push(`  RETURN NEW;`);
    out.push(`END;`);
    out.push(`$$ LANGUAGE plpgsql;`);
    out.push('');
    out.push(`DROP TRIGGER IF EXISTS "touch_${sanitizeIdent(schema.name)}_updatedAt" ON ${table};`);
    out.push(`CREATE TRIGGER "touch_${sanitizeIdent(schema.name)}_updatedAt" BEFORE UPDATE ON ${table}`);
    out.push(`  FOR EACH ROW EXECUTE FUNCTION nodegx_touch_updated_at();`);
    out.push('');
  }

  return out;
}
