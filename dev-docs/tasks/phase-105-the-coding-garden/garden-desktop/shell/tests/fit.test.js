/** The zoom that fits the page to its window. Run: node --test fit.test.js */
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');

const { DESIGN_WIDTH, zoomFor, shouldMaximise } = require('../fit');

test('the tablet at 300 %: 912 DIPs wide lays the page out 1368 wide', () => {
  const z = zoomFor(912);
  assert.equal(z, 0.666);
  assert.ok(Math.abs(912 / z - DESIGN_WIDTH) < 2);
});

test('at 200 % (1368) and on a big screen the page is its real size', () => {
  assert.equal(zoomFor(1368), 1);
  assert.equal(zoomFor(2560), 1);
});

test('never below one half, and a nonsense width is no zoom', () => {
  assert.equal(zoomFor(300), 0.5);
  assert.equal(zoomFor(0), 1);
  assert.equal(zoomFor(NaN), 1);
});

test('maximised when the work area is smaller than the window asked for', () => {
  assert.equal(shouldMaximise({ width: 912, height: 568 }, { width: 1280, height: 860 }), true);
  assert.equal(shouldMaximise({ width: 2560, height: 1400 }, { width: 1280, height: 860 }), false);
});

test('the window says the game’s name (ruling 7): either language’s name passes, anything else is replaced', () => {
  const { windowTitle } = require('../fit');
  const config = require('../garden.json');
  assert.equal(windowTitle("Olive's Island", config), "Olive's Island");
  assert.equal(windowTitle("L'île d'Olive", config), "L'île d'Olive");
  // The template's htmlTitle when the game was renamed, a bare URL while loading, nothing.
  assert.equal(windowTitle('Bot Garden', config), "Olive's Island");
  assert.equal(windowTitle('127.0.0.1:47633/', config), "Olive's Island");
  assert.equal(windowTitle('', config), "Olive's Island");
});
