/**
 * STYLE-002: Button Element Config
 *
 * Defines default styles and pre-built variants for the Button node
 * (net.noodl.controls.button). All values use design token CSS variables
 * so changing a token cascades to all buttons.
 */

import { ElementConfig } from '../ElementConfigTypes';

export const ButtonConfig: ElementConfig = {
  nodeType: 'net.noodl.controls.button',

  // Applied when a Button node is first dropped onto the canvas
  defaults: {
    paddingTop: 'var(--space-2)',
    paddingBottom: 'var(--space-2)',
    paddingLeft: 'var(--space-4)',
    paddingRight: 'var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-medium)',
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--radius-md)',
    _variant: 'primary'
  },

  // P112-S7-TEXTDEFAULTS: no `cursor` (the Button has no such port) and no `borderWidth: '0'` where the variant
  // sets no `borderStyle` (the width only applies to a solid, dashed or dotted border). Neither was ever read.
  // ⚠️ `boxShadow` stays, and is still never read on a dropped Button: the style vocabulary turns it into
  // `boxShadowEnabled: 'true'` for an agent's Button, so removing it would take the shadow off what agents build.
  // Whether a dropped Button should wear that shadow too is BETA-S9-BUTTONSHADOW, a ruling.

  variants: {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      boxShadow: 'var(--shadow-sm)',
      states: {
        hover: { backgroundColor: 'var(--primary-hover)' },
        active: { transform: 'scale(0.98)' },
        disabled: { opacity: '0.5', cursor: 'not-allowed' }
      }
    },

    secondary: {
      backgroundColor: 'var(--secondary)',
      color: 'var(--secondary-foreground)',
      boxShadow: 'var(--shadow-sm)',
      states: {
        hover: { backgroundColor: 'var(--secondary-hover)' },
        active: { transform: 'scale(0.98)' },
        disabled: { opacity: '0.5', cursor: 'not-allowed' }
      }
    },

    outline: {
      backgroundColor: 'transparent',
      color: 'var(--foreground)',
      borderWidth: 'var(--border-1)',
      // DEF-001: the third control on the same 1.23:1 edge, and its `hover` was worse still —
      // `--border` over `--accent` bottoms out at **1.04:1** in `soft`, because the hover tint and
      // the hairline are neighbours on the same scale. `--border-control` clears 3:1 over both
      // `--background` and `--accent` in every preset.
      borderColor: 'var(--border-control)',
      borderStyle: 'solid',
      states: {
        hover: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
        disabled: { opacity: '0.5', cursor: 'not-allowed' }
      }
    },

    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--foreground)',
      states: {
        hover: { backgroundColor: 'var(--accent)', color: 'var(--accent-foreground)' },
        disabled: { opacity: '0.5', cursor: 'not-allowed' }
      }
    },

    destructive: {
      backgroundColor: 'var(--destructive)',
      color: 'var(--destructive-foreground)',
      boxShadow: 'var(--shadow-sm)',
      states: {
        hover: { backgroundColor: 'var(--destructive-hover)' },
        disabled: { opacity: '0.5', cursor: 'not-allowed' }
      }
    },

    // No `textDecoration` port on this node, so the underline-on-hover this
    // variant described never rendered. Dropped rather than left claiming it;
    // the variant is now the colour and the absent chrome, which is the part
    // that always worked.
    link: {
      backgroundColor: 'transparent',
      color: 'var(--primary)',
      paddingLeft: '0',
      paddingRight: '0'
    }
  }
};
