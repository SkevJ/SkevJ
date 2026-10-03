// Editorial primitives shared by the cards: rules that draw themselves, type that
// rises out of its own baseline, numbers that roll into place.

import { r2, id } from './svg.mjs';
import { type } from './theme.mjs';

// A horizontal rule that draws from the left.
export function rule(doc, { x1 = 8, x2 = doc.width - 8, y, weight = 1.5, delay = 0, fill }) {
  return `<rect class="growx" style="animation-delay:${delay}ms" x="${x1}" y="${r2(y - weight / 2)}" width="${r2(x2 - x1)}" height="${weight}" fill="${fill || doc.theme.rule}"/>`;
}

// One line of type that rises out of a mask sitting on its own baseline.
export function reveal(doc, runs, { x, y, delay = 0, anchor = 'start' }) {
  if (!Array.isArray(runs)) runs = [runs];
  const size = Math.max(...runs.map((r) => r.style.size));
  const clip = id('rv');
  doc.def(`<clipPath id="${clip}"><rect x="0" y="${r2(y - size * 1.02)}" width="${doc.width}" height="${r2(size * 1.2)}"/></clipPath>`);
  return `<g clip-path="url(#${clip})"><g class="lineup" style="--from:${r2(size * 1.05)}px;animation-delay:${delay}ms">${doc.text(runs, { x, y, anchor })}</g></g>`;
}

// A word with a full stop in the accent. The stop is part of the same line, so
// the font's own kerning places it; it fades in on its own beat.
export function stopped(doc, word, style, { x, y, delay = 0, stopDelay = 700 }) {
  const t = doc.theme;
  return reveal(doc, [
    { text: word, style, fill: t.ink },
    { text: '.', style, fill: t.accent, cls: 'stop', delay: stopDelay },
  ], { x, y, delay });
}

// A number whose digits roll up into place, lower digits spinning further, the
// way an odometer turns. At rest it shows the real value.
export function odometer(doc, { x, y, text, style, fill, delay = 0, stagger = 70 }) {
  const step = style.size * 1.08;
  const width = doc.measure(text, style);
  const clip = id('od');
  doc.def(`<clipPath id="${clip}"><rect x="${r2(x - 6)}" y="${r2(y - style.size * 0.86)}" width="${r2(width + 12)}" height="${r2(style.size * 1.06)}"/></clipPath>`);
  const chars = [...text];
  const total = chars.filter((c) => /\d/.test(c)).length;
  const ls = style.track ? ` letter-spacing="${r2(style.track * style.size)}"` : '';
  let cx = x, di = 0;
  const parts = [`<g clip-path="url(#${clip})">`];
  for (const ch of chars) {
    const w = doc.measure(ch, style);
    if (/\d/.test(ch)) {
      const turns = 1 + (total - 1 - di);
      const K = turns * 10 + Number(ch);
      doc.use(style, '0123456789');
      const strip = Array.from({ length: K + 1 }, (_, k) =>
        `<text x="${r2(cx + w / 2)}" y="${r2(y + k * step)}" text-anchor="middle" class="${style.v}" font-size="${style.size}"${ls} fill="${fill}">${k % 10}</text>`).join('');
      const to = r2(-K * step);
      parts.push(`<g class="odo" transform="translate(0 ${to})" style="--to:${to}px;animation-delay:${delay + di * stagger}ms">${strip}</g>`);
      di++;
    } else {
      parts.push(doc.text({ text: ch, style, fill }, { x: cx, y }));
    }
    cx += w;
  }
  parts.push('</g>');
  return parts.join('');
}

// Label row: small caps on the left and the right, under a rule.
export function labels(doc, { y, left, right, x1 = 8, x2 = doc.width - 8, delay = 150 }) {
  const t = doc.theme;
  return [
    left ? doc.text({ text: left, style: type.label, fill: t.ink }, { x: x1, y, cls: 'fade', delay }) : '',
    right ? doc.text({ text: right, style: type.label, fill: t.ink2 }, { x: x2, y, anchor: 'end', cls: 'fade', delay: delay + 60 }) : '',
  ].join('');
}

// The heading of a data plate: heavy rule, plate number, title, meta, footnote.
export function plate(doc, { num, title, meta, foot, height }) {
  const t = doc.theme;
  const x1 = 8, x2 = doc.width - 8;
  doc.add(rule(doc, { x1, x2, y: 14, weight: 3.5 }));
  doc.add(doc.text({ text: num, style: type.monoNum, fill: t.accentInk }, { x: x1, y: 38, cls: 'fade', delay: 120 }));
  doc.add(doc.text({ text: title, style: type.label, fill: t.ink }, { x: x1 + 28, y: 38, cls: 'fade', delay: 160 }));
  if (meta) doc.add(doc.text({ text: meta, style: type.monoU, fill: t.ink3 }, { x: x2, y: 38, anchor: 'end', cls: 'fade', delay: 220 }));
  if (foot) doc.add(doc.text({ text: foot, style: type.monoU, fill: t.ink3 }, { x: x1, y: height - 12, cls: 'fade', delay: 900 }));
}
