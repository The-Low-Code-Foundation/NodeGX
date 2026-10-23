/**
 * P112 OWN-026 FIX-05 B — `ownerField.ts`: the page's word in a field of its own, and a cloud
 * function that never reads the server's (`owner`). Both infos, both said in the write's answer
 * (`authoredPreconditionDiagnostics`).
 *
 * The rows are the measured shape (a stranger's build, its words changed): a page creating a
 * grant with the signed-in User's `id` in `groupId`, and a cloud function that reads every grant
 * and every item as the system and matches them to the caller by fields the page wrote.
 */

import {
  authoredPreconditionDiagnostics,
  isBlockingForAuthoredOutput
} from '../../src/editor/src/validation/authoredCandidate';
import { loadDefaultCatalog } from '../../src/editor/src/validation/catalog';
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import type { FunctionWireLike } from '../../src/editor/src/validation/functionPorts';
import { checkOwnerField } from '../../src/editor/src/validation/ownerField';

type Node = { id: string; type: string; label?: string; parameters?: Record<string, unknown> };

const wire = (fromId: string, fromProperty: string, toId: string, toProperty: string): FunctionWireLike => ({
  fromId,
  fromProperty,
  toId,
  toProperty
});

const PAGE = '/Components/Share';
const FUNCTION = '/#__cloud__/Shared With Me';

function grantPage(): { nodes: Node[]; wires: FunctionWireLike[] } {
  return {
    nodes: [
      { id: 'me', type: 'net.noodl.user.User', label: 'The signed-in member' },
      { id: 'address', type: 'net.noodl.controls.textinput', label: 'Their address' },
      { id: 'share', type: 'net.noodl.controls.button', label: 'Share' },
      { id: 'grant', type: 'NewDbModelProperties', label: 'Share with them', parameters: { collectionName: 'grant' } }
    ],
    wires: [
      wire('share', 'onClick', 'grant', 'store'),
      wire('address', 'text', 'grant', 'prop-sharedWith'),
      wire('me', 'id', 'grant', 'prop-groupId'),
      wire('me', 'email', 'grant', 'prop-fromEmail')
    ]
  };
}

function sharedWithMe(script = 'const mine = Inputs.grants.filter(g => g.sharedWith === Inputs.email);\nconst groups = mine.map(g => g.groupId);\nOutputs.items = Inputs.items.filter(i => groups.includes(i.groupId));'): {
  nodes: Node[];
  wires: FunctionWireLike[];
} {
  return {
    nodes: [
      { id: 'req', type: 'noodl.cloud.request', parameters: { allowNoAuth: false } },
      { id: 'caller', type: 'net.noodl.user.User', label: "The caller's own sign-in" },
      { id: 'grants', type: 'DbCollection2', label: 'Every grant', parameters: { collectionName: 'grant' } },
      { id: 'items', type: 'DbCollection2', label: 'Every item', parameters: { collectionName: 'item' } },
      { id: 'pick', type: 'JavaScriptFunction', label: 'Only what was shared with me', parameters: { functionScript: script } },
      { id: 'ok', type: 'noodl.cloud.response', parameters: { params: 'items' } }
    ],
    wires: [
      wire('req', 'receive', 'caller', 'fetch'),
      wire('req', 'receive', 'grants', 'storageFetch'),
      wire('req', 'receive', 'items', 'storageFetch'),
      wire('caller', 'email', 'pick', 'in-email'),
      wire('grants', 'items', 'pick', 'in-grants'),
      wire('items', 'items', 'pick', 'in-items'),
      wire('pick', 'out-items', 'ok', 'pm-items')
    ]
  };
}

const codes = (component: string, { nodes, wires }: { nodes: Node[]; wires: FunctionWireLike[] }) =>
  checkOwnerField(nodes, { component, wires }).map((d) => d.code);

describe('FIX-05 B: owner-sent-by-the-page', () => {
  it("fires on a write whose field is the signed-in user's id, as an info naming owner", () => {
    const { nodes, wires } = grantPage();
    const found = checkOwnerField(nodes, { component: PAGE, wires });
    expect(found.map((d) => d.code)).toEqual([DiagnosticCode.OwnerSentByThePage]);
    expect(found[0].severity).toBe('info');
    expect(found[0].message).toContain('"groupId"');
    expect(found[0].message).toContain('"owner"');
    expect(found[0].location).toMatchObject({ nodeId: 'grant', port: 'prop-groupId' });
  });

  it('follows the id through a node in between (an Expression, a Function)', () => {
    const shape = grantPage();
    shape.nodes.push({ id: 'pass', type: 'Expression', parameters: { expression: 'id' } });
    shape.wires = shape.wires.filter((w) => w.toProperty !== 'prop-groupId');
    shape.wires.push(wire('me', 'id', 'pass', 'id'), wire('pass', 'result', 'grant', 'prop-groupId'));
    expect(codes(PAGE, shape)).toEqual([DiagnosticCode.OwnerSentByThePage]);
  });

  it("is silent for the user's other outputs, for a page that sends no id, and for owner itself", () => {
    const email = grantPage();
    email.wires = email.wires.filter((w) => w.toProperty !== 'prop-groupId');
    expect(codes(PAGE, email)).toEqual([]);

    const own = grantPage();
    own.wires = own.wires.map((w) => (w.toProperty === 'prop-groupId' ? { ...w, toProperty: 'prop-owner' } : w));
    expect(codes(PAGE, own)).toEqual([]);
  });

  it("is silent in a cloud function: there the User node is the caller's session and the value is the server's", () => {
    expect(codes(FUNCTION, grantPage())).toEqual([]);
  });
});

describe('FIX-05 B: function-trusts-a-field-the-caller-wrote', () => {
  it('fires on a function that reads records as the system, answers per caller, and never reads owner', () => {
    const { nodes, wires } = sharedWithMe();
    const found = checkOwnerField(nodes, { component: FUNCTION, wires });
    expect(found.map((d) => d.code)).toEqual([DiagnosticCode.FunctionTrustsAFieldTheCallerWrote]);
    expect(found[0].severity).toBe('info');
    expect(found[0].message).toContain('grant, item');
    expect(found[0].message).toContain('"owner"');
    expect(found[0].location).toMatchObject({ nodeId: 'grants' });
  });

  it('is silent once the function checks owner', () => {
    const safe = sharedWithMe(
      'const mine = Inputs.grants.filter(g => g.sharedWith === Inputs.email);\nconst groups = mine.map(g => g.owner);\nOutputs.items = Inputs.items.filter(i => groups.includes(i.owner));'
    );
    expect(codes(FUNCTION, safe)).toEqual([]);

    const filtered = sharedWithMe();
    filtered.nodes[2].parameters = {
      collectionName: 'grant',
      visualFilter: { combinator: 'and', rules: [{ property: 'owner', operator: 'equal to', input: 'owner' }] }
    };
    expect(codes(FUNCTION, filtered)).toEqual([]);
  });

  it('does not take a word that only contains owner (ownerName, coowner) for owner', () => {
    const near = sharedWithMe('Outputs.items = Inputs.items.filter(i => i.ownerName === Inputs.email || i.coowner);');
    expect(codes(FUNCTION, near)).toEqual([DiagnosticCode.FunctionTrustsAFieldTheCallerWrote]);
  });

  it('is silent for a function that answers nobody in particular (no User wired), or reads no records', () => {
    const anyone = sharedWithMe();
    anyone.wires = anyone.wires.filter((w) => w.fromId !== 'caller');
    expect(codes(FUNCTION, anyone)).toEqual([]);

    const noReads = sharedWithMe();
    noReads.nodes = noReads.nodes.filter((n) => n.type !== 'DbCollection2');
    expect(codes(FUNCTION, noReads)).toEqual([]);
  });

  it("counts the Request's userId as the caller, the way most functions name them", () => {
    const byRequest = sharedWithMe();
    byRequest.nodes = byRequest.nodes.filter((n) => n.id !== 'caller');
    byRequest.wires = byRequest.wires.filter((w) => w.fromId !== 'caller' && w.toId !== 'caller');
    byRequest.wires.push(wire('req', 'userId', 'pick', 'in-callerId'));
    const found = checkOwnerField(byRequest.nodes, { component: FUNCTION, wires: byRequest.wires });
    expect(found.map((d) => d.code)).toEqual([DiagnosticCode.FunctionTrustsAFieldTheCallerWrote]);
    expect(found[0].message).toContain("the Request's userId");
  });

  it("is silent when the project's rules say no caller creates or updates what it reads; fires when they may", () => {
    const shape = sharedWithMe();
    const run = (rules: unknown) => checkOwnerField(shape.nodes, { component: FUNCTION, wires: shape.wires, rules: rules as never }).map((d) => d.code);
    const closed = { permissions: { find: 'nobody', get: 'nobody', create: 'nobody', update: 'nobody', delete: 'nobody' } };
    expect(run({ defaults: closed, collections: {} })).toEqual([]);
    expect(run({ defaults: { permissions: { create: 'authenticated', update: 'authenticated' } }, collections: { grant: closed, item: closed } })).toEqual([]);
    // One collection a caller may create into is enough: that is where the forged record comes from.
    expect(run({ defaults: closed, collections: { grant: { permissions: { create: 'authenticated', update: 'nobody' } } } })).toEqual([
      DiagnosticCode.FunctionTrustsAFieldTheCallerWrote
    ]);
    expect(run(null)).toEqual([DiagnosticCode.FunctionTrustsAFieldTheCallerWrote]);
  });

  it('is silent outside a cloud function (a page reads with the caller\'s own rights)', () => {
    expect(codes(PAGE, sharedWithMe())).toEqual([]);
  });
});

describe('FIX-05 B: said in the write', () => {
  it('reaches authoredPreconditionDiagnostics on both doors and never blocks', () => {
    const catalog = loadDefaultCatalog();
    for (const [component, shape, code] of [
      [PAGE, grantPage(), DiagnosticCode.OwnerSentByThePage],
      [FUNCTION, sharedWithMe(), DiagnosticCode.FunctionTrustsAFieldTheCallerWrote]
    ] as const) {
      const found = authoredPreconditionDiagnostics({
        component,
        nodes: shape.nodes as never,
        components: [component],
        wires: shape.wires,
        catalog
      }).filter((d) => d.code === code);
      expect(found).toHaveLength(1);
      expect(isBlockingForAuthoredOutput(found[0])).toBe(false);
    }
  });
});
