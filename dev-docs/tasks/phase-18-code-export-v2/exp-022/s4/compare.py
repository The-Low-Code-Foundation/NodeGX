"""EXP-022 S4: the three arms' readings side by side (readings-*.json → compare.json and the table README.md quotes),
Run after drive-swift.cjs and drive-web.cjs; sheet.cjs draws the evidence image."""
import json
import os
import re
from collections import Counter

X = os.path.dirname(os.path.abspath(__file__))
ARMS = ['runtime', 'react', 'swift']
TASKS = ['Book the van in for its MOT', 'Chase the accountant about VAT', 'Write the release notes', 'Pick up the dry cleaning']


def wire(requests):
    """The requests as a multiset: no CORS preflight, no record id (each arm's backend makes its own)."""
    out = Counter()
    for r in requests:
        method, path, status = r.split(' ')
        if method == 'OPTIONS':
            continue
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f-]{27}', '/<id>', path)
        out[f'{method} {path} {status}'] += 1
    return dict(sorted(out.items()))


def summary(step):
    tabs = [b for b in step['buttons'] if re.match(r'^(List|Today|Done) \(\d+\)$', b)]
    rows = [t for t in TASKS if t in step['texts']]
    return {
        'page': 'Todo' if tabs else ('Sign in' if any(f.startswith('secure') for f in step['fields']) else '?'),
        'tabs': tabs,
        'rows': rows,
        'fields': step['fields'],
        'wire': wire(step.get('requests', [])),
    }


readings = {a: json.load(open(os.path.join(X, f'readings-{a}.json'))) for a in ARMS}
steps = [s['step'] for s in readings['swift']['steps']]
table = {}
for name in steps:
    table[name] = {}
    for a in ARMS:
        s = next((s for s in readings[a]['steps'] if s['step'] == name), None)
        table[name][a] = summary(s) if s else None
json.dump(table, open(os.path.join(X, 'compare.json'), 'w'), indent=1)

for name in steps:
    row = table[name]
    same = row['react'] == row['swift']
    same_wire = row['react']['wire'] == row['swift']['wire']
    print(f"{name}: swift==react {'yes' if same else 'NO'} (wire {'same' if same_wire else 'differs'})")
    for a in ARMS:
        r = row[a]
        print(f"  {a:8} {r['page']:7} {' '.join(r['tabs']):32} rows={len(r['rows'])} wire={sum(r['wire'].values())}")
    if not same:
        for k in ('page', 'tabs', 'rows', 'fields', 'wire'):
            if row['react'][k] != row['swift'][k]:
                print(f"    {k}: react={row['react'][k]} swift={row['swift'][k]}")
