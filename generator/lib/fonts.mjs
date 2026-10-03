// Fonts, fetched from Google Fonts at build time.
//
// SVGs shown through <img> cannot load external files, so each card embeds the
// font as a data: URI, subset to exactly the characters that card uses (a few KB).
// Layout needs real glyph widths before any SVG exists, so we also download a
// TrueType copy of a broad character set once and read its advance widths.
// If Google Fonts is unreachable the cards still build: widths fall back to an
// estimate and the text renders in the viewer's system font.

const CSS_API = 'https://fonts.googleapis.com/css2';
const MODERN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// A variant is one static cut of a Google font: `spec` is the css2 family
// parameter, `family` the name the SVG's CSS uses for it. Metrics and the
// embedded subset always come from the same cut.
export const VARIANTS = {
  AX: { family: 'Archivo Expanded', spec: 'Archivo:wdth,wght@125,900', weight: 900 },
  AL: { family: 'Archivo Label', spec: 'Archivo:wdth,wght@100,600', weight: 600 },
  NS: { family: 'Newsreader', spec: 'Newsreader:opsz,wght@14,400', weight: 400, fallback: 'serif' },
  NI: { family: 'Newsreader Italic', spec: 'Newsreader:ital,opsz,wght@1,14,400', weight: 400, style: 'italic', fallback: 'serif' },
  PM: { family: 'Plex Mono', spec: 'IBM Plex Mono:wght@400', weight: 400, fallback: 'mono' },
  PB: { family: 'Plex Mono Medium', spec: 'IBM Plex Mono:wght@500', weight: 500, fallback: 'mono' },
};

const STACKS = {
  sans: `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
  serif: `Georgia, 'Times New Roman', serif`,
  mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`,
};

const BROAD =
  Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') +
  'ÁÉÍÓÚÑÜáéíóúñü¿¡·•–—…‘’“”→↗−×✓ ';

async function get(url, { ua, binary = false, timeout = 15000, tries = 3 } = {}) {
  let lastError;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: ua ? { 'User-Agent': ua } : {},
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.slice(0, 80)}`);
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw lastError;
}

// Google answers modern browsers with WOFF2 and unknown clients with TrueType.
async function fetchSubset(variant, text, format) {
  const url = `${CSS_API}?family=${variant.spec.replace(/ /g, '+')}&text=${encodeURIComponent(text)}`;
  const css = await get(url, { ua: format === 'woff2' ? MODERN_UA : undefined });
  const m = css.match(/url\((https:[^)]+)\)\s*format\('([\w-]+)'\)/);
  if (!m) throw new Error('No font URL in Google Fonts response');
  return { data: await get(m[1], { binary: true }), format: m[2] };
}

// Minimal TrueType reader: unitsPerEm, cmap (formats 4 and 12) and advance widths.
export function parseTTF(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tables = {};
  const numTables = dv.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    const tag = String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
    tables[tag] = dv.getUint32(o + 8);
  }
  for (const t of ['head', 'hhea', 'hmtx', 'cmap']) if (tables[t] === undefined) throw new Error(`TTF lacks ${t}`);
  const unitsPerEm = dv.getUint16(tables.head + 18);
  const nMetrics = dv.getUint16(tables.hhea + 34);
  const advances = new Uint16Array(nMetrics);
  for (let i = 0; i < nMetrics; i++) advances[i] = dv.getUint16(tables.hmtx + i * 4);

  const cmap = tables.cmap;
  let best = null;
  for (let i = 0, n = dv.getUint16(cmap + 2); i < n; i++) {
    const platform = dv.getUint16(cmap + 4 + i * 8);
    const offset = cmap + dv.getUint32(cmap + 8 + i * 8);
    const format = dv.getUint16(offset);
    if (platform !== 0 && platform !== 3) continue;
    if (format === 12) { best = { offset, format }; break; }
    if (format === 4 && !best) best = { offset, format };
  }
  if (!best) throw new Error('TTF has no usable cmap');

  const glyphs = new Map();
  if (best.format === 4) {
    const o = best.offset;
    const segX2 = dv.getUint16(o + 6);
    const ends = o + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = dv.getUint16(ends + s * 2);
      const start = dv.getUint16(starts + s * 2);
      const delta = dv.getInt16(deltas + s * 2);
      const range = dv.getUint16(ranges + s * 2);
      for (let c = start; c <= end && c !== 0xffff; c++) {
        let g;
        if (range === 0) g = (c + delta) & 0xffff;
        else {
          g = dv.getUint16(ranges + s * 2 + range + (c - start) * 2);
          if (g !== 0) g = (g + delta) & 0xffff;
        }
        if (g) glyphs.set(c, g);
      }
    }
  } else {
    const o = best.offset;
    for (let i = 0, n = dv.getUint32(o + 12); i < n; i++) {
      const first = dv.getUint32(o + 16 + i * 12);
      const last = dv.getUint32(o + 20 + i * 12);
      const glyph = dv.getUint32(o + 24 + i * 12);
      for (let c = first; c <= last; c++) glyphs.set(c, glyph + (c - first));
    }
  }
  const advance = (cp) => {
    const g = glyphs.get(cp);
    if (g === undefined) return null;
    return advances[Math.min(g, nMetrics - 1)];
  };
  return { unitsPerEm, advance };
}

export class FontKit {
  constructor(variants = VARIANTS) {
    this.variants = variants;
    this.metrics = {};
    this.faces = new Map();
    this.warnings = [];
  }

  async load({ offline = false } = {}) {
    for (const [key, variant] of Object.entries(this.variants)) {
      if (offline) { this.metrics[key] = null; continue; }
      try {
        const { data } = await fetchSubset(variant, BROAD, 'truetype');
        this.metrics[key] = parseTTF(data);
      } catch (e) {
        this.metrics[key] = null;
        this.warnings.push(`Font metrics for ${key} unavailable (${e.message}); using estimates.`);
      }
    }
    this.offline = offline;
    return this;
  }

  // Width in px of `str` set in style {v, size, track}.
  measure(str, style) {
    const m = this.metrics[style.v];
    const chars = [...String(str)];
    let units = 0;
    if (m) {
      for (const ch of chars) {
        const adv = m.advance(ch.codePointAt(0));
        units += adv ?? m.unitsPerEm * 0.6;
      }
      units /= m.unitsPerEm;
    } else {
      const bold = (this.variants[style.v]?.weight || 400) >= 600 ? 1.04 : 1;
      units = chars.length * 0.56 * bold;
    }
    return units * style.size + (style.track || 0) * style.size * chars.length;
  }

  // Greedy word wrap. `runs` is [{ text, style, ...extra }]; returns lines of runs.
  // Breaks only at plain spaces, so a no-break space ( ) keeps words together;
  // "\n" forces a new line.
  wrap(runs, maxWidth) {
    const words = [];
    for (const run of runs) {
      const parts = run.text.split(/( +|\n)/).filter((p) => p.length);
      for (const p of parts) words.push({ ...run, text: p, space: /^ +$/.test(p), newline: p === '\n' });
    }
    const lines = [];
    let line = [], width = 0;
    const flush = () => {
      while (line.length && line[line.length - 1].space) line.pop();
      if (line.length) lines.push(line);
      line = []; width = 0;
    };
    for (const w of words) {
      if (w.newline) { flush(); continue; }
      const ww = this.measure(w.text, w.style);
      if (w.space && line.length === 0) continue;
      if (!w.space && width + ww > maxWidth && line.length) flush();
      line.push(w);
      width += ww;
    }
    flush();
    // Merge adjacent words that share a style so each line is a few tspans.
    return lines.map((l) => {
      const merged = [];
      for (const w of l) {
        const last = merged[merged.length - 1];
        if (last && last.style === w.style && last.fill === w.fill) last.text += w.text;
        else merged.push({ ...w });
      }
      return merged;
    });
  }

  // CSS for one SVG: @font-face rules (subset to `usage`) plus one class per cut.
  async css(usage) {
    const rules = [];
    for (const [key, chars] of usage) {
      const variant = this.variants[key];
      const text = [...chars].sort().join('');
      if (!this.offline && text.trim()) {
        const cacheKey = `${key}|${text}`;
        if (!this.faces.has(cacheKey)) {
          let face = null;
          for (const format of ['woff2', 'truetype']) {
            try {
              const { data, format: got } = await fetchSubset(variant, text, format);
              const mime = got === 'woff2' ? 'font/woff2' : 'font/ttf';
              face = `@font-face{font-family:'${variant.family}';font-weight:${variant.weight};font-style:${variant.style || 'normal'};src:url(data:${mime};base64,${data.toString('base64')}) format('${got}')}`;
              break;
            } catch (e) {
              if (format === 'truetype') this.warnings.push(`Could not embed ${key} (${e.message}); system font will show.`);
            }
          }
          this.faces.set(cacheKey, face);
        }
        const face = this.faces.get(cacheKey);
        if (face) rules.push(face);
      }
      const stack = STACKS[variant.fallback || 'sans'];
      rules.push(`.${key}{font-family:'${variant.family}',${stack};font-weight:${variant.weight};font-style:${variant.style || 'normal'}}`);
    }
    return rules.join('');
  }
}
