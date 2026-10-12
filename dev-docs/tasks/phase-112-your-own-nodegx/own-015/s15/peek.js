const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean);
const tools = []; let result;
for (const l of lines) {
  let j; try { j = JSON.parse(l); } catch { continue; }
  if (j.type === 'assistant') for (const c of j.message?.content ?? []) if (c.type === 'tool_use') tools.push(c.name.replace('mcp__nodegx__', '') + (c.input?.path ? ':' + c.input.path : c.input?.name ? ':' + c.input.name : ''));
  if (j.type === 'result') result = j;
}
console.log('turns(tool calls)', tools.length);
console.log(tools.join(' | '));
if (result) console.log('RESULT', result.subtype, 'cost', result.total_cost_usd, 'turns', result.num_turns, '\n', String(result.result).slice(0, 1500));
