/**
 * UNI-001 E1 — how the editor gets a session, and the only place it negotiates for one.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 THE DEVICE FLOW, AND IT IS NOT A STYLE CHOICE. Two sentences in UNI-001's own scope
 * eliminate every other desktop OAuth pattern:
 *
 *     "A sign-in affordance in the launcher … using the system browser for the OAuth dance
 *      — no embedded webview credential entry."
 *     "All platform traffic is editor-outbound HTTPS to the platform API. No listener is
 *      opened."
 *
 * A loopback redirect (`http://127.0.0.1:<port>/callback`) is a listener. A `nodegx://`
 * protocol handler is not, but it needs an OS registration that a dev build, a portable build
 * and a second install all fight over — and whichever copy the OS picks receives a URL with a
 * live credential in it. What is left is: ask for a pair of codes, open the browser at a page
 * the person signs into normally, and POLL. Every hop here is editor-outbound.
 *
 * The platform end is `src/lib/devicepairing.ts` and `0010_uni001_device_authorizations.sql`
 * in `nodegx-community`; the migration carries the two-code security argument.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * ⚠️ EVERYTHING EXTERNAL IS INJECTED — `fetch`, the browser opener, the clock, the store.
 * Not for purity: this checkout's jest runner has no DOM, no React and no network, so a
 * module that reached for `globalThis.fetch` and `platform.openExternal` directly could only
 * be read, never run. What the suite drives is the same code the editor runs.
 *
 * 🔴 WHAT A GREEN SUITE HERE DOES NOT PROVE: that the editor's dialog calls any of it, and
 * that a real `community.nodegx.io` answers these routes. The first is a source-analysis
 * assertion (`base-dialog/measuring-copy.test.ts` is the precedent for the shape); the second
 * is E9's smoke drive on the deployed box, and nothing in this repository substitutes for it.
 *
 * @module models/community/communitysignin
 */

import { JSONStorage } from '@noodl/platform';

import { COMMUNITY_URL } from './communityorigin';
import {
  clearCommunitySession,
  readCommunitySession,
  writeCommunitySession,
  type CommunitySession,
  type SessionStore,
  type WritableSessionStore
} from './communitysession';

/**
 * What the caller shows while this is happening.
 *
 * 🔴 `waiting` CARRIES THE CODE, and that is the whole reason this is a progress callback
 * rather than a promise the caller awaits in silence. The user has to read eight characters
 * off the editor and type them into a browser; a flow that only reports its outcome would
 * leave them with a spinner and nothing to type.
 */
export type SignInProgress =
  | { phase: 'starting' }
  | { phase: 'waiting'; userCode: string; verificationUri: string }
  | { phase: 'signed-in'; handle?: string };

/**
 * ⚠️ FOUR OUTCOMES AND `cancelled` IS ONE OF THEM. A person who closes the dialog has not
 * failed at anything, and reporting it as an error would put a red message on a deliberate
 * act — the same distinction `Write`'s `unauthenticated` makes in `communityapi.ts`.
 */
export type SignInResult =
  | { outcome: 'signed-in'; session: CommunitySession }
  | { outcome: 'expired' }
  | { outcome: 'cancelled' }
  | { outcome: 'failed'; detail: string };

export type SignInDeps = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Opens the system browser. The editor passes `platform.openExternal`. */
  openExternal?: (url: string) => void;
  /** Injected so a spec does not wait fifteen real minutes. */
  wait?: (ms: number) => Promise<void>;
  /** Milliseconds since the epoch. Injected for the same reason. */
  now?: () => number;
  store?: WritableSessionStore;
  /** Returns true when the caller has given up — a closed dialog, a cancelled button. */
  isCancelled?: () => boolean;
};

type BeginResponse = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
};

type PollResponse =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'ready'; token: string; handle: string; expiresAt: string };

const DEFAULT_INTERVAL_SECONDS = 5;
const DEFAULT_EXPIRY_SECONDS = 15 * 60;

/**
 * Runs the whole dance and stores the session on success.
 *
 * ⚠️ THE CODE GOES IN THE URL WE OPEN, and the user still sees it in the editor. Prefilling
 * the browser field is the difference between "click the button" and "read eight characters
 * off one window and type them into another", and showing it anyway is what saves the person
 * whose browser opened on a different profile, or not at all.
 */
export async function signIntoCommunity(
  onProgress: (progress: SignInProgress) => void,
  deps: SignInDeps = {}
): Promise<SignInResult> {
  const baseUrl = (deps.baseUrl ?? COMMUNITY_URL).replace(/\/+$/, '');
  const doFetch = deps.fetchImpl ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch);
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const now = deps.now ?? (() => Date.now());
  const cancelled = deps.isCancelled ?? (() => false);

  onProgress({ phase: 'starting' });

  let begun: BeginResponse;
  try {
    const response = await doFetch(`${baseUrl}/api/v1/auth/device`, {
      method: 'POST',
      headers: { accept: 'application/json' }
    });
    if (!response.ok) {
      return { outcome: 'failed', detail: `The community could not start a sign-in (HTTP ${response.status}).` };
    }
    begun = (await response.json()) as BeginResponse;
  } catch (err) {
    return { outcome: 'failed', detail: `The community could not be reached (${String(err)}).` };
  }
  if (!begun?.deviceCode || !begun?.userCode) {
    return { outcome: 'failed', detail: 'The community sent a sign-in with no code in it.' };
  }

  const verificationUri = begun.verificationUri || `${baseUrl}/auth/device`;
  onProgress({ phase: 'waiting', userCode: begun.userCode, verificationUri });
  deps.openExternal?.(`${verificationUri}?code=${encodeURIComponent(begun.userCode)}`);

  const intervalMs = Math.max(1, begun.interval || DEFAULT_INTERVAL_SECONDS) * 1000;
  const deadline = now() + Math.max(1, begun.expiresIn || DEFAULT_EXPIRY_SECONDS) * 1000;

  // 🔴 The loop bounds itself on the CLOCK rather than on a poll count. A count would silently
  // become a different timeout the day the platform changed its suggested interval, and the
  // two would then disagree about when a pairing has lapsed.
  while (now() < deadline) {
    if (cancelled()) return { outcome: 'cancelled' };
    await wait(intervalMs);
    if (cancelled()) return { outcome: 'cancelled' };

    let poll: PollResponse;
    try {
      const response = await doFetch(`${baseUrl}/api/v1/auth/device/token`, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ deviceCode: begun.deviceCode })
      });
      if (!response.ok) {
        return { outcome: 'failed', detail: `The community refused the sign-in (HTTP ${response.status}).` };
      }
      poll = (await response.json()) as PollResponse;
    } catch (err) {
      // ⚠️ A transient network failure mid-poll is NOT a failed sign-in — the person may be
      // on a train. Keep polling until the deadline; the deadline is what ends this.
      continue;
    }

    if (poll.status === 'expired') return { outcome: 'expired' };
    if (poll.status === 'ready') {
      const session: CommunitySession = { token: poll.token, handle: poll.handle };
      await writeCommunitySession(session, deps.store ?? JSONStorage);
      onProgress({ phase: 'signed-in', handle: poll.handle });
      return { outcome: 'signed-in', session };
    }
  }

  return { outcome: 'expired' };
}

/**
 * Signs out: revoke on the platform, THEN forget locally.
 *
 * 🔴 THE ORDER IS THE WHOLE FUNCTION. Clearing first would leave a live session on the
 * platform that nothing can reach to revoke — the token was the only handle on it. So the
 * revoke goes first, and the local clear happens **whether or not it succeeded**: a person
 * who is offline must still be able to sign out of their own editor, and a token they can no
 * longer present is inert on this machine even while its row lives on.
 *
 * ⚠️ Returns whether the platform confirmed. The caller may show it; it must not gate on it.
 */
export async function signOutOfCommunity(
  deps: SignInDeps & { readStore?: SessionStore } = {}
): Promise<{ revokedOnPlatform: boolean }> {
  const baseUrl = (deps.baseUrl ?? COMMUNITY_URL).replace(/\/+$/, '');
  const doFetch = deps.fetchImpl ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch);
  const existing = await readCommunitySession(deps.readStore ?? JSONStorage);

  let revokedOnPlatform = false;
  if (existing) {
    try {
      const response = await doFetch(`${baseUrl}/api/auth/signout`, {
        method: 'POST',
        headers: { accept: 'application/json', authorization: `Bearer ${existing.token}` }
      });
      revokedOnPlatform = response.ok;
    } catch {
      revokedOnPlatform = false;
    }
  }

  await clearCommunitySession(deps.store ?? JSONStorage);
  return { revokedOnPlatform };
}

/**
 * HLT-004 — confirm the credential this editor is about to claim it has, and forget it if the
 * platform does not know it.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔴 **NOTHING OWNED A TOKEN'S DEATH, AND THIS IS THE MEASUREMENT THAT SAYS SO.** Before this
 * function, `clearCommunitySession` had **exactly one caller in the repository** — the
 * deliberate sign-out above. Twenty-nine places in the editor handle a read or write coming
 * back `unauthenticated`, and every one of them renders a sentence; **not one of them forgets
 * the credential the platform just rejected.** So a token that has expired is re-sent on every
 * launch, for ever, and the launcher keeps drawing the handle cached beside it. Measured on
 * this machine 2026-09-21: a session written 2026-08-20, two `401`s in every launch's renderer
 * log, and a card reading *"signed in as @richardosborne14"* the whole time.
 *
 * 🔴 **IT ASKS `/api/v1/me`, NOT THE ROUTE THAT FAILED, AND THE DIFFERENCE IS THE SAFETY
 * PROPERTY.** Forgetting on a 401 from any authenticated route would hand every one of them a
 * veto over the account: one route briefly misconfigured, one deploy answering 401 where it
 * meant 503, and every editor on earth silently signs itself out. `/api/v1/me` is the route
 * built to answer *who is the viewer* — it returns **200 for everybody**, signed in or out, so
 * a 401 from it is not a thing that happens and there is no failure mode to confuse. The
 * answer is read, not the status: `viewer: null` **while we are holding a token** is the
 * platform saying, unambiguously, that this credential buys nothing.
 *
 * ⚠️ **EVERY INCONCLUSIVE ANSWER KEEPS THE SESSION.** Offline, DNS gone, a 500, a body that
 * will not parse — all of them leave the token exactly where it is. The asymmetry is
 * deliberate: wrongly forgetting costs somebody their sign-in over a flaky café connection,
 * and wrongly keeping costs one request that was going to be made anyway. Only a **positive,
 * parsed `viewer: null` from a 200** is treated as an answer.
 *
 * ⚠️ **It does NOT revoke, and that is the difference from {@link signOutOfCommunity}.** The
 * token is already refused; presenting it to `/api/auth/signout` would spend a round trip to
 * collect a second rejection. There is no live session on the platform to tidy up — that is
 * precisely what was just established.
 *
 * ⚠️ **The clear stays in this module.** `communitysession.ts`'s header is explicit that *"a
 * second place that writes this key is a second place a stale token can come from"*, so this
 * lives beside sign-out rather than in the hook that calls it.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export async function confirmStoredSession(
  deps: SignInDeps & { readStore?: SessionStore } = {}
): Promise<'none' | 'live' | 'forgotten' | 'inconclusive'> {
  const existing = await readCommunitySession(deps.readStore ?? JSONStorage);
  // No credential is not a problem to be solved; it is the ordinary state of a new install.
  if (!existing) return 'none';

  const baseUrl = (deps.baseUrl ?? COMMUNITY_URL).replace(/\/+$/, '');
  const doFetch = deps.fetchImpl ?? ((globalThis as { fetch?: typeof fetch }).fetch as typeof fetch);

  let response: Response;
  try {
    response = await doFetch(`${baseUrl}/api/v1/me`, {
      headers: { accept: 'application/json', authorization: `Bearer ${existing.token}` }
    });
  } catch {
    return 'inconclusive';
  }
  if (!response.ok) return 'inconclusive';

  let body: { viewer?: unknown };
  try {
    body = (await response.json()) as { viewer?: unknown };
  } catch {
    return 'inconclusive';
  }
  // 🔴 `viewer` ABSENT IS NOT `viewer` NULL. A payload that never carried the field is a
  // platform this client does not understand — an inconclusive answer, not a verdict on the
  // token ([[an-arm-with-no-predicate-in-it]] is the shape this guard exists to avoid).
  if (!('viewer' in body)) return 'inconclusive';
  if (body.viewer !== null) return 'live';

  await clearCommunitySession(deps.store ?? JSONStorage);
  return 'forgotten';
}
