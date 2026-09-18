// The live PWA, without an account: manifest, service worker, installability, the host's reminders attribute.
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const {connect,evaluate}=require('/Users/richardosborne/vscode_projects/OpenNoodl/scripts/devtools/cdp.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms)); const R={};
let proc; setTimeout(()=>{console.log(JSON.stringify({...R,error:'HARD TIMEOUT'}));try{proc.kill()}catch{};process.exit(3)},90000);
const j=(port,p)=>new Promise((res,rej)=>http.get({host:'127.0.0.1',port,path:p},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{try{res(JSON.parse(b))}catch(e){rej(e)}})}).on('error',rej));
(async()=>{
  const cdp=9800+Math.floor(Math.random()*150); const prof=fs.mkdtempSync(path.join(os.tmpdir(),'todo-live-pwa-'));
  proc=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new',`--remote-debugging-port=${cdp}`,`--user-data-dir=${prof}`,'--no-first-run','--host-resolver-rules=MAP todo.digitalbricks.io 49.12.102.195','about:blank'],{stdio:'ignore'});
  let t;for(let i=0;i<40&&!t;i++){await wait(250);try{t=(await j(cdp,'/json/list')).find(x=>x.type==='page')}catch{}}
  const c=await connect(t); const errs=[];
  c.on(m=>{if(m.method==='Runtime.exceptionThrown')errs.push(String(m.params.exceptionDetails?.exception?.description||m.params.exceptionDetails?.text).slice(0,200));
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errs.push(m.params.args.map(a=>a.value??a.description).join(' ').slice(0,200));
    if(m.method==='Page.javascriptDialogOpening'){R.dialog=m.params.message;c.send('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{})}});
  let code=1;
  try{
    await c.send('Page.enable',{});await c.send('Runtime.enable',{});
    await c.send('Page.navigate',{url:'https://todo.digitalbricks.io/'});
    for(let i=0;i<60;i++){await wait(500); if(String(await evaluate(c,'location.pathname'))==='/sign-in' && String(await evaluate(c,'document.body.innerText')).includes('Create account'))break;}
    R.path=await evaluate(c,'location.pathname');
    const m=await c.send('Page.getAppManifest',{}); R.manifestUrl=m.url; R.manifestErrors=m.errors;
    for(let i=0;i<40;i++){R.sw=String(await evaluate(c,"navigator.serviceWorker.getRegistration().then(function(r){return r&&r.active?r.scope:''})")); if(R.sw)break; await wait(500);}
    R.installabilityErrors=(await c.send('Page.getInstallabilityErrors',{})).installabilityErrors;
    for(let i=0;i<20;i++){R.reminders=String(await evaluate(c,"document.documentElement.getAttribute('data-reminders')")); if(R.reminders!=='null')break; await wait(500);}
    R.statusBar=await evaluate(c,"(document.querySelector('meta[name=apple-mobile-web-app-status-bar-style]')||{}).content");
    R.consoleErrors=errs;
    code = R.path==='/sign-in' && m.errors.length===0 && R.sw==='https://todo.digitalbricks.io/' && R.installabilityErrors.length===0 && R.reminders==='off' && errs.length===0 && !R.dialog ? 0 : 1;
  }catch(e){R.error=String(e.message)}
  finally{console.log(JSON.stringify(R,null,2));c.close();proc.kill();fs.rm(prof,{recursive:true,force:true},()=>{});console.log('EXIT',code);setTimeout(()=>process.exit(code),300);}
})();
