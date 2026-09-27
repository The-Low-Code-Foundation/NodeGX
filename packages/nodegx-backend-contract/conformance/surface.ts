/**
 * The storage surface, read off the interface file itself.
 *
 * BRG-003 §3.5 — the gate half. The gate's whole value is that it notices a
 * capability nobody told it about, so the list of capabilities may not be a
 * list somebody maintains: it is parsed from `src/storage.ts`, which is the
 * artefact every adapter is written against.
 *
 * 🔴 **Why a parse and not just `keyof`.** {@link ./coverage} keys its register
 * with mapped types over the three interfaces, so a member added with no entry
 * fails `tsc` naming it — that is the compile-time half and it is free. But a
 * checker fed its own register's keys can never disagree with itself, so it
 * would prove nothing and could not be tested. This module is the independent
 * reading that makes the runtime gate a real check: two sources, one artefact.
 *
 * ⚠️ **This module imports `typescript` and nothing else in `conformance/` may.**
 * The suite is imported at runtime by whoever runs it (`nodegx-backend` today,
 * BRG-005's Postgres file next), and dragging a compiler into that graph would
 * be a cost paid by every consumer to serve one CI check. `index.ts` does not
 * import this file; only the gate does.
 *
 * @module conformance/surface
 */

import * as fs from 'fs';
import * as path from 'path';

import * as ts from 'typescript';

/** The four interfaces of BRG-001, each read as its own list of names. */
export interface StorageSurface {
  /** `IStorageAdapter`'s own members — `connect`, `schemaManager`, … */
  adapter: readonly string[];
  /** `IStorageDataPlane` — the twelve callback-style calls the adapter also carries. */
  dataPlane: readonly string[];
  /** `IStorageSchema` — the schema surface. */
  schema: readonly string[];
  /** `IStorageFacade` — what everything else in the backend goes through. */
  facade: readonly string[];
}

/**
 * Everything callable on the adapter object: its own members plus the data
 * plane it extends. The suite's cases reach both through one reference, so the
 * gate checks them as one surface — which is also how `keyof IStorageAdapter`
 * sees it on the compile-time side.
 */
export function adapterMembers(surface: StorageSurface): readonly string[] {
  return [...new Set([...surface.adapter, ...surface.dataPlane])];
}

/** Where `storage.ts` sits relative to this file. */
export const STORAGE_SOURCE = path.join(__dirname, '..', 'src', 'storage.ts');

function membersOf(source: ts.SourceFile, name: string): readonly string[] {
  let found: ts.InterfaceDeclaration | undefined;
  source.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === name) found = node;
  });
  if (!found) {
    throw new Error(
      `interface ${name} is not declared in ${source.fileName} — the gate reads the surface from ` +
        'this file, so a rename here has to be a deliberate change to the gate too'
    );
  }
  return found.members
    .filter((m): m is ts.MethodSignature | ts.PropertySignature => ts.isMethodSignature(m) || ts.isPropertySignature(m))
    .map((m) => m.name.getText(source));
}

/**
 * Read the surface. No `ts.Program`, no type-checker and no tsconfig: the
 * question is *what names does this interface declare*, and a syntactic parse
 * answers it exactly while a program would need the package's whole build
 * configuration to be correct before the gate could run at all.
 */
export function readStorageSurface(sourcePath: string = STORAGE_SOURCE): StorageSurface {
  const text = fs.readFileSync(sourcePath, 'utf8');
  const source = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.ES2020, true);
  return {
    adapter: membersOf(source, 'IStorageAdapter'),
    dataPlane: membersOf(source, 'IStorageDataPlane'),
    schema: membersOf(source, 'IStorageSchema'),
    facade: membersOf(source, 'IStorageFacade')
  };
}
