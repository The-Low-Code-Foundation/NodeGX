'use strict';
// Interpolation shapes (start, end, t) -> value, endpoints baked in. Arithmetic kept in the same
// order as the format's ease-curves module so floating point lands on the same bits.

const shapes = Object.create(null);

shapes.linear = (a, b, t) => a + (b - a) * t;

shapes.easeInQuadratic = (a, b, t) => (b - a) * (t * t) + a;
shapes.easeOutQuadratic = (a, b, t) => -(b - a) * t * (t - 2.0) + a;
shapes.easeInOutQuadratic = (a, b, t) => {
  t *= 2.0;
  if (t < 1.0) return ((b - a) / 2.0) * t * t + a;
  t -= 1.0;
  return (-(b - a) / 2.0) * (t * (t - 2) - 1.0) + a;
};

shapes.easeInCubic = (a, b, t) => (b - a) * (t * t * t) + a;
shapes.easeOutCubic = (a, b, t) => {
  t--;
  return (b - a) * (t * t * t + 1.0) + a;
};
shapes.easeInOutCubic = (a, b, t) => {
  t *= 2.0;
  if (t < 1.0) return ((b - a) / 2.0) * t * t * t + a;
  t -= 2.0;
  return ((b - a) / 2.0) * (t * t * t + 2.0) + a;
};

shapes.easeInQuartic = (a, b, t) => (b - a) * (t * t * t * t) + a;
shapes.easeOutQuartic = (a, b, t) => {
  t--;
  return -(b - a) * (t * t * t * t - 1.0) + a;
};
shapes.easeInOutQuartic = (a, b, t) => {
  t *= 2.0;
  if (t < 1.0) return ((b - a) / 2.0) * t * t * t * t + a;
  t -= 2.0;
  return (-(b - a) / 2.0) * (t * t * t * t - 2.0) + a;
};

shapes.easeIn = shapes.easeInCubic;
shapes.easeOut = shapes.easeOutCubic;
shapes.easeInOut = shapes.easeInOutCubic;

/** The shape a stored name looks up, or null for a name the set lacks. */
function shapeNamed(name) {
  const key = String(name);
  return Object.prototype.hasOwnProperty.call(shapes, key) ? shapes[key] : null;
}

module.exports = { shapeNamed };
