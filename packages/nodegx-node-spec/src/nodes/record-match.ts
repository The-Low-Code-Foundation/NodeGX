/**
 * The LOCAL record matcher and sort — read from `packages/noodl-runtime/src/api/queryutils.ts` on 2026-10-02 (NSP-014
 * s24). Query Records (`DbCollection2`) runs these on a record another node wrote, to decide whether it belongs in the
 * rows it shows without asking the backend; Filter Records (`FilterDBModels`) runs them over the store.
 *
 * s25: also the visual filter's two lowerings (`toNeutral`, `lowerToParse`, queryutils.ts :278-306), moved here from Query Records — each names its own
 * parameter-port prefix (`qp-` Query Records, `fp-` Filter Records).
 *
 * A Parse `where` document (what the contract's `toParseWhere` lowers a neutral filter to), evaluated against a record
 * in the registry. Stated as the runtime has it, its quirks named where they sit:
 *   - loose equality on `$eq` / `$ne` (a filter parameter arriving as a string meets a number);
 *   - an operator with no branch matches (permissive, :356-362);
 *   - `$relatedTo` never matches (a relation cannot be resolved from one record, :399-400);
 *   - `$and` is read before `$or`, and either before the field keys: a document holding both reads only the first.
 */

import type { Filter } from '../../../nodegx-backend-contract/src/translators';
import { isVisualQueryFormat, savedFilterToNeutral, toParseWhere, visualQueryToNeutral, type SavedFilterGroup, type VisualQueryNode } from '../../../nodegx-backend-contract/src/translators';
import type { RecordRef } from '../registry';

type Where = Readonly<Record<string, unknown>>;

/** queryutils.ts :335-363 matchesOperator — one operator of a leaf condition. */
function matchesOperator(value: unknown, op: string, condition: Where): boolean {
  const operand = condition[op] as never;
  switch (op) {
    case '$eq':
      return operand && (operand as { __type?: unknown }).__type === 'Pointer' ? value === (operand as { objectId?: unknown }).objectId : value == operand;
    case '$ne':
      return value != operand;
    case '$lt':
      return (value as number) < operand;
    case '$lte':
      return (value as number) <= operand;
    case '$gt':
      return (value as number) > operand;
    case '$gte':
      return (value as number) >= operand;
    case '$exists':
      return operand === false ? value === undefined || value === null : value !== undefined && value !== null;
    case '$in':
      return Array.isArray(operand) && (operand as unknown[]).indexOf(value) !== -1;
    case '$nin':
      return Array.isArray(operand) && (operand as unknown[]).indexOf(value) === -1;
    case '$regex':
      if (value === undefined || value === null) return false;
      return new RegExp(operand, condition['$options'] as string | undefined).test(String(value));
    default:
      return true;
  }
}

/** queryutils.ts :375-411 matchesQuery — `undefined` matches every record. The parameter is `model`, as the runtime's: a non-record throws `model.get is not a function`, and Filter Records puts that sentence on Error (s25). */
export function matchesQuery(model: RecordRef, query: Where | undefined): boolean {
  if (query === undefined) return true;
  // every child is evaluated, none short-circuits (`forEach` with `&=` / `|=`): a child that throws throws however the others went
  if (query['$and'] !== undefined) return (query['$and'] as Where[]).reduce((all, q) => matchesQuery(model, q) && all, true);
  if (query['$or'] !== undefined) return (query['$or'] as Where[]).reduce((any, q) => matchesQuery(model, q) || any, false);
  let match = true;
  for (const k of Object.keys(query)) {
    const condition = query[k] as Where;
    if (k === 'objectId') {
      // :391-393 — only `$eq` and `$in` are read on the id
      if (condition['$eq'] !== undefined) match = model.getId() === condition['$eq'] && match; // `&=`: the id is read whatever `match` holds
      else if (condition['$in'] !== undefined) match = (condition['$in'] as unknown[]).indexOf(model.getId()) !== -1 && match;
    } else if (k === '$relatedTo') {
      match = false;
    } else {
      const value = model.get(k);
      // `$options` modifies `$regex`; it is not a condition of its own (:402-407)
      for (const op of Object.keys(condition)) if (op !== '$options') match = matchesOperator(value, op, condition) && match;
    }
  }
  return match;
}

/** queryutils.ts :414-430 compareObjects — a `-` prefix descends; values compared with `<` / `>`, so `undefined` ties. */
export function compareObjects(sort: readonly string[], a: RecordRef, b: RecordRef): number {
  for (const s of sort) {
    if (s[0] === '-') {
      const prop = s.substring(1);
      if ((a.get(prop) as never) > (b.get(prop) as never)) return -1;
      else if ((a.get(prop) as never) < (b.get(prop) as never)) return 1;
    } else {
      if ((a.get(s) as never) > (b.get(s) as never)) return 1;
      else if ((a.get(s) as never) < (b.get(s) as never)) return -1;
    }
  }
  return 0;
}

/** queryutils.ts :278-293 convertVisualFilterToNeutral — both saved shapes; an unresolved connected rule drops; `prefix` is stripped off a port name (:197-199). */
export function toNeutral(query: unknown, parameters: Readonly<Record<string, unknown>>, prefix: string): Filter | undefined {
  const neutral = isVisualQueryFormat(query as VisualQueryNode)
    ? visualQueryToNeutral(query as VisualQueryNode, { ...parameters })
    : savedFilterToNeutral(query as SavedFilterGroup, (portName) => parameters[portName.startsWith(prefix) ? portName.slice(prefix.length) : portName], { dropUnresolvedConnected: true });
  return neutral === null ? undefined : neutral;
}

/**
 * queryutils.ts :295-306 convertVisualFilter — the same filter lowered to Parse for the local matcher; it may THROW (a
 * refusal). The backend type is the legacy store's, which answers `nodegx` unconditionally (:157-169); a play's
 * project has no class schema cached (`schemaFor` → undefined), so `pointsTo` is refused. A document with no key is
 * no filter (:306).
 */
export function lowerToParse(neutral: Filter | undefined): Readonly<Record<string, unknown>> | undefined {
  if (neutral === undefined) return undefined;
  const where = toParseWhere(neutral, { backend: 'nodegx', schema: undefined }) as Record<string, unknown>;
  return Object.keys(where).length === 0 ? undefined : where;
}
