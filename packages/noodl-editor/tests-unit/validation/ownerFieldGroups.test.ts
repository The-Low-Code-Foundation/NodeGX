/**
 * P112 OWN-026 FIX-06 B — `ownerField.ts`: a group's role named by a field a caller wrote, and a function that guards
 * a collection any caller may create into directly. Both infos, both said in the write's answer
 * (`authoredPreconditionDiagnostics`).
 *
 * The rows are the measured shapes (a stranger's builds, their words changed): an invitation function that joins the
 * caller to the role named by the invitation's own group field and opens that group's records to the role; and a
 * function that refuses an uninvited caller while the collection it writes accepts the same record from any session.
 * The silent rows include the example the infos name, read from its file.
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  authoredPreconditionDiagnostics,
  isBlockingForAuthoredOutput
} from '../../src/editor/src/validation/authoredCandidate';
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { FunctionWireLike } from '../../src/editor/src/validation/functionPorts';
import {
  callerMayCreate,
  checkOwnerField,
  type CollectionWriteRules
} from '../../src/editor/src/validation/ownerField';

type Node = { id: string; type: string; label?: string; parameters?: Record<string, unknown> };
type Shape = { nodes: Node[]; wires: FunctionWireLike[] };

const wire = (line: string): FunctionWireLike => {
  const [a, b] = line.split('->').map((x) => x.trim());
  const i = a.indexOf('.');
  const j = b.indexOf('.');
  return { fromId: a.slice(0, i), fromProperty: a.slice(i + 1), toId: b.slice(0, j), toProperty: b.slice(j + 1) };
};

const FUNCTION = '/#__cloud__/Cloud Functions/Join Team';
const ROLE = DiagnosticCode.RoleNamedByAFieldTheCallerWrote;
const GUARD = DiagnosticCode.FunctionGuardsAnOpenCollection;
const TRUSTS = DiagnosticCode.FunctionTrustsAFieldTheCallerWrote;

const MEASURED_PICK =
  'if (Inputs.email === undefined || Inputs.invites === undefined) return;\n' +
  'const mine = Inputs.invites.filter((i) => i.withEmail === Inputs.email);\n' +
  'const invite = mine[0];\n' +
  "const teamId = invite ? String(invite.teamId || '') : '';\n" +
  '// the team rows are matched by their owner\n' +
  'Outputs.rows = Inputs.items.filter((r) => String(r.owner) === teamId);\n' +
  "Outputs.role = invite ? 'team-' + teamId : '';\n" +
  'Outputs.go();';

/** The measured join: the role named from the invitation's own team field, granted, the team's records opened to it. */
function joinTeam(pick = MEASURED_PICK): Shape {
  return {
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', parameters: { allowNoAuth: false } },
      { id: 'me', type: 'net.noodl.user.User' },
      { id: 'invites', type: 'DbCollection2', label: 'Every invitation', parameters: { collectionName: 'invitation' } },
      { id: 'items', type: 'DbCollection2', label: 'Every item', parameters: { collectionName: 'item' } },
      {
        id: 'pick',
        type: 'JavaScriptFunction',
        label: 'Which team invited this address',
        parameters: { functionScript: pick }
      },
      { id: 'join', type: 'noodl.cloud.addusertorole', parameters: { createRole: true } },
      { id: 'ok', type: 'noodl.cloud.response', parameters: { params: 'teamId' } }
    ],
    wires: [
      'req.receive -> me.fetch',
      'req.receive -> invites.storageFetch',
      'req.receive -> items.storageFetch',
      'me.email -> pick.in-email',
      'invites.items -> pick.in-invites',
      'items.items -> pick.in-items',
      'pick.out-role -> join.role',
      'me.id -> join.userId',
      'pick.out-go -> join.add',
      'join.done -> ok.send'
    ].map(wire)
  };
}

/** The measured guard: refuses an uninvited caller, then creates the record in a collection with an open create rule. */
function setTask(): Shape {
  return {
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', parameters: { allowNoAuth: false, params: 'memberId,text' } },
      { id: 'me', type: 'net.noodl.user.User' },
      {
        id: 'check',
        type: 'JavaScriptFunction',
        label: 'Only an invited helper sets a task',
        parameters: { functionScript: 'Outputs.ok();' }
      },
      { id: 'create', type: 'NewDbModelProperties', label: 'The task', parameters: { collectionName: 'task' } },
      { id: 'done', type: 'noodl.cloud.response' },
      { id: 'refuse', type: 'noodl.cloud.response', parameters: { status: 'failure' } }
    ],
    wires: [
      'req.receive -> me.fetch',
      'me.id -> check.in-me',
      'req.pm-text -> create.prop-text',
      'check.out-ok -> create.store',
      'create.done -> done.send',
      'check.out-no -> refuse.send'
    ].map(wire)
  };
}

const run = (shape: Shape, rules?: CollectionWriteRules | null, component = FUNCTION) =>
  checkOwnerField(shape.nodes as never, { component, wires: shape.wires, rules }).map((d) => d.code);

const closed = {
  permissions: {
    find: 'authenticated',
    get: 'authenticated',
    create: 'nobody',
    update: 'authenticated',
    delete: 'authenticated'
  }
};
const open = {
  permissions: {
    find: 'authenticated',
    get: 'authenticated',
    create: 'authenticated',
    update: 'authenticated',
    delete: 'authenticated'
  }
};

describe('FIX-06 B: role-named-by-a-field-the-caller-wrote', () => {
  it('fires on the measured join, as an info naming owner and the example, though the script reads owner elsewhere', () => {
    const shape = joinTeam();
    const found = checkOwnerField(shape.nodes as never, { component: FUNCTION, wires: shape.wires });
    const role = found.filter((d) => d.code === ROLE);
    expect(role).toHaveLength(1);
    expect(role[0].severity).toBe('info');
    expect(role[0].location.nodeId).toBe('join');
    expect(role[0].message).toContain('"owner"');
    expect(role[0].message).toContain('cloud-members-can-edit-my-records');
    // FIX-05's info is silent here (the script names owner): the reason this shape got through.
    expect(found.map((d) => d.code)).not.toContain(TRUSTS);
  });

  it("fires on a script that opens records to a role built from a record's field, with no Add User To Role", () => {
    const stamp =
      'const invite = Inputs.invites[0];\n' +
      'const acl = {};\n' +
      "acl['role:team-' + invite.teamId] = { read: true, write: true };\n" +
      "await Noodl.Records.save(Inputs.id, {}, { className: 'item', acl });";
    const shape = joinTeam(stamp);
    shape.wires = shape.wires.filter((w) => w.toId !== 'join');
    shape.nodes = shape.nodes.filter((n) => n.id !== 'join');
    expect(run(shape)).toContain(ROLE);
  });

  it("is silent when the line that names the role reads the record's owner", () => {
    const safe = MEASURED_PICK.replace(
      "Outputs.role = invite ? 'team-' + teamId : '';",
      "Outputs.role = invite ? 'team-' + String(invite.owner) : '';"
    );
    expect(run(joinTeam(safe))).not.toContain(ROLE);
  });

  it('is silent for a fixed role name, for a function that reads no records, and when only a function creates what it reads', () => {
    const fixed = joinTeam();
    fixed.wires = fixed.wires.filter((w) => !(w.toId === 'join' && w.toProperty === 'role'));
    fixed.nodes = fixed.nodes.map((n) => (n.id === 'join' ? { ...n, parameters: { role: 'member' } } : n));
    expect(run(fixed)).not.toContain(ROLE);

    const noReads = joinTeam();
    noReads.nodes = noReads.nodes.filter((n) => n.type !== 'DbCollection2');
    expect(run(noReads)).not.toContain(ROLE);

    expect(run(joinTeam(), { defaults: open, collections: { invitation: closed, item: closed } })).not.toContain(ROLE);
    expect(
      run(joinTeam(), {
        defaults: open,
        collections: { invitation: { permissions: { create: 'role:admin' } }, item: closed }
      })
    ).not.toContain(ROLE);
    expect(run(joinTeam(), { defaults: closed, collections: { invitation: open } })).toContain(ROLE);
  });

  it('is silent outside a cloud function', () => {
    expect(run(joinTeam(), null, '/Pages/Team')).not.toContain(ROLE);
  });
});

describe('FIX-06 B: function-guards-an-open-collection', () => {
  it('fires on a function that refuses some callers and creates into a collection any caller may create', () => {
    const shape = setTask();
    const found = checkOwnerField(shape.nodes as never, {
      component: FUNCTION,
      wires: shape.wires,
      rules: { defaults: open }
    });
    const guard = found.filter((d) => d.code === GUARD);
    expect(guard).toHaveLength(1);
    expect(guard[0].severity).toBe('info');
    expect(guard[0].location.nodeId).toBe('create');
    expect(guard[0].message).toContain('"nobody"');
    expect(guard[0].message).toContain('set_collection_permissions');
    expect(run(setTask(), null)).toContain(GUARD);
  });

  it('sees a create in a script, Noodl.Records.create("X", …)', () => {
    const shape = setTask();
    shape.nodes = shape.nodes.filter((n) => n.id !== 'create');
    shape.nodes.push({
      id: 'make',
      type: 'JavaScriptFunction',
      parameters: { functionScript: "await Noodl.Records.create('task', { text: Inputs.text });" }
    });
    expect(run(shape, { defaults: open })).toContain(GUARD);
  });

  it('is silent when the create rule is nobody (or only a role), when nobody is refused, and when no caller is in play', () => {
    expect(run(setTask(), { defaults: open, collections: { task: closed } })).not.toContain(GUARD);
    expect(
      run(setTask(), { defaults: open, collections: { task: { permissions: { create: ['role:staff'] } } } })
    ).not.toContain(GUARD);
    const noRefusal = setTask();
    noRefusal.nodes = noRefusal.nodes.filter((n) => n.id !== 'refuse');
    expect(run(noRefusal, { defaults: open })).not.toContain(GUARD);
    const nobodyAsks = setTask();
    nobodyAsks.wires = nobodyAsks.wires.filter((w) => w.fromId !== 'me');
    expect(run(nobodyAsks, { defaults: open })).not.toContain(GUARD);
    const local = setTask();
    local.nodes = local.nodes.map((n) =>
      n.id === 'create' ? { ...n, parameters: { collectionName: 'task', storeType: 'local' } } : n
    );
    expect(run(local, { defaults: open })).not.toContain(GUARD);
  });
});

describe('FIX-06 B: callerMayCreate', () => {
  it('reads "not known" as yes, nobody and role-only as no, and a collection rule over the default', () => {
    expect(callerMayCreate(null, 'x')).toBe(true);
    expect(callerMayCreate({ defaults: closed }, 'x')).toBe(false);
    expect(callerMayCreate({ defaults: closed, collections: { x: open } }, 'x')).toBe(true);
    expect(
      callerMayCreate({ defaults: open, collections: { x: { permissions: { create: ['role:a', 'role:b'] } } } }, 'x')
    ).toBe(false);
    expect(
      callerMayCreate(
        { defaults: open, collections: { x: { permissions: { create: ['role:a', 'authenticated'] } } } },
        'x'
      )
    ).toBe(true);
  });
});

describe('FIX-06 B: the example the infos name', () => {
  const example = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, '../../../../docs/node-catalog/examples/cloud-members-can-edit-my-records.json'),
      'utf8'
    )
  ) as { components: { name: string; nodes: Node[]; connections: FunctionWireLike[] }[] };
  const functions = example.components.filter((c) => c.name.startsWith('/#__cloud__/'));

  it('has its three functions', () => {
    expect(functions.map((c) => c.name.split('/').pop())).toEqual(['Join Group', 'Add To Group', 'Remove Member']);
  });

  it('is silent, all three, with the rules it asks for (Note created only by a function, Invite the default)', () => {
    const rules = { defaults: open, collections: { Note: closed } };
    for (const c of functions) {
      const found = run({ nodes: c.nodes, wires: c.connections }, rules, c.name);
      expect({ name: c.name, found }).toEqual({ name: c.name, found: [] });
    }
  });

  it("says so for Add To Group while Note's create rule is still open: the step the example asks for", () => {
    const add = functions.find((c) => c.name.endsWith('Add To Group'))!;
    expect(run({ nodes: add.nodes, wires: add.connections }, { defaults: open }, add.name)).toEqual([GUARD]);
  });
});

describe('FIX-06 B: said in the write', () => {
  it('reaches authoredPreconditionDiagnostics and never blocks', () => {
    const catalog = loadDefaultCatalog();
    for (const [shape, code] of [
      [joinTeam(), ROLE],
      [setTask(), GUARD]
    ] as const) {
      const found = authoredPreconditionDiagnostics({
        component: FUNCTION,
        nodes: shape.nodes as never,
        components: [FUNCTION],
        wires: shape.wires,
        catalog
      }).filter((d) => d.code === code);
      expect(found).toHaveLength(1);
      expect(isBlockingForAuthoredOutput(found[0])).toBe(false);
    }
  });
});
