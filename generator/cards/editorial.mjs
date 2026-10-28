// The editorial cards: hero, section openers, work, tools and the closing line.
// No surfaces of their own — type and rules sit directly on the page.
// Every animation here runs 100% natively inside GitHub's <img src="...svg">!

import { Doc } from '../lib/doc.mjs';
import { r2 } from '../lib/svg.mjs';
import { rule, reveal, stopped, labels } from '../lib/kit.mjs';
import { type } from '../lib/theme.mjs';

const W = 824, TILE = 412;

function addEditorialGlow(doc, t) {
  // True SVG glow filter that works on <tspan>, <text>, and <g> inside <img src="...svg"> on GitHub
  doc.def(
    `<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">` +
      `<feGaussianBlur stdDeviation="3.2" result="b"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`
  );
  doc.css(
    `@keyframes kwGlow{` +
      `0%,72%,100%{fill:${t.ink};filter:none}` +
      `80%,90%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes kwGlowMuted{` +
      `0%,72%,100%{fill:${t.ink2};filter:none}` +
      `80%,90%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes kwGlowTag{` +
      `0%,70%,100%{fill:${t.ink3};filter:none}` +
      `78%,90%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes stopPulse{` +
      `0%,100%{fill:${t.accent};filter:none}` +
      `50%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes livePulse{` +
      `0%,100%{opacity:1;transform:scale(1);filter:url(#glow)}` +
      `50%{opacity:.3;transform:scale(.75);filter:none}` +
    `}` +
    `@keyframes scanBar{` +
      `0%{transform:translateX(0);opacity:0}` +
      `10%{opacity:1}` +
      `90%{opacity:1}` +
      `100%{transform:translateX(760px);opacity:0}` +
    `}` +
    `.kw{animation:kwGlow 7.2s ease-in-out infinite}` +
    `.kw-muted{animation:kwGlowMuted 7.2s ease-in-out infinite}` +
    `.kw-tag{animation:kwGlowTag 6.4s ease-in-out infinite}` +
    `.stop{animation:stop 480ms cubic-bezier(0.23,1,0.32,1) backwards,stopPulse 3s ease-in-out 1s infinite}` +
    `.live-dot{animation:livePulse 2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}` +
    `.rule-scan{animation:scanBar 5.5s cubic-bezier(0.4,0,0.2,1) infinite}`
  );
}

// Splits a string into runs where every matched phrase gets its own style instance + staggered glow wave
export function highlightRuns(text, keywords, baseStyle, baseFill, kwCls = 'kw', startDelay = 800) {
  if (!keywords?.length) return [{ text, style: baseStyle, fill: baseFill }];
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(re).filter((p) => p.length > 0);
  let kwIndex = 0;
  return parts.map((part) => {
    if (keywords.includes(part)) {
      const delay = startDelay + kwIndex++ * 900;
      return { text: part.replace(/ /g, ' '), style: { ...baseStyle }, fill: baseFill, cls: kwCls, delay };
    }
    return { text: part, style: baseStyle, fill: baseFill };
  });
}

export async function hero({ theme: t, fonts, config }) {
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${config.name.first} ${config.name.last} — ${config.role}, ${config.place}` });
  addEditorialGlow(doc, t);
  const first = config.name.first.toUpperCase(), last = config.name.last.toUpperCase();
  const unit = doc.measure(`${last}.`, { ...type.giant, size: 1 });
  const giant = { ...type.giant, size: Math.floor(Math.min(type.giant.size, 802 / unit)) };
  const y1 = 40 + giant.size * 0.74, y2 = y1 + giant.size * 0.94;
  const yRule = y2 + 26, yText = yRule + 34;

  doc.add(rule(doc, { y: 14 }));
  // Glowing orange laser packet travelling along the top rule
  doc.add(`<rect class="rule-scan" x="8" y="13" width="56" height="2.5" rx="1.2" fill="${t.accent}" filter="url(#glow)"/>`);

  const placeText = `${config.place} · ${config.timezone.label}`;
  const placeW = doc.measure(placeText, type.label);
  doc.add(`<circle class="live-dot" cx="${r2(W - 8 - placeW - 10)}" cy="29" r="3.4" fill="${t.accent}"/>`);
  doc.add(
    doc.text({ text: config.role, style: { ...type.label }, fill: t.ink, cls: 'kw', delay: 600 }, { x: 8, y: 33, cls: 'fade', delay: 150 }) +
    doc.text({ text: placeText, style: { ...type.label }, fill: t.ink2, cls: 'kw-muted', delay: 2400 }, { x: W - 8, y: 33, anchor: 'end', cls: 'fade', delay: 210 })
  );
  doc.add(reveal(doc, { text: first, style: giant, fill: t.ink }, { x: 6, y: y1, delay: 120 }));
  doc.add(stopped(doc, last, giant, { x: 6, y: y2, delay: 210, stopDelay: 820 }));
  doc.add(rule(doc, { y: yRule, weight: 1, delay: 420 }));
  doc.add(doc.text({ text: config.hero.greeting, style: { ...type.deck }, fill: t.ink, cls: 'kw', delay: 900 }, { x: 8, y: yText + 2, cls: 'rise', delay: 860 }));
  const runs = highlightRuns(config.hero.intro, config.hero.keywords, type.body, t.ink, 'kw', 1100);
  const intro = doc.paragraph(runs, { x: 330, y: yText, width: 486, cls: 'rise', delay: 900 });
  doc.add(intro.svg);
  doc.height = yText + intro.height + 22;
  return doc;
}

const WORD_COLUMN = 420, DEK_X = 452;
export function sectionSize(sections, fonts) {
  const widest = Math.max(...sections.map((s) => fonts.measure(`${s.word.toUpperCase()}.`, { ...type.section, size: 1 })));
  return Math.floor(Math.min(type.section.size, WORD_COLUMN / widest));
}

export async function section({ theme: t, fonts, section: sec, size = type.section.size }) {
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${sec.word}. ${sec.deck}` });
  addEditorialGlow(doc, t);
  const big = { ...type.section, size };
  const yWord = 33 + 16 + size * 0.74;
  doc.add(rule(doc, { y: 14 }));
  doc.add(doc.text({ text: sec.num, style: { ...type.monoNum }, fill: t.accentInk, cls: 'kw', delay: 700 }, { x: 8, y: 33, cls: 'fade', delay: 150 }));
  doc.add(labels(doc, { y: 33, right: sec.meta }));
  doc.add(stopped(doc, sec.word.toUpperCase(), big, { x: 6, y: yWord, delay: 120, stopDelay: 640 }));
  const yDek = yWord - size * 0.73 + 18;
  const deck = doc.paragraph([{ text: sec.deck, style: type.deck, fill: t.ink2 }], { x: DEK_X, y: yDek, width: W - 8 - DEK_X, cls: 'rise', delay: 380 });
  doc.add(deck.svg);
  doc.height = Math.max(yWord, yDek + deck.height) + 24;
  return doc;
}

const PAD_TOP = 14;
function workLayout(item, fonts) {
  const lines = fonts.wrap([{ text: item.body, style: type.body }], 392).length;
  const yNum = PAD_TOP + 52, yTitle = yNum + 38, yBody = yTitle + 30;
  return { yNum, yTitle, yBody, height: yBody + (lines - 1) * type.body.lh + 44 };
}
export const workRowHeight = (items, fonts) => Math.ceil(Math.max(...items.map((i) => workLayout(i, fonts).height)));

export async function work({ theme: t, fonts, item, index, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${item.title}. ${item.body}` });
  addEditorialGlow(doc, t);
  const L = workLayout(item, fonts);
  const d = (index % 2) * 80;
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: d }));
  doc.add(doc.text({ text: String(index + 1).padStart(2, '0'), style: { ...type.numeral }, fill: t.accent }, { x: 6, y: L.yNum, cls: 'rise', delay: 120 + d }));
  doc.add(doc.text({ text: item.title, style: { ...type.heading }, fill: t.ink, cls: 'kw', delay: 800 + index * 500 }, { x: 8, y: L.yTitle, cls: 'rise', delay: 180 + d }));
  const bodyRuns = highlightRuns(item.body, item.keywords, type.body, t.ink2, 'kw-muted', 1200 + index * 400);
  doc.add(doc.paragraph(bodyRuns, { x: 8, y: L.yBody, width: 392, cls: 'rise', delay: 240 + d }).svg);

  const tagList = Array.isArray(item.tags) ? item.tags : String(item.tags).split(/\s*·\s*/);
  const tagRuns = [];
  tagList.forEach((tag, i) => {
    if (i) tagRuns.push({ text: ' · ', style: type.monoU, fill: t.ink3 });
    tagRuns.push({ text: tag, style: { ...type.monoU }, fill: t.ink3, cls: 'kw-tag', delay: 1600 + index * 350 + i * 900 });
  });
  doc.add(doc.text(tagRuns, { x: 8, y: height - 12, cls: 'fade', delay: 420 + d }));
  return doc;
}

function toolsLayout(group, fonts) {
  const text = group.items.join('  ·  ');
  const lines = fonts.wrap([{ text, style: type.body }], 392).length;
  return { text, height: PAD_TOP + 52 + (lines - 1) * type.body.lh + 30 };
}
export const toolsRowHeight = (groups, fonts) =>
  Math.ceil(Math.max(...groups.map((g) => (g.entries ? latelyLayout(g, fonts).height : toolsLayout(g, fonts).height))));

export async function tools({ theme: t, fonts, group, index, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${group.title}: ${group.items.join(', ')}` });
  addEditorialGlow(doc, t);
  const d = (index % 2) * 80;
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: d }));
  doc.add(labels(doc, { y: PAD_TOP + 19, left: group.title, right: group.meta, delay: 120 + d }));
  const runs = [];
  group.items.forEach((item, i) => {
    if (i) runs.push({ text: '  ·  ', style: type.body, fill: t.ink3 });
    const isPri = i < (group.primary || 0);
    runs.push({
      text: item.replace(/ /g, ' '),
      style: { ...type.body },
      fill: isPri ? t.ink : t.ink2,
      cls: isPri ? 'kw' : 'kw-muted',
      delay: 700 + i * 520,
    });
  });
  doc.add(doc.paragraph(runs, { x: 8, y: PAD_TOP + 52, width: 392, cls: 'rise', delay: 180 + d }).svg);
  return doc;
}

function latelyLayout(group, fonts) {
  let y = PAD_TOP + 52;
  const rows = group.entries.map((e) => {
    const runs = highlightRuns(e.text, e.keywords, type.body, '#000', 'kw');
    const lines = fonts.wrap(runs, 392).length;
    const row = { ...e, yLabel: y, yText: y + 22 };
    y = row.yText + (lines - 1) * type.body.lh + 30;
    return row;
  });
  return { rows, height: y - 30 + 30 };
}

// Self-playing 3D isometric mini-piano with explicit SVG/CSS key depression & glow
function renderMiniPiano(doc, t, x0, y0) {
  doc.css(
    `@keyframes pkPressW{` +
      `0%,80%,100%{transform:translateY(0)}` +
      `86%,93%{transform:translateY(2.5px)}` +
    `}` +
    `@keyframes pkGlowW{` +
      `0%,80%,100%{fill:${t.greys[4]};filter:none}` +
      `86%,93%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes pkGlowB{` +
      `0%,80%,100%{fill:${t.ink};filter:none}` +
      `86%,93%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `.pk-w{animation:pkPressW 4.8s ease-in-out infinite}` +
    `.pk-w-top{animation:pkGlowW 4.8s ease-in-out infinite}` +
    `.pk-b{animation:pkPressW 4.8s ease-in-out infinite}` +
    `.pk-b-top{animation:pkGlowB 4.8s ease-in-out infinite}`
  );

  // Musical arpeggio sequence (C4 -> E4 -> G4 -> B4 -> C5 -> G4 -> E4 -> D4)
  const whiteDelays = [400, 3800, 1000, 4300, 1600, 3200, 2200, 2700];
  const blackNotes = [
    { pos: 0, delay: 4600 },
    { pos: 1, delay: 1300 },
    { pos: 3, delay: 3500 },
    { pos: 4, delay: 1900 },
    { pos: 5, delay: 4100 },
  ];
  const kw = 18, kh = 34, gap = 2, step = kw + gap, depth = 3.5;
  const parts = [];

  parts.push(`<rect x="${x0 - 3}" y="${y0 - 3}" width="${8 * step - gap + 6}" height="${kh + depth + 5}" rx="2" fill="${t.hair}"/>`);

  whiteDelays.forEach((delay, i) => {
    const x = x0 + i * step;
    const front = `<rect x="${x}" y="${y0 + kh}" width="${kw}" height="${depth}" rx="0.8" fill="${t.greys[2]}"/>`;
    const top = `<rect class="pk-w-top" style="animation-delay:${delay}ms" x="${x}" y="${y0}" width="${kw}" height="${kh}" rx="1" fill="${t.greys[4]}" stroke="${t.hair}" stroke-width="0.8"/>`;
    parts.push(`<g class="pk-w" style="animation-delay:${delay}ms">${front}${top}</g>`);
  });

  const bw = 11, bh = 21;
  blackNotes.forEach((bn) => {
    const x = r2(x0 + (bn.pos + 1) * step - gap / 2 - bw / 2);
    const front = `<rect x="${x}" y="${y0 + bh - 1}" width="${bw}" height="3" rx="0.6" fill="${t.accentInk}"/>`;
    const top = `<rect class="pk-b-top" style="animation-delay:${bn.delay}ms" x="${x}" y="${y0 - 1.5}" width="${bw}" height="${bh}" rx="1" fill="${t.ink}"/>`;
    parts.push(`<g class="pk-b" style="animation-delay:${bn.delay}ms">${front}${top}</g>`);
  });

  doc.add(`<g class="fade" style="animation-delay:460ms">${parts.join('')}</g>`);
}

export async function lately({ theme: t, fonts, group, height }) {
  const doc = new Doc({ width: TILE, height, theme: t, fonts, title: `${group.title}: ${group.entries.map((e) => `${e.label} — ${e.text}`).join(' ')}` });
  addEditorialGlow(doc, t);
  const L = latelyLayout(group, fonts);
  doc.add(rule(doc, { y: PAD_TOP, weight: 1, delay: 80 }));
  doc.add(labels(doc, { y: PAD_TOP + 19, left: group.title, right: group.meta, delay: 200 }));
  L.rows.forEach((r, i) => {
    const runs = highlightRuns(r.text, r.keywords, type.body, t.ink, 'kw', 900 + i * 1100);
    doc.add(doc.text({ text: r.label, style: { ...type.label }, fill: t.accentInk }, { x: 8, y: r.yLabel, cls: 'fade', delay: 260 + i * 80 }));
    doc.add(doc.paragraph(runs, { x: 8, y: r.yText, width: 392, cls: 'rise', delay: 300 + i * 80 }).svg);
    if (/piano/i.test(r.text)) {
      renderMiniPiano(doc, t, 244, r.yLabel - 4);
    }
  });
  return doc;
}

export async function contact({ theme: t, fonts, config }) {
  const c = config.contact;
  const doc = new Doc({ width: W, height: 10, theme: t, fonts, title: `${c.word}. ${c.body} ${c.link}.` });
  addEditorialGlow(doc, t);
  const big = { ...type.section, size: 84 };
  const yWord = 33 + 16 + big.size * 0.74;
  doc.add(rule(doc, { y: 14 }));
  doc.add(labels(doc, { y: 33, left: 'Contact', right: config.place }));
  doc.add(stopped(doc, c.word.toUpperCase(), big, { x: 6, y: yWord, delay: 120, stopDelay: 640 }));
  const yRule = yWord + 26;
  doc.add(rule(doc, { y: yRule, weight: 1, delay: 300 }));
  const bodyRuns = highlightRuns(c.body, c.keywords || ['collaborations', 'consulting', '.NET', 'React', 'SQL Server'], type.caption, t.ink2, 'kw-muted', 1000);
  doc.add(doc.text(bodyRuns, { x: 8, y: yRule + 30, cls: 'rise', delay: 500 }));
  doc.add(doc.text({ text: `${c.link}  →`, style: { ...type.label }, fill: t.accentInk, cls: 'kw', delay: 2600 }, { x: W - 8, y: yRule + 30, anchor: 'end', cls: 'rise', delay: 560 }));
  doc.height = yRule + 48;
  return doc;
}
