# OWN-008: what a running stranger has done so far. `python3 peek.py <labRoot>/out/<name> [last N calls]`.
import json, sys, os

out = sys.argv[1]
last = int(sys.argv[2]) if len(sys.argv) > 2 else 15
calls, quota, init, result = [], None, None, None
for line in open(os.path.join(out, 'agent.jsonl')):
    try:
        e = json.loads(line)
    except ValueError:
        continue
    if e['type'] == 'system' and e.get('subtype') == 'init':
        init = (e.get('model'), [m['status'] for m in e.get('mcp_servers', [])])
    elif e['type'] == 'rate_limit_event':
        quota = e['rate_limit_info']['unifiedWindows']
    elif e['type'] == 'assistant':
        for c in e['message']['content']:
            if c['type'] == 'tool_use':
                calls.append('TOOL %s %s' % (c['name'], json.dumps(c['input'])[:110]))
            elif c['type'] == 'text' and c['text'].strip():
                calls.append('TEXT %s' % c['text'].strip().replace('\n', ' ')[:150])
    elif e['type'] == 'result':
        result = (e.get('subtype'), e.get('num_turns'), e.get('total_cost_usd'), (e.get('result') or '')[:300])
print('init', init)
print('quota week %s, 5h %s' % (quota and quota['seven_day']['utilization'], quota and quota['five_hour']['utilization']))
print('%d steps' % len(calls))
for c in calls[-last:]:
    print(' ', c)
if result:
    print('RESULT', result)
