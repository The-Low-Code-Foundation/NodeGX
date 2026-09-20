import React from 'react';
import { Root } from 'react-dom/client';

import View from '../../../../../../shared/ListenableView';
import { PropertyTabs } from '../components/PropertyTabs';
import { scopeRowOf } from '../model/scopeRows';
import { createReactRoot, unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';

function setElementVisible(el: HTMLElement, visible: boolean) {
  if (el) el.style.display = visible ? '' : 'none';
}

function appendChildEl(parent: HTMLElement, el: HTMLElement) {
  if (el) parent.appendChild(el);
}

export class TabGroup extends View {
  tabGroup: TSFixme;
  views: TSFixme[];
  tabs: string[];
  el: HTMLElement;
  group: TSFixme;
  parent: TSFixme;

  private tabsHost: HTMLElement | null = null;
  private tabsRoot: Root | null = null;
  private propertiesEl: HTMLElement | null = null;

  constructor(args) {
    super();
    this.group = args.group;
    this.tabGroup = args.tabGroup;
    this.parent = args.parent;
    this.views = [];
    this.tabs = [];
  }

  private get selectedTab() {
    return this.parent._selectedTabForGroup[this.tabGroup] || this.tabs[0];
  }

  render() {
    const div = document.createElement('div');
    div.className = 'property-tab-group';

    if (!this.tabsHost) this.tabsHost = document.createElement('div');
    div.appendChild(this.tabsHost);

    this.propertiesEl = document.createElement('div');
    this.propertiesEl.className = 'properties';
    div.appendChild(this.propertiesEl);

    this.el = div;

    if (!this.tabsRoot) {
      this.tabsRoot = createReactRoot(this.tabsHost);
    }
    this.renderTabs();

    // CHR-009 slice 7: a segment marks a side that holds its own value, and an edit (or undo) in the
    // rows below does not re-render the panel. `render` can run again: re-bind, never stack.
    const model = this.parent.model;
    if (model) {
      model.off(this);
      model.on('parametersChanged', () => this.renderTabs(), this);
    }

    const selectedTab = this.selectedTab;
    this.views.forEach((v) => {
      v.render();
      appendChildEl(this.propertiesEl, v.el);

      if (v.port.tab.tab !== selectedTab) setElementVisible(v.el, false);
    });

    return this.el;
  }

  private renderTabs() {
    if (!this.tabsRoot) return;

    const parameters = (this.parent.model && this.parent.model.parameters) || {};
    const views = this.views.map((v) => ({ tab: v.port.tab.tab, portName: v.port.name }));

    this.tabsRoot.render(
      React.createElement(PropertyTabs, {
        row: scopeRowOf(this.tabGroup, this.tabs, views, this.selectedTab, parameters),
        onTabClicked: (tab: string) => this.onTabClicked(tab)
      })
    );
  }

  onTabClicked(tab: string) {
    const selectedTab = (this.parent._selectedTabForGroup[this.tabGroup] = tab);
    this.views.forEach((v) => {
      setElementVisible(v.el, v.port.tab.tab === selectedTab);
    });

    this.renderTabs();
  }

  addView(view) {
    this.views.push(view);
    if (this.tabs.indexOf(view.port.tab.tab) === -1) this.tabs.push(view.port.tab.tab);
  }

  dispose() {
    this.parent.model && this.parent.model.off(this);
    if (this.tabsRoot) {
      unmountReactRoot(this.tabsRoot);
      this.tabsRoot = null;
    }
  }
}
