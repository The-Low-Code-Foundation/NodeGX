/**
 * What a role unlocks (BMG-005 §3.2), derived from the stored security config
 * — the inverse of BMG-006's matrix, built once as a pure function so the
 * Roles page, its delete warning and the Permissions page read the same answer.
 *
 * "Stored" is the point: a rule names a role only where `security.json` says
 * `role:<name>`. A graph's own `Allow Unauthenticated` can resolve a function to
 * `public` or `authenticated`, never to a role (`effectiveFunctionRule`), so the
 * config is the whole of where a role can be named. An operation a collection
 * does not set falls back to the defaults; that fallback is its own row
 * (*every collection without a rule of its own*), never folded into a
 * collection's row, so a row lists exactly the rules that are written there.
 */

type Rule = string | string[] | undefined;

/** The slice of `SecurityConfig` this reads. Loose on purpose: the page receives it as JSON. */
export interface RoleConfig {
  defaults?: { permissions?: Record<string, Rule> };
  collections?: Record<string, { permissions?: Record<string, Rule> } | undefined>;
  functions?: Record<string, { call?: Rule } | undefined>;
  files?: Record<string, Rule>;
  signup?: Rule;
}

export type RoleUseKind = 'collection' | 'defaults' | 'function' | 'files' | 'signup';

/** One place that names the role, with the operations it grants there. */
export interface RoleUse {
  kind: RoleUseKind;
  /** The collection or function name; absent for defaults, files and signup. */
  name?: string;
  /** Operation keys as stored (`find`, `update`, `call`, `upload`, …), in the order the page shows them. */
  ops: string[];
}

/** Collection operations, in the order a person meets them, with the words the page uses. */
export const COLLECTION_OPS: Array<[string, string]> = [
  ['find', 'list'],
  ['get', 'open'],
  ['create', 'create'],
  ['update', 'change'],
  ['delete', 'delete']
];
const FILE_OPS: Array<[string, string]> = [
  ['upload', 'upload'],
  ['read', 'open'],
  ['delete', 'delete']
];

/** Does this stored rule name the role? A rule is one atom or a list of atoms (OR). */
export function ruleNames(rule: Rule, role: string): boolean {
  if (rule === undefined) return false;
  const atom = 'role:' + role;
  return Array.isArray(rule) ? rule.indexOf(atom) !== -1 : rule === atom;
}

function opsNaming(rules: Record<string, Rule> | undefined, order: Array<[string, string]>, role: string): string[] {
  if (!rules) return [];
  return order.map(([op]) => op).filter((op) => ruleNames(rules[op], role));
}

/**
 * Every place the stored config names `role:<role>`. Collections and functions
 * sorted by name; defaults first among collection rows, files and signup last.
 */
export function roleUses(config: RoleConfig | null | undefined, role: string): RoleUse[] {
  if (!config) return [];
  const out: RoleUse[] = [];
  const defaults = opsNaming(config.defaults && config.defaults.permissions, COLLECTION_OPS, role);
  if (defaults.length) out.push({ kind: 'defaults', ops: defaults });
  const collections = config.collections || {};
  for (const name of Object.keys(collections).sort()) {
    const entry = collections[name];
    const ops = opsNaming(entry && entry.permissions, COLLECTION_OPS, role);
    if (ops.length) out.push({ kind: 'collection', name, ops });
  }
  const functions = config.functions || {};
  for (const name of Object.keys(functions).sort()) {
    const entry = functions[name];
    if (entry && ruleNames(entry.call, role)) out.push({ kind: 'function', name, ops: ['call'] });
  }
  const files = opsNaming(config.files, FILE_OPS, role);
  if (files.length) out.push({ kind: 'files', ops: files });
  if (ruleNames(config.signup, role)) out.push({ kind: 'signup', ops: ['signup'] });
  return out;
}

/** How many stored rules name the role — one per operation per place. What *Delete* warns with. */
export function ruleCount(uses: RoleUse[]): number {
  return uses.reduce((n, u) => n + u.ops.length, 0);
}

/** The words for one operation of one kind of place. */
export function opWord(kind: RoleUseKind, op: string): string {
  const order = kind === 'files' ? FILE_OPS : COLLECTION_OPS;
  const hit = order.find(([key]) => key === op);
  if (hit) return hit[1];
  if (op === 'call') return 'call';
  if (op === 'signup') return 'sign up';
  return op;
}

/** Where a use is, in words: *Pet*, *every collection without its own rule*, *the sendInvoice function*. */
export function placeWords(use: RoleUse): string {
  switch (use.kind) {
    case 'collection':
      return use.name || '';
    case 'defaults':
      return 'Every collection without a rule of its own';
    case 'function':
      return 'The ' + use.name + ' function';
    case 'files':
      return 'Files';
    case 'signup':
      return 'Signing up';
  }
}

/** One use as a sentence: *Pet: list, open, change*. */
export function useSentence(use: RoleUse): string {
  return placeWords(use) + ': ' + use.ops.map((op) => opWord(use.kind, op)).join(', ');
}

/**
 * The counts the Roles list shows. The defaults row is not "a collection": it is
 * every collection that has no rule of its own, so it is its own flag.
 */
export function useCounts(uses: RoleUse[]): { defaults: boolean; collections: number; functions: number; other: number } {
  const out = { defaults: false, collections: 0, functions: 0, other: 0 };
  for (const u of uses) {
    if (u.kind === 'defaults') out.defaults = true;
    else if (u.kind === 'collection') out.collections++;
    else if (u.kind === 'function') out.functions++;
    else out.other++;
  }
  return out;
}

/** Where the Permissions page shows a use (BMG-006 owns that page; its hash is `#/permissions/<collection>`). */
export function useHref(use: RoleUse): string {
  return use.kind === 'collection' && use.name ? '#/permissions/' + encodeURIComponent(use.name) : '#/permissions';
}
