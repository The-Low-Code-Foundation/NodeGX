/**
 * INS-001 — a node's panel goes to the inspector on the right, and the left slot is left alone.
 *
 * Richard, drive A (2026-09-23): "I actually get a bit annoyed when I'm for example doing styles or
 * backend stuff in the left panel, click a node and the props take over from what I was doing."
 * The takeover was `switchToNode` writing the node's panel into the ONE active slot and stashing
 * `previousActiveId`, and `hidePanels` switching back. These rows grade the model half: after the
 * move, selection and deselection never touch `ActiveId`.
 *
 * ⚠️ The model half only. That the inspector column DRAWS the panel, and that Styles is still on
 * screen beside it, is INS-001 AC4/AC5 — a drive, not this file.
 */

jest.mock('@noodl-utils/editorsettings', () => ({
  EditorSettings: {
    instance: {
      on: () => undefined,
      get: () => undefined
    }
  }
}));

import { SidebarModel, SidebarModelEvent } from '@noodl-models/sidebar/sidebarmodel';

const StylesPanel = () => null;
const ComponentsPanel = () => null;
const PropertiesPanel = () => null;
const PortEditorPanel = () => null;

/** Just what `switchToNode` reads: an id for the event, and `type.panels` for the panel choice. */
const node = (id: string, panels?: { name: string }[] | 'none') =>
  ({ id, type: panels ? { panels } : {} }) as TSFixme;

function registerRail() {
  SidebarModel.instance.reset();
  SidebarModel.instance.register({ id: 'components', name: 'Components', order: 1, panel: ComponentsPanel });
  SidebarModel.instance.register({ id: 'styles', name: 'Styles', order: 1.5, panel: StylesPanel });
  SidebarModel.instance.register({
    transient: true,
    followsSelection: true,
    id: 'PropertyEditor',
    name: 'Properties',
    panel: PropertiesPanel
  });
  SidebarModel.instance.register({ transient: true, id: 'PortEditor', name: 'Ports', panel: PortEditorPanel });
}

/** Every event the model raises, in order, from the moment this is called. */
function recordEvents() {
  const seen: string[] = [];
  const group = {};
  for (const event of [SidebarModelEvent.activeChanged, SidebarModelEvent.inspectorChanged]) {
    SidebarModel.instance.on(event, () => seen.push(event), group);
  }
  return { seen, stop: () => SidebarModel.instance.off(group) };
}

beforeEach(registerRail);

describe('AC1 — selecting and deselecting a node leaves the left slot where the person put it', () => {
  it('Styles stays active through a select, and the node panel is in the inspector', () => {
    SidebarModel.instance.switch('styles');
    SidebarModel.instance.switchToNode(node('a'));

    expect(SidebarModel.instance.ActiveId).toBe('styles');
    expect(SidebarModel.instance.InspectorId).toBe('PropertyEditor');
  });

  it('Styles is still active after the deselect, and the inspector is empty', () => {
    SidebarModel.instance.switch('styles');
    SidebarModel.instance.switchToNode(node('a'));
    SidebarModel.instance.hidePanels();

    expect(SidebarModel.instance.ActiveId).toBe('styles');
    expect(SidebarModel.instance.InspectorId).toBeUndefined();
    expect(SidebarModel.instance.getInspector()).toBeNull();
  });

  it('the inspector hands out the node panel it built, for the node that was selected', () => {
    SidebarModel.instance.switchToNode(node('a'));
    const element = SidebarModel.instance.getInspector()() as TSFixme;

    expect(element.type).toBe(PropertiesPanel);
    expect(element.props.model.id).toBe('a');
  });

  it("a second node replaces the first in the inspector — the left slot still isn't touched", () => {
    SidebarModel.instance.switch('components');
    SidebarModel.instance.switchToNode(node('a'));
    SidebarModel.instance.switchToNode(node('b'));

    expect(SidebarModel.instance.ActiveId).toBe('components');
    expect((SidebarModel.instance.getInspector()() as TSFixme).props.model.id).toBe('b');
  });
});

describe('AC2 — the inspector hosts node panels as a category, not just Properties', () => {
  it("a node type that declares its own panel gets THAT panel in the inspector", () => {
    SidebarModel.instance.switch('styles');
    SidebarModel.instance.switchToNode(node('a', [{ name: 'PortEditor' }]));

    expect(SidebarModel.instance.InspectorId).toBe('PortEditor');
    expect(SidebarModel.instance.ActiveId).toBe('styles');
  });

  it("a node type with `panels: 'none'` empties the inspector rather than throwing", () => {
    SidebarModel.instance.switchToNode(node('a'));
    expect(() => SidebarModel.instance.switchToNode(node('b', 'none'))).not.toThrow();

    expect(SidebarModel.instance.InspectorId).toBeUndefined();
    expect(SidebarModel.instance.getInspector()).toBeNull();
  });
});

describe('AC3 — selection raises inspectorChanged, never activeChanged', () => {
  it('a select and a deselect raise one inspectorChanged each and no activeChanged', () => {
    SidebarModel.instance.switch('styles');
    const { seen, stop } = recordEvents();

    SidebarModel.instance.switchToNode(node('a'));
    SidebarModel.instance.hidePanels();
    stop();

    expect(seen).toEqual([SidebarModelEvent.inspectorChanged, SidebarModelEvent.inspectorChanged]);
  });

  it("the left panel's onClose/onOpen are not run by a node selection", () => {
    const onClose = jest.fn();
    const onOpen = jest.fn();
    SidebarModel.instance.register({ id: 'search', name: 'Search', order: 2, panel: StylesPanel, onClose, onOpen });
    SidebarModel.instance.switch('search');
    onOpen.mockClear();

    SidebarModel.instance.switchToNode(node('a'));
    SidebarModel.instance.hidePanels();

    expect(onClose).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('the double-click command reaches the node panel, which is no longer the active one', () => {
  it('invokeInspector sends receivedCommand addressed to the inspector panel', () => {
    SidebarModel.instance.switch('styles');
    SidebarModel.instance.switchToNode(node('a'));

    const received: string[] = [];
    const group = {};
    SidebarModel.instance.on(SidebarModelEvent.receivedCommand, (panelId: string) => received.push(panelId), group);
    SidebarModel.instance.invokeInspector('doubleClick', node('a'));
    SidebarModel.instance.off(group);

    expect(received).toEqual(['PropertyEditor']);
  });
});
