# s132 — the census, how it was taken (2026-10-21)

`census/` and `census-after/`: every template's preflight (`dist/cli.mjs export --dry-run <template>`), before and after
EXP-019 slice 1. `dispdiff.json`: `../s119-fnchain-measure/dispdiff.ts` over `ROOTS=templates`, base = `git archive
420619884 packages/nodegx-export/src` copied to `packages/nodegx-export/.s132-base/src` with `dist/node-catalog.json`
beside it (a copy outside the package resolves no modules, and one inside `node_modules` is type-stripped by Node, not
ts-node). `tplbuild.json`: `../s124-deadrow/tplbuild.ts` over the same roots (17 projects: the two with no v2 markers skip).

🔴 **The preflight's "What will not translate (N)" is a listing, capped by head, not the reach.** members-area read
228 → 275 after the change with nodes "new" in its list that are in no `dispdiff` row: the heads that fell let others
surface. Reach is `dispdiff`'s per-node disposition; the headline is for a person.

## The script census (gate hits and Noodl members)

```python
import json,glob,re,collections
members=collections.Counter(); bodies=0; withNoodl=0; perTpl=collections.Counter()
gates={'this':re.compile(r'\bthis\s*[.\[]'),'Date':re.compile(r'\bnew\s+Date\b|\bDate\s*[.(]'),'random':re.compile(r'\bMath\.random\b'),
 'fetch':re.compile(r'\bfetch\s*\(|\bXMLHttpRequest\b'),'timers':re.compile(r'\bsetTimeout\b|\bsetInterval\b'),
 'browser':re.compile(r'\bwindow\b|\bdocument\b|\blocalStorage\b|\bsessionStorage\b|\bnavigator\b'),
 'async':re.compile(r'\basync\b|\bawait\b|\.then\s*\('),'Noodl':re.compile(r'\bNoodl\s*[.\[]'),'Component':re.compile(r'\bComponent\s*[.\[]')}
gc=collections.Counter(); pure=0
def strip(b):
    b=re.sub(r'//[^\n]*','',b); b=re.sub(r'/\*[\s\S]*?\*/','',b); b=re.sub(r'"[^"\n]*"','""',b); return re.sub(r"'[^'\n]*'","''",b)
for f in glob.glob('templates/*/components/**/nodes.json',recursive=True):
    tpl=f.split('/')[1]
    try: data=json.load(open(f))
    except Exception: continue
    stack=list(data if isinstance(data,list) else data.get('nodes',[]))
    while stack:
        n=stack.pop()
        if not isinstance(n,dict): continue
        stack.extend(n.get('children',[]) or [])
        if n.get('type')=='JavaScriptFunction':
            code=(n.get('parameters') or {}).get('functionScript') or ''
            if not code.strip(): continue
            bodies+=1; s=strip(code); hit=False
            for k,rx in gates.items():
                if rx.search(s): gc[k]+=1; hit=True
            if not hit: pure+=1
            for m in re.findall(r'\bNoodl\.([A-Za-z_]+)(?:\.([A-Za-z_]+))?',s): members[m[0]+('.'+m[1] if m[1] else '')]+=1
            if gates['Noodl'].search(s): withNoodl+=1; perTpl[tpl]+=1
print('function bodies',bodies,'pure',pure,'with Noodl',withNoodl); print('gate hits',dict(gc))
print('Noodl members',members.most_common(25)); print('per template with Noodl',perTpl.most_common())
```

Read 2026-10-21 at `420619884`: 1,285 bodies, 602 pure; gates `browser` 174, `this` 69, `Date` 437, `timers` 27,
`Noodl` 183, `async` 163, `fetch` 13, `random` 88, `Component` 14. Members: `Records.query` 145, `Records.create` 76,
`CloudFunctions.run` 56, `Records.save` 41, `Users.Current` 33, `Records` 26, `Files.sign` 10, `Variables.*` 77 (18
names), `Records.delete` 2, `addRelation` 1, `removeRelation` 1.

## The preflight tally

```sh
cat census/*.txt | grep -o -E '^- ".*" \(([^)]+)\) in `[^`]+` — .*' \
 | sed -E 's/^- "[^"]*" \(([^)]+)\) in `[^`]+` — (.*)$/\1 | \2/' | sed -E 's/"[^"]*"/"…"/g; s/[0-9]+/N/g' | sort | uniq -c | sort -rn
```
