/**
 * P107-S86-STOREDWIRE — the outputs ERG-001 renamed, so a wire drawn before the rename still connects.
 *
 * ERG-001 (2026-08-02) gave every action node one outcome vocabulary (`done`, `failure`, `unchanged`, `completed`) and
 * renamed the old per-node names onto it: Set Object Properties' `stored`, Log In's `success`, Send Email's `sent` and
 * `failed`, and so on. It migrated the wires in this repo (`library/prefabs`, the examples, one fixture) and nothing
 * else, so a project that had imported a prefab, or was drawn by hand, before that day still wires the old name. The
 * runtime registers no such port, the wire is dropped when the component is built, and the signal never fires: in 22
 * copies of CMG Drive Looks the Multi Choice filter's Selection Changed is dead for exactly this reason.
 *
 * ## Who reads this table
 *
 * - **The runtime** (`NodeScope.addConnection` / `removeConnection`): a wire from a port the node does not have, whose
 *   name is listed here for its type, connects to the new name. That is the path every running app takes — the
 *   editor's viewer, `@nodegx/preview`, a deployed app, the cloud runtime — whoever opened the file.
 * - **The editor's load** (`applyPatches`, {@link applyRenamedPortMigration}): the wire is renamed in the project as it
 *   opens, so the canvas draws it on the right port and the next save writes the new name.
 * - **The validator** (`nonexistentPort`): an agent that writes an old name is told the new one.
 *
 * ## Which renames are here, and which cannot be
 *
 * Measured, not recalled: every output in the node catalog before ERG-001 (`packages/noodl-types/src/node-catalog.json`
 * at 7cb235279, 2026-07-31) that the catalog no longer lists, against the outputs added beside it. Nothing was renamed
 * before that catalog's first version (2026-07-23) that it does not show. `renamed-ports.test.ts` holds the table to
 * the current catalog both ways: every new name is an output the type has, and no old name is one, so an alias can
 * never take a wire away from a live port.
 *
 * 🔴 **A name ERG-001 reused is not here and cannot be.** Run Tasks' old `done` meant "finished, whatever happened" and
 * is now `completed`, while its old `success` is now `done`; Set Global Store's and Action Dispatcher's `completed`
 * meant "succeeded" and now mean "finished". A wire to `done` or `completed` on those nodes is a live port today, so
 * no name-based rule can tell an old wire from a new one. They were left to the corpus sweep ERG-001 made at the time.
 *
 * The Variables family (Boolean, Number, String, Color) is the one place the old name maps to `completed` and not
 * `done`: their `stored` fired after every Set whatever happened, which is exactly `completed` (ERG-001 §4 build 3,
 * fcf52c14c), while `done` now means the Set changed something.
 *
 * @module project-contract/renamed-ports
 */

/** Per node type: old output name → the output it became. */
export const RENAMED_OUTPUTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  AddDbModelRelation: { relationAdded: 'done' },
  Boolean: { stored: 'completed' },
  CloudFunction2: { success: 'done' },
  CollectionClear: { modified: 'done' },
  CollectionInsert: { modified: 'done' },
  CollectionNew: { created: 'done' },
  CollectionRemove: { modified: 'done' },
  Color: { stored: 'completed' },
  DeleteDbModelProperties: { deleted: 'done' },
  'Event Sender': { sent: 'done' },
  NavigationClosePopup: { success: 'done' },
  NewDbModelProperties: { created: 'done' },
  NewModel: { created: 'done' },
  Number: { stored: 'completed' },
  'Open File Picker': { success: 'done', cancelled: 'unchanged' },
  PageStackNavigate: { navigated: 'done' },
  PageStackNavigateBack: { success: 'done' },
  PageStackNavigateToPath: { success: 'done' },
  RemoveDbModelRelation: { relationRemoved: 'done' },
  RouterNavigate: { navigated: 'done' },
  RunTasks: { success: 'done' },
  SetDbModelProperties: { stored: 'done' },
  SetModelProperties: { stored: 'done' },
  'Sign File URL': { success: 'done' },
  String: { stored: 'completed' },
  'Unique Id': { generated: 'done' },
  'Upload File': { success: 'done' },
  'net.noodl.HTTP': { success: 'done' },
  'net.noodl.SetComponentObjectProperties': { stored: 'done' },
  'net.noodl.SetParentComponentObjectProperties': { stored: 'done' },
  'net.noodl.externallink': { success: 'done' },
  'net.noodl.user.LogIn': { success: 'done' },
  'net.noodl.user.LogOut': { success: 'done' },
  'net.noodl.user.RequestMagicLink': { success: 'done' },
  'net.noodl.user.SetUserProperties': { success: 'done' },
  'net.noodl.user.SignInWith': { success: 'done' },
  'net.noodl.user.SignUp': { success: 'done' },
  'noodl.cloud.response': { sent: 'done' },
  'noodl.cloud.sendemail': { sent: 'done', failed: 'failure' }
};

const own = Object.prototype.hasOwnProperty;

/**
 * The output an old wire name became on `typeName`, or `undefined` when the name was never renamed there.
 *
 * Only ask this for a port the node does not have: the table never lists a live name, but a caller that maps before
 * looking would still be asking the wrong question.
 */
export function renamedOutput(typeName: string, port: string): string | undefined {
  const renames = own.call(RENAMED_OUTPUTS, typeName) ? RENAMED_OUTPUTS[typeName] : undefined;
  return renames && own.call(renames, port) ? renames[port] : undefined;
}

/** One wire the migration moved (or dropped, when the same wire on the new name was already there). */
export interface RenamedPortWrite {
  component: string;
  nodeId: string;
  nodeType: string;
  from: string;
  to: string;
  /** `true` when an identical wire on the new name already existed, so the old one was removed, not renamed. */
  duplicate: boolean;
}

interface EditorNode {
  id?: string;
  type?: string;
  children?: EditorNode[];
}

interface EditorConnection {
  fromId?: string;
  fromProperty?: string;
  toId?: string;
  toProperty?: string;
}

interface EditorProject {
  components?: Array<{ name?: string; graph?: { roots?: EditorNode[]; connections?: EditorConnection[] } }>;
}

function collectTypes(nodes: EditorNode[] | undefined, into: Map<string, string>): void {
  for (const node of nodes || []) {
    if (node.id && typeof node.type === 'string') into.set(node.id, node.type);
    collectTypes(node.children, into);
  }
}

/**
 * Renames every saved wire from an old output name to the new one, in place, on a project in the editor's JSON shape
 * (`components[].graph.roots` / `.connections`, `fromId` / `fromProperty`). Idempotent: a second run finds nothing.
 *
 * Runs on every open, whatever the project's format version — unlike the run-on-value-change migration, it can only
 * touch a name the node does not have, so there is no later work for it to mistake for old work.
 */
export function applyRenamedPortMigration(project: EditorProject): RenamedPortWrite[] {
  const writes: RenamedPortWrite[] = [];
  for (const component of project.components || []) {
    const graph = component.graph;
    if (!graph || !Array.isArray(graph.connections) || graph.connections.length === 0) continue;

    const types = new Map<string, string>();
    collectTypes(graph.roots, types);

    const key = (c: EditorConnection, fromProperty = c.fromProperty) => `${c.fromId}\u0000${fromProperty}\u0000${c.toId}\u0000${c.toProperty}`;
    const present = new Set(graph.connections.map((c) => key(c)));
    const kept: EditorConnection[] = [];

    for (const connection of graph.connections) {
      const nodeType = connection.fromId ? types.get(connection.fromId) : undefined;
      const to = nodeType && connection.fromProperty ? renamedOutput(nodeType, connection.fromProperty) : undefined;
      if (!to || !nodeType) {
        kept.push(connection);
        continue;
      }
      const duplicate = present.has(key(connection, to));
      writes.push({
        component: component.name || '',
        nodeId: connection.fromId as string,
        nodeType,
        from: connection.fromProperty as string,
        to,
        duplicate
      });
      if (duplicate) continue;
      connection.fromProperty = to;
      present.add(key(connection));
      kept.push(connection);
    }

    if (kept.length !== graph.connections.length) graph.connections = kept;
  }
  return writes;
}

/** One line for the log: what the migration moved, so a rewrite of the person's graph can be found afterwards. */
export function describeRenamedPortMigration(writes: readonly RenamedPortWrite[]): string {
  // no Set spread: the runtime that imports this module compiles to ES5 for viewer-react, where it does not build
  const names = writes
    .map((w) => `${w.nodeType}.${w.from} → ${w.to}`)
    .filter((name, i, all) => all.indexOf(name) === i)
    .sort();
  return `Renamed ${writes.length} wire${writes.length === 1 ? '' : 's'} from outputs renamed in August 2026: ${names.join(', ')}.`;
}
