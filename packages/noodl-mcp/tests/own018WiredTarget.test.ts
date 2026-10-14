/**
 * P112-OWN018-WIREDTARGET — a reusable nav item whose page arrives from its Component Inputs.
 *
 * Mistral Large 4 (OWN-018, sitting 2) wrote the shape a nav bar wants: `Component Inputs.target → RouterNavigate.target`
 * and `Button.onClick → RouterNavigate.navigate`. Both doors refused it as "navigates nowhere: no Target Page is set",
 * because `checkNavigation` read only the `target` parameter. A target fed by a wire is set at runtime, like a
 * `{placeholder}` path. The control keeps the rule honest: the same graph with that wire removed is still refused.
 */
import * as fs from 'fs';

import { call, connect, copyFixture, TestSession } from './helpers';

function navItem({ wired }: { wired: boolean }) {
  return {
    nodes: [
      { id: 'nav_btn', type: 'Button', label: 'Nav item' },
      { id: 'nav_go', type: 'RouterNavigate', label: 'Go to page' },
      {
        id: 'nav_ci',
        type: 'Component Inputs',
        ports: [
          { name: 'label', plug: 'output', type: 'string' },
          { name: 'target', plug: 'output', type: 'string' }
        ]
      }
    ],
    connections: [
      { fromId: 'nav_ci', fromProperty: 'label', toId: 'nav_btn', toProperty: 'label' },
      { fromId: 'nav_btn', fromProperty: 'onClick', toId: 'nav_go', toProperty: 'navigate' },
      ...(wired ? [{ fromId: 'nav_ci', fromProperty: 'target', toId: 'nav_go', toProperty: 'target' }] : [])
    ],
    visual_roots: ['nav_btn']
  };
}

describe('P112-OWN018-WIREDTARGET — a Navigate whose target is wired in', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });

  afterEach(async () => {
    await session.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('create_component accepts a nav item whose target comes from its Component Inputs', async () => {
    const res = await call<any>(session, 'create_component', { path: 'Components/NavItem', ...navItem({ wired: true }) });
    expect(JSON.stringify(res.data)).not.toContain('unresolved-navigation');
    expect(res.isError).toBe(false);
  });

  it('stage_plan_operation accepts it too (the door Mistral used)', async () => {
    const plan = await call<any>(session, 'create_plan', {
      request: 'A reusable nav item',
      operations: [{ kind: 'create', target: 'Components/NavItem', intent: 'A button that goes to the page its parent names.' }]
    });
    expect(plan.isError).toBe(false);
    const staged = await call<any>(session, 'stage_plan_operation', {
      plan_id: plan.data.planId,
      operation_id: plan.data.operations[0].id,
      ...navItem({ wired: true })
    });
    expect(JSON.stringify(staged.data)).not.toContain('unresolved-navigation');
    expect(staged.isError).toBe(false);
  });

  it('CONTROL: the same graph without the target wire is still refused, for this rule', async () => {
    const res = await call<any>(session, 'create_component', { path: 'Components/NavItem', ...navItem({ wired: false }) });
    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.data)).toContain('unresolved-navigation');
    expect(JSON.stringify(res.data)).not.toContain('Input validation error');
  });
});
