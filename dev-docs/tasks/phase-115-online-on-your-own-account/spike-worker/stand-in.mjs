// A stand-in Mailchimp on 127.0.0.1:8799. It records every request (path, Authorization, body) to stand-in.log and
// answers 200, so the drive can check that the secret arrived here and nowhere else.
import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';

const LOG = new URL('./stand-in.log', import.meta.url);
createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), method: req.method, path: req.url, authorization: req.headers.authorization || null, body }) + '\n');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ id: 'member-1', status: 'subscribed' }));
  });
}).listen(8799, '127.0.0.1', () => console.log('stand-in on 127.0.0.1:8799'));
