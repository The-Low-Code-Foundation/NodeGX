/**
 * COMMUNITY-FOLDERDELETE — Delete on a folder row in the Components panel.
 *
 * A folder row is either a plain folder (`/Screens`, holding `/Screens/Home` …) or a
 * component-folder: a component that has components under it (`/Accordion` with
 * `/Accordion/Section`). Every multi-part prefab clones in as the second kind. Delete on
 * either used to stop at `console.log('Folder deletion not yet implemented')`, so the
 * menu item did nothing at all.
 *
 * The model half lives here, apart from the React hook, so a spec can drive it without a
 * rendered tree (the same split as `makeComponentHome`). The hook asks `planFolderDelete`
 * what would go, shows `folderDeleteMessage` in a confirm, and on yes calls
 * `deleteFolderAsOne`.
 */
import type { ComponentModel } from '@noodl-models/componentmodel';
import type { ProjectModel } from '@noodl-models/projectmodel';
import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

/** `createFolder` keeps an empty folder visible with a hidden `<folder>/.placeholder` component. */
const PLACEHOLDER_LEAF = '.placeholder';

/** The slice of `ProjectModel` this file uses, so a spec can hand it a narrow double. */
export type FolderDeleteProject = Pick<ProjectModel, 'getComponents' | 'deleteComponentAllowed' | 'removeComponent'>;

export interface FolderDeletePlan {
  ok: boolean;
  /** Why not, in the words the user is shown. Absent when `ok`. */
  reason?: string;
  /** The folder's path, the full component-name prefix (`/Accordion`). */
  path: string;
  /** What the row reads (`Accordion`). */
  label: string;
  /** The component the folder row *is*, when it is a component-folder. */
  folderComponent?: ComponentModel;
  /** The components under it that a person would recognise, by path. Placeholders left out. */
  children: ComponentModel[];
  /** Everything to remove, deepest first, placeholders included, the folder's own component last. */
  toRemove: ComponentModel[];
}

function depth(name: string) {
  return name.split('/').length;
}

function isPlaceholder(component: ComponentModel) {
  return component.name.split('/').pop() === PLACEHOLDER_LEAF;
}

/**
 * Work out what deleting the folder at `path` would remove, and whether it may.
 *
 * Refuses, naming the component, when anything inside fails the project's own
 * `deleteComponentAllowed` (the home component, an annotation-locked one): half a prefab
 * left behind would be worse than none deleted.
 */
export function planFolderDelete(project: FolderDeleteProject, path: string, label: string): FolderDeletePlan {
  const prefix = path + '/';
  const inside = project.getComponents().filter((c) => c.name === path || c.name.startsWith(prefix));

  const folderComponent = inside.find((c) => c.name === path);
  const children = inside
    .filter((c) => c !== folderComponent && !isPlaceholder(c))
    .sort((a, b) => a.name.localeCompare(b.name));
  const toRemove = [...inside].sort((a, b) => depth(b.name) - depth(a.name) || a.name.localeCompare(b.name));

  const plan: FolderDeletePlan = { ok: true, path, label, folderComponent, children, toRemove };

  for (const component of toRemove) {
    const allowed = project.deleteComponentAllowed(component);
    if (!allowed?.canBeDelete) {
      const where = component === folderComponent ? `"${label}"` : `"${relativeName(path, component)}", inside it,`;
      return {
        ...plan,
        ok: false,
        reason: `"${label}" can't be deleted: ${where} ${describeRefusal(allowed?.reason)}`
      };
    }
  }

  return plan;
}

function describeRefusal(reason: string | undefined) {
  if (reason === "Home component can't be deleted") {
    return 'is the home component. Make another component home first.';
  }
  return "can't be deleted.";
}

/** `/Accordion/Section` under `/Accordion` reads `Section`; deeper ones keep their sub-path. */
export function relativeName(path: string, component: ComponentModel) {
  return component.name.startsWith(path + '/') ? component.name.slice(path.length + 1) : component.localName;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** How many child names the confirm lists before it says "and N more". */
export const LISTED_CHILDREN = 12;

export function folderDeleteTitle(plan: FolderDeletePlan) {
  return plan.folderComponent ? 'Delete component' : 'Delete folder';
}

/**
 * The confirm's body, as HTML (`showConfirmModal` renders it so). Names every child that
 * goes with the folder, so nobody learns from the canvas that `Section` went with `Accordion`.
 */
export function folderDeleteMessage(plan: FolderDeletePlan): string {
  const name = `<b>${escapeHtml(plan.label)}</b>`;
  const count = plan.children.length;
  const what = plan.folderComponent ? name : `the folder ${name}`;

  if (count === 0) {
    return plan.folderComponent ? `Delete ${name}?` : `Delete the empty folder ${name}?`;
  }

  const components = count === 1 ? 'the component inside it' : `all ${count} components inside it`;
  const listed = plan.children.slice(0, LISTED_CHILDREN).map((c) => `<li>${escapeHtml(relativeName(plan.path, c))}</li>`);
  if (count > LISTED_CHILDREN) listed.push(`<li>…and ${count - LISTED_CHILDREN} more</li>`);

  return (
    `This deletes ${what} and ${components}:` +
    `<ul style="margin: 8px 0; padding-left: 20px;">${listed.join('')}</ul>` +
    `Undo brings them all back.`
  );
}

export function folderDeleteConfirmLabel(plan: FolderDeletePlan) {
  const total = plan.children.length + (plan.folderComponent ? 1 : 0);
  return total > 1 ? `Delete ${total} components` : 'Delete';
}

/**
 * Remove every component in the plan as ONE undo step.
 *
 * The group is built with the label alone and each `removeComponent` pushes its own inverse
 * onto it (`UndoActionGroup.push` advances the pointer without executing), then the group goes
 * on the queue with `push`, not `pushAndDo`: the removals have already happened. Undo walks
 * the group backwards, so the folder's own component comes back before its children.
 */
export function deleteFolderAsOne(project: FolderDeleteProject, plan: FolderDeletePlan): UndoActionGroup {
  const label = `Delete ${plan.label}`;
  const group = new UndoActionGroup({ label });
  for (const component of plan.toRemove) {
    project.removeComponent(component, { undo: group, label });
  }
  UndoQueue.instance.push(group);
  return group;
}
