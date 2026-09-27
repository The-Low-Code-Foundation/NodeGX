/**
 * Before the suite: build the admin manager app (BMG-001).
 *
 * `AdminDashboardRoutes` requires `build/admin/app.js.txt` and `tokens.css`,
 * which are build products (gitignored). Building them here — under a second
 * — is what keeps "the tests grade the working tree" true for the browser half
 * of the backend, the same way tests/text-transformer.js does for the shell.
 */
'use strict';

module.exports = async function globalSetup() {
  const { buildAdminApp } = require('../scripts/build-admin-app');
  await buildAdminApp();
};
