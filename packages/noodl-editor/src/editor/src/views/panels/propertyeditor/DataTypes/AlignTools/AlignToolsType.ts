import React from 'react';
import { createRoot, Root } from 'react-dom/client';

import { AlignConnection, AlignToolsInput } from '../../components/AlignToolsInput';
import { TypeView } from '../../TypeView';
import { getConnectionSourceLabel, getConnectionSourceNavigate } from '../../utils';

export class AlignToolsType extends TypeView {
  defaults: TSFixme;
  values: TSFixme;
  ports: TSFixme;
  el: TSFixme;
  private root: Root | null = null;

  constructor() {
    super();
    this.defaults = {};
    this.values = {};
    this.ports = {};
  }

  static fromPort(args) {
    const p = args.port;
    const parent = args.parent;

    let toolTypeId = 'aligntools-' + p.group;
    if (
      p.type.alignComp === 'justify-content' ||
      p.type.alignComp === 'align-items' ||
      p.type.alignComp === 'align-content'
    ) {
      toolTypeId += '-' + p.type.alignComp;
    }

    if (!parent._toolsType[toolTypeId]) {
      const view = (parent._toolsType[toolTypeId] = new AlignToolsType());

      view.parent = parent;
      view.group = p.group;

      view.addComponentPort(p);

      return view;
    } else {
      parent._toolsType[toolTypeId].addComponentPort(p);
    }
  }

  private isVertical() {
    return this.parent.model.parameters.flexDirection !== 'row';
  }

  render() {
    const div = document.createElement('div');
    div.style.width = '100%';

    if (!this.root) {
      this.root = createRoot(div);
    }

    // The align-items/justify-content icons rotate with the flex direction,
    // and undo/redo changes the alignment parameters under us
    this.parent.model.on(
      'parametersChanged',
      () => {
        Object.keys(this.ports).forEach((comp) => {
          this.values[comp] = this.parent.model.parameters[this.ports[comp].name];
        });
        this.renderReact();
      },
      this
    );

    this.renderReact();

    this.el = div;
    return this.el;
  }

  private renderReact() {
    if (!this.root) return;

    this.root.render(
      React.createElement(AlignToolsInput, {
        // CHR-009 slice 5: one row per port, so the view hands over the ports, not a merged strip.
        ports: Object.keys(this.ports).map((comp) => this.ports[comp]),
        values: { ...this.values },
        isVertical: this.isVertical(),
        connections: this.connections(),
        onChange: (comp: string, value: string) => {
          this.values[comp] = value;
          this.parent.model.setParameter(this.ports[comp].name, value, {
            undo: true,
            label: 'alignment changed'
          });
          this.renderReact();
        },
        onReset: (comp: string) => {
          if (this.values[comp] === undefined) return;
          this.values[comp] = undefined;
          this.parent.model.setParameter(this.ports[comp].name, undefined, {
            undo: true,
            label: 'alignment changed'
          });
          this.renderReact();
        }
      })
    );
  }

  /** alignComp → the wire driving that port, for the rows that are wired (FB-018 chip per row). */
  private connections(): Record<string, AlignConnection> {
    const model = this.parent.model;
    const connections: Record<string, AlignConnection> = {};
    Object.keys(this.ports).forEach((comp) => {
      const name = this.ports[comp].name;
      if (!model.isPortConnected(name, 'target')) return;
      connections[comp] = {
        label: getConnectionSourceLabel(model, name),
        onClick: getConnectionSourceNavigate(model, name)
      };
    });
    return connections;
  }

  dispose() {
    this.parent.model.off(this);
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    super.dispose();
  }

  addComponentPort(p) {
    const comp = p.type.alignComp;

    this.ports[comp] = p;
    const value = this.parent.model.parameters[p.name];
    this.values[comp] = value;
    this.defaults[comp] = p.default;
  }
}
