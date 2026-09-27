/**
 * INS-002 — selecting a node shows its properties, whatever the selection was made in, and leaves
 * the left panel where it was.
 *
 * Richard, drive A (2026-09-23): clicking `The paragraph` in Layers lit the node and showed no
 * properties — "I shouldn't have to click it in the left layers menu, THEN also click the node
 * itself in the node canvas." That was `keepsSidePanel` (TVW-004): `selectNode` skipped
 * `switchToNode` for a Layers or panel selection, because in a one-slot editor Properties would have
 * replaced Layers. INS-001 gave Properties its own column, so the skip had nothing left to protect.
 *
 * ⚠️ These rows grade `SelectionActions.selectNode`, which every source reaches — the canvas click
 * directly, Layers and the Styles wearers through `switchToComponent(…, { node })`. Whether a
 * Layers row in a component that is NOT on the canvas reaches it at all is INS-002 AC2, a drive.
 */

jest.mock('@noodl-utils/editorsettings', () => ({
  EditorSettings: { instance: { on: () => undefined, get: () => undefined } }
}));
jest.mock('../../src/editor/src/models/componentmodel', () => ({ ComponentModel: class {} }));
jest.mock('../../src/editor/src/models/nodelibrary', () => ({ NodeLibrary: { instance: {} } }));
jest.mock('../../src/editor/src/views/popuplayer', () => ({
  __esModule: true,
  default: { instance: { hideAllModalsAndPopups: () => undefined, hideTooltip: () => undefined } }
}));
jest.mock('../../src/editor/src/views/panels/ExplainPanel/explainTarget', () => ({ forgetTarget: jest.fn() }));
jest.mock('../../src/editor/src/views/nodegrapheditor/canvas/HitTester', () => ({}));

import { SidebarModel } from '@noodl-models/sidebar/sidebarmodel';

import { SelectionActions } from '../../src/editor/src/views/nodegrapheditor/SelectionActions';

const ComponentsPanel = () => null;
const StylesPanel = () => null;
const PropertiesPanel = () => null;

/** The slice of `NodeGraphEditor` that a select touches. */
function fakeEditor() {
  return {
    readOnly: false,
    selector: { select: jest.fn(), unselect: jest.fn(), nodes: [] },
    commentLayer: { clearSelection: jest.fn(), clearMultiselection: jest.fn() },
    interaction: { leftButtonIsDoubleClicked: false },
    setHighlightedConnection: jest.fn(),
    repaint: jest.fn(),
    notifyListeners: jest.fn()
  } as TSFixme;
}

const canvasNode = (id: string) => ({ id, selected: false, model: { id, type: {} } }) as TSFixme;

beforeEach(() => {
  SidebarModel.instance.reset();
  SidebarModel.instance.register({ id: 'components', name: 'Project', order: 1, panel: ComponentsPanel });
  SidebarModel.instance.register({ id: 'styles', name: 'Styles', order: 1.5, panel: StylesPanel });
  SidebarModel.instance.register({
    transient: true,
    followsSelection: true,
    id: 'PropertyEditor',
    name: 'Properties',
    panel: PropertiesPanel
  });
});

describe('INS-002 — a selection shows its node, from wherever it was made', () => {
  it('with the Project panel (Layers) open, selecting a node shows its properties AND keeps Layers', () => {
    SidebarModel.instance.switch('components');

    new SelectionActions(fakeEditor()).selectNode(canvasNode('paragraph'));

    expect(SidebarModel.instance.ActiveId).toBe('components');
    expect(SidebarModel.instance.InspectorId).toBe('PropertyEditor');
    expect((SidebarModel.instance.getInspector()() as TSFixme).props.model.id).toBe('paragraph');
  });

  it('with Styles open — the wearer case — the list stays and the wearer’s properties appear', () => {
    SidebarModel.instance.switch('styles');

    const actions = new SelectionActions(fakeEditor());
    actions.selectNode(canvasNode('wearer-1'));
    actions.selectNode(canvasNode('wearer-2'));

    expect(SidebarModel.instance.ActiveId).toBe('styles');
    expect((SidebarModel.instance.getInspector()() as TSFixme).props.model.id).toBe('wearer-2');
  });

  it('the deselect inside a select does not leave the inspector empty', () => {
    // `selectNode` clears the old selection before it selects, and the clear empties the inspector.
    // The select has to be what the inspector ends on — read the state after, not the events.
    SidebarModel.instance.switch('components');
    const editor = fakeEditor();
    const actions = new SelectionActions(editor);
    actions.selectNode(canvasNode('a'));
    actions.selectNode(canvasNode('b'));

    expect(SidebarModel.instance.InspectorId).toBe('PropertyEditor');
    expect((SidebarModel.instance.getInspector()() as TSFixme).props.model.id).toBe('b');
  });

  it('deselecting empties the inspector and leaves the left panel alone — the control', () => {
    SidebarModel.instance.switch('styles');
    const actions = new SelectionActions(fakeEditor());
    actions.selectNode(canvasNode('a'));

    actions.deselect();

    expect(SidebarModel.instance.InspectorId).toBeUndefined();
    expect(SidebarModel.instance.ActiveId).toBe('styles');
  });
});
