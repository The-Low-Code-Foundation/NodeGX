/**
 * TPL-013 — prepare Star Class, Rocket School's Sub-Saharan Africa edition, as a project directory.
 *
 *     npm run template:star-class
 *
 * Rocket School's build (`tpl007Template.ts`) with the edition's components
 * (`tpl013Edition.ts`), into `templates/star-class/`.
 */
import * as fs from 'fs';
import * as path from 'path';

import { buildRocketTemplateProject, prepareRocketArtefact, START_HERE_FILE } from '../packages/noodl-mcp/tests/tpl007Template';
import { AFRICA_EDITION, editionComponents, editionStartHere, frenchLeftIn } from '../packages/noodl-mcp/tests/tpl013Edition';

const edition = AFRICA_EDITION;
const OUTPUT = path.join(__dirname, '..', 'templates', edition.id);

(async () => {
  const components = editionComponents(edition);
  const left = frenchLeftIn(components, edition);
  if (left.length) throw new Error(`refusing to write: the edition still says ${JSON.stringify(left)}`);

  const built = await buildRocketTemplateProject({
    components,
    projectName: edition.name,
    request: `${edition.name} — Rocket School for school children in Sub-Saharan Africa, P1 to JSS3, EN and FR, profiles in localStorage, no backend.`
  });
  prepareRocketArtefact(built, OUTPUT, {
    id: edition.id,
    writeStartHere: (output) => {
      fs.mkdirSync(path.join(output, path.dirname(START_HERE_FILE)), { recursive: true });
      fs.writeFileSync(path.join(output, START_HERE_FILE), editionStartHere(edition));
    }
  });

  console.log(`wrote ${OUTPUT}`);
  console.log(`  ${built.order.length} components through plan ${built.planId}, ${Object.keys(built.registrations).length} page registrations`);
  const byCode = new Map<string, number>();
  for (const d of built.diagnostics) byCode.set(`${d.severity} ${d.code}`, (byCode.get(`${d.severity} ${d.code}`) ?? 0) + 1);
  if (byCode.size === 0) console.log('  no diagnostics raised on any write');
  else for (const [key, count] of [...byCode.entries()].sort()) console.log(`    ${count.toString().padStart(3)} × ${key}`);
})().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
