/**
 * TPL-011 — build the page-designer spike (one page, the Journal Page kit, tonight's page as one
 * record) into `dev-docs/tasks/phase-78-the-templates/nightbook-desktop/spike-app/`, which
 * `nightbook-desktop/build-app.js --project …/spike-app` then puts inside the Nightbook shell.
 *
 *     node library/modules/nightbook-kit/build.mjs
 *     ts-node -T -P ./scripts/tsconfig.json ./scripts/generate-nightbook-spike.ts
 */
import * as path from 'path';

import { buildSpike, prepareSpike } from '../packages/noodl-mcp/tests/tpl011Spike';

const OUTPUT = path.join(__dirname, '..', 'dev-docs', 'tasks', 'phase-78-the-templates', 'nightbook-desktop', 'spike-app');

(async () => {
  const built = await buildSpike();
  prepareSpike(built, OUTPUT);
  console.log(`wrote ${OUTPUT}`);
  console.log(`  pages registered: ${JSON.stringify(built.registrations)}`);
  if (!built.diagnostics.length) console.log('  no diagnostics raised on any write');
  for (const d of built.diagnostics) console.log(`  ${d.severity} ${d.code} | ${d.component} | ${d.message}`);
})().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
