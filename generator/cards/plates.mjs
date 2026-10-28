// The data plates, set like the pages of a personal annual report (after Nicholas
// Felton): heavy rule, plate number, one large figure, one 3D extruded chart, a mono footnote.
// One hue does the work; the single value each plate is about takes the accent.

import { Doc, EASE_OUT } from '../lib/doc.mjs';
import { r2, column, formatInt } from '../lib/svg.mjs';
import { plate, odometer } from '../lib/kit.mjs';
import { type } from '../lib/theme.mjs';
import { argmax, monthName, shortDate, hourLabel } from '../lib/stats.mjs';

const W = 412;
export const PLATE_HEIGHT = 340;
const MONTHS_UP = (d) => monthName(d).toUpperCase();
const year = (d) => d.slice(0, 4);

function addPlateGlowCss(doc, t) {
  doc.css(
    `.kw{cursor:pointer;transition:fill 150ms ease-out,filter 150ms ease-out}` +
    `.kw:hover{fill:${t.accent}!important;filter:drop-shadow(0 0 8px ${t.accent}cc)}` +
    `.cal-cell{cursor:pointer;transition:transform 160ms cubic-bezier(.23,1,.32,1),filter 160ms ease;transform-box:fill-box;transform-origin:center bottom}` +
    `.cal-cell:hover,.cal-cell.is-hovered{transform:translateY(-4px) scale(1.25);filter:drop-shadow(0 0 8px ${t.accent}e6)}` +
    `.cal-cell:hover .cal-top,.cal-cell.is-hovered .cal-top{fill:${t.accent}!important}` +
    `.dial-wedge{cursor:pointer;transition:transform 180ms cubic-bezier(.23,1,.32,1),filter 180ms ease}` +
    `.dial-wedge:hover,.dial-wedge.is-hovered{transform:translateY(-2.5px) scale(1.05);filter:drop-shadow(0 0 10px ${t.accent}d9)}` +
    `.dial-wedge:hover .wedge-top,.dial-wedge.is-hovered .wedge-top{fill:${t.accent}!important}` +
    `.streak-spike{cursor:pointer;transition:transform 160ms cubic-bezier(.23,1,.32,1),filter 160ms ease;transform-box:fill-box;transform-origin:center bottom}` +
    `.streak-spike:hover,.streak-spike.is-hovered{transform:scaleY(1.1) translateY(-2px);filter:drop-shadow(0 0 9px ${t.accent}f2)}` +
    `.streak-spike:hover .spike-front,.streak-spike.is-hovered .spike-front{fill:${t.accent}!important}` +
    `.lang-seg,.lang-row{cursor:pointer;transition:transform 180ms cubic-bezier(.23,1,.32,1),opacity 180ms ease,filter 180ms ease}` +
    `.lang-seg:hover,.lang-seg.is-hovered{transform:translateY(-4px);filter:drop-shadow(0 0 10px ${t.accent}d9)}` +
    `.lang-row:hover,.lang-row.is-hovered{transform:translateX(4px);filter:drop-shadow(0 0 8px ${t.accent}b3)}`
  );
}

export async function output({ theme: t, fonts, s, height = PLATE_HEIGHT }) {
  const H = height;
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `${formatInt(s.lastYearTotal)} contributions in the last 12 months, over ${s.activeDays} active days` });
  addPlateGlowCss(doc, t);
  const w0 = s.window[0][0], w1 = s.window[s.window.length - 1][0];
  plate(doc, { num: '01', title: 'Output', meta: `${MONTHS_UP(w0)} ’${w0.slice(2, 4)} — ${MONTHS_UP(w1)} ’${w1.slice(2, 4)}`, foot: 'Contributions per day, public and private', height: H });
  doc.add(odometer(doc, { x: 6, y: 120, text: formatInt(s.lastYearTotal), style: type.figureXL, fill: t.ink, delay: 150 }));
  doc.add(doc.text({ text: 'contributions in the last 12 months', style: type.mono, fill: t.ink2 }, { x: 8, y: 144, cls: 'fade', delay: 600 }));
  doc.add(doc.text({ text: String(s.activeDays), style: { ...type.figureS }, fill: t.ink, cls: 'kw' }, { x: W - 8, y: 86, anchor: 'end', cls: 'rise', delay: 500, extra: ' data-output-num="1"' }));
  doc.add(doc.text({ text: 'active days', style: type.mono, fill: t.ink2 }, { x: W - 8, y: 102, anchor: 'end', cls: 'fade', delay: 620, extra: ' data-output-label="1"' }));

  // 3D extruded calendar: 53 weeks by 7 days, five steps of one hue, cut at quartiles.
  const vals = s.window.map(([, c]) => c).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] || 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (c) => (c === 0 ? 0 : c <= cuts[0] ? 1 : c <= cuts[1] ? 2 : c <= cuts[2] ? 3 : 4);
  const cell = 5.6, gap = 1.2, step = cell + gap, x0 = 10, y0 = 192;
  const first = new Date(`${w0}T00:00:00Z`).getUTCDay();
  const cols = [];
  s.window.forEach(([dateStr, c], i) => {
    const k = i + first, col = Math.floor(k / 7), row = k % 7;
    const lv = level(c);
    const x = x0 + col * step, y = y0 + row * step;
    const lift = lv === 0 ? 0 : lv * 0.85;
    const shade = lv >= 3 ? t.accentInk : t.greys[Math.min(4, 5 - lv)];
    const side = lift > 0
      ? `<path d="M${r2(x)} ${r2(y + cell)}L${r2(x)} ${r2(y + cell - lift)}L${r2(x + cell)} ${r2(y + cell - lift)}L${r2(x + cell)} ${r2(y - lift)}L${r2(x + cell)} ${r2(y)}L${r2(x + cell)} ${r2(y + cell)}Z" fill="${shade}" opacity="0.65"/>`
      : '';
    const top = `<rect class="cal-top" x="${r2(x)}" y="${r2(y - lift)}" width="${cell}" height="${cell}" rx="0.8" fill="${t.heat[lv]}"/>`;
    (cols[col] ||= []).push(`<g class="cal-cell" data-date="${dateStr}" data-count="${c}" data-col="${col}" data-row="${row}">${side}${top}</g>`);
  });
  doc.css(`@keyframes col{from{opacity:0;transform:translateY(-5px)}}.col{animation:col 520ms ${EASE_OUT} backwards}`);
  cols.forEach((rects, ci) => doc.add(`<g class="col" style="animation-delay:${320 + ci * 14}ms">${rects.join('')}</g>`));

  let lastCol = -9, lastMonth = null;
  s.window.forEach(([d], i) => {
    const k = i + first, col = Math.floor(k / 7);
    if (k % 7 !== 0) return;
    const m = monthName(d);
    if (m !== lastMonth && col - lastCol >= 4 && col < 50) {
      doc.add(doc.text({ text: m.toUpperCase(), style: { ...type.monoU }, fill: t.ink3, cls: 'kw' }, { x: x0 + col * step, y: y0 - 11 }));
      lastCol = col;
    }
    lastMonth = m;
  });
  const ly = y0 + 7 * step + 22;
  doc.add(doc.text({ text: 'Less', style: type.monoU, fill: t.ink3 }, { x: x0, y: ly + 7 }));
  t.heat.forEach((c, i) => doc.add(`<rect x="${x0 + 36 + i * 10}" y="${ly}" width="8" height="8" rx="1" fill="${c}"/>`));
  doc.add(doc.text({ text: 'More', style: type.monoU, fill: t.ink3 }, { x: x0 + 36 + 5 * 10 + 4, y: ly + 7 }));
  return doc;
}

export async function rhythm({ theme: t, fonts, s, tzLabel, height = PLATE_HEIGHT }) {
  const H = height;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hasHours = Array.isArray(s.hours) && s.hours.some((v) => v > 0);
  const hPeak = hasHours ? argmax(s.hours) : null, dPeak = argmax(s.weekdays);
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: hasHours ? `Busiest around ${hourLabel(hPeak)}, busiest on ${DAYS[dPeak]}s` : `Busiest on ${DAYS[dPeak]}s` });
  addPlateGlowCss(doc, t);
  plate(doc, { num: '02', title: 'Rhythm', meta: tzLabel, foot: hasHours ? 'Commits by hour of day, last 12 months' : 'Contributions by weekday, last 12 months', height: H });

  if (hasHours) {
    // 3D beveled 24-hour dial with live indicator needle.
    const cx = 124, cy = 192, r0 = 26, rMax = 92;
    const max = Math.max(...s.hours);
    const wedge = (h, r, dy = 0) => {
      const a0 = ((h * 15 - 90 + 1.4) * Math.PI) / 180, a1 = (((h + 1) * 15 - 90 - 1.4) * Math.PI) / 180;
      const p = (a, rad) => `${r2(cx + rad * Math.cos(a))} ${r2(cy + dy + rad * Math.sin(a))}`;
      return `M${p(a0, r0)}L${p(a0, r)}A${r2(r)} ${r2(r)} 0 0 1 ${p(a1, r)}L${p(a1, r0)}A${r0} ${r0} 0 0 0 ${p(a0, r0)}Z`;
    };
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const a = (i * 5 * Math.PI) / 180;
      const rIn = i % 3 === 0 ? rMax - 3.5 : rMax - 1.8;
      ticks.push(`M${r2(cx + rIn * Math.cos(a))} ${r2(cy + rIn * Math.sin(a))}L${r2(cx + rMax * Math.cos(a))} ${r2(cy + rMax * Math.sin(a))}`);
    }
    doc.add(`<circle cx="${cx}" cy="${cy + 3.5}" r="${rMax + 3}" stroke="${t.hair}" stroke-width="2"/>`);
    doc.add(`<circle cx="${cx}" cy="${cy}" r="${rMax + 3}" stroke="${t.hair}" stroke-width="1"/>`);
    doc.add(`<path d="${ticks.join('')}" stroke="${t.hair}" stroke-width="0.8"/>`);
    doc.add(`<circle cx="${cx}" cy="${cy}" r="${rMax}" stroke="${t.hair}"/><circle cx="${cx}" cy="${cy}" r="${r0 + (rMax - r0) / 2}" stroke="${t.hair}"/><circle cx="${cx}" cy="${cy}" r="${r0}" stroke="${t.hair}"/>`);
    doc.css(`@keyframes wedge{from{opacity:0;transform:scale(.5)}}.wedge{animation:wedge 700ms ${EASE_OUT} backwards;transform-origin:${cx}px ${cy}px}`);
    s.hours.forEach((v, h) => {
      const r = v ? r0 + Math.max(3, Math.sqrt(v / max) * (rMax - r0)) : r0 + 2;
      const isPeak = h === hPeak;
      const side = v ? `<path class="wedge-side" d="${wedge(h, r, 3)}" fill="${isPeak ? t.accentInk : t.greys[3]}" opacity="0.55"/>` : '';
      const top = `<path class="wedge-top" d="${wedge(h, r, 0)}" fill="${isPeak ? t.accent : v ? t.wedge : t.hair}"/>`;
      doc.add(`<g class="wedge dial-wedge" data-hour="${h}" data-commits="${v}" data-peak="${isPeak ? 1 : 0}" style="animation-delay:${260 + h * 28}ms">${side}${top}</g>`);
    });
    const peakAngle = (hPeak * 15 + 7.5 - 90) * (Math.PI / 180);
    doc.add(`<g class="dial-needle" data-cx="${cx}" data-cy="${cy}"><line x1="${cx}" y1="${cy}" x2="${r2(cx + (rMax - 4) * Math.cos(peakAngle))}" y2="${r2(cy + (rMax - 4) * Math.sin(peakAngle))}" stroke="${t.accent}" stroke-width="1.4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="5" fill="${t.ink}"/><circle cx="${cx}" cy="${cy}" r="2" fill="${t.accent}"/></g>`);
    for (const [h, lab] of [[0, '00'], [6, '06'], [12, '12'], [18, '18']]) {
      const a = ((h * 15 - 90) * Math.PI) / 180;
      doc.add(doc.text({ text: lab, style: { ...type.monoU }, fill: t.ink3, cls: 'kw' }, { x: cx + (rMax + 14) * Math.cos(a), y: cy + (rMax + 14) * Math.sin(a) + 3.5, anchor: 'middle' }));
    }
    const rx = 262;
    doc.add(doc.text({ text: `${String(hPeak).padStart(2, '0')}:00`, style: { ...type.figure }, fill: t.accent, cls: 'kw' }, { x: rx, y: 128, cls: 'rise', delay: 800, extra: ' data-rhythm-hour="1"' }));
    doc.add(doc.text({ text: 'busiest hour', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 145, cls: 'fade', delay: 900, extra: ' data-rhythm-hour-label="1"' }));
    doc.add(doc.text({ text: formatInt(s.commitCount), style: { ...type.figureS }, fill: t.ink, cls: 'kw' }, { x: rx, y: 196, cls: 'rise', delay: 900, extra: ' data-rhythm-count="1"' }));
    doc.add(doc.text({ text: 'commits', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 212, cls: 'fade', delay: 1000, extra: ' data-rhythm-count-label="1"' }));
    doc.add(doc.text({ text: DAYS[dPeak].slice(0, 3), style: { ...type.figureS }, fill: t.ink, cls: 'kw' }, { x: rx, y: 262, cls: 'rise', delay: 1000 }));
    doc.add(doc.text({ text: 'busiest day', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 278, cls: 'fade', delay: 1100 }));
  } else {
    // Without commit times, the weekday totals carry the plate.
    const base = H - 60, plotH = 150, slot = 396 / 7, w = 22, max = Math.max(...s.weekdays);
    s.weekdays.forEach((v, d) => {
      const x = 8 + slot * d + (slot - w) / 2;
      doc.add(`<path class="grow" style="animation-delay:${260 + d * 50}ms" d="${column(x, base, w, (v / max) * plotH)}" fill="${d === dPeak ? t.accent : t.wedge}"/>`);
      doc.add(doc.text({ text: DAYS[d].slice(0, 3).toUpperCase(), style: { ...type.monoU }, fill: t.ink3, cls: 'kw' }, { x: x + w / 2, y: base + 16, anchor: 'middle' }));
    });
  }
  return doc;
}

export async function streak({ theme: t, fonts, s, height = PLATE_HEIGHT }) {
  const H = height;
  const cur = s.current.length, best = s.longest.length;
  const record = cur > 1 && cur === best;
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `Current streak ${cur} days; longest ${best} days` });
  addPlateGlowCss(doc, t);
  const first = s.days.find(([, c]) => c > 0)?.[0] || s.days[0][0];
  plate(doc, { num: '03', title: 'Streak', meta: 'Days in a row', foot: `Every run of consecutive days since ${monthName(first)} ${year(first)}`, height: H });
  doc.add(odometer(doc, { x: 6, y: 120, text: String(cur), style: type.figureXL, fill: t.accent, delay: 150 }));
  const caption = cur
    ? `${record ? 'days in a row, the longest yet' : `days in a row; the record is ${best}`}`
    : `no streak today; the record is ${best}`;
  doc.add(doc.text({ text: caption, style: type.mono, fill: t.ink2 }, { x: 8, y: 144, cls: 'fade', delay: 600 }));
  if (cur) {
    doc.add(doc.text({ text: shortDate(s.current.start), style: { ...type.figureS }, fill: t.ink, cls: 'kw' }, { x: W - 8, y: 86, anchor: 'end', cls: 'rise', delay: 500, extra: ' data-streak-subnum="1"' }));
    doc.add(doc.text({ text: 'started', style: type.mono, fill: t.ink2 }, { x: W - 8, y: 102, anchor: 'end', cls: 'fade', delay: 620, extra: ' data-streak-sublabel="1"' }));
  }

  // 3D isometric prism spikes for each streak run.
  const t0 = Date.parse(`${first}T00:00:00Z`), t1 = Date.parse(`${s.today}T00:00:00Z`);
  const X = (d) => 10 + ((Date.parse(`${d}T00:00:00Z`) - t0) / Math.max(1, t1 - t0)) * 388;
  const base = H - 52, plotH = 114;
  const live = s.current.length ? s.current.start : null;
  const shown = s.runs.filter((r) => r.length >= 2 || r.start === live);
  doc.add(`<polygon points="6,${base + 3} 404,${base + 3} 408,${base - 2} 10,${base - 2}" fill="${t.hair}"/>`);
  shown.forEach((r, i) => {
    const isLive = r.start === live;
    const isBest = r.length === best;
    const h = Math.max(4, (r.length / best) * plotH);
    const x = X(r.start) - 1.4;
    const w = isLive || isBest ? 3.4 : 2.6;
    const dx = 2.2, dy = -2.0;
    const frontColor = isLive ? t.accent : isBest ? t.ink : t.ink2;
    const sideColor = isLive ? t.accentInk : t.greys[3];
    const prism =
      `<polygon points="${r2(x + w)},${r2(base)} ${r2(x + w + dx)},${r2(base + dy)} ${r2(x + w + dx)},${r2(base - h + dy)} ${r2(x + w)},${r2(base - h)}" fill="${sideColor}" opacity="0.75"/>` +
      `<polygon points="${r2(x)},${r2(base - h)} ${r2(x + dx)},${r2(base - h + dy)} ${r2(x + w + dx)},${r2(base - h + dy)} ${r2(x + w)},${r2(base - h)}" fill="${frontColor}"/>` +
      `<rect class="spike-front" x="${r2(x)}" y="${r2(base - h)}" width="${w}" height="${r2(h)}" fill="${frontColor}"/>`;
    doc.add(`<g class="grow streak-spike" data-start="${shortDate(r.start)}" data-end="${shortDate(r.end)}" data-len="${r.length}" data-live="${isLive ? 1 : 0}" style="animation-delay:${280 + i * 12}ms">${prism}</g>`);
  });
  doc.add(`<rect x="8" y="${base}" width="396" height="1.2" fill="${t.rule}"/>`);
  for (let y = Number(year(first)) + 1; y <= Number(year(s.today)); y++) {
    const x = X(`${y}-01-01`);
    doc.add(`<rect x="${r2(x)}" y="${base}" width="1" height="5" fill="${t.rule}"/>`);
    doc.add(doc.text({ text: String(y), style: { ...type.monoU }, fill: t.ink3, cls: 'kw' }, { x, y: base + 17, anchor: 'middle' }));
  }
  if (live) {
    const lx = X(live) + 0.4;
    doc.add(doc.text({ text: String(cur), style: { ...type.monoNum }, fill: t.accentInk, cls: 'kw' }, { x: lx, y: base - Math.max(4, (cur / best) * plotH) - 8, anchor: 'end', cls: 'fade', delay: 1100 }));
  }
  return doc;
}

const DISPLAY = { TSQL: 'T-SQL', 'Visual Basic .NET': 'VB.NET', 'HTML+Razor': 'Razor', 'Jupyter Notebook': 'Jupyter' };

export async function languages({ theme: t, fonts, items, repos, height = PLATE_HEIGHT }) {
  const H = height;
  items = items.map((it) => ({ ...it, name: DISPLAY[it.name] || it.name }));
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `Languages by code size: ${items.map((i) => `${i.name} ${i.pct}%`).join(', ')}` });
  addPlateGlowCss(doc, t);
  plate(doc, { num: '04', title: 'Languages', meta: repos ? `${repos} repositories` : '', foot: 'Share of code by size; generated code excluded', height: H });

  // 3D beveled segmented bar: the lead language in the accent, the rest in ink steps.
  const colors = items.map((it, i) => (i === 0 ? t.accent : it.other ? t.greys[4] : t.greys[Math.min(i - 1, 3)]));
  const sideColors = items.map((it, i) => (i === 0 ? t.accentInk : t.greys[Math.min(i + 1, 4)]));
  const bx = 8, by = 70, bw = 388, bh = 28, dx = 6, dy = -6, gap = 2.5;
  const usable = bw - gap * (items.length - 1);
  const totalBytes = items.reduce((a, b) => a + b.bytes, 0) || 1;
  let x = bx;
  items.forEach((it, i) => {
    const w = Math.max(2.5, (it.bytes / totalBytes) * usable);
    const topFace = `<polygon points="${r2(x)},${by} ${r2(x + dx)},${by + dy} ${r2(x + w + dx)},${by + dy} ${r2(x + w)},${by}" fill="${colors[i]}" opacity="0.82"/>`;
    const rightFace = `<polygon points="${r2(x + w)},${by} ${r2(x + w + dx)},${by + dy} ${r2(x + w + dx)},${by + bh + dy} ${r2(x + w)},${by + bh}" fill="${sideColors[i]}"/>`;
    const frontFace = `<rect class="lang-front" x="${r2(x)}" y="${by}" width="${r2(w)}" height="${bh}" fill="${colors[i]}"/>`;
    doc.add(`<g class="growx lang-seg" data-lang-idx="${i}" data-lang="${it.name}" data-pct="${it.pct}" style="animation-delay:${200 + i * 90}ms;animation-duration:800ms">${topFace}${rightFace}${frontFace}</g>`);
    x += w + gap;
  });

  // The ledger underneath: swatch, name, share.
  const y0 = by + bh + 38, rowH = 30;
  items.forEach((it, i) => {
    const y = y0 + i * rowH;
    doc.add(`<g class="rise lang-row" data-lang-idx="${i}" style="animation-delay:${520 + i * 60}ms">`);
    doc.add(`<rect class="lang-swatch" x="8" y="${y - 9}" width="9" height="9" rx="1" fill="${colors[i]}"/>`);
    doc.add(doc.text({ text: it.name, style: { ...type.body }, fill: it.other ? t.ink2 : t.ink, cls: 'kw' }, { x: 26, y }));
    doc.add(doc.text({ text: it.pct === 0 ? '<1%' : `${it.pct}%`, style: { ...type.monoNum }, fill: i === 0 ? t.accentInk : t.ink2, cls: 'kw' }, { x: W - 8, y, anchor: 'end' }));
    doc.add(`</g>`);
    if (i < items.length - 1) doc.add(`<rect x="8" y="${y + 11}" width="396" height="1" fill="${t.hair}"/>`);
  });
  return doc;
}
