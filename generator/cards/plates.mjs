// The data plates, set like the pages of a personal annual report (after Nicholas
// Felton): heavy rule, plate number, one large figure, one 3D extruded chart, a mono footnote.
// Every 3D & glow animation here runs 100% natively inside GitHub's <img src="...svg">!

import { Doc, EASE_OUT } from '../lib/doc.mjs';
import { r2, column, formatInt } from '../lib/svg.mjs';
import { plate, odometer } from '../lib/kit.mjs';
import { type } from '../lib/theme.mjs';
import { argmax, monthName, shortDate, hourLabel } from '../lib/stats.mjs';

const W = 412;
export const PLATE_HEIGHT = 340;
const MONTHS_UP = (d) => monthName(d).toUpperCase();
const year = (d) => d.slice(0, 4);

function addPlateGlow(doc, t) {
  doc.def(
    `<filter id="glow" x="-35%" y="-35%" width="170%" height="170%">` +
      `<feGaussianBlur stdDeviation="3.5" result="b"/>` +
      `<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`
  );
  doc.css(
    `@keyframes kwGlow{` +
      `0%,72%,100%{fill:${t.ink};filter:none}` +
      `80%,90%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `.kw{animation:kwGlow 6.8s ease-in-out infinite}`
  );
}

export async function output({ theme: t, fonts, s, height = PLATE_HEIGHT }) {
  const H = height;
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `${formatInt(s.lastYearTotal)} contributions in the last 12 months, over ${s.activeDays} active days` });
  addPlateGlow(doc, t);
  doc.css(
    `@keyframes calLift{` +
      `0%,78%,100%{transform:translateY(0)}` +
      `85%,92%{transform:translateY(-4.5px)}` +
    `}` +
    `@keyframes calGlow3{` +
      `0%,78%,100%{fill:${t.heat[3]};filter:none}` +
      `85%,92%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes calGlow4{` +
      `0%,78%,100%{fill:${t.heat[4]};filter:none}` +
      `85%,92%{fill:#ff9b73;filter:url(#glow)}` +
    `}` +
    `.cal-lift{animation:calLift 5.4s ease-in-out infinite}` +
    `.cal-g3{animation:calGlow3 5.4s ease-in-out infinite}` +
    `.cal-g4{animation:calGlow4 5.4s ease-in-out infinite}`
  );

  const w0 = s.window[0][0], w1 = s.window[s.window.length - 1][0];
  plate(doc, { num: '01', title: 'Output', meta: `${MONTHS_UP(w0)} ’${w0.slice(2, 4)} — ${MONTHS_UP(w1)} ’${w1.slice(2, 4)}`, foot: 'Contributions per day, public and private', height: H });
  doc.add(odometer(doc, { x: 6, y: 120, text: formatInt(s.lastYearTotal), style: type.figureXL, fill: t.ink, delay: 150 }));
  doc.add(doc.text({ text: 'contributions in the last 12 months', style: type.mono, fill: t.ink2 }, { x: 8, y: 144, cls: 'fade', delay: 600 }));
  doc.add(doc.text({ text: String(s.activeDays), style: { ...type.figureS }, fill: t.ink, cls: 'kw', delay: 1200 }, { x: W - 8, y: 86, anchor: 'end', cls: 'rise', delay: 500 }));
  doc.add(doc.text({ text: 'active days', style: type.mono, fill: t.ink2 }, { x: W - 8, y: 102, anchor: 'end', cls: 'fade', delay: 620 }));

  // 3D extruded calendar: 53 weeks by 7 days, with diagonal 3D levitation & glow wave
  const vals = s.window.map(([, c]) => c).filter((c) => c > 0).sort((a, b) => a - b);
  const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] || 1;
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const level = (c) => (c === 0 ? 0 : c <= cuts[0] ? 1 : c <= cuts[1] ? 2 : c <= cuts[2] ? 3 : 4);
  const cell = 5.6, gap = 1.2, step = cell + gap, x0 = 10, y0 = 192;
  const first = new Date(`${w0}T00:00:00Z`).getUTCDay();
  const cols = [];
  s.window.forEach(([, c], i) => {
    const k = i + first, col = Math.floor(k / 7), row = k % 7;
    const lv = level(c);
    const x = x0 + col * step, y = y0 + row * step;
    const lift = lv === 0 ? 0 : lv * 0.85;
    const shade = lv >= 3 ? t.accentInk : t.greys[Math.min(4, 5 - lv)];
    const side = lift > 0
      ? `<path d="M${r2(x)} ${r2(y + cell)}L${r2(x)} ${r2(y + cell - lift)}L${r2(x + cell)} ${r2(y + cell - lift)}L${r2(x + cell)} ${r2(y - lift)}L${r2(x + cell)} ${r2(y)}L${r2(x + cell)} ${r2(y + cell)}Z" fill="${shade}" opacity="0.65"/>`
      : '';
    const waveDelay = 600 + col * 85 + row * 40;
    const topCls = lv === 4 ? ' class="cal-g4"' : lv === 3 ? ' class="cal-g3"' : '';
    const topStyle = lv >= 3 ? ` style="animation-delay:${waveDelay}ms"` : '';
    const top = `<rect${topCls}${topStyle} x="${r2(x)}" y="${r2(y - lift)}" width="${cell}" height="${cell}" rx="0.8" fill="${t.heat[lv]}"/>`;
    const gAttr = lv >= 3 ? ` class="cal-lift" style="animation-delay:${waveDelay}ms"` : '';
    (cols[col] ||= []).push(`<g${gAttr}>${side}${top}</g>`);
  });
  doc.css(`@keyframes col{from{opacity:0;transform:translateY(-5px)}}.col{animation:col 520ms ${EASE_OUT} backwards}`);
  cols.forEach((rects, ci) => doc.add(`<g class="col" style="animation-delay:${320 + ci * 14}ms">${rects.join('')}</g>`));

  let lastCol = -9, lastMonth = null;
  s.window.forEach(([d], i) => {
    const k = i + first, col = Math.floor(k / 7);
    if (k % 7 !== 0) return;
    const m = monthName(d);
    if (m !== lastMonth && col - lastCol >= 4 && col < 50) {
      doc.add(doc.text({ text: m.toUpperCase(), style: { ...type.monoU }, fill: t.ink3 }, { x: x0 + col * step, y: y0 - 11 }));
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
  addPlateGlow(doc, t);
  plate(doc, { num: '02', title: 'Rhythm', meta: tzLabel, foot: hasHours ? 'Commits by hour of day, last 12 months' : 'Contributions by weekday, last 12 months', height: H });

  if (hasHours) {
    const cx = 124, cy = 192, r0 = 26, rMax = 92;
    const max = Math.max(...s.hours);
    doc.css(
      `@keyframes wedgeGlow{` +
        `0%,78%,100%{fill:${t.wedge};filter:none}` +
        `85%,92%{fill:${t.accent};filter:url(#glow)}` +
      `}` +
      `@keyframes peakPulse{` +
        `0%,100%{fill:${t.accent};filter:none}` +
        `50%{fill:#ff9b73;filter:url(#glow)}` +
      `}` +
      `@keyframes radarPing{` +
        `0%{r:${r0}px;opacity:.75}` +
        `100%{r:${rMax}px;opacity:0}` +
      `}` +
      `.w-glow{animation:wedgeGlow 6s ease-in-out infinite}` +
      `.w-peak{animation:peakPulse 2.4s ease-in-out infinite}` +
      `.radar-ring{animation:radarPing 3.2s cubic-bezier(0.16,1,0.3,1) infinite}`
    );

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
    doc.add(`<circle class="radar-ring" cx="${cx}" cy="${cy}" r="${r0}" stroke="${t.accent}" stroke-width="1.2"/>`);

    doc.css(`@keyframes wedge{from{opacity:0;transform:scale(.5)}}.wedge{animation:wedge 700ms ${EASE_OUT} backwards;transform-origin:${cx}px ${cy}px}`);
    s.hours.forEach((v, h) => {
      if (!v) return;
      const r = r0 + Math.max(3, Math.sqrt(v / max) * (rMax - r0));
      const isPeak = h === hPeak;
      const side = `<path d="${wedge(h, r, 3)}" fill="${isPeak ? t.accentInk : t.greys[3]}" opacity="0.55"/>`;
      const topCls = isPeak ? ' class="w-peak"' : ' class="w-glow"';
      const topDelay = isPeak ? '' : ` style="animation-delay:${h * 250}ms"`;
      const top = `<path${topCls}${topDelay} d="${wedge(h, r, 0)}" fill="${isPeak ? t.accent : t.wedge}"/>`;
      doc.add(`<g class="wedge" style="animation-delay:${260 + h * 28}ms">${side}${top}</g>`);
    });

    const peakAngle = (hPeak * 15 + 7.5 - 90) * (Math.PI / 180);
    doc.add(
      `<g>` +
      `<line x1="${cx}" y1="${cy}" x2="${r2(cx + (rMax - 4) * Math.cos(peakAngle))}" y2="${r2(cy + (rMax - 4) * Math.sin(peakAngle))}" stroke="${t.accent}" stroke-width="1.8" stroke-linecap="round" filter="url(#glow)">` +
      `<animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy}; 360 ${cx} ${cy}; 360 ${cx} ${cy}" keyTimes="0; 0.45; 1" dur="6s" repeatCount="indefinite"/>` +
      `</line>` +
      `<circle cx="${cx}" cy="${cy}" r="5" fill="${t.ink}"/><circle cx="${cx}" cy="${cy}" r="2.2" fill="${t.accent}"/>` +
      `</g>`
    );

    for (const [h, lab] of [[0, '00'], [6, '06'], [12, '12'], [18, '18']]) {
      const a = ((h * 15 - 90) * Math.PI) / 180;
      doc.add(doc.text({ text: lab, style: { ...type.monoU }, fill: t.ink3 }, { x: cx + (rMax + 14) * Math.cos(a), y: cy + (rMax + 14) * Math.sin(a) + 3.5, anchor: 'middle' }));
    }
    const rx = 262;
    doc.add(doc.text({ text: `${String(hPeak).padStart(2, '0')}:00`, style: { ...type.figure }, fill: t.accent, cls: 'kw', delay: 800 }, { x: rx, y: 128, cls: 'rise', delay: 800 }));
    doc.add(doc.text({ text: 'busiest hour', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 145, cls: 'fade', delay: 900 }));
    doc.add(doc.text({ text: formatInt(s.commitCount), style: { ...type.figureS }, fill: t.ink, cls: 'kw', delay: 2200 }, { x: rx, y: 196, cls: 'rise', delay: 900 }));
    doc.add(doc.text({ text: 'commits', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 212, cls: 'fade', delay: 1000 }));
    doc.add(doc.text({ text: DAYS[dPeak].slice(0, 3), style: { ...type.figureS }, fill: t.ink, cls: 'kw', delay: 3600 }, { x: rx, y: 262, cls: 'rise', delay: 1000 }));
    doc.add(doc.text({ text: 'busiest day', style: type.mono, fill: t.ink2 }, { x: rx + 2, y: 278, cls: 'fade', delay: 1100 }));
  } else {
    const base = H - 60, plotH = 150, slot = 396 / 7, w = 22, max = Math.max(...s.weekdays);
    s.weekdays.forEach((v, d) => {
      const x = 8 + slot * d + (slot - w) / 2;
      doc.add(`<path class="grow" style="animation-delay:${260 + d * 50}ms" d="${column(x, base, w, (v / max) * plotH)}" fill="${d === dPeak ? t.accent : t.wedge}"/>`);
      doc.add(doc.text({ text: DAYS[d].slice(0, 3).toUpperCase(), style: { ...type.monoU }, fill: t.ink3 }, { x: x + w / 2, y: base + 16, anchor: 'middle' }));
    });
  }
  return doc;
}

export async function streak({ theme: t, fonts, s, height = PLATE_HEIGHT }) {
  const H = height;
  const cur = s.current.length, best = s.longest.length;
  const record = cur > 1 && cur === best;
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `Current streak ${cur} days; longest ${best} days` });
  addPlateGlow(doc, t);
  doc.css(
    `@keyframes spkGlow{` +
      `0%,78%,100%{fill:${t.ink2};filter:none}` +
      `85%,92%{fill:${t.accent};filter:url(#glow)}` +
    `}` +
    `@keyframes spkLive{` +
      `0%,100%{fill:${t.accent};filter:none}` +
      `50%{fill:#ff9b73;filter:url(#glow)}` +
    `}` +
    `.spk-w{animation:spkGlow 5.6s ease-in-out infinite}` +
    `.spk-live{animation:spkLive 2s ease-in-out infinite}`
  );

  const first = s.days.find(([, c]) => c > 0)?.[0] || s.days[0][0];
  plate(doc, { num: '03', title: 'Streak', meta: 'Days in a row', foot: `Every run of consecutive days since ${monthName(first)} ${year(first)}`, height: H });
  doc.add(odometer(doc, { x: 6, y: 120, text: String(cur), style: type.figureXL, fill: t.accent, delay: 150 }));
  const caption = cur
    ? `${record ? 'days in a row, the longest yet' : `days in a row; the record is ${best}`}`
    : `no streak today; the record is ${best}`;
  doc.add(doc.text({ text: caption, style: type.mono, fill: t.ink2 }, { x: 8, y: 144, cls: 'fade', delay: 600 }));
  if (cur) {
    doc.add(doc.text({ text: shortDate(s.current.start), style: { ...type.figureS }, fill: t.ink, cls: 'kw', delay: 1500 }, { x: W - 8, y: 86, anchor: 'end', cls: 'rise', delay: 500 }));
    doc.add(doc.text({ text: 'started', style: type.mono, fill: t.ink2 }, { x: W - 8, y: 102, anchor: 'end', cls: 'fade', delay: 620 }));
  }

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
    const waveDelay = 600 + i * 190;
    const frontCls = isLive ? ' class="spk-live"' : ' class="spk-w"';
    const frontStyle = isLive ? '' : ` style="animation-delay:${waveDelay}ms"`;
    const prism =
      `<polygon points="${r2(x + w)},${r2(base)} ${r2(x + w + dx)},${r2(base + dy)} ${r2(x + w + dx)},${r2(base - h + dy)} ${r2(x + w)},${r2(base - h)}" fill="${sideColor}" opacity="0.75"/>` +
      `<polygon points="${r2(x)},${r2(base - h)} ${r2(x + dx)},${r2(base - h + dy)} ${r2(x + w + dx)},${r2(base - h + dy)} ${r2(x + w)},${r2(base - h)}" fill="${frontColor}"/>` +
      `<rect${frontCls}${frontStyle} x="${r2(x)}" y="${r2(base - h)}" width="${w}" height="${r2(h)}" fill="${frontColor}"/>`;
    doc.add(`<g class="grow" style="animation-delay:${260 + i * 14}ms">${prism}</g>`);
  });
  doc.add(`<rect x="8" y="${base}" width="396" height="1.2" fill="${t.rule}"/>`);
  for (let y = Number(year(first)) + 1; y <= Number(year(s.today)); y++) {
    const x = X(`${y}-01-01`);
    doc.add(`<rect x="${r2(x)}" y="${base}" width="1" height="5" fill="${t.rule}"/>`);
    doc.add(doc.text({ text: String(y), style: { ...type.monoU }, fill: t.ink3 }, { x, y: base + 17, anchor: 'middle' }));
  }
  if (live) {
    const lx = X(live) + 0.4;
    doc.add(doc.text({ text: String(cur), style: { ...type.monoNum }, fill: t.accentInk, cls: 'kw', delay: 900 }, { x: lx, y: base - Math.max(4, (cur / best) * plotH) - 8, anchor: 'end', cls: 'fade', delay: 1100 }));
  }
  return doc;
}

const DISPLAY = { TSQL: 'T-SQL', 'Visual Basic .NET': 'VB.NET', 'HTML+Razor': 'Razor', 'Jupyter Notebook': 'Jupyter' };

export async function languages({ theme: t, fonts, items, repos, height = PLATE_HEIGHT }) {
  const H = height;
  items = items.map((it) => ({ ...it, name: DISPLAY[it.name] || it.name }));
  const doc = new Doc({ width: W, height: H, theme: t, fonts, title: `Languages by code size: ${items.map((i) => `${i.name} ${i.pct}%`).join(', ')}` });
  addPlateGlow(doc, t);
  doc.css(
    `@keyframes segLift{` +
      `0%,76%,100%{transform:translateY(0);filter:none}` +
      `83%,92%{transform:translateY(-4.5px);filter:url(#glow)}` +
    `}` +
    `@keyframes rowShift{` +
      `0%,76%,100%{transform:translateX(0)}` +
      `83%,92%{transform:translateX(5px)}` +
    `}` +
    `.seg-wave{animation:segLift 6s ease-in-out infinite}` +
    `.row-wave{animation:rowShift 6s ease-in-out infinite}`
  );

  plate(doc, { num: '04', title: 'Languages', meta: repos ? `${repos} repositories` : '', foot: 'Share of code by size; generated code excluded', height: H });

  const colors = items.map((it, i) => (i === 0 ? t.accent : it.other ? t.greys[4] : t.greys[Math.min(i - 1, 3)]));
  const sideColors = items.map((it, i) => (i === 0 ? t.accentInk : t.greys[Math.min(i + 1, 4)]));
  const bx = 8, by = 70, bw = 388, bh = 28, dx = 6, dy = -6, gap = 2.5;
  const usable = bw - gap * (items.length - 1);
  const totalBytes = items.reduce((a, b) => a + b.bytes, 0) || 1;
  let x = bx;
  items.forEach((it, i) => {
    const w = Math.max(2.5, (it.bytes / totalBytes) * usable);
    const scanDelay = 800 + i * 950;
    const topFace = `<polygon points="${r2(x)},${by} ${r2(x + dx)},${by + dy} ${r2(x + w + dx)},${by + dy} ${r2(x + w)},${by}" fill="${colors[i]}" opacity="0.82"/>`;
    const rightFace = `<polygon points="${r2(x + w)},${by} ${r2(x + w + dx)},${by + dy} ${r2(x + w + dx)},${by + bh + dy} ${r2(x + w)},${by + bh}" fill="${sideColors[i]}"/>`;
    const frontFace = `<rect x="${r2(x)}" y="${by}" width="${r2(w)}" height="${bh}" fill="${colors[i]}"/>`;
    doc.add(`<g class="growx" style="animation-delay:${200 + i * 90}ms;animation-duration:800ms"><g class="seg-wave" style="animation-delay:${scanDelay}ms">${topFace}${rightFace}${frontFace}</g></g>`);
    x += w + gap;
  });

  const y0 = by + bh + 38, rowH = 30;
  items.forEach((it, i) => {
    const y = y0 + i * rowH;
    const scanDelay = 800 + i * 950;
    doc.add(`<g class="rise" style="animation-delay:${520 + i * 60}ms"><g class="row-wave" style="animation-delay:${scanDelay}ms">`);
    doc.add(`<rect x="8" y="${y - 9}" width="9" height="9" rx="1" fill="${colors[i]}"/>`);
    doc.add(doc.text({ text: it.name, style: { ...type.body }, fill: it.other ? t.ink2 : t.ink, cls: 'kw', delay: scanDelay }, { x: 26, y }));
    doc.add(doc.text({ text: it.pct === 0 ? '<1%' : `${it.pct}%`, style: { ...type.monoNum }, fill: i === 0 ? t.accentInk : t.ink2, cls: 'kw', delay: scanDelay }, { x: W - 8, y, anchor: 'end' }));
    doc.add(`</g></g>`);
    if (i < items.length - 1) doc.add(`<rect x="8" y="${y + 11}" width="396" height="1" fill="${t.hair}"/>`);
  });
  return doc;
}
