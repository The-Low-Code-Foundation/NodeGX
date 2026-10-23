/**
 * P112 OWN-026 FIX-05 B — whose a record is, said where the graph decides it.
 *
 * The backend writes who made every record into `owner`, from the caller's own session, and drops
 * any `owner` a page sends (`nodegx-backend` `security/model.ts` `OWNER_FIELD`). Every OTHER field
 * holds whatever the record's creator chose to send. A stranger's agent built "let someone else see
 * my records" as an invitation row the page created, naming the group by a field it filled from the
 * signed-in user's id, and a cloud function that trusted that field: any signed-in caller who sent
 * another group's id read that group's records. Its own comment said there was nothing to forge.
 * The plain-code arm took the group from the session, which in code is the shortest path.
 *
 * Two infos, both said in the write's answer:
 *
 * 1. **`owner-sent-by-the-page`** — a Create Record or Update Record whose `prop-X` (X not `owner`)
 *    is the signed-in User's `id`, wired straight in or through up to three nodes, in a component
 *    that runs in the browser. The value is the page's word: anyone signed in can send another id.
 *    Silent in a cloud function, where the User node is the caller's session and the value is the
 *    server's.
 * 2. **`function-trusts-a-field-the-caller-wrote`** — a cloud function that reads records (Query
 *    Records, Record), answers per caller (a User node, or the Request's `userId`, wired into the
 *    graph), and reads `owner` nowhere: no parameter, script or wire names it. A record's other
 *    fields are its creator's word, and a function running as the system sees every record, the
 *    forged ones included. Silent when the project's rules say no caller creates or updates any
 *    collection it reads (`create` and `update` both `"nobody"`): then only the server wrote those
 *    fields (measured: the two template functions it fired on read `Member`, which only a function
 *    writes).
 *
 * **Info, never blocking.** A field set from the user's id can be a choice rather than a claim
 * (assigning a task to yourself), and a function can answer per caller about records nobody owns.
 * The graph cannot tell those apart; it can say so when the decision is made.
 *
 * Pure: the caller supplies nodes and wires. The walks stay inside the component.
 *
 * @module noodl-editor/validation/ownerField
 */

import { DiagnosticCode, type Diagnostic } from './diagnostics';
import type { FunctionWireLike } from './functionPorts';
import type { ParameterizedNode } from './parameterValues';
import { CLOUD_COMPONENT_PREFIX } from './runtimeContext';

/** The field the backend writes from the caller (`nodegx-backend` `OWNER_FIELD`). */
export const OWNER_FIELD = 'owner';
/** The signed-in user node, and its id output. */
export const USER_TYPE = 'net.noodl.user.User';
const USER_ID_OUTPUT = 'id';
/** A cloud function's Request node, and its caller's-id output. */
const REQUEST_TYPE = 'noodl.cloud.request';
const REQUEST_CALLER_OUTPUT = 'userId';
/** Create Record and Update Record. */
const RECORD_WRITE_TYPES = new Set(['NewDbModelProperties', 'SetDbModelProperties']);
/** Query Records and Record: the nodes a cloud function reads records with. */
const RECORD_READ_TYPES = new Set(['DbCollection2', 'DbModel2']);

const PROP = 'prop-';
const MAX_HOPS = 3;
/** `owner` as a word: a parameter, a script's `row.owner`, a port `prop-owner` / `qp-owner`. */
const NAMES_OWNER = /(^|[^A-Za-z0-9_$])owner(?![A-Za-z0-9_$])/;

function labelOf(node: ParameterizedNode | undefined): string {
  return node ? (node.label ? `"${node.label}"` : node.type) : '?';
}

/** The part of `nodegx.security.json` that says who may write a collection. */
export interface CollectionWriteRules {
  defaults?: { permissions?: Readonly<Record<string, unknown>> } | null;
  collections?: Readonly<Record<string, { permissions?: Readonly<Record<string, unknown>> } | null | undefined>> | null;
}

export interface CheckOwnerFieldOptions {
  /** Legacy name of the component being submitted. */
  component: string;
  /** Every connection in the component. */
  wires?: readonly FunctionWireLike[];
  /**
   * The project's collection rules. **`undefined` or `null` means "not known"**, and every collection is then read
   * as one a caller may write: the default rules let any signed-in user create, and so did the measured app's.
   */
  rules?: CollectionWriteRules | null;
}

/** Whether the rules say no caller creates or updates `collection` (both rules `"nobody"`). */
function serverOnly(rules: CollectionWriteRules | null | undefined, collection: string): boolean {
  if (!rules) return false;
  const nobody = (op: string) => {
    const own = rules.collections?.[collection]?.permissions?.[op];
    const rule = own !== undefined ? own : rules.defaults?.permissions?.[op];
    const atoms = Array.isArray(rule) ? rule : [rule];
    return atoms.length > 0 && atoms.every((a) => a === 'nobody');
  };
  return nobody('create') && nobody('update');
}

export function checkOwnerField(nodes: readonly ParameterizedNode[], options: CheckOwnerFieldOptions): Diagnostic[] {
  const { component, wires, rules } = options;
  if (!wires || wires.length === 0) return [];
  return component.startsWith(CLOUD_COMPONENT_PREFIX)
    ? functionTrustsAField(nodes, component, wires, rules)
    : ownerSentByThePage(nodes, component, wires);
}

/** Shape 1: a record write whose `prop-X` is the signed-in User's `id`, within {@link MAX_HOPS}. */
function ownerSentByThePage(
  nodes: readonly ParameterizedNode[],
  component: string,
  wires: readonly FunctionWireLike[]
): Diagnostic[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const into = (id: string) => wires.filter((w) => w.toId === id);

  /** The User node whose `id` reaches `nodeId`'s inputs (`port`, or any, past the first hop). */
  const userIdReaches = (nodeId: string, port: string | undefined, seen: Set<string>, hops: number): ParameterizedNode | undefined => {
    if (seen.has(nodeId)) return undefined;
    seen.add(nodeId);
    for (const wire of into(nodeId)) {
      if (port !== undefined && wire.toProperty !== port) continue;
      const from = byId.get(wire.fromId);
      if (!from) continue;
      if (from.type === USER_TYPE) {
        if (wire.fromProperty === USER_ID_OUTPUT) return from;
        continue;
      }
      if (hops < MAX_HOPS) {
        const hit = userIdReaches(from.id, undefined, seen, hops + 1);
        if (hit) return hit;
      }
    }
    return undefined;
  };

  const diagnostics: Diagnostic[] = [];
  for (const write of nodes) {
    if (!RECORD_WRITE_TYPES.has(write.type)) continue;
    const params = write.parameters ?? {};
    if (params['storeType'] === 'local') continue;
    const fields: string[] = [];
    for (const wire of into(write.id)) {
      if (!wire.toProperty.startsWith(PROP)) continue;
      const field = wire.toProperty.slice(PROP.length);
      if (field === OWNER_FIELD || fields.includes(field)) continue;
      if (userIdReaches(write.id, wire.toProperty, new Set(), 1)) fields.push(field);
    }
    if (fields.length === 0) continue;
    const quoted = fields.map((f) => `"${f}"`).join(', ');
    const collection = typeof params['collectionName'] === 'string' ? ` ${params['collectionName']}` : '';
    diagnostics.push({
      code: DiagnosticCode.OwnerSentByThePage,
      severity: 'info',
      message:
        `This page writes the signed-in user's id into ${quoted}, so ${quoted} is the caller's word: anyone signed ` +
        'in can send the same request with another id. The backend already writes who made every' +
        `${collection} record into "owner", from the caller's own session, and drops an "owner" a page sends. ` +
        `Wherever it is decided whose a record is or who it lets in (a query's filter, a cloud function), read ` +
        `"owner", not ${quoted}; leave ${quoted} out if it only repeats the creator (examples cloud-query-own-rows; ` +
        'cloud-share-my-records-with-someone to let someone else see them).',
      location: {
        component,
        nodeId: write.id,
        nodeType: write.type,
        ...(write.label ? { nodeLabel: write.label } : {}),
        port: PROP + fields[0],
        plug: 'input' as const
      },
      suggestion: `read "owner" instead of ${quoted}`
    });
  }
  return diagnostics;
}

/** Shape 2: a cloud function that reads records and answers per caller, and names `owner` nowhere. */
function functionTrustsAField(
  nodes: readonly ParameterizedNode[],
  component: string,
  wires: readonly FunctionWireLike[],
  rules: CollectionWriteRules | null | undefined
): Diagnostic[] {
  const user = nodes.find(
    (n) =>
      (n.type === USER_TYPE && wires.some((w) => w.fromId === n.id)) ||
      (n.type === REQUEST_TYPE && wires.some((w) => w.fromId === n.id && w.fromProperty === REQUEST_CALLER_OUTPUT))
  );
  if (!user) return [];
  const reads = nodes.filter((n) => RECORD_READ_TYPES.has(n.type));
  if (reads.length === 0) return [];
  const namesOwner =
    nodes.some((n) => NAMES_OWNER.test(JSON.stringify(n.parameters ?? {}))) ||
    wires.some((w) => NAMES_OWNER.test(w.fromProperty) || NAMES_OWNER.test(w.toProperty));
  if (namesOwner) return [];

  const collections = [
    ...new Set(
      reads.map((n) => (n.parameters ?? {})['collectionName']).filter((c): c is string => typeof c === 'string' && c !== '')
    )
  ];
  if (collections.length > 0 && collections.every((c) => serverOnly(rules, c))) return [];
  const what = collections.length > 0 ? collections.join(', ') : 'records';
  const first = reads[0];
  return [
    {
      code: DiagnosticCode.FunctionTrustsAFieldTheCallerWrote,
      severity: 'info',
      message:
        `This function reads ${what} as the system and answers per caller (${user.type === REQUEST_TYPE ? "the Request's userId" : labelOf(user)}), and nothing in it reads ` +
        '"owner". Every field of a record except "owner" is what its creator sent, and anyone signed in can create ' +
        'a record saying anything: another person\'s id, another group\'s, someone else\'s address. If a field here ' +
        'says whose a record is or whom it lets in, check it against the record\'s "owner", which the backend writes ' +
        'from the creator\'s session and nobody can change. A record whose field names someone its owner is not was ' +
        'written by somebody else.',
      location: {
        component,
        nodeId: first.id,
        nodeType: first.type,
        ...(first.label ? { nodeLabel: first.label } : {})
      },
      suggestion: 'compare each record\'s "owner" (row.owner in a Function) before trusting a field that names a person or group'
    }
  ];
}
