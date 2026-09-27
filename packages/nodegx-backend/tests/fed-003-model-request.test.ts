/**
 * A cloud function can call a model, and the key never leaves the server (FED-003).
 *
 * Driven end to end through `POST /functions/:name` against the real service, because phase 96
 * README §7 rule 4 says the test is the drive. The fixture is an HTTP server that answers in the
 * Messages API's shapes and RECORDS what it was sent — which is the only way to grade §3.2's
 * request body and AC1's "the key arrives in `x-api-key`" without a real provider and a real bill.
 *
 * ⚠️ Three facts that will cost the next person time if they are not stated here:
 *
 *  - **`KEY` is the whole point of AC3.** It is a distinctive string on purpose: every assertion
 *    that it is ABSENT is worthless unless the assertion that it ARRIVED passes in the same run
 *    (an absence asserted beside a signal known to be firing). §1 proves the fixture received it;
 *    §3 then proves nothing else did.
 *  - **With a node type unregistered these specs do not fail — they HANG** for the function
 *    timeout. An unknown node type means nothing reaches a Response node (CWF-018). A 30-second
 *    red out here is what "not registered in `noodl-viewer-cloud/src/nodes/index.ts`" looks like.
 *  - **The failure path is wired in every graph below.** A function whose only wired path is the
 *    happy one hangs the moment anything goes wrong, which is register R1 and is the shape every
 *    one of these specs would otherwise hit.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { logger } from '../src/ops/logger';
import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

/**
 * The value that must reach the fixture and nothing else. Distinctive enough that a grep over a
 * log or an execution record cannot match it by accident.
 */
const KEY = 'sk-ant-fed003-DO-NOT-LEAK-7f3a91';
const SECRET_NAME = 'MODEL_KEY';

/** What the fixture recorded about one request. Headers included — that is half the grading. */
interface Seen {
  route: string;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
}

/**
 * The graph a person would actually draw: Request → Model Request → Response, with the failure
 * path wired to a second Response so a refusal or a 400 answers instead of hanging.
 *
 * `baseUrl` and `outputSchema` arrive as request params so one function can be pointed at each
 * of the fixture's routes — the schema in particular CANNOT be a parameter, because
 * `Output Schema` is `allowConnectionsOnly` (an object is not something anyone types into an
 * inspector field).
 */
function askFunction() {
  return {
    name: '/#__cloud__/ask',
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'base,schema,instructions,callInstructions,input' },
        ports: [],
        children: []
      },
      {
        id: 'model',
        type: 'noodl.cloud.modelrequest',
        x: 0,
        y: 100,
        parameters: {
          provider: 'anthropic',
          model: 'claude-opus-5',
          apiKeySecret: SECRET_NAME,
          effort: 'low',
          maxTokens: 512,
          timeoutMs: 8000
        },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        // ⚠️ EVERY output port, not just the ones a happy graph reads. A mutation that wrote
        // the key onto `Error` survived AC3 green while this said `text,json,usage,stopReason,
        // attempts`: the success path never read `Error`, so the leak reached no assertion.
        parameters: { params: 'text,json,usage,stopReason,attempts,error,errorCode,status' },
        ports: [],
        children: []
      },
      {
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'error,errorCode,status,attempts' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-base', targetId: 'model', targetPort: 'baseUrl' },
      { sourceId: 'req', sourcePort: 'pm-schema', targetId: 'model', targetPort: 'outputSchema' },
      { sourceId: 'req', sourcePort: 'pm-instructions', targetId: 'model', targetPort: 'instructions' },
      { sourceId: 'req', sourcePort: 'pm-callInstructions', targetId: 'model', targetPort: 'callInstructions' },
      { sourceId: 'req', sourcePort: 'pm-input', targetId: 'model', targetPort: 'input' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'model', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'text', targetId: 'res', targetPort: 'pm-text' },
      { sourceId: 'model', sourcePort: 'json', targetId: 'res', targetPort: 'pm-json' },
      { sourceId: 'model', sourcePort: 'usage', targetId: 'res', targetPort: 'pm-usage' },
      { sourceId: 'model', sourcePort: 'stopReason', targetId: 'res', targetPort: 'pm-stopReason' },
      { sourceId: 'model', sourcePort: 'attempts', targetId: 'res', targetPort: 'pm-attempts' },
      { sourceId: 'model', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'model', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'model', sourcePort: 'status', targetId: 'resErr', targetPort: 'pm-status' },
      { sourceId: 'model', sourcePort: 'attempts', targetId: 'resErr', targetPort: 'pm-attempts' },
      { sourceId: 'model', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/**
 * TWO Model Request nodes in one function, chained, so one run makes two calls.
 *
 * AC9's sum is only arithmetic when there is more than one thing to add: against a single-call
 * run, a summariser that just echoed `modelCalls[0]` would be indistinguishable from one that
 * adds. The second call is fired by the first one's `Done`.
 */
function twiceFunction() {
  return {
    name: '/#__cloud__/askTwice',
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'base,input' },
        ports: [],
        children: []
      },
      {
        id: 'first',
        type: 'noodl.cloud.modelrequest',
        x: 0,
        y: 100,
        parameters: { apiKeySecret: SECRET_NAME, model: 'claude-opus-5', maxTokens: 512, timeoutMs: 8000 },
        ports: [],
        children: []
      },
      {
        id: 'second',
        type: 'noodl.cloud.modelrequest',
        x: 200,
        y: 100,
        parameters: { apiKeySecret: SECRET_NAME, model: 'claude-opus-5', maxTokens: 512, timeoutMs: 8000 },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'text' },
        ports: [],
        children: []
      },
      {
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 400,
        parameters: { params: 'error,errorCode' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-base', targetId: 'first', targetPort: 'baseUrl' },
      { sourceId: 'req', sourcePort: 'pm-input', targetId: 'first', targetPort: 'input' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'first', targetPort: 'send' },
      // The second call is the first one's answer, asked again — the shape a graph that
      // summarises then tags actually has.
      { sourceId: 'req', sourcePort: 'pm-base', targetId: 'second', targetPort: 'baseUrl' },
      { sourceId: 'first', sourcePort: 'text', targetId: 'second', targetPort: 'input' },
      { sourceId: 'first', sourcePort: 'done', targetId: 'second', targetPort: 'send' },
      { sourceId: 'second', sourcePort: 'text', targetId: 'res', targetPort: 'pm-text' },
      { sourceId: 'second', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'first', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'first', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'first', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' },
      { sourceId: 'second', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'second', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'second', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/** AC4 and AC7 need a node whose provider and secret name are wrong in a FIXED way. */
function refusedFunction(name: string, parameters: Record<string, unknown>) {
  return {
    name: `/#__cloud__/${name}`,
    nodes: [
      {
        id: 'req',
        type: 'noodl.cloud.request',
        x: 0,
        y: 0,
        parameters: { allowNoAuth: true, params: 'base' },
        ports: [],
        children: []
      },
      {
        id: 'model',
        type: 'noodl.cloud.modelrequest',
        x: 0,
        y: 100,
        parameters: { model: 'claude-opus-5', timeoutMs: 8000, ...parameters },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'text' },
        ports: [],
        children: []
      },
      {
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'error,errorCode,status' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-base', targetId: 'model', targetPort: 'baseUrl' },
      { sourceId: 'req', sourcePort: 'receive', targetId: 'model', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'text', targetId: 'res', targetPort: 'pm-text' },
      { sourceId: 'model', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'model', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'model', sourcePort: 'status', targetId: 'resErr', targetPort: 'pm-status' },
      { sourceId: 'model', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

interface Answer {
  text?: string;
  json?: Record<string, unknown>;
  usage?: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number };
  stopReason?: string;
  attempts?: number;
  error?: string;
  errorCode?: string;
  status?: number;
}

interface ExecutionRow {
  id: string;
  workflowId: string;
  status: string;
  metadata?: Record<string, unknown>;
}

describe('a cloud function calls a model (FED-003)', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let provider: http.Server;
  let providerUrl: string;
  let adminToken: string;

  const seen: Seen[] = [];
  const logLines: string[] = [];
  /** How many times each route has been hit, so a retry route can answer differently. */
  const hits: Record<string, number> = {};

  const client = httpClient(() => base);
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });

  const ask = (route: string, body: Record<string, unknown> = {}, fn = 'ask') =>
    client.request<{ result: Answer }>('POST', `/functions/${fn}`, {
      body: { base: `${providerUrl}${route}`, ...body }
    });

  /** The happy answer, in the shape the Messages API actually returns. */
  const answer = (text: string) => ({
    id: 'msg_fed003',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5',
    content: [
      // A thinking block sits in front of the text on a real answer and is NOT the answer —
      // a node that took `content[0]` would hand the graph an empty string here.
      { type: 'thinking', thinking: '' },
      { type: 'text', text }
    ],
    stop_reason: 'end_turn',
    usage: { input_tokens: 41, output_tokens: 7, cache_read_input_tokens: 12, cache_creation_input_tokens: 30 }
  });

  beforeAll(async () => {
    provider = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const route = String(req.url).replace(/\/v1\/messages$/, '');
        hits[route] = (hits[route] || 0) + 1;
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          /* recorded as {} — the spec that cares will say so */
        }
        seen.push({ route, headers: req.headers, body });

        const send = (status: number, payload: unknown, headers: Record<string, string> = {}) => {
          res.writeHead(status, { 'content-type': 'application/json', ...headers });
          res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
        };

        switch (route) {
          case '/ok':
            return send(200, answer('Two rockets, one bench.'));
          case '/schema':
            return send(200, answer('{"tag":"space","score":3}'));
          case '/badjson':
            // A schema was asked for and the answer is prose. AC2's second half.
            return send(200, answer('I am afraid I cannot do that, Dave.'));
          case '/retry':
            // AC5: 429 then 200. `retry-after: 0` keeps the spec honest about the retry
            // happening without spending a second of wall clock proving the backoff exists.
            return hits[route] === 1
              ? send(429, { type: 'error', error: { type: 'rate_limit_error' } }, { 'retry-after': '0' })
              : send(200, answer('Second time lucky.'));
          case '/bad':
            return send(400, {
              type: 'error',
              error: { type: 'invalid_request_error', message: 'max_tokens: must be >= 1' }
            });
          case '/refuse':
            return send(200, {
              ...answer(''),
              stop_reason: 'refusal',
              stop_details: { type: 'refusal', category: 'cyber', explanation: 'declined' }
            });
          case '/truncated':
            return send(200, { ...answer('As far as I got'), stop_reason: 'max_tokens' });
          default:
            return send(404, { error: 'no such fixture route' });
        }
      });
    });
    await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
    providerUrl = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;

    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-fed003-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'model.workflow.json'),
      JSON.stringify({
        components: [
          askFunction(),
          twiceFunction(),
          refusedFunction('askNoSecret', { apiKeySecret: 'NOT_PROVISIONED', provider: 'anthropic' }),
          refusedFunction('askOtherProvider', { apiKeySecret: SECRET_NAME, provider: 'openai-compatible' })
        ],
        settings: {},
        metadata: {}
      })
    );

    service = new BackendService({ dataDir, port: 0, backendId: 'fed003', backendName: 'FED-003' });
    base = (await service.start()).listen.url;

    // Read-modify-write: `start()` has already minted `adminToken` into this file, and a
    // wholesale write here would delete it.
    const secretsPath = path.join(dataDir, 'secrets.json');
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf-8'));
    adminToken = secrets.adminToken;
    secrets.functions = { ...(secrets.functions || {}), [SECRET_NAME]: KEY };
    fs.writeFileSync(secretsPath, JSON.stringify(secrets));

    // AC3 needs the log, so this file un-silences it and captures what is written.
    delete process.env.NODEGX_LOG_LEVEL;
    logger.configure({ level: 'debug', format: 'json' });
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
      logLines.push(String(chunk));
      return true;
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    process.env.NODEGX_LOG_LEVEL = 'silent';
    logger.configure({ level: 'silent' });
    await service.stop();
    await new Promise<void>((resolve) => provider.close(() => resolve()));
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  describe('AC1 — the request of §3.2, with the key from secrets.json', () => {
    let res: { status: number; json: { result: Answer } };
    let sent: Seen;

    beforeAll(async () => {
      res = await ask('/ok', { instructions: 'You tag feed items.', input: 'Tag this post.' });
      sent = seen.filter((s) => s.route === '/ok')[0];
    });

    it('answers with the model’s text and the usage it reported', () => {
      expect(res.status).toBe(200);
      expect(res.json.result.text).toBe('Two rockets, one bench.');
      expect(res.json.result.stopReason).toBe('end_turn');
      expect(res.json.result.usage).toEqual({
        inputTokens: 41,
        outputTokens: 7,
        cacheReadTokens: 12,
        cacheWriteTokens: 30
      });
      expect(res.json.result.attempts).toBe(1);
    });

    it('sends the key in x-api-key, with the version header the API requires', () => {
      // The known-firing half of AC3. Everything §3 asserts is absent is only worth asserting
      // because this passes.
      expect(sent.headers['x-api-key']).toBe(KEY);
      expect(sent.headers['anthropic-version']).toBe('2023-06-01');
      expect(String(sent.headers['content-type'])).toContain('application/json');
    });

    it('builds the body of §3.2 — system, one user turn, effort inside output_config', () => {
      expect(sent.body.model).toBe('claude-opus-5');
      expect(sent.body.max_tokens).toBe(512);
      // HLT-019: Instructions go as ONE block marked for the prompt cache, 5-minute TTL.
      expect(sent.body.system).toEqual([
        { type: 'text', text: 'You tag feed items.', cache_control: { type: 'ephemeral' } }
      ]);
      // Never the API's top-level automatic caching, which marks the LAST block — per-call text
      // here — and so writes on every call and never reads (HLT-019 worked example, case C).
      expect(sent.body).not.toHaveProperty('cache_control');
      expect(sent.body.messages).toEqual([{ role: 'user', content: 'Tag this post.' }]);
      expect(sent.body.output_config).toEqual({ effort: 'low' });
      // Current models think adaptively and REJECT a token budget outright, so the node sends
      // neither field. A `thinking` key appearing here is a 400 waiting to happen.
      expect(sent.body).not.toHaveProperty('thinking');
      expect(sent.body).not.toHaveProperty('budget_tokens');
      // The deprecated spelling. `output_config.format` is the current one (§3.2).
      expect(sent.body).not.toHaveProperty('output_format');
    });
  });

  describe('HLT-019 — fixed instructions are cached, per-call instructions are not', () => {
    const lastSent = () => seen.filter((s) => s.route === '/ok').slice(-1)[0];

    it('sends Per-Call Instructions as an unmarked block AFTER the cached one', async () => {
      const res = await ask('/ok', {
        instructions: 'You write lessons.',
        callInstructions: 'This learner is Ada. Last time: fractions.',
        input: 'Today’s lesson.'
      });
      expect(res.status).toBe(200);
      // The marker ends the cached prefix BEFORE the text that changes, so a second learner's
      // call begins with the same bytes up to it and reads them back.
      expect(lastSent().body.system).toEqual([
        { type: 'text', text: 'You write lessons.', cache_control: { type: 'ephemeral' } },
        { type: 'text', text: 'This learner is Ada. Last time: fractions.' }
      ]);
      expect(lastSent().body.messages).toEqual([{ role: 'user', content: 'Today’s lesson.' }]);
    });

    it('with only Per-Call Instructions, system is the plain string it always was', async () => {
      // Nothing in it is stable, so marking it would buy a write on every call and no read.
      await ask('/ok', { callInstructions: 'Only this, and it changes.', input: 'Go.' });
      expect(lastSent().body.system).toBe('Only this, and it changes.');
    });

    it('with neither, sends no system at all — today’s body', async () => {
      await ask('/ok', { input: 'Bare.' });
      expect(lastSent().body).not.toHaveProperty('system');
    });
  });

  describe('AC2 — a schema constrains the answer and parses it', () => {
    const schema = {
      type: 'object',
      properties: { tag: { type: 'string' }, score: { type: 'number' } },
      required: ['tag', 'score'],
      additionalProperties: false
    };

    it('carries the format block and fires Json with the parsed object', async () => {
      const res = await ask('/schema', { schema, input: 'Tag this.' });
      expect(res.status).toBe(200);
      expect(res.json.result.json).toEqual({ tag: 'space', score: 3 });
      expect(res.json.result.text).toBe('{"tag":"space","score":3}');

      const sent = seen.filter((s) => s.route === '/schema')[0];
      expect(sent.body.output_config).toEqual({ effort: 'low', format: { type: 'json_schema', schema } });
    });

    it('fails with bad_json when a schema was asked for and prose came back', async () => {
      const res = await ask('/badjson', { schema, input: 'Tag this.' });
      expect(res.status).toBe(200);
      expect(res.json.result.errorCode).toBe('bad_json');
      // The answer is kept: an author debugging a schema needs to see what came back.
      expect(res.json.result.error).toContain('did not parse as JSON');
    });
  });

  describe('AC3 — the key is in the request and nowhere else', () => {
    it('appears in no port value, no log line and no execution record', async () => {
      // Drive once more so the answers this spec greps are ones it watched being produced,
      // rather than variables another spec left behind.
      //
      // ⚠️ **Both paths, and AC3's own wording is why**: "after AC1 AND AC2". A mutation that
      // pasted the key into the FAILURE message survived this spec green while it drove only
      // `/ok` — the leak was on a path the spec never walked. The failure path is also the one
      // where a key would plausibly be added "to help debugging".
      const answered = await ask('/ok', { instructions: 'Tag it.', input: 'Again.' });
      expect(answered.status).toBe(200);
      const refused = await ask('/bad', { input: 'And the failure path.' });
      expect(refused.json.result.errorCode).toBe('http_error');

      const executions = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=ask&limit=50', {
        headers: asAdmin()
      });
      expect(executions.status).toBe(200);
      expect(executions.json.length).toBeGreaterThan(0);
      expect(logLines.length).toBeGreaterThan(0);

      // The three places AC3 names, each read back out of the product.
      expect(JSON.stringify(answered.json)).not.toContain(KEY);
      expect(JSON.stringify(refused.json)).not.toContain(KEY);
      expect(JSON.stringify(executions.json)).not.toContain(KEY);
      expect(logLines.join('\n')).not.toContain(KEY);

      // And the per-step record, which carries the node's own `inputData`. The secret's NAME is
      // in there and the VALUE is not — which is the entire distinction this AC is about, and
      // the reason the positive half is asserted beside the negative one.
      const detail = await client.request('GET', `/executions/${executions.json[0].id}`, {
        headers: asAdmin()
      });
      expect(detail.status).toBe(200);
      const raw = JSON.stringify(detail.json);
      expect(raw).not.toContain(KEY);
      expect(raw).toContain(SECRET_NAME);
    });
  });

  describe('AC4 / AC7 — refused before a request is ever made', () => {
    it('fires Failure with secret_missing, naming the secret, and sends nothing', async () => {
      const before = seen.length;
      const res = await ask('/ok', {}, 'askNoSecret');
      expect(res.status).toBe(200);
      expect(res.json.result.errorCode).toBe('secret_missing');
      expect(res.json.result.error).toContain('NOT_PROVISIONED');
      expect(res.json.result.status).toBe(0);
      expect(seen.length).toBe(before);
    });

    it('fires Failure with not_implemented for a provider that is not anthropic', async () => {
      const before = seen.length;
      const res = await ask('/ok', {}, 'askOtherProvider');
      expect(res.status).toBe(200);
      expect(res.json.result.errorCode).toBe('not_implemented');
      expect(res.json.result.error).toContain('openai-compatible');
      // ⚠️ An unimplemented provider must not read a credential on its way to refusing.
      expect(seen.length).toBe(before);
    });
  });

  describe('AC5 — retries', () => {
    // ⚠️ **A DELTA, never the running total.** `hits` accumulates across the whole file, and
    // AC3 above drives `/bad` on its way to grepping the failure path — so a spec asserting
    // `hits['/bad'] === 1` is asserting something about the order specs happen to run in, and it
    // went red the moment AC3 grew a second drive.
    const hitsDuring = async (route: string, run: () => Promise<unknown>) => {
      const before = hits[route] || 0;
      await run();
      return (hits[route] || 0) - before;
    };

    it('retries a 429 and succeeds, reporting two attempts', async () => {
      let res!: { status: number; json: { result: Answer } };
      const requests = await hitsDuring('/retry', async () => {
        res = await ask('/retry', { input: 'Try twice.' });
      });
      expect(res.status).toBe(200);
      expect(res.json.result.text).toBe('Second time lucky.');
      expect(res.json.result.attempts).toBe(2);
      expect(requests).toBe(2);
    });

    it('does not retry a 400, and reports the provider’s status', async () => {
      let res!: { status: number; json: { result: Answer } };
      const requests = await hitsDuring('/bad', async () => {
        res = await ask('/bad', { input: 'Nope.' });
      });
      expect(res.status).toBe(200);
      expect(res.json.result.errorCode).toBe('http_error');
      expect(res.json.result.status).toBe(400);
      expect(res.json.result.attempts).toBe(1);
      expect(requests).toBe(1);
    });
  });

  describe('AC6 — a refusal is a failure, not an empty answer', () => {
    it('fires Failure with refusal and the category, on an HTTP 200', async () => {
      const res = await ask('/refuse', { input: 'Something declined.' });
      expect(res.status).toBe(200);
      expect(res.json.result.errorCode).toBe('refusal');
      expect(res.json.result.error).toContain('cyber');
      expect(res.json.result.status).toBe(200);
    });

    it('but a truncated answer is a SUCCESS carrying its stop reason', async () => {
      // §3.2 decides this explicitly: `max_tokens` is the graph's business, not an error.
      const res = await ask('/truncated', { input: 'Go long.' });
      expect(res.status).toBe(200);
      expect(res.json.result.text).toBe('As far as I got');
      expect(res.json.result.stopReason).toBe('max_tokens');
    });
  });

  describe('AC9 — what the run cost is on the execution record', () => {
    it('carries one modelCalls entry per call, with the fields of §3.4 and HLT-019’s cache writes', async () => {
      await ask('/ok', { input: 'Cost me.' });

      const executions = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=ask&limit=50', {
        headers: asAdmin()
      });
      const costed = executions.json.filter(
        (row) => Array.isArray(row.metadata && row.metadata.modelCalls)
      );
      expect(costed.length).toBeGreaterThan(0);

      const calls = costed[0].metadata!.modelCalls as Record<string, unknown>[];
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(Object.keys(calls[0]).sort()).toEqual(
        ['cacheReadTokens', 'cacheWriteTokens', 'durationMs', 'inputTokens', 'model', 'outputTokens'].sort()
      );
      expect(calls[0].model).toBe('claude-opus-5');
      expect(calls[0].inputTokens).toBe(41);
      expect(calls[0].outputTokens).toBe(7);
      expect(calls[0].cacheReadTokens).toBe(12);
      expect(calls[0].cacheWriteTokens).toBe(30);
      expect(typeof calls[0].durationMs).toBe('number');
    });

    it('sums the run on the route every reader of a record goes through', async () => {
      // AC9's second half. The dashboard shows an execution as the JSON this route returns, and
      // so do the editor's History panel and MCP's backend tools — so the sum is computed once,
      // here, rather than three times in three clients (and twice differently).
      //
      // TWO calls in one run, so the assertion is arithmetic and not a copy of one entry: a
      // summariser that returned `calls[0]` verbatim passes a one-call run and fails this.
      const res = await ask('/ok', { input: 'First of two.' }, 'askTwice');
      expect(res.status).toBe(200);

      const executions = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=askTwice&limit=1', {
        headers: asAdmin()
      });
      expect(executions.json).toHaveLength(1);

      const detail = await client.request<{ modelCost?: Record<string, unknown> }>(
        'GET',
        `/executions/${executions.json[0].id}`,
        { headers: asAdmin() }
      );
      expect(detail.status).toBe(200);
      expect(detail.json.modelCost).toEqual({
        calls: 2,
        inputTokens: 82, // 41 × 2
        outputTokens: 14, // 7 × 2
        cacheReadTokens: 24, // 12 × 2
        cacheWriteTokens: 60, // 30 × 2
        durationMs: expect.any(Number),
        models: ['claude-opus-5'], // distinct, not repeated
        line: expect.any(String)
      });
    });

    /**
     * §5.5, settled. This task left the cost unformatted on purpose — the phase's close condition
     * is Richard ruling the record LEGIBLE, and guessing the presentation first means building it
     * twice. Ruled 2026-09-19: a summary line, counts and tokens, **no money**.
     *
     * This run is where the CACHED clause is measured: the fixture reports
     * `cache_read_input_tokens`, and a line that dropped it would hide the cheapest tokens in the
     * bill. FED-006's drive pins the other branch, where there are none.
     */
    it('§5.5 the sentence a person reads — and it names the cached tokens', async () => {
      const executions = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=askTwice&limit=1', {
        headers: asAdmin()
      });
      const detail = await client.request<{ modelCost?: { line?: string; durationMs?: number } }>(
        'GET',
        `/executions/${executions.json[0].id}`,
        { headers: asAdmin() }
      );

      const ms = detail.json.modelCost!.durationMs!;
      const time = ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
      expect(detail.json.modelCost!.line).toBe(
        `2 model calls \u00b7 82 in (24 cached) / 14 out tokens \u00b7 ${time} \u00b7 claude-opus-5`
      );

      // 🔴 The ruling's own exclusion: a price table the backend carried would go stale silently
      // while continuing to render confidently.
      expect(detail.json.modelCost!.line).not.toMatch(/[$£€]/);
    });

    it('says nothing at all about cost on a run that never called a model', async () => {
      // Two-sided, and it is the common case: `undefined` and a block of zeros are different
      // sentences, and every run in this product that never touches a model would otherwise
      // carry the second one.
      const res = await ask('/ok', {}, 'askOtherProvider');
      expect(res.json.result.errorCode).toBe('not_implemented');

      const executions = await client.request<ExecutionRow[]>(
        'GET',
        '/executions?workflowId=askOtherProvider&limit=1',
        { headers: asAdmin() }
      );
      const detail = await client.request<{ modelCost?: unknown }>(
        'GET',
        `/executions/${executions.json[0].id}`,
        { headers: asAdmin() }
      );
      expect(detail.json.modelCost).toBeUndefined();
    });

    it('costs a run that was REFUSED too — a refusal is an answer somebody paid for', async () => {
      await ask('/refuse', { input: 'Declined but billed.' });

      // `limit=1` on a newest-first listing is THIS run and not an earlier successful one,
      // which is the only way this spec can fail when the refusal path forgets to record.
      const executions = await client.request<ExecutionRow[]>('GET', '/executions?workflowId=ask&limit=1', {
        headers: asAdmin()
      });
      expect(executions.json).toHaveLength(1);
      const calls = executions.json[0].metadata && executions.json[0].metadata.modelCalls;
      expect(Array.isArray(calls)).toBe(true);
      expect(calls as unknown[]).toHaveLength(1);
    });
  });
});
