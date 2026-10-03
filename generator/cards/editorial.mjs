// The editorial cards: hero, section openers, work, tools and the closing line.
// No surfaces of their own — type and rules sit directly on the page.

import { Doc } from '../lib/doc.mjs';
import { rule, reveal, stopped, labels } from '../lib/kit.mjs';
import { type } from '../lib/theme.mjs';

const W = 824, TILE = 412;

export async function hero({ theme: t, fonts, config }) {
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${config.name.first} ${config.name.last} — ${config.role}, ${config.place}` });
  const first = config.name.first.toUpperCase(), last = config.name.last.toUpperCase();
  // The longest line, period included, fills the measure.
  const unit = doc.measure(`${last}.`, { ...type.giant, size: 1 });
  const giant = { ...type.giant, size: Math.floor(Math.min(type.giant.size, 802 / unit)) };
  const y1 = 40 + giant.size * 0.74, y2 = y1 + giant.size * 0.94;
  const yRule = y2 + 26, yText = yRule + 34;

  doc.add(rule(doc, { y: 14 }));
  doc.add(labels(doc, { y: 33, left: config.role, right: config.place }));
  doc.add(reveal(doc, { text: first, style: giant, fill: t.ink }, { x: 6, y: y1, delay: 120 }));
  doc.add(stopped(doc, last, giant, { x: 6, y: y2, delay: 210, stopDelay: 820 }));
  doc.add(rule(doc, { y: yRule, weight: 1, delay: 420 }));
  doc.add(doc.text({ text: config.hero.greeting, style: type.deck, fill: t.ink }, { x: 8, y: yText + 2, cls: 'rise', delay: 860 }));
  const intro = doc.paragraph([{ text: config.hero.intro, style: type.body, fill: t.ink }], { x: 330, y: yText, width: 486, cls: 'rise', delay: 900 });
  doc.add(intro.svg);
  doc.height = yText + intro.height + 22;
  return doc;
}

// All section words share one size: the size at which the longest of them, with
// its full stop, still leaves the right-hand column free for the dek.
const WORD_COLUMN = 420, DEK_X = 452;
export function sectionSize(sections, fonts) {
  const widest = Math.max(...sections.map((s) => fonts.measure(`${s.word.toUpperCase()}.`, { ...type.section, size: 1 })));
  return Math.floor(Math.min(type.section.size, WORD_COLUMN / widest));
}

// Section opener: a word as big as a headline, a full stop in the accent, a dek.
export async function section({ theme: t, fonts, section: sec, size = type.section.size }) {
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${sec.word}. ${sec.deck}` });
  const big = { ...type.section, size };
  const yWord = 33 + 16 + size * 0.74;
  doc.add(rule(doc, { y: 14 }));
  doc.add(doc.text({ text: sec.num, style: type.monoNum, fill: t.accentInk }, { x: 8, y: 33, cls: 'fade', delay: 150 }));
  doc.add(labels(doc, { y: 33, right: sec.meta }));
  doc.add(stopped(doc, sec.word.toUpperCase(), big, { x: 6, y: yWord, delay: 120, stopDelay: 640 }));
  // The dek hangs from the cap height of the word.
  const yDek = yWord - size * 0.73 + 18;
  const deck = doc.paragraph([{ text: sec.deck, style: type.deck, fill: t.ink2 }], { x: DEK_X, y: yDek, width: W - 8 - DEK_X, cls: 'rise', delay: 380 });
  doc.add(deck.svg);
  doc.height = Math.max(yWord, yDek + deck.height) + 24;
  return doc;
}

// Work: numbered columns, two to a row. Heights are shared within a row.
const PAD_TOP = 14;
function workLayout(item, fonts) {
  const lines = fonts.wrap([{ text: item.body, style: type.body }], 392).length;
  const yNum = PAD_TOP + 52, yTitle = yNum + 38, yBody = yTitle + 30;
  return { yNum, yTitle, yBody, height: yBody + (lines - 1) * type.body.lh + 44 };
}
export const workRowHeight = (items, fonts) => Math.ceil(Math.max(...items.map((i) => workLayout(i, fonts).height)));

export async function work({ theme: t, fonts, item, index, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${item.title}. ${item.body}` });
  const L = workLayout(item, fonts);
  const d = (index % 2) * 80;
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: d }));
  doc.add(doc.text({ text: String(index + 1).padStart(2, '0'), style: type.numeral, fill: t.accent }, { x: 6, y: L.yNum, cls: 'rise', delay: 120 + d }));
  doc.add(doc.text({ text: item.title, style: type.heading, fill: t.ink }, { x: 8, y: L.yTitle, cls: 'rise', delay: 180 + d }));
  doc.add(doc.paragraph([{ text: item.body, style: type.body, fill: t.ink2 }], { x: 8, y: L.yBody, width: 392, cls: 'rise', delay: 240 + d }).svg);
  doc.add(doc.text({ text: item.tags, style: type.monoU, fill: t.ink3 }, { x: 8, y: height - 12, cls: 'fade', delay: 420 + d }));
  return doc;
}

// Tools: a colophon. Group label, then the tools as running text.
function toolsLayout(group, fonts) {
  const text = group.items.join('  ·  ');
  const lines = fonts.wrap([{ text, style: type.body }], 392).length;
  return { text, height: PAD_TOP + 52 + (lines - 1) * type.body.lh + 30 };
}
export const toolsRowHeight = (groups, fonts) =>
  Math.ceil(Math.max(...groups.map((g) => (g.entries ? latelyLayout(g, fonts).height : toolsLayout(g, fonts).height))));

export async function tools({ theme: t, fonts, group, index, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${group.title}: ${group.items.join(', ')}` });
  const L = toolsLayout(group, fonts);
  const d = (index % 2) * 80;
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: d }));
  doc.add(labels(doc, { y: PAD_TOP + 19, left: group.title, right: group.meta, delay: 120 + d }));
  // Primary tools in ink, the rest in the second ink: the eye finds the core first.
  const runs = [];
  group.items.forEach((item, i) => {
    if (i) runs.push({ text: '  ·  ', style: type.body, fill: t.ink3 });
    runs.push({ text: item.replace(/ /g, ' '), style: type.body, fill: i < (group.primary || 0) ? t.ink : t.ink2 });
  });
  doc.add(doc.paragraph(runs, { x: 8, y: PAD_TOP + 52, width: 392, cls: 'rise', delay: 180 + d }).svg);
  return doc;
}

function latelyLayout(group, fonts) {
  let y = PAD_TOP + 52;
  const rows = group.entries.map((e) => {
    const lines = fonts.wrap([{ text: e.text, style: type.body }], 392).length;
    const row = { ...e, yLabel: y, yText: y + 22 };
    y = row.yText + (lines - 1) * type.body.lh + 30;
    return row;
  });
  return { rows, height: y - 30 + 30 };
}

export async function lately({ theme: t, fonts, group, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${group.title}: ${group.entries.map((e) => `${e.label} — ${e.text}`).join(' ')}` });
  const L = latelyLayout(group, fonts);
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: 80 }));
  doc.add(labels(doc, { y: PAD_TOP + 19, left: group.title, right: group.meta, delay: 200 }));
  L.rows.forEach((r, i) => {
    doc.add(doc.text({ text: r.label, style: type.label, fill: t.accentInk }, { x: 8, y: r.yLabel, cls: 'fade', delay: 260 + i * 80 }));
    doc.add(doc.paragraph([{ text: r.text, style: type.body, fill: t.ink }], { x: 8, y: r.yText, width: 392, cls: 'rise', delay: 300 + i * 80 }).svg);
  });
  return doc;
}

// The last word: big, with the accent full stop, and where to find me.
export async function contact({ theme: t, fonts, config }) {
  const c = config.contact;
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${c.word}. ${c.body} ${c.link}.` });
  const big = { ...type.section, size: 84 };
  const yWord = 33 + 16 + big.size * 0.74;
  doc.add(rule(doc, { y: 14 }));
  doc.add(labels(doc, { y: 33, left: 'Contact', right: config.place }));
  doc.add(stopped(doc, c.word.toUpperCase(), big, { x: 6, y: yWord, delay: 120, stopDelay: 640 }));
  const yRule = yWord + 26;
  doc.add(rule(doc, { y: yRule, weight: 1, delay: 300 }));
  doc.add(doc.text({ text: c.body, style: type.caption, fill: t.ink2 }, { x: 8, y: yRule + 30, cls: 'rise', delay: 500 }));
  doc.add(doc.text({ text: `${c.link}  →`, style: type.label, fill: t.accentInk }, { x: W - 8, y: yRule + 30, anchor: 'end', cls: 'rise', delay: 560 }));
  doc.height = yRule + 48;
  return doc;
}
