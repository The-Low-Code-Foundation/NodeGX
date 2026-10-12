/**
 * spec-needs — what every node spec needs from the world, and whether it mounts with no parameters.
 * Bundled by scripts/own/census.js with esbuild (the spec package's `main` is TypeScript source) and run
 * once; its stdout is one JSON document. Phase 112 (your own NodeGX), OWN-000.
 */
import { specs } from '../../packages/nodegx-node-spec/src/nodes';
import { mount } from '../../packages/nodegx-node-spec/src/interpreter';

type Row = { needs: string[]; mountable: boolean; mountError?: string; source?: string };
const out: Record<string, Row> = {};
for (const [type, s] of Object.entries(specs)) {
  const row: Row = { needs: [...(s.needs ?? [])], mountable: true, source: (s as { source?: string }).source };
  try {
    mount(s, {});
  } catch (e) {
    row.mountable = false;
    row.mountError = e instanceof Error ? e.message : String(e);
  }
  out[type] = row;
}
process.stdout.write(JSON.stringify({ specCount: Object.keys(specs).length, specs: out }));
