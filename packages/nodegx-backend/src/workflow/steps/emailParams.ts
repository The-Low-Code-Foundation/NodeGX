/**
 * P132 BWF-007 — the *Send an email* step's settings: who it goes to, read the same way when the file is written and
 * when the step runs, and the write-time check. Pure: no mailer, no engine, so `kinds.ts` can consult it from the
 * registry's load path.
 *
 * WHO IT GOES TO
 * --------------
 * `to` is one address, several in one text (`"ann@example.com, bob@example.com"`), or a list picked from the run (the
 * `pick` formula over a `find-records` step's `items` gives one; a list of records with an `email` field is read
 * too). One email goes to all of them, each seeing the others, as an email with several addresses on its To line
 * does. A list is capped: a workflow that finds every user and writes to all of them in one email is a mistake far
 * more often than a newsletter, and a newsletter is not this step's job.
 *
 * @module nodegx-backend/workflow/steps/emailParams
 */

import { isPlainObject } from './values';

export const EMAIL_BODY_FORMATS = ['text', 'html'] as const;
/** The most addresses one Send an email step writes to. */
export const EMAIL_MAX_RECIPIENTS = 50;

/** An address as a person would recognise one: something, an `@`, a domain with a dot. Not RFC 5322, on purpose. */
const ADDRESS = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

export function isEmailAddress(s: string): boolean {
  return ADDRESS.test(s);
}

/**
 * The addresses in `v`: a text split on commas, semicolons and line breaks, or a list of texts or of records with an
 * `email` field. Blanks are dropped; anything else is returned as it was written, for the caller to name.
 */
export function readRecipients(v: unknown): { addresses: string[]; bad: string[] } {
  const addresses: string[] = [];
  const bad: string[] = [];
  const one = (x: unknown) => {
    if (typeof x === 'string') {
      for (const part of x.split(/[,;\n]/)) {
        const a = part.trim();
        if (!a) continue;
        (isEmailAddress(a) ? addresses : bad).push(a);
      }
    } else if (isPlainObject(x) && typeof x.email === 'string') one(x.email);
    else if (x !== null && x !== undefined) bad.push(typeof x === 'object' ? JSON.stringify(x).slice(0, 60) : String(x));
  };
  if (Array.isArray(v)) v.forEach(one);
  else one(v);
  return { addresses: [...new Set(addresses)], bad };
}

function isValue(v: unknown): boolean {
  return isPlainObject(v) && (typeof v.$path === 'string' || '$literal' in v || '$fn' in v);
}

/** Write-time check of a `send-email` step's params. A value from the run is checked when the step runs. */
export function validateSendEmailParams(p: Record<string, unknown>, at: string): string[] {
  const errors: string[] = [];
  const blank = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

  if (blank(p.to)) errors.push(`${at}: send-email needs "to" — the address it writes to`);
  else if (!isValue(p.to)) {
    if (typeof p.to !== 'string' && !Array.isArray(p.to)) {
      errors.push(`${at}.params.to must be an address, several separated by commas, a list, or a value picked from the run`);
    } else if (!Array.isArray(p.to) || !p.to.some(isValue)) {
      const { addresses, bad } = readRecipients(p.to);
      if (bad.length) errors.push(`${at}.params.to: "${bad[0].slice(0, 60)}" is not an email address`);
      else if (!addresses.length) errors.push(`${at}: send-email needs "to" — the address it writes to`);
      if (addresses.length > EMAIL_MAX_RECIPIENTS) {
        errors.push(`${at}.params.to has ${addresses.length} addresses; one email goes to at most ${EMAIL_MAX_RECIPIENTS}`);
      }
    }
  }

  if (blank(p.subject)) errors.push(`${at}: send-email needs a "subject"`);
  else if (typeof p.subject !== 'string' && !isValue(p.subject)) errors.push(`${at}.params.subject must be text, a value picked from the run, or a formula`);

  if (p.body !== undefined && typeof p.body !== 'string' && !isValue(p.body)) {
    errors.push(`${at}.params.body must be text, a value picked from the run, or a formula (the "text" formula puts values into words)`);
  }
  if (p.bodyFormat !== undefined && !(EMAIL_BODY_FORMATS as readonly unknown[]).includes(p.bodyFormat)) {
    errors.push(`${at}.params.bodyFormat must be one of ${EMAIL_BODY_FORMATS.join(', ')}`);
  }
  if (p.replyTo !== undefined && p.replyTo !== '' && !isValue(p.replyTo)) {
    if (typeof p.replyTo !== 'string' || !isEmailAddress(p.replyTo.trim())) {
      errors.push(`${at}.params.replyTo "${String(p.replyTo).slice(0, 60)}" is not an email address`);
    }
  }
  return errors;
}
