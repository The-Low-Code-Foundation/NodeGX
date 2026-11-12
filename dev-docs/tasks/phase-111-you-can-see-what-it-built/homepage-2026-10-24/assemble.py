import sys,re
H='.'
orig=open(f'{H}/orig.html',encoding='utf-8').read(); lines=orig.split('\n')
css=open(f'{H}/new.css',encoding='utf-8').read(); top=open(f'{H}/new-top.html',encoding='utf-8').read(); js=open(f'{H}/new.js',encoding='utf-8').read()
def idx(marker):
    for i,l in enumerate(lines):
        if marker in l: return i
    raise SystemExit('missing '+marker)
npm=idx('<!-- ====================== npm: the kit'); more=idx('<!-- ====================== The other pages'); dl=idx('<!-- ====================== Download')
assert npm < more < dl, (npm, more, dl)
npm_block='\n'.join(lines[npm:more]).replace('<p class="kicker">New &middot; on npm</p>','<p class="kicker">Dive deep &middot; on npm</p>')
rest='\n'.join(lines[dl:]).rstrip('\n')
comm=idx('<!-- ====================== Community')
rest='\n'.join(lines[comm:]).rstrip('\n')
page='\n'.join(lines[:573])+'\n'+css+'</style>\n\n'+top+'\n'+rest+'\n'+js
open(f'{H}/_page.html','w',encoding='utf-8').write(page)
site_css=page[page.index('<style>')+7:page.index('</style>')]
LOCAL={'play/':'play.html','build/':'build.html','from-bubble/':'from-bubble.html'}
def fix_links(s, home):
    for k,v in LOCAL.items():
        s=s.replace(f'href="{k}"',f'href="{v}"').replace(f'href="/{k}',f'href="{v}').replace(f'href="/{k[:-1]}/#',f'href="{v}#')
    s=s.replace('href="/"',f'href="{home}"')
    s=re.sub(r'href="/(?!/)([^"]*)"',lambda m:'href="https://nodegx.io/'+m.group(1)+'"',s)
    s=re.sub(r'href="(?!https?:|#|mailto:|[a-z-]+\.html)([a-z][^"]*)"',lambda m:'href="https://nodegx.io/'+m.group(1)+'"',s)
    return s
art=fix_links(page,'home.html').replace('<title>NodeGX</title>','<title>NodeGX homepage draft</title>',1)
open(f'{H}/homepage-draft.html','w',encoding='utf-8').write(art)
open(f'{H}/home.html','w',encoding='utf-8').write('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+art.replace('<title>','</head><body><title>',0)+'</html>')
for name in ['play','build','from-bubble']:
    src=open(f'{H}/pages/{name}.html',encoding='utf-8').read()
    title=re.search(r'<title>(.*?)</title>',src).group(1)
    body=re.sub(r'<title>.*?</title>\s*<style>.*?</style>','',src,flags=re.S)
    nav='<nav class="draft-nav"><a href="home.html">&larr; NodeGX home (draft)</a></nav>'
    doc=('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
         f'<title>{title}</title><style>{site_css}\n .draft-nav{{padding:12px 24px;border-bottom:1px solid var(--line);font-size:14px;background:var(--panel)}}</style></head><body>'
         +nav+fix_links(body,'home.html')+'</body></html>')
    open(f'{H}/{name}.html','w',encoding='utf-8').write(doc)
print('assembled', len(page))
