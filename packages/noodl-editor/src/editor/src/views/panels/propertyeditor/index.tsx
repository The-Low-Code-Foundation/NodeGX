import React, { useEffect, useRef, useState } from 'react';

import { NodeGraphNode } from '@noodl-models/nodegraphmodel';
import { SidebarModel } from '@noodl-models/sidebar';
import { SidebarModelEvent } from '@noodl-models/sidebar/sidebarmodel';
import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

import { ScrollArea } from '@noodl-core-ui/components/layout/ScrollArea';
import { Tabs, TabsTab, TabsVariant } from '@noodl-core-ui/components/layout/Tabs';
import { BasePanel } from '@noodl-core-ui/components/sidebar/BasePanel';

import { Frame } from '../../common/Frame';
import { ToastLayer } from '../../ToastLayer/ToastLayer';
import { AiChat } from './components/AiChat';
import { NodeComment } from './components/NodeComment';
import { NodeLabel } from './components/NodeLabel';
import { PortsTab } from './components/PortsTab';
import { PropertyEditor as PropertyEditorView } from './propertyeditor';

const TAB_AI_CHAT = 'AI Chat';
const TAB_PROPERTIES = 'Properties';
const TAB_PORTS = 'Ports';
/** CHR-009 R7 (Richard, 2026-09-15): the comment is a tab beside `Ports`, not a box above the strip. */
const TAB_COMMENT = 'Comment';

/**
 * FH-020: which tab is open, remembered per *panel* rather than per node.
 *
 * Written when the panel was remounted on every node selection. CHR-008 §3.4 keeps it
 * mounted, so `Tabs` holds the choice itself across ordinary clicks — but the strip is
 * rebuilt (re-keyed below) whenever `AI Chat` appears or disappears, and this is what
 * carries the choice over that rebuild. Keeping `Ports` open while travelling from
 * node to node is the whole point of the "pathway helper" job.
 */
let rememberedTab: string = TAB_PROPERTIES;

/**
 * CHR-008 §3.4 — how many frames a newly selected node's rows get to draw off screen
 * before the panel shows them anyway. On 0.2.4 the remount took from 47 ms (blank) to
 * 115 ms (rows at the remembered offset); past this limit a node is shown as it is
 * rather than not at all.
 */
const REVEAL_FRAME_LIMIT = 8;

/** Whether a view's rows exist: its ports root has rendered and no row is still an empty host. */
function hasDrawnRows(view: PropertyEditorView): boolean {
  const ports: HTMLElement | undefined = view.portsView?.el;
  return Boolean(ports && ports.childElementCount > 0 && !ports.querySelector('.properties > :empty'));
}

export function NodeGraphNodeRename(model: NodeGraphNode, newname: string) {
  model.setLabel(newname, { undo: true, label: 'change label' });
}

export function NodeGraphNodeDelete(model: NodeGraphNode) {
  if (!model.canBeDeleted()) {
    ToastLayer.showError('This node cannot be deleted');
    return;
  }

  const graph = model.owner;
  const undo = new UndoActionGroup({ label: 'delete node' });
  graph.removeNode(model, { undo: undo });
  UndoQueue.instance.push(undo);
}

/** Whether `model` has a comment, kept current through undo and every other writer of `setComment`. */
function useHasComment(model: NodeGraphNode | undefined): boolean {
  const [hasComment, setHasComment] = useState(() => Boolean(model?.getComment()));

  useEffect(() => {
    if (!model) return;
    // A per-effect object: `off(group)` removes every listener registered under that group.
    const group = {};
    setHasComment(Boolean(model.getComment()));
    model.on('commentChanged', () => setHasComment(Boolean(model.getComment())), group);
    return () => {
      model.off(group);
    };
  }, [model]);

  return hasComment;
}

export interface PropertyEditorProps {
  model: NodeGraphNode;
}

export function PropertyEditor(props: PropertyEditorProps) {
  const [group] = useState({});
  const [instance, setInstance] = useState<PropertyEditorView>(null);
  const shown = useRef<PropertyEditorView>(null);

  useEffect(() => {
    // CHR-008 §3.4: this component stays mounted when the selection moves (`followsSelection`), so
    // a new node arrives as a new `model`. Its view is built and drawn OFF screen while the previous
    // node's view stays up, and swapped in once its rows exist — the panel goes from one node
    // straight to the next instead of blank, then rows at the top, then a jump.
    const instance = new PropertyEditorView(props);
    instance.render();

    let revealed = false;
    let frames = 0;
    let handle = requestAnimationFrame(function reveal() {
      if (!hasDrawnRows(instance) && ++frames < REVEAL_FRAME_LIMIT) {
        handle = requestAnimationFrame(reveal);
        return;
      }
      revealed = true;
      setInstance(instance);
    });

    SidebarModel.instance.on(
      SidebarModelEvent.receivedCommand,
      (panelId, command, args) => {
        if (panelId !== 'PropertyEditor') return;

        // Disable double click for AI Nodes
        // For now lets allow Function nodes (JavaScriptFunction)
        const aiAssistant = props.model?.metadata?.AiAssistant;
        if (aiAssistant && props.model?.typename !== 'JavaScriptFunction') return;

        switch (command) {
          case 'doubleClick': {
            instance.doubleClick(args.model);
            break;
          }
        }
      },
      group
    );

    return function () {
      cancelAnimationFrame(handle);
      SidebarModel.instance.off(group);
      // Selected past before it was ever shown: nothing else will dispose it.
      if (!revealed) instance.dispose();
    };
  }, [props.model]);

  useEffect(() => {
    if (!instance) return;
    // Runs after `Frame` (a child) has put `instance.el` in place, in the same flush: the previous
    // view lets go of the shared scroller, then this one restores its node's offset — before paint.
    const previous = shown.current;
    shown.current = instance;
    if (previous && previous !== instance) previous.dispose();
    instance.portsView?.restoreScroll();
  }, [instance]);

  useEffect(() => () => shown.current?.dispose(), []);

  // The header and the tabs follow the node whose rows are SHOWN, so the label cannot change a few
  // frames before the rows under it do.
  const model: NodeGraphNode = instance?.model ?? props.model;
  const aiAssistant = model?.metadata?.AiAssistant;

  /*
   * PNL-005: the property editor gets the shared `PanelHeader`, like every other
   * registered panel.
   *
   * It is not a duplicate of the node header below it. That bar (PNL-007 /
   * PAR-002 own its *contents* — the node name, the type chip, rename/docs/
   * delete) names the *subject*; this one names the *panel*, and it is the only
   * thing that carries the side panel's own mode controls. Without it, selecting
   * a node switched to a panel with no widen, no hide and no float/full at all —
   * `PanelHeader`'s mode slot is where those live.
   *
   * `UNSAFE_style` keeps PAR-002's bg-1 ground; `UNSAFE_content_style` drops
   * `BasePanel`'s insets because the legacy `Frame` views underneath bring their
   * own, and `isFill` keeps the flex chain Root → Inner → ChildrenContainer →
   * ScrollArea → Frame exactly the shape it already was.
   */
  return (
    <BasePanel
      title="Properties"
      isFill
      UNSAFE_style={{ backgroundColor: 'var(--theme-color-bg-1)' }}
      UNSAFE_content_style={{ paddingInline: 0, paddingTop: 0 }}
    >
      <PropertyEditorTabs {...props} model={model} instance={instance} hasAiAssistant={Boolean(aiAssistant)} />
    </BasePanel>
  );
}

/**
 * The panel body: a node header, then the tab strip.
 *
 * FH-020 slice 1 promoted this out of the AI-assistant-only path — the shape was
 * already built and mounted in the right container, and was reachable by about
 * one user in a hundred. `Properties | Ports` normally, with `AI Chat` in front
 * when the assistant is on. `NodeLabel` stays above the strip either way.
 *
 * The tab content is *not* kept alive: switching away unmounts the `Frame`, and
 * remounting re-appends the same long-lived `instance.el`. That is exactly what
 * the AI path has always done between `AI Chat` and `Properties`.
 */
function PropertyEditorTabs(props: PropertyEditorProps & { instance: PropertyEditorView; hasAiAssistant: boolean }) {
  const hasComment = useHasComment(props.model);

  const tabs: TabsTab[] = [
    {
      label: TAB_PROPERTIES,
      content: (
        <ScrollArea>
          <Frame instance={props.instance} isContentSize UNSAFE_style={{ flex: 1 }} />
        </ScrollArea>
      )
    },
    {
      label: TAB_PORTS,
      content: <PortsTab key={props.model?.id} model={props.model} />
    },
    {
      /*
       * LEG-005's row, moved by R7. Still unconditional — the tab is there on every node, so a
       * node with no comment still shows that comments exist (L12) — and it carries a marker once
       * one is written, so a note is never hidden behind a tab nobody opens.
       */
      label: TAB_COMMENT,
      hasMarker: hasComment,
      content: (
        <ScrollArea>{Boolean(props.model) && <NodeComment key={props.model.id} model={props.model} />}</ScrollArea>
      )
    }
  ];

  // CHR-008 §3.4: the React children below are keyed by node. They read the node once when they
  // mount (`NodeLabel`'s label state and `[]` listener, `AiChat`'s context) and were only ever
  // correct because the whole panel used to be remounted per selection. The `Frame` is NOT keyed —
  // it is what must stay put.
  if (props.hasAiAssistant) {
    tabs.unshift({
      label: TAB_AI_CHAT,
      content: (
        <AiChat
          key={props.model?.id}
          model={props.model}
          onUpdated={() => {
            // Update the property panel values
            props.instance.render();
          }}
        />
      )
    });
  }

  // A remembered `AI Chat` must not survive onto a node that has no assistant —
  // `Tabs` looks the active id up in its own list and would throw on a miss.
  const initialActiveTab = tabs.some((tab) => tab.label === rememberedTab) ? rememberedTab : TAB_PROPERTIES;

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        // PAR-002: the panel sits on bg-1 (mock `.props`); the legacy shell and
        // the header are transparent so this is the single panel ground.
        backgroundColor: 'var(--theme-color-bg-1)'
      }}
    >
      {Boolean(props.model) && <NodeLabel key={props.model.id} model={props.model} showHelp={!props.hasAiAssistant} />}

      {/* Re-keyed only when `AI Chat` comes or goes: `Tabs` looks its active id up in the current
          list and throws on a miss, and `initialActiveTab` is read once.
          CHR-009: one segmented control under the node row (was a full-bleed two-block strip). */}
      <Tabs
        key={props.hasAiAssistant ? 'with-ai-chat' : 'without-ai-chat'}
        variant={TabsVariant.Segmented}
        UNSAFE_className="property-editor-tabs"
        tabs={tabs}
        initialActiveTab={initialActiveTab}
        onChange={(activeTab) => {
          rememberedTab = activeTab;
        }}
      />
    </div>
  );
}
