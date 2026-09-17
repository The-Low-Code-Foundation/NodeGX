/**
 * SPR-005 — one create menu, and it says where the thing will land.
 *
 * F83: the person who commissioned the cloud function runtime could not find cloud function
 * authoring in the editor. The feature was never missing; the *door* was. Two things were true at
 * once:
 *
 *  1. The only way to reach `CloudFunctionComponentTemplate` was a right-click on empty space, on a
 *     sheet you had to have switched to already.
 *  2. On every other sheet the option was **hidden** rather than explained, so a user right-clicking
 *     in a browser folder saw a menu that quietly implied cloud functions do not exist.
 *
 * Both are answered here, in one module, because four surfaces build this menu — the panel's empty
 * space, a folder row, a component row, and the canvas trail's "+" — and four surfaces that each
 * decide what a create menu offers are four surfaces that can disagree. `WorkflowDocument` learned
 * the same lesson about `plannedFunctionForStep`.
 *
 * ## TVW-001 (e) — the door is now the door, not a signpost to one
 *
 * SPR-005 could not offer the cloud template outside the cloud sheet, because creating it there
 * really would have put a cloud function in a browser sheet. So it offered a **disabled** row
 * carrying the reason, and — where a sheet switch was possible — a *Go to Cloud Functions* row that
 * moved you somewhere you could try again.
 *
 * R-C retires sheets, and with them the whole premise. There is no sheet to be on and none to
 * switch to; a cloud function has exactly one destination, `#__cloud__`, and it is now reachable
 * from the panel header's `+` wherever you happen to be. So the row is **enabled everywhere a
 * folder can hold one**, and it names its destination instead of apologising for it. The disabled
 * row survives for the one reason that is still true — a function cannot be nested inside a
 * component — and that reason names no sheet, because there are none.
 *
 * The destination override is the load-bearing part: from a browser folder the row must create at
 * `CLOUD_PATH_PREFIX`, **not** in the folder that was right-clicked. A cloud function nested in
 * `/Sections` is addressed by nothing.
 *
 * ## Naming is not decided here
 *
 * Phase 43 owns whether "cloud function" and "workflow" survive as terms
 * (`dev-docs/tasks/phase-43-backend-authoring-clarity/README.md` §6). Every string below uses the
 * vocabulary `dev-docs/reference/BACKEND-AUTHORING-MODEL.md` mandates today, and none of them
 * argues about it.
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/createMenu
 */

import { IconName } from '@noodl-core-ui/components/common/Icon';
import { MenuDialogItem } from '@noodl-core-ui/components/popups/MenuDialog';

import { ComponentTemplates } from './ComponentTemplates';
import { CLOUD_PATH_PREFIX, SECTION_LABEL } from './componentSections';
import { folderPathLabel, PROJECT_ROOT_LABEL } from './folderDisplay';

/** Which runtime the surrounding section authors for — `ComponentTree`'s prop. */
export type CreateRuntimeType = 'browser' | 'cloud';

/** The label `CloudFunctionComponentTemplate` carries, for the stand-in row. */
export const CLOUD_TEMPLATE_LABEL = 'Cloud Function Component';

/** Where the stand-in row creates from a browser context: the top level of the cloud folder. */
export const CLOUD_CREATE_PARENT_PATH = CLOUD_PATH_PREFIX.slice(0, -1);

export interface CreateContext {
  /**
   * `'folder'` for empty space and folder rows, `'component'` for nesting inside a component. The
   * same value `getTemplates` is filtered by, so the templates' own `parentTypes` declarations stay
   * load-bearing.
   */
  forParentType: 'folder' | 'component';
  /** `'cloud'` only inside the `Cloud functions` section. */
  runtimeType: CreateRuntimeType;
  /**
   * Path of the folder or component that will hold the new thing, as the tree hands it out. TVW-001
   * (e): the tree's paths *are* real component names now — there is no sheet prefix to put back —
   * so this goes to `onAddComponent` unchanged. Undefined at the project root.
   */
  parentPath?: string;
}

export interface CreateHandlers {
  onAddComponent: (template: TSFixme, parentPath?: string) => void;
  /** Omit to leave "Create Folder" off the menu — the canvas trail has no folders. */
  onAddFolder?: (parentPath?: string) => void;
}

/**
 * Where a thing created from this menu will end up, in words a user can check against the tree in
 * front of them: `Cloud functions`, `Design / Cards`, `the project root`.
 *
 * TVW-001 (e): this used to lead with the sheet, because the sheet was the fact the "All" view hid.
 * With sheets gone the folder path is the whole answer — and which *section* a new component lands
 * in is not a destination anyone can name here, because sections are derived from the graph
 * (`componentSections.ts`) rather than chosen. Saying "Components" would be a guess that an empty
 * component happens to satisfy and a page never does.
 */
export function destinationLabel({ parentPath }: Pick<CreateContext, 'parentPath'>): string {
  return folderPathLabel(parentPath) ?? PROJECT_ROOT_LABEL;
}

/** The menu's title row. The whole point of scope item 3 is this one string. */
export function createMenuTitle(context: Pick<CreateContext, 'parentPath'>): string {
  return `New in ${destinationLabel(context)}`;
}

/**
 * Why the cloud function template cannot be created from here, or `null` when it can.
 *
 * TVW-001 (e): one reason survives R-C. The wrong-sheet reason is gone with the sheets — its answer
 * is now simply to create the thing, which the row does.
 *
 * The surviving reason mirrors `CloudFunctionComponentTemplate`'s own `parentTypes: ['folder']`
 * declaration rather than restating a policy of its own: if that template's declaration changes,
 * this goes quiet on its own.
 */
export function cloudFunctionUnavailableReason(
  context: Pick<CreateContext, 'forParentType'>
): string | null {
  if (context.forParentType === 'component') {
    return (
      `A cloud function is addressed by your backend as POST /functions/<name>, so it cannot live ` +
      `inside another component. Create it from the ${SECTION_LABEL.cloud} section instead.`
    );
  }

  return null;
}

/**
 * The menu, for every surface that offers one.
 *
 * Enabled rows are exactly what `getTemplates` returns, in its order and with its labels — this
 * adds nothing to what can be created and removes nothing. The only row this module mints is the
 * cloud one, and only when `getTemplates` has just filtered the real one out.
 */
export function buildCreateMenuItems(
  context: CreateContext,
  { onAddComponent, onAddFolder }: CreateHandlers
): (MenuDialogItem | 'divider')[] {
  const templates = ComponentTemplates.instance.getTemplates({
    forParentType: context.forParentType,
    forRuntimeType: context.runtimeType
  });

  const items: (MenuDialogItem | 'divider')[] = templates.map((template) => ({
    icon: template.icon,
    label: `Create ${template.label}`,
    onClick: () => onAddComponent(template, context.parentPath),
    testId: `create-${template.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  }));

  /**
   * The cloud row, when the runtime filter has just removed it.
   *
   * `getTemplates` is right to filter — a cloud template offered with a browser parent path would
   * create an unaddressable component — so the filter stays and the destination is corrected here
   * instead. The row is the same template object the workflow-step gesture uses, so the two doors
   * cannot drift into two shapes of "new cloud function".
   */
  const alreadyOffered = templates.some((template) => template.label === CLOUD_TEMPLATE_LABEL);
  if (!alreadyOffered) {
    const blocked = cloudFunctionUnavailableReason(context);
    const cloudTemplate = ComponentTemplates.instance.cloudFunction;

    items.push({
      icon: cloudTemplate.icon,
      label: `Create ${cloudTemplate.label}`,
      // `isDisabled`, not `disabled`: MenuDialog reads the former and ignores the latter, which is
      // how "Make Home" on the home component has been rendering enabled all along. A truly
      // disabled row never fires `onClick` at all, so the handler goes with it.
      isDisabled: Boolean(blocked),
      // Says where it lands, because from a browser folder that is *not* the folder you clicked.
      endSlot: blocked ? 'Top level only' : SECTION_LABEL.cloud,
      onClick: blocked ? undefined : () => onAddComponent(cloudTemplate, CLOUD_CREATE_PARENT_PATH),
      tooltip:
        blocked ??
        `Cloud functions run on your backend, not in the browser, so this one lands in ` +
          `${SECTION_LABEL.cloud} rather than here.`,
      tooltipShowAfterMs: 0,
      testId: blocked ? 'create-cloud-function-unavailable' : 'create-cloud-function-elsewhere'
    });
  }

  if (onAddFolder) {
    items.push('divider');
    items.push({
      icon: IconName.FolderClosed,
      label: 'Create Folder',
      onClick: () => onAddFolder(context.parentPath),
      testId: 'create-folder'
    });
  }

  return items;
}
