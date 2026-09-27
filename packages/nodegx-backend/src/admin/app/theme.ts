/**
 * Light and dark (BMG-001 §3.4). The tokens come from core-ui's colors.css,
 * copied by the build: `:root` is dark, `:root[data-theme='light']` is light.
 * `prefers-color-scheme` picks; a toggle in the top bar remembers in
 * localStorage. `data-theme` is stamped on <html> so the tokens flip.
 */
import { createStore, useStore } from './store';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'auto';

const KEY = 'nodegx.admin.theme';

function stored(): ThemePreference {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function systemTheme(): Theme {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveTheme(pref: ThemePreference): Theme {
  return pref === 'auto' ? systemTheme() : pref;
}

export const themeStore = createStore<{ preference: ThemePreference; theme: Theme }>({
  preference: 'auto',
  theme: 'dark'
});

function apply(pref: ThemePreference) {
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute('data-theme', theme);
  themeStore.set({ preference: pref, theme });
}

export function initTheme(): void {
  apply(stored());
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (themeStore.get().preference === 'auto') apply('auto');
    });
  } catch {
    /* no matchMedia */
  }
}

export function setTheme(pref: ThemePreference): void {
  try {
    if (pref === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* private mode */
  }
  apply(pref);
}

/** The toggle flips between the two concrete themes; the first press leaves `auto`. */
export function toggleTheme(): void {
  setTheme(themeStore.get().theme === 'dark' ? 'light' : 'dark');
}

export function useTheme() {
  return useStore(themeStore);
}
