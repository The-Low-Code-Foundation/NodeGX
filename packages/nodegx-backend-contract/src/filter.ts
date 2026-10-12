/**
 * The neutral filter model.
 *
 * This is the one part of the contract that is genuinely *named* here rather
 * than transcribed. The vocabulary is not new — it is the long-form set that
 * `queryutils.ts::convertFilterOp` has always accepted — but until now it had
 * no name, no enumeration, and no statement of which backends can express it.
 *
 * **Why this vocabulary and not the other one.** Two filter models exist in the
 * repo and the phase spec believed they had converged. They had not:
 *
 * | | Saved shape | Operator names |
 * |---|---|---|
 * | Parse-wire | `{and:[…]}` / `{<field>:{equalTo:v}}` | `equalTo`, `greaterThan` — long-form, **neutral** |
 * | BYOB | `{id, type, conditions:[{field, operator, value}]}` | `_eq`, `_gt` — **Directus's wire names, stored verbatim in project data** |
 *
 * BYOB's own types file says so in its header: *"generates Directus-compatible
 * filter JSON"*. A model that spells its operators the way one vendor's API
 * spells them is that vendor's model, however good the UI on top of it is — and
 * BYOB's filter-builder UI is the better of the two. So: keep the builder,
 * re-target what it emits. BCN-003 owns that change and the one-shot migration
 * of saved filters that comes with it (see `DIRECTUS_OPERATOR_MIGRATION`).
 *
 * @module backend-contract/filter
 */

/**
 * Every operator in the neutral vocabulary.
 *
 * The set is a **union** of what the two existing models could express, not
 * either one of them. Neither covered the other: Parse has geo and `relatedTo`
 * that Directus cannot express; Directus has nine string operators and
 * `between`/`isEmpty` that Parse has no equivalent for.
 *
 * Two of those gaps are closed by *lowering* rather than gating — see
 * `LOWERED_OPERATORS`.
 */
export type FilterOperator =
  // Equality and comparison — every backend has these.
  | 'equalTo'
  | 'notEqualTo'
  | 'lessThan'
  | 'greaterThan'
  | 'lessThanOrEqualTo'
  | 'greaterThanOrEqualTo'
  // Set membership.
  | 'containedIn'
  | 'notContainedIn'
  // Presence. Note this is a *boolean-valued* operator (`{exists: true}`),
  // where Directus splits it into two nullary ones (`_null` / `_nnull`).
  | 'exists'
  // String matching. `matchesRegex` takes an optional sibling `options` key,
  // exactly as Parse's `$regex`/`$options` pair does.
  | 'matchesRegex'
  | 'contains'
  | 'notContains'
  | 'containsIgnoreCase'
  | 'startsWith'
  | 'notStartsWith'
  | 'startsWithIgnoreCase'
  | 'endsWith'
  | 'notEndsWith'
  | 'endsWithIgnoreCase'
  // Ranges.
  | 'between'
  | 'notBetween'
  // Empty string / empty array, which is not the same question as null.
  | 'isEmpty'
  | 'isNotEmpty'
  // Full-text. Distinct from the `search` option on a query — see the note on
  // `data.search` in `capabilities.ts`.
  | 'textSearch'
  // Relations. BCN-005 owns these.
  | 'pointsTo'
  | 'relatedTo'
  // A path through the data — several links, followed in one request. P116
  // ONT-004 owns it; see `PathFilter`.
  | 'path'
  // Identity. The primary-key field is named differently on every backend, so
  // these exist rather than making callers know it.
  | 'idEqualTo'
  | 'idContainedIn'
  // Geo. Parse-family only, and gated rather than lowered — there is no
  // useful approximation of "within this polygon" in a REST query string.
  | 'nearSphere'
  | 'withinBox'
  | 'withinPolygon';

export const FILTER_OPERATORS: readonly FilterOperator[] = Object.freeze([
  'equalTo',
  'notEqualTo',
  'lessThan',
  'greaterThan',
  'lessThanOrEqualTo',
  'greaterThanOrEqualTo',
  'containedIn',
  'notContainedIn',
  'exists',
  'matchesRegex',
  'contains',
  'notContains',
  'containsIgnoreCase',
  'startsWith',
  'notStartsWith',
  'startsWithIgnoreCase',
  'endsWith',
  'notEndsWith',
  'endsWithIgnoreCase',
  'between',
  'notBetween',
  'isEmpty',
  'isNotEmpty',
  'textSearch',
  'pointsTo',
  'relatedTo',
  'path',
  'idEqualTo',
  'idContainedIn',
  'nearSphere',
  'withinBox',
  'withinPolygon'
]);

/**
 * Operators a translator must **lower**, never gate, on backends that have no
 * native equivalent.
 *
 * The distinction matters more than it looks. `contains` has no Parse operator,
 * but `contains: "foo"` is `$regex: "foo"` and `between: [a, b]` is two
 * comparisons under an `and`. If those were declared `unsupported` on the
 * Parse-wire backends, a user on *our own built-in backend* would open the
 * filter builder and find half the string operators greyed out — which reads as
 * the product being broken, not as a backend limitation, and it would be right
 * to read it that way.
 *
 * So the rule for BCN-003: if an operator can be expressed in terms of
 * operators the backend does have, express it. Only declare `unsupported` when
 * there is genuinely no answer.
 */
export const LOWERED_OPERATORS: readonly FilterOperator[] = Object.freeze([
  'contains',
  'notContains',
  'containsIgnoreCase',
  'startsWith',
  'notStartsWith',
  'startsWithIgnoreCase',
  'endsWith',
  'notEndsWith',
  'endsWithIgnoreCase',
  'between',
  'notBetween'
]);

/** The value side of a leaf condition: exactly one operator, and its argument. */
export type OperatorAndValue = {
  [K in FilterOperator]?: unknown;
} & {
  /** Regex flags, carried alongside `matchesRegex` as Parse's `$options` is. */
  options?: string;
};

/**
 * A filter node.
 *
 * Exactly one key per node — `convertFilterOp` errors on more, and has since
 * before this contract existed, so the constraint is load-bearing rather than
 * aspirational. It cannot be expressed in TypeScript without making the type
 * unusable, so it is stated here and enforced by the translators.
 */
export type Filter =
  | { and: Filter[] }
  | { or: Filter[] }
  | { idEqualTo: string }
  | { idContainedIn: string[] }
  | { relatedTo: RelatedToFilter }
  | { path: PathFilter }
  | { [field: string]: OperatorAndValue | Filter[] | string | string[] | RelatedToFilter | PathFilter };

/**
 * `relatedTo` is the one filter shape that names a Parse concept in the
 * contract. It is kept because Parse's `Relation` has no junction table to
 * query and so cannot be expressed as an ordinary field condition — the
 * alternative was leaving Parse's relations unfilterable. BCN-005 decides
 * whether the other backends implement it over their junction tables or declare
 * it `unsupported`.
 */
export interface RelatedToFilter {
  /** Id of the record holding the relation. */
  id: string;
  /** The relation field on that record. */
  key: string;
  /**
   * Collection the relation points at. Optional on Parse only, where it can be
   * recovered from a preloaded pointer; every other backend needs it stated.
   */
  className?: string;
}

/**
 * `path` — a question that crosses several links, answered in one request.
 *
 * P116 ONT-004. "The members on my account's companies" is a path: from me,
 * to the account I hold, to its company, to the people employed there. Until
 * this operator the contract followed ONE link (`pointsTo`, `relatedTo`), so
 * every such question was answered in application code after fetching too
 * much — which is where a membership business's dashboard answers them today.
 *
 * **This operator is designed, not extracted.** The fourteen data methods were
 * transcribed from `cloudstore.js` and the README says so; the filter model is
 * the one part of the contract that was named here rather than copied, which is
 * why a path is an operator and not a fifteenth method. An operator composes:
 * the end rows take the rest of the query (sort, limit, count, the row ACL,
 * `include`) for free, and a collection rule that narrows what a person may see
 * is the same operator ANDed into the same statement — one request, counted
 * once.
 *
 * ## What it means, pinned by the conformance suite (`conformance/cases/paths.ts`)
 *
 * 1. **Read from the end.** The path starts at `from` (a collection and the rows
 *    of it to start from) and takes `hops` in order; the LAST hop must land on
 *    the collection being queried, and the operator keeps the rows the path
 *    reaches. A row reached twice is returned once.
 * 2. **A hop is one link, either way round.** `{ follow }` reads a Link, a
 *    Links or a list field on the current rows and goes to what it names;
 *    `{ from, by }` goes to the rows of `from` whose field `by` names the
 *    current rows — the same edge read backwards. Each hop may carry a
 *    `where` that narrows THAT hop's rows ("as a holder").
 * 3. **The caller's row ACL applies at every hop.** A row the caller may not
 *    read is not walked through, for any purpose. The end rows are then
 *    filtered as any query's are.
 * 4. **Depth is bounded, always.** `maxDepth` is mandatory, at most
 *    {@link MAX_PATH_DEPTH}, and a path with more hops than it is refused
 *    before anything runs. One hop may `repeat` (a tree: "every topic under
 *    this one"); it takes whatever depth the other hops leave, and a cycle in
 *    the data ends at the bound rather than running.
 * 5. **A path inside a path is refused.** A hop's `where` is an ordinary filter.
 *
 * A backend whose cell for `path` is `unsupported` refuses the request by
 * name; nothing lowers a path to one hop, because a one-hop answer to a
 * five-hop question is the wrong rows with a green tick.
 */
export interface PathFilter {
  /** Where the path starts. */
  from: {
    collection: string;
    /** The rows of that collection to start from; absent = every row the caller may read. */
    where?: Filter;
  };
  /** The hops, in order, from the start to the collection being queried. At least one. */
  hops: PathHop[];
  /** The most hops the path may take, counting a repeated hop each time it is taken. 1 … {@link MAX_PATH_DEPTH}. */
  maxDepth: number;
}

/**
 * One hop. Exactly one of the two shapes.
 *
 * `to` on a `follow` names the collection on the other end; it may be omitted
 * when the field is a declared Link or Links, whose target the adapter knows.
 * A field that is not a declared link (a text field holding ids, which is what
 * every relation in the in-repo corpus is) can still be followed, but only
 * with `to` said — the adapter cannot guess it, and must not.
 */
export type PathHop =
  | {
      /** A Link, Links or list field on the current rows. */
      follow: string;
      /** The collection it names. Optional only when the field is a declared Link or Links. */
      to?: string;
      /** Narrows the rows this hop lands on. */
      where?: Filter;
      /** Take this hop again and again, up to the depth left. The hop must land on the collection it starts from. */
      repeat?: boolean;
    }
  | {
      /** The collection to go to: its rows whose field `by` names the current rows. */
      from: string;
      /** A Link or Links field on `from`. A list field cannot be read this way round. */
      by: string;
      where?: Filter;
      repeat?: boolean;
    };

/**
 * The most hops any path may take, on any backend. A denial-of-service shape
 * needs a number, not a convention: the deepest real path on this machine is
 * five (ONT-000), the deepest permission rule four, and a request above this
 * is refused by name before anything runs.
 */
export const MAX_PATH_DEPTH = 8;

const NAME_RULE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Why a value is not a well-formed `PathFilter`, or `null` when it is.
 *
 * One validator for the neutral model, the storage wire (`$path`) and a
 * collection rule, so the three cannot disagree about what a path is. It
 * checks shape and bounds only — whether a field is a link, and whether the
 * last hop lands on the queried collection, is the adapter's to say, because
 * only it holds the schema.
 */
export function pathProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return 'a path must be an object with from, hops and maxDepth';
  const p = value as Record<string, unknown>;
  for (const k of Object.keys(p)) if (k !== 'from' && k !== 'hops' && k !== 'maxDepth') return `a path has no "${k}"`;
  const from = p.from as Record<string, unknown> | undefined;
  if (!from || typeof from !== 'object' || Array.isArray(from)) return 'a path needs "from": { collection, where? }';
  if (typeof from.collection !== 'string' || !NAME_RULE.test(from.collection))
    return 'the path\'s "from.collection" must name a collection';
  for (const k of Object.keys(from)) if (k !== 'collection' && k !== 'where') return `"from" has no "${k}"`;
  if (from.where !== undefined && (!from.where || typeof from.where !== 'object' || Array.isArray(from.where)))
    return '"from.where" must be a filter object';
  if (from.where && hasPath(from.where as Record<string, unknown>)) return 'a path inside a path is not allowed';
  if (!Number.isInteger(p.maxDepth) || (p.maxDepth as number) < 1 || (p.maxDepth as number) > MAX_PATH_DEPTH)
    return `"maxDepth" must be a whole number from 1 to ${MAX_PATH_DEPTH}`;
  if (!Array.isArray(p.hops) || p.hops.length === 0) return 'a path needs at least one hop';
  if (p.hops.length > (p.maxDepth as number))
    return `the path has ${p.hops.length} hops and "maxDepth" allows ${p.maxDepth}`;
  let repeats = 0;
  for (let i = 0; i < p.hops.length; i++) {
    const h = p.hops[i] as Record<string, unknown>;
    const at = `hop ${i + 1}`;
    if (!h || typeof h !== 'object' || Array.isArray(h)) return `${at} must be an object`;
    const isFollow = 'follow' in h;
    const isBack = 'from' in h || 'by' in h;
    if (isFollow === isBack) return `${at} must be { follow } or { from, by }, not both and not neither`;
    const allowed = isFollow ? ['follow', 'to', 'where', 'repeat'] : ['from', 'by', 'where', 'repeat'];
    for (const k of Object.keys(h)) if (!allowed.includes(k)) return `${at} has no "${k}"`;
    if (isFollow && (typeof h.follow !== 'string' || !NAME_RULE.test(h.follow)))
      return `${at}: "follow" must name a field`;
    if (isFollow && h.to !== undefined && (typeof h.to !== 'string' || !NAME_RULE.test(h.to)))
      return `${at}: "to" must name a collection`;
    if (!isFollow && (typeof h.from !== 'string' || !NAME_RULE.test(h.from)))
      return `${at}: "from" must name a collection`;
    if (!isFollow && (typeof h.by !== 'string' || !NAME_RULE.test(h.by))) return `${at}: "by" must name a field`;
    if (h.where !== undefined && (!h.where || typeof h.where !== 'object' || Array.isArray(h.where)))
      return `${at}: "where" must be a filter object`;
    if (h.where && hasPath(h.where as Record<string, unknown>)) return 'a path inside a path is not allowed';
    if (h.repeat !== undefined && h.repeat !== true) return `${at}: "repeat" is true or absent`;
    if (h.repeat === true) repeats += 1;
  }
  if (repeats > 1) return 'only one hop of a path may repeat';
  return null;
}

/** True when a filter object carries a `path` or `$path` key anywhere in it. */
function hasPath(where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (k === 'path' || k === '$path') return true;
    if (Array.isArray(v)) {
      for (const x of v) if (x && typeof x === 'object' && hasPath(x as Record<string, unknown>)) return true;
    } else if (v && typeof v === 'object' && hasPath(v as Record<string, unknown>)) return true;
  }
  return false;
}

/**
 * Directus operator → neutral operator, for BCN-003's one-shot migration of
 * saved BYOB filters.
 *
 * All 24 operators the BYOB filter builder can emit
 * (`ByobFilterBuilder/operators.ts`). Two are not one-to-one and are the only
 * interesting rows in the table:
 *
 * - `_null` / `_nnull` are nullary; `exists` is boolean-valued. The migration
 *   must write `{exists: false}` and `{exists: true}` respectively, not just
 *   rename the key.
 * - `_between` / `_nbetween` carry two values in an array. The neutral operator
 *   keeps that shape, so those two *are* plain renames — but only because
 *   `between` was defined to match rather than being lowered at rest.
 *
 * Everything else is a rename. That is what makes the migration worth doing
 * rather than accepting the break: it is mechanical, it is total, and the
 * NodeGX QA fixture's saved filters go through it.
 */
export const DIRECTUS_OPERATOR_MIGRATION: Readonly<
  Record<string, { operator: FilterOperator; value?: 'literal' | 'true' | 'false' }>
> = Object.freeze({
  _eq: { operator: 'equalTo' },
  _neq: { operator: 'notEqualTo' },
  _gt: { operator: 'greaterThan' },
  _gte: { operator: 'greaterThanOrEqualTo' },
  _lt: { operator: 'lessThan' },
  _lte: { operator: 'lessThanOrEqualTo' },
  _contains: { operator: 'contains' },
  _ncontains: { operator: 'notContains' },
  _icontains: { operator: 'containsIgnoreCase' },
  _starts_with: { operator: 'startsWith' },
  _nstarts_with: { operator: 'notStartsWith' },
  _istarts_with: { operator: 'startsWithIgnoreCase' },
  _ends_with: { operator: 'endsWith' },
  _nends_with: { operator: 'notEndsWith' },
  _iends_with: { operator: 'endsWithIgnoreCase' },
  _in: { operator: 'containedIn' },
  _nin: { operator: 'notContainedIn' },
  _null: { operator: 'exists', value: 'false' },
  _nnull: { operator: 'exists', value: 'true' },
  _between: { operator: 'between' },
  _nbetween: { operator: 'notBetween' },
  _empty: { operator: 'isEmpty' },
  _nempty: { operator: 'isNotEmpty' },
  _regex: { operator: 'matchesRegex' }
});
