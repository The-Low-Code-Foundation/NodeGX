#!/usr/bin/env node
// OWN-023 step 1 (OWN-020's zero-cost method): a stand-in for `claude -p … --output-format stream-json` that plays a
// scripted plan, one entry per sitting, so round-arm.mjs's relay, cap and audit are proven before an arm is spent.
//   MOCK_PLAN=<plan.json> MOCK_LOG=<argv.jsonl> CLAUDE_BIN=mock-claude.mjs node round-arm.mjs …
// plan.json: [{ "say": "…", "usd": 1.2, "tools": [{ "name": "Read", "input": {…} }], "rateLimited": false }, …]
import fs from 'node:fs';

const argv = process.argv.slice(2);
if (argv[0] === '--version') { console.log('0.0.0 (mock)'); process.exit(0); }
const plan = JSON.parse(fs.readFileSync(process.env.MOCK_PLAN, 'utf8'));
const log = process.env.MOCK_LOG;
const k = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length : 0;
fs.appendFileSync(log, JSON.stringify({ k: k + 1, argv, shellPrefix: process.env.CLAUDE_CODE_SHELL_PREFIX ?? null, home: process.env.HOME }) + '\n');
const step = plan[Math.min(k, plan.length - 1)];
const out = (o) => process.stdout.write(JSON.stringify(o) + '\n');
const session = argv.includes('--resume') ? argv[argv.indexOf('--resume') + 1] : 'mock-session-1';
out({ type: 'system', subtype: 'init', session_id: session, model: 'mock' });
out({ type: 'rate_limit_event', rate_limit_info: { status: step.rateLimited ? 'rejected' : 'allowed', resetsAt: Math.floor(Date.now() / 1000) + 1, unifiedWindows: { seven_day: { utilization: step.week ?? 0.3 } } }, session_id: session });
const content = (step.tools || []).map((t, i) => ({ type: 'tool_use', id: `t${k}-${i}`, name: t.name, input: t.input }));
content.push({ type: 'text', text: step.say });
out({ type: 'assistant', message: { content }, session_id: session });
out({
  type: 'result', subtype: step.rateLimited ? 'error_during_execution' : (step.subtype || 'success'), is_error: !!step.rateLimited,
  num_turns: content.length, total_cost_usd: step.usd ?? 1, result: step.rateLimited ? 'Claude usage limit reached.' : step.say,
  permission_denials: step.denials || [], session_id: session
});
