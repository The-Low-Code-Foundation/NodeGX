/**
 * P102 CMP-008 (RC-5) — *Make this a token*.
 *
 * Someone built a shadow by hand in a Group's six fields. One press reads those six values, writes
 * them as a new project shadow token through the same codec the composer uses, switches the node's
 * shadow source to *From a style token* naming it, and opens the composer on the new token. **One
 * undo step for the whole thing**: ⌘Z leaves the node in Custom with its six values and removes the
 * token. The six ports keep their values underneath token mode, so switching back is not a loss.
 *
 * This is one of the two rewrites README §6.8 allows: the person pressed a button that says so.
 */
import {
  encodeShadow,
  px,
  type ColourValue,
  type PxLength,
  type ShadowModel
} from '@nodegx/project-contract/token-codecs';
import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { StyleTokensModel } from '@noodl-models/StyleTokensModel/StyleTokensModel';
import { UndoActionGroup, UndoQueue } from '@noodl-models/undo-queue-model';

import { unmountReactRoot } from '../../../../../../shared/utils/unmountReactRoot';
import PopupLayer from '../../../popuplayer';
import { openTokenComposer } from '../../StylesPanel/composer/openTokenComposer';

/** The node model the property panel edits: the two calls this needs. */
export interface ShadowNodeModel {
  getParameter(name: string): unknown;
  setParameter(name: string, value: unknown, args?: { undo?: boolean | UndoActionGroup; label?: string }): void;
  /** The node's own name, used for the default token name. */
  label?: string;
  type?: { displayName?: string; name?: string };
}

const PIECE_DEFAULTS: Record<string, number> = {
  boxShadowOffsetX: 0,
  boxShadowOffsetY: 0,
  boxShadowBlurRadius: 5,
  boxShadowSpreadRadius: 2
};

function lengthOf(raw: unknown, fallback: number): PxLength {
  if (typeof raw === 'number' && Number.isFinite(raw)) return px(raw);
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const n = Number((raw as { value: unknown }).value);
    if (Number.isFinite(n)) return px(n);
  }
  if (typeof raw === 'string') {
    const n = parseFloat(raw);
    if (Number.isFinite(n)) return px(n);
  }
  return px(fallback);
}

function colourOf(raw: unknown): ColourValue {
  const text = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : '#00000033';
  const token = /^var\((--[\w-]+)\)$/.exec(text);
  if (token) return { kind: 'token', name: token[1] };
  return { kind: 'literal', css: text };
}

/** The six custom fields as one shadow value, exactly as the runtime composes them. */
export function shadowValueOfNode(node: ShadowNodeModel): string {
  const layer = {
    inset: node.getParameter('boxShadowInset') === true,
    x: lengthOf(node.getParameter('boxShadowOffsetX'), PIECE_DEFAULTS.boxShadowOffsetX),
    y: lengthOf(node.getParameter('boxShadowOffsetY'), PIECE_DEFAULTS.boxShadowOffsetY),
    blur: lengthOf(node.getParameter('boxShadowBlurRadius'), PIECE_DEFAULTS.boxShadowBlurRadius),
    spread: lengthOf(node.getParameter('boxShadowSpreadRadius'), PIECE_DEFAULTS.boxShadowSpreadRadius),
    colour: colourOf(node.getParameter('boxShadowColor'))
  };
  const model: ShadowModel = { layers: [layer] };
  return encodeShadow(model);
}

/** `--shadow-<component>`, slugified, that no token already uses. */
export function defaultShadowTokenName(node: ShadowNodeModel, taken: (name: string) => boolean): string {
  const base =
    (node.label || node.type?.displayName || node.type?.name || 'custom')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'custom';
  let name = `--shadow-${base}`;
  for (let i = 2; taken(name); i++) name = `--shadow-${base}-${i}`;
  return name;
}

/**
 * Write the token and switch the node, as one undo step. Returns the token name.
 *
 * 🔴 One `UndoActionGroup` carries all three writes. `setParameter` takes the group as `args.undo`
 * and appends its inverse to it rather than pushing a group of its own; the token write is
 * applied directly and its inverse pushed by hand; then the group goes on the queue once.
 */
export function makeShadowTokenNow(node: ShadowNodeModel, tokens: StyleTokensModel, name: string): string {
  const value = shadowValueOfNode(node);
  const group = new UndoActionGroup({ label: `make ${name} a token` });

  const previous = tokens.getToken(name);
  tokens.setToken(name, value);
  group.push({
    do: () => tokens.setToken(name, value),
    undo: () => (previous ? tokens.setToken(name, previous.value) : tokens.deleteCustomToken(name))
  });

  node.setParameter('boxShadowSource', 'token', { undo: group });
  node.setParameter('boxShadowToken', `var(${name})`, { undo: group });

  UndoQueue.instance.push(group);
  return name;
}

function NamePrompt({
  initial,
  taken,
  onCreate,
  onCancel
}: {
  initial: string;
  taken: (name: string) => boolean;
  onCreate: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const clean = name.trim().startsWith('--') ? name.trim() : `--${name.trim().replace(/^-+/, '')}`;
  const valid = /^--[a-z0-9-]+$/i.test(clean) && clean.length > 2;
  const collides = valid && taken(clean);
  return (
    <div style={{ width: 260, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
      <div style={{ fontWeight: 600 }}>Make this shadow a token</div>
      <div style={{ color: 'var(--theme-color-fg-default-shy)', fontSize: 11 }}>
        The six fields become one project shadow every card can wear. This node switches to it; the fields keep their
        values underneath.
      </div>
      <input
        autoFocus
        value={name}
        aria-label="Token name"
        spellCheck={false}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && valid && !collides) onCreate(clean);
          if (e.key === 'Escape') onCancel();
        }}
        style={{
          font: 'inherit',
          fontFamily: 'var(--font-family-code)',
          padding: '5px 8px',
          borderRadius: 4,
          border: '1px solid var(--theme-color-border-default)',
          background: 'var(--theme-color-bg-3)',
          color: 'var(--theme-color-fg-highlight)'
        }}
      />
      {collides && (
        <div style={{ color: 'var(--theme-color-fg-danger)', fontSize: 11 }}>
          A token with that name already exists.
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button type="button" onClick={onCancel} style={{ font: 'inherit', padding: '5px 10px' }}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid || collides}
          onClick={() => onCreate(clean)}
          style={{ font: 'inherit', padding: '5px 10px', fontWeight: 600 }}
        >
          Create token
        </button>
      </div>
    </div>
  );
}

/** The button's handler: ask for a name, then write, switch and open the composer on the new token. */
export function makeShadowToken(args: { node: ShadowNodeModel; anchor: HTMLElement }): void {
  const { node, anchor } = args;
  const tokens = new StyleTokensModel();
  const taken = (name: string) => tokens.getToken(name) !== undefined;

  const div = document.createElement('div');
  const root = createRoot(div);
  let popout: ReturnType<typeof PopupLayer.instance.showPopout> | null = null;
  let created = false;

  const close = () => popout && PopupLayer.instance.hidePopout(popout);

  flushSync(() =>
    root.render(
      <NamePrompt
        initial={defaultShadowTokenName(node, taken)}
        taken={taken}
        onCancel={close}
        onCreate={(name) => {
          created = true;
          makeShadowTokenNow(node, tokens, name);
          close();
          const token = tokens.getToken(name);
          if (!token) return;
          // The composer opens once, at creation (RC-5); editing it from the node later is P103.
          openTokenComposer({
            token,
            anchor,
            tokens: tokens.getTokens(),
            model: tokens,
            onClosed: () => tokens.dispose()
          });
        }}
      />
    )
  );

  popout = PopupLayer.instance.showPopout({
    content: { el: div },
    attachTo: anchor,
    position: 'right',
    onClose: () => {
      unmountReactRoot(root);
      if (!created) tokens.dispose();
    }
  });
}

/** The row the Box Shadow group draws under its six fields while the source is Custom. */
export function MakeShadowTokenRow({ node }: { node: ShadowNodeModel }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 8px 6px' }}>
      <button
        type="button"
        data-test="make-shadow-token"
        title="Turn these six fields into a project shadow token this node and others can wear"
        onClick={(e) => makeShadowToken({ node, anchor: e.currentTarget })}
        style={{
          font: 'inherit',
          fontSize: 11,
          padding: '4px 10px',
          borderRadius: 4,
          border: '1px solid var(--theme-color-border-default)',
          background: 'var(--theme-color-bg-3)',
          color: 'var(--theme-color-fg-default)',
          cursor: 'pointer'
        }}
      >
        Make this a token…
      </button>
    </div>
  );
}
