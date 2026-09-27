import json,glob,os,re,sys
KEYS={'text','label','placeholder','title','content'}
# Two exclusions, each by reason, never by loosening the pattern (L91/L100):
#  1. dbt-lesson.Section.label — the port's own description is "Shown on the node
#     in the graph only", so it is an EDITOR label, not learner-facing (AC6).
#  2. Page.title — read off parameters at export into the router index; it is the
#     BUILD-TIME FALLBACK behind a Noodl.SEO.setTitle override (TASK-L161 §1).
def excluded(t,i,k):
    if t.startswith('dbt-lesson.') and k=='label': return 'kit editor label'
    if t=='Page' and k=='title': return 'build-time tab fallback'
    return None
hits=[];excl=[]
for f in sorted(glob.glob('components/**/nodes.json',recursive=True)):
    comp=os.path.dirname(f).replace('components/','')
    for nd in json.load(open(f)).get('nodes',[]):
        if not isinstance(nd,dict): continue
        for k,v in (nd.get('parameters') or {}).items():
            if k in KEYS and isinstance(v,str) and re.search(r'[A-Za-z]{3}',v) and not v.startswith('var('):
                why=excluded(nd['type'],nd['id'],k)
                (excl if why else hits).append((comp,nd['type'],nd['id'],k,v,why))
print(f"LEARNER-FACING LITERALS: {len(hits)}")
for h in hits: print("   ",h[0],h[2],h[3],'=',h[4])
print(f"excluded with reason: {len(excl)}")
for e in excl: print("   ",e[0],e[2],e[3],'—',e[5])
sys.exit(1 if hits else 0)
