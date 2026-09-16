/**
 * CHR-007 §3.6 / AC2 — which row class every port on every shipped node type gets.
 *
 * ## Characterisation, written before the refactor
 *
 * The snapshot beside this file was written by this spec at `e2352b60c`, against the 283-line
 * `viewClassForPort` exactly as it stood. CHR-007 then replaces that method with a registry; this
 * file is not edited when it does. Green on both sides is the claim "nobody notices".
 *
 * ## Why everything `Ports.ts` imports is mocked
 *
 * `Ports.ts` cannot load in this runner: `capability-gating` and `schemahandler` both reach
 * `projectmodel` → `bugtracker`, which touches the platform at module scope. The row classes
 * would then reach `Icon.tsx`'s `require.context`. None of that is the dispatch. So every import
 * that renders, persists or talks to a project is replaced by a stub, and each row class by a
 * named stub class — the spec reads **which class** came back, which is the whole of the decision.
 * What stays real is what the decision is made from: `listValueCodec` and the port declarations.
 *
 * ⚠️ `NodeLibrary.nameForPortType` and `getEditType` are stubbed as verbatim copies (the rel-014
 * precedent), because the modules they live in cannot load here.
 *
 * ## The corpus, and its hole
 *
 * Every input of every node in `noodl-types/src/node-catalog.json` — the artefact
 * `catalog:check` keeps in step with source — plus synthetic ports for the branches the catalog
 * never reaches: the editor-side workflow types, `variable`, `curve`, the query builders,
 * `editAsType`, and the orderings where two predicates both match.
 *
 * 🔴 The catalog drops `tab`, `popout` and `parent`, so **this cannot see tab folding or popouts**.
 * Those live in `getViewGroupsFromPorts` and are graded by the drive (AC1), not here.
 */
import * as fs from 'fs';
import * as path from 'path';

function mockStubClasses(...names: string[]) {
  const out: Record<string, unknown> = {};
  for (const name of names) {
    out[name] = class {
      static chrName = name;
    };
  }
  return out;
}

const P = '../../src/editor/src/views/panels/propertyeditor';

jest.mock('react-dom/client', () => ({ createRoot: () => ({ render() {}, unmount() {} }) }));
jest.mock('@noodl-models/nodelibrary', () => ({
  NodeLibrary: {
    // Verbatim from `models/nodelibrary/nodelibrary.ts`.
    nameForPortType(type) {
      if (!type) return;
      return typeof type === 'string' ? type : type.name;
    }
  }
}));
jest.mock('@noodl-utils/capability-gating', () => ({
  capabilityProbes: () => ({ onChange: () => () => undefined }),
  gateForPort: () => undefined,
  resolveGateTarget: () => ({})
}));
jest.mock('@noodl-utils/capability-gating/portDecoration', () => ({ decoratePortElement: (el) => el }));
jest.mock('@noodl-utils/schemaCachePolicy', () => ({ SCHEMA_OUTCOME_CHANGED: 'schema-outcome-changed' }));
jest.mock('@noodl-utils/schemaFieldNotice', () => ({
  addFieldTarget: () => undefined,
  schemaFieldNotice: () => undefined,
  schemaTableForNode: () => undefined
}));
jest.mock('@noodl-utils/schemahandler', () => ({ __esModule: true, default: {} }));
jest.mock('../../src/editor/src/views/popuplayer', () => ({ __esModule: true, default: {} }));
jest.mock('../../src/editor/src/views/panels/propertyeditor/CodeEditor', () => mockStubClasses('CodeEditorType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/PropertyFilterInput', () => ({
  PropertyFilterInput: () => null
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/PropertyGroups', () => ({
  PropertyGroups: () => null
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/SchemaAddFieldButton', () => ({
  SchemaAddFieldButton: () => null
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/SchemaFieldNoticeView', () => ({
  SchemaFieldNoticeView: () => null
}));
// CHR-008 §3.1 — `Ports.ts` now reaches the converted-widget registry, which imports real
// components and so `common/Icon`, whose `require.context` ts-jest rejects: without this the
// suite fails TO RUN. Empty rather than stubbed, because this file grades which row CLASS a port
// dispatches to (`WIDGET_CLASSES`), and the registry is a separate decision graded elsewhere.
jest.mock('../../src/editor/src/views/panels/propertyeditor/components/widgets', () => ({
  WIDGET_COMPONENTS: {}
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/models/modelProxy', () => mockStubClasses('ModelProxy'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/Pages', () => mockStubClasses('PagesType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/propertyPanelHints', () => ({
  hintsForNode: () => new Map(),
  HINTABLE_PORTS: new Set(),
  HINT_INPUT_PARAMETERS: new Set()
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/propertyPanelViewState', () => ({
  propertyPanelViewState: {}
}));
jest.mock('../../src/editor/src/views/panels/propertyeditor/utils', () => ({
  // Verbatim from `propertyeditor/utils.ts`.
  getEditType(p) {
    return p.type?.editAsType ? p.type.editAsType : p.type;
  }
}));

const D = '../../src/editor/src/views/panels/propertyeditor/DataTypes';
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/AlignTools/AlignToolsType', () =>
  mockStubClasses('AlignToolsType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/BasicType', () => mockStubClasses('BasicType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/BooleanType', () =>
  mockStubClasses('BooleanType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/ByobFilterType', () =>
  mockStubClasses('ByobFilterType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/ColorPicker/ColorType', () =>
  mockStubClasses('ColorType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/ComponentType', () =>
  mockStubClasses('ComponentType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/CurveEditor/CurveType', () =>
  mockStubClasses('CurveType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/Dimension', () => mockStubClasses('Dimension'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/EnumType', () => mockStubClasses('EnumType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/FilePicker/SourceCodeType', () =>
  mockStubClasses('SourceCodeType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/FontType', () => mockStubClasses('FontType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/IconType', () => mockStubClasses('IconType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/IdentifierType', () =>
  mockStubClasses('IdentifierType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/ImageType', () => mockStubClasses('ImageType'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/ListValueType', () =>
  mockStubClasses('ListValueType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/LogicBuilderHiddenType', () =>
  mockStubClasses('LogicBuilderHiddenType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/LogicBuilderWorkspaceType', () =>
  mockStubClasses('LogicBuilderWorkspaceType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/MarginPaddingType', () =>
  mockStubClasses('MarginPaddingType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/NumberWithUnits', () =>
  mockStubClasses('NumberWithUnits')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/PopoutGroup', () =>
  mockStubClasses('PopoutGroup')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/PropListType', () =>
  mockStubClasses('PropListType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/QuerySortingType', () =>
  mockStubClasses('QuerySortingType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/ResizingType', () =>
  mockStubClasses('ResizingType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/SizeModeType', () =>
  mockStubClasses('SizeModeType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/StringList/StringListType', () =>
  mockStubClasses('StringListType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/TabGroup', () => mockStubClasses('TabGroup'));
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/TextAreaType', () =>
  mockStubClasses('TextAreaType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/TextStyleType', () =>
  mockStubClasses('TextStyleType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/VariableType', () =>
  mockStubClasses('VariableType')
);
jest.mock('../../src/editor/src/views/panels/propertyeditor/DataTypes/WorkflowTypes', () =>
  mockStubClasses(
    'WorkflowBackoffType',
    'WorkflowCasesType',
    'WorkflowConditionType',
    'WorkflowFunctionRefType',
    'WorkflowParamsType',
    'WorkflowTransformType',
    'WorkflowTriggerInfoType',
    'WorkflowValidateType',
    'WorkflowValueType'
  )
);

type CatalogPort = { name: string; type?: unknown };
const CATALOG = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../noodl-types/src/node-catalog.json'), 'utf8')
) as { nodes: { typeName: string; inputs?: CatalogPort[] }[] };

/**
 * The branches the catalog never reaches, and the orderings where two predicates both match.
 * Named by what they probe, so a diff in the snapshot says which decision moved.
 */
const SYNTHETIC: Record<string, CatalogPort> = {
  'variable': { name: 'p', type: 'variable' },
  'resizing': { name: 'p', type: 'resizing' },
  'curve': { name: 'p', type: 'curve' },
  'query-filter': { name: 'p', type: 'query-filter' },
  'query-sorting': { name: 'p', type: 'query-sorting' },
  'byob-filter': { name: 'p', type: { name: 'byob-filter' } },
  'workflow-condition': { name: 'p', type: 'workflow-condition' },
  'workflow-cases': { name: 'p', type: 'workflow-cases' },
  'workflow-value': { name: 'p', type: 'workflow-value' },
  'workflow-path': { name: 'p', type: 'workflow-path' },
  'workflow-params': { name: 'p', type: 'workflow-params' },
  'workflow-transform': { name: 'p', type: 'workflow-transform' },
  'workflow-validate': { name: 'p', type: 'workflow-validate' },
  'workflow-backoff': { name: 'p', type: 'workflow-backoff' },
  'workflow-trigger-info': { name: 'p', type: 'workflow-trigger-info' },
  'workflow-function-ref': { name: 'p', type: 'workflow-function-ref' },
  'textStyle as string': { name: 'p', type: 'textStyle' },
  'editAsType color': { name: 'p', type: { name: 'string', editAsType: 'color' } },
  'editAsType object': { name: 'p', type: { name: '*', editAsType: { name: 'enum', enums: [] } } },
  'enum without enums': { name: 'p', type: { name: 'enum' } },
  'enum as a bare string': { name: 'p', type: 'enum' },
  'enum with alignComp and sizeComp': { name: 'p', type: { name: 'enum', enums: [], alignComp: 'x', sizeComp: 'mode' } },
  'enum with sizeComp not mode': { name: 'p', type: { name: 'enum', enums: [], sizeComp: 'width' } },
  'string multiline and identifierOf': { name: 'p', type: { name: 'string', multiline: true, identifierOf: 'X' } },
  'string codeeditor and identifierOf': { name: 'p', type: { name: 'string', codeeditor: 'js', identifierOf: 'X' } },
  'string identifierOf': { name: 'p', type: { name: 'string', identifierOf: 'X' } },
  'number with units and marginPaddingComp': { name: 'p', type: { name: 'number', units: ['px'], marginPaddingComp: 'x' } },
  'marginPaddingComp on a boolean': { name: 'p', type: { name: 'boolean', marginPaddingComp: 'x' } },
  'marginPaddingComp on a string': { name: 'p', type: { name: 'string', marginPaddingComp: 'x' } },
  'number with empty units': { name: 'p', type: { name: 'number', units: [] } },
  'number as a bare string': { name: 'p', type: 'number' },
  'array as a bare string': { name: 'p', type: 'array' },
  'object as an object': { name: 'p', type: { name: 'object' } },
  'optionslist': { name: 'p', type: { name: 'optionslist' } },
  'stringlist': { name: 'p', type: 'stringlist' },
  'editorType workspace on a number': { name: 'p', type: { name: 'number', editorType: 'logic-builder-workspace' } },
  'editorType hidden': { name: 'p', type: { name: 'string', editorType: 'logic-builder-hidden' } },
  'editorType unknown': { name: 'p', type: { name: 'string', editorType: 'something-else' } },
  'signal': { name: 'p', type: 'signal' },
  'wildcard': { name: 'p', type: '*' },
  'no type': { name: 'p' },
  'null type': { name: 'p', type: null },
  'unknown type name': { name: 'p', type: { name: 'no-such-type' } }
};

const SNAPSHOT_PATH = path.join(__dirname, 'widgetDispatch.snapshot.json');

type Snapshot = { nodes: Record<string, Record<string, string | null>>; synthetic: Record<string, string | null> };

function dispatch(): Snapshot {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Ports } = require(`${D}/Ports`);
  // 🔴 A throw is recorded, not propagated. This runs during collection, and a throw there fails
  // the suite TO RUN (`Tests: 0 total`) rather than failing a row. The first run found one:
  // `type: null` passes `typeof type === 'object'` and the dispatch reads `null.editorType`.
  const classFor = (port: CatalogPort): string | null => {
    try {
      const cls = Ports.prototype.viewClassForPort.call({}, port);
      return cls === undefined ? null : cls.chrName || `<unnamed ${cls.name}>`;
    } catch (e) {
      return `<throws ${e instanceof Error ? e.constructor.name : typeof e}>`;
    }
  };

  const nodes: Snapshot['nodes'] = {};
  for (const node of CATALOG.nodes) {
    const row: Record<string, string | null> = {};
    for (const port of node.inputs || []) row[port.name] = classFor(port);
    nodes[node.typeName] = row;
  }

  const synthetic: Snapshot['synthetic'] = {};
  for (const [label, port] of Object.entries(SYNTHETIC)) synthetic[label] = classFor(port);

  return { nodes, synthetic };
}

describe('CHR-007 — the row class every port gets', () => {
  const current = dispatch();

  if (process.env.CHR007_WRITE_SNAPSHOT === '1') {
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(current, null, 2) + '\n');
  }

  const recorded: Snapshot | null = fs.existsSync(SNAPSHOT_PATH)
    ? JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'))
    : null;

  it('has a recorded snapshot to compare against', () => {
    expect(recorded).not.toBeNull();
  });

  it('covers every node type in the catalog, so an unlisted type cannot hide', () => {
    const catalogNames = CATALOG.nodes.map((n) => n.typeName);
    expect(new Set(catalogNames).size).toBe(catalogNames.length);
    expect(Object.keys(recorded ? recorded.nodes : {}).sort()).toEqual([...catalogNames].sort());
    expect(catalogNames.length).toBeGreaterThanOrEqual(176);
  });

  // The known-firing control: a snapshot regenerated from a dispatch that returns nothing, or
  // the same class for everything, would still equal itself. These four cannot.
  it.each([
    ['Group', 'boxShadowEnabled', 'BooleanType'],
    ['Group', 'sizeMode', 'SizeModeType'],
    ['Text', 'text', 'TextAreaType'],
    ['Logic Builder', 'workspace', 'LogicBuilderWorkspaceType']
  ])('%s.%s is a %s', (typeName, portName, className) => {
    expect(current.nodes[typeName][portName]).toBe(className);
  });

  it('gives every catalog port the class it had before the refactor', () => {
    expect(current.nodes).toEqual(recorded ? recorded.nodes : undefined);
  });

  it('gives every synthetic port the class it had before the refactor', () => {
    expect(current.synthetic).toEqual(recorded ? recorded.synthetic : undefined);
  });
});
