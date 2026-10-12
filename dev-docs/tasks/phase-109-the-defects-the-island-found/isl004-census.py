#!/usr/bin/env python3
"""P109 ISL-004 AC4 — which app-wide Variables are only ever used inside one component (candidates for a component's own
state, ruled s18: Component Object), and how many of those components are placed more than once (where two copies share
the value today: GAM-005's case, warned when both are in the project).

Reads both project formats: v2 (`components/**/nodes.json`) and legacy (`project.json` → components[].graph.roots with
children). A name counts as used in a component when a `Variable2` / `Set Variable` node there names it, or when any
script or expression there mentions `Variables.<name>` / `Variables["<name>"]` — so code elsewhere cannot make a Variable
look local. Run from the repo root: python3 dev-docs/tasks/phase-109-the-defects-the-island-found/isl004-census.py
"""
import glob, json, os, re
from collections import defaultdict

VAR_TYPES = {'Variable2', 'Set Variable'}
CODE = re.compile(r'Variables\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*["\']([^"\']+)["\']\s*\])')

def nodes_of(tree):
    out = []
    def walk(n):
        if isinstance(n, dict):
            out.append(n)
            for c in n.get('children') or []: walk(c)
    for r in tree: walk(r)
    return out

def projects():
    for p in sorted(glob.glob('templates/*/nodegx.project.json') + glob.glob('library/*/*/project/nodegx.project.json')):
        root = os.path.dirname(p); comps = {}
        for f in glob.glob(os.path.join(root, 'components', '**', 'nodes.json'), recursive=True):
            try: comps['/' + os.path.relpath(os.path.dirname(f), os.path.join(root, 'components'))] = json.load(open(f)).get('nodes', [])
            except Exception: pass
        yield root, comps
    for p in sorted(glob.glob('library/*/*/project/project.json')):
        try: d = json.load(open(p))
        except Exception: continue
        yield os.path.dirname(p), {c.get('name'): nodes_of((c.get('graph') or {}).get('roots') or []) for c in d.get('components', [])}
    for p in sorted(glob.glob('docs/node-catalog/examples/*.json')):
        try: d = json.load(open(p))
        except Exception: continue
        comps = {}
        for c in d.get('components', []) if isinstance(d.get('components'), list) else []:
            comps[c.get('name') or c.get('path')] = c.get('nodes') or nodes_of((c.get('graph') or {}).get('roots') or [])
        if not comps and isinstance(d.get('nodes'), list): comps[d.get('name', p)] = d['nodes']
        if comps: yield p, comps

total = dict(projects=0, names=0, local=0, local_placed_twice=0)
rows = []
for root, comps in projects():
    use = defaultdict(set); placed = defaultdict(int)
    for cname, nodes in comps.items():
        for n in nodes:
            if not isinstance(n, dict): continue
            t = n.get('type'); p = n.get('parameters') or {}
            if t in VAR_TYPES and isinstance(p.get('name'), str) and p['name']: use[p['name']].add(cname)
            if isinstance(t, str) and t.startswith('/'): placed[t] += 1
            elif isinstance(t, str) and t in comps: placed[t] += 1
            for v in p.values():
                if isinstance(v, str) and 'Variables' in v:
                    for m in CODE.finditer(v): use[m.group(1) or m.group(2)].add(cname)
    if not use: continue
    total['projects'] += 1; total['names'] += len(use)
    for name, where in sorted(use.items()):
        if len(where) != 1: continue
        (c,) = where; total['local'] += 1
        keys = {c, '/' + str(c).lstrip('/')}  # a v2 name already starts with '/': count its placements once
        twice = sum(placed.get(k, 0) for k in keys) > 1
        total['local_placed_twice'] += twice
        rows.append((root, name, c, twice))
print(json.dumps(total))
by = defaultdict(int)
for r in rows: by[r[0]] += 1
for k, v in sorted(by.items(), key=lambda kv: -kv[1])[:12]: print(f'{v:4} {k}')
print('placed twice or more:')
for r in rows:
    if r[3]: print('  ', r[0], '::', r[1], 'in', r[2])
