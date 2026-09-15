/**
 * CHR-008 §3.4 — the Properties panel keeps its identity when the selection moves.
 *
 * Measured before this was built (installed 0.2.4, `verdicts/CHR-008/2026-09-15/identity-0.2.4/`): a
 * Group reselect replaced the panel element, painted it blank from 47 ms and drew the rows at scroll 0
 * until 115 ms — while the remembered scroll, Width and group expansion all came back (FB-017). So
 * the cost of the remount was the blink, not lost state.
 *
 * The cause was the factory `createPanel` returns: `SidePanel` passed it to `React.createElement` as
 * the component TYPE, and it is a new arrow per selection. These rows read what React reads — the
 * element's `type` and `key` — off the factory `SidePanel` now calls.
 *
 * ⚠️ This spec covers the model half. `SidePanel` calling `factory()` rather than
 * `React.createElement(factory)` is graded by the drive's reverted arm (`identity.js`), not here.
 */

jest.mock('@noodl-utils/editorsettings', () => ({
  EditorSettings: {
    instance: {
      on: () => undefined,
      get: () => undefined
    }
  }
}));

import React from 'react';

import { SidebarModel } from '@noodl-models/sidebar';

const PropertiesPanel = () => null;
const PortEditorPanel = () => null;
const ComponentsPanel = () => null;

/** Just what `switchToNode` reads: an id for the event, and `type.panels` for the panel choice. */
const node = (id: string, panels?: { name: string }[]) => ({ id, type: panels ? { panels } : {} }) as TSFixme;

function registerRail() {
  SidebarModel.instance.reset();
  SidebarModel.instance.register({ id: 'components', name: 'Components', order: 1, panel: ComponentsPanel });
  SidebarModel.instance.register({
    transient: true,
    followsSelection: true,
    id: 'PropertyEditor',
    name: 'Properties',
    panel: PropertiesPanel
  });
  SidebarModel.instance.register({ transient: true, id: 'PortEditor', name: 'Ports', panel: PortEditorPanel });
}

/** The element `SidePanel` builds for a panel right now. */
const elementFor = (id: string) => SidebarModel.instance.getPanelComponent(id)() as React.ReactElement<TSFixme>;

beforeEach(registerRail);

describe('the Properties panel follows the selection instead of being rebuilt', () => {
  it('two different nodes give elements React reconciles as ONE component — same type, same key', () => {
    SidebarModel.instance.switchToNode(node('a'));
    const first = elementFor('PropertyEditor');
    SidebarModel.instance.switchToNode(node('b'));
    const second = elementFor('PropertyEditor');

    expect(first.type).toBe(PropertiesPanel);
    expect(second.type).toBe(PropertiesPanel);
    expect(second.key).toBe(first.key);
    // …and the node still arrives: identity kept, the prop moved.
    expect(first.props.model.id).toBe('a');
    expect(second.props.model.id).toBe('b');
  });

  it('control: a panel that does not follow the selection is still rebuilt per selection (a new key)', () => {
    const inputs = [{ name: 'PortEditor' }];
    SidebarModel.instance.switchToNode(node('in-1', inputs));
    const first = elementFor('PortEditor');
    SidebarModel.instance.switchToNode(node('in-2', inputs));
    const second = elementFor('PortEditor');

    expect(first.type).toBe(PortEditorPanel);
    expect(second.key).not.toBe(first.key);
  });

  it('one creation gives one identity — `SidePanel` builds the element twice per selection and must not remount', () => {
    SidebarModel.instance.switchToNode(node('in-1', [{ name: 'PortEditor' }]));
    expect(elementFor('PortEditor').key).toBe(elementFor('PortEditor').key);
  });

  it('a registered panel opened from the rail keeps one identity across switching away and back', () => {
    SidebarModel.instance.switch('components');
    const first = elementFor('components');
    SidebarModel.instance.switchToNode(node('a'));
    SidebarModel.instance.hidePanels();
    expect(SidebarModel.instance.ActiveId).toBe('components');
    expect(elementFor('components').key).toBe(first.key);
    expect(elementFor('components').type).toBe(ComponentsPanel);
  });
});
