// A fake MCP Apps host, for the local gate: serves host.html on a port of its own, so the panel is drawn from a
// FOREIGN origin (as Claude's sandbox draws it), answers ui/initialize over postMessage, and logs every message the
// panel sends into the page (#log) where a CDP drive can read it.
//   node serve.mjs <port> <panel-url> [iframe-width-px] [panel-file]
// With <panel-file>, the host also serves that file at /panel.html — pass "/panel.html" as <panel-url> to draw the
// MCP App resource exactly as a host would: from its own origin, talking to Studio (or the proxy) cross-origin.
import fs from 'node:fs';
import http from 'node:http';
const [port, panelUrl, width = '100%', panelFile] = process.argv.slice(2);
const html = `<!doctype html><meta charset="utf-8"><title>fake host</title>
<style>body{margin:0;font:13px monospace;background:#eee}#log{white-space:pre-wrap;padding:8px;max-height:200px;overflow:auto;background:#fff}iframe{width:${/^\d+$/.test(width) ? width + 'px' : width};height:640px;border:2px solid #c00;display:block}</style>
<pre id="log">host: ready\n</pre>
<iframe id="app" src="${panelUrl}" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
<script>
const log = (s) => { document.getElementById('log').textContent += s + '\\n'; };
const frame = document.getElementById('app');
window.__seen = [];
window.addEventListener('message', (ev) => {
  const m = ev.data;
  if (!m || m.jsonrpc !== '2.0') return;
  window.__seen.push(m.method ?? ('result:' + m.id));
  const reply = (result) => frame.contentWindow.postMessage({ jsonrpc: '2.0', id: m.id, result }, '*');
  if (m.method === 'ui/initialize') {
    log('initialize from ' + JSON.stringify(m.params.appInfo) + ' caps=' + JSON.stringify(m.params.appCapabilities));
    reply({ protocolVersion: m.params.protocolVersion, hostInfo: { name: 'fake-host', version: '0' }, hostCapabilities: {},
      hostContext: { displayMode: 'inline', availableDisplayModes: ['inline', 'fullscreen'], platform: 'desktop', theme: 'dark',
        containerDimensions: { maxHeight: 640 } } });
  } else if (m.method === 'ui/notifications/size-changed') {
    log('size-changed ' + JSON.stringify(m.params));
  } else if (m.method === 'ui/request-display-mode') {
    log('request-display-mode ' + JSON.stringify(m.params)); reply({ mode: m.params.mode });
    frame.contentWindow.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/host-context-changed', params: { displayMode: m.params.mode } }, '*');
  } else if (m.method === 'ui/update-model-context') {
    log('update-model-context ' + JSON.stringify(m.params)); reply({});
  } else if (m.method === 'ui/open-link') {
    log('open-link ' + JSON.stringify(m.params)); reply({});
  } else if (m.id !== undefined && m.method) {
    log('request ' + m.method); reply({});
  } else {
    log('notification ' + m.method);
  }
});
</script>`;
http.createServer((req, res) => {
  if (panelFile && req.url === '/panel.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(panelFile));
    return;
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(Number(port), '127.0.0.1', () => console.log(`fake-host: http://127.0.0.1:${port}/`));
