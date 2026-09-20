/**
 * P94 STY-007 — the Look menu must not skip past the library.
 *
 * Grades `shouldOpenInCreateMode`, the veto the property panel's Look row now runs over its own
 * caller's ask.
 *
 * 🔴 **The defect this exists to catch has a specific shape, and a lazy gate would miss it.**
 * `variantseditor.onPickVariant` asks for create-mode whenever the PROJECT holds no Look for this
 * node type. Every project holds none until someone makes one — so a test written on a project that
 * already has a Look of its own grades nothing at all, because the caller would not have asked in
 * the first place. The case that matters is: **caller asks, and there IS something to pick.**
 *
 * Found on a copy of `Todo list` by `scripts/devtools/drive-sty007-after-picture.js`, 2026-09-19:
 * the menu rendered its "name your new Look" form and the twelve shipped Looks could not be
 * reached from the property panel at all.
 */
import { buildLookMenu, shouldOpenInCreateMode } from '../../src/editor/src/models/Looks/fieldState';

const SHIPPED = [
  { name: 'Heading 1', shippedFrom: 'text.heading1' },
  { name: 'Body', shippedFrom: 'text.body' }
];

const menuFor = (projectLooks: { name: string; typename: string }[], shippedLooks = SHIPPED) =>
  buildLookMenu({ projectLooks, shippedLooks, typename: 'Text' });

describe('STY-007 — the Look menu opens on the list whenever there is a list', () => {
  it('🔴 a project with NO Looks of its own still shows the shipped library, not the name form', () => {
    // Exactly the state of every project before its first Look — and exactly when the caller asks
    // for create-mode. This is the arm the defect failed.
    const menu = menuFor([]);
    expect(menu.inThisProject.length).toBe(0);
    expect(menu.fromLibrary.length).toBe(2);
    expect(shouldOpenInCreateMode(menu, true)).toBe(false);
  });

  it('a project WITH a Look of its own also shows the list', () => {
    const menu = menuFor([{ name: 'Title', typename: 'Text' }]);
    expect(shouldOpenInCreateMode(menu, true)).toBe(false);
  });

  it('🔴 the shortcut survives where it was right: nothing of its own AND no library for this type', () => {
    // A node type outside the shipped library — `shippedLooksFor` returns [] for anything with no
    // ElementConfig. There is genuinely nothing to pick, so asking for a name is the whole menu.
    const menu = menuFor([], []);
    expect(menu.inThisProject.length).toBe(0);
    expect(menu.fromLibrary.length).toBe(0);
    expect(shouldOpenInCreateMode(menu, true)).toBe(true);
  });

  it('the veto never invents a create-mode the caller did not ask for', () => {
    expect(shouldOpenInCreateMode(menuFor([], []), false)).toBe(false);
    expect(shouldOpenInCreateMode(menuFor([]), false)).toBe(false);
  });

  it('🔴 a library Look the project already took a copy of does not count as something to pick', () => {
    // `buildLookMenu` drops a shipped row whose name the project holds (rule 4). If BOTH shipped
    // names are already taken, the library section is empty and the shortcut is right again — but
    // only because `inThisProject` is then non-empty, which this asserts rather than assumes.
    const menu = menuFor([
      { name: 'Heading 1', typename: 'Text' },
      { name: 'Body', typename: 'Text' }
    ]);
    expect(menu.fromLibrary.length).toBe(0);
    expect(menu.inThisProject.length).toBe(2);
    expect(shouldOpenInCreateMode(menu, true)).toBe(false);
  });

  it('a Look belonging to ANOTHER node type is not this menu’s list', () => {
    // The old caller counted `findVariantsForNodeType`, so a Button Look never made a Text menu
    // open on a list. Neither does this: the veto reads the menu, and the menu filters by type.
    const menu = buildLookMenu({
      projectLooks: [{ name: 'Primary', typename: 'Button' }],
      shippedLooks: [],
      typename: 'Text'
    });
    expect(menu.inThisProject.length).toBe(0);
    expect(shouldOpenInCreateMode(menu, true)).toBe(true);
  });
});
