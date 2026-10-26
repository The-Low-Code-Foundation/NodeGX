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
  // BETA-S9-BUTTONSHADOW (ruled 2026-10-26, "both have it"): the filled looks turn the Button's own shadow on, the
  // shadow an agent's Button has always had. They said `boxShadow: 'var(--shadow-sm)'`, which no port reads, so a
  // dropped Button had none while the style vocabulary turned it on (as the string `'true'`, an error) for an agent's.
  // Every door that reads this file (the picker's drop, the shipped Looks, the vocabulary) now copies the same port.
  // ⚠️ Wearing the `--shadow-sm` token instead (`boxShadowSource: 'token'` + `boxShadowToken`) was built and measured:
  // three looks' worth took `get_style_vocabulary`'s prompt to 4,403 of 4,400, and in the defaults the two token
  // ports are dead on the flat looks (the validator's `inactive-conditional-parameter`).

  variants: {
    primary: {
      backgroundColor: 'var(--primary)',
      color: 'var(--primary-foreground)',
      boxShadowEnabled: true,
      states: {
        hover: { backgroundColor: 'var(--primary-hover)' },
        active: { transform: 'scale(0.98)' },
        disabled: { opacity: '0.5', cursor: 'not-allowed' }
      }
    },

    secondary: {
      backgroundColor: 'var(--secondary)',
      color: 'var(--secondary-foreground)',
      boxShadowEnabled: true,
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
      boxShadowEnabled: true,
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
