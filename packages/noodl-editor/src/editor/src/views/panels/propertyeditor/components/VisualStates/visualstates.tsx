import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { Icon, IconName } from '@noodl-core-ui/components/common/Icon';

import { TransitionEditor } from './TransitionEditor';
import { unmountReactRoot } from '../../../../../../../shared/utils/unmountReactRoot';

// Styles
require('../../../../../styles/propertyeditor/visualstates.css');

export interface VisualStatesProps {
  model: TSFixme;
  portsView: TSFixme;

  onVisualStateChanged: (state: TSFixme) => void;
}

type State = {
  visualStates: TSFixme;
  selectedVisualState: TSFixme;
  visualStateTransitions: TSFixme;
  showTransitions?: boolean;
  showStatesSelector?: boolean;
};

export class VisualStates extends React.Component<VisualStatesProps, State> {
  popupAnchor: TSFixme;
  private popupRoot: Root | null = null;

  constructor(props: VisualStatesProps) {
    super(props);

    const states = props.model.getVisualStates();
    this.state = {
      visualStates: states,
      selectedVisualState: states[0],
      visualStateTransitions: props.model.getPossibleTransitionsForState(states[0].name)
    };

    props.model.on(['parametersChanged'], () => {
      this.setState({
        visualStateTransitions: props.model.getPossibleTransitionsForState(this.state.selectedVisualState.name)
      });
    });
  }

  onVisualStateClicked(state) {
    this.props.onVisualStateChanged(state);
    this.setState({
      // Closed here: the list used to sit inside the toggle, and the click bubbling to it closed it.
      showStatesSelector: false,
      selectedVisualState: state,
      visualStateTransitions: this.props.model.getPossibleTransitionsForState(state.name)
    });
  }

  onToggleTransitionsClicked() {
    this.setState({
      showTransitions: !this.state.showTransitions
    });
  }

  renderVisualStates() {
    // HLT-003 — keyed on `name`, and the `react/jsx-key` suppression that used
    // to sit on this line is gone.
    //
    // 🔴 The lint had already found this defect and been switched off, which is
    // the phase's own thesis showing up in one line of code: React logged *"Each
    // child in a list should have a unique `key` prop … Check the render method
    // of `VisualStates`"* in Richard's 2026-09-20 session, and the rule that
    // would have caught it before it shipped was disabled rather than answered.
    //
    // `name` is the identity, not `label` and not the index: a visual state is
    // declared as `{ name: 'hover', label: 'Hover' }` (see any node in
    // `noodl-viewer-react/src/nodes/visual`), `name` is what every transition
    // and every stored parameter is keyed on, and two states of one node type
    // cannot share it. An index would have silenced React and left the rows
    // unable to keep their identity across a reorder, which is the one thing a
    // key is for.
    return this.state.visualStates.map((state) => (
      <div
        key={state.name}
        className="property-editor-visual-state-item"
        onClick={this.onVisualStateClicked.bind(this, state)}
      >
        <div
          className={
            'property-editor-visual-state-item-label ' + (this.state.selectedVisualState === state ? 'selected' : '')
          }
        >
          {state.label}
        </div>
      </div>
    ));
  }

  onCurrentStateClicked() {
    this.setState({
      showStatesSelector: !this.state.showStatesSelector
    });
  }

  onTransitionsClicked(evt) {
    const div = document.createElement('div');

    const props = {
      model: this.props.model,
      visualState: this.state.selectedVisualState
    };
    this.popupRoot = createRoot(div);
    this.popupRoot.render(React.createElement(TransitionEditor, props));

    this.props.portsView.showPopout({
      arrowColor: '#444444',
      content: { el: div },
      attachTo: this.popupAnchor,
      position: 'right',
      onClose: () => {
        if (this.popupRoot) {
          unmountReactRoot(this.popupRoot);
          this.popupRoot = null;
        }
      }
    });

    evt.stopPropagation();
  }

  render() {
    return (
      // CHR-009 §2: `State` as a row in the panel's label column (was "Neutral state ⇕" on a 50px bar).
      <div
        className="variants-section property-editor-visual-states panel-head-row"
        style={{ position: 'relative' }}
        ref={(el) => {
          this.popupAnchor = el;
        }}
      >
        <span className="panel-head-row-label">State</span>
        <button type="button" className="panel-head-row-field" onClick={this.onCurrentStateClicked.bind(this)}>
          <span className="panel-head-row-value">{this.state.selectedVisualState.label}</span>
          <Icon icon={IconName.CaretDownUp} UNSAFE_className="panel-head-row-glyph" />
        </button>

        {/* A sibling of the field, not inside it: a <button> may not hold the list. */}
        {this.state.showStatesSelector ? (
          <div
            className="visual-states-popup"
            style={{ position: 'absolute', zIndex: '10', top: '30px', left: '140px' }}
          >
            {this.renderVisualStates()}
          </div>
        ) : null}

        {this.state.visualStateTransitions.length > 0 ? (
          <button type="button" className="panel-head-row-action" onClick={this.onTransitionsClicked.bind(this)}>
            Transitions
          </button>
        ) : null}
      </div>
    );
  }
}
