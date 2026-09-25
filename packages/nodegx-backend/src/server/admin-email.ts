/**
 * Admin email surface (BAK-002) — the HTTP form of the email subsystem's
 * config + templates, mirroring BAK-003's admin-security.ts shape:
 *
 *   GET  /admin/email/config              full config (never the SMTP password)
 *   PUT  /admin/email/config              update config; optional `smtpPassword` field writes the secret
 *   POST /admin/email/test                send a test email NOW — throws loudly if unconfigured/failed
 *   GET  /admin/email/templates           the effective (default-merged) templates + which are overridden
 *                                         + the variables each may use (BMG-010 AC3)
 *   PUT  /admin/email/templates/:id       set an override for one template
 *   DELETE /admin/email/templates/:id     revert one template to the shipped default
 *   GET  /admin/email/templates/:id/preview[?subject&text&html]  rendered against sample variables; an
 *                                         unsaved draft rides in the query (BMG-010 AC2)
 *
 * All admin-gated by the HttpServer dispatcher. The same surface backs the
 * editor's Email panel section AND the MCP tools — one model, two fronts,
 * per the AI-visibility rule (BAK-002's task doc: "templates must be
 * enumerable/editable via MCP").
 *
 * @module nodegx-backend/server/admin-email
 */

import type { EmailConfigState } from '../email/EmailConfigState';
import { validateEmailConfig } from '../email/EmailConfigState';
import type { Mailer } from '../email/Mailer';
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_IDS,
  EmailTemplate,
  TEMPLATE_VARIABLES,
  TemplateId,
  TemplateVariable,
  isTemplateId,
  mergeTemplate,
  renderTemplate,
  sampleVariables
} from '../email/templates';
import type { RequestContext } from './HttpServer';
import { HttpError, readJSONBody, sendJSON } from './http-util';

/** One row of `GET /admin/email/templates`. */
export interface TemplateEntry {
  id: TemplateId;
  default: EmailTemplate;
  /** The stored override, or null when the shipped default is in force. */
  override: Partial<EmailTemplate> | null;
  /** default merged with override — what actually gets sent. */
  effective: EmailTemplate;
  isOverridden: boolean;
  /** The `{{names}}` this template's sender supplies — what a page may offer as chips (BMG-010 AC3). */
  variables: TemplateVariable[];
}

export interface TemplateListResponse {
  templates: TemplateEntry[];
}

/** `PUT`/`DELETE /admin/email/templates/:id`. */
export interface TemplateMutationResponse {
  success: boolean;
  id: TemplateId;
  effective: EmailTemplate;
  /** DELETE only: whether an override was actually in place. */
  removed?: boolean;
}

/** `GET /admin/email/templates/:id/preview`. */
export interface TemplatePreviewResponse {
  id: TemplateId;
  preview: EmailTemplate;
}

/** `POST /admin/email/test`. `sent` is present when a template was sent (BMG-010 AC2: it equals the preview). */
export interface TestSendResponse {
  success: true;
  retried: boolean;
  baseUrlWarning: boolean;
  template?: TemplateId;
  sent?: EmailTemplate;
}

export class AdminEmailRoutes {
  private readonly emailConfig: EmailConfigState;
  private readonly mailer: Mailer;

  constructor(emailConfig: EmailConfigState, mailer: Mailer) {
    this.emailConfig = emailConfig;
    this.mailer = mailer;
  }

  // ==========================================================================
  // Config
  // ==========================================================================

  getConfig(ctx: RequestContext): void {
    sendJSON(ctx.res, 200, {
      config: this.emailConfig.config,
      hasSmtpPassword: Boolean(this.emailConfig.getSmtpPassword()),
      configured: this.emailConfig.isConfigured(),
      notConfiguredReason: this.emailConfig.isConfigured() ? null : this.emailConfig.notConfiguredReason()
    });
  }

  async putConfig(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const { smtpPassword, config } = body as { smtpPassword?: string; config?: unknown };
    const candidate = (config !== undefined ? config : body) as Record<string, unknown>;
    // smtpPassword never lives in the validated config object — strip it before validating/merging.
    delete candidate.smtpPassword;

    const merged = {
      ...this.emailConfig.config,
      ...candidate,
      smtp: { ...this.emailConfig.config.smtp, ...((candidate.smtp as object) || {}) },
      verification: { ...this.emailConfig.config.verification, ...((candidate.verification as object) || {}) },
      templates: candidate.templates !== undefined ? candidate.templates : this.emailConfig.config.templates
    };
    const errors = validateEmailConfig(merged);
    if (errors.length > 0) {
      throw new HttpError(400, `Invalid email config:\n${errors.map((e) => `- ${e}`).join('\n')}`);
    }
    Object.assign(this.emailConfig.config, merged);
    this.emailConfig.save();

    if (typeof smtpPassword === 'string' && smtpPassword.length > 0) {
      this.emailConfig.setSmtpPassword(smtpPassword);
    }

    sendJSON(ctx.res, 200, {
      success: true,
      config: this.emailConfig.config,
      hasSmtpPassword: Boolean(this.emailConfig.getSmtpPassword()),
      configured: this.emailConfig.isConfigured()
    });
  }

  // ==========================================================================
  // Test send — ADMIN-authenticated, so this throws loudly (no enumeration
  // concern: the caller already holds the admin credential).
  // ==========================================================================

  async testSend(ctx: RequestContext): Promise<void> {
    const body = await readJSONBody(ctx.req);
    const to = String(body.to || '');
    if (!to) throw new HttpError(400, 'Provide "to" — the address to send the test email to.');

    if (!this.emailConfig.isConfigured()) {
      throw new HttpError(503, this.emailConfig.notConfiguredReason());
    }
    const { usedFallback } = this.emailConfig.effectiveBaseUrl('');

    // BMG-010 AC2 — *Send me this*: a template (with an unsaved draft over it),
    // rendered against the SAME samples the preview route uses, so what lands
    // in the inbox is what the preview pane showed. Same route, so the audit
    // action and the read-only refusal it already has cover it.
    if (body.template !== undefined) {
      const id = body.template;
      if (!isTemplateId(id)) {
        throw new HttpError(404, `No such template: ${String(id)}. Known: ${TEMPLATE_IDS.join(', ')}`);
      }
      const rendered = renderTemplate(mergeTemplate(this.emailConfig.effectiveTemplate(id), draftFrom(body)), sampleVariables(id));
      const result = await this.mailer.send({ to, subject: rendered.subject, text: rendered.text, html: rendered.html });
      if (!result.success) {
        throw new HttpError(502, result.error || 'Failed to send the test email.');
      }
      sendJSON(ctx.res, 200, { success: true, retried: Boolean(result.retried), baseUrlWarning: usedFallback, template: id, sent: rendered } satisfies TestSendResponse);
      return;
    }

    const result = await this.mailer.send({
      to,
      subject: 'NodeGX backend: test email',
      text:
        'This is a test email from your NodeGX backend. If you received this, SMTP is configured correctly.\n' +
        (usedFallback ? '\nNote: no baseUrl is set — reset/verify links will use a localhost fallback until you set one.' : '')
    });
    if (!result.success) {
      throw new HttpError(502, result.error || 'Failed to send test email.');
    }
    sendJSON(ctx.res, 200, { success: true, retried: Boolean(result.retried), baseUrlWarning: usedFallback } satisfies TestSendResponse);
  }

  // ==========================================================================
  // Templates
  // ==========================================================================

  getTemplates(ctx: RequestContext): void {
    const templates = TEMPLATE_IDS.map((id) => {
      const override = this.emailConfig.config.templates[id];
      const effective = this.emailConfig.effectiveTemplate(id);
      return { id, default: DEFAULT_TEMPLATES[id], override: override || null, effective, isOverridden: Boolean(override), variables: TEMPLATE_VARIABLES[id] };
    });
    sendJSON(ctx.res, 200, { templates } satisfies TemplateListResponse);
  }

  async putTemplate(ctx: RequestContext): Promise<void> {
    const id = ctx.params.id;
    if (!isTemplateId(id)) {
      throw new HttpError(404, `No such template: ${id}. Known: ${TEMPLATE_IDS.join(', ')}`);
    }
    const body = await readJSONBody(ctx.req);
    const override: Partial<EmailTemplate> = {};
    if (typeof body.subject === 'string') override.subject = body.subject;
    if (typeof body.text === 'string') override.text = body.text;
    if (typeof body.html === 'string') override.html = body.html;

    this.emailConfig.config.templates[id] = override;
    this.emailConfig.save();
    sendJSON(ctx.res, 200, {
      success: true,
      id,
      effective: mergeTemplate(DEFAULT_TEMPLATES[id], override)
    } satisfies TemplateMutationResponse);
  }

  deleteTemplate(ctx: RequestContext): void {
    const id = ctx.params.id;
    if (!isTemplateId(id)) {
      throw new HttpError(404, `No such template: ${id}. Known: ${TEMPLATE_IDS.join(', ')}`);
    }
    const existed = this.emailConfig.config.templates[id] !== undefined;
    delete this.emailConfig.config.templates[id];
    this.emailConfig.save();
    sendJSON(ctx.res, 200, {
      success: true,
      id,
      removed: existed,
      effective: DEFAULT_TEMPLATES[id]
    } satisfies TemplateMutationResponse);
  }

  /**
   * Preview a template rendered against its sample variables — harmless, nothing is sent.
   * An unsaved draft rides in the query (`?subject=&text=&html=`, BMG-010 AC2): a field given
   * replaces the effective one under the same rule a save uses (blank falls back), so the
   * pane shows exactly what *Save* would make the sender send.
   */
  previewTemplate(ctx: RequestContext): void {
    const id = ctx.params.id;
    if (!isTemplateId(id)) {
      throw new HttpError(404, `No such template: ${id}. Known: ${TEMPLATE_IDS.join(', ')}`);
    }
    const rendered = renderTemplate(mergeTemplate(this.emailConfig.effectiveTemplate(id), draftFrom(ctx.query)), sampleVariables(id));
    sendJSON(ctx.res, 200, { id, preview: rendered } satisfies TemplatePreviewResponse);
  }
}

/** The template fields a request carries (a query or a body): only the ones given, only as strings. */
function draftFrom(source: Record<string, unknown>): Partial<EmailTemplate> {
  const draft: Partial<EmailTemplate> = {};
  if (typeof source.subject === 'string') draft.subject = source.subject;
  if (typeof source.text === 'string') draft.text = source.text;
  if (typeof source.html === 'string') draft.html = source.html;
  return draft;
}
