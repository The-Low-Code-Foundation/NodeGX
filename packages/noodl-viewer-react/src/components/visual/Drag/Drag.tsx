import React from 'react';
import Draggable from 'react-draggable';

import EaseCurves from '../../../easecurves';
import { Noodl } from '../../../types';

export interface DragProps extends Noodl.ReactProps {
  inputPositionX: number;
  inputPositionY: number;

  enabled: boolean;
  scale: number;
  axis: 'x' | 'y' | 'both';

  useParentBounds: boolean;

  onStart?: () => void;
  onStop?: () => void;
  onDrag?: () => void;

  positionX?: (value: number) => void;
  positionY?: (value: number) => void;
  deltaX?: (value: number) => void;
  deltaY?: (value: number) => void;

  children?: React.ReactNode;
}

function setDragValues(event, props) {
  props.positionX && props.positionX(event.x);
  props.positionY && props.positionY(event.y);
  props.deltaX && props.deltaX(event.deltaX);
  props.deltaY && props.deltaY(event.deltaY);
}

/** react-draggable's `canDragX` / `canDragY`: the axes Axis lets the element move on (any other value: neither). */
function canDrag(axis: DragProps['axis'], on: 'x' | 'y') {
  return axis === on || axis === 'both';
}

/** P107-C101 — what a press inside a Drag operates instead of dragging. */
const DRAG_CANCEL = 'input, textarea, select, button, a, [contenteditable]';

type State = {
  x: number
  y: number
}

export class Drag extends React.Component<DragProps, State> {
  snapToPositionXTimer: any;
  snapToPositionYTimer: any;

  /**
   * react-draggable falls back to findDOMNode (removed in React 19) unless
   * given a nodeRef. Drag renders no host element of its own — the element
   * being dragged is its child node's root — so the ref delegates to the
   * child's getDOMElement() at read time.
   */
  draggableNodeRef: React.RefObject<HTMLElement>;

  constructor(props: DragProps) {
    super(props);
    this.state = { x: 0, y: 0 } satisfies State;

    const self = this;
    this.draggableNodeRef = {
      get current() {
        const noodlNode = self.props.noodlNode;
        const child = noodlNode && noodlNode.children && noodlNode.children[0];
        return child && child.getDOMElement ? child.getDOMElement() : null;
      }
    } as React.RefObject<HTMLElement>;
  }

  /**
   * P107-C102 — what a press, a move or a let go reports. react-draggable's callbacks carry the pointer's movement on both axes
   * whatever `axis` is (it "only controls flushing to the DOM"), so on an axis Axis locks Drag X / Y said the element moved while it
   * stayed put, and jumped back at the next press. There they report where the element is, and a Delta of 0.
   */
  reportDrag(data: { x: number; y: number; deltaX: number; deltaY: number }, axis: DragProps['axis']) {
    const canX = canDrag(axis, 'x');
    const canY = canDrag(axis, 'y');
    setDragValues(
      {
        x: canX ? data.x : this.state.x,
        y: canY ? data.y : this.state.y,
        deltaX: canX ? data.deltaX : 0,
        deltaY: canY ? data.deltaY : 0
      },
      this.props
    );
  }

  snapToPosition({ timerScheduler, propCallback, duration, axis, endValue }) {
    const _this = this;
    return timerScheduler
      .createTimer({
        duration: duration === undefined ? 300 : duration,
        startValue: this.state[axis],
        endValue: endValue,
        ease: EaseCurves.easeOut,
        onRunning: function (t) {
          const value = this.ease(this.startValue, this.endValue, t);
          // @ts-expect-error Either x or y...
          _this.setState({ [axis]: value });
          propCallback && propCallback(value);
        }
      })
      .start();
  }

  /**
   * Stop both snap animations — NDA-012 (Visual), check H1.
   *
   * `TimerScheduler` keeps a running timer in `runningTimers` until something stops it
   * (`timerscheduler.ts`), and neither unmounting the component nor deleting the node does.
   * A Drag node whose page navigates away mid-snap therefore kept being ticked every frame,
   * calling `setState` on an unmounted component and `positionX`/`positionY` on a node that may
   * be gone — and holding the whole instance reachable through the scheduler.
   *
   * This is `FINDINGS.md` SR-vi's defect, in a fifth node. That sweep fixed `Animate To Value`,
   * `Transition`, `States` and `Animation` and noted that `Delay` had always been correct — and
   * every one of those five is filed under `Animation` or `Utilities`. Drag is a **Visual**
   * node that happens to animate, so no per-category read would have put it beside them. Same
   * lesson as SR-viii's fifth script host: *a class named by its exemplars inherits their
   * category*, and the defining property here is `createTimer`, not the folder.
   *
   * Called from two places on purpose. Unmount covers navigation and a Repeater dropping an
   * item; the node's `addDeleteListener` (see `drag.ts`) covers deletion in the editor, which
   * does not necessarily unmount first.
   */
  stopSnapTimers() {
    this.snapToPositionXTimer && this.snapToPositionXTimer.stop();
    this.snapToPositionYTimer && this.snapToPositionYTimer.stop();
    this.snapToPositionXTimer = undefined;
    this.snapToPositionYTimer = undefined;
  }

  componentWillUnmount() {
    this.stopSnapTimers();
  }

  componentDidMount() {
    const x = this.props.inputPositionX ? this.props.inputPositionX : 0;
    const y = this.props.inputPositionY ? this.props.inputPositionY : 0;

    this.setState({ x, y });
    setDragValues({ x, y, deltaX: 0, deltaY: 0 }, this.props);
  }

  componentDidUpdate(prevProps: DragProps) {
    const props = this.props;

    // P107-C106 — `Object.is`: a Start Drag X / Y of NaN is unchanged when it is NaN again; `!==` saw a change at every update and set
    // state until React gave up, which blanked the page
    if (!Object.is(prevProps.inputPositionX, props.inputPositionX)) {
      this.setState({ x: props.inputPositionX });
      props.positionX && props.positionX(props.inputPositionX);
      props.deltaX && props.deltaX(props.inputPositionX - prevProps.inputPositionX);
    }
    if (!Object.is(prevProps.inputPositionY, props.inputPositionY)) {
      this.setState({ y: props.inputPositionY });
      props.positionY && props.positionY(props.inputPositionY);
      props.deltaY && props.deltaY(props.inputPositionY - prevProps.inputPositionY);
    }
  }

  snapToPositionX(x, duration) {
    if (this.state.x === x) return;

    this.snapToPositionXTimer && this.snapToPositionXTimer.stop();
    this.snapToPositionXTimer = this.snapToPosition({
      timerScheduler: this.props.noodlNode.context.timerScheduler,
      propCallback: this.props.positionX,
      duration,
      axis: 'x',
      endValue: x
    });
  }

  snapToPositionY(y, duration) {
    if (this.state.y === y) return;

    this.snapToPositionYTimer && this.snapToPositionYTimer.stop();
    this.snapToPositionYTimer = this.snapToPosition({
      timerScheduler: this.props.noodlNode.context.timerScheduler,
      propCallback: this.props.positionY,
      duration,
      axis: 'y',
      endValue: y
    });
  }

  render() {
    const props = this.props;
    const bounds = props.useParentBounds ? 'parent' : undefined;

    let child;
    if (React.Children.count(props.children) > 0) {
      child = React.Children.toArray(props.children)[0];
    } else {
      return null;
    }

    return (
      <Draggable
        nodeRef={this.draggableNodeRef}
        axis={props.axis}
        bounds={bounds}
        disabled={props.enabled === false}
        /**
         * P107-C101. react-draggable cancels every `touchstart` on the element it moves, and a browser
         * that sees a cancelled `touchstart` sends no click and no focus for that touch — so on a phone
         * nothing inside a Drag could be tapped (the Site Builder's section rows: Save, Delete, the
         * fields). A press on something a person operates does not start a drag; the library checks
         * `cancel` before it cancels the touch. A press on the rest still drags.
         */
        cancel={DRAG_CANCEL}
        /**
         * NDA-012 (Visual). `props.scale || 0` was a divide by zero waiting for an empty value.
         * `react-draggable` divides every pointer delta by `scale`, so a `0` makes each delta
         * `Infinity` and the element jumps out of the document on the first movement. Measured:
         * `undefined`, `null` and a typed `0` all reached the library as `0`; the declared port
         * default of `1` only saved the untouched case. `1` is the identity, which is what the
         * fallback for "no scale given" always meant.
         */
        scale={props.scale || 1}
        position={{ x: this.state.x, y: this.state.y }}
        onStart={(e, data) => {
          this.reportDrag(data, props.axis);
          props.onStart && props.onStart();
          this.snapToPositionXTimer && this.snapToPositionXTimer.stop();
          this.snapToPositionYTimer && this.snapToPositionYTimer.stop();
        }}
        onStop={(e, data) => {
          // P107-C102 — on an axis Axis locks the element stays, and Drag X / Y say so
          const x = canDrag(props.axis, 'x') ? data.x : this.state.x;
          const y = canDrag(props.axis, 'y') ? data.y : this.state.y;
          this.setState({ x, y });
          props.positionX && props.positionX(x);
          props.positionY && props.positionY(y);
          props.onStop && props.onStop();
        }}
        onDrag={(e, data) => {
          this.reportDrag(data, props.axis);
          props.onDrag && props.onDrag();
        }}
      >
        {React.cloneElement(child, { parentLayout: props.parentLayout })}
      </Draggable>
    );
  }
}
