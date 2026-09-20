/**
 * TVW-007 — the crumbs `updateTitle` hands the bar, for both trail shapes.
 *
 * This is the half that used to be unreachable: thirty lines inside `OverlayViews.updateTitle`,
 * needing a live `ProjectModel` and an Electron renderer to run at all. What it decides is which
 * of TWO plausible trails to draw for the same component, so the arms are enumerated here rather
 * than looked at.
 *
 * ⚠️ The folder-path cases are a REGRESSION FLOOR, not new behaviour: they state what the trail
 * drew before this task, so the containment branch cannot quietly become the only branch.
 */
import { buildComponentTrail } from '../../src/editor/src/views/nodegrapheditor/instanceTrail';

const HOME = '/Pages/Home';
const HERO = '/Sections/Hero';

const EXISTS = new Set([HOME, HERO, '/Sections']);
const resolve = (name: string) => (EXISTS.has(name) ? { name } : undefined);

function build(over: Partial<Parameters<typeof buildComponentTrail>[0]> = {}) {
  return buildComponentTrail({
    fullName: HERO,
    nameParts: ['Sections', 'Hero'],
    entry: undefined,
    stateText: null,
    hasDescent: false,
    resolve,
    ...over
  });
}

describe('TVW-007 — entered through an instance: the route', () => {
  const trail = () => build({ entry: { name: HERO, via: HOME, viaNodeId: null } });

  it('draws exactly two crumbs — the parent and the current component', () => {
    expect(trail().map((c) => c.name)).toEqual(['Home', 'Hero']);
  });

  it('🔴 the folder crumb is GONE, not pushed along in front of it', () => {
    // `Home › Sections › Hero` would be three crumbs of two kinds — one route and one folder —
    // and only the first is a place the person has been.
    expect(trail().map((c) => c.fullName)).not.toContain('/Sections');
  });

  it('marks the parent as the instance crumb and the leaf as current', () => {
    const [parent, current] = trail();

    expect(parent.isInstanceCrumb).toBe(true);
    expect(parent.isCurrent).toBe(false);
    expect(parent.component).toEqual({ name: HOME });

    expect(current.isInstanceCrumb).toBeUndefined();
    expect(current.isCurrent).toBe(true);
    expect(current.fullName).toBe(HERO);
  });

  it('carries the read-only marker onto the current crumb', () => {
    const trail = build({ entry: { name: HERO, via: HOME, viaNodeId: null }, stateText: 'Read only' });

    expect(trail[1].stateText).toBe('Read only');
  });

  it('works for a component at the project root, which has one name part', () => {
    const trail = buildComponentTrail({
      fullName: '/Hero',
      nameParts: ['Hero'],
      entry: { name: '/Hero', via: HOME, viaNodeId: null },
      hasDescent: false,
      resolve: (name) => (name === HOME || name === '/Hero' ? { name } : undefined)
    });

    expect(trail.map((c) => c.name)).toEqual(['Home', 'Hero']);
  });
});

describe('TVW-007 — every other route: the folder path, exactly as before', () => {
  it('draws a crumb per path segment', () => {
    expect(build().map((c) => c.fullName)).toEqual(['/Sections', '/Sections/Hero']);
  });

  it('marks only the last as current, and none as an instance crumb', () => {
    expect(build().map((c) => c.isCurrent)).toEqual([false, true]);
    expect(build().every((c) => c.isInstanceCrumb === undefined)).toBe(true);
  });

  it('marks the intermediate segment as a folder and the leaf as not', () => {
    expect(build().map((c) => c.isFolderComponent)).toEqual([true, false]);
  });

  it('a root-level component gets one crumb and no folder', () => {
    const trail = buildComponentTrail({
      fullName: '/Hero',
      nameParts: ['Hero'],
      entry: undefined,
      hasDescent: false,
      resolve
    });

    expect(trail.map((c) => c.name)).toEqual(['Hero']);
    expect(trail[0].isFolderComponent).toBe(false);
  });

  it('resolves each segment, so a folder crumb carries no component and stays inert', () => {
    const trail = buildComponentTrail({
      fullName: HERO,
      nameParts: ['Sections', 'Hero'],
      entry: undefined,
      hasDescent: false,
      resolve: (name) => (name === HERO ? { name } : undefined)
    });

    expect(trail[0].component).toBeUndefined();
    expect(trail[1].component).toEqual({ name: HERO });
  });
});

describe('TVW-007 — the containment trail stands down where another crumb owns the question', () => {
  it('🔴 a workflow descent keeps the folder path, even with a route recorded', () => {
    // WFA-006 prepends the workflow crumb itself. Two prepended crumbs would be two answers to
    // "where did I come from", and the person can only have come from one of them.
    const trail = build({ entry: { name: HERO, via: HOME, viaNodeId: null }, hasDescent: true });

    expect(trail.map((c) => c.fullName)).toEqual(['/Sections', '/Sections/Hero']);
  });

  it('a route pointing at a deleted parent falls back to the folder path', () => {
    const trail = build({ entry: { name: HERO, via: '/Pages/Deleted', viaNodeId: null } });

    expect(trail.map((c) => c.fullName)).toEqual(['/Sections', '/Sections/Hero']);
  });
});
