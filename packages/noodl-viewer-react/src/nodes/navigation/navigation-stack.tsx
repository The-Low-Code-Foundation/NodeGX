import React, { useEffect } from 'react';
import NoodlRuntime from '@noodl/runtime';
import { outcomeOutputs } from '@noodl/runtime/src/outcome';
import type {
  EditorConnectionLike,
  GraphModelLike,
  GraphNodeModel,
  InspectInfoEntry,
  NodeContextLike,
  NodeInstance,
  NodeOutcome,
  OutcomeFailureOptions,
  OutcomeToken
} from '@noodl/types';

import type { TSFixme } from '../../../typings/global';
import ASyncQueue from '../../async-queue';
import { noodlRootRef, dataAttributeProps } from '../../components/noodl-root-ref';
import guid from '../../guid';
import { createNodeFromReactComponent, ReactNodeInstance } from '../../react-component-node';
import { Noodl, Slot } from '../../types';
import NavigationHandler, { StackNavigateArgs } from './navigation-handler';
import Transitions from './transitions';
import type Transition from './transitions/transition';


/** P107-C124 — `decodeURIComponent`, keeping the text as written on a malformed escape (router.tsx `_decodePathSegment`). */
function decodeOrKeep(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch (e) {
    return text;
  }
}
interface PageStackReactComponentProps extends Noodl.ReactProps {
  didMount: () => void;
  willUnmount: () => void;

  children: Slot;
}

function PageStackReactComponent(props: PageStackReactComponentProps) {
  const { didMount, willUnmount, style, children } = props;

  useEffect(() => {
    didMount();
    return () => {
      willUnmount();
    };
  }, []);

  return (
    <div ref={noodlRootRef((props as TSFixme).noodlNode)} {...dataAttributeProps((props as TSFixme).dom)} style={style}>
      {children}
    </div>
  );
}

/** One row of this node's `pages` proplist parameter. */
interface PageListItem {
  id: string;
  label: string;
}

/**
 * What `_findPage` returns. `path` carries the per-page `pagePath-…` input (from
 * `_internal.pageInfo[id].path`) so that `getRelativeURL` writes the same custom
 * path `matchPageFromUrl` matches on. The two were asymmetric until DEBT-006:
 * inbound URLs honoured a custom path while written URLs always used the
 * label-derived slug (PLAT-003 NOTES §19.4 #2).
 */
interface FoundPage {
  component: string;
  label: string;
  id: string;
  path?: string;
}

interface StackEntry {
  from: ReactNodeInstance | null;
  page: ReactNodeInstance;
  pageId: string;
  pageInfo: FoundPage;
  params: Record<string, unknown>;
  transition?: Transition;
  backCallback?: StackNavigateArgs['backCallback'];
  componentName?: string;
  /** P107-C120 — the push wrote this entry's URL as a new history entry, so its Pop steps back over it. */
  historyEntry?: boolean;
}

/**
 * What a pop attempt did — NDA-008 §3.
 *
 * Returned rather than raised, because the Component Stack is not the node that failed: the
 * Pop Component Stack node was asked to act and could not, and it is the one carrying the
 * `Failure` port and the provenance an author can act on (Failure Contract).
 */
export type StackBackResult =
  | { ok: true }
  /**
   * ERG-001 §4 — an ordinary end-stop, not a failure.
   *
   * ⚠️ **A deliberate change to NDA-008 §3's verdict.** It made "the stack is already at its
   * first component" a `Failure` with a code and a message, which was the only honest choice
   * with two outcomes available. Build 2b made `Undo` at the beginning of history `Unchanged`
   * on the contract's reasoning — "a `Failure` that fires on a graph working exactly as written
   * is how authors are trained to ignore the port" — and a Back button on the root component is
   * exactly that graph. The transitioning case stays a `Failure`, because a dropped tap is not
   * something the author asked for.
   */
  | { ok: false; unchanged: true }
  | { ok: false; code: string; message: string };

interface PageStackInstance extends ReactNodeInstance {
  _internal: {
    stack: StackEntry[];
    topPageName: string;
    stackDepth: number;
    /** Per-page registry filled by the `pageComp-…` / `pagePath-…` dynamic inputs. */
    pageInfo: Record<string, { component?: string; path?: string }>;
    asyncQueue: ASyncQueue;
    isMounted?: boolean;
    isTransitioning?: boolean;
    name?: string;
    useRoutes?: boolean;
    /** P107-C139 — Keep Pages When Unmounted. */
    keepPagesWhenUnmounted?: boolean;
    /** P107-C139 — while unmounted, something happened that resets a mounted stack: the next mount resets. */
    resetOwed?: boolean;
    /** P107-C139 — the address when Mounted went off, to tell a Back or Forward the stack did not hear. */
    addressAtUnmount?: string;
    /** P107-C139 — the mount is keeping the pages: the handler's mount reset is skipped. */
    keepAtMount?: boolean;
    pages?: PageListItem[];
    startPageId?: string;
    startPage?: string;
    hasScheduledReset?: boolean;
    /** ERG-001 §4 — tokens for the `Reset` presses this frame; see `scheduleReset`. */
    pendingResetOutcomes?: OutcomeToken[];
    /** P107-C126 — a Reset press or a Components edit this frame: the reset builds the start page, not the page in the URL. */
    pendingResetToStart?: boolean;
    /** P107-C120 — the `history.back()`s this stack's Pops made that have not landed: their `popstate` is the stack's own. */
    ownBacks?: number;
    remainingNavigationPath?: string[];
    [extra: string]: unknown;
  };
  onScheduleReset?: () => void;
  _registerPageStack(): void;
  _deregisterPageStack(): void;
  _findPage(pageIdOrLabel: string): FoundPage | undefined;
  /** NDA-004 §2 — hand a dropped navigation back to the node that asked for it. */
  _reportNavigationFailure(args: StackNavigateArgs, code: string, message: string): void;
  /** NDA-008 §2 — whether this exact page-and-params is already the top of the stack. */
  _isAlreadyShowing(pageInfo: FoundPage, params: Record<string, unknown> | undefined): boolean;
  setPageOutputs(outputs: Record<string, unknown>): void;
  scheduleReset(outcome?: OutcomeToken, toStart?: boolean): void;
  /** ERG-001 §4 — end a `Reset` invocation, or on the mount path end none. */
  _reportReset(outcomes: OutcomeToken[] | undefined, outcome: NodeOutcome, options?: OutcomeFailureOptions): void;
  /** P107-C112 — a failed reset leaves the stack empty, and says so. */
  _resetLeftEmpty(): void;
  createPageContainer(): ReactNodeInstance;
  reset(outcomes?: OutcomeToken[], toStart?: boolean): void;
  resetAsync(outcomes?: OutcomeToken[], toStart?: boolean): Promise<void>;
  /** P107-C120 — the address names the page (and parameters) on top: a `popstate` there has nothing to rebuild. */
  _addressShowsTop(): boolean;
  getRelativeURL(): { path: string; query: { name: string; value: unknown }[] } | undefined;
  getNavigationAbsoluteURL(): { path: string; query: { name: string; value: unknown }[] };
  _getLocationPath(): string;
  _getSearchParams(): Record<string, string>;
  getNavigationRemainingPath(): string[] | undefined;
  matchPageFromUrl(): { pageId: string; params: Record<string, string>; query: Record<string, string> } | undefined;
  _updateUrlWithTopPage(how?: 'push' | 'replace'): boolean;
  replace(args: StackNavigateArgs): void;
  replaceAsync(args: StackNavigateArgs): Promise<void>;
  navigate(args: StackNavigateArgs): void;
  navigateAsync(args: StackNavigateArgs): Promise<void>;
  back(args: { backAction?: string; results?: Record<string, unknown> }): StackBackResult;
  setPageComponent(pageId: string, component: string): void;
  setPagePath(pageId: string, path: string): void;
  setStartPage(pageId: string): void;
}

const PageStack = {
  name: 'Page Stack',
  displayNodeName: 'Component Stack',
  category: 'Visuals',
  docs: 'https://docs.noodl.net/nodes/component-stack/component-stack-node',
  ssr: {
    compat: 'partial' as const,
    note: 'The initial stack renders server-side; browser URL/history sync only runs in the browser.'
  },
  useVariants: false,
  noodlNodeAsProp: true,
  initialize(this: PageStackInstance) {
    this._internal.stack = [];

    this._internal.topPageName = '';
    this._internal.stackDepth = 0;

    this._internal.pageInfo = {};

    this._internal.asyncQueue = new ASyncQueue();

    this.onScheduleReset = () => {
      // P107-C120 (ruled "A Pop steps the browser's history back") — the `popstate` a Pop's own `history.back()` lands as is this
      // stack's: the page below is already on top, so it must not reset. Counted per stack: every listener of the page hears it
      if (this._internal.ownBacks) {
        this._internal.ownBacks -= 1;
        return;
      }
      // P107-C119 — the address is the stack's only with Use Routes on: the browser's Back or Forward sent every stack on the page
      // back to its start page, Use Routes or not. Read at the event, so Use Routes turned on or off while mounted holds
      if (!this._internal.useRoutes) return;
      // P107-C120 — an address that names the page already on top has nothing to rebuild: another stack's Pop (a parent's address
      // still names its top), as the Page Router keeps a page it already shows
      if (this._addressShowsTop()) return;
      this.scheduleReset();
    };

    this.props.didMount = () => {
      // Fires from both triggerDidMount (SSR / hydration pre-settle) and the React
      // mount effect; during hydration both run. Registering twice would duplicate
      // the stack in RouterHandler.
      if (this._internal.isMounted) return;
      this._internal.isMounted = true;

      // P109 ISL-048 (P107-C139, ruled "Keep them only when an option is ticked"): with Keep Pages When Unmounted ticked, a stack
      // that still holds its pages comes back as it was — unless, while it was off, something happened that resets a mounted
      // stack: its Components written, its Name moved to another key, or (with Use Routes) the address moved by a Back or Forward
      // it could not hear. Off, or with nothing kept, the handler's mount reset builds the start component, as before.
      const internal = this._internal;
      // Bare `location`, as `_getLocationPath` reads it (the SSR server shims globalThis.location)
      const addressMoved =
        !!internal.useRoutes && typeof location !== 'undefined' && location.href !== internal.addressAtUnmount;
      internal.keepAtMount = !!internal.keepPagesWhenUnmounted && internal.stack.length > 0 && !internal.resetOwed && !addressMoved;
      internal.resetOwed = false;

      // didMount also fires server-side (triggerDidMount during SSR); the URL
      // listeners are browser-only, the stack registration is not.
      if (typeof window !== 'undefined') {
        // Listen to push state events and update stack
        if (window.history && window.history.pushState) {
          //this is event is manually sent on push, so covers both pop and push state
          window.addEventListener('popstate', this.onScheduleReset);
        } else {
          // Only hash support
          window.addEventListener('hashchange', this.onScheduleReset);
        }
      }

      this._registerPageStack();
      internal.keepAtMount = false;
    };

    this.props.willUnmount = () => {
      this._internal.isMounted = false;
      // P107-C139 — what the next mount compares against
      this._internal.resetOwed = false;
      // P107-C120 — a Back of its own that lands after this is heard by no listener of this stack's
      this._internal.ownBacks = 0;
      this._internal.addressAtUnmount = typeof location !== 'undefined' ? location.href : undefined;

      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', this.onScheduleReset);
        window.removeEventListener('hashchange', this.onScheduleReset);
      }

      this._deregisterPageStack();
    };
  },
  getInspectInfo(this: PageStackInstance) {
    if (this._internal.stack.length === 0) {
      return 'No active page';
    }

    const info: InspectInfoEntry[] = [{ type: 'text', value: 'Active Components:' }];

    return info.concat(
      this._internal.stack.map((p) => {
        const pageInfo = this._findPage(p.pageId);
        return {
          type: 'text' as const,
          value: '- ' + pageInfo.label
        };
      })
    );
  },
  defaultCss: {
    width: '100%',
    flex: '1 1 100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    // NDA-012 (Visual), DV-iii. `clip` declares `default: true` and its setter is the only thing
    // that writes `overflow`, but a declared default never runs its setter (FINDINGS DB-ii) — so
    // a stack whose panel read "Clip Content ✓" let a pushed component taller than itself spill
    // out. `defaultCss` is the route that *is* applied at initialize, so the declared default and
    // the rendered state now agree. Unticking the box still reaches `removeStyle(['overflow'])`,
    // which deletes from this same style object, so the round trip works.
    //
    // ⚠️ `Page Router` has the identical port shape and needs no equivalent: its default enum
    // value takes the `removeStyle` branch, a no-op on a node that never had the style. That
    // asymmetry is what makes this a defect rather than a pattern.
    overflow: 'hidden'
  },
  getReactComponent() {
    return PageStackReactComponent;
  },
  inputs: {
    name: {
      type: { name: 'string', identifierOf: 'PackStack' },
      displayName: 'Name',
      group: 'General',
      description: 'Name the Push and Pop nodes address this stack by; leave it as Main if there is only one',
      default: 'Main',
      set: function (this: PageStackInstance, value: string) {
        // P107-C113 — the handler holds the stack under `name || 'Main'` as a key: a write that keeps the key is stored and nothing
        // more. Registering again reset the stack to its start page, so a wire sending the same name again lost every page pushed
        if (String(value || 'Main') === String(this._internal.name || 'Main')) {
          this._internal.name = value;
          return;
        }
        this._deregisterPageStack();
        this._internal.name = value;

        if (this._internal.isMounted) {
          this._registerPageStack();
        } else {
          // P107-C139 — a mounted stack would have reset: the next mount does
          this._internal.resetOwed = true;
        }
      }
    },
    /*	startPage: {
			type: 'component',
			displayName: 'Start Page',
			group: 'General',
			set: function (value) {
				this._internal.startPage = value;
				this.scheduleReset();
			}
		},*/
    useRoutes: {
      type: 'boolean',
      displayName: 'Use Routes',
      description: 'Puts the top component in the browser URL, so back and forward move through the stack',
      group: 'General',
      default: false,
      set: function (this: PageStackInstance, value) {
        this._internal.useRoutes = !!value;
      }
    },
    // P109 ISL-048 (P107-C139), ruled 2026-10-08 "Keep them only when an option is ticked" — beside Use Routes, the other choice
    // about what the stack remembers. Read when the stack mounts (`didMount` above).
    keepPagesWhenUnmounted: {
      type: 'boolean',
      displayName: 'Keep Pages When Unmounted',
      description:
        "Keeps the stack's components, and what is on them, while Mounted is off, so turning it back on shows the one that was on top. Its Components or Name changing meanwhile, or (with Use Routes) Back or Forward, still starts it again. Off: turning Mounted back on starts at the start component",
      group: 'General',
      default: false,
      set: function (this: PageStackInstance, value) {
        this._internal.keepPagesWhenUnmounted = !!value;
      }
    },
    clip: {
      displayName: 'Clip Content',
      description: 'Clips a pushed component that is bigger than the stack',
      type: 'boolean',
      group: 'Layout',
      default: true,
      set(this: PageStackInstance, value) {
        if (value) {
          this.setStyle({ overflow: 'hidden' });
        } else {
          this.removeStyle(['overflow']);
        }
      }
    },
    pages: {
      type: 'proplist',
      displayName: 'Components',
      description: 'The components this stack can show, and which of them it starts on',
      group: 'Components',
      set: function (this: PageStackInstance, value: PageListItem[]) {
        // P107-C109 — a value that is not a list (a wired string, an object) is no list: every reader below calls `.find`,
        // `.length` or `[0]` on it, and a reset that threw on it blanked the stack and never answered
        this._internal.pages = Array.isArray(value) ? value : undefined;
        if (this._internal.isMounted) {
          // P107-C126 (ruled "Reset goes to the start page and writes its address") — a Components edit rebuilds the start page
          this.scheduleReset(undefined, true);
        } else {
          // P107-C139 — a mounted stack would have reset: the next mount does
          this._internal.resetOwed = true;
        }
      }
    },
    reset: {
      type: 'signal',
      displayName: 'Reset',
      description: 'Empties the stack and rebuilds the start component',
      group: 'Actions',
      valueChangedToTrue: function (this: PageStackInstance) {
        // ERG-001 §4 — the only caller of `scheduleReset` that is an author asking for a reset.
        // `NavigationHandler.registerPageStack` calls `reset()` on mount (`:90`, `:106`) so the
        // start component is created, and that must report nothing.
        // P107-C126 (ruled "Reset goes to the start page and writes its address") — as its description says, not the URL's page
        this.scheduleReset(this.beginOutcome(), true);
      }
    }
  },
  inputCss: {
    backgroundColor: {
      type: 'color',
      displayName: 'Background Color',
      description: 'Fill colour behind whichever component is showing',
      group: 'Style',
      default: 'transparent',
      applyDefault: false
    }
  },
  outputs: {
    // ERG-001 §4 / OUTCOME-CONTRACT.md. §0.3 recorded this node as emitting nothing at all.
    //
    // ⚠️ **No `Unchanged` port, and that is the contract being followed rather than skipped.**
    // "A node that cannot be a no-op gets no `Unchanged` port." `resetAsync` tears every child
    // down and rebuilds the start component unconditionally — a reset that lands on the
    // component already showing still destroys and recreates it, which is a change. An
    // `Unchanged` here would be a port that can never fire, and §5's dead-end check would then
    // be right to complain about it. Contrast the Page Router, whose reset genuinely can no-op.
    ...outcomeOutputs({
      done: 'Fires once the stack has been emptied and the start component rebuilt',
      failure: 'Fires when the stack has no components configured, or its start component does not resolve'
    }),
    topPageName: {
      type: 'string',
      displayName: 'Top Component Name',
      description: 'Name of the component currently on top of the stack',
      group: 'General',
      get(this: PageStackInstance) {
        return this._internal.topPageName;
      }
    },
    stackDepth: {
      type: 'number',
      displayName: 'Stack Depth',
      description: 'How many components are on the stack, so 1 means only the start component',
      group: 'General',
      get(this: PageStackInstance) {
        return this._internal.stackDepth;
      }
    }
  },
  methods: {
    _registerPageStack(this: PageStackInstance) {
      NavigationHandler.instance.registerPageStack(this._internal.name, this);
    },
    _deregisterPageStack(this: PageStackInstance) {
      NavigationHandler.instance.deregisterPageStack(this._internal.name, this);
    },
    /**
     * NDA-004 §2. Deliberately does *not* fall back to raising on this node when the caller
     * supplied no `hasFailed`: the only such caller is a project's own JavaScript
     * (`Noodl.Navigation`), and attributing its mistake to whichever Component Stack happened
     * to receive it would put the diagnosis on a node the author did not write.
     */
    _reportNavigationFailure(this: PageStackInstance, args: StackNavigateArgs, code: string, message: string) {
      args.hasFailed && args.hasFailed(code, message);
    },
    _findPage(this: PageStackInstance, pageIdOrLabel: string): FoundPage | undefined {
      // P107-C111 — an id whose entry outlives its row in the Components list (the list changed) is not found: `pageRef.label` threw
      const byId = this._internal.pageInfo[pageIdOrLabel] ? this._internal.pages.find((x) => x.id === pageIdOrLabel) : undefined;
      if (byId) {
        const pageInfo = this._internal.pageInfo[pageIdOrLabel];
        const pageRef = byId;
        return {
          component: String(pageInfo.component),
          label: String(pageRef.label),
          id: String(pageIdOrLabel),
          path: pageInfo.path !== undefined ? String(pageInfo.path) : undefined
        };
      }

      const pageRef = this._internal.pages.find((x) => x.label === pageIdOrLabel);
      // P107-C109 — a page found by its label whose component was never set has no entry here: not found, as by its id
      if (pageRef && this._internal.pageInfo[pageRef.id]) {
        const pageInfo = this._internal.pageInfo[pageRef.id];
        return {
          component: String(pageInfo.component),
          label: String(pageRef.label),
          id: String(pageRef.id),
          path: pageInfo.path !== undefined ? String(pageInfo.path) : undefined
        };
      }

      return undefined;
    },
    /**
     * Is the requested page, with these params, already the top of the stack? — NDA-008 §2.
     *
     * Using a Component Stack for internal tabs is the common case, and re-selecting the
     * current tab used to **re-mount it**: measured, `navigate` created a fresh component *and*
     * pushed a duplicate stack entry (depth 1 → 2), and `replace` created a fresh one and
     * destroyed the old. Either way the tab's state was lost on a click that should have done
     * nothing, and push additionally grew a stack that Back then had to walk back through.
     *
     * **Params are part of the question, and that is what keeps this safe.** "Same component"
     * alone would have broken the ordinary stack idiom — master → detail(id=1) → detail(id=2)
     * is the same component three times and must keep pushing. Only a request that would
     * reproduce the state already on screen is skipped.
     *
     * Comparison is shallow and by identity, deliberately. Params are port values and may be
     * arbitrary objects; a deep compare would be both expensive and wrong (two structurally
     * equal Models are not interchangeable). Shallow-unequal falls through to today's exact
     * behaviour, so every uncertain case stays as it was.
     */
    _isAlreadyShowing(
      this: PageStackInstance,
      pageInfo: FoundPage,
      params: Record<string, unknown> | undefined
    ): boolean {
      const stack = this._internal.stack;
      if (!stack || stack.length === 0) return false;

      const top = stack[stack.length - 1];
      if (!top || !top.pageInfo || top.pageInfo.id !== pageInfo.id) return false;

      const a = top.params || {};
      const b = params || {};

      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;

      for (let i = 0; i < aKeys.length; i++) {
        const key = aKeys[i];
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (a[key] !== b[key]) return false;
      }

      return true;
    },
    setPageOutputs(this: PageStackInstance, outputs: Record<string, unknown>) {
      for (const prop in outputs) {
        this._internal[prop] = outputs[prop];
        this.flagOutputDirty(prop);
      }
    },
    /** ERG-001 §4 — the token is optional; see `router.tsx`'s `scheduleReset` for the why. */
    scheduleReset(this: PageStackInstance, outcome?: OutcomeToken, toStart?: boolean) {
      const internal = this._internal;
      if (outcome !== undefined) {
        if (internal.pendingResetOutcomes === undefined) internal.pendingResetOutcomes = [];
        internal.pendingResetOutcomes.push(outcome);
      }
      // P107-C126 — one reset per frame: a Reset press or a Components edit among its reasons makes it the start page's
      if (toStart) internal.pendingResetToStart = true;

      if (!internal.hasScheduledReset) {
        internal.hasScheduledReset = true;
        this.scheduleAfterInputsHaveUpdated(() => {
          internal.hasScheduledReset = false;
          const outcomes = internal.pendingResetOutcomes;
          const toStart = !!internal.pendingResetToStart;
          internal.pendingResetOutcomes = undefined;
          internal.pendingResetToStart = false;
          this.reset(outcomes, toStart);
        });
      }
    },
    _reportReset(
      this: PageStackInstance,
      outcomes: OutcomeToken[] | undefined,
      outcome: NodeOutcome,
      options?: OutcomeFailureOptions
    ) {
      if (outcomes === undefined || outcomes.length === 0) {
        // The mount path. Nothing to report to, but the diagnosis still belongs on the channel —
        // an unconfigured Component Stack is only ever seen at mount.
        if (outcome === 'failure' && options) this.raiseRuntimeError(options.code, options.message);
        return;
      }

      for (const token of outcomes) this.reportOutcome(token, outcome, options);
    },
    createPageContainer(this: PageStackInstance) {
      const group = this.nodeScope.createPrimitiveNode('Group') as ReactNodeInstance;
      group.setStyle({ flex: '1 0 100%' });
      return group;
    },
    reset(this: PageStackInstance, outcomes?: OutcomeToken[], toStart?: boolean) {
      // P107-C139 — the handler's mount reset (no outcomes; a Reset press always has them) on a mount that keeps the pages
      if (outcomes === undefined && this._internal.keepAtMount) return;
      this._internal.asyncQueue.enqueue(this.resetAsync.bind(this, outcomes, toStart));
    },
    async resetAsync(this: PageStackInstance, outcomes?: OutcomeToken[], toStart?: boolean) {
      // `.slice()` for the same reason as in `replaceAsync`: `getChildren()` is the live array,
      // and removing while iterating it by index skips every other child. Reset is the initial
      // mount and deliberately has no transition — the app's first paint should not animate.
      const children = this.getChildren().slice();
      for (const c of children) {
        this.removeChild(c);
        this.nodeScope.deleteNode(c);
      }

      // ERG-001 §4 — both of `resetAsync`'s exits were bare returns, so an unconfigured
      // Component Stack was silent on the one code path that always runs.
      if (this._internal.pages === undefined || this._internal.pages.length === 0) {
        this._resetLeftEmpty();
        this._reportReset(outcomes, 'failure', {
          code: 'component-stack/no-components',
          message: `The Component Stack "${this._internal.name || 'Main'}" has no components to show — add them to its Components list`
        });
        return;
      }

      let startPageId: string;
      let params: Record<string, unknown> = {};

      // P107-C126 — the mount and the browser's Back read the address; a Reset press or a Components edit builds the start page
      const pageFromUrl = toStart ? undefined : this.matchPageFromUrl();
      if (pageFromUrl !== undefined) {
        // We have an url matching a page, use that page as start page
        startPageId = pageFromUrl.pageId;

        params = Object.assign({}, pageFromUrl.query, pageFromUrl.params);
      } else {
        startPageId = this._internal.startPageId;
        if (startPageId === undefined) startPageId = this._internal.pages[0].id;
      }

      // Find the page by either ID or by Label
      const pageInfo = this._findPage(startPageId);
      if (pageInfo === undefined || pageInfo.component === undefined) {
        // No page was found
        this._resetLeftEmpty();
        this._reportReset(outcomes, 'failure', {
          code: 'component-stack/component-not-found',
          message: `The Component Stack "${this._internal.name || 'Main'}" cannot show "${startPageId}" — check its Start Page against its Components list`
        });
        return;
      }

      // In the React viewer a component instance is always a ReactNodeInstance; the
      // published createNode signature only promises the runtime-level NodeInstance.
      // P107-C107 — a component the project does not have throws here, inside the request: answer it as not found
      let content: ReactNodeInstance;
      try {
        content = (await this.nodeScope.createNode(pageInfo.component, guid())) as ReactNodeInstance;
      } catch (e) {
        this._resetLeftEmpty();
        this._reportReset(outcomes, 'failure', {
          code: 'component-stack/component-not-found',
          message: `The Component Stack "${this._internal.name || 'Main'}" cannot show "${startPageId}" — its component "${pageInfo.component}" is not in the project`
        });
        return;
      }

      for (const key in params) {
        content.setInputValue(key, params[key]);
      }

      const group = this.createPageContainer();
      group.addChild(content);

      this.addChild(group);
      this._internal.stack = [
        {
          from: null,
          page: group,
          pageId: startPageId,
          pageInfo: pageInfo,
          params: params,
          componentName: this._internal.startPage
        }
      ];

      // P109 ISL-048 (P107-C114): counted with the outputs below — a reset that ends after the frame's last update (the stack
      // mounted at a frame's paint) said Stack Depth in that frame and Children Count in the next
      this.updateChildCountAndIndiciesNow();
      this.setPageOutputs({
        topPageName: pageInfo.label,
        stackDepth: this._internal.stack.length
      });

      // P107-C126 — and writes its address (Use Routes), a new entry, when the address names another page
      if (toStart && !this._addressShowsTop()) this._internal.stack[0].historyEntry = this._updateUrlWithTopPage('push');

      // Last, after the outputs it describes.
      this._reportReset(outcomes, 'done');
    },
    /**
     * P107-C112 — a reset that fails has already deleted every page (above), so the stack is empty: say so. Top Component
     * Name and Stack Depth kept naming the page that was there, and the stack's entries pointed at deleted pages.
     */
    _resetLeftEmpty(this: PageStackInstance) {
      this._internal.stack = [];
      // P107-C114 — with Stack Depth, as the reset that works does
      this.updateChildCountAndIndiciesNow();
      this.setPageOutputs({ topPageName: '', stackDepth: 0 });
    },
    getRelativeURL(this: PageStackInstance) {
      const top = this._internal.stack[this._internal.stack.length - 1];
      if (top === undefined) return;

      let urlPath = top.pageInfo.path;
      if (urlPath === undefined) {
        // P107-C123 — by the page's id as found: an entry made by its LABEL carries the label as its page id, found no row, and the
        // URL became #
        const pageItem = this._internal.pages.find((p) => p.id == top.pageInfo.id);
        if (pageItem === undefined) return;

        urlPath = pageItem.label.replace(/\s+/g, '-').toLowerCase();
      }

      // First add matching parameters to path
      const paramsInPath = urlPath.match(/{([^}]+)}/g);

      const params = Object.assign({}, top.params);
      if (paramsInPath) {
        for (const param of paramsInPath) {
          const key = param.replace(/[{}]/g, '');
          if (top.params[key] !== undefined) {
            urlPath = urlPath.replace(param, encodeURIComponent(String(params[key])));
            delete params[key];
          }
        }
      }

      // Add other paramters as query
      const query: { name: string; value: unknown }[] = [];
      for (const key in params) {
        query.push({
          name: key,
          value: params[key]
        });
      }

      if (urlPath.startsWith('/')) urlPath = urlPath.substring(1);

      return {
        path: urlPath,
        query: query
      };
    },
    getNavigationAbsoluteURL(this: PageStackInstance) {
      let parent = this.parent;

      while (parent !== undefined && typeof parent.getNavigationAbsoluteURL !== 'function') {
        parent = parent.getVisualParentNode();
      }

      let parentUrl: { path: string; query: { name: string; value: unknown }[] };
      if (parent === undefined) {
        parentUrl = { path: '', query: [] };
      } else {
        parentUrl = (parent as PageStackInstance).getNavigationAbsoluteURL();
      }

      const thisUrl = this.getRelativeURL();
      if (thisUrl === undefined) return parentUrl;
      else {
        return {
          path: parentUrl.path + (parentUrl.path.endsWith('/') ? '' : '/') + thisUrl.path,
          query: parentUrl.query.concat(thisUrl.query)
        };
      }
    },
    _getLocationPath: function (this: PageStackInstance) {
      const navigationPathType = NoodlRuntime.instance.getProjectSettings()['navigationPathType'];
      if (navigationPathType === undefined || navigationPathType === 'hash') {
        // Use hash as path
        let hash = location.hash;
        if (hash) {
          if (hash[0] === '#') hash = hash.substring(1);
          if (hash[0] === '/') hash = hash.substring(1);
        }
        return hash;
      } else {
        // Use url as path
        let path = location.pathname;
        if (path) {
          if (path[0] === '/') path = path.substring(1);
        }
        return path;
      }
    },
    _getSearchParams: function (this: PageStackInstance) {
      const pl = /\+/g, // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        // P107-C124 — a malformed escape (`?q=%zz`, `?off=50%`) is kept as written, as the Page Router keeps it (C115):
        // decodeURIComponent threw inside the reset, after every page was deleted, and the Reset was never answered
        decode = function (s: string) {
          return decodeOrKeep(s.replace(pl, ' '));
        },
        // Bare `location` (not window.location): the SSR server shims
        // globalThis.location, so URL matching also works server-side.
        query = location.search.substring(1);

      let match: RegExpExecArray;

      const urlParams: Record<string, string> = {};
      while ((match = search.exec(query))) urlParams[decode(match[1])] = decode(match[2]);

      return urlParams;
    },
    getNavigationRemainingPath(this: PageStackInstance) {
      return this._internal.remainingNavigationPath;
    },
    matchPageFromUrl(this: PageStackInstance) {
      if (!this._internal.useRoutes) return;
      if (this._internal.pages === undefined || this._internal.pages.length === 0) return;

      // Attempt to find relative path from closest navigation parent
      let parent = this.parent;
      while (parent !== undefined && typeof parent.getNavigationRemainingPath !== 'function') {
        parent = parent.getVisualParentNode();
      }

      let pathParts: string[];
      if (parent === undefined) {
        let urlPath = this._getLocationPath();
        if (urlPath[0] === '/') urlPath = urlPath.substring(1);
        pathParts = urlPath.split('/');
      } else {
        pathParts = (parent as PageStackInstance).getNavigationRemainingPath();
      }
      if (pathParts === undefined) return;

      const urlQuery = this._getSearchParams();

      function _matchPathParts(path: string[], pattern: string[]) {
        const params: Record<string, string> = {};
        for (let i = 0; i < pattern.length; i++) {
          if (path[i] === undefined) return;

          const _p = pattern[i];
          if (_p[0] === '{' && _p[_p.length - 1] === '}') {
            // This is a param, collect it
            params[_p.substring(1, _p.length - 1)] = decodeOrKeep(path[i]); // P107-C124
          } else if (_p !== path[i]) return;
        }
        return {
          params: params,
          remainingPathParts: path.splice(pattern.length)
        };
      }

      for (const page of this._internal.pages) {
        const pageInfo = this._internal.pageInfo[page.id];
        if (pageInfo === undefined) continue;

        let pagePattern = pageInfo.path;
        if (pagePattern === undefined) {
          pagePattern = page.label.replace(/\s+/g, '-').toLowerCase();
        }
        if (pagePattern[0] === '/') pagePattern = pagePattern.substring(1);

        const match = _matchPathParts(pathParts, pagePattern.split('/'));
        if (match) {
          // This page is a match
          this._internal.remainingNavigationPath = match.remainingPathParts;
          return {
            pageId: page.id,
            params: match.params,
            query: urlQuery
          };
        }
      }
    },
    /**
     * P107-C120 — `how`: a push makes a new history entry, a replace overwrites the current one (a Replace, and a Pop over an entry no
     * push of this stack made). Returns whether a new entry was made.
     */
    _updateUrlWithTopPage(this: PageStackInstance, how: 'push' | 'replace' = 'push') {
      // Push the state to the browser url. `window.history !== undefined` alone
      // would throw server-side — dereferencing window needs its own guard.
      if (this._internal.useRoutes && typeof window !== 'undefined' && window.history !== undefined) {
        const url = this.getNavigationAbsoluteURL();

        let urlPath, hashPath;
        const navigationPathType = NoodlRuntime.instance.getProjectSettings()['navigationPathType'];
        if (navigationPathType === undefined || navigationPathType === 'hash') hashPath = url.path;
        else urlPath = url.path;

        // P107-C122 — encoded, as the Page Router writes its query: a value with &, #, + or a space came back different, and one
        // with % emptied the stack at the next reset
        const query = url.query.map((q) => encodeURIComponent(q.name) + '=' + encodeURIComponent(String(q.value)));
        // P107-C121 — in hash mode with no query, while the address holds one, the address's path goes in front: `#/path` alone
        // resolves against the current address and kept its `?query`, which a reload or Back then handed to the page
        if (urlPath === undefined && query.length === 0 && location.search !== '') urlPath = location.pathname;
        const compiledUrl =
          (urlPath !== undefined ? urlPath : '') +
          (query.length >= 1 ? '?' + query.join('&') : '') +
          (hashPath !== undefined ? '#' + hashPath : '');

        this._internal.remainingNavigationPath = undefined; // Reset remaining nav path
        //	console.log(compiledUrl);
        if (how === 'replace') window.history.replaceState({}, '', compiledUrl);
        else window.history.pushState({}, '', compiledUrl);
        return how === 'push';
      }
      return false;
    },
    _addressShowsTop(this: PageStackInstance) {
      const top = this._internal.stack[this._internal.stack.length - 1];
      if (top === undefined || this._internal.pages === undefined || this._internal.pages.length === 0) return false;
      // `matchPageFromUrl` records the path left for a nested stack; this only reads, so what a reset left stays
      const remaining = this._internal.remainingNavigationPath;
      const fromUrl = this.matchPageFromUrl();
      this._internal.remainingNavigationPath = remaining;
      // as `resetAsync` picks it
      const pageId =
        fromUrl !== undefined
          ? fromUrl.pageId
          : this._internal.startPageId !== undefined
            ? this._internal.startPageId
            : this._internal.pages[0].id;
      const found = this._findPage(pageId);
      if (found === undefined || found.id !== top.pageInfo.id) return false;
      // the address holds text: a parameter pushed as 7 is "7" there
      const inUrl: Record<string, unknown> = fromUrl !== undefined ? Object.assign({}, fromUrl.query, fromUrl.params) : {};
      const onTop = top.params || {};
      const keys = Object.keys(onTop);
      if (keys.length !== Object.keys(inUrl).length) return false;
      return keys.every((k) => Object.prototype.hasOwnProperty.call(inUrl, k) && String(onTop[k]) === String(inUrl[k]));
    },
    replace(this: PageStackInstance, args: StackNavigateArgs) {
      this._internal.asyncQueue.enqueue(this.replaceAsync.bind(this, args));
    },
    /**
     * NDA-008 §1 — one mechanism, two policies.
     *
     * Replace used to have no animation *surface at all*: it deleted every current page before
     * the new one existed, so there was never anything to transition from, and the entry it
     * pushed carried no `transition`. That is the split Richard called sad — you picked your
     * semantics and the animation capability came bundled with the choice, rather than being an
     * independent axis.
     *
     * Now replace is "push, then drop the previous entries once the transition completes",
     * which is `navigateAsync` with one difference: the outgoing pages do not stay in the
     * stack. Same `Transitions` registry, same `tr-…` params, same `isTransitioning` gate.
     *
     * **The default stays `None`, so no existing project starts animating.** Push's default is
     * `Push`; matching it here would silently add an animation to every replace already out
     * there. An author who wants one now picks it — see the mode-aware port default in
     * `navigate.ts`.
     */
    async replaceAsync(this: PageStackInstance, args: StackNavigateArgs) {
      // NDA-004 §2 — the same three, in the same order, for the same reason. See `navigateAsync`.
      if (this._internal.pages === undefined || this._internal.pages.length === 0) {
        return this._reportNavigationFailure(
          args,
          'push-component-stack/stack-has-no-components',
          `The Component Stack "${this._internal.name || 'Main'}" has no components to show — its Components list is empty`
        );
      }

      if (this._internal.isTransitioning) {
        return this._reportNavigationFailure(
          args,
          'push-component-stack/stack-transitioning',
          'The Component Stack is still animating the previous navigation — this one was dropped'
        );
      }

      const pageId = args.target || this._internal.pages[0].id;

      // Find the page by either ID or by Label
      const pageInfo = this._findPage(pageId);
      if (pageInfo === undefined || pageInfo.component === undefined) {
        // No page was found
        return this._reportNavigationFailure(
          args,
          'push-component-stack/component-not-found',
          `The Component Stack "${this._internal.name || 'Main'}" has no component "${pageId}" — check the Target Page against its Components list`
        );
      }

      // NDA-008 §2 — as in `navigateAsync`, but with one extra condition that matters.
      //
      // Replace's post-condition is "the stack is one deep, showing the target". A no-op is
      // only correct when that is *already* true. With a deeper stack, replace still has
      // collapsing to do even though the top page is right, so it must proceed — skipping
      // there would silently leave entries the author asked to be rid of. The tab case, which
      // is what §2 is about, is depth 1 by construction and lands on the no-op.
      //
      // ⚠️ ERG-001 §4 changed which callback this takes. NDA-008 §2 called `hasNavigated` here
      // and said so out loud: "swallowing the completion callback would turn a re-selected tab
      // into a dead button". That was the right instinct with only two callbacks available —
      // and it is `Insert Object Into Array`'s lie, because the stack did not switch anything.
      // The contract's third outcome is what it was reaching for.
      if (this._internal.stack.length === 1 && this._isAlreadyShowing(pageInfo, args.params)) {
        args.hasUnchanged ? args.hasUnchanged() : args.hasNavigated && args.hasNavigated();
        return;
      }

      // `.slice()`: `getChildren()` hands back the live array, so removing while iterating it
      // skips every other entry. Harmless while a stack had one visible child, wrong the moment
      // it has two — and the animated path below genuinely needs the whole snapshot.
      const outgoing = this.getChildren().slice();
      const from = this._internal.stack.length > 0 ? this._internal.stack[this._internal.stack.length - 1].page : null;

      const transitionType = (args.transition && args.transition.type) || 'None';
      const willAnimate = !!from && transitionType !== 'None' && !!Transitions[transitionType];

      const dropOutgoing = () => {
        for (const child of outgoing) {
          this.removeChild(child);
          this.nodeScope.deleteNode(child);
        }
      };

      // Unanimated replace keeps its original ordering exactly — tear down first, then build —
      // so the two pages are never children at the same time and cannot flash side by side.
      if (!willAnimate) dropOutgoing();

      const group = this.createPageContainer();
      if (willAnimate) group.setInputValue('position', 'absolute');

      // Create the page content. P107-C107 — a component the project does not have throws here, inside the request: answer it
      // as not found, and drop the container made for it
      let content: ReactNodeInstance;
      try {
        content = (await this.nodeScope.createNode(pageInfo.component, guid())) as ReactNodeInstance;
      } catch (e) {
        this.nodeScope.deleteNode(group);
        return this._reportNavigationFailure(
          args,
          'push-component-stack/component-not-found',
          `The Component Stack "${this._internal.name || 'Main'}" cannot show "${pageId}" — its component "${pageInfo.component}" is not in the project`
        );
      }
      for (const key in args.params) {
        content.setInputValue(key, args.params[key]);
      }
      group.addChild(content);

      const transition = willAnimate
        ? new Transitions[transitionType](from as ReactNodeInstance, group, args.transition)
        : undefined;

      // Replace stack. `from: null` regardless: whatever was showing is on its way out, so
      // there is nothing above this entry to go back to — that is what makes this a replace.
      this._internal.stack = [
        {
          from: null,
          page: group,
          pageId: pageId,
          pageInfo: pageInfo,
          params: args.params,
          componentName: args.target,
          transition: transition
        }
      ];

      this.setPageOutputs({
        topPageName: pageInfo.label,
        stackDepth: this._internal.stack.length
      });

      // P107-C120 (ruled) — a Replace overwrites the current entry: the browser's Back no longer returns to the page it removed
      this._updateUrlWithTopPage('replace');

      if (transition) {
        transition.forward(0);

        this._internal.isTransitioning = true;
        transition.start({
          end: () => {
            this._internal.isTransitioning = false;

            // The only difference from `navigateAsync`: the outgoing pages are destroyed
            // rather than kept below the new top.
            dropOutgoing();
            group.setInputValue('position', 'relative');
          }
        });
      }

      this.addChild(group);

      args.hasNavigated && args.hasNavigated();
    },
    navigate(this: PageStackInstance, args: StackNavigateArgs) {
      this._internal.asyncQueue.enqueue(this.navigateAsync.bind(this, args));
    },
    /**
     * NDA-004 §2 — the three bare returns below were the Pop node's three, unfixed.
     *
     * A push that lands on any of them does nothing and says nothing, which from the canvas
     * is a dead button. The third is the one an author hits first: `target` is an *enum*
     * input and a wire can feed an enum any string at all (the States lesson), so a page
     * renamed in the editor while something upstream still spells it the old way silently
     * stops navigating.
     *
     * Reported through `args.hasFailed` rather than raised here, for `back()`'s reason: this
     * stack did not fail, the Push Component To Stack node was asked to act and could not,
     * and it is the one carrying the `Failure` port and the provenance.
     */
    async navigateAsync(this: PageStackInstance, args: StackNavigateArgs) {
      if (this._internal.pages === undefined || this._internal.pages.length === 0) {
        return this._reportNavigationFailure(
          args,
          'push-component-stack/stack-has-no-components',
          `The Component Stack "${this._internal.name || 'Main'}" has no components to show — its Components list is empty`
        );
      }

      if (this._internal.isTransitioning) {
        return this._reportNavigationFailure(
          args,
          'push-component-stack/stack-transitioning',
          'The Component Stack is still animating the previous navigation — this one was dropped'
        );
      }

      const pageId = args.target || this._internal.pages[0].id;

      // Find the page by either ID or by Label
      const pageInfo = this._findPage(pageId);
      if (pageInfo === undefined || pageInfo.component === undefined) {
        // No page was found
        return this._reportNavigationFailure(
          args,
          'push-component-stack/component-not-found',
          `The Component Stack "${this._internal.name || 'Main'}" has no component "${pageId}" — check the Target Page against its Components list`
        );
      }

      // NDA-008 §2 — re-selecting the current page is a no-op, not a re-mount *and* a duplicate
      // stack entry. Something still fires: the request was satisfied, the stack is showing
      // exactly what was asked for, and swallowing the completion callback here would turn a
      // re-selected tab into a dead button — the failure this phase exists to remove.
      //
      // ⚠️ ERG-001 §4: that something is now `Unchanged` rather than `Navigated`. See
      // `replaceAsync`'s copy of this branch.
      if (this._isAlreadyShowing(pageInfo, args.params)) {
        args.hasUnchanged ? args.hasUnchanged() : args.hasNavigated && args.hasNavigated();
        return;
      }

      // Create the container group
      const group = this.createPageContainer();
      group.setInputValue('position', 'absolute');

      // Create the page content. P107-C107 — a component the project does not have throws here, inside the request: answer it
      // as not found, and drop the container made for it
      let content: ReactNodeInstance;
      try {
        content = (await this.nodeScope.createNode(pageInfo.component, guid())) as ReactNodeInstance;
      } catch (e) {
        this.nodeScope.deleteNode(group);
        return this._reportNavigationFailure(
          args,
          'push-component-stack/component-not-found',
          `The Component Stack "${this._internal.name || 'Main'}" cannot show "${pageId}" — its component "${pageInfo.component}" is not in the project`
        );
      }
      for (const key in args.params) {
        content.setInputValue(key, args.params[key]);
      }
      group.addChild(content);

      // Connect navigate back nodes
      // `_setBackCallback` is a method of the Pop Component Stack node (navigate-back.ts),
      // reached here across the node-type boundary the same way the Router reaches
      // `_setPageParams` on PageInputs.
      const navigateBackNodes = content.nodeScope.getNodesWithType('PageStackNavigateBack') as Array<
        NodeInstance & { _setBackCallback(cb: PageStackInstance['back']): void }
      >;
      if (navigateBackNodes && navigateBackNodes.length > 0) {
        for (let j = 0; j < navigateBackNodes.length; j++) {
          navigateBackNodes[j]._setBackCallback(this.back.bind(this));
        }
      }

      // Push the new top. P107-C110 — a stack with nothing on it (a reset that failed) has no page to push from: answer it
      const top = this._internal.stack[this._internal.stack.length - 1];
      if (top === undefined) {
        this.nodeScope.deleteNode(group);
        return this._reportNavigationFailure(
          args,
          'push-component-stack/stack-empty',
          `The Component Stack "${this._internal.name || 'Main'}" has no page to push "${pageId}" onto — Reset it first`
        );
      }
      const newTop: StackEntry = {
        from: top.page,
        page: group,
        pageInfo: pageInfo,
        pageId: pageId,
        params: args.params,
        // P107-C108 — a type there is no such thing as (a wired "Fade") plays no animation, as a replace's does; it threw here,
        // after the page was built, and the push was never answered
        transition: new (Transitions[args.transition.type || 'Push'] || Transitions.None)(top.page, group, args.transition),
        backCallback: args.backCallback,
        componentName: args.target
      };
      this._internal.stack.push(newTop);
      this.setPageOutputs({
        topPageName: pageInfo.label,
        stackDepth: this._internal.stack.length
      });
      newTop.historyEntry = this._updateUrlWithTopPage();

      newTop.transition.forward(0);

      this._internal.isTransitioning = true;
      newTop.transition.start({
        end: () => {
          this._internal.isTransitioning = false;

          // Transition has completed, remove the previous top from the stack
          this.removeChild(top.page);
          group.setInputValue('position', 'relative');
        }
      });

      this.addChild(group);

      args.hasNavigated && args.hasNavigated();
    },
    /**
     * Pop the top of the stack, and **say what happened** — NDA-008 §3 / NDA-004 §2.
     *
     * Both early returns below were bare. A Pop Component Stack node asked to pop the root of
     * the stack, or asked twice while a transition was still running, did nothing and reported
     * nothing — indistinguishable from a broken Back button. The second case is the one authors
     * actually hit: a double-tapped back button silently loses its second tap.
     *
     * The outcome is returned rather than raised here, because *this* node did not fail — the
     * Pop Component Stack node did, and it is the one that owns the `Failure` port and the
     * provenance an author needs. See `navigate-back.ts`.
     */
    back(
      this: PageStackInstance,
      args: { backAction?: string; results?: Record<string, unknown> }
    ): StackBackResult {
      if (this._internal.stack.length <= 1) {
        return { ok: false, unchanged: true };
      }
      if (this._internal.isTransitioning) {
        return { ok: false, code: 'pop-component-stack/transition-in-progress', message: 'Ignored — the Component Stack is still animating the previous navigation' };
      }

      const top = this._internal.stack[this._internal.stack.length - 1];

      // P107-C111 — the page below first: one the Components list no longer has refuses the back before anything moves (it threw
      // after the page below came back and the pusher heard the results, and the stack never popped)
      const belowId = this._internal.stack[this._internal.stack.length - 2].pageId;
      const pageInfo = this._findPage(belowId);
      if (pageInfo === undefined) {
        return {
          ok: false,
          code: 'pop-component-stack/page-not-found',
          message: `The Component Stack "${this._internal.name || 'Main'}" no longer has the page below ("${belowId}") in its Components list — the Pop was refused`
        };
      }

      top.page.setInputValue('position', 'absolute');
      // Insert the destination in the stack again
      this.addChild(top.from, 0);
      top.backCallback && top.backCallback(args.backAction, args.results);

      this.setPageOutputs({
        topPageName: pageInfo.label,
        stackDepth: this._internal.stack.length - 1
      });

      this._internal.isTransitioning = true;
      top.transition.start({
        end: () => {
          this._internal.isTransitioning = false;

          top.page.setInputValue('position', 'relative');
          this.removeChild(top.page);
          this.nodeScope.deleteNode(top.page);
          // P107-C110 — the entry this back animated, not whatever is last by now: a Reset during the animation put a new start
          // page on the stack, and popping the last took THAT off, leaving the stack empty for every push after
          const at = this._internal.stack.indexOf(top);
          if (at >= 0) this._internal.stack.splice(at, 1);

          // P107-C120 (ruled "A Pop steps the browser's history back") — over the entry its push made, so the app's Back and the
          // browser's agree; it pushed the page below's URL as a new entry. A page whose push made no entry: the address is replaced
          if (top.historyEntry && this._internal.useRoutes && typeof window !== 'undefined' && window.history !== undefined) {
            this._internal.ownBacks = (this._internal.ownBacks ?? 0) + 1;
            window.history.back();
          } else this._updateUrlWithTopPage('replace');
        },
        back: true
      });

      return { ok: true };
    },
    setPageComponent(this: PageStackInstance, pageId: string, component: string) {
      const internal = this._internal;
      if (!internal.pageInfo[pageId]) internal.pageInfo[pageId] = {};
      internal.pageInfo[pageId].component = component;

      // this.scheduleRefresh();
    },
    setPagePath(this: PageStackInstance, pageId: string, path: string) {
      const internal = this._internal;
      if (!internal.pageInfo[pageId]) internal.pageInfo[pageId] = {};
      // P107-C125 — a Path that is not text (a wired null) is unset: the page takes its label's path. `matchPageFromUrl` read
      // `pagePattern[0]` of null and threw inside every reset that reached it, and the URL written said "null"
      internal.pageInfo[pageId].path = typeof path === 'string' ? path : undefined;

      //  this.scheduleRefresh();
    },
    setStartPage(this: PageStackInstance, pageId: string) {
      this._internal.startPageId = pageId;
    },
    registerInputIfNeeded: function (this: PageStackInstance, name: string) {
      if (this.hasInput(name)) {
        return;
      }

      if (name.startsWith('pageComp-'))
        return this.registerInput(name, {
          set: this.setPageComponent.bind(this, name.substring('pageComp-'.length))
        });

      if (name.startsWith('pagePath-'))
        return this.registerInput(name, {
          set: this.setPagePath.bind(this, name.substring('pagePath-'.length))
        });

      if (name === 'startPage')
        return this.registerInput(name, {
          set: this.setStartPage.bind(this)
        });
    }
  },
  setup(context: NodeContextLike, graphModel: GraphModelLike) {
    if (!context.editorConnection || !context.editorConnection.isRunningLocally()) {
      return;
    }
    const editorConnection: EditorConnectionLike = context.editorConnection;

    function _managePortsForNode(node: GraphNodeModel) {
      function _updatePorts() {
        const ports = [];

        const pages = node.parameters['pages'] as PageListItem[] | undefined;
        if (pages !== undefined && pages.length > 0) {
          pages.forEach((p) => {
            // Component for page
            /*
             * SIG-003 — dynamic, and connectable, so it reaches the connection
             * popup. `isPortConnectable` only refuses `allowEditOnly` object
             * types, and these two are `'component'` and `'string'`; with no
             * `group` both landed under `Other` on every Page Stack that has
             * pages. `Pages` is the heading the Router already uses for the
             * same subject.
             */
            ports.push({
              name: 'pageComp-' + p.id,
              displayName: 'Component',
              editorName: p.label + ' | Component',
              plug: 'input',
              type: 'component',
              group: 'Pages',
              parent: 'pages',
              parentItemId: p.id
            });

            // Path for page
            if (node.parameters['useRoutes'] === true) {
              ports.push({
                name: 'pagePath-' + p.id,
                displayName: 'Path',
                editorName: p.label + ' | Path',
                plug: 'input',
                type: 'string',
                group: 'Pages',
                default: p.label.replace(/\s+/g, '-').toLowerCase(),
                parent: 'pages',
                parentItemId: p.id
              });
            }
          });

          ports.push({
            plug: 'input',
            type: {
              name: 'enum',
              enums: pages.map((p) => ({
                label: p.label,
                value: p.id
              })),
              allowEditOnly: true
            },
            group: 'General',
            displayName: 'Start Page',
            name: 'startPage',
            default: pages[0].id
          });
        }

        editorConnection.sendDynamicPorts(node.id, ports);
      }

      _updatePorts();
      node.on('parameterUpdated', function (ev) {
        if (ev.name === 'pages' || ev.name === 'useRoutes') _updatePorts();
      });
    }

    graphModel.on('editorImportComplete', () => {
      graphModel.on('nodeAdded.Page Stack', function (node: GraphNodeModel) {
        _managePortsForNode(node);
      });

      for (const node of graphModel.getNodesWithType('Page Stack')) {
        _managePortsForNode(node);
      }
    });
  }
};

export default createNodeFromReactComponent(PageStack);
