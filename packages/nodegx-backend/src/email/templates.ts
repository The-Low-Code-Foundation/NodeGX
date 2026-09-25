/**
 * The `{{variable}}` template system (BAK-002): subject + text + HTML bodies,
 * sensible shipped defaults, per-backend overrides. Deliberately small — a
 * textarea with variables is v1 (out of scope: a rich template editor UI).
 *
 * @module nodegx-backend/email/templates
 */

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

/** Every template this backend ships. Also the enumerable set the MCP/panel edit. */
export type TemplateId = 'passwordReset' | 'verifyEmail' | 'magicLink';

export const TEMPLATE_IDS: TemplateId[] = ['passwordReset', 'verifyEmail', 'magicLink'];

/**
 * Shipped defaults. `{{appName}}`, `{{resetUrl}}` / `{{verifyUrl}}`, and
 * `{{username}}` are always supplied by the caller (see render() below);
 * overrides may use any subset of them.
 */
export const DEFAULT_TEMPLATES: Record<TemplateId, EmailTemplate> = {
  passwordReset: {
    subject: 'Reset your password for {{appName}}',
    text:
      'Hi {{username}},\n\n' +
      'We received a request to reset your password for {{appName}}. Open the link below to choose a new one:\n\n' +
      '{{resetUrl}}\n\n' +
      'This link expires in {{expiresIn}} and can only be used once. ' +
      "If you didn't request this, you can safely ignore this email — your password will not change.\n",
    html:
      '<p>Hi {{username}},</p>' +
      '<p>We received a request to reset your password for <strong>{{appName}}</strong>. ' +
      'Click the link below to choose a new one:</p>' +
      '<p><a href="{{resetUrl}}">{{resetUrl}}</a></p>' +
      '<p>This link expires in {{expiresIn}} and can only be used once. ' +
      "If you didn't request this, you can safely ignore this email — your password will not change.</p>"
  },
  verifyEmail: {
    subject: 'Verify your email for {{appName}}',
    text:
      'Hi {{username}},\n\n' +
      'Please confirm your email address for {{appName}} by opening the link below:\n\n' +
      '{{verifyUrl}}\n\n' +
      "If you didn't create this account, you can ignore this email.\n",
    html:
      '<p>Hi {{username}},</p>' +
      '<p>Please confirm your email address for <strong>{{appName}}</strong> by clicking the link below:</p>' +
      '<p><a href="{{verifyUrl}}">{{verifyUrl}}</a></p>' +
      "<p>If you didn't create this account, you can ignore this email.</p>"
  },
  /**
   * BAK-004 passwordless sign-in. Note what this one does NOT say: no username
   * (the link may be the recipient's first contact with the backend, before any
   * account exists) and an explicit warning, because unlike a reset link this
   * one signs in whoever presses the button it opens — a forwarded magic link
   * is a handed-over account. (Opening it alone signs no one in: HLT-015.)
   */
  magicLink: {
    subject: 'Your sign-in link for {{appName}}',
    text:
      'Open the link below to sign in to {{appName}}:\n\n' +
      '{{magicLinkUrl}}\n\n' +
      'This link expires in {{expiresIn}} and can only be used once. Anyone who has it can sign in with it, so ' +
      "don't forward it. If you didn't ask to sign in, you can ignore this email.\n",
    html:
      '<p>Open the link below to sign in to <strong>{{appName}}</strong>:</p>' +
      '<p><a href="{{magicLinkUrl}}">Sign in to {{appName}}</a></p>' +
      '<p>This link expires in {{expiresIn}} and can only be used once. Anyone who has it can sign in with it, so ' +
      "don't forward it. If you didn't ask to sign in, you can ignore this email.</p>"
  }
};

/** `{{name}}` interpolation. Unknown variables render as an empty string, not the raw token. */
export function interpolate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
    Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : ''
  );
}

/** Render a template (defaults merged with any per-backend override) against a variable set. */
export function renderTemplate(template: EmailTemplate, variables: Record<string, string>): EmailTemplate {
  return {
    subject: interpolate(template.subject, variables),
    text: interpolate(template.text, variables),
    html: interpolate(template.html, variables)
  };
}

/** A partial override merged over one default template — blank fields fall back to the default. */
export function mergeTemplate(base: EmailTemplate, override?: Partial<EmailTemplate>): EmailTemplate {
  if (!override) return base;
  return {
    subject: override.subject && override.subject.trim() ? override.subject : base.subject,
    text: override.text && override.text.trim() ? override.text : base.text,
    html: override.html && override.html.trim() ? override.html : base.html
  };
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as string[]).includes(value);
}

// ---------------------------------------------------------------- variables --

/**
 * One `{{name}}` a template may use, as a page offers it (BMG-010 AC3).
 *
 * THE list is here, beside the engine, because the page must never invent a
 * name: a chip for a name the sender does not supply would render as an empty
 * string (see `interpolate`). Each template's list is what its real caller
 * passes — `email-routes.ts` (reset, verify), `oauth-routes.ts` (magic link) —
 * and `bmg-010-email-signin.test.ts` pins the names per template. The Send
 * Email node (`service.ts`) may add its own on top; those are the node's, not
 * the template's, and are not offered here.
 */
export interface TemplateVariable {
  /** The name inside the braces. */
  name: string;
  /** What a person reads on the chip. */
  label: string;
  /** What the preview and a test send render it as. */
  sample: string;
}

const APP_NAME: TemplateVariable = { name: 'appName', label: 'App name', sample: 'Your App' };
const USERNAME: TemplateVariable = { name: 'username', label: 'Username', sample: 'jane.doe' };

export const TEMPLATE_VARIABLES: Record<TemplateId, TemplateVariable[]> = {
  passwordReset: [
    APP_NAME,
    USERNAME,
    { name: 'resetUrl', label: 'Reset link', sample: 'https://example.com/apps/demo/request_password_reset?token=SAMPLE&username=jane.doe' },
    { name: 'expiresIn', label: 'How long the link lasts', sample: '1 hour' }
  ],
  verifyEmail: [
    APP_NAME,
    USERNAME,
    { name: 'verifyUrl', label: 'Verification link', sample: 'https://example.com/apps/demo/verify_email?username=jane.doe&token=SAMPLE' }
  ],
  magicLink: [
    APP_NAME,
    { name: 'magicLinkUrl', label: 'Sign-in link', sample: 'https://example.com/auth/magic-link/callback?token=SAMPLE' },
    { name: 'expiresIn', label: 'How long the link lasts', sample: '15 minutes' }
  ]
};

/** The sample values a preview and a test send render with — the same set, so the two cannot differ (AC2). */
export function sampleVariables(id: TemplateId): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of TEMPLATE_VARIABLES[id]) out[v.name] = v.sample;
  return out;
}

/** Every `{{name}}` a piece of template text uses, once each, in order of first use. */
export function templateTokens(text: string): string[] {
  const seen: string[] = [];
  text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    if (!seen.includes(key)) seen.push(key);
    return '';
  });
  return seen;
}
