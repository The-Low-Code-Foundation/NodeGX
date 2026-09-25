// A minimal SMTP sink for the BMG-005 drive: accepts every message and appends it to $MAILBOX as one JSON line.
// No STARTTLS advertised, so nodemailer (secure: false) speaks plain SMTP to it. Loopback only.
import fs from 'fs';
import net from 'net';
const PORT = Number(process.env.SMTP_PORT || 2526);
const MAILBOX = process.env.MAILBOX;
net
  .createServer((sock) => {
    let data = null;
    let rcpt = [];
    let buf = '';
    sock.write('220 sink ESMTP\r\n');
    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      for (;;) {
        if (data !== null) {
          const end = buf.indexOf('\r\n.\r\n');
          if (end === -1) return;
          data += buf.slice(0, end);
          buf = buf.slice(end + 5);
          fs.appendFileSync(MAILBOX, JSON.stringify({ to: rcpt, body: data }) + '\n');
          data = null;
          rcpt = [];
          sock.write('250 queued\r\n');
          continue;
        }
        const nl = buf.indexOf('\r\n');
        if (nl === -1) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-sink\r\n250 OK\r\n');
        else if (cmd === 'RCPT') { rcpt.push(line.replace(/^RCPT TO:\s*/i, '')); sock.write('250 OK\r\n'); }
        else if (cmd === 'DATA') { data = ''; sock.write('354 go\r\n'); }
        else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); return; }
        else sock.write('250 OK\r\n');
      }
    });
    sock.on('error', () => {});
  })
  .listen(PORT, '127.0.0.1', () => console.log('smtp sink on', PORT));
