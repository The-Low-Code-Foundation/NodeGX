/**
 * TVW-007 AC4 — the crumb kinds, asserted on the rendered DOM.
 *
 * `renderToStaticMarkup` runs no effects and there is no jsdom in this repo, so what this file
 * claims is what the bar DRAWS, not what pressing it does. That is the right half to grade here:
 * AC4 is about telling the kinds apart by looking, and the two kinds now differ in the markup —
 * an instance crumb is a `<button>` carrying a diamond, a folder crumb is neither.
 *
 * The mocks below are the bar's leaf dependencies — an icon set that calls `require.context`, a
 * popup that reads `document`, the viewer socket. None of them is part of the crumb decision; the
 * mapping from `componentTrail` to markup is the real component's.
 */
jest.mock('@noodl-core-ui/components/common/Icon', () => ({
  // `Icon`'s module body calls `require.context(...)`, a webpack API ts-jest rejects outright.
  Icon: () => null,
  IconName: new Proxy({}, { get: (_: unknown, key: string) => String(key) }),
  IconSize: { Tiny: 'tiny', Small: 'small', Default: 'default' },
  IconVariant: {}
}));

jest.mock('@noodl-core-ui/components/inputs/IconButton', () => ({
  IconButton: () => null,
  IconButtonVariant: { OpaqueOnHover: 'opaque-on-hover' }
}));

jest.mock('@noodl-core-ui/components/popups/MenuDialog', () => ({ MenuDialogWidth: { Default: 'default' } }));

jest.mock('@noodl-core-ui/components/popups/Tooltip', () => ({
  // Renders its child, so a crumb wrapped in a tooltip is still in the markup — which is exactly
  // the case a folder crumb takes.
  Tooltip: ({ children }: TSFixme) => children
}));

jest.mock('../../src/editor/src/ViewerConnection', () => ({ ViewerConnection: { instance: null } }));

jest.mock('../../src/editor/src/views/ShowContextMenuInPopup', () => ({ showContextMenuInPopup: () => undefined }));

jest.mock('../../src/editor/src/views/panels/ComponentsPanelNew/createMenu', () => ({
  buildCreateMenuItems: () => [],
  createMenuTitle: () => 'New component',
  CLOUD_CREATE_PARENT_PATH: '/#__cloud__'
}));

jest.mock('../../src/editor/src/views/panels/ComponentsPanelNew/hooks/useComponentActions', () => ({
  useComponentActions: () => ({ handleAddComponent: () => undefined })
}));

jest.mock('@noodl-models/nodelibrary/ComponentIcon', () => ({ getComponentIconType: () => 'Component' }));

jest.mock('@noodl-models/nodelibrary/NodeLibraryData', () => ({
  RuntimeType: { Browser: 'browser', Cloud: 'cloud', Workflow: 'workflow' }
}));

jest.mock('@noodl-models/projectmodel.utils', () => ({
  getDefaultComponent: () => ({ id: 'root-id', name: '/Main' })
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  ComponentTrailItem,
  NodeGraphComponentTrail
} from '../../src/editor/src/views/NodeGraphComponentTrail/NodeGraphComponentTrail';

const HOME = '/Pages/Home';
const HERO = '/Sections/Hero';

/** `[◆ Home] › Hero` — what `OverlayViews.updateTitle` builds for an instance route. */
const CONTAINMENT_TRAIL: ComponentTrailItem[] = [
  {
    name: 'Home',
    fullName: HOME,
    component: { name: HOME },
    isCurrent: false,
    stateText: null,
    isInstanceCrumb: true
  },
  { name: 'Hero', fullName: HERO, component: { name: HERO }, isCurrent: true, stateText: null }
];

/** `Sections › Hero` — the same component, reached from the panel. */
const FOLDER_TRAIL: ComponentTrailItem[] = [
  // A folder crumb has no `component`: that is what makes it inert.
  { name: 'Sections', fullName: '/Sections', isCurrent: false, stateText: null },
  { name: 'Hero', fullName: HERO, component: { name: HERO }, isCurrent: true, stateText: null }
];

function render(componentTrail: ComponentTrailItem[]) {
  return renderToStaticMarkup(
    React.createElement(NodeGraphComponentTrail, {
      componentTrail,
      canNavigateBack: true,
      canNavigateForward: false,
      onSwitchToComponent: () => undefined,
      onHistoryBack: () => undefined,
      onHistoryForward: () => undefined,
      readOnly: true // keeps the "+" out of the markup; it is not this spec's subject
    } as TSFixme)
  );
}

/** The crumbs only — the bar's own controls are buttons too and are not crumbs. */
function crumbButtons(html: string): string[] {
  return html.match(/<button[^>]*data-test="trail-instance-crumb-[^"]*"/g) ?? [];
}

describe('TVW-007 AC4 — an instance crumb has the diamond', () => {
  it('draws the diamond on the crumb that was come through', () => {
    const html = render(CONTAINMENT_TRAIL);

    expect(html).toContain('data-test="trail-instance-diamond"');
    expect(html).toContain('data-test="trail-instance-crumb-/Pages/Home"');
  });

  it('🔴 draws it ONCE — on the parent, not on the component you are standing in', () => {
    const html = render(CONTAINMENT_TRAIL);

    expect((html.match(/trail-instance-diamond/g) ?? []).length).toBe(1);
    expect(html).not.toContain('data-test="trail-instance-crumb-/Sections/Hero"');
  });

  it('names both crumbs, in route order', () => {
    const html = render(CONTAINMENT_TRAIL);

    expect(html.indexOf('>Home<')).toBeGreaterThan(-1);
    expect(html.indexOf('>Home<')).toBeLessThan(html.indexOf('>Hero<'));
  });
});

describe('TVW-007 AC4 — a folder crumb has no button', () => {
  it('draws no crumb button and no diamond for the folder trail', () => {
    const html = render(FOLDER_TRAIL);

    expect(crumbButtons(html)).toEqual([]);
    expect(html).not.toContain('trail-instance-diamond');
  });

  it('🔴 the two arms differ on the SAME component — the kind is the route, not the name', () => {
    // Hero is the current component in both. If the crumb button came from something about Hero
    // rather than from how it was reached, these two counts would be equal.
    expect(crumbButtons(render(CONTAINMENT_TRAIL)).length).toBe(1);
    expect(crumbButtons(render(FOLDER_TRAIL)).length).toBe(0);
  });

  it('still draws the folder crumb itself, inert', () => {
    const html = render(FOLDER_TRAIL);

    expect(html).toContain('>Sections<');
  });
});

describe('TVW-007 AC4 — the instance crumb is reachable', () => {
  it('is a real button, typed, so it is keyboard-reachable and does not submit anything', () => {
    const html = render(CONTAINMENT_TRAIL);
    const crumb = html.match(/<button[^>]*data-test="trail-instance-crumb-\/Pages\/Home"[^>]*>/)?.[0] ?? '';

    expect(crumb).toContain('type="button"');
  });

  it('says where it goes before it is pressed', () => {
    expect(render(CONTAINMENT_TRAIL)).toContain('title="Back to Home"');
  });

  it('the current crumb is still marked as the page', () => {
    expect(render(CONTAINMENT_TRAIL)).toContain('aria-current="page"');
  });
});
