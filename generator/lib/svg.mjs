// Small, dependency-free helpers for writing SVG by hand.

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const r2 = (n) => Math.round(n * 100) / 100;

export const formatInt = (n) => Math.round(n).toLocaleString('en-US');

// A column grown from a baseline. Square ends: the system is print, not app.
export function column(x, yBase, w, h) {
  if (h <= 0) return '';
  return `M${r2(x)} ${r2(yBase)}V${r2(yBase - h)}H${r2(x + w)}V${r2(yBase)}Z`;
}

let uid = 0;
export const id = (prefix) => `${prefix}${(++uid).toString(36)}`;
