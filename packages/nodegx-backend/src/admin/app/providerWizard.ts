/**
 * The sign-in provider wizard's model (BMG-010 §3.2) — pure, over the presets
 * the backend answers on `GET /admin/auth`.
 *
 * Three steps: WHICH (a tile), REGISTER WITH THEM (the callback URL first, in
 * words for that provider), PASTE BACK (client id, secret, what we may read as
 * boxes). Nobody types a scope: a box is a GROUP of the preset's scopes with
 * a sentence, and the ones sign-in needs are ticked and locked.
 *
 * AC4 is `wizardPayload`: the record it sends for Google is the record the
 * old nine-field modal sent for the *google* preset.
 */

export type Tile = 'google' | 'github' | 'oidc';

export interface Preset {
  kind?: 'oidc' | 'github';
  displayName?: string;
  issuer?: string;
  scopes?: string[];
  consoleUrl?: string;
  note?: string;
}

export interface TileDef {
  id: Tile;
  label: string;
  line: string;
  icon: string;
}

/** The tiles, in the order shown. Only presets the backend has (`auth/model.ts` PROVIDER_PRESETS): google, github, oidc. */
export const TILES: TileDef[] = [
  { id: 'google', label: 'Google', line: 'Sign in with a Google account', icon: 'G' },
  { id: 'github', label: 'GitHub', line: 'Sign in with a GitHub account', icon: '⌥' },
  { id: 'oidc', label: 'Another OpenID Connect provider', line: 'Okta, Auth0, Keycloak, Entra ID, GitLab, Authentik…', icon: '⚿' }
];

// ------------------------------------------------------------------ scopes --

/** A box on step 3: one or more scopes with a sentence. Locked = sign-in cannot work without it. */
export interface ScopeBox {
  id: string;
  scopes: string[];
  label: string;
  locked: boolean;
}

/**
 * The groups a preset's scopes fall into. `openid` alone is not a box: it is
 * how OIDC works, not something a person grants, so it rides with email.
 */
const GROUPS: Array<{ id: string; scopes: string[]; label: string; locked: boolean }> = [
  { id: 'identity', scopes: ['openid', 'email'], label: 'Who they are and their email address (needed to sign in)', locked: true },
  { id: 'profile', scopes: ['profile'], label: 'Their name and profile picture', locked: false },
  { id: 'github-identity', scopes: ['read:user', 'user:email'], label: 'Their GitHub account and its email address (needed to sign in)', locked: true }
];

/**
 * The boxes for a scope list — the preset's, or a saved provider's. A scope
 * no group knows becomes its own optional box under its raw name, so a
 * provider written by hand (or by an agent) shows everything it asks for and
 * a save never drops a scope silently.
 */
export function scopeBoxes(scopes: string[]): ScopeBox[] {
  const boxes: ScopeBox[] = [];
  const claimed = new Set<string>();
  for (const g of GROUPS) {
    const present = g.scopes.filter((s) => scopes.includes(s));
    if (!present.length) continue;
    // A group shows only the scopes the list has (an OIDC preset without `email` still gets the identity box).
    boxes.push({ id: g.id, scopes: present, label: g.label, locked: g.locked });
    present.forEach((s) => claimed.add(s));
  }
  for (const s of scopes) {
    if (claimed.has(s)) continue;
    claimed.add(s);
    boxes.push({ id: 'raw:' + s, scopes: [s], label: s, locked: false });
  }
  return boxes;
}

/** The scopes a save sends: the ticked boxes' scopes, in the order the list gave them. */
export function scopesFrom(scopes: string[], boxes: ScopeBox[], ticked: string[]): string[] {
  const chosen = new Set<string>();
  for (const b of boxes) if (b.locked || ticked.includes(b.id)) b.scopes.forEach((s) => chosen.add(s));
  return scopes.filter((s) => chosen.has(s));
}

// ------------------------------------------------------------------- draft --

export interface WizardDraft {
  tile: Tile;
  displayName: string;
  /** OIDC only. */
  issuer: string;
  /** The id in the callback URL; derived unless edited under *advanced*. */
  id: string;
  idEdited: boolean;
  clientId: string;
  clientSecret: string;
  /** Box ids ticked (locked boxes count whether or not they are here). */
  ticked: string[];
  enabled: boolean;
  allowSignup: boolean;
}

/** The server's rule for a provider id (`auth/model.ts` ID_PATTERN) and the ids it reserves. */
export const ID_RULE = /^[a-z0-9][a-z0-9-]{0,31}$/;
export const RESERVED_IDS = ['exchange', 'magic-link', 'callback', 'start', 'providers'];

/** "Okta (work)" → "okta-work": the id a name suggests. */
export function providerIdFrom(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');
}

/** The id the draft will save under: the tile's for Google and GitHub, the name's for OIDC, unless a person edited it. */
export function draftId(d: WizardDraft): string {
  if (d.idEdited) return d.id.trim();
  if (d.tile !== 'oidc') return d.tile;
  return providerIdFrom(d.displayName);
}

export function idProblem(id: string, taken: string[]): string | null {
  if (!id) return 'The provider needs an id — it is the part of the callback URL that names it.';
  if (!ID_RULE.test(id)) return 'An id is lowercase letters, digits and dashes, up to 32 characters, starting with a letter or digit.';
  if (RESERVED_IDS.includes(id)) return '“' + id + '” is a reserved word on this backend. Pick another id.';
  if (taken.includes(id)) return 'There is already a provider called ' + id + '.';
  return null;
}

/** A fresh draft for a tile, from its preset: every optional box ticked (what the preset asks for). */
export function draftFor(tile: Tile, preset: Preset | undefined): WizardDraft {
  const boxes = scopeBoxes((preset && preset.scopes) || []);
  return {
    tile,
    displayName: tile === 'oidc' ? '' : (preset && preset.displayName) || tile,
    issuer: tile === 'oidc' ? '' : (preset && preset.issuer) || '',
    id: '',
    idEdited: false,
    clientId: '',
    clientSecret: '',
    ticked: boxes.filter((b) => !b.locked).map((b) => b.id),
    enabled: true,
    allowSignup: true
  };
}

export interface SavedProvider {
  id: string;
  kind?: string;
  displayName?: string;
  issuer?: string;
  clientId?: string;
  hasClientSecret?: boolean;
  scopes?: string[];
  enabled?: boolean;
  allowSignup?: boolean;
  ready?: boolean;
  notReadyReason?: string | null;
  callbackUrl?: string;
}

/** Which tile a saved provider came from: GitHub by kind, Google by issuer, otherwise another OIDC provider. */
export function tileOf(p: SavedProvider, presets: Record<string, Preset>): Tile {
  if (p.kind === 'github') return 'github';
  const google = presets.google;
  if (google && p.issuer && p.issuer === google.issuer) return 'google';
  return 'oidc';
}

/** A draft over a saved provider — the wizard's edit path opens on step 3 with this. */
export function draftFrom(p: SavedProvider, presets: Record<string, Preset>): WizardDraft {
  const tile = tileOf(p, presets);
  const scopes = p.scopes || [];
  const boxes = scopeBoxes(scopes);
  return {
    tile,
    displayName: p.displayName || '',
    issuer: p.issuer || '',
    id: p.id,
    idEdited: true,
    clientId: p.clientId || '',
    clientSecret: '',
    ticked: boxes.filter((b) => !b.locked).map((b) => b.id),
    enabled: p.enabled !== false,
    allowSignup: p.allowSignup !== false
  };
}

/** The scope list a draft's boxes are drawn over: the preset's for a new provider, the saved list for an edit. */
export function scopeListFor(d: WizardDraft, preset: Preset | undefined, existing: SavedProvider | null): string[] {
  if (existing && existing.scopes && existing.scopes.length) return existing.scopes;
  return (preset && preset.scopes) || [];
}

/**
 * What `PUT /admin/auth/providers/:id` is sent (AC4). For a new Google provider
 * this is byte-for-byte the old modal's payload: preset, displayName, issuer,
 * clientId, scopes as the preset's array, enabled, allowSignup, and the
 * secret only when one was typed.
 */
export function wizardPayload(d: WizardDraft, preset: Preset | undefined, existing: SavedProvider | null): Record<string, unknown> {
  const scopes = scopeListFor(d, preset, existing);
  const payload: Record<string, unknown> = {
    displayName: d.displayName.trim(),
    issuer: d.tile === 'github' ? '' : d.issuer.trim(),
    clientId: d.clientId.trim(),
    scopes: scopesFrom(scopes, scopeBoxes(scopes), d.ticked),
    enabled: d.enabled,
    allowSignup: d.allowSignup
  };
  payload.preset = d.tile;
  if (d.clientSecret) payload.clientSecret = d.clientSecret;
  return payload;
}

/** Why step 3 cannot save yet, in a sentence; null when it can. */
export function draftProblem(d: WizardDraft, existing: SavedProvider | null, taken: string[]): string | null {
  if (!d.displayName.trim()) return 'Give the sign-in button a label — what it says to your users.';
  if (d.tile === 'oidc') {
    const issuer = d.issuer.trim();
    if (!issuer) return 'The issuer URL is where this provider publishes its OpenID settings — it is on their developer page.';
    if (!/^https?:\/\/[^\s/]+/.test(issuer)) return 'The issuer is an https:// URL, e.g. https://login.example.com.';
  }
  if (!existing) {
    const p = idProblem(draftId(d), taken);
    if (p) return p;
  }
  if (!d.clientId.trim()) return 'Paste the client id from step 2.';
  if (!existing && !d.clientSecret) return 'Paste the client secret from step 2.';
  return null;
}

// -------------------------------------------------------------- the words --

/** Step 2's instructions for a tile, in the provider's own menu words. */
export function registerSteps(tile: Tile): string[] {
  if (tile === 'google') {
    return [
      'Open Google Cloud → APIs & Services → Credentials.',
      'Create credentials → OAuth client ID → application type Web application.',
      'Under Authorised redirect URIs, press Add URI and paste the callback URL above.',
      'Press Create and keep the Client ID and Client secret it shows for step 3.'
    ];
  }
  if (tile === 'github') {
    return [
      'Open GitHub → Settings → Developer settings → OAuth Apps (an OAuth App, not a GitHub App).',
      'Press New OAuth App and give it your app’s name and home page.',
      'Paste the callback URL above into Authorization callback URL, then Register.',
      'Press Generate a new client secret and keep the Client ID and the secret for step 3.'
    ];
  }
  return [
    'In your provider’s admin console make a new application of the OpenID Connect / OAuth 2 web kind.',
    'Paste the callback URL above where it asks for the redirect URI (it may say sign-in redirect or callback).',
    'Allow the authorization code flow; PKCE is used, so a client secret is still required by most providers.',
    'Keep the Client ID and Client secret it shows for step 3.'
  ];
}

/** Which step a not-ready provider is missing, for the table. Derived from the record, not from the reason's words. */
export function stepMissing(p: SavedProvider): string | null {
  if (p.ready) return null;
  if (p.kind !== 'github' && !(p.issuer || '').trim()) return 'Step 1: the issuer URL';
  if (!(p.clientId || '').trim()) return 'Step 3: the client id';
  if (!p.hasClientSecret) return 'Step 3: the client secret';
  return null;
}

// ----------------------------------------------------------------- origins --

/**
 * *Where your app lives* (§3.2): an origin chip. The server accepts any
 * absolute http(s) origin; the page is stricter about plain http, because an
 * http:// origin that is not this machine hands the sign-in result to anyone
 * on the path. What is kept is the ORIGIN (scheme, host, port) — a pasted
 * page URL loses its path, which is what the server matches on anyway.
 */
export function originProblem(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Type an origin.';
  if (!/^https?:\/\//i.test(t)) {
    return 'An origin starts with https:// (or http://localhost while you develop) — e.g. https://' + t.replace(/^\/+/, '').split('/')[0];
  }
  let url: URL;
  try {
    url = new URL(t);
  } catch {
    return 'That is not a URL this browser can read.';
  }
  if (!url.hostname) return 'An origin needs a host, e.g. https://app.example.com.';
  if (url.protocol === 'http:' && !isLoopback(url.hostname)) {
    return 'Plain http:// is only allowed for localhost — anywhere else the sign-in result would travel unencrypted. Use https://.';
  }
  return null;
}

function isLoopback(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
}

/** The chip's value: the origin alone. */
export function normaliseOrigin(text: string): string {
  try {
    return new URL(text.trim()).origin;
  } catch {
    return text.trim();
  }
}
