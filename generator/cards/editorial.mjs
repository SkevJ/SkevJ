// The editorial cards: hero, section openers, work, tools and the closing line.
// No surfaces of their own — type and rules sit directly on the page.

import { Doc } from '../lib/doc.mjs';
import { r2 } from '../lib/svg.mjs';
import { rule, reveal, stopped, labels } from '../lib/kit.mjs';
import { type } from '../lib/theme.mjs';

const W = 824, TILE = 412;

// Maps keywords and tool names to their primary language family for cross-card highlighting.
const KW_LANG_MAP = {
  'C#': 'C#',
  '.NET': 'C#',
  'ASP.NET Core': 'C#',
  'SignalR': 'C#',
  'Dapper': 'C#',
  'EF Core': 'C#',
  'FluentValidation': 'C#',
  'Serilog': 'C#',
  'Automated Documents': 'C#',
  'xUnit': 'C#',
  'Industrial Serial': 'C#',
  'React': 'TypeScript',
  'TypeScript': 'TypeScript',
  'Advanced TypeScript patterns': 'TypeScript',
  'Vite': 'TypeScript',
  'TanStack Query': 'TypeScript',
  'React Hook Form': 'TypeScript',
  'Zod': 'TypeScript',
  'Framer Motion': 'TypeScript',
  'Three.js': 'TypeScript',
  '3D on the web': 'TypeScript',
  'Recharts': 'TypeScript',
  'Leaflet': 'TypeScript',
  'Workbox': 'TypeScript',
  'Tailwind CSS': 'CSS',
  'shadcn/ui': 'CSS',
  'SQL Server': 'T-SQL',
  'T-SQL': 'T-SQL',
  'ERP ledgers': 'T-SQL',
  'Python': 'Python',
  'Node.js': 'JavaScript',
};

export function langForKeyword(word) {
  const clean = String(word).replace(/\u00a0/g, ' ').trim();
  return KW_LANG_MAP[clean] || null;
}

function addKeywordCss(doc, t) {
  doc.css(
    `.kw{cursor:pointer;transition:fill 150ms ease-out,filter 150ms ease-out}` +
    `.kw:hover,.kw.is-linked{fill:${t.accent}!important;filter:drop-shadow(0 0 8px ${t.accent}cc)}` +
    `.kw-giant,.stop{cursor:pointer;transition:fill 180ms ease-out,filter 180ms ease-out}` +
    `.kw-giant:hover,.stop:hover{filter:drop-shadow(0 0 12px ${t.accent}99)}` +
    `@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.82)}}` +
    `.live-dot{animation:pulseDot 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}` +
    `.piano-key{cursor:pointer;transition:transform 90ms ease-out,filter 120ms ease}` +
    `.piano-key:hover,.piano-key.is-active{transform:translateY(1.8px);filter:drop-shadow(0 0 8px ${t.accent}e6)}` +
    `.piano-key:hover .pk-top,.piano-key.is-active .pk-top{fill:${t.accent}!important}`
  );
}

// Splits a string into runs where every matched phrase gets its own style instance + `kw` class
// so FontKit.wrap keeps each keyword in its own hoverable <tspan class="... kw">.
export function highlightRuns(text, keywords, baseStyle, baseFill, kwFill = baseFill) {
  if (!keywords?.length) return [{ text, style: baseStyle, fill: baseFill }];
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re).filter((p) => p.length > 0);
  return parts.map((part) => {
    if (keywords.includes(part)) {
      return { text: part.replace(/ /g, ' '), style: { ...baseStyle }, fill: kwFill, cls: 'kw' };
    }
    return { text: part, style: baseStyle, fill: baseFill };
  });
}

export async function hero({ theme: t, fonts, config }) {
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${config.name.first} ${config.name.last} — ${config.role}, ${config.place}` });
  addKeywordCss(doc, t);
  const first = config.name.first.toUpperCase(), last = config.name.last.toUpperCase();
  // The longest line, period included, fills the measure.
  const unit = doc.measure(`${last}.`, { ...type.giant, size: 1 });
  const giant = { ...type.giant, size: Math.floor(Math.min(type.giant.size, 802 / unit)) };
  const y1 = 40 + giant.size * 0.74, y2 = y1 + giant.size * 0.94;
  const yRule = y2 + 26, yText = yRule + 34;

  doc.add(rule(doc, { y: 14 }));
  const placeText = `${config.place} · ${config.timezone.label}`;
  const placeW = doc.measure(placeText, type.label);
  doc.add(`<circle class="live-dot" cx="${r2(W - 8 - placeW - 10)}" cy="29" r="3.2" fill="${t.accent}"/>`);
  doc.add(
    doc.text({ text: config.role, style: { ...type.label }, fill: t.ink, cls: 'kw' }, { x: 8, y: 33, cls: 'fade', delay: 150 }) +
    doc.text({ text: placeText, style: { ...type.label }, fill: t.ink2, cls: 'kw' }, { x: W - 8, y: 33, anchor: 'end', cls: 'fade', delay: 210, extra: ' data-hero-clock="1"' })
  );
  doc.add(reveal(doc, { text: first, style: giant, fill: t.ink, cls: 'kw-giant' }, { x: 6, y: y1, delay: 120 }));
  doc.add(stopped(doc, last, giant, { x: 6, y: y2, delay: 210, stopDelay: 820 }));
  doc.add(rule(doc, { y: yRule, weight: 1, delay: 420 }));
  doc.add(doc.text({ text: config.hero.greeting, style: { ...type.deck }, fill: t.ink, cls: 'kw' }, { x: 8, y: yText + 2, cls: 'rise', delay: 860 }));
  const runs = highlightRuns(config.hero.intro, config.hero.keywords, type.body, t.ink, t.ink);
  const intro = doc.paragraph(runs, { x: 330, y: yText, width: 486, cls: 'rise', delay: 900 });
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
  addKeywordCss(doc, t);
  const big = { ...type.section, size };
  const yWord = 33 + 16 + size * 0.74;
  doc.add(rule(doc, { y: 14 }));
  doc.add(doc.text({ text: sec.num, style: { ...type.monoNum }, fill: t.accentInk, cls: 'kw' }, { x: 8, y: 33, cls: 'fade', delay: 150 }));
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
  addKeywordCss(doc, t);
  const L = workLayout(item, fonts);
  const d = (index % 2) * 80;
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: d }));
  doc.add(doc.text({ text: String(index + 1).padStart(2, '0'), style: { ...type.numeral }, fill: t.accent, cls: 'kw' }, { x: 6, y: L.yNum, cls: 'rise', delay: 120 + d }));
  doc.add(doc.text({ text: item.title, style: { ...type.heading }, fill: t.ink, cls: 'kw' }, { x: 8, y: L.yTitle, cls: 'rise', delay: 180 + d }));
  const bodyRuns = highlightRuns(item.body, item.keywords, type.body, t.ink2, t.ink);
  doc.add(doc.paragraph(bodyRuns, { x: 8, y: L.yBody, width: 392, cls: 'rise', delay: 240 + d }).svg);

  const tagList = Array.isArray(item.tags) ? item.tags : String(item.tags).split(/\s*·\s*/);
  const tagRuns = [];
  tagList.forEach((tag, i) => {
    if (i) tagRuns.push({ text: ' · ', style: type.monoU, fill: t.ink3 });
    tagRuns.push({ text: tag, style: { ...type.monoU }, fill: t.ink3, cls: 'kw' });
  });
  doc.add(doc.text(tagRuns, { x: 8, y: height - 12, cls: 'fade', delay: 420 + d }));
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
  addKeywordCss(doc, t);
  const d = (index % 2) * 80;
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: d }));
  doc.add(labels(doc, { y: PAD_TOP + 19, left: group.title, right: group.meta, delay: 120 + d }));
  // Primary tools in ink, the rest in the second ink: each item gets its own hover glow.
  const runs = [];
  group.items.forEach((item, i) => {
    if (i) runs.push({ text: '  ·  ', style: type.body, fill: t.ink3 });
    runs.push({
      text: item.replace(/ /g, ' '),
      style: { ...type.body },
      fill: i < (group.primary || 0) ? t.ink : t.ink2,
      cls: 'kw',
    });
  });
  doc.add(doc.paragraph(runs, { x: 8, y: PAD_TOP + 52, width: 392, cls: 'rise', delay: 180 + d }).svg);
  return doc;
}

function latelyLayout(group, fonts) {
  let y = PAD_TOP + 52;
  const rows = group.entries.map((e) => {
    const runs = highlightRuns(e.text, e.keywords, type.body, '#000', '#000');
    const lines = fonts.wrap(runs, 392).length;
    const row = { ...e, yLabel: y, yText: y + 22 };
    y = row.yText + (lines - 1) * type.body.lh + 30;
    return row;
  });
  return { rows, height: y - 30 + 30 };
}

// 3D isometric 1-octave mini-piano (C4–B4) tucked beside "Playing piano."
function renderMiniPiano(doc, t, x0, y0) {
  const whiteNotes = [
    { note: 'C4', freq: 261.63, key: 'a' },
    { note: 'D4', freq: 293.66, key: 's' },
    { note: 'E4', freq: 329.63, key: 'd' },
    { note: 'F4', freq: 349.23, key: 'f' },
    { note: 'G4', freq: 392.00, key: 'g' },
    { note: 'A4', freq: 440.00, key: 'h' },
    { note: 'B4', freq: 493.88, key: 'j' },
    { note: 'C5', freq: 523.25, key: 'k' },
  ];
  const blackNotes = [
    { pos: 0, note: 'C#4', freq: 277.18, key: 'w' },
    { pos: 1, note: 'D#4', freq: 311.13, key: 'e' },
    { pos: 3, note: 'F#4', freq: 369.99, key: 't' },
    { pos: 4, note: 'G#4', freq: 415.30, key: 'y' },
    { pos: 5, note: 'A#4', freq: 466.16, key: 'u' },
  ];
  const kw = 18, kh = 34, gap = 2, step = kw + gap, depth = 3.5;
  const parts = [];

  // Base chassis shadow
  parts.push(`<rect x="${x0 - 3}" y="${y0 - 3}" width="${whiteNotes.length * step - gap + 6}" height="${kh + depth + 5}" rx="2" fill="${t.hair}"/>`);

  // White keys with 3D front bevel
  whiteNotes.forEach((wn, i) => {
    const x = x0 + i * step;
    const front = `<rect x="${x}" y="${y0 + kh}" width="${kw}" height="${depth}" rx="0.8" fill="${t.greys[2]}"/>`;
    const top = `<rect class="pk-top" x="${x}" y="${y0}" width="${kw}" height="${kh}" rx="1" fill="${t.greys[4]}" stroke="${t.hair}" stroke-width="0.8"/>`;
    parts.push(`<g class="piano-key" data-note="${wn.note}" data-freq="${wn.freq}" data-key="${wn.key}">${front}${top}</g>`);
  });

  // Black sharp keys with 3D raised prism
  const bw = 11, bh = 21;
  blackNotes.forEach((bn) => {
    const x = r2(x0 + (bn.pos + 1) * step - gap / 2 - bw / 2);
    const front = `<rect x="${x}" y="${y0 + bh - 1}" width="${bw}" height="3" rx="0.6" fill="${t.accentInk}"/>`;
    const top = `<rect class="pk-top" x="${x}" y="${y0 - 1.5}" width="${bw}" height="${bh}" rx="1" fill="${t.ink}"/>`;
    parts.push(`<g class="piano-key" data-note="${bn.note}" data-freq="${bn.freq}" data-key="${bn.key}">${front}${top}</g>`);
  });

  doc.add(`<g class="fade" style="animation-delay:460ms">${parts.join('')}</g>`);
  doc.add(doc.text({ text: 'KEYS A–K', style: { ...type.monoU, size: 9.5 }, fill: t.ink3, cls: 'kw' }, { x: x0 + whiteNotes.length * step - gap, y: y0 - 7, anchor: 'end', cls: 'fade', delay: 520 }));
}

export async function lately({ theme: t, fonts, group, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${group.title}: ${group.entries.map((e) => `${e.label} — ${e.text}`).join(' ')}` });
  addKeywordCss(doc, t);
  const L = latelyLayout(group, fonts);
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: 80 }));
  doc.add(labels(doc, { y: PAD_TOP + 19, left: group.title, right: group.meta, delay: 200 }));
  L.rows.forEach((r, i) => {
    const runs = highlightRuns(r.text, r.keywords, type.body, t.ink, t.ink);
    doc.add(doc.text({ text: r.label, style: { ...type.label }, fill: t.accentInk, cls: 'kw' }, { x: 8, y: r.yLabel, cls: 'fade', delay: 260 + i * 80 }));
    doc.add(doc.paragraph(runs, { x: 8, y: r.yText, width: 392, cls: 'rise', delay: 300 + i * 80 }).svg);
    if (/piano/i.test(r.text)) {
      renderMiniPiano(doc, t, 244, r.yLabel - 4);
    }
  });
  return doc;
}

// The last word: big, with the accent full stop, and where to find me.
export async function contact({ theme: t, fonts, config }) {
  const c = config.contact;
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${c.word}. ${c.body} ${c.link}.` });
  addKeywordCss(doc, t);
  const big = { ...type.section, size: 84 };
  const yWord = 33 + 16 + big.size * 0.74;
  doc.add(rule(doc, { y: 14 }));
  doc.add(labels(doc, { y: 33, left: 'Contact', right: config.place }));
  doc.add(stopped(doc, c.word.toUpperCase(), big, { x: 6, y: yWord, delay: 120, stopDelay: 640 }));
  const yRule = yWord + 26;
  doc.add(rule(doc, { y: yRule, weight: 1, delay: 300 }));
  const bodyRuns = highlightRuns(c.body, c.keywords || ['collaborations', 'consulting', '.NET', 'React', 'SQL Server'], type.caption, t.ink2, t.ink);
  doc.add(doc.text(bodyRuns, { x: 8, y: yRule + 30, cls: 'rise', delay: 500 }));
  doc.add(doc.text({ text: `${c.link}  →`, style: { ...type.label }, fill: t.accentInk, cls: 'kw' }, { x: W - 8, y: yRule + 30, anchor: 'end', cls: 'rise', delay: 560 }));
  doc.height = yRule + 48;
  return doc;
}
