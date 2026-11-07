/**
 * P135 ODT-001 — `cloudflare_sign_in`: the person signs in to THEIR Cloudflare account from Claude Desktop, with no
 * terminal. The connector opens Cloudflare's consent page in their browser (`openInBrowser`, the mechanism Studio and
 * the mini editor already use), takes Cloudflare's answer on a loopback address, and keeps the token in
 * `~/.nodegx/cloudflare/sign-in.json` (0600). The flow, the file and the refresh are
 * `nodegx-backend/cloudflare/signIn.ts`; this file is the tool around them and nothing else.
 *
 * ## Why the call returns before the person has clicked
 *
 * A person reads a consent page; a client's tool call has a timeout. So the call waits a short while
 * ({@link WAIT_MS}) and then answers "a page opened: click Allow" while the address keeps listening (ten minutes).
 * The next call (any action) finds the finished sign-in, or the page still waiting. Nothing about the person's answer
 * is lost by answering early.
 *
 * ## What it never does
 *
 * Return a token. Every field below is safe to show the person; the scopes are Cloudflare's names for what was
 * ALLOWED, and `cannot` says in words what the app will not be able to do without the rest.
 *
 * Deferred, in the `project` group beside `deploy_to_vm` (0 resident tokens: the group's count is the only resident
 * trace). Write-gated: it writes a file outside the project, and a read-only server writes nowhere.
 *
 * @module noodl-mcp/tools/cloudflareSignIn
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  cloudflareAccessToken,
  cloudflareClientId,
  missingScopes,
  oauthSettings,
  readSignIn,
  signOut,
  startSignIn,
  summarize,
  SignInError,
  type CloudflareSignIn,
  type SignInFlow
} from '../../../nodegx-backend/cloudflare/signIn';
import { ToolError } from '../errors';
import { openInBrowser } from './openStudio';
import { guarded, jsonResult } from './util';

/** How long one call waits for the person's click before answering "click Allow". */
const WAIT_MS = 45_000;

/** What each permission lets NodeGX do, in the person's words (for the ones Cloudflare was not asked or did not allow). */
const WHAT_IT_DOES: Record<string, string> = {
  'workers-scripts.edit': 'put the app online',
  'workers-r2.write': "store the app's files",
  'workers-kv-storage.write': 'remember when it last emailed an alert',
  'workers-routes.write': 'put the app on its own domain',
  'zone.read': 'put the app on its own domain',
  'dns.write': 'put the app on its own domain',
  'registrar-domains.admin': 'buy a domain',
  'email-sending.write': 'send email from the app',
  'account-settings.read': 'find the account to use',
  'user-details.read': 'say whose account it is'
};

const schema = {
  action: z
    .enum(['sign_in', 'status', 'sign_out'])
    .optional()
    .describe("'sign_in' (default) opens Cloudflare's page; 'status' only reports; 'sign_out' forgets the sign-in on this computer.")
};

let pending: { flow: SignInFlow; opened: boolean } | null = null;

function cannot(s: CloudflareSignIn): string[] {
  return [...new Set(missingScopes(s).map((m) => WHAT_IT_DOES[m] ?? m))];
}

function signedInAnswer(s: CloudflareSignIn, already: boolean) {
  const cant = cannot(s);
  return {
    ...summarize(s),
    cannot: cant,
    say:
      (already ? 'You are already signed in to Cloudflare on this computer.' : 'You are signed in to Cloudflare.') +
      (cant.length ? ` Cloudflare did not allow NodeGX to ${cant.join(', ')}; signing in again lets you allow it.` : '')
  };
}

/** Waits for the flow up to `ms`; `null` when it is still waiting for the person. */
async function waitFor(flow: SignInFlow, ms: number): Promise<CloudflareSignIn | null> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<null>((r) => (timer = setTimeout(() => r(null), ms)));
  try {
    return await Promise.race([flow.done, late]);
  } finally {
    clearTimeout(timer);
  }
}

function waitingAnswer(p: { flow: SignInFlow; opened: boolean }) {
  return {
    signedIn: false,
    waiting: true,
    page: p.flow.url,
    say: p.opened
      ? 'A Cloudflare page opened in your browser: check what it asks for, click Allow, then tell me when it is done.'
      : 'Open this Cloudflare page in your browser, click Allow, then tell me when it is done: ' + p.flow.url
  };
}

function asToolError(e: unknown): ToolError {
  if (e instanceof SignInError) return new ToolError(e.code === 'port-busy' ? 'conflict' : 'io-error', e.message, { reason: e.code });
  return new ToolError('io-error', `The Cloudflare sign-in failed: ${(e as Error).message}`);
}

export async function cloudflareSignIn(action: 'sign_in' | 'status' | 'sign_out' = 'sign_in', waitMs = WAIT_MS) {
  // A sign-in this process started earlier: its outcome is the answer to whatever is asked next.
  if (pending && action !== 'sign_out') {
    const p = pending;
    try {
      const s = await waitFor(p.flow, action === 'status' ? 0 : waitMs);
      if (!s) return waitingAnswer(p);
      pending = null;
      return signedInAnswer(s, false);
    } catch (e) {
      pending = null;
      if (action === 'status') return { signedIn: false, say: (e as Error).message };
      throw asToolError(e);
    }
  }

  if (action === 'sign_out') {
    pending?.flow.cancel();
    pending = null;
    const r = await signOut(oauthSettings());
    return {
      signedIn: false,
      say: r.wasSignedIn
        ? 'NodeGX has forgotten your Cloudflare sign-in on this computer' +
          (r.revoked ? ' and Cloudflare has cancelled it.' : '. To cancel it at Cloudflare too: My Profile, Manage OAuth authorizations.')
        : 'You were not signed in to Cloudflare on this computer.'
    };
  }

  // Already signed in and still usable (renewed here if it was about to run out).
  const existing = readSignIn();
  if (existing) {
    try {
      if (await cloudflareAccessToken(oauthSettings())) return signedInAnswer(readSignIn() ?? existing, true);
    } catch (e) {
      if (action === 'status') return { signedIn: false, say: (e as Error).message };
      // Expired beyond renewal: fall through to a fresh sign-in.
    }
  }
  if (action === 'status') return { signedIn: false, say: 'You are not signed in to Cloudflare on this computer.' };

  const clientId = cloudflareClientId();
  if (!clientId) {
    throw new ToolError(
      'invalid-argument',
      'Signing in to Cloudflare from here is not switched on in this version of NodeGX yet. The app can still go online from a terminal.',
      { reason: 'not-configured' }
    );
  }
  const settings = oauthSettings();
  let flow: SignInFlow;
  try {
    flow = await startSignIn({ clientId, ...settings });
  } catch (e) {
    throw asToolError(e);
  }
  const p = { flow, opened: openInBrowser(flow.url) };
  pending = p;
  try {
    const s = await waitFor(flow, waitMs);
    if (!s) return waitingAnswer(p);
    pending = null;
    return signedInAnswer(s, false);
  } catch (e) {
    pending = null;
    throw asToolError(e);
  }
}

/** For tests: forget a flow this process started. */
export function resetCloudflareSignIn(): void {
  pending?.flow.cancel();
  pending = null;
}

export function registerCloudflareSignInTools(server: McpServer): void {
  server.registerTool(
    'cloudflare_sign_in',
    {
      title: 'Sign in to Cloudflare',
      description:
        "Sign the person in to their own Cloudflare account so the app can go online there: opens Cloudflare's page " +
        'in their browser, they click Allow, and the sign-in is kept on this computer (never in the project, never ' +
        "shown). Tell them a Cloudflare page opened. 'status' reports; 'sign_out' forgets it.",
      inputSchema: schema
    },
    async (args: { action?: 'sign_in' | 'status' | 'sign_out' }) =>
      guarded(async (a: { action?: 'sign_in' | 'status' | 'sign_out' }) => {
        const wait = Number(process.env.NODEGX_CF_SIGNIN_WAIT_MS);
        return jsonResult(await cloudflareSignIn(a.action, Number.isFinite(wait) && wait >= 0 ? wait : WAIT_MS));
      })(args)
  );
}
