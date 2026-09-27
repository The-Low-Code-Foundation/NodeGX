/**
 * Entry point. Bundled by scripts/build-admin-app.js into one IIFE that the
 * served document carries inline; see AdminDashboardRoutes for the CSP.
 */
import { render } from 'preact';

import { bootSession } from './api';
import { initTheme } from './theme';
import { App } from './App';

initTheme();
const root = document.getElementById('root');
if (root) render(<App />, root);
void bootSession();
