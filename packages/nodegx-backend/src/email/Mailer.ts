/**
 * Mailer (BAK-002) — the one place this package speaks SMTP, via nodemailer
 * (the "boring, maintained" dependency the task calls for).
 *
 * Loud-failure doctrine (RUN-004, extended to email by this task): with no
 * SMTP configured, `send()` never queues, never drops silently, and never
 * pretends success — it resolves `{ success: false, error }` with an
 * ACTIONABLE message, which is what the flows, the Send Email node, and the
 * panel's test-send button all surface verbatim. Sends that ARE configured
 * are synchronous from the caller's point of view (`await`ed) with exactly
 * ONE documented retry on failure — no background queue pretending
 * otherwise (out of scope per the spec).
 *
 * @module nodegx-backend/email/Mailer
 */

import type { EmailConfigState } from './EmailConfigState';
import { recordEmailSend } from '../ops/metrics';

// nodemailer is untyped-by-require here on purpose: it ships its own .d.ts,
// but importing it as ESM default vs. the CJS module this package's other
// third-party deps use (see @cloud-runtime's require() pattern) is kept
// consistent with the rest of the codebase's plain-require style.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

export interface SendEmailRequest {
  /** One address, or several (P132 BWF-007: a workflow's Send an email step sends one email to a list). */
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** Where an answer goes, when it is not the "from" address (P132 BWF-007). */
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: string;
  /** True when the first attempt failed and the documented retry ran (whether or not it then succeeded). */
  retried?: boolean;
  /** The SMTP server's id for the message, when it gave one (P132 BWF-007: a workflow step hands it on). */
  messageId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transport = { sendMail(opts: Record<string, unknown>): Promise<any> };

export class Mailer {
  private readonly config: EmailConfigState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transportOverride: Transport | null = null;

  constructor(config: EmailConfigState) {
    this.config = config;
  }

  /** Test-only seam: inject a fake transport instead of a real nodemailer one. */
  setTransportForTesting(transport: Transport | null): void {
    this.transportOverride = transport;
  }

  private buildTransport(): Transport {
    if (this.transportOverride) return this.transportOverride;
    const { smtp } = this.config.config;
    return nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.username ? { user: smtp.username, pass: this.config.getSmtpPassword() } : undefined
    });
  }

  /**
   * Send one email. Resolves — never rejects — with a `SendEmailResult`, so
   * every caller (HTTP routes, the Send Email node, the test-send admin
   * route) gets the same loud-but-safe shape instead of having to catch.
   */
  async send(req: SendEmailRequest): Promise<SendEmailResult> {
    if (!this.config.isConfigured()) {
      // Counted as a failure: from an operator's chart, "SMTP was never
      // configured" and "SMTP is refusing" both mean mail is not going out.
      recordEmailSend(false);
      return { success: false, error: this.config.notConfiguredReason() };
    }

    const { fromAddress, fromName } = this.config.config;
    const from = fromName ? `"${fromName}" <${fromAddress}>` : fromAddress;
    const mailOptions: Record<string, unknown> = { from, to: req.to, subject: req.subject, text: req.text, html: req.html };
    if (req.replyTo) mailOptions.replyTo = req.replyTo;

    const first = await this.attempt(mailOptions);
    if (first.success) {
      recordEmailSend(true);
      return first;
    }

    // Exactly one documented retry — the flows must tolerate slow/flaky SMTP
    // without wedging the request, but this is not a queue: two tries, then
    // an honest failure.
    const second = await this.attempt(mailOptions);
    recordEmailSend(second.success);
    return { ...second, retried: true };
  }

  private async attempt(mailOptions: Record<string, unknown>): Promise<SendEmailResult> {
    try {
      const transport = this.buildTransport();
      const info = await transport.sendMail(mailOptions);
      return info && typeof info.messageId === 'string' ? { success: true, messageId: info.messageId } : { success: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `Failed to send email via SMTP: ${message}` };
    }
  }
}
