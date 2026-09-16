import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { ProjectModel } from '@noodl-models/projectmodel';

import { Icon, IconName } from '@noodl-core-ui/components/common/Icon';

import PopupLayer from '../../../../popuplayer';
import { ToastLayer } from '../../../../ToastLayer/ToastLayer';
import { PickVariantPopup } from './PickVariantPopup';

// Styles
require('../../../../../styles/propertyeditor/variantseditor.css');

export interface VariantsEditorProps {
  model: TSFixme;

  onEditVariant: () => void;
  onDoneEditingVariant: () => void;
}

type State = {
  variant: TSFixme;
  editMode?: boolean;
};

export class VariantsEditor extends React.Component<VariantsEditorProps, State> {
  model: VariantsEditorProps['model'];
  popout: any;
  popupAnchor: HTMLDivElement;
  private popupRoot: Root | null = null;

  constructor(props: VariantsEditorProps) {
    super(props);

    this.model = props.model;
    this.state = {
      variant: this.model.variant
      //   canUpdateVariant:_hasParameterChanges(this.model)
    };
  }

  componentDidMount() {
    /*   this.model.on(['variantUpdated','variantChanged','parametersChanged','stateTransitionsChanged','defaultStateTransitionChanged'],() => {
            this.setState({
                variant:this.model.variant,
                canUpdateVariant:_hasParameterChanges(this.model)
            })
        },this)*/

    this.model.on(
      ['variantChanged'],
      () => {
        this.setState({
          variant: this.model.variant
        });
      },
      this
    );

    ProjectModel.instance.on(
      ['variantRenamed'],
      (args) => {
        if (args.variant === this.model.variant)
          this.setState({
            variant: this.model.variant
          });
      },
      this
    );
  }

  componentWillUnmount() {
    this.model.off(this);
    // May unmount after the project singleton has been cleared.
    ProjectModel.instance?.off(this);

    if (this.popout) {
      PopupLayer.instance.hidePopout(this.popout);
    }
  }

  render() {
    let content;

    if (this.state.variant === undefined || this.state.variant.name === undefined) {
      //No variant
      // CHR-009 §2: a row in the panel's label column — `Variant`, then a field at the control
      // height — instead of a 50px bar reading "Add style variant" with a FontAwesome plus.
      content = (
        <div className="variants-section panel-head-row">
          <span className="panel-head-row-label">Variant</span>
          <button type="button" className="panel-head-row-field" onClick={this.onPickVariant.bind(this)}>
            <span className="panel-head-row-value is-placeholder">Add style variant</span>
            <Icon icon={IconName.Plus} UNSAFE_className="panel-head-row-glyph" />
          </button>
        </div>
      );
    } else if (this.state.variant !== undefined && this.state.variant.name !== undefined && !this.state.editMode) {
      //Variant
      content = (
        <div className="variants-section panel-head-row">
          <span className="panel-head-row-label">Variant</span>
          <button type="button" className="panel-head-row-field" onClick={this.onPickVariant.bind(this)}>
            <span className="panel-head-row-value">{this.state.variant.name}</span>
            <Icon icon={IconName.CaretDownUp} UNSAFE_className="panel-head-row-glyph" />
          </button>
          <button type="button" className="panel-head-row-action" onClick={this.onEditVariant.bind(this)}>
            Edit
          </button>
        </div>
      );
    } else if (this.state.variant !== undefined && this.state.variant.name !== undefined && this.state.editMode) {
      //Edit variant
      content = (
        <div style={{ width: '100%' }}>
          <div className="variants-edit-mode-header">Edit variant</div>
          <div className="variants-section">
            <label>{this.state.variant.name}</label>
            <button
              className="variants-button teal"
              style={{ marginLeft: 'auto', width: '78px' }}
              onClick={this.onDoneEditingVariant.bind(this)}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="variants-editor"
        ref={(el) => {
          this.popupAnchor = el;
        }}
      >
        {content}
      </div>
    );
  }

  performAddVariant(name) {
    if (ProjectModel.instance.findVariant(name, this.model.type)) {
      // Variant with name already exists for this node
      ToastLayer.showError('Variant with the name already exists');
      return;
    }

    this.model.createNewVariant(name, { undo: true });

    ToastLayer.showSuccess('Variant created');
  }

  onUpdateVariant(evt) {
    this.model.updateVariant({ undo: true });

    ToastLayer.showSuccess('Variant updated');

    evt.stopPropagation();
  }

  onEditVariant(evt) {
    this.props.onEditVariant && this.props.onEditVariant();

    this.setState({
      editMode: true
    });

    evt.stopPropagation();
  }

  onDoneEditingVariant(evt) {
    this.props.onDoneEditingVariant && this.props.onDoneEditingVariant();

    this.setState({
      editMode: false
    });

    evt.stopPropagation();
  }

  onPickVariant(evt) {
    const div = document.createElement('div');

    const variants = ProjectModel.instance.findVariantsForNodeType(this.model.type);
    const props = {
      showCreateNewVariant: variants.length === 0 || (variants.length === 1 && variants[0].name === undefined),
      model: this.model,
      hidePopout: () => {
        PopupLayer.instance.hidePopout(this.popout);
      }
    };
    this.popupRoot = createRoot(div);
    this.popupRoot.render(React.createElement(PickVariantPopup, props));

    this.popout = PopupLayer.instance.showPopout({
      content: { el: div },
      attachTo: this.popupAnchor,
      position: 'right',
      onClose: () => {
        if (this.popupRoot) {
          this.popupRoot.unmount();
          this.popupRoot = null;
        }
        this.popout = undefined;
      }
    });

    evt.stopPropagation();
  }
}
