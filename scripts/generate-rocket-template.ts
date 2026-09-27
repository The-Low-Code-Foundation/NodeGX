/**
 * TPL-007 — prepare Rocket School as a project directory.
 *
 *     npm run template:rocket
 *
 * The same shape as `generate-pixel-template.ts`: the door's output plus the
 * generated `docs/START-HERE.md` and the kit the game's nodes come from, into
 * `templates/rocket-school/`. `prepareRocketArtefact` lives in
 * `tpl007Template.ts` so the gate runs the same code.
 */
import * as path from 'path';

import { buildRocketTemplateProject, prepareRocketArtefact, TEMPLATE_ID } from '../packages/noodl-mcp/tests/tpl007Template';

const OUTPUT = path.join(__dirname, '..', 'templates', TEMPLATE_ID);

(async () => {
  const built = await buildRocketTemplateProject();
  prepareRocketArtefact(built, OUTPUT);

  const pages = Object.keys(built.registrations).length;
  console.log(`wrote ${OUTPUT}`);
  console.log(`  ${built.order.length} components through plan ${built.planId}, ${pages} page registrations`);
  console.log(`  modules installed before authoring: ${built.modules.join(', ') || '(none)'}`);

  const byCode = new Map<string, number>();
  for (const d of built.diagnostics) {
    const key = `${d.severity} ${d.code}`;
    byCode.set(key, (byCode.get(key) ?? 0) + 1);
  }
  if (byCode.size === 0) console.log('  no diagnostics raised on any write');
  else {
    console.log(`  ${built.diagnostics.length} diagnostics the door raised and did not refuse over:`);
    for (const [key, count] of [...byCode.entries()].sort()) console.log(`    ${count.toString().padStart(3)} × ${key}`);
    if (process.env.TPL007_DIAG_DETAIL) {
      for (const d of built.diagnostics) console.log(`    DETAIL ${d.code} | ${d.component} | ${d.message}`);
    }
  }
  const applied = built.applied as { summary?: unknown; verdict?: unknown; written?: unknown };
  if (applied.summary) console.log('  apply summary:', JSON.stringify(applied.summary));
})().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
