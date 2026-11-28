import type { ComponentModel } from '@noodl-models/componentmodel';
import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

import {
  deleteFolderAsOne,
  folderDeleteConfirmLabel,
  folderDeleteMessage,
  FolderDeleteProject,
  LISTED_CHILDREN,
  planFolderDelete
} from '../../src/editor/src/views/panels/ComponentsPanelNew/folderDelete';

/**
 * COMMUNITY-FOLDERDELETE — Delete on a folder row of the Components panel.
 *
 * Reported by a community builder: Delete on a cloned prefab did nothing. A prefab with a
 * sub-component (`/Accordion` + `/Accordion/Section`) lands as a component-folder row, and
 * the panel's `handleDelete` returned at `console.log('Folder deletion not yet implemented')`
 * for every folder row. These specs drive the model half: what goes, what is refused, what
 * the confirm says, and that one undo brings the whole set back.
 *
 * Jasmine, not Jest — the editor suite runs inside Electron (it also runs under plain jest).
 */

interface FakeComponent {
  name: string;
  localName: string;
}

function component(name: string): FakeComponent {
  return { name, localName: name.split('/').pop() };
}

/** A narrow double that removes and re-adds the way `ProjectModel.removeComponent` does. */
function fakeProject(names: string[], refuse: Record<string, string> = {}) {
  const components = names.map(component);
  const project = {
    components,
    getComponents: () => components.slice(),
    deleteComponentAllowed: (c: FakeComponent) =>
      refuse[c.name] ? { canBeDelete: false, reason: refuse[c.name] } : { canBeDelete: true },
    removeComponent: (c: FakeComponent, args?: { undo?: UndoActionGroup; label?: string }) => {
      const idx = components.indexOf(c);
      if (idx === -1) return false;
      components.splice(idx, 1);
      args?.undo?.push({
        do: () => {
          const at = components.indexOf(c);
          if (at !== -1) components.splice(at, 1);
        },
        undo: () => components.push(c)
      });
      return true;
    }
  };
  return project;
}

const asProject = (p: ReturnType<typeof fakeProject>) => p as unknown as FolderDeleteProject;
const names = (list: ComponentModel[] | FakeComponent[]) => (list as FakeComponent[]).map((c) => c.name);

describe('Components panel: deleting a folder row (COMMUNITY-FOLDERDELETE)', () => {
  beforeEach(() => UndoQueue.instance.clear());

  it('a cloned prefab goes with every component inside it, children first', () => {
    const p = fakeProject(['/App', '/Accordion', '/Accordion/Section', '/Accordion/Section/Icon', '/Accordionist']);
    const plan = planFolderDelete(asProject(p), '/Accordion', 'Accordion');

    expect(plan.ok).toBe(true);
    expect(names(plan.toRemove)).toEqual(['/Accordion/Section/Icon', '/Accordion/Section', '/Accordion']);
    expect(names(plan.children)).toEqual(['/Accordion/Section', '/Accordion/Section/Icon']);

    deleteFolderAsOne(asProject(p), plan);
    // `/Accordionist` shares the prefix but not the folder: it stays.
    expect(names(p.components)).toEqual(['/App', '/Accordionist']);
  });

  it('one undo brings the whole set back, and redo takes it again', () => {
    const p = fakeProject(['/App', '/CRUD Screen', '/CRUD Screen/Item Row']);
    deleteFolderAsOne(asProject(p), planFolderDelete(asProject(p), '/CRUD Screen', 'CRUD Screen'));
    expect(names(p.components)).toEqual(['/App']);

    UndoQueue.instance.undo();
    expect(names(p.components).sort()).toEqual(['/App', '/CRUD Screen', '/CRUD Screen/Item Row']);
    // The folder's own component comes back first, before the child that sits under it.
    expect(names(p.components)).toEqual(['/App', '/CRUD Screen', '/CRUD Screen/Item Row']);

    UndoQueue.instance.redo();
    expect(names(p.components)).toEqual(['/App']);
  });

  it('a plain folder deletes its components, including the hidden placeholder', () => {
    const p = fakeProject(['/App', '/Screens/.placeholder', '/Screens/Home', '/Screens/About']);
    const plan = planFolderDelete(asProject(p), '/Screens', 'Screens');

    expect(plan.folderComponent).toBeUndefined();
    expect(names(plan.children)).toEqual(['/Screens/About', '/Screens/Home']);

    deleteFolderAsOne(asProject(p), plan);
    expect(names(p.components)).toEqual(['/App']);
  });

  it('refuses the whole folder, naming the child, when the home component is inside it', () => {
    const p = fakeProject(['/Pages', '/Pages/Home', '/Pages/About'], {
      '/Pages/Home': "Home component can't be deleted"
    });
    const plan = planFolderDelete(asProject(p), '/Pages', 'Pages');

    expect(plan.ok).toBe(false);
    expect(plan.reason).toContain('"Home"');
    expect(plan.reason).toContain('home component');
    // Nothing removed: half a folder left behind would be worse than none.
    expect(p.components.length).toBe(3);
  });

  it('the confirm names every child, escaped, and counts the components on its button', () => {
    const p = fakeProject(['/Accordion', '/Accordion/Section', '/Accordion/<b>Bold</b>']);
    const plan = planFolderDelete(asProject(p), '/Accordion', 'Accordion');
    const message = folderDeleteMessage(plan);

    expect(message).toContain('<b>Accordion</b>');
    expect(message).toContain('all 2 components inside it');
    expect(message).toContain('<li>Section</li>');
    expect(message).toContain('<li>&lt;b&gt;Bold&lt;/b&gt;</li>');
    expect(folderDeleteConfirmLabel(plan)).toBe('Delete 3 components');
  });

  it('a long list stops and says how many more', () => {
    const children = Array.from({ length: LISTED_CHILDREN + 3 }, (_, i) => `/Kit/Part ${String(i).padStart(2, '0')}`);
    const p = fakeProject(['/Kit', ...children]);
    const message = folderDeleteMessage(planFolderDelete(asProject(p), '/Kit', 'Kit'));

    expect((message.match(/<li>/g) || []).length).toBe(LISTED_CHILDREN + 1);
    expect(message).toContain('…and 3 more');
  });

  it('an empty folder asks in one line', () => {
    const p = fakeProject(['/Empty/.placeholder']);
    const plan = planFolderDelete(asProject(p), '/Empty', 'Empty');

    expect(folderDeleteMessage(plan)).toBe('Delete the empty folder <b>Empty</b>?');
    expect(folderDeleteConfirmLabel(plan)).toBe('Delete');
  });
});
