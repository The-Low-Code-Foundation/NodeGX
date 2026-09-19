/**
 * P94 STY-005 AC1 + AC6 — where the Styles panel sits in the rail, and that the panel it replaces
 * is gone.
 *
 * 🔴 **This reads the registrations out of `router.setup.ts` rather than asserting the literal
 * `1.5`.** The criterion is "between Components and Search", and Components and Search own their
 * own numbers — a spec pinned to `1.5` would go green after someone renumbered Components to 2 and
 * left Styles above it. So the orders of all three are read from the same source and compared.
 * ([[a-recommendation-carries-a-measurement-of-some-property-not-the-right-one]].)
 *
 * 🔴 **And it is a STATIC read, which cannot see reachability** —
 * [[a-static-gate-cannot-see-reachability]]. It proves the registration is written and not wrapped
 * in `if (config.devMode)`; it does NOT prove the panel renders. AC7's drive is what proves that,
 * and nothing here is a substitute for it.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROUTER_SETUP = path.join(__dirname, '../../src/editor/src/router.setup.ts');

interface Registration {
  id: string;
  order?: number;
  experimental: boolean;
  /** True when the `register` call sits inside the `if (config.devMode)` block. */
  isDevModeOnly: boolean;
}

/**
 * Pull every `SidebarModel.instance.register({...})` out of the file with its `id`, `order` and
 * whether it is inside the dev-mode block.
 *
 * The dev-mode test is a brace count from the `if (config.devMode) {` line — crude, and it only
 * has to answer one question about one file that this spec also asserts the shape of.
 */
function readRegistrations(source: string): Registration[] {
  const devModeStart = source.indexOf('if (config.devMode) {');
  let devModeEnd = -1;

  if (devModeStart !== -1) {
    let depth = 0;
    for (let i = source.indexOf('{', devModeStart); i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          devModeEnd = i;
          break;
        }
      }
    }
  }

  const registrations: Registration[] = [];
  const CALL = 'SidebarModel.instance.register({';

  let at = source.indexOf(CALL);
  while (at !== -1) {
    let depth = 0;
    let end = at;
    for (let i = source.indexOf('{', at); i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    const body = source.slice(at, end);
    const id = body.match(/\bid:\s*'([^']+)'/)?.[1] ?? body.match(/\bid:\s*([A-Za-z_$][\w$]*)/)?.[1];
    const order = body.match(/\border:\s*([\d.]+)/)?.[1];

    if (id) {
      registrations.push({
        id,
        order: order === undefined ? undefined : Number(order),
        experimental: /\bexperimental:\s*true/.test(body),
        isDevModeOnly: devModeEnd !== -1 && at > devModeStart && at < devModeEnd
      });
    }

    at = source.indexOf(CALL, end);
  }

  return registrations;
}

describe('STY-005 AC1 — the Styles panel is in the rail, under Components', () => {
  const source = fs.readFileSync(ROUTER_SETUP, 'utf8');
  const registrations = readRegistrations(source);
  const byId = (id: string) => registrations.find((r) => r.id === id);

  it('the reader found the rail at all', () => {
    // A parser that silently matched nothing would make every assertion below vacuously true —
    // [[assert-an-absence-with-a-known-firing-signal-beside-it]]. Components and Search are the
    // two this task is positioned against, so if either is missing the reading is broken, not the rail.
    expect(registrations.length).toBeGreaterThan(8);
    expect(byId('components')).toBeDefined();
    expect(byId('search')).toBeDefined();
  });

  it('registers a panel with the Styles id', () => {
    expect(byId('StylesPanel_ID')).toBeDefined();
  });

  it('🔴 sits strictly between Components and Search — R5, read off all three, not off a literal', () => {
    const styles = byId('StylesPanel_ID');
    const components = byId('components');
    const search = byId('search');

    expect(components.order).toBeDefined();
    expect(search.order).toBeDefined();
    expect(styles.order).toBeDefined();

    expect(styles.order).toBeGreaterThan(components.order);
    expect(styles.order).toBeLessThan(search.order);
  });

  it('🔴 is NOT experimental and NOT inside the devMode block', () => {
    const styles = byId('StylesPanel_ID');

    // The whole argument of the task: `design-tokens` was `experimental` AND inside
    // `if (config.devMode)`, a flag no build declares, so it reached nobody's rail for its entire
    // life. Either of these two being true here would ship the identical nothing.
    expect(styles.experimental).toBe(false);
    expect(styles.isDevModeOnly).toBe(false);
  });

  it('the devMode block still exists and still holds other panels — the control for the test above', () => {
    // If the `if (config.devMode)` block were deleted, `isDevModeOnly` would be `false` for
    // everything and the assertion above would pass while measuring nothing.
    const devOnly = registrations.filter((r) => r.isDevModeOnly).map((r) => r.id);
    expect(devOnly).toContain('file-explorer');
    expect(devOnly).toContain('undo-queue');
  });
});

describe('STY-005 AC6 — the old Design Tokens panel is retired (R3)', () => {
  const source = fs.readFileSync(ROUTER_SETUP, 'utf8');
  const registrations = readRegistrations(source);

  it('no longer registers `design-tokens`', () => {
    expect(registrations.find((r) => r.id === 'design-tokens')).toBeUndefined();
  });

  it('no longer imports the panel it registered', () => {
    expect(source).not.toContain("from './views/panels/DesignTokenPanel");
  });

  it('🔴 the token editor SURVIVED the retirement — the file the fix-015 gate holds is still there', () => {
    // This is the half that a "delete the old panel" task gets wrong: `DesignTokensTab` and
    // `TokenCategorySection` were a working, undoable editor sitting beside a placeholder tab, and
    // `tests-unit/fix-015` imports the second one by path. Only the shell and the placeholder went.
    const moved = path.join(
      __dirname,
      '../../src/editor/src/views/panels/StylesPanel/components/TokenCategorySection/TokenCategorySection.tsx'
    );
    expect(fs.existsSync(moved)).toBe(true);

    const oldHome = path.join(__dirname, '../../src/editor/src/views/panels/DesignTokenPanel');
    expect(fs.existsSync(oldHome)).toBe(false);
  });
});
