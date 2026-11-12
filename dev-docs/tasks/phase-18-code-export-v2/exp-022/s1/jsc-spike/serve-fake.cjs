// The Noodl Desk's fake Parse backend (tests/helpers/fake-parse-backend.js), unchanged, behind a real HTTP port.
const http = require('http');
const { createFakeBackend } = require(require('path').join(__dirname, '../../../../../../packages/nodegx-export/tests/helpers/fake-parse-backend.js'));
const spec = {
  classes: { Task: [
    { objectId: 't1', title: 'First', done: false, owner: { __type: 'Pointer', className: '_User', objectId: 'u1' }, due: { __type: 'Date', iso: '2026-10-21T00:00:00.000Z' } },
    { objectId: 't2', title: 'Second', done: true },
    { objectId: 't3', title: 'Third', done: false } ] },
  sessions: { 'tok-ann': { objectId: 'u1', name: 'Ann', role: 'admin' } }
};
let backend = createFakeBackend(spec);
http.createServer((req, res) => {
  if (req.url === '/__reset') { backend = createFakeBackend(spec); res.end('ok'); return; }
  if (req.url === '/__log') { res.end(JSON.stringify(backend.log)); return; }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = v;
    backend.fetch('http://x' + req.url, { method: req.method, headers, body: body === '' ? undefined : body }).then(
      async (r) => { res.statusCode = r.status; res.end(await r.text()); },
      () => { req.socket.destroy(); }
    );
  });
}).listen(18591, '127.0.0.1', () => console.log('fake backend on 18591'));
