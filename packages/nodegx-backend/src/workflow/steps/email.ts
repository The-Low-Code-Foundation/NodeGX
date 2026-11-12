/**
 * P132 BWF-007 — *Send an email*: the `send-email` step.
 *
 * It sends through the backend's own SMTP settings (the backend manager's Email page), by the same in-process seam the
 * Send Email node uses (`_noodl_send_email`, service.ts 4.5), so a workflow's email and a function's email are one
 * mailer with one set of settings, one retry and one count on the operator's chart. Out: `{ sent, messageId, to }`.
 *
 * ⚠️ NOTHING SECRET PASSES THROUGH THE STEP
 * ----------------------------------------
 * The workflow engine records a step's input and output unscrubbed (BWF-006's note in `http.ts`). The SMTP password
 * is never a param: the mailer reads it from the backend's secrets when it connects. What the run records is who it
 * wrote to, the subject and the words, which is what a person checking a run wants to see.
 *
 * No SMTP set is a FAILURE with the sentence that says where to set it, so `onError` can catch it and a test run in
 * Studio shows it in words, never a stack.
 *
 * @module nodegx-backend/workflow/steps/email
 */

import type { StepExecContext, StepExecutor } from '../StepExecutor';
import { StepExecutionError } from '../StepExecutor';
import { EMAIL_MAX_RECIPIENTS, isEmailAddress, readRecipients } from './emailParams';
import { resolveValueDeep } from './values';

interface MailSeamResult {
  success: boolean;
  error?: string;
  retried?: boolean;
  messageId?: string;
}

type MailSeam = (r: { to: string[]; subject: string; text: string; html?: string; replyTo?: string }) => Promise<MailSeamResult>;

function asText(v: unknown): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v : typeof v === 'object' ? JSON.stringify(v) : String(v);
}

/** The plain-text twin of a simple HTML body, for a mail program that shows no HTML (and for spam filters). */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class SendEmailStepExecutor implements StepExecutor {
  async execute(ctx: StepExecContext): Promise<Record<string, unknown>> {
    const id = ctx.step.id;
    const p: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(ctx.step.params || {})) p[k] = resolveValueDeep(v, ctx.paramScope ?? ctx.scope);

    const { addresses, bad } = readRecipients(p.to);
    if (bad.length) throw new StepExecutionError(`Step "${id}": "${bad[0].slice(0, 60)}" is not an email address, so no email was sent.`);
    if (!addresses.length) {
      throw new StepExecutionError(`Step "${id}": there was no address to write to (the "To" setting came out empty), so no email was sent.`);
    }
    if (addresses.length > EMAIL_MAX_RECIPIENTS) {
      throw new StepExecutionError(`Step "${id}": ${addresses.length} addresses, and one email goes to at most ${EMAIL_MAX_RECIPIENTS}, so none was sent.`);
    }
    const replyTo = asText(p.replyTo).trim();
    if (replyTo && !isEmailAddress(replyTo)) {
      throw new StepExecutionError(`Step "${id}": the reply-to "${replyTo.slice(0, 60)}" is not an email address, so no email was sent.`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const send = (globalThis as any)._noodl_send_email as MailSeam | undefined;
    if (typeof send !== 'function') {
      throw new StepExecutionError(`Step "${id}": this backend cannot send email (its mailer is not running), so no email was sent.`);
    }
    const body = asText(p.body);
    const html = p.bodyFormat === 'html';
    const subject = asText(p.subject);
    const result = await send({
      to: addresses,
      subject,
      text: html ? htmlToText(body) : body,
      ...(html ? { html: body } : {}),
      ...(replyTo ? { replyTo } : {})
    });
    if (!result.success) {
      throw new StepExecutionError(`Step "${id}": no email was sent. ${result.error || 'The mailer gave no reason.'}${result.retried ? ' (It tried twice.)' : ''}`);
    }
    return { sent: true, messageId: result.messageId ?? null, to: addresses };
  }
}
