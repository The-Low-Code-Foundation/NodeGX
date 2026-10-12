/**
 * timings.log (CG-004 AC7): one JSON object per line, appended, never read by the app. The launch line is the shell's
 * (relay / backend / page, as Nightbook's); the owl adds `model-load`, the exam `exam-probe`, the route `olive`.
 * A log that cannot be written must never stop the game opening.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function createTimings(file) {
  return {
    file,
    line(obj) {
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.appendFileSync(file, JSON.stringify({ at: new Date().toISOString(), ...obj }) + '\n');
      } catch {
        // as above
      }
    },
    read() {
      try {
        return fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l));
      } catch {
        return [];
      }
    }
  };
}

module.exports = { createTimings };
