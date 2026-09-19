/**
 * TVW-007 AC3 — the history remembers the ROUTE, and the trail rule reads it.
 *
 * `NavigationHistory` names exactly one import, `ProjectModel`, and uses exactly one thing on it:
 * `getComponentWithName`. That is what makes it reachable from this plain-Node runner at all, and
 * the mock below is the whole of the project as far as this class is concerned — so a spec that
 * passes here is grading the real class, not a rewrite of it.
 */
const PROJECT: { components: Set<string> } = { components: new Set<string>() };

jest.mock('@noodl-models/projectmodel', () => ({
  ProjectModel: {
    get instance() {
      return {
        getComponentWithName: (name: string) => (PROJECT.components.has(name) ? { name, fullName: name } : undefined)
      };
    }
  }
}));

import { instanceParentCrumb, leafName } from '../../src/editor/src/views/nodegrapheditor/instanceTrail';
import { NavigationHistory } from '../../src/editor/src/views/nodegrapheditor/NavigationHistory';

const HOME = '/Pages/Home';
const HERO = '/Sections/Hero';
const ABOUT = '/Pages/About';

function newHistory() {
  PROJECT.components = new Set([HOME, HERO, ABOUT]);
  const switched: string[] = [];
  const history = new NavigationHistory({
    owner: { switchToComponent: (component: TSFixme) => switched.push(component.name) }
  });
  return { history, switched };
}

const component = (name: string) => ({ name, fullName: name });
const resolve = (name: string) => (PROJECT.components.has(name) ? { name } : undefined);

describe('TVW-007 AC3 — entries carry {name, via}', () => {
  it('records null for a route that is not an instance door', () => {
    const { history } = newHistory();
    history.push(component(HOME));

    expect(history.history).toEqual([{ name: HOME, via: null }]);
  });

  it('records the parent for a route that IS an instance door', () => {
    const { history } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);

    expect(history.history).toEqual([
      { name: HOME, via: null },
      { name: HERO, via: HOME }
    ]);
  });

  it('🔴 the SAME component carries different routes at different steps', () => {
    // The reason `via` lives on the entry and not beside `activeComponent`: one field would be
    // wrong the moment you went back, and this is the shape that proves it cannot be.
    const { history } = newHistory();
    history.push(component(HERO)); // from the panel
    history.push(component(HOME));
    history.push(component(HERO), HOME); // through the instance

    expect(history.history.map((e) => e.via)).toEqual([null, null, HOME]);
  });
});

describe('TVW-007 AC3 — goBack from an instance-entered component rebuilds the containment trail', () => {
  it('walks back onto the entry whose route is recorded, and the rule reads it', () => {
    const { history, switched } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);
    history.push(component(ABOUT));

    // Standing on About, reached from nowhere in particular: the folder path.
    expect(instanceParentCrumb(ABOUT, history.currentEntry(), resolve)).toBeNull();

    expect(history.goBack()).toBe(true);
    expect(switched).toEqual([HERO]);

    // Back on Hero, and the trail that was on screen at THAT step is rebuilt: `[◆ Home] › Hero`.
    expect(instanceParentCrumb(HERO, history.currentEntry(), resolve)).toEqual({
      name: 'Home',
      fullName: HOME,
      component: { name: HOME }
    });

    expect(history.goBack()).toBe(true);
    expect(instanceParentCrumb(HOME, history.currentEntry(), resolve)).toBeNull();
  });

  it('goForward rebuilds the same trail again', () => {
    const { history } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);
    history.goBack();

    expect(history.goForward()).toBe(true);
    expect(instanceParentCrumb(HERO, history.currentEntry(), resolve)?.fullName).toBe(HOME);
  });
});

describe('TVW-007 AC3 — discardInvalidEntries and a deleted parent', () => {
  it('🔴 KEEPS the entry and clears its route — both halves, because either alone passes wrongly', () => {
    const { history } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);

    PROJECT.components.delete(HOME);
    history.discardInvalidEntries();

    // Half one: Hero is still there. An implementation that dropped the entry — which is what §4
    // asked for — fails HERE, and would pass the `via` assertion below by having nothing to assert.
    expect(history.history.map((e) => e.name)).toEqual([HERO]);
    // Half two: the dead route is gone, so no crumb is drawn for a component that no longer exists.
    expect(history.history[0].via).toBeNull();
    expect(instanceParentCrumb(HERO, history.currentEntry(), resolve)).toBeNull();
  });

  it('still drops an entry whose own component is deleted', () => {
    const { history } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);

    PROJECT.components.delete(HERO);
    history.discardInvalidEntries();

    expect(history.history.map((e) => e.name)).toEqual([HOME]);
  });

  it('leaves a live route alone', () => {
    const { history } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);

    history.discardInvalidEntries();

    expect(history.history[1].via).toBe(HOME);
  });

  it('onComponentRemoved removes the component through the same rule', () => {
    const { history } = newHistory();
    history.push(component(HOME));
    history.push(component(HERO), HOME);

    PROJECT.components.delete(HERO);
    history.onComponentRemoved(component(HERO));

    expect(history.history.map((e) => e.name)).toEqual([HOME]);
  });
});

describe('TVW-007 — instanceParentCrumb refuses to draw a route it cannot stand behind', () => {
  it('draws nothing when no history has been pushed at all', () => {
    expect(instanceParentCrumb(HERO, undefined, resolve)).toBeNull();
  });

  it('🔴 draws nothing when the entry is for a DIFFERENT component than the canvas', () => {
    // A `pushHistory: false` route (a workflow canvas, `WorkflowEditorService`) leaves the index
    // on the previous component. Reading its `via` would draw a real, live crumb for a parent
    // that has nothing to do with what is on screen.
    PROJECT.components = new Set([HOME, HERO, ABOUT]);
    const stale = { name: HERO, via: HOME };

    expect(instanceParentCrumb(ABOUT, stale, resolve)).toBeNull();
  });

  it('draws nothing when the parent no longer resolves', () => {
    PROJECT.components = new Set([HERO]);

    expect(instanceParentCrumb(HERO, { name: HERO, via: HOME }, resolve)).toBeNull();
  });

  it('draws nothing for a component that claims itself as its parent', () => {
    PROJECT.components = new Set([HERO]);

    expect(instanceParentCrumb(HERO, { name: HERO, via: HERO }, resolve)).toBeNull();
  });

  it('leafName takes the last segment, and a bare name is its own leaf', () => {
    expect(leafName('/Pages/Home')).toBe('Home');
    expect(leafName('Home')).toBe('Home');
  });
});
