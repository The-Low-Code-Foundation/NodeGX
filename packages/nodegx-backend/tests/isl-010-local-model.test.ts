/**
 * A running app can ask a model on its own computer (ISL-010), driven end to end through
 * `POST /functions/:name` against the real service, as FED-003's spec is.
 *
 * The provider here is a recording double that answers in the OpenAI chat-completions shape on
 * 127.0.0.1 — the shape Ollama, llama.cpp's server and LM Studio speak. ⚠️ A double proves the
 * REQUEST, not a model: ISL-010 AC2 reads a real server once, and AC4 records per server whether it
 * honours the JSON-schema form. This file is AC1/AC3/AC5's harness.
 *
 * ⚠️ Every absence below sits beside the signal that proves it could have been seen:
 *  - `PROMPT` reached the double (it is in the request the double recorded) before the record is
 *    grepped for it;
 *  - `ANSWER` reached the page (it is in the function's response) before the record is grepped;
 *  - the provider's echo of the prompt reached the `Error` port before the record is grepped for
 *    the echo. HEAD before ISL-010 wrote 400 characters of the provider's body into the record.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';

import { logger } from '../src/ops/logger';
import { BackendService } from '../src/service';

import { httpClient } from './helpers/http';

jest.setTimeout(40000);

/** Distinctive, so a grep over a record cannot match it by accident. */
const PROMPT = 'isl010-PROMPT-the-owl-likes-blue-3e9d';
const ANSWER = 'isl010-ANSWER-owl-7c21';
const MODEL = 'qwen3.5:0.8b';

interface Seen {
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, any>;
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

/**
 * Request → Model Request (openai-compatible) → Response, the failure path wired. The secret name
 * is one nothing provisions, so every call here is keyless — ruling 2's case.
 *
 * With `input` among `parameters` the prompt is composed IN the function and not wired from the
 * request — the fence's shape (the page sends slots, never prompt text). ⚠️ AC5 needs that shape:
 * the execution record keeps the trigger's request body (`triggerData.body`), so a prompt the
 * PAGE sent is on the record whatever this node does.
 */
function localFunction(name: string, parameters: Record<string, unknown> = {}) {
  const fixedInput = parameters.input !== undefined;
  return {
    name: `/#__cloud__/${name}`,
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
          provider: 'openai-compatible',
          model: MODEL,
          apiKeySecret: 'NOT_PROVISIONED',
          maxTokens: 64,
          timeoutMs: 8000,
          ...parameters
        },
        ports: [],
        children: []
      },
      {
        id: 'res',
        type: 'noodl.cloud.response',
        x: 0,
        y: 200,
        parameters: { params: 'text,json,usage,stopReason,attempts,error,errorCode,status' },
        ports: [],
        children: []
      },
      {
        id: 'resErr',
        type: 'noodl.cloud.response',
        x: 0,
        y: 300,
        parameters: { params: 'text,error,errorCode,status,attempts' },
        ports: [],
        children: []
      }
    ],
    connections: [
      { sourceId: 'req', sourcePort: 'pm-base', targetId: 'model', targetPort: 'baseUrl' },
      { sourceId: 'req', sourcePort: 'pm-schema', targetId: 'model', targetPort: 'outputSchema' },
      { sourceId: 'req', sourcePort: 'pm-instructions', targetId: 'model', targetPort: 'instructions' },
      { sourceId: 'req', sourcePort: 'pm-callInstructions', targetId: 'model', targetPort: 'callInstructions' },
      ...(fixedInput ? [] : [{ sourceId: 'req', sourcePort: 'pm-input', targetId: 'model', targetPort: 'input' }]),
      { sourceId: 'req', sourcePort: 'receive', targetId: 'model', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'text', targetId: 'res', targetPort: 'pm-text' },
      { sourceId: 'model', sourcePort: 'json', targetId: 'res', targetPort: 'pm-json' },
      { sourceId: 'model', sourcePort: 'usage', targetId: 'res', targetPort: 'pm-usage' },
      { sourceId: 'model', sourcePort: 'stopReason', targetId: 'res', targetPort: 'pm-stopReason' },
      { sourceId: 'model', sourcePort: 'attempts', targetId: 'res', targetPort: 'pm-attempts' },
      { sourceId: 'model', sourcePort: 'done', targetId: 'res', targetPort: 'send' },
      { sourceId: 'model', sourcePort: 'text', targetId: 'resErr', targetPort: 'pm-text' },
      { sourceId: 'model', sourcePort: 'error', targetId: 'resErr', targetPort: 'pm-error' },
      { sourceId: 'model', sourcePort: 'errorCode', targetId: 'resErr', targetPort: 'pm-errorCode' },
      { sourceId: 'model', sourcePort: 'status', targetId: 'resErr', targetPort: 'pm-status' },
      { sourceId: 'model', sourcePort: 'attempts', targetId: 'resErr', targetPort: 'pm-attempts' },
      { sourceId: 'model', sourcePort: 'failure', targetId: 'resErr', targetPort: 'send' }
    ],
    roots: []
  };
}

/** A chat completion in the shape the servers answer with. */
const completion = (content: string, extra: Record<string, unknown> = {}) => ({
  id: 'chatcmpl-isl010',
  object: 'chat.completion',
  model: MODEL,
  choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 50, completion_tokens: 4, total_tokens: 54, prompt_tokens_details: { cached_tokens: 20 } },
  ...extra
});

describe('a running app asks a model on its own computer (ISL-010)', () => {
  let dataDir: string;
  let service: BackendService;
  let base: string;
  let provider: http.Server;
  let providerUrl: string;
  let adminToken: string;

  const seen: Seen[] = [];
  const logLines: string[] = [];

  const client = httpClient(() => base);
  const asAdmin = () => ({ authorization: `Bearer ${adminToken}` });

  const ask = (baseUrl: string, body: Record<string, unknown> = {}, fn = 'local') =>
    client.request<{ result: Answer }>('POST', `/functions/${fn}`, { body: { base: baseUrl, ...body } });

  /** The newest execution of `fn`, listed and in detail — the two shapes a reader of the record gets. */
  const record = async (fn: string) => {
    const list = await client.request<Array<{ id: string }>>('GET', `/executions?workflowId=${fn}&limit=1`, {
      headers: asAdmin()
    });
    const detail = await client.request('GET', `/executions/${list.json[0].id}`, { headers: asAdmin() });
    return { list: JSON.stringify(list.json), detail: JSON.stringify(detail.json) };
  };

  beforeAll(async () => {
    provider = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        let body: Record<string, any> = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {
          /* recorded as {} */
        }
        const url = String(req.url);
        seen.push({ url, headers: req.headers, body });
        const route = url.split('/')[1];

        const send = (status: number, payload: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
        };
        const lastUser = (body.messages || []).filter((m: any) => m.role === 'user').slice(-1)[0];

        switch (route) {
          case 'ok':
            return send(200, completion(ANSWER));
          case 'word':
            return send(200, completion('{"word":"blue"}'));
          case 'prose':
            // The server ignored response_format and answered in words.
            return send(200, completion('I think the owl likes blue.'));
          case 'echo400':
            // An OpenAI-shaped error whose MESSAGE quotes the request — the leak ISL-010 closes.
            return send(400, {
              error: {
                message: `could not parse: ${lastUser && lastUser.content}`,
                type: 'invalid_request_error',
                code: null
              }
            });
          case 'echoOllama':
            // Ollama's own error shape: a bare sentence, no identifiers to keep.
            return send(404, { error: `model "${MODEL}" not found, asked: ${lastUser && lastUser.content}` });
          case 'refuse':
            return send(200, {
              ...completion(''),
              choices: [{ index: 0, message: { role: 'assistant', content: null, refusal: 'No.' }, finish_reason: 'stop' }]
            });
          case 'truncated':
            return send(200, {
              ...completion('As far as'),
              choices: [{ index: 0, message: { role: 'assistant', content: 'As far as' }, finish_reason: 'length' }]
            });
          case 'notchat':
            return send(200, { models: [] });
          case 'slow':
            // Never answers inside the function's 300 ms budget.
            return setTimeout(() => send(200, completion('late')), 1500);
          default:
            return send(404, { error: { message: 'no such fixture route', type: 'not_found' } });
        }
      });
    });
    await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
    providerUrl = `http://127.0.0.1:${(provider.address() as { port: number }).port}`;

    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nodegx-isl010-'));
    fs.mkdirSync(path.join(dataDir, 'workflows'), { recursive: true });
    fs.writeFileSync(
      path.join(dataDir, 'workflows', 'local.workflow.json'),
      JSON.stringify({
        components: [
          localFunction('local'),
          localFunction('localQuick', { timeoutMs: 300 }),
          localFunction('localFenced', { input: PROMPT }),
          localFunction('localNoThinking', { effort: 'none' })
        ],
        settings: {},
        metadata: {}
      })
    );

    service = new BackendService({ dataDir, port: 0, backendId: 'isl010', backendName: 'ISL-010' });
    base = (await service.start()).listen.url;
    adminToken = JSON.parse(fs.readFileSync(path.join(dataDir, 'secrets.json'), 'utf-8')).adminToken;

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

  describe('AC1 turned green — the request a local server is sent', () => {
    let res: { status: number; json: { result: Answer } };
    let sent: Seen;

    beforeAll(async () => {
      const before = seen.length;
      res = await ask(`${providerUrl}/ok`, {
        instructions: 'You are Olive the owl.',
        callInstructions: 'The child is 7.',
        input: PROMPT
      });
      sent = seen[before];
    });

    it('reaches the server once, at /v1/chat/completions, with no key and no authorization header', () => {
      expect(sent).toBeDefined();
      expect(sent.url).toBe('/ok/v1/chat/completions');
      expect(sent.headers.authorization).toBeUndefined();
      expect(sent.headers['x-api-key']).toBeUndefined();
    });

    it('sends ONE system message, the turn, max_tokens — and nothing Anthropic-only', () => {
      expect(sent.body.model).toBe(MODEL);
      expect(sent.body.max_tokens).toBe(64);
      expect(sent.body.messages).toEqual([
        { role: 'system', content: 'You are Olive the owl.\n\nThe child is 7.' },
        { role: 'user', content: PROMPT }
      ]);
      expect(sent.body.output_config).toBeUndefined();
      expect(sent.body.system).toBeUndefined();
      expect(sent.body.response_format).toBeUndefined();
    });

    it('answers with the text, the mapped stop reason, and usage in the node’s own vocabulary', () => {
      expect(res.status).toBe(200);
      expect(res.json.result.text).toBe(ANSWER);
      expect(res.json.result.stopReason).toBe('end_turn');
      expect(res.json.result.attempts).toBe(1);
      // prompt_tokens 50 INCLUDES the 20 cached; Input Tokens is the uncached 30, as on Anthropic.
      expect(res.json.result.usage).toEqual({ inputTokens: 30, outputTokens: 4, cacheReadTokens: 20, cacheWriteTokens: 0 });
    });
  });

  describe('the shape asked for', () => {
    const WORD_SCHEMA = {
      type: 'object',
      properties: { word: { type: 'string', enum: ['red', 'blue', 'green'] } },
      required: ['word'],
      additionalProperties: false
    };

    it('sends the schema as response_format json_schema and fires Json with the parsed answer', async () => {
      const before = seen.length;
      const res = await ask(`${providerUrl}/word`, { input: 'Pick a colour.', schema: WORD_SCHEMA });
      expect(seen[before].body.response_format).toEqual({
        type: 'json_schema',
        json_schema: { name: 'answer', strict: true, schema: WORD_SCHEMA }
      });
      expect(res.json.result.json).toEqual({ word: 'blue' });
    });

    it('sends reasoning_effort none ONLY for Effort None — a model that does not think refuses any other', async () => {
      const before = seen.length;
      await ask(`${providerUrl}/word`, { input: 'Pick a colour.' }, 'localNoThinking');
      expect(seen[before].body.reasoning_effort).toBe('none');
      // The default (high) was sent nowhere above: AC1's body has no reasoning_effort either.
      await ask(`${providerUrl}/word`, { input: 'Pick a colour.' });
      expect(seen[before + 1].body.reasoning_effort).toBeUndefined();
    });

    it('fails with bad_json — never a half-parsed object — when the server answered in prose', async () => {
      const res = await ask(`${providerUrl}/prose`, { input: 'Pick a colour.', schema: WORD_SCHEMA });
      expect(res.json.result.errorCode).toBe('bad_json');
      expect(res.json.result.text).toBe('I think the owl likes blue.');
    });
  });

  describe('the failures a graph branches on', () => {
    it('a refusal is a failure, not an empty answer', async () => {
      const res = await ask(`${providerUrl}/refuse`, { input: 'x' });
      expect(res.json.result.errorCode).toBe('refusal');
    });

    it('a truncated answer is a success carrying max_tokens', async () => {
      const res = await ask(`${providerUrl}/truncated`, { input: 'x' });
      expect(res.json.result.text).toBe('As far as');
      expect(res.json.result.stopReason).toBe('max_tokens');
    });

    it('a 200 that is not a chat completion fails with network, naming Base URL', async () => {
      const res = await ask(`${providerUrl}/notchat`, { input: 'x' });
      expect(res.json.result.errorCode).toBe('network');
      expect(res.json.result.error).toContain('not a chat completion');
    });

    it('a server that is not there fails with network', async () => {
      // A port nothing listens on: bind one, take its number, close it.
      const probe = http.createServer();
      await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
      const port = (probe.address() as { port: number }).port;
      await new Promise<void>((resolve) => probe.close(() => resolve()));

      const res = await ask(`http://127.0.0.1:${port}`, { input: 'x' });
      expect(res.json.result.errorCode).toBe('network');
      expect(res.json.result.attempts).toBe(3);
    });

    it('a slow model fails with timeout inside the author’s budget', async () => {
      const started = Date.now();
      const res = await ask(`${providerUrl}/slow`, { input: 'x' }, 'localQuick');
      expect(res.json.result.errorCode).toBe('timeout');
      expect(Date.now() - started).toBeLessThan(1500);
    });
  });

  describe('AC5 — nothing leaks: counts and the model id on the record, never the prompt or the answer', () => {
    it('the success path', async () => {
      const before = seen.length;
      const res = await ask(`${providerUrl}/ok`, {}, 'localFenced');
      // Both signals are live: the double received the prompt, the page received the answer.
      expect(JSON.stringify(seen[before].body)).toContain(PROMPT);
      expect(res.json.result.text).toBe(ANSWER);

      const { list, detail } = await record('localFenced');
      // The known-firing half: the record is there and carries the call's counts and model id.
      expect(list).toContain('modelCalls');
      expect(list).toContain(MODEL);
      for (const raw of [list, detail]) {
        expect(raw).not.toContain(PROMPT);
        expect(raw).not.toContain(ANSWER);
      }
    });

    it.each([
      ['echo400', 400, 'http_error', '(invalid_request_error)'],
      ['echoOllama', 404, 'http_error', '']
    ])(
      'the failure path: a server error that QUOTES the prompt (%s) reaches the Error port, not the record',
      async (route, status, code, identifiers) => {
        const res = await ask(`${providerUrl}/${route}`, {}, 'localFenced');
        expect(res.json.result.errorCode).toBe(code);
        expect(res.json.result.status).toBe(status);
        // The author's graph sees the provider's own words — the leak would be real if recorded.
        expect(res.json.result.error).toContain(PROMPT);
        expect(res.json.result.error).toContain(`the provider answered ${status}${identifiers ? ` ${identifiers}` : ''}.`);

        const { list, detail } = await record('localFenced');
        // Known-firing: the failure IS on the record, by code and status.
        expect(detail).toContain(`model-request/${code}`);
        expect(detail).toContain(`the provider answered ${status}`);
        for (const raw of [list, detail]) expect(raw).not.toContain(PROMPT);
        expect(logLines.join('\n')).not.toContain(PROMPT);
      }
    );
  });
});
