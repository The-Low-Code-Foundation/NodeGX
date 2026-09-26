// Runs before the kit: the two globals the NodeGX runtime provides.
import * as React from 'react';
globalThis.React = React;
globalThis.__nbKit = null;
globalThis.Noodl = {
  defineModule(m) {
    globalThis.__nbKit = m;
  }
};
