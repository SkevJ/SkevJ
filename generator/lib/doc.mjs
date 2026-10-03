// An SVG document under construction: tracks which characters each font cut uses
// (so the embedded font can be subset), and offers text primitives.

import { esc, r2 } from './svg.mjs';

// Motion follows Emil Kowalski's rules: entrances use a strong ease-out, nothing
// grows out of nothing (scale starts at .92), items stagger 30–80ms apart, and
// every element plays once and rests. The un-animated state is always the final
// state, so viewers that ignore CSS animation, and reduced motion, see the
// finished card.
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

const MOTION = `
@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@keyframes fade{from{opacity:0}}
@keyframes grow{from{transform:scaleY(0)}}
@keyframes growx{from{transform:scaleX(0)}}
@keyframes pop{from{opacity:0;transform:scale(.92)}}
@keyframes lineup{from{transform:translateY(var(--from))}}
@keyframes odo{from{transform:translateY(0)}to{transform:translateY(var(--to))}}
@keyframes stop{from{fill-opacity:0}}
.rise{animation:rise 900ms ${EASE_OUT} backwards}
.fade{animation:fade 900ms ${EASE_OUT} backwards}
.grow{animation:grow 900ms ${EASE_OUT} backwards;transform-box:fill-box;transform-origin:50% 100%}
.growx{animation:growx 1100ms ${EASE_OUT} backwards;transform-box:fill-box;transform-origin:0 50%}
.pop{animation:pop 520ms ${EASE_OUT} backwards;transform-box:fill-box;transform-origin:50% 50%}
.lineup{animation:lineup 1000ms ${EASE_OUT} backwards}
.odo{animation:odo 1600ms ${EASE_OUT} backwards}
.stop{animation:stop 480ms ${EASE_OUT} backwards}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`;

export class Doc {
  constructor({ width, height, theme, fonts, title }) {
    this.width = width;
    this.height = height;
    this.theme = theme;
    this.fonts = fonts;
    this.title = title;
    this.defs = [];
    this.body = [];
    this.usage = new Map();
    this.overflows = [];
    this.styles = [];
  }

  // Extra CSS for this one SVG (card-specific keyframes and classes).
  css(rules) {
    this.styles.push(rules);
    return this;
  }

  use(style, str) {
    let set = this.usage.get(style.v);
    if (!set) this.usage.set(style.v, (set = new Set()));
    for (const ch of String(str)) set.add(ch);
  }

  add(...parts) {
    this.body.push(...parts.filter(Boolean));
    return this;
  }

  def(...parts) {
    this.defs.push(...parts);
    return this;
  }

  measure(str, style) {
    return this.fonts.measure(style.upper ? String(str).toUpperCase() : str, style);
  }

  width_(runs) {
    if (!Array.isArray(runs)) runs = [runs];
    return runs.reduce((w, r) => w + this.measure(r.text, r.style), 0);
  }

  // <text> made of one or more runs that share a baseline.
  text(runs, { x, y, anchor = 'start', cls, delay, extra = '' }) {
    if (!Array.isArray(runs)) runs = [runs];
    // Layout guard: text must stay inside the image, with 6px of air at each edge.
    const w = this.width_(runs);
    const left = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
    if (left < 6 || left + w > this.width - 6) {
      this.overflows.push(`"${runs.map((r) => r.text).join('')}" spans ${Math.round(left)}–${Math.round(left + w)} of ${this.width}`);
    }
    const spans = runs.map((run) => {
      const { text, style, fill } = run;
      const shown = style.upper ? text.toUpperCase() : text;
      this.use(style, shown);
      const ls = style.track ? ` letter-spacing="${r2(style.track * style.size)}"` : '';
      // A run can carry its own animation (only fill-opacity animates on a tspan).
      const cls = run.cls ? ` ${run.cls}` : '';
      const st = run.delay ? ` style="animation-delay:${run.delay}ms"` : '';
      return `<tspan class="${style.v}${cls}"${st} font-size="${style.size}"${ls} fill="${fill || this.theme.ink}">${esc(shown)}</tspan>`;
    });
    const anim = cls ? ` class="${cls}"${delay ? ` style="animation-delay:${delay}ms"` : ''}` : '';
    const ta = anchor !== 'start' ? ` text-anchor="${anchor}"` : '';
    return `<text x="${r2(x)}" y="${r2(y)}"${ta}${anim}${extra}>${spans.join('')}</text>`;
  }

  // Wrapped paragraph. Returns { svg, lines, height } with baselines from y.
  paragraph(runs, { x, y, width, lh, cls, delay }) {
    if (!Array.isArray(runs)) runs = [runs];
    const lines = this.fonts.wrap(runs, width);
    const lineHeight = lh || runs[0].style.lh || runs[0].style.size * 1.45;
    const svg = lines.map((line, i) => this.text(line, { x, y: y + i * lineHeight, cls, delay: delay !== undefined ? delay + i * 40 : undefined }));
    return { svg: svg.join(''), lines: lines.length, height: (lines.length - 1) * lineHeight };
  }

  async render() {
    const css = await this.fonts.css(this.usage);
    const title = this.title ? `<title>${esc(this.title)}</title>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${Math.ceil(this.height)}" viewBox="0 0 ${this.width} ${Math.ceil(this.height)}" role="img" fill="none">${title}<style>${css}${MOTION.replace(/\n/g, '')}${this.styles.join('')}</style><defs>${this.defs.join('')}</defs>${this.body.join('')}</svg>\n`;
  }
}
