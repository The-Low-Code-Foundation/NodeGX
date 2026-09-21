/**
 * TPL-010 — prepare the planner as a project directory.
 *
 *     npm run template:planner
 *
 * Authored through the plan door (`create_plan` → `stage_plan_operation` → `apply_plan`), the
 * route TPL-007 established and TPL-008 followed. The security policy is hand-authored beside
 * the artefact (`templates/planner.security.json`) and copied in last, because this script
 * clears the output directory wholesale.
 *
 * It also writes `templates/planner-demo/` (AC9): the same components with the backend taken
 * out, which nodegx.io serves. Both come from one run, so the demo can never be older than
 * the template.
 *
 * `preparePlannerArtefact` lives in `tpl010Template.ts` so the gate runs the same code as this
 * script and not a twin of it.
 */
import * as path from 'path';

import {
  AuthoredTemplate,
  buildPlannerTemplateProject,
  DEMO_ID,
  POLICY_FILE,
  preparePlannerArtefact,
  preparePlannerDemoArtefact,
  TEMPLATE_ID
} from '../packages/noodl-mcp/tests/tpl010Template';

const OUTPUT = path.join(__dirname, '..', 'templates', TEMPLATE_ID);
const DEMO_OUTPUT = path.join(__dirname, '..', 'templates', DEMO_ID);
const POLICY_SOURCE = path.join(__dirname, '..', 'templates', `${TEMPLATE_ID}.security.json`);

function report(output: string, built: AuthoredTemplate): void {
  // The door reports registrations per router; `added` carries entries, not bare strings.
  const named = (v: unknown): string => (typeof v === 'string' ? v : ((v as { path?: string })?.path ?? JSON.stringify(v)));
  const pages = Object.values(built.registrations).flatMap((r) => (r.added ?? []).map(named));
  const start = Object.values(built.registrations).map((r) => r.startPage).filter(Boolean).map(named)[0] ?? '(none)';
  console.log(`wrote ${output}`);
  console.log(`  ${built.order.length} components, pages ${pages.join(', ') || '(none)'}, start page ${start}`);

  // Printed rather than counted: a warning that never reaches `isError` is a check that
  // fired and was dropped by the caller.
  const byCode = new Map<string, number>();
  for (const d of built.diagnostics) {
    const key = `${d.severity} ${d.code}`;
    byCode.set(key, (byCode.get(key) ?? 0) + 1);
  }
  if (byCode.size === 0) {
    console.log('  no diagnostics raised on any write');
  } else {
    console.log(`  ${built.diagnostics.length} diagnostics the door raised and did not refuse over:`);
    for (const [key, count] of [...byCode.entries()].sort()) console.log(`    ${count.toString().padStart(3)} × ${key}`);
    if (process.env.TPL010_DIAG_DETAIL) {
      for (const d of built.diagnostics) console.log(`    DETAIL ${d.code} | ${d.component} | ${d.message}`);
    }
  }
}

(async () => {
  const built = await buildPlannerTemplateProject();
  preparePlannerArtefact(built, OUTPUT, POLICY_SOURCE);
  report(OUTPUT, built);
  console.log(`  policy ${POLICY_SOURCE} copied in as ${POLICY_FILE}`);

  const demo = await buildPlannerTemplateProject({ variant: 'demo' });
  preparePlannerDemoArtefact(demo, DEMO_OUTPUT);
  report(DEMO_OUTPUT, demo);
})().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
