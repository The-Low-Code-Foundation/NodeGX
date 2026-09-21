import { useCallback, useEffect, useRef, useState } from 'react';

import { platform } from '@noodl/platform';

import type { CommunityAccountState } from '@noodl-core-ui/preview/launcher/Launcher/components/CommunityAccountCard';
import type { CommunityAccountHostState } from '@noodl-core-ui/preview/launcher/Launcher/LauncherContext';

import { readCommunitySession } from '../../models/community/communitysession';
import { confirmStoredSession, signIntoCommunity, signOutOfCommunity } from '../../models/community/communitysignin';
import { onCommunityChanged } from '../../models/community/communitychanged';

/**
 * UNI-001 AC2 — the launcher's half of "sign in to NodeGX".
 *
 * ## Where the work happens, and why not here
 *
 * Nothing about the device flow lives in this file. `signIntoCommunity` owns the negotiation and
 * `communitysession` owns the store — this hook is the *adapter* between them and a card in
 * `noodl-core-ui`, which cannot import either (it renders in Storybook, where `noodl-editor` does
 * not exist). `useConnectAgent` is the precedent for the shape: the renderer composes, and the
 * module that knows how does the knowing.
 *
 * 🔴 **The card is ALWAYS offered, even when the platform cannot be reached**, and that is the
 * opposite of `useConnectAgent`'s `return undefined`. The reasons differ: a connect-an-agent
 * button with no bundle to point at *cannot work*, whereas a community that is down right now is
 * a community that is up in ten minutes, and hiding the account because a fetch failed would
 * make signing in look like a feature that comes and goes.
 *
 * ## The three states that are easy to conflate
 *
 * `undefined` — the store has not answered yet. Rendered as `unknown`, which draws **nothing**.
 * 🔴 The frame this protects is the first one: `null` and `undefined` are both falsy, so a
 * `!session` test flashes *"Sign in to NodeGX"* at somebody who is already signed in on every
 * single launch. The composer's `session === null` guard makes the same distinction.
 *
 * `null` — the store answered, and there is no session. That is the offer.
 *
 * A session — signed in. The handle is a **cache** of a fact the platform owns, so it may be
 * absent; "signed in with no handle" is a real state and the card says so rather than showing
 * `@undefined`.
 */
export function useCommunityAccount(): CommunityAccountHostState {
  /** `undefined` = not asked yet · `null` = asked, signed out · a state = the answer. */
  const [state, setState] = useState<CommunityAccountState>({ phase: 'unknown' });
  const [error, setError] = useState<string | null>(null);

  /**
   * 🔴 A REF, not the state, and not a style preference. The poll loop inside `signIntoCommunity`
   * closes over its arguments once and runs for up to fifteen minutes; a state value read there
   * is frozen at the value it had on the first render, so the loop would never see the launcher
   * go away and would hammer the platform every five seconds until the pairing lapsed. The same
   * bug, and the same fix, as the composer's `abandoned` ref.
   */
  const abandoned = useRef(false);
  useEffect(
    () => () => {
      abandoned.current = true;
    },
    []
  );

  useEffect(() => {
    let live = true;
    const read = () => {
      void readCommunitySession().then((found) => {
        // ⚠️ The launcher can be torn down while the read is in flight.
        if (!live) return;
        setState(found ? { phase: 'signed-in', handle: found.handle } : { phase: 'signed-out' });
      });
    };
    read();
    /**
     * HLT-004 — and it belongs to THIS hook because this hook is the one that makes the claim.
     *
     * 🔴 **THE CARD USED TO SAY "signed in as @somebody" ON THE STRENGTH OF A LOCAL FILE AND
     * NOTHING ELSE.** `phase: 'signed-in'` is set above from the mere PRESENCE of a stored
     * session; nothing in this hook, or anywhere else in the editor, ever asked the platform
     * whether that credential still meant anything. Measured 2026-09-21: a token written a
     * month earlier, refused by every authenticated route, and a chip reading
     * *"@richardosborne14"* above it on every launch.
     *
     * ⚠️ **The read above is NOT replaced by this, and the order is the point.** The store
     * answers instantly and off the network, so the chip still draws on the first frame for
     * somebody whose session is fine — which is the whole reason `unknown` exists (see the
     * header). The confirmation lands a moment later and only ever REMOVES a claim this hook
     * should not have been making. A hook that waited for the network before drawing would
     * put a flash of *"Sign in to NodeGX"* in front of every signed-in user, which is the bug
     * the three-state distinction above was written to prevent.
     *
     * ⚠️ `forgotten` is the only outcome that does anything here, and it does it through the
     * store rather than through `setState`: `clearCommunitySession` fires
     * `notifyCommunityChanged('session')`, the FIX-025 subscription below re-reads, and every
     * other surface that cached the session re-reads with it. Setting state here as well would
     * be a second path to the same frame, free to disagree with the store.
     */
    void confirmStoredSession().then((outcome) => {
      if (!live) return;
      if (outcome === 'forgotten') read();
    });
    // FIX-025 — the other direction of the same fix. This hook already re-reads after ITS OWN
    // sign-in and sign-out; this is for a session written or cleared anywhere else, so the card
    // and the Learning tab cannot disagree about whether there is an account.
    const unsubscribe = onCommunityChanged((change) => {
      if (change === 'session') read();
    });
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  const onSignIn = useCallback(() => {
    setError(null);
    void (async () => {
      const result = await signIntoCommunity(
        (progress) => {
          if (abandoned.current) return;
          if (progress.phase === 'waiting') {
            setState({ phase: 'waiting', userCode: progress.userCode, verificationUri: progress.verificationUri });
          } else if (progress.phase === 'starting') {
            setState({ phase: 'starting' });
          }
          // `signed-in` is deliberately NOT handled here: the state below is rendered from the
          // credential that was actually persisted, not from the one the flow reported.
        },
        {
          openExternal: (url) => platform.openExternal(url),
          isCancelled: () => abandoned.current
        }
      );
      if (abandoned.current) return;

      if (result.outcome === 'signed-in') {
        const stored = await readCommunitySession();
        setState(stored ? { phase: 'signed-in', handle: stored.handle } : { phase: 'signed-out' });
        return;
      }

      setState({ phase: 'signed-out' });
      // ⚠️ `cancelled` is not an error and says nothing — a person who closed the launcher
      // mid-flow has not failed at anything. The other two get a sentence they can act on.
      //
      // ⚠️ These sentences are NOT shared with the composer's, deliberately. Its timeout message
      // ends "…or use the browser button below", and there is no browser button below this card.
      // One string with one owner is for copy that IS the same, not copy that looks similar.
      if (result.outcome === 'expired') {
        setError('That sign-in timed out before it was approved. Try again when you are ready.');
      } else if (result.outcome === 'failed') {
        setError(result.detail);
      }
    })();
  }, []);

  const onSignOut = useCallback(() => {
    setError(null);
    void (async () => {
      // 🔴 The order is inside `signOutOfCommunity`: revoke on the platform first, forget
      // locally second, and forget locally whether or not the revoke succeeded. Somebody
      // offline must still be able to sign out of their own editor.
      await signOutOfCommunity();
      if (abandoned.current) return;
      // Re-read rather than assume: the store is the thing the rest of the editor reads, so it
      // is the thing this state must agree with.
      const stored = await readCommunitySession();
      setState(stored ? { phase: 'signed-in', handle: stored.handle } : { phase: 'signed-out' });
    })();
  }, []);

  return { state, error, onSignIn, onSignOut };
}
