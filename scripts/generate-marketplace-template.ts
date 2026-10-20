/**
 * TWO-003 — build the marketplace into `templates/marketplace/`, keeping its world, schema and policy.
 *
 *     npm run template:marketplace
 */
import { buildMarketplace, prepareMarketplace, TEMPLATE_DIR } from '../packages/noodl-mcp/tests/two003Template';

(async () => {
  const built = await buildMarketplace();
  prepareMarketplace(built, TEMPLATE_DIR);
  console.log(`wrote ${TEMPLATE_DIR}`);
  console.log(`  ${built.order.length} components: ${built.order.join(', ')}`);
  const byCode = new Map<string, number>();
  for (const d of built.diagnostics) byCode.set(`${d.severity} ${d.code}`, (byCode.get(`${d.severity} ${d.code}`) ?? 0) + 1);
  if (byCode.size === 0) console.log('  no diagnostics raised on any write');
  for (const [k, n] of [...byCode.entries()].sort()) console.log(`  ${String(n).padStart(3)} × ${k}`);
  if (process.env.TWO003_DIAG) for (const d of built.diagnostics) console.log(`  DETAIL ${d.severity} ${d.code} | ${d.component} | ${d.message}`);
})().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
