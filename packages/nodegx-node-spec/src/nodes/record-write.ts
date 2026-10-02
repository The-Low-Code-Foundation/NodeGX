/**
 * What the two Record WRITES share (Create Record, Update Record) beyond record-base.ts — read from
 * `packages/noodl-runtime/src/nodes/std-library/data/dbmodelcrudbase.ts` on 2026-10-02 (NSP-014 s22): the mixins
 * `addInputProperties` (:657-727) and `addAccessControl` (:794-1029), with `_getCurrentUser` (:775-792).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE PROPERTY PORTS (:711-725): ANY port named `prop-<field>` is registered on its first write and stores its value
 * RAW under `<field>` — no type, no coercion, and no schema: the Class's schema only decides which ports the EDITOR
 * offers (`_additionalDynamicPorts`), never which the runtime accepts. So a project's schema is not world data here.
 * A value written `undefined` stays a key holding `undefined`.
 *
 * THE ACCESS RULES (:794-1029). `Access Control Rules` (edit-only, a list of `{ id, label }`) is stored raw; each rule
 * gets ports `acl-<id>-<field>` (`target`, `role`, `userid`, `read`, `write`), each stored raw under the rule's id by
 * SPLITTING the port name on `-` (:1022-1027). At the call, `_getACL` (:954-1021) builds the ACL the operation carries,
 * rule by rule, in the list's order — a later rule's key overwrites an earlier one's:
 *   - a rule no port has written: the signed-in user, read and write (:970-974) — nobody signed in, nothing;
 *   - Target unset is `user` (:994, NDA-012); `everyone` is `*`; `user` is the rule's User Id, else the signed-in
 *     user, else nothing (:999-1013, NDA-012); `role` is `role:` + the rule's Role, AS IS — a Role never written is
 *     the key `role:undefined` (:1015; row C35, NSP-014 §6.5 — the twin of NDA-012's `acl['undefined']`);
 *   - each entry is `{ read, write }`, an unwritten one `true` and a written one its value as written (:957-962);
 *   - no entry at all is NO ACL (`undefined`, :1020).
 *   Ports written for an id the list does not hold are kept and read by nothing.
 * THE SIGNED-IN USER (:775-792) is the LEGACY store's (`CloudStore.instance.currentUserId()`), whichever backend the
 * record goes to — world.ts BACKEND, USER: `WorldView.backendUser()`.
 */

import type { InputDecl, ValueInputDecl } from '../spec';

/** What the two writes hold of their property ports and their access rules. */
export type RecordWriteState = {
  /** `_internal.inputValues` (:697, :723-725) — field → the value its `prop-` port last took */
  inputValues: Readonly<Record<string, unknown>>;
  /** `_internal.accessControlRules` (:842-844) — the list, raw */
  accessControlRules: unknown;
  /** `_internal.accessControl` (:807, :1022-1027) — rule id → field → value */
  accessControl: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
};

export const RECORD_WRITE_STATE: RecordWriteState = { inputValues: {}, accessControlRules: undefined, accessControl: {} };

/** :815-845 — the list the panel holds. Weighted towards one rule: a rule is what makes the ACL say anything. */
export const ACCESS_CONTROL_INPUT = {
  type: 'proplist',
  coerce: 'none',
  editOnly: true,
  displayName: 'Access Control Rules',
  group: 'Access Control Rules',
  description:
    'Read and write rules stored on the record as it is written, each rule adding its own Target, Read and Write ports; the NodeGX backend enforces them on every query and every realtime event, and backends with no per-record access control ignore them',
  examples: [[{ id: 'a1', label: 'Owner' }], [{ id: 'a1', label: 'Owner' }], [{ id: 'a1', label: 'Owner' }, { id: 'a2', label: 'Team' }], []]
} as const;

/** :711-725 — a `prop-<field>` port. */
function propertyPort(field: string): ValueInputDecl {
  return { type: '*', coerce: 'none', displayName: field, group: 'Properties', examples: ['a', 'b', 1, 4, true, null] };
}

/** :851-938 — the ports one rule gets (the editor's builder; the runtime accepts any `acl-` name, :947-949). */
function aclPort(field: string): ValueInputDecl | undefined {
  switch (field) {
    case 'target':
      return { type: 'enum', enums: ['user', 'everyone', 'role'], default: 'user', coerce: 'none', editOnly: true, displayName: 'Target', group: 'Access Rule' };
    case 'role':
      return { type: 'string', coerce: 'none', displayName: 'Role', group: 'Access Rule', examples: ['admin', 'editor'] };
    case 'userid':
      return { type: 'string', coerce: 'none', displayName: 'User Id', group: 'Access Rule', examples: ['u2', 'u9', ''] };
    case 'read':
    case 'write':
      return { type: 'boolean', default: true, coerce: 'none', displayName: field === 'read' ? 'Read' : 'Write', group: 'Access Rule', examples: [false, true] };
    default:
      return undefined;
  }
}

/**
 * :851-938 `_additionalDynamicPorts` — the ports the EDITOR draws for each row of `Access Control Rules`: Target, then
 * User Id while Target is unset or `user` (or Role when it is `role`), then Read and Write — grouped under the row's label.
 * The runtime registers any `acl-` name on its first write regardless (`discoverWritePort`).
 */
export function aclInputs(params: Readonly<Record<string, unknown>>): Record<string, InputDecl> {
  const out: Record<string, InputDecl> = {};
  const rules = params.accessControl;
  if (!Array.isArray(rules)) return out;
  for (const ac of rules as ReadonlyArray<{ id: string; label?: string }>) {
    const prefix = 'acl-' + ac.id;
    const group = ac.label + ' Access Rule';
    const target = params[prefix + '-target'];
    out[prefix + '-target'] = { ...aclPort('target')!, group };
    if (target === 'role') out[prefix + '-role'] = { ...aclPort('role')!, group };
    else if (target === undefined || target === 'user') out[prefix + '-userid'] = { ...aclPort('userid')!, group };
    out[prefix + '-read'] = { ...aclPort('read')!, group };
    out[prefix + '-write'] = { ...aclPort('write')!, group };
  }
  return out;
}

/** The ports `addInputProperties` and `addAccessControl` register on first write; `undefined` for any other. */
export function discoverWritePort(port: string): InputDecl | undefined {
  if (port.startsWith('prop-')) return propertyPort(port.slice('prop-'.length));
  if (port.startsWith('acl-')) return aclPort(port.split('-')[2]);
  return undefined;
}

/** The property and rule ports the generator writes (rule `a1` is the one the pool's lists hold; `zz` none does). */
export const WRITE_CANDIDATES = ['prop-title', 'prop-title', 'prop-version', 'acl-a1-target', 'acl-a1-role', 'acl-a1-userid', 'acl-a1-read', 'acl-a1-write', 'acl-a2-target', 'acl-a2-write', 'acl-zz-target'];

/** :723-725 and :1022-1027 — a `prop-` or `acl-` port's write. */
export function onWritePort(s: Readonly<RecordWriteState>, port: string, value: unknown): Partial<RecordWriteState> {
  if (port.startsWith('prop-')) return { inputValues: { ...s.inputValues, [port.slice('prop-'.length)]: value } };
  const parts = port.split('-');
  return { accessControl: { ...s.accessControl, [parts[1]]: { ...(s.accessControl[parts[1]] ?? {}), [parts[2]]: value } } };
}

/** :954-1021 `_getACL`, with `user` the signed-in user (:964). */
export function aclFor(s: Readonly<RecordWriteState>, user: string | undefined): Record<string, { read: unknown; write: unknown }> | undefined {
  const acl: Record<string, { read: unknown; write: unknown }> = {};
  const rule = (r: Readonly<Record<string, unknown>>) => ({ read: r.read === undefined ? true : r.read, write: r.write === undefined ? true : r.write });
  if (s.accessControlRules !== undefined) {
    for (const r of s.accessControlRules as ReadonlyArray<{ id: string }>) {
      const written = s.accessControl[r.id];
      if (written === undefined) {
        if (user !== undefined) acl[user] = { write: true, read: true }; // :970-974
        continue;
      }
      const target = written.target === undefined ? 'user' : written.target; // :994
      if (target === 'everyone') acl['*'] = rule(written);
      else if (target === 'user') {
        const userId = written.userid || user; // :999
        if (userId !== undefined) acl[String(userId)] = rule(written); // :1013
      } else if (target === 'role') acl['role:' + String(written.role)] = rule(written); // :1015
    }
  }
  return Object.keys(acl).length > 0 ? acl : undefined;
}

/** Every Record failure's outcome, `n` times (record-base.ts THE FAILURE FUNNEL). */
export const failures = (n: number, code: string) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'failure' as const, error: code }));
export const dones = (n: number) => Array.from({ length: n }, () => ({ port: 'store' as const, outcome: 'done' as const }));
