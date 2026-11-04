"""HTX-004 (EXP-022 S6's compare.py, copied, with the HTML arm): the three arms' readings side by side
(readings-*.json -> compare.json and the table README.md quotes). Run after drive.cjs; sheet.cjs draws the image."""
import json
import os
import re
from collections import Counter

X = os.path.dirname(os.path.abspath(__file__))
ARMS = ['runtime', 'react', 'html']
TASKS = ['Book the van in for its MOT', 'Chase the accountant about VAT', 'Write the release notes', 'Pick up the dry cleaning']
ACTIONS = ['Ring the garage', 'Find the logbook']


def wire(requests):
    """The requests as a multiset: no CORS preflight, no record id (each arm's backend makes its own)."""
    out = Counter()
    for r in requests:
        method, path, status = r.split(' ')
        if method == 'OPTIONS':
            continue
        path = re.sub(r'/[0-9a-f]{8}-[0-9a-f-]{27}', '/<id>', path)
        path = re.sub(r'/(classes/[A-Za-z]+)/[A-Za-z0-9]{10,}$', r'/\1/<id>', path)
        out[f'{method} {path} {status}'] += 1
    return dict(sorted(out.items()))


def writes(w):
    """The requests that are not a read (a query is tunnelled as POST ... 200)."""
    return {k: v for k, v in w.items() if not (k.startswith('POST /classes/') and k.endswith(' 200')) and not k.startswith('GET ')}


def summary(step):
    tabs = [b for b in step['buttons'] if re.match(r'^(List|Today|Done) \(\d+\)$', b)]
    return {
        'page': 'Todo' if tabs else ('Sign in' if any(f.startswith('secure') for f in step['fields']) else '?'),
        'tabs': tabs,
        'rows': [t for t in TASKS if t in step['texts']],
        'actions': [t for t in ACTIONS if t in step['texts'] + step.get('values', [])],
        'back': '← Back' in step['buttons'],
        'fields': step['fields'],
        'wire': wire(step.get('requests', [])),
        'extra': {k: step[k] for k in ('opened', 'ticked', 'back', 'typed', 'caret', 'circle', 'ok', 'noted', 'okPressed', 'pressedAgain') if k in step},
    }


readings = {a: json.load(open(os.path.join(X, f'readings-{a}.json'))) for a in ARMS}
steps = [s['step'] for s in readings['runtime']['steps']]
table = {}
for name in steps:
    table[name] = {a: summary(s) for a in ARMS for s in readings[a]['steps'] if s['step'] == name}
json.dump(table, open(os.path.join(X, 'compare.json'), 'w'), indent=1, ensure_ascii=False)

keys = ('page', 'tabs', 'rows', 'actions', 'back', 'fields', 'wire')
for name in steps:
    row = table[name]
    hr = all(row['react'][k] == row['html'][k] for k in keys)
    seen = lambda a: (row[a]['page'], row[a]['tabs'], row[a]['rows'], row[a]['actions'], row[a]['back'])
    all3 = seen('runtime') == seen('react') == seen('html')
    w3 = writes(row['runtime']['wire']) == writes(row['react']['wire']) == writes(row['html']['wire'])
    print(f"{name}: html==react {'yes' if hr else 'NO'}; all three: seen {'same' if all3 else 'DIFFER'}, writes {'same' if w3 else 'DIFFER'}")
    for a in ARMS:
        r = row[a]
        print(f"  {a:8} {r['page']:7} {' '.join(r['tabs']):32} rows={len(r['rows'])} actions={len(r['actions'])} back={r['back']} wire={sum(r['wire'].values())} writes={writes(r['wire'])} {r['extra'] or ''}")
    if not hr:
        for k in keys:
            if row['react'][k] != row['html'][k]:
                print(f"    {k}: react={row['react'][k]} html={row['html'][k]}")
for a in ARMS:
    print(a, 'console:', readings[a]['console'][:6])
