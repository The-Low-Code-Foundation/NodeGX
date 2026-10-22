// OWN-026: own-020/mock-model.mjs, a scripted OpenAI-compatible model, with its steps from MOCK_STEPS (JSON) when set:
// the fence probe for round.mjs. Each chat request gets the next scripted step as a streamed response; every request
// body is saved, so what the harness offered the model (tools, system prompt) and what came back from each tool (the
// seal's reason, a disabled tool's error, an MCP result) can be read afterwards.
//   node mock-model.mjs <port> <out-dir> <apps-dir>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const [port, out, apps] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const steps = JSON.parse(process.env.MOCK_STEPS || "null") || [
  { tool: 'read_files', args: { files: [{ path: '/etc/hosts' }] } }, // outside: the seal must skip it
  { tool: 'read_files', args: { files: [{ path: path.join(path.dirname(apps), '..', 'home', '..', '..', 'escape.txt') }] } }, // outside via ..
  { tool: 'read_files', args: { files: [{ path: 'AGENTS.md' }] } }, // inside, relative: must work
  { tool: 'editor', args: { path: '/tmp/own020-seal-canary.txt', new_text: 'canary' } }, // outside write
  { tool: 'editor', args: { path: 'seal-inside.txt', new_text: 'inside' } }, // inside write: must work
  { tool: 'nodegx__list_examples', args: {} }, // the MCP server is connected
  { tool: 'run_commands', args: { commands: ['echo pwned > /tmp/own020-seal-canary2.txt'] } }, // disabled
  { text: 'Done: the seal probe is finished.' }
];
let n = 0;
const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', () => {
    fs.appendFileSync(path.join(out, 'requests.log'), `${req.method} ${req.url}\n`);
    if (!req.url.includes('chat/completions')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"not found"}'); return; }
    fs.writeFileSync(path.join(out, `req-${String(n).padStart(2, '0')}.json`), body);
    const step = steps[Math.min(n, steps.length - 1)];
    n++;
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const base = { id: `mock-${n}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: 'mock' };
    if (step.tool) {
      sse(res, { ...base, choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `call_${n}`, type: 'function', function: { name: step.tool, arguments: JSON.stringify(step.args) } }] }, finish_reason: null }] });
      sse(res, { ...base, choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
    } else {
      sse(res, { ...base, choices: [{ index: 0, delta: { role: 'assistant', content: step.text }, finish_reason: null }] });
      sse(res, { ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
    }
    res.end('data: [DONE]\n\n');
  });
}).listen(Number(port), '127.0.0.1', () => console.log(`mock on ${port}`));
