# Usage: python3 bodies.py <out.json> — every template Function body that reads Noodl.*, with its members.
import json, os, re, sys, collections
rows=[]
for tpl in sorted(os.listdir('templates')):
    root=os.path.join('templates',tpl,'components')
    if not os.path.isdir(root): continue
    for d,_,fs in os.walk(root):
        if 'nodes.json' not in fs: continue
        nodes=json.load(open(os.path.join(d,'nodes.json')))
        nodes = nodes.get('nodes', nodes) if isinstance(nodes, dict) else nodes
        wires=[]
        if os.path.exists(os.path.join(d,'connections.json')):
            wires=json.load(open(os.path.join(d,'connections.json')))
            wires = wires.get('connections', wires) if isinstance(wires, dict) else wires
        for n in nodes:
            if n.get('type')!='JavaScriptFunction': continue
            p=n.get('parameters',{})
            fs_=p.get('functionScript') if isinstance(p,dict) else None
            body = fs_ if isinstance(fs_,str) else (fs_ or {}).get('source') or (fs_ or {}).get('value') if isinstance(fs_,dict) else None
            if not isinstance(body,str): continue
            s=re.sub(r'//[^\n]*','',body); s=re.sub(r'/\*[\s\S]*?\*/','',s)
            if not re.search(r'\bNoodl\s*[.\[]',s): continue
            mem=sorted(set(a+('.'+b if b else '') for a,b in re.findall(r'\bNoodl\.([A-Za-z_]+)(?:\.([A-Za-z_]+))?',s)))
            rows.append(dict(tpl=tpl,comp=os.path.relpath(d,root),id=n['id'],label=n.get('label'),members=mem,
              run=any(w.get('targetId',w.get('toId'))==n['id'] and w.get('targetPort',w.get('toProperty'))=='run' for w in wires),body=body))
json.dump(rows,open(sys.argv[1],'w'),indent=1)
print(len(rows),'bodies')
c=collections.Counter(m for r in rows for m in r['members']); print(c.most_common(40))
print(collections.Counter(r['tpl'] for r in rows).most_common())
