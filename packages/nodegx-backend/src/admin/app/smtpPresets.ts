/**
 * SMTP provider presets (BMG-010 §3.1, AC1) — a table, not a fetch.
 *
 * A person setting up Gmail, Resend, Postmark, SES, Mailgun or Brevo should
 * not have to look up a host and a port elsewhere. Picking a preset fills
 * host, port and TLS, and says WHICH credential the provider wants (an app
 * password, an API key, a server token) with the link to where it is issued.
 *
 * Everything here is what the provider documents publicly; nothing is
 * fetched, nothing is verified at pick time — *Send test email* is the check.
 * `tests/admin-app/email-signin-views.test.tsx` holds the table's invariants
 * (a port the mailer accepts, TLS iff 465, every host found again by
 * `presetFor`).
 */

export type SmtpPresetId = 'gmail' | 'resend' | 'postmark' | 'ses' | 'mailgun' | 'brevo' | 'other';

export interface SmtpPreset {
  id: SmtpPresetId;
  label: string;
  /** One line under the name. */
  line: string;
  /** The host; for SES a pattern with `{region}`. Empty for *Other*. */
  host: string;
  port: number;
  /** Implicit TLS (port 465). */
  secure: boolean;
  /** What goes in Username — in words. */
  usernameHint: string;
  /** What goes in Password — in words, naming the credential the provider actually wants. */
  passwordHint: string;
  /** Where that credential is issued. Empty for *Other*. */
  credentialUrl: string;
  credentialLabel: string;
}

export const SMTP_PRESETS: SmtpPreset[] = [
  {
    id: 'gmail',
    label: 'Gmail / Google Workspace',
    line: 'A Google account sends the mail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    usernameHint: 'Your full Gmail or Workspace address',
    passwordHint: 'An App password, not your Google password — Google refuses the real one here',
    credentialUrl: 'https://myaccount.google.com/apppasswords',
    credentialLabel: 'Make an App password'
  },
  {
    id: 'resend',
    label: 'Resend',
    line: 'Transactional email, an API key signs in',
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    usernameHint: 'The word resend',
    passwordHint: 'An API key from Resend',
    credentialUrl: 'https://resend.com/api-keys',
    credentialLabel: 'Make an API key'
  },
  {
    id: 'postmark',
    label: 'Postmark',
    line: 'The Server API token is both name and password',
    host: 'smtp.postmarkapp.com',
    port: 587,
    secure: false,
    usernameHint: 'Your Server API token',
    passwordHint: 'The same Server API token again',
    credentialUrl: 'https://account.postmarkapp.com/servers',
    credentialLabel: 'Find the Server API token'
  },
  {
    id: 'ses',
    label: 'Amazon SES',
    line: 'Pick the region your SES lives in',
    host: 'email-smtp.{region}.amazonaws.com',
    port: 587,
    secure: false,
    usernameHint: 'The SMTP user name from SES (not an IAM access key)',
    passwordHint: 'The SMTP password SES made with it',
    credentialUrl: 'https://console.aws.amazon.com/ses/home#/smtp',
    credentialLabel: 'Make SMTP credentials'
  },
  {
    id: 'mailgun',
    label: 'Mailgun',
    line: 'One sending domain, a postmaster login',
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false,
    usernameHint: 'postmaster@ your sending domain',
    passwordHint: 'The SMTP password for that domain',
    credentialUrl: 'https://app.mailgun.com/mailgun-cp/sending/domains',
    credentialLabel: 'Open your sending domains'
  },
  {
    id: 'brevo',
    label: 'Brevo',
    line: 'Formerly Sendinblue',
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    usernameHint: 'The email address you log in to Brevo with',
    passwordHint: 'An SMTP key, not your Brevo password',
    credentialUrl: 'https://app.brevo.com/settings/keys/smtp',
    credentialLabel: 'Make an SMTP key'
  },
  {
    id: 'other',
    label: 'Other',
    line: 'Any SMTP server — type its host and port',
    host: '',
    port: 587,
    secure: false,
    usernameHint: 'Whatever your provider gave you',
    passwordHint: 'Whatever your provider gave you',
    credentialUrl: '',
    credentialLabel: ''
  }
];

/** The SES regions that offer SMTP endpoints, most-used first. */
export const SES_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-north-1',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ca-central-1',
  'sa-east-1'
];

export function presetById(id: string): SmtpPreset {
  return SMTP_PRESETS.find((p) => p.id === id) || SMTP_PRESETS[SMTP_PRESETS.length - 1];
}

/** The host a preset fills in; SES needs its region. */
export function hostFor(preset: SmtpPreset, region?: string): string {
  return preset.host.replace('{region}', region || SES_REGIONS[0]);
}

const SES_HOST = /^email-smtp\.([a-z0-9-]+)\.amazonaws\.com$/;

/** Which preset a stored host belongs to (and, for SES, its region) — so the page opens on the tile that made it. */
export function presetFor(host: string): { preset: SmtpPreset; region?: string } {
  const h = (host || '').trim().toLowerCase();
  const ses = SES_HOST.exec(h);
  if (ses) return { preset: presetById('ses'), region: ses[1] };
  const hit = SMTP_PRESETS.find((p) => p.host && p.host.toLowerCase() === h);
  return { preset: hit || presetById('other') };
}

/** What picking a preset writes into the form. */
export function fillFrom(preset: SmtpPreset, region?: string): { host: string; port: string; secure: boolean } {
  if (preset.id === 'other') return { host: '', port: '', secure: false };
  return { host: hostFor(preset, region), port: String(preset.port), secure: preset.secure };
}
