/**
 * The Noodl Desk's fake Parse backend (`fake-parse-backend.js`, unchanged) behind a real HTTP port, for an app that sends
 * real requests: the Swift arm (EXP-022 S3, as S1's `jsc-spike/serve-fake.cjs` did). The spec arrives on stdin as JSON;
 * the server listens on a free port on 127.0.0.1 and prints `PORT <n>` once it does.
 *
 * Two routes of its own: `GET /__reset` makes the backend fresh from the spec (and empties its log), and `GET /__log` answers
 * every request the backend has been sent since, as `fake-parse-backend.js` logs them. Everything else is the backend's.
 */
const http = require('http');
const { createFakeBackend } = require('./fake-parse-backend');

let text = '';
process.stdin.on('data', (c) => (text += c));
process.stdin.on('end', () => {
  const spec = JSON.parse(text);
  let backend = createFakeBackend(spec);
  const server = http.createServer((req, res) => {
    if (req.url === '/__reset') {
      backend = createFakeBackend(spec);
      res.end('ok');
      return;
    }
    if (req.url === '/__log') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(backend.log));
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const headers = {};
      for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = v;
      backend.fetch('http://backend.test' + req.url, { method: req.method, headers, body: body === '' ? undefined : body }).then(
        async (r) => {
          res.statusCode = r.status;
          res.end(await r.text());
        },
        // The backend's "cannot be reached" (`/down`): no answer at all.
        () => req.socket.destroy()
      );
    });
  });
  server.listen(0, '127.0.0.1', () => process.stdout.write(`PORT ${server.address().port}\n`));
});
