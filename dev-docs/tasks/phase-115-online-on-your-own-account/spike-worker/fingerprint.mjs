// Prints the fingerprint the stand-in logs for `Authorization: Bearer <MAILCHIMP_KEY from .dev.vars>`, so a reading of the
// stand-in's log can be matched to the key without the key ever being logged or printed.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const line = readFileSync(new URL('./.dev.vars', import.meta.url), 'utf8').split('\n').find((l) => l.startsWith('MAILCHIMP_KEY='));
if (!line) throw new Error('no MAILCHIMP_KEY in .dev.vars');
const header = `Bearer ${line.slice('MAILCHIMP_KEY='.length).trim()}`;
console.log(`len ${header.length} sha256 ${createHash('sha256').update(header).digest('hex').slice(0, 12)}`);
