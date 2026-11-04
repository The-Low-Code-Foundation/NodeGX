/**
 * HST-004 probe: does the cloud-function interpreter (noodl-viewer-cloud's CloudRunner) run on workerd?
 *
 * Two functions, the shape the noodl-viewer-cloud tests use (DEF-022's origin echo):
 *   echo — Request → Response, no code node. Measures the interpreter itself.
 *   sum  — an Expression node (compiled with `new Function`, which Workers refuse) into the Response.
 * GET /functions/<name> runs one and answers what came back, or the error.
 */
import { CloudRunner } from '@cloud-runtime';

// Probe toggle (?fifo=1): Node's setImmediate is a FIFO macrotask queue. Measure whether workerd's differs.
const nativeImmediate = (globalThis as any).setImmediate;
function useFifoImmediate(on: boolean) {
  (globalThis as any).setImmediate = on ? (fn: (...a: unknown[]) => void, ...a: unknown[]) => setTimeout(() => fn(...a), 0) : nativeImmediate;
}

const req = (id: string) => ({ id, type: 'noodl.cloud.request', x: 0, y: 0, parameters: { allowNoAuth: true }, ports: [], children: [] });
const res = (id: string) => ({ id, type: 'noodl.cloud.response', x: 0, y: 200, parameters: { params: 'out' }, ports: [], children: [] });

const components = [
  {
    name: '/#__cloud__/echo',
    nodes: [req('e-req'), res('e-res')],
    connections: [
      { sourceId: 'e-req', sourcePort: 'origin', targetId: 'e-res', targetPort: 'pm-out' },
      { sourceId: 'e-req', sourcePort: 'receive', targetId: 'e-res', targetPort: 'send' }
    ],
    roots: []
  },
  {
    name: '/#__cloud__/sum',
    nodes: [
      req('s-req'),
      { id: 's-expr', type: 'Expression', x: 0, y: 100, parameters: { expression: '1 + 2' }, ports: [], children: [] },
      res('s-res')
    ],
    connections: [
      { sourceId: 's-expr', sourcePort: 'result', targetId: 's-res', targetPort: 'pm-out' },
      { sourceId: 's-req', sourcePort: 'receive', targetId: 's-res', targetPort: 'send' }
    ],
    roots: []
  }
];

let runner: CloudRunner | null = null;
let loadError: string | null = null;

async function ready(fresh = false): Promise<CloudRunner> {
  if (runner && !fresh) return runner;
  const r = new CloudRunner({});
  await r.load({ components, settings: {}, metadata: {} });
  runner = r;
  return r;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const u = new URL(request.url);
    const name = u.pathname.replace(/^\/functions\//, '');
    useFifoImmediate(u.searchParams.get('fifo') === '1');
    const t0 = Date.now();
    let flagBefore: unknown;
    try {
      const r = await ready(u.searchParams.get('fresh') === '1');
      // WARMRUNNER diagnosis: the runtime's "an update is already scheduled" flag, read before this run.
      flagBefore = (r as any).runtime?.updateScheduled;
      if (u.searchParams.get('unstick') === '1') (r as any).runtime.updateScheduled = false;
      const out: any = await r.run(name, { body: '{}', headers: { origin: 'https://app.example' } } as any, { timeoutMs: 4000 });
      return Response.json({ name, ms: Date.now() - t0, flagBefore, statusCode: out.statusCode, body: out.body });
    } catch (e) {
      loadError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      return Response.json({ name, ms: Date.now() - t0, flagBefore, error: loadError, stack: e instanceof Error ? e.stack?.split('\n').slice(0, 6) : null }, { status: 500 });
    }
  }
};
