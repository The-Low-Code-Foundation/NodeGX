/**
 * TWO-003 — the marketplace template is what its generator writes, byte for byte, and the policy names exactly the
 * functions the template carries.
 *
 * Only the generated half is compared (`components/`, `nodegx.project.json`): the world, the schema and the policy
 * are hand-written and gated by TWO-001's spec. A red here means `templates/marketplace/` was edited by hand or the
 * generator changed without `npm run template:marketplace`.
 */
import * as fs from 'fs';
import * as path from 'path';

import { buildMarketplace, FUNCTION_RULES, MARKETPLACE_CLOUD, POLICY_FILE, prepareMarketplace, TEMPLATE_DIR, TEMPLATE_ID } from './two003Template';

jest.setTimeout(120000);

function files(root: string, rel = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) out.push(...files(root, r));
    else out.push(r);
  }
  return out.sort();
}

describe('TWO-003 the marketplace template', () => {
  let fresh: string;

  beforeAll(async () => {
    const built = await buildMarketplace();
    fresh = path.join(path.dirname(built.projectDir), `two003-fresh-${process.pid}`, TEMPLATE_ID);
    fs.rmSync(path.dirname(fresh), { recursive: true, force: true });
    fs.mkdirSync(fresh, { recursive: true });
    prepareMarketplace(built, fresh);
  });

  it('components/ and nodegx.project.json are the generator’s output, byte for byte', () => {
    const generated = (root: string) => [...files(root, 'components').map((f) => f), 'nodegx.project.json'];
    expect(generated(TEMPLATE_DIR)).toEqual(generated(fresh));
    for (const f of generated(fresh)) {
      expect([f, fs.readFileSync(path.join(TEMPLATE_DIR, f), 'utf8')]).toEqual([f, fs.readFileSync(path.join(fresh, f), 'utf8')]);
    }
  });

  it('the project opens on App: its rootNodeId is App’s visual root (P121-S19-NOHOME)', () => {
    const project = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'nodegx.project.json'), 'utf8'));
    const app = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, 'components', 'App', 'nodes.json'), 'utf8'));
    expect(app.visualRoots).toContain(project.rootNodeId);
  });

  it('the policy has a call rule for every function the template carries (a helper is not one), and for no other', () => {
    const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
    expect(policy.functions).toEqual(FUNCTION_RULES);
    expect(Object.keys(policy.functions).sort()).toEqual(MARKETPLACE_CLOUD.filter((c) => !c.name.startsWith('helpers/')).map((c) => c.name).sort());
  });
});
