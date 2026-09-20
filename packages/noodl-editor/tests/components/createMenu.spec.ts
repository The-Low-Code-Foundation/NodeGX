/**
 * SPR-005 — the create menu says what it offers, and why it doesn't offer the rest.
 *
 * F83's mechanism was that `ComponentTemplates.getTemplates` filters the cloud template out of
 * every menu except one, and says nothing when it does. These specs pin the two halves of the fix
 * that a screenshot cannot: that the enabled rows are still exactly what the templates declare
 * (nothing was added to what can be created), and that the row put back in their place really
 * lands where it says it does.
 *
 * TVW-001 (e) rewrote half of this file, because R-C removed the thing most of it was about.
 * SPR-005's answer to "you are on a browser sheet" was a **disabled** row explaining which sheet to
 * switch to. There are no sheets: the row is enabled, and it creates into `#__cloud__` from
 * wherever it was opened. What survives from SPR-005 is the part that was never about sheets — the
 * two doors onto a new cloud function agreeing, and the nesting rule.
 *
 * Jasmine, not Jest. `createMenu` imports `ComponentTemplates`, which imports React and
 * `PopupLayer`, so the plain-Node runner in `tests-unit/` refuses it — that boundary working, not a
 * problem to route around.
 */

import { MenuDialogItem } from '@noodl-core-ui/components/popups/MenuDialog';

import { ComponentTemplates } from '../../src/editor/src/views/panels/ComponentsPanelNew/ComponentTemplates';
import { SECTION_LABEL } from '../../src/editor/src/views/panels/ComponentsPanelNew/componentSections';
import {
  buildCreateMenuItems,
  CLOUD_CREATE_PARENT_PATH,
  cloudFunctionUnavailableReason,
  createMenuTitle,
  destinationLabel
} from '../../src/editor/src/views/panels/ComponentsPanelNew/createMenu';
import { CLOUD_SHEET } from '../../src/editor/src/views/panels/ComponentsPanelNew/types';

const NOOP = { onAddComponent: () => undefined, onAddFolder: () => undefined };

/**
 * TVW-009 §2.1 renamed every template label, and `createMenu` no longer exports one.
 * Read from the template itself rather than restating the words here: a spec that keeps
 * its own copy of a label is a second place the vocabulary has to be changed, and the
 * one that goes stale quietly.
 */
const CLOUD_LABEL = ComponentTemplates.instance.cloudFunction.label;

function rows(items: (MenuDialogItem | 'divider')[]): MenuDialogItem[] {
  return items.filter((i): i is MenuDialogItem => i !== 'divider');
}

function labelled(items: (MenuDialogItem | 'divider')[], label: string): MenuDialogItem | undefined {
  return rows(items).find((i) => i.label === label);
}

describe('SPR-005 — where a new component will land', () => {
  it('names the project root when there is no folder', () => {
    // Not the empty string and not a section name: a component created at the root is named
    // `/Name`, and which *section* it then draws in is derived from its graph, not chosen here.
    expect(destinationLabel({})).toBe('the project root');
  });

  it('names the folder, in the trail’s own separator', () => {
    expect(destinationLabel({ parentPath: '/Screens/Admin/' })).toBe('Screens / Admin');
  });

  it('writes a legacy sheet folder the way the tree writes it', () => {
    // TVW-001 (e): the tree draws `/#Design` as `Design`. A menu that promised `#Design` would be
    // naming a destination the person cannot find in the panel.
    expect(destinationLabel({ parentPath: '/#Design/Cards' })).toBe('Design / Cards');
  });

  it('names the cloud folder by its section heading, not by its path', () => {
    expect(destinationLabel({ parentPath: CLOUD_CREATE_PARENT_PATH })).toBe(SECTION_LABEL.cloud);
  });

  it('is what the menu title says', () => {
    expect(createMenuTitle({ parentPath: '/Screens' })).toBe('New in Screens');
  });
});

describe('TVW-001 (e) — why the cloud function template is not on offer', () => {
  it('is on offer in any folder, and says nothing', () => {
    // The wrong-sheet reason is gone with the sheets. A folder is a folder.
    expect(cloudFunctionUnavailableReason({ forParentType: 'folder' })).toBeNull();
  });

  it('explains the nesting rule from the route it protects', () => {
    // The reason a function cannot be nested is that the backend addresses it as a single path
    // segment. A message that only said "not allowed here" would leave the author nowhere to go.
    const reason = cloudFunctionUnavailableReason({ forParentType: 'component' });
    expect(reason).toContain('/functions/<name>');
  });

  it('sends them to the section, now that there is no sheet to name', () => {
    const reason = cloudFunctionUnavailableReason({ forParentType: 'component' });
    expect(reason).toContain(SECTION_LABEL.cloud);
    expect(reason).not.toContain('sheet');
  });
});

describe('SPR-005 — the create menu itself', () => {
  it('offers exactly the templates, in their order, with their labels', () => {
    // The builder must not become a second declaration of what can be created: if it ever disagrees
    // with `getTemplates`, the panel and the canvas trail start offering different things.
    const templates = ComponentTemplates.instance.getTemplates({
      forParentType: 'folder',
      forRuntimeType: 'browser'
    });
    const items = buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'browser' }, NOOP);
    const enabled = rows(items).filter(
      (i) => !i.isDisabled && i.label !== 'New folder' && i.label !== CLOUD_LABEL
    );

    expect(enabled.map((i) => i.label)).toEqual(templates.map((t) => t.label));
  });

  it('offers the cloud function template, enabled, at the root of the cloud section', () => {
    const items = buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'cloud' }, NOOP);
    const item = labelled(items, CLOUD_LABEL);

    expect(item).toBeDefined();
    expect(item.isDisabled).toBeFalsy();
    expect(typeof item.onClick).toBe('function');
  });

  it('offers it from a browser folder too — enabled, and landing in the cloud folder', () => {
    /**
     * TVW-001 (e), the whole point of the slice. Before R-C this row was disabled and said "choose
     * Cloud Functions in the sheet selector"; the selector is gone, so a disabled row here would be
     * an instruction that cannot be followed — F83's finding restored intact.
     *
     * 🔴 The destination is the assertion. Creating into `/Sections` (the folder that was actually
     * right-clicked) would produce `/Sections/chargeCard`, which `isCloudFunctionComponent` does not
     * match and `/functions/:name` cannot address: a cloud function in the tree that no backend
     * ever serves.
     */
    const created: { label: string; parentPath?: string }[] = [];
    const items = buildCreateMenuItems(
      { forParentType: 'folder', runtimeType: 'browser', parentPath: '/Sections' },
      { onAddComponent: (template, parentPath) => created.push({ label: template.label, parentPath }) }
    );
    const item = labelled(items, CLOUD_LABEL);

    expect(item).toBeDefined();
    expect(item.isDisabled).toBeFalsy();
    expect(item.endSlot).toBe(SECTION_LABEL.cloud);

    item.onClick(null as TSFixme);
    expect(created).toEqual([{ label: CLOUD_LABEL, parentPath: CLOUD_CREATE_PARENT_PATH }]);
    expect(CLOUD_CREATE_PARENT_PATH).not.toBe('/Sections');
  });

  it('keeps it disabled inside a component, where no destination would help', () => {
    const items = buildCreateMenuItems({ forParentType: 'component', runtimeType: 'browser' }, NOOP);
    const item = labelled(items, CLOUD_LABEL);

    expect(item).toBeDefined();
    // `isDisabled` is the key `MenuDialog` reads. `disabled` is inert there, and a row that looks
    // disabled but fires is worse than no row at all.
    expect(item.isDisabled).toBe(true);
    expect(item.onClick).toBeUndefined();
    expect(item.tooltip).toContain('/functions/<name>');
  });

  it('never offers it twice', () => {
    const cloud = buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'cloud' }, NOOP);
    const matches = rows(cloud).filter((i) => i.label === CLOUD_LABEL);
    expect(matches.length).toBe(1);
  });

  it('leaves the folder row off when there is nowhere to put a folder', () => {
    // The canvas trail's "+" passes no `onAddFolder`.
    const items = buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'browser' }, {
      onAddComponent: () => undefined
    });
    expect(labelled(items, 'New folder')).toBeUndefined();
  });

  it('creates an ordinary template into the parent path it was given', () => {
    const created: { label: string; parentPath?: string }[] = [];
    const items = buildCreateMenuItems(
      { forParentType: 'folder', runtimeType: 'cloud', parentPath: '/Orders' },
      { onAddComponent: (template, parentPath) => created.push({ label: template.label, parentPath }) }
    );

    labelled(items, CLOUD_LABEL).onClick(null as TSFixme);
    expect(created).toEqual([{ label: CLOUD_LABEL, parentPath: '/Orders' }]);
  });
});

describe('SPR-005 — the two doors onto a new cloud function agree', () => {
  it('is the same template object the workflow-step gesture uses', () => {
    // `WorkflowDocument.createFunctionFromStep` reaches for
    // `ComponentTemplates.instance.cloudFunction`. If the panel's menu ever offered a different
    // template, the two doors would produce two different shapes of "new cloud function".
    const items = buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'cloud' }, NOOP);
    const item = labelled(items, CLOUD_LABEL);

    expect(item.label).toBe(ComponentTemplates.instance.cloudFunction.label);
    expect(item.icon).toBe(ComponentTemplates.instance.cloudFunction.icon);
  });

  it('lands in the same folder the workflow-step gesture lands in', () => {
    // The panel's stand-in row prefixes with `CLOUD_CREATE_PARENT_PATH`; the gesture prefixes with
    // `CLOUD_COMPONENT_PREFIX`. Both are `/#__cloud__/`, and this is the one place that equality is
    // written down.
    expect('/' + CLOUD_SHEET.folderName + '/').toBe(CLOUD_SHEET.pathPrefix);
    expect(CLOUD_CREATE_PARENT_PATH + '/').toBe(CLOUD_SHEET.pathPrefix);
  });

  it('holds a typed name to the rule the gesture mints by', () => {
    // `planFunctionFromStep` will only ever mint a name matching FUNCTION_NAME_RE. Before SPR-005
    // the panel accepted anything, so the two doors could produce functions of which only one was
    // addressable.
    const cloud = ComponentTemplates.instance.cloudFunction;

    expect(cloud.validateLocalName('chargeCard')).toBeNull();
    expect(cloud.validateLocalName('_private-fn2')).toBeNull();

    expect(cloud.validateLocalName('Charge card')).toContain('/functions/');
    expect(cloud.validateLocalName('2fa')).toBeTruthy();
    expect(cloud.validateLocalName('a,b')).toBeTruthy();
  });

  it('holds nothing else to it — a visual component may be called anything', () => {
    const visual = ComponentTemplates.instance
      .getTemplates({ forParentType: 'folder', forRuntimeType: 'browser' })
      // By `templateId`. This line said `t.label === 'Visual Component'` until TVW-009
      // renamed it, at which point `find` returned undefined and the assertion below
      // threw on a property of nothing — the failure `cloudFunction`'s comment predicted,
      // landing in a spec rather than in the menu.
      .find((t) => t.templateId === 'visual');

    expect(visual.validateLocalName('My Card!')).toBeNull();
  });

  it('asks for the name it actually wants', () => {
    // F26's argument one level up: "New component name / e.g. ProductCard" is the wrong question to
    // put in front of someone naming an HTTP endpoint.
    const cloud = ComponentTemplates.instance.cloudFunction;
    expect(cloud.promptLabel).toBe('New cloud function name');
    expect(cloud.promptPlaceholder).toBe('e.g. chargeCard');
  });
});

/**
 * TVW-009 AC3 — every `New …` row says one of the five words.
 *
 * §2.1's table is a promise about what a person reads, and the only place the promise is
 * kept is the list `buildCreateMenuItems` returns. Pinned as the exact strings rather than
 * "contains New", because "Create Visual Component" contains it too.
 */
describe('TVW-009 AC3 — the create menu speaks the vocabulary', () => {
  it('offers New page, New component and New logic component in a browser folder', () => {
    const items = rows(buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'browser' }, NOOP));
    const labels = items.filter((i) => !i.isDisabled).map((i) => i.label);

    expect(labels).toContain('New page');
    expect(labels).toContain('New component');
    expect(labels).toContain('New logic component');
    expect(labels).toContain('New folder');
  });

  it('leaves no row saying Create, and none saying the retired words', () => {
    // The whole menu, from both parent types and both runtimes, so a row that only appears
    // in the cloud section cannot keep an old label by never being looked at.
    const every = [
      ...rows(buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'browser' }, NOOP)),
      ...rows(buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'cloud' }, NOOP)),
      ...rows(buildCreateMenuItems({ forParentType: 'component', runtimeType: 'browser' }, NOOP))
    ].map((i) => i.label);

    expect(every.length).toBeGreaterThan(3);
    for (const label of every) {
      expect(label.startsWith('New ')).toBe(true);
      expect(/\b(sandbox|bench|page component|component node)\b/i.test(label)).toBe(false);
    }
  });

  it('derives the test id from templateId, so a rename cannot silently unhook a selector', () => {
    const items = rows(buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'browser' }, NOOP));
    const page = items.find((i) => i.label === 'New page');

    expect(page.testId).toBe('create-page');
  });

  it('mints the cloud row exactly once now that the check is by identity', () => {
    // 🔴 The regression this guards: `alreadyOffered` compared `template.label` against a
    // constant string. TVW-009 changed every label, so that comparison would have gone
    // false in the cloud section, where `getTemplates` already returns the cloud template —
    // and the menu would have shown two New cloud function rows. Nothing else would have
    // failed; the count is the only witness.
    const cloud = rows(buildCreateMenuItems({ forParentType: 'folder', runtimeType: 'cloud' }, NOOP));
    const label = ComponentTemplates.instance.cloudFunction.label;

    expect(label).toBe('New cloud function');
    expect(cloud.filter((i) => i.label === label).length).toBe(1);
  });
});
