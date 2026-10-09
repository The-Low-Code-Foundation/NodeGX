import BScroll from '@better-scroll/core';
import MouseWheel from '@better-scroll/mouse-wheel';
import ScrollBar from '@better-scroll/scroll-bar';
import React from 'react';

import { layerDefaults, withDefaultsClass } from '../../../default-style-layer';
import Layout from '../../../layout';
import PointerListeners from '../../../pointerlisteners';
import { Noodl } from '../../../types';
import NestedScroll from './scroll-plugins/nested-scroll-plugin';
import patchedMomentum from './scroll-plugins/patched-momentum-scroll';
import Slide from './scroll-plugins/slide-scroll-plugin';

BScroll.use(ScrollBar);
BScroll.use(NestedScroll);
BScroll.use(MouseWheel);
BScroll.use(Slide);

export interface GroupProps extends Noodl.ReactProps {
  as?: keyof React.JSX.IntrinsicElements | React.ComponentType<unknown>;

  scrollSnapEnabled: boolean;
  showScrollbar: boolean;
  scrollEnabled: boolean;
  nativeScroll: boolean;
  scrollSnapToEveryItem: boolean;
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  scrollBounceEnabled: boolean;
  clip: boolean;

  layout: 'none' | 'row' | 'column';
  blockTouch?: boolean;
  dom;

  onScrollPositionChanged?: (value: number) => void;
  onScrollStart?: () => void;
  onScrollEnd?: () => void;

  children?: React.ReactNode;
}

type ScrollRef = HTMLDivElement & { noodlNode?: Noodl.ReactProps['noodlNode'] };

export class Group extends React.Component<GroupProps> {
  scrollNeedsToInit: boolean;
  scrollRef: React.RefObject<ScrollRef>;
  iScroll?: BScroll;

  constructor(props: GroupProps) {
    super(props);
    this.scrollNeedsToInit = false;
    this.scrollRef = React.createRef();
  }

  rootRef = (el: ScrollRef | null) => {
    (this.scrollRef as React.MutableRefObject<ScrollRef | null>).current = el;
    this.props.noodlNode?.setDOMElement(el);
    // Plumbing for the focused signals: the focus tracker's click walk finds the Group by this property. Set on every element
    // the ref meets, not once at the mount — a new Tag makes React draw a new element without mounting again (P107-C86).
    if (el) el.noodlNode = this.props.noodlNode;
  };

  componentDidMount() {
    // P107-C89: read as `render` and `componentDidUpdate` read it — a truthy Native platform scroll (a wired 1) is native, so
    // the scroller never starts on children `render` did not wrap.
    if (this.props.scrollEnabled && !this.props.nativeScroll) {
      this.setupIScroll();
    }
  }

  componentWillUnmount() {
    if (this.iScroll) {
      this.iScroll.destroy();
      this.iScroll = undefined;
    }
    // GAM-012 fault 3 — no Blur on unmount any more: `NoodlReactComponent` drops the node from the
    // focus tracker, which fires nothing. A Blur here fired `Focus Lost` on the containers.
  }

  /**
   * NDA-012 (Visual) B1/B2. Both scroll actions return the reason they did nothing, or
   * `undefined` when they scrolled.
   *
   * Every failure here used to be a `child && …` or an `if (element && …)` with no else: a
   * `Scroll To Index` past the end of the list and a `Scroll To Element` pointing at something
   * the Group does not contain were both indistinguishable from success. The node raises the
   * returned reason on the runtime error bus (`group.ts`), so — unlike the editor-only
   * `sendWarning` this category is full of — the diagnosis survives into a deployed app.
   *
   * The reason is produced here rather than in the node because only the component knows which
   * scroll implementation is live: with iScroll the children hang off an inner wrapper element,
   * without it they are direct children, and "index 5 of 3" has to be counted against whichever
   * of those is actually in the DOM.
   */
  scrollToIndex(index, duration): string | undefined {
    const container = this.scrollRef.current;
    if (!container) return 'the Group has no scrollable element';

    // iScroll wraps the children in one scroller element; the plain path does not.
    const scrollParent = (this.iScroll ? container.children[0] : container) as HTMLElement | undefined;
    if (!scrollParent) return 'the Group has no scrollable element';

    const child = scrollParent.children[index] as HTMLElement | undefined;
    if (!child) {
      return `there is no child at index ${JSON.stringify(index)} — the Group has ${scrollParent.children.length}`;
    }

    if (this.iScroll) {
      this.iScroll.scrollToElement(child, duration, 0, 0);
    } else {
      child.scrollIntoView({ behavior: 'smooth' });
    }

    return undefined;
  }

  scrollToElement(noodlChild, duration): string | undefined {
    // An unwired `Element` is a port with no opinion, not a failure — Empty-Value Contract.
    if (!noodlChild) return undefined;

    /**
     * ⚠️ This was `noodlChild.getRef()`, and for an ordinary target it resolved to nothing —
     * **always**, mounted or not.
     *
     * `getRef` returns `reactComponentRef`, the pre-React-19 field. The React 19 runtime reports
     * a node's root through `setDOMElement`/`getDOMElement` instead (RUN-001), so a Text or
     * Group on `Element` handed back a ref object whose `current` was permanently `undefined`
     * and every `Scroll To Element` returned "no rendered DOM element — it may not be mounted".
     * That reason is plausible and wrong: the element was mounted, and had been for as long as
     * the page had. `getDOMElement` is a strict superset of the resolution this did by hand —
     * `_domElement`, then a host-element inner ref, then `getRef` and (on React 18) findDOMNode.
     *
     * Found by driving stream C's own pre-mount fix in the editor. The queue flushed and the
     * action reached the Group exactly as designed, and then could not find what to scroll to;
     * the B2 diagnosis this category added is the only reason it was visible at all.
     *
     * ⚠️ The SSR guard the old `instanceof HTMLElement` line carried has moved into
     * `getDOMElement` rather than been dropped — `instanceof` against an undeclared global is a
     * `ReferenceError`, not `false`, and this node declares SSR `safe`. Guarding it at the
     * accessor fixes it for every caller instead of only this one.
     */
    const element = (
      typeof noodlChild.getDOMElement === 'function' ? noodlChild.getDOMElement() : null
    ) as HTMLElement | null;

    if (!element || !element.scrollIntoView) {
      return 'the node on Element has no rendered DOM element — it may not be mounted';
    }

    const container = this.scrollRef.current;
    // `scrollIntoView` scrolls the nearest scrollable *ancestor* of the target, so an element
    // outside this Group does not fail — it silently scrolls something else, which is the
    // hardest version of this defect to spot. Say so rather than move an unrelated container.
    if (container && !container.contains(element)) {
      return 'the node on Element is not inside this Group, so scrolling it would move a different container';
    }

    if (this.iScroll) {
      this.iScroll.scrollToElement(element, duration, 0, 0);
    } else {
      element.scrollIntoView({ behavior: 'smooth' });
    }

    return undefined;
  }

  setupIScroll() {
    const { scrollSnapEnabled } = this.props;
    const scrollDirection = this.getScrollDirection();

    const snapOptions = {
      disableSetWidth: true,
      disableSetHeight: true,
      loop: false
    };

    const domElement = this.scrollRef.current;
    this.iScroll = new BScroll(domElement, {
      bounceTime: 500,
      swipeBounceTime: 300,
      scrollbar: this.props.showScrollbar ? {} : undefined,
      momentum: scrollSnapEnabled ? !this.props.scrollSnapToEveryItem : true,
      bounce: this.props.scrollBounceEnabled && !(scrollSnapEnabled && snapOptions.loop),
      scrollX: scrollDirection === 'x' || scrollDirection === 'both',
      scrollY: scrollDirection === 'y' || scrollDirection === 'both',
      slide: scrollSnapEnabled ? snapOptions : undefined,
      probeType: this.props.onScrollPositionChanged ? 3 : 1,
      click: true,
      nestedScroll: true,
      //disable CSS animation, they can cause a flicker on iOS,
      //and cause problems with probing the scroll position during an animation
      useTransition: false
    });

    //the scroll behavior when doing a momentum scroll that reaches outside the bounds
    //does a slow and unpleasant animation. Let's patch it to make it behave more like iScroll.
    const scroller = this.iScroll.scroller;
    // @ts-expect-error momentum does exist
    scroller.scrollBehaviorX && (scroller.scrollBehaviorX.momentum = patchedMomentum.bind(scroller.scrollBehaviorX));
    // @ts-expect-error momentum does exist
    scroller.scrollBehaviorY && (scroller.scrollBehaviorY.momentum = patchedMomentum.bind(scroller.scrollBehaviorY));

    //refresh the scroll view in case a child has changed height, e.g. an image loaded
    //seem to be very performant, no observed problem so far
    this.iScroll.on('beforeScrollStart', () => {
      this.iScroll.refresh();
    });

    this.iScroll.on('scrollStart', () => {
      this.props.onScrollStart && this.props.onScrollStart();
    });

    this.iScroll.on('scrollEnd', () => {
      this.props.onScrollEnd && this.props.onScrollEnd();
    });

    if (this.props.onScrollPositionChanged) {
      this.iScroll.on('scroll', () => {
        this.props.onScrollPositionChanged(scrollDirection === 'x' ? -this.iScroll.x : -this.iScroll.y);
      });
    }
  }

  componentDidUpdate(prevProps: GroupProps) {
    const scrollHasUpdated =
      prevProps.scrollSnapEnabled !== this.props.scrollSnapEnabled ||
      prevProps.onScrollPositionChanged !== this.props.onScrollPositionChanged ||
      prevProps.onScrollStart !== this.props.onScrollStart ||
      prevProps.onScrollEnd !== this.props.onScrollEnd ||
      prevProps.showScrollbar !== this.props.showScrollbar ||
      prevProps.scrollEnabled !== this.props.scrollEnabled ||
      prevProps.nativeScroll !== this.props.nativeScroll ||
      prevProps.scrollSnapToEveryItem !== this.props.scrollSnapToEveryItem ||
      prevProps.layout !== this.props.layout ||
      prevProps.flexWrap !== this.props.flexWrap ||
      prevProps.scrollBounceEnabled !== this.props.scrollBounceEnabled;

    if (scrollHasUpdated) {
      if (this.iScroll) {
        this.iScroll.destroy();
        this.iScroll = undefined;
      }

      this.scrollNeedsToInit = this.props.scrollEnabled && !this.props.nativeScroll;
    }

    // Handle scroll initialization (moved from the old componentDidUpdate)
    if (this.scrollNeedsToInit) {
      this.setupIScroll();
      this.scrollNeedsToInit = false;
    }

    if (this.iScroll) {
      setTimeout(() => {
        this.iScroll && this.iScroll.refresh();
      }, 0);
    }
  }

  renderIScroll() {
    // P107-C152, P109-S37-ISCROLLALIGN: the children sit in this box, not in the Group, so it lays them out as the Group would —
    // its gap and its alignment on both axes, not only its direction. Without them a gap was dropped, and the axis this box
    // fills (the cross axis, or the main axis when it wraps) lost Align Items or Justify Content.
    const { flexDirection, flexWrap, rowGap, columnGap, alignItems, justifyContent } = this.props.style;

    const childStyle: React.CSSProperties = {
      display: 'inline-flex',
      flexShrink: 0,
      flexDirection,
      flexWrap,
      rowGap,
      columnGap,
      alignItems,
      justifyContent,
      touchAction: 'none'
      // pointerEvents: this.state.isScrolling ? 'none' : undefined
    };

    if (flexDirection === 'row') {
      if (flexWrap === 'wrap') {
        childStyle.width = '100%';
      } else {
        childStyle.height = '100%';
      }
    } else {
      if (flexWrap === 'wrap') {
        childStyle.height = '100%';
      } else {
        childStyle.width = '100%';
      }
    }

    return (
      // `data-ndl-slots`: the cards sit in here, not in the Group's own element — drag-drop.ts counts Drop Index among them (P107-C88)
      <div className="scroll-wrapper-internal" data-ndl-slots="" style={childStyle}>
        {this.props.children}
      </div>
    );
  }

  /**
   * P107-C90 (ruled "let the list's taps through"): the blocker stops a press after the list has seen it.
   *
   * The scroller hears a move and a release on the window, and Block Pointer Events stops both at the app root first, so a
   * scroller with it on never followed a drag and never saw a tap end — it sent no click, and Click never fired. So the Group's
   * own move and release handlers hand the event to the scroller after Noodl's callback and before the stop: Pointer Up, then
   * the scroller's click (Focused, Click), as without the blocker. The page behind still hears nothing, and a release outside
   * the Group still reaches the scroller on the window. A second delivery of one release is a no-op (`end` resets the gesture).
   */
  letScrollerSee(listeners: ReturnType<typeof PointerListeners>) {
    const passes = { onMouseMove: 'move', onMouseUp: 'end', onTouchMove: 'move', onTouchEnd: 'end', onTouchCancel: 'end' } as const;
    for (const name of Object.keys(passes) as (keyof typeof passes)[]) {
      const blocker = listeners[name];
      if (!blocker) continue;
      listeners[name] = (e) => {
        blocker(e);
        // better-scroll types its gesture handlers private; they are what it registers on the window
        const actions = this.iScroll?.scroller.actionsHandler as unknown as Record<'move' | 'end', (e: Event) => void> | undefined;
        actions?.[passes[name]](e.nativeEvent);
      };
    }
    return listeners;
  }

  getScrollDirection(): 'x' | 'y' | 'both' {
    // TODO: This never returns both, why?

    if (this.props.flexWrap === 'wrap' || this.props.flexWrap === 'wrap-reverse') {
      return this.props.layout === 'row' ? 'y' : 'x';
    }

    return this.props.layout === 'row' ? 'x' : 'y';
  }

  render() {
    // React.ElementType collapses the intrinsic-elements union; with the ref prop added,
    // the raw union exceeds the compiler's representation limit (TS2590).
    // P107-C87: `||`, not a destructuring default — a default covers only undefined, and a wired "", null, 0 or false
    // reached createElement and threw. The Text reads its Tag the same way.
    const { as, ...props } = this.props;
    const Component = (as || 'div') as React.ElementType;

    const children = props.scrollEnabled && !props.nativeScroll ? this.renderIScroll() : props.children;
    
    const style = { ...props.style };
    Layout.size(style, props);
    Layout.align(style, props);

    // P107-C153: the scroller moves the inner box with a transform and leaves the hiding to its container — what lies outside
    // the Group is hidden, as on the native path, and takes no press
    if (props.clip || (props.scrollEnabled && !props.nativeScroll)) {
      style.overflowX = 'hidden';
      style.overflowY = 'hidden';
    }

    if (props.scrollEnabled && props.nativeScroll) {
      const scrollDirection = this.getScrollDirection();
      if (scrollDirection === 'y') {
        style.overflowY = 'auto';
      } else if (scrollDirection === 'x') {
        style.overflowX = 'auto';
      } else if (scrollDirection === 'both') {
        style.overflowX = 'auto';
        style.overflowY = 'auto';
      }
    }

    if (style.opacity === 0) {
      style.pointerEvents = 'none';
    }

    // P109 ISL-008 — the defaults leave the inline style for the defaults sheet, so the author's class can place this.
    const defaultsClass = layerDefaults(style);

    return (
      <Component
        className={withDefaultsClass(props.className, defaultsClass)}
        {...props.dom}
        {...(props.blockTouch ? this.letScrollerSee(PointerListeners(props)) : PointerListeners(props))}
        style={style}
        ref={this.rootRef}
      >
        {children}
      </Component>
    );
  }
}
