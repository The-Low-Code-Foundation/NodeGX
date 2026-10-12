/**
 * P105 CG-003 — prepare Bot Garden as a project directory.
 *
 *     npm run template:garden
 *
 * The same shape as `generate-rocket-template.ts`: the plan door's output, the kits, the template's own fonts and a
 * generated `docs/START-HERE.md`, into `templates/bot-garden/`. `prepareGardenArtefact` lives in `cg003Template.ts`
 * so the gate runs the same code.
 *
 * 🔴 The pre-step (CG-002 §5): the ENGINE gate runs first, and a red engine writes nothing — so a graph change cannot
 * ship an engine regression. Its exit code is read before a byte is written (README §7: an aborted script measures the
 * old artefact and reads exactly like the run before). `GARDEN_SKIP_ENGINE_GATE=1` skips it, and says so.
 */
import { execSync } from 'child_process';
import * as path from 'path';

import { buildGardenTemplateProject, prepareGardenArtefact, TEMPLATE_ID } from '../packages/noodl-mcp/tests/cg003Template';

const REPO = path.join(__dirname, '..');
const OUTPUT = path.join(REPO, 'templates', TEMPLATE_ID);

function engineGate(): void {
  if (process.env.GARDEN_SKIP_ENGINE_GATE === '1') {
    console.log('engine gate SKIPPED (GARDEN_SKIP_ENGINE_GATE=1)');
    return;
  }
  const mcp = path.join(REPO, 'packages', 'noodl-mcp');
  try {
    const out = execSync('npx jest tests/cg002Engine.test.ts 2>&1', { cwd: mcp, encoding: 'utf8' });
    console.log(`engine gate green${(out.match(/Tests:[^\n]*/) ?? [''])[0] ? `: ${(out.match(/Tests:[^\n]*/) ?? [''])[0]}` : ''}`);
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    console.error(String(err.stderr ?? err.stdout ?? e).split('\n').filter((l) => /Tests:|✕|●/.test(l)).join('\n'));
    throw new Error('the engine gate (tests/cg002Engine.test.ts) is red: nothing written');
  }
}

(async () => {
  engineGate();
  const built = await buildGardenTemplateProject();
  prepareGardenArtefact(built, OUTPUT);
  console.log(`wrote ${OUTPUT}`);
  console.log(`  ${built.order.length} components through plan ${built.planId}`);
  console.log(`  pages: ${JSON.stringify(built.registrations)}`);
  console.log(`  modules installed before authoring: ${built.modules.join(', ')}`);
  const byCode = new Map<string, number>();
  for (const d of built.diagnostics) if (d.severity !== 'info') byCode.set(`${d.severity} ${d.code}`, (byCode.get(`${d.severity} ${d.code}`) ?? 0) + 1);
  if (byCode.size === 0) console.log('  no warning raised on any write');
  else for (const [key, count] of [...byCode.entries()].sort()) console.log(`  ${String(count).padStart(3)} × ${key}`);
})().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
