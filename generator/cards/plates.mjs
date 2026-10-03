// The data plates, set like the pages of a personal annual report (after Nicholas
// Felton): heavy rule, plate number, one large figure, one chart, a mono footnote.
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

export async function output({ theme: t, fonts, s, height = PLATE_HEIGHT }) {
  const H = height;
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `${formatInt(s.lastYearTotal)} contributions in the last 12 months, over ${s.activeDays} active days` });
  const w0 = s.window[0][0], w1 = s.window[s.window.length - 1][0];
  plate(doc, { num: '01', title: 'Output', meta: `${MONTHS_UP(w0)} ’${w0.slice(2, 4)} — ${MONTHS_UP(w1)} ’${w1.slice(2, 4)}`, foot: 'Contributions per day, public and private', height: H });
  doc.add(odometer(doc, { x: 6, y: 120, text: formatInt(s.lastYearTotal), style: type.figureXL, fill: t.ink, delay: 150 }));
  doc.add(doc.text({ text: 'contributions in the last 12 months', style: type.mono, fill: t.ink2 }, { x: 8, y: 144, cls: 'fade', delay: 600 }));
  doc.add(doc.text({ text: String(s.activeDays), style: type.figureS, fill: t.ink }, { x: W - 8, y: 86, anchor: 'end', cls: 'rise', delay: 500 }));
  doc.add(doc.text({ text: 'active days', style: type.mono, fill: t.ink2 }, { x: W - 8, y: 102, anchor: 'end', cls: 'fade', delay: 620 }));

  // Calendar: 53 weeks by 7 days, five steps of one hue, cut at quartiles.
  const vals = s.window.map(([, c]) => c).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] || 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (c) => (c === 0 ? 0 : c <= cuts[0] ? 1 : c <= cuts[1] ? 2 : c <= cuts[2] ? 3 : 4);
  const cell = 5.6, gap = 1, step = cell + gap, x0 = 8, y0 = 190;
  const first = new Date(`${w0}T00:00:00Z`).getUTCDay();
  const cols = [];
  s.window.forEach(([, c], i) => {
    const k = i + first, col = Math.floor(k / 7), row = k % 7;
    (cols[col] ||= []).push(`<rect x="${r2(x0 + col * step)}" y="${r2(y0 + row * step)}" width="${cell}" height="${cell}" fill="${t.heat[level(c)]}"/>`);
  });
  doc.css(`@keyframes col{from{opacity:0;transform:translateY(-5px)}}.col{animation:col 520ms ${EASE_OUT} backwards}`);
  cols.forEach((rects, ci) => doc.add(`<g class="col" style="animation-delay:${320 + ci * 16}ms">${rects.join('')}</g>`));
  // Month initials above the first week that starts in each month.
  let lastCol = -9, lastMonth = null;
  s.window.forEach(([d], i) => {
    const k = i + first, col = Math.floor(k / 7);
    if (k % 7 !== 0) return;
    const m = monthName(d);
    if (m !== lastMonth && col - lastCol >= 4 && col < 50) {
      doc.add(doc.text({ text: m.toUpperCase(), style: type.monoU, fill: t.ink3 }, { x: x0 + col * step, y: y0 - 9 }));
      lastCol = col;
    }
    lastMonth = m;
  });
  const ly = y0 + 7 * step + 24;
  doc.add(doc.text({ text: 'Less', style: type.monoU, fill: t.ink3 }, { x: x0, y: ly + 7 }));
  t.heat.forEach((c, i) => doc.add(`<rect x="${x0 + 36 + i * 10}" y="${ly}" width="8" height="8" fill="${c}"/>`));
  doc.add(doc.text({ text: 'More', style: type.monoU, fill: t.ink3 }, { x: x0 + 36 + 5 * 10 + 4, y: ly + 7 }));
  return doc;
}

export async function rhythm({ theme: t, fonts, s, tzLabel, height = PLATE_HEIGHT }) {
  const H = height;
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hasHours = Array.isArray(s.hours) && s.hours.some((v) => v > 0);
  const hPeak = hasHours ? argmax(s.hours) : null, dPeak = argmax(s.weekdays);
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: hasHours ? `Busiest around ${hourLabel(hPeak)}, busiest on ${DAYS[dPeak]}s` : `Busiest on ${DAYS[dPeak]}s` });
  plate(doc, { num: '02', title: 'Rhythm', meta: tzLabel, foot: hasHours ? 'Commits by hour of day, last 12 months' : 'Contributions by weekday, last 12 months', height: H });

  if (hasHours) {
    // A 24-hour dial, midnight at the top. Wedge length grows with the square root
    // of commits so the area, not the radius, carries the value.
    const cx = 124, cy = 192, r0 = 26, rMax = 92;
    const max = Math.max(...s.hours);
    const wedge = (h, r) => {
      const a0 = ((h * 15 - 90 + 1.4) * Math.PI) / 180, a1 = (((h + 1) * 15 - 90 - 1.4) * Math.PI) / 180;
      const p = (a, rad) => `${r2(cx + rad * Math.cos(a))} ${r2(cy + rad * Math.sin(a))}`;
      return `M${p(a0, r0)}L${p(a0, r)}A${r2(r)} ${r2(r)} 0 0 1 ${p(a1, r)}L${p(a1, r0)}A${r0} ${r0} 0 0 0 ${p(a0, r0)}Z`;
    };
    doc.add(`<circle cx="${cx}" cy="${cy}" r="${rMax}" stroke="${t.hair}"/><circle cx="${cx}" cy="${cy}" r="${r0 + (rMax - r0) / 2}" stroke="${t.hair}"/><circle cx="${cx}" cy="${cy}" r="${r0}" stroke="${t.hair}"/>`);
    doc.css(`@keyframes wedge{from{opacity:0;transform:scale(.5)}}.wedge{animation:wedge 700ms ${EASE_OUT} backwards;transform-origin:${cx}px ${cy}px}`);
    s.hours.forEach((v, h) => {
      if (!v) return;
      const r = r0 + Math.max(2, Math.sqrt(v / max) * (rMax - r0));
      doc.add(`<path class="wedge" style="animation-delay:${260 + h * 36}ms" d="${wedge(h, r)}" fill="${h === hPeak ? t.accent : t.wedge}"/>`);
    });
    for (const [h, lab] of [[0, '00'], [6, '06'], [12, '12'], [18, '18']]) {
      const a = ((h * 15 - 90) * Math.PI) / 180;
      doc.add(doc.text({ text: lab, style: type.monoU, fill: t.ink3 }, { x: cx + (rMax + 13) * Math.cos(a), y: cy + (rMax + 13) * Math.sin(a) + 3.5, anchor: 'middle' }));
    }
    const rx = 262;
    doc.add(doc.text({ text: `${String(hPeak).padStart(2, '0')}:00`, style: type.figure, fill: t.accent }, { x: rx, y: 128, cls: 'rise', delay: 1100 }));
    doc.add(doc.text({ text: 'busiest hour', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 145, cls: 'fade', delay: 1200 }));
    doc.add(doc.text({ text: formatInt(s.commitCount), style: type.figureS, fill: t.ink }, { x: rx, y: 196, cls: 'rise', delay: 1200 }));
    doc.add(doc.text({ text: 'commits', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 212, cls: 'fade', delay: 1300 }));
    doc.add(doc.text({ text: DAYS[dPeak].slice(0, 3), style: type.figureS, fill: t.ink }, { x: rx, y: 262, cls: 'rise', delay: 1300 }));
    doc.add(doc.text({ text: 'busiest day', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 278, cls: 'fade', delay: 1400 }));
  } else {
    // Without commit times, the weekday totals carry the plate.
    const base = H - 60, plotH = 150, slot = 396 / 7, w = 22, max = Math.max(...s.weekdays);
    s.weekdays.forEach((v, d) => {
      const x = 8 + slot * d + (slot - w) / 2;
      doc.add(`<path class="grow" style="animation-delay:${260 + d * 50}ms" d="${column(x, base, w, (v / max) * plotH)}" fill="${d === dPeak ? t.accent : t.wedge}"/>`);
      doc.add(doc.text({ text: DAYS[d].slice(0, 3).toUpperCase(), style: type.monoU, fill: t.ink3 }, { x: x + w / 2, y: base + 16, anchor: 'middle' }));
    });
  }
  return doc;
}

export async function streak({ theme: t, fonts, s, height = PLATE_HEIGHT }) {
  const H = height;
  const cur = s.current.length, best = s.longest.length;
  const record = cur > 1 && cur === best;
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `Current streak ${cur} days; longest ${best} days` });
  const first = s.days.find(([, c]) => c > 0)?.[0] || s.days[0][0];
  plate(doc, { num: '03', title: 'Streak', meta: 'Days in a row', foot: `Every run of consecutive days since ${monthName(first)} ${year(first)}`, height: H });
  doc.add(odometer(doc, { x: 6, y: 120, text: String(cur), style: type.figureXL, fill: t.accent, delay: 150 }));
  const caption = cur
    ? `${record ? 'days in a row, the longest yet' : `days in a row; the record is ${best}`}`
    : `no streak today; the record is ${best}`;
  doc.add(doc.text({ text: caption, style: type.mono, fill: t.ink2 }, { x: 8, y: 144, cls: 'fade', delay: 600 }));
  if (cur) {
    doc.add(doc.text({ text: shortDate(s.current.start), style: type.figureS, fill: t.ink }, { x: W - 8, y: 86, anchor: 'end', cls: 'rise', delay: 500 }));
    doc.add(doc.text({ text: 'started', style: type.mono, fill: t.ink2 }, { x: W - 8, y: 102, anchor: 'end', cls: 'fade', delay: 620 }));
  }

  // A time band from the first contribution to today: one spike per run,
  // as tall as the run is long. The run still going takes the accent.
  const t0 = Date.parse(`${first}T00:00:00Z`), t1 = Date.parse(`${s.today}T00:00:00Z`);
  const X = (d) => 8 + ((Date.parse(`${d}T00:00:00Z`) - t0) / Math.max(1, t1 - t0)) * 392;
  const base = H - 52, plotH = 112;
  const live = s.current.length ? s.current.start : null;
  const shown = s.runs.filter((r) => r.length >= 2 || r.start === live);
  shown.forEach((r, i) => {
    const isLive = r.start === live;
    const h = Math.max(3, (r.length / best) * plotH);
    doc.add(`<path class="grow" style="animation-delay:${300 + i * 12}ms" d="${column(X(r.start) - 1.1, base, isLive ? 3 : 2.2, h)}" fill="${isLive ? t.accent : t.ink2}"/>`);
  });
  doc.add(`<rect x="8" y="${base}" width="396" height="1" fill="${t.rule}"/>`);
  // Year ticks.
  for (let y = Number(year(first)) + 1; y <= Number(year(s.today)); y++) {
    const x = X(`${y}-01-01`);
    doc.add(`<rect x="${r2(x)}" y="${base}" width="1" height="5" fill="${t.rule}"/>`);
    doc.add(doc.text({ text: String(y), style: type.monoU, fill: t.ink3 }, { x, y: base + 17, anchor: 'middle' }));
  }
  if (live) {
    const lx = X(live) + 0.4;
    doc.add(doc.text({ text: String(cur), style: type.monoNum, fill: t.accentInk }, { x: lx, y: base - Math.max(3, (cur / best) * plotH) - 8, anchor: 'end', cls: 'fade', delay: 1100 }));
  }
  return doc;
}

const DISPLAY = { TSQL: 'T-SQL', 'Visual Basic .NET': 'VB.NET', 'HTML+Razor': 'Razor', 'Jupyter Notebook': 'Jupyter' };

export async function languages({ theme: t, fonts, items, repos, height = PLATE_HEIGHT }) {
  const H = height;
  items = items.map((it) => ({ ...it, name: DISPLAY[it.name] || it.name }));
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `Languages by code size: ${items.map((i) => `${i.name} ${i.pct}%`).join(', ')}` });
  plate(doc, { num: '04', title: 'Languages', meta: repos ? `${repos} repositories` : '', foot: 'Share of code by size; generated code excluded', height: H });

  // One band for the whole: the lead language in the accent, the rest in ink steps.
  const colors = items.map((it, i) => (i === 0 ? t.accent : it.other ? t.greys[4] : t.greys[Math.min(i - 1, 3)]));
  const bx = 8, by = 64, bw = 396, bh = 30, gap = 2;
  const usable = bw - gap * (items.length - 1);
  let x = bx;
  items.forEach((it, i) => {
    const w = Math.max(1.5, (it.bytes / items.reduce((a, b) => a + b.bytes, 0)) * usable);
    doc.add(`<rect class="growx" style="animation-delay:${200 + i * 90}ms;animation-duration:800ms" x="${r2(x)}" y="${by}" width="${r2(w)}" height="${bh}" fill="${colors[i]}"/>`);
    x += w + gap;
  });

  // The ledger underneath: swatch, name, share.
  const y0 = by + bh + 40, rowH = 30;
  items.forEach((it, i) => {
    const y = y0 + i * rowH;
    doc.add(`<g class="rise" style="animation-delay:${520 + i * 60}ms">`);
    doc.add(`<rect x="8" y="${y - 9}" width="9" height="9" fill="${colors[i]}"/>`);
    doc.add(doc.text({ text: it.name, style: type.body, fill: it.other ? t.ink2 : t.ink }, { x: 26, y }));
    doc.add(doc.text({ text: it.pct === 0 ? '<1%' : `${it.pct}%`, style: type.monoNum, fill: i === 0 ? t.accentInk : t.ink2 }, { x: W - 8, y, anchor: 'end' }));
    doc.add(`</g>`);
    if (i < items.length - 1) doc.add(`<rect x="8" y="${y + 11}" width="396" height="1" fill="${t.hair}"/>`);
  });
  return doc;
}
