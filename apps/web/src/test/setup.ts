import '@testing-library/jest-dom/vitest';

// jsdom n'implémente pas ces API (Pointer Events, scroll) utilisées par les
// composants Radix UI (Select, notamment) : polyfill minimal pour permettre
// aux interactions simulées par @testing-library/user-event de fonctionner.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
