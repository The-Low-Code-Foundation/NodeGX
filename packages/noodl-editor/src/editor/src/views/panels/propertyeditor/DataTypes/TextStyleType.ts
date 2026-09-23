import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { EventDispatcher } from '../../../../../../shared/utils/EventDispatcher';
import TextStylePicker from '../../../TextStylePicker/TextStylePicker';
import { getEditType } from '../utils';
import { PickerTypeView } from './PickerTypeView';
import { unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';

export class TextStyleType extends PickerTypeView {
  private pickerRoot: Root | null = null;
  private pickerProps: TSFixme = {};

  static fromPort(args) {
    const view = new TextStyleType();

    const p = args.port;
    const parent = args.parent;

    view.port = p;
    view.displayName = p.displayName ? p.displayName : p.name;
    view.name = p.name;
    view.type = getEditType(p);
    view.group = p.group;
    view.value = parent.model.getParameter(p.name);
    view.parent = parent;
    view.isConnected = parent.model.isPortConnected(p.name, 'target');
    view.isDefault = parent.model.parameters[p.name] === undefined;

    return view;
  }

  render() {
    const el = super.render();

    EventDispatcher.instance.off(this); // safeguard against multiple renders
    EventDispatcher.instance.on(
      'Model.stylesChanged',
      (event) => {
        if (event.args.type === 'text') {
          this.resetToDefault();
        }
      },
      this
    );

    return el;
  }

  protected openPicker(anchor: HTMLElement) {
    const props: TSFixme = (this.pickerProps = {});

    props.selectedStyle = this.getCurrentValue().value;
    props.inputValue = (anchor as HTMLInputElement).value;

    props.onItemSelected = (name: string) => {
      this.commit(name ?? '');
      this.parent.hidePopout();
    };

    const div = document.createElement('div');
    this.pickerRoot = createRoot(div);
    this.pickerRoot.render(React.createElement(TextStylePicker, props));

    this.parent.showPopout({
      content: { el: div },
      attachTo: this.el,
      position: 'right',
      onClose: () => {
        if (this.pickerRoot) {
          unmountReactRoot(this.pickerRoot);
          this.pickerRoot = null;
        }
      }
    });
  }

  protected filterPicker(text: string) {
    if (!this.pickerRoot) return;

    this.pickerProps.filter = text;
    this.pickerRoot.render(React.createElement(TextStylePicker, this.pickerProps));
  }

  protected onEnterPressed() {
    this.parent.hidePopout();
  }

  protected commit(value: string) {
    super.commit(value);
    this.refreshChildPortViews();
  }

  /**
   * The child ports (font family, size, etc.) derive their default values from
   * the selected style, so views showing a default value must refresh.
   */
  private refreshChildPortViews() {
    if (this.parent.views && this.port.type.childPorts) {
      const prefix = this.port.type.childPortPrefix;
      for (const childPort of this.port.type.childPorts) {
        const portName = prefix + childPort;
        for (const portView of this.parent.views) {
          if (portView.isDefault && portView.port && portView.port.name === portName) {
            //resetToDefault actually doesn't reset, it just updates the value in the DOM to the current value from the model
            portView.resetToDefault && portView.resetToDefault();
          }
        }
      }
    }
  }
}
