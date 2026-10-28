#!/usr/bin/env node
// Builds every profile card, in light and dark, into one folder.
//
//   node generator/build.mjs --out dist [--cache data.json] [--data snapshot.json] [--offline] [--preview]
//
//   --cache    last good data.json; anything that cannot be refreshed today is taken from it
//   --data     build from a saved snapshot instead of calling GitHub (local design work)
//   --offline  skip Google Fonts: estimated metrics, system font in the SVGs
//   --preview  also write preview.html, the README as GitHub would show it, light and dark
//
// Environment: GH_TOKEN (personal token, sees private repos), GITHUB_TOKEN (workflow token).

import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.mjs';
import { themes } from './lib/theme.mjs';
import { FontKit } from './lib/fonts.mjs';
import { summarize, normalizeDays, commitHistograms, languageShares } from './lib/stats.mjs';
import { checkToken, fetchCalendar, fetchLanguages, fetchCommitTimes } from './lib/github.mjs';
import { hero, section, sectionSize, work, workRowHeight, tools, lately, toolsRowHeight, contact } from './cards/editorial.mjs';
import { output, rhythm, streak, languages } from './cards/plates.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { out: 'dist', offline: false, preview: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--offline') out.offline = true;
    else if (a === '--preview') out.preview = true;
    else if (['--out', '--cache', '--data'].includes(a)) out[a.slice(2)] = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  return out;
}

async function readJson(file) {
  if (!file || !existsSync(file)) return null;
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return null; }
}

// Fetch what we can; fall back to yesterday's data (or the seed) for what we cannot.
async function gather(args) {
  const notes = [];
  if (args.data) return { data: await readJson(args.data), notes };

  const now = new Date().toISOString();
  const pat = process.env.GH_TOKEN || '';
  const workflowToken = process.env.GITHUB_TOKEN || '';
  let auth = null;
  if (pat) {
    try {
      const check = await checkToken(pat, config.login);
      if (check.ok) {
        auth = pat;
        if (check.expiresAt) {
          const days = Math.floor((Date.parse(check.expiresAt) - Date.now()) / 86400000);
          if (days < 14) notes.push(`GH_TOKEN expires on ${check.expiresAt.slice(0, 10)} (in ${Math.max(0, days)} days). Create a new one and update the secret before then.`);
        }
      } else notes.push(check.reason);
    } catch (e) {
      notes.push(`GH_TOKEN was rejected (HTTP ${e.status ?? '?'}: ${e.message}). It has probably expired; create a new one and update the secret.`);
    }
  } else {
    notes.push('GH_TOKEN is not set, so languages and commit times from private repositories cannot be refreshed.');
  }

  // Yesterday's data: the --cache file, or (for local runs) what the profile shows now.
  let cache = await readJson(args.cache);
  if (!cache && !process.env.GITHUB_ACTIONS) {
    try {
      const url = `https://raw.githubusercontent.com/${config.login}/${config.login}/output/data.json`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) cache = await res.json();
    } catch { /* offline: fine */ }
  }
  const seed = await readJson(path.join(here, 'seed.json'));
  const data = { generatedAt: now, login: config.login, calendar: null, languages: null, commits: null };

  const token = auth || workflowToken;
  let calendar = null;
  if (token) {
    try { calendar = await fetchCalendar(token, config.login); }
    catch (e) { notes.push(`Could not read the contribution calendar: ${e.message}`); }
  } else notes.push('No GitHub token available at all.');

  if (calendar) {
    data.calendar = { days: normalizeDays(calendar.days), lastYearTotal: calendar.lastYearTotal, source: 'github', at: now };
  } else if (cache?.calendar) {
    data.calendar = { ...cache.calendar, source: 'cache' };
  }

  if (auth && calendar) {
    try {
      const langs = await fetchLanguages(auth, config.login, config.languages);
      if (langs.perLanguage.length) data.languages = { ...langs, source: 'github', at: now };
    } catch (e) { notes.push(`Could not read languages: ${e.message}`); }
    try {
      const stamps = await fetchCommitTimes(auth, { userId: calendar.userId, repos: calendar.repos });
      if (stamps.length) data.commits = { ...commitHistograms(stamps, config.timezone.offsetMinutes), source: 'github', at: now };
    } catch (e) { notes.push(`Could not read commit times: ${e.message}`); }
  }
  if (!data.languages) data.languages = cache?.languages ? { ...cache.languages, source: 'cache' } : seed?.languages || null;
  if (!data.commits) data.commits = cache?.commits ? { ...cache.commits, source: 'cache' } : seed?.commits || null;
  return { data, notes };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { data, notes } = await gather(args);
  if (!data?.calendar?.days?.length) {
    // Never publish empty cards: failing here leaves yesterday's cards online.
    throw new Error(`No contribution data to build from.\n${notes.join('\n')}`);
  }

  const fonts = await new FontKit().load({ offline: args.offline });
  const s = summarize(data);
  const langItems = data.languages?.perLanguage ? languageShares(data.languages.perLanguage, config.languages) : [];

  // Tiles that sit side by side share a height.
  const pairs = (list) => [list.slice(0, 2), list.slice(2, 4)];
  const workRows = pairs(config.work).map((row) => workRowHeight(row, fonts));
  const toolRows = pairs(config.tools).map((row) => toolsRowHeight(row, fonts));
  const size = sectionSize(Object.values(config.sections), fonts);

  const cards = [
    ['hero', (theme) => hero({ theme, fonts, config })],
    ['section-work', (theme) => section({ theme, fonts, section: config.sections.work, size })],
    ...config.work.map((item, i) => [`work-${i + 1}`, (theme) => work({ theme, fonts, item, index: i, height: workRows[i >> 1] })]),
    ['section-numbers', (theme) => section({ theme, fonts, section: config.sections.numbers, size })],
    ['plate-output', (theme) => output({ theme, fonts, s })],
    ['plate-rhythm', (theme) => rhythm({ theme, fonts, s, tzLabel: config.timezone.label })],
    ['plate-streak', (theme) => streak({ theme, fonts, s })],
    ['plate-languages', (theme) => languages({ theme, fonts, items: langItems, repos: data.languages?.repos })],
    ['section-tools', (theme) => section({ theme, fonts, section: config.sections.tools, size })],
    ...config.tools.map((group, i) => [
      `tools-${i + 1}`,
      (theme) => (group.entries
        ? lately({ theme, fonts, group, height: toolRows[i >> 1] })
        : tools({ theme, fonts, group, index: i, height: toolRows[i >> 1] })),
    ]),
    ['contact', (theme) => contact({ theme, fonts, config })],
  ];

  const out = path.resolve(args.out);
  await mkdir(out, { recursive: true });
  let bytes = 0;
  const overflows = [];
  const rendered = { light: {}, dark: {} };
  for (const [name, make] of cards) {
    for (const theme of ['light', 'dark']) {
      const doc = await make(themes[theme]);
      overflows.push(...doc.overflows.map((o) => `${name}-${theme}: ${o}`));
      const svg = await doc.render();
      rendered[theme][name] = svg;
      bytes += svg.length;
      await writeFile(path.join(out, `${name}-${theme}.svg`), svg);
    }
  }
  if (overflows.length) {
    const message = `Text runs outside its card:\n  ${overflows.join('\n  ')}`;
    // With real font metrics this is a layout bug: stop before anything is published.
    if (!args.offline && !fonts.warnings.length) throw new Error(message);
    notes.push(message);
  }
  await writeFile(path.join(out, 'data.json'), JSON.stringify(data) + '\n');
  await writeFile(
    path.join(out, 'README.md'),
    `# Generated cards\n\nThis branch is rebuilt from scratch every day by the Profile cards workflow; anything edited here is overwritten.\nThe source lives in [\`generator/\` on main](https://github.com/${config.login}/${config.login}/tree/main/generator).\n`,
  );
  // Always write index.html (for GitHub Pages / live interactive edition) and preview.html when requested
  const html = buildInteractiveHtml(rendered);
  await writeFile(path.join(out, 'index.html'), html);
  if (args.preview) await writeFile(path.join(out, 'preview.html'), html);

  notes.push(...fonts.warnings);
  const summary = [
    `Built ${cards.length * 2} cards (${Math.round(bytes / 1024)} KB) into ${path.relative(process.cwd(), out) || '.'}`,
    `Contributions (12 months): ${s.lastYearTotal} · current streak ${s.current.length} · longest ${s.longest.length}`,
    `Sources: calendar=${data.calendar.source}, languages=${data.languages?.source ?? 'none'}, commits=${data.commits?.source ?? 'none'}`,
  ];
  console.log(summary.join('\n'));
  for (const n of notes) console.log(process.env.GITHUB_ACTIONS ? `::warning::${n}` : `warning: ${n}`);
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `degraded=${notes.length ? 'true' : 'false'}\n`);
}

// Interactive edition with inline SVGs, hover glow, cross-card language linking, mini-piano, live clock, and tactile Web Audio.
function buildInteractiveHtml(rendered) {
  function renderColumn(theme) {
    const c = (name, w) => {
      const inner = rendered[theme][name];
      if (name === 'contact') {
        return `<a class="static-card" data-card="${name}" href="${config.linkedin}" target="_blank" rel="noopener" style="width:${w}px;text-decoration:none">${inner}</a>`;
      }
      return `<div class="static-card" data-card="${name}" style="width:${w}px">${inner}</div>`;
    };
    return `
      <div class="card-row">${c('hero', 824)}</div><br>
      <div class="card-row">
        ${c('section-work', 824)}
        ${c('work-1', 412)}${c('work-2', 412)}
        ${c('work-3', 412)}${c('work-4', 412)}
      </div><br>
      <div class="card-row">
        ${c('section-numbers', 824)}
        ${c('plate-output', 412)}${c('plate-rhythm', 412)}
        ${c('plate-streak', 412)}${c('plate-languages', 412)}
      </div><br>
      <div class="card-row">
        ${c('section-tools', 824)}
        ${c('tools-1', 412)}${c('tools-2', 412)}
        ${c('tools-3', 412)}${c('tools-4', 412)}
      </div><br>
      <div class="card-row">${c('contact', 824)}</div>
    `;
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${config.name.first} ${config.name.last} (${config.login}) — Interactive Workstation</title>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #0d1117;
    color: #f3f1ec;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
  }
  .workstation {
    width: 824px;
    margin: 40px auto 100px auto;
  }
  @media (max-width: 860px) {
    .workstation {
      width: 100%;
      padding: 12px;
      margin: 20px auto 60px auto;
    }
    .card-row {
      width: 100% !important;
      overflow-x: auto;
    }
  }

  .floating-hud {
    position: fixed;
    top: 20px;
    right: 24px;
    z-index: 999;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .glass-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(13, 17, 23, 0.78);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 107, 61, 0.35);
    padding: 7px 15px;
    border-radius: 999px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #f3f1ec;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45), 0 0 10px rgba(255, 107, 61, 0.12);
    transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
    user-select: none;
  }
  .glass-pill:hover {
    transform: translateY(-1px);
    border-color: #ff6b3d;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55), 0 0 16px rgba(255, 107, 61, 0.35);
  }
  .glass-pill:active { transform: scale(0.97); }
  .audio-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 8px #22c55e;
    transition: background 180ms ease, box-shadow 180ms ease;
  }
  .glass-pill.muted .audio-dot {
    background: #736f68;
    box-shadow: none;
  }
  .glass-pill.muted {
    opacity: 0.65;
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: none;
  }
  .sound-wave {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    height: 10px;
  }
  .sound-wave span {
    width: 2px;
    height: 100%;
    background: #ff6b3d;
    border-radius: 1px;
    animation: eq-wave 1.1s ease-in-out infinite alternate;
  }
  .sound-wave span:nth-child(2) { animation-delay: 0.22s; height: 60%; }
  .sound-wave span:nth-child(3) { animation-delay: 0.45s; height: 80%; }
  .glass-pill.muted .sound-wave span {
    animation: none;
    height: 2px;
    background: #736f68;
  }
  @keyframes eq-wave {
    0% { height: 25%; }
    100% { height: 100%; }
  }

  .card-row { display: flex; flex-wrap: wrap; width: 824px; margin: 0 auto; }
  .static-card {
    position: relative;
    display: block;
    transform: none !important;
    transition: none !important;
  }
  .static-card:hover {
    transform: none !important;
  }
  .static-card svg { display: block; overflow: visible; }

  /* Keywords hover & glowing effect */
  .kw {
    cursor: pointer;
    transition: fill 140ms ease-out, filter 140ms ease-out;
  }
  .kw:hover, .kw.is-linked {
    fill: #ff6b3d !important;
    filter: drop-shadow(0 0 8px rgba(255, 107, 61, 0.9)) drop-shadow(0 0 16px rgba(255, 107, 61, 0.5)) !important;
  }
  .kw-giant, .stop {
    cursor: pointer;
    transition: filter 160ms ease-out;
  }
  .kw-giant:hover, .stop:hover {
    filter: drop-shadow(0 0 16px rgba(255, 107, 61, 0.95)) !important;
  }

  /* 3D Calendar Cells in Plate 01 */
  .cal-cell {
    cursor: pointer;
    transition: transform 160ms cubic-bezier(.23, 1, .32, 1), filter 160ms ease;
    transform-box: fill-box;
    transform-origin: center bottom;
  }
  .cal-cell:hover, .cal-cell.is-hovered {
    transform: translateY(-4.5px) scale(1.28);
    filter: drop-shadow(0 0 10px rgba(255, 107, 61, 0.95));
  }
  .cal-cell:hover .cal-top, .cal-cell.is-hovered .cal-top {
    fill: #ff6b3d !important;
  }
  .cal-cell.is-neighbor {
    transform: translateY(-1.8px) scale(1.08);
    filter: drop-shadow(0 0 5px rgba(255, 107, 61, 0.45));
  }

  /* 24-Hour Rhythm Dial in Plate 02 */
  .dial-wedge {
    cursor: pointer;
    transition: transform 180ms cubic-bezier(.23, 1, .32, 1), filter 180ms ease;
    transform-box: fill-box;
    transform-origin: 124px 192px;
  }
  .dial-wedge:hover, .dial-wedge.is-hovered {
    transform: translateY(-2.8px) scale(1.06);
    filter: drop-shadow(0 0 11px rgba(255, 107, 61, 0.9));
  }
  .dial-wedge:hover .wedge-top, .dial-wedge.is-hovered .wedge-top {
    fill: #ff6b3d !important;
  }
  .dial-needle line {
    transition: x2 140ms ease-out, y2 140ms ease-out;
  }

  /* Streak Spikes in Plate 03 */
  .streak-spike {
    cursor: pointer;
    transition: transform 160ms cubic-bezier(.23, 1, .32, 1), filter 160ms ease;
    transform-box: fill-box;
    transform-origin: center bottom;
  }
  .streak-spike:hover, .streak-spike.is-hovered {
    transform: scaleY(1.12) translateY(-2px);
    filter: drop-shadow(0 0 10px rgba(255, 107, 61, 0.95));
  }
  .streak-spike:hover .spike-front, .streak-spike.is-hovered .spike-front {
    fill: #ff6b3d !important;
  }

  /* Languages Segments & Rows in Plate 04 */
  .lang-seg, .lang-row {
    cursor: pointer;
    transition: transform 180ms cubic-bezier(.23, 1, .32, 1), opacity 180ms ease, filter 180ms ease;
  }
  .lang-seg:hover, .lang-seg.is-hovered {
    transform: translateY(-4px);
    filter: drop-shadow(0 0 11px rgba(255, 107, 61, 0.9));
  }
  .lang-row:hover, .lang-row.is-hovered {
    transform: translateX(4px);
    filter: drop-shadow(0 0 8px rgba(255, 107, 61, 0.75));
  }
  .lang-row:hover tspan, .lang-row.is-hovered tspan {
    fill: #ff6b3d !important;
  }
  .lang-seg.is-dimmed, .lang-row.is-dimmed {
    opacity: 0.35;
  }

  /* Playable Mini-Piano in Lately */
  .piano-key {
    cursor: pointer;
    transition: transform 100ms ease, filter 100ms ease;
    transform-origin: center top;
  }
  .piano-key:hover, .piano-key.is-active {
    filter: drop-shadow(0 0 11px rgba(255, 107, 61, 0.95)) !important;
  }
  .piano-key:active, .piano-key.is-active {
    transform: translateY(2px) scaleY(0.97);
  }
  .piano-key.is-active .pk-top {
    fill: #ff6b3d !important;
  }
</style>
</head>
<body data-mode="dark">
  <div class="floating-hud">
    <button id="audio-toggle" class="glass-pill" onclick="toggleAudio(event)" title="Click to toggle micro-sounds">
      <span class="audio-dot"></span>
      <span id="audio-label">SOUND FX</span>
      <span class="sound-wave"><span></span><span></span><span></span></span>
    </button>
    <a class="glass-pill" href="https://github.com/${config.login}" target="_blank" rel="noopener" title="View repository on GitHub">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style="display:inline-block;vertical-align:text-bottom"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      <span>GitHub ↗</span>
    </a>
  </div>
  <main class="workstation">
    ${renderColumn('dark')}
  </main>
  <script>
    // =========================================================================
    // 1. TACTILE WEB AUDIO SYNTHESIZER + ELECTRIC PIANO (Rhodes-style)
    // =========================================================================
    const SoundFX = (() => {
      let ctx = null, enabled = true, lastTime = 0, noiseBuf = null;
      const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98];

      function ensureCtx() {
        if (!enabled) return null;
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume().then(updatePillUI).catch(() => {});
        updatePillUI();
        return ctx;
      }

      function getNoise(ac) {
        if (noiseBuf) return noiseBuf;
        const len = Math.floor(ac.sampleRate * 0.04);
        noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
        return noiseBuf;
      }

      function updatePillUI() {
        const pill = document.getElementById('audio-toggle');
        const label = document.getElementById('audio-label');
        if (!pill || !label) return;
        pill.classList.remove('muted');
        if (!enabled) {
          pill.classList.add('muted');
          label.textContent = 'SOUND: OFF';
        } else {
          label.textContent = 'SOUND FX';
        }
      }

      function canPlay(minGapMs = 22) {
        const now = performance.now();
        if (now - lastTime < minGapMs) return false;
        lastTime = now;
        const ac = ensureCtx();
        return ac && ac.state === 'running' ? ac : null;
      }

      function playKeyword(word = '') {
        const ac = canPlay(28);
        if (!ac) return;
        let hash = 0;
        for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) | 0;
        const note = PENTA[Math.abs(hash) % 8 + 3];
        const t = ac.currentTime, osc = ac.createOscillator(), filter = ac.createBiquadFilter(), gain = ac.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note * 1.15, t);
        osc.frequency.exponentialRampToValueAtTime(note * 0.85, t + 0.032);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(note * 1.4, t);
        filter.Q.setValueAtTime(3.2, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(0.055, t + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
        osc.connect(filter); filter.connect(gain); gain.connect(ac.destination);
        osc.start(t); osc.stop(t + 0.042);
      }

      function playGiant() {
        const ac = canPlay(65);
        if (!ac) return;
        const t = ac.currentTime;
        [293.66, 440.0, 659.25].forEach((freq, idx) => {
          const osc = ac.createOscillator(), gain = ac.createGain();
          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.01, t + 0.09);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(idx === 0 ? 0.055 : 0.028, t + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
          osc.connect(gain); gain.connect(ac.destination);
          osc.start(t); osc.stop(t + 0.12);
        });
      }

      function playCalendarCell(count = 0) {
        const ac = canPlay(18);
        if (!ac) return;
        const t = ac.currentTime, c = Number(count) || 0;
        const noise = ac.createBufferSource(); noise.buffer = getNoise(ac);
        const nf = ac.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.setValueAtTime(c > 0 ? 2200 : 1200, t); nf.Q.setValueAtTime(4.0, t);
        const ng = ac.createGain(); ng.gain.setValueAtTime(c > 0 ? 0.038 : 0.018, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
        noise.connect(nf); nf.connect(ng); ng.connect(ac.destination); noise.start(t);
        if (c > 0) {
          const idx = Math.min(PENTA.length - 1, Math.floor(Math.log2(c + 1) * 2.6) + 2);
          const osc = ac.createOscillator(), g = ac.createGain();
          osc.type = 'sine'; osc.frequency.setValueAtTime(PENTA[idx], t);
          g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.048, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
          osc.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + 0.06);
        }
      }

      function playDialTick(hour = 0, isPeak = false) {
        const ac = canPlay(22);
        if (!ac) return;
        const t = ac.currentTime;
        const noise = ac.createBufferSource(); noise.buffer = getNoise(ac);
        const filter = ac.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.setValueAtTime(1800 + hour * 45, t); filter.Q.setValueAtTime(6.0, t);
        const ng = ac.createGain(); ng.gain.setValueAtTime(0.05, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);
        noise.connect(filter); filter.connect(ng); ng.connect(ac.destination); noise.start(t);
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.type = isPeak ? 'triangle' : 'sine';
        const baseFreq = isPeak ? 880 : 420 + hour * 16;
        osc.frequency.setValueAtTime(baseFreq, t); osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, t + (isPeak ? 0.09 : 0.028));
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(isPeak ? 0.065 : 0.032, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + (isPeak ? 0.095 : 0.03));
        osc.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + 0.1);
      }

      function playStreak(len = 1) {
        const ac = canPlay(30);
        if (!ac) return;
        const t = ac.currentTime, freq = PENTA[Math.min(PENTA.length - 1, Math.max(0, Number(len) - 1))];
        const osc = ac.createOscillator(), filter = ac.createBiquadFilter(), g = ac.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(freq * 1.008, t + 0.075);
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(freq * 3.5, t);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
        osc.connect(filter); filter.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + 0.09);
      }

      function playLanguage(idx = 0) {
        const ac = canPlay(30);
        if (!ac) return;
        const t = ac.currentTime, notes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51], freq = notes[idx % notes.length];
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t); osc.frequency.exponentialRampToValueAtTime(freq * 0.98, t + 0.06);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.052, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);
        osc.connect(g); g.connect(ac.destination); osc.start(t); osc.stop(t + 0.07);
      }

      // Warm Electric Piano (Rhodes tine + warm fundamental body) for the "Playing piano." Easter egg
      function playPianoNote(freq = 440) {
        const ac = canPlay(10);
        if (!ac) return;
        const t = ac.currentTime, f = Number(freq) || 440;
        // 1. Warm fundamental + detuned chorus twin
        [f, f * 1.003, f * 2].forEach((hz, i) => {
          const osc = ac.createOscillator(), g = ac.createGain();
          osc.type = i === 2 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(hz, t);
          const peak = i === 0 ? 0.095 : i === 1 ? 0.045 : 0.022;
          const dur = i === 2 ? 0.28 : 0.65;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.linearRampToValueAtTime(peak, t + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          osc.connect(g); g.connect(ac.destination);
          osc.start(t); osc.stop(t + dur + 0.02);
        });
        // 2. Rhodes bell tine overtone (7x harmonic, short decay)
        const tine = ac.createOscillator(), tg = ac.createGain();
        tine.type = 'sine';
        tine.frequency.setValueAtTime(f * 4, t);
        tg.gain.setValueAtTime(0.0001, t);
        tg.gain.linearRampToValueAtTime(0.018, t + 0.002);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        tine.connect(tg); tg.connect(ac.destination);
        tine.start(t); tine.stop(t + 0.1);
      }

      ['pointerdown', 'keydown', 'click'].forEach(evt => window.addEventListener(evt, () => { if (enabled) ensureCtx(); }, { passive: true }));
      window.addEventListener('pointermove', () => { if (enabled && (!ctx || ctx.state === 'suspended')) ensureCtx(); }, { once: true, passive: true });

      return { toggle() { enabled = !enabled; if (enabled) { ensureCtx(); playGiant(); } else updatePillUI(); }, playKeyword, playGiant, playCalendarCell, playDialTick, playStreak, playLanguage, playPianoNote };
    })();

    function toggleAudio(e) {
      if (e) e.stopPropagation();
      SoundFX.toggle();
    }

    // =========================================================================
    // 2. LIVE HONDURAS CLOCK (UTC-6) IN HERO HEADER
    // =========================================================================
    function updateHondurasClock() {
      const now = new Date();
      // UTC-6 (America/Tegucigalpa)
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const hn = new Date(utcMs - 6 * 3600000);
      const hh = String(hn.getHours()).padStart(2, '0');
      const mm = String(hn.getMinutes()).padStart(2, '0');
      const ss = String(hn.getSeconds()).padStart(2, '0');
      document.querySelectorAll('[data-hero-clock] tspan').forEach(el => {
        el.textContent = 'SAN PEDRO SULA · HONDURAS · ' + hh + ':' + mm + ':' + ss + ' UTC−6';
      });
    }
    updateHondurasClock();
    setInterval(updateHondurasClock, 1000);

    // =========================================================================
    // 3. CROSS-CARD LANGUAGE LINKING (Keywords <-> Plate 04 Languages)
    // =========================================================================
    const KW_TO_LANG = {
      'c#': 'C#', '.net': 'C#', 'asp.net core': 'C#', 'signalr': 'C#', 'dapper': 'C#',
      'ef core': 'C#', 'fluentvalidation': 'C#', 'serilog': 'C#', 'automated documents': 'C#',
      'xunit': 'C#', 'industrial serial': 'C#',
      'react': 'TypeScript', 'typescript': 'TypeScript', 'advanced typescript patterns': 'TypeScript',
      'vite': 'TypeScript', 'tanstack query': 'TypeScript', 'react hook form': 'TypeScript',
      'zod': 'TypeScript', 'framer motion': 'TypeScript', 'three.js': 'TypeScript',
      '3d on the web': 'TypeScript', 'recharts': 'TypeScript', 'leaflet': 'TypeScript', 'workbox': 'TypeScript',
      'tailwind css': 'CSS', 'shadcn/ui': 'CSS',
      'sql server': 'T-SQL', 't-sql': 'T-SQL', 'erp ledgers': 'T-SQL',
      'python': 'Python', 'node.js': 'JavaScript',
    };

    function normText(s) {
      return (s || '').replace(/\\u00a0/g, ' ').trim().toLowerCase();
    }

    function highlightLanguageAcrossProfile(langName) {
      const target = (langName || '').toLowerCase();
      // Highlight matching segments/rows in Plate 04
      document.querySelectorAll('[data-card="plate-languages"]').forEach(card => {
        const segs = [...card.querySelectorAll('.lang-seg')];
        const rows = [...card.querySelectorAll('.lang-row')];
        const matchIdx = segs.findIndex(s => (s.dataset.lang || '').toLowerCase() === target);
        segs.forEach((s, i) => {
          s.classList.toggle('is-hovered', matchIdx !== -1 && i === matchIdx);
          s.classList.toggle('is-dimmed', matchIdx !== -1 && i !== matchIdx);
        });
        rows.forEach((r, i) => {
          r.classList.toggle('is-hovered', matchIdx !== -1 && i === matchIdx);
          r.classList.toggle('is-dimmed', matchIdx !== -1 && i !== matchIdx);
        });
      });
      // Highlight all matching .kw elements across the entire profile
      document.querySelectorAll('.kw').forEach(el => {
        const mapped = KW_TO_LANG[normText(el.textContent)];
        el.classList.toggle('is-linked', Boolean(target && mapped && mapped.toLowerCase() === target));
      });
    }

    document.querySelectorAll('.kw').forEach(el => {
      el.addEventListener('pointerenter', () => {
        const txt = el.textContent || '';
        SoundFX.playKeyword(txt);
        const mapped = KW_TO_LANG[normText(txt)];
        if (mapped) highlightLanguageAcrossProfile(mapped);
      });
      el.addEventListener('pointerleave', () => {
        const mapped = KW_TO_LANG[normText(el.textContent)];
        if (mapped) highlightLanguageAcrossProfile(null);
      });
    });

    document.querySelectorAll('.kw-giant, .stop').forEach(el => {
      el.addEventListener('pointerenter', () => SoundFX.playGiant());
    });

    // =========================================================================
    // 4. INTERACTIVE MINI-PIANO IN LATELY (Mouse Hover, Click & Keyboard A-K)
    // =========================================================================
    document.querySelectorAll('.piano-key').forEach(keyEl => {
      const trigger = () => {
        SoundFX.playPianoNote(keyEl.dataset.freq);
        keyEl.classList.add('is-active');
        setTimeout(() => keyEl.classList.remove('is-active'), 180);
      };
      keyEl.addEventListener('pointerenter', trigger);
      keyEl.addEventListener('pointerdown', trigger);
    });

    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const matching = [...document.querySelectorAll('.piano-key[data-key="' + k + '"]')];
      if (matching.length) {
        SoundFX.playPianoNote(matching[0].dataset.freq);
        matching.forEach(el => {
          el.classList.add('is-active');
          setTimeout(() => el.classList.remove('is-active'), 200);
        });
      }
    });

    // =========================================================================
    // 5. INTERACTIVE 3D PLATES (Output, Rhythm, Streak, Languages)
    // =========================================================================
    document.querySelectorAll('[data-card="plate-output"]').forEach(card => {
      const cells = [...card.querySelectorAll('.cal-cell')];
      const numEl = card.querySelector('[data-output-num] tspan');
      const labelEl = card.querySelector('[data-output-label] tspan');
      const defaultNum = numEl ? numEl.textContent : '';
      const defaultLab = labelEl ? labelEl.textContent : '';
      cells.forEach(cell => {
        cell.addEventListener('pointerenter', () => {
          const col = Number(cell.dataset.col), row = Number(cell.dataset.row);
          SoundFX.playCalendarCell(cell.dataset.count);
          cells.forEach(c => {
            const d = Math.hypot(Number(c.dataset.col) - col, Number(c.dataset.row) - row);
            c.classList.toggle('is-hovered', c === cell);
            c.classList.toggle('is-neighbor', c !== cell && d <= 1.5);
          });
          if (numEl) numEl.textContent = cell.dataset.count;
          if (labelEl) labelEl.textContent = cell.dataset.date;
        });
      });
      card.addEventListener('pointerleave', () => {
        cells.forEach(c => c.classList.remove('is-hovered', 'is-neighbor'));
        if (numEl) numEl.textContent = defaultNum;
        if (labelEl) labelEl.textContent = defaultLab;
      });
    });

    document.querySelectorAll('[data-card="plate-rhythm"]').forEach(card => {
      const wedges = [...card.querySelectorAll('.dial-wedge')];
      const needle = card.querySelector('.dial-needle line');
      const hourEl = card.querySelector('[data-rhythm-hour] tspan');
      const hourLabEl = card.querySelector('[data-rhythm-hour-label] tspan');
      const countEl = card.querySelector('[data-rhythm-count] tspan');
      const countLabEl = card.querySelector('[data-rhythm-count-label] tspan');
      const defHour = hourEl?.textContent, defHourLab = hourLabEl?.textContent;
      const defCount = countEl?.textContent, defCountLab = countLabEl?.textContent;
      const cx = 124, cy = 192, rMax = 88;
      wedges.forEach(w => {
        w.addEventListener('pointerenter', () => {
          wedges.forEach(x => x.classList.toggle('is-hovered', x === w));
          const h = Number(w.dataset.hour), commits = w.dataset.commits, isPeak = w.dataset.peak === '1';
          SoundFX.playDialTick(h, isPeak);
          const a = ((h * 15 + 7.5 - 90) * Math.PI) / 180;
          if (needle) {
            needle.setAttribute('x2', (cx + rMax * Math.cos(a)).toFixed(2));
            needle.setAttribute('y2', (cy + rMax * Math.sin(a)).toFixed(2));
          }
          if (hourEl) hourEl.textContent = String(h).padStart(2, '0') + ':00';
          if (hourLabEl) hourLabEl.textContent = isPeak ? 'busiest hour' : 'selected hour';
          if (countEl) countEl.textContent = commits;
          if (countLabEl) countLabEl.textContent = 'commits at ' + String(h).padStart(2, '0') + 'h';
        });
      });
      card.addEventListener('pointerleave', () => {
        wedges.forEach(x => x.classList.remove('is-hovered'));
        if (hourEl) hourEl.textContent = defHour;
        if (hourLabEl) hourLabEl.textContent = defHourLab;
        if (countEl) countEl.textContent = defCount;
        if (countLabEl) countLabEl.textContent = defCountLab;
      });
    });

    document.querySelectorAll('[data-card="plate-streak"]').forEach(card => {
      const spikes = [...card.querySelectorAll('.streak-spike')];
      const subNum = card.querySelector('[data-streak-subnum] tspan');
      const subLab = card.querySelector('[data-streak-sublabel] tspan');
      const defNum = subNum?.textContent, defLab = subLab?.textContent;
      spikes.forEach(sp => {
        sp.addEventListener('pointerenter', () => {
          spikes.forEach(x => x.classList.toggle('is-hovered', x === sp));
          SoundFX.playStreak(sp.dataset.len);
          if (subNum) subNum.textContent = sp.dataset.len + ' days';
          if (subLab) subLab.textContent = sp.dataset.start + ' → ' + sp.dataset.end;
        });
      });
      card.addEventListener('pointerleave', () => {
        spikes.forEach(x => x.classList.remove('is-hovered'));
        if (subNum) subNum.textContent = defNum;
        if (subLab) subLab.textContent = defLab;
      });
    });

    document.querySelectorAll('[data-card="plate-languages"]').forEach(card => {
      const segs = [...card.querySelectorAll('.lang-seg')];
      const rows = [...card.querySelectorAll('.lang-row')];
      const highlight = (idx) => {
        if (idx !== null) {
          SoundFX.playLanguage(idx);
          highlightLanguageAcrossProfile(segs[idx]?.dataset.lang || null);
        } else {
          highlightLanguageAcrossProfile(null);
        }
        segs.forEach((s, i) => {
          s.classList.toggle('is-hovered', i === idx);
          s.classList.toggle('is-dimmed', idx !== null && i !== idx);
        });
        rows.forEach((r, i) => {
          r.classList.toggle('is-hovered', i === idx);
          r.classList.toggle('is-dimmed', idx !== null && i !== idx);
        });
      };
      segs.forEach((s, i) => s.addEventListener('pointerenter', () => highlight(i)));
      rows.forEach((r, i) => r.addEventListener('pointerenter', () => highlight(i)));
      card.addEventListener('pointerleave', () => highlight(null));
    });
  </script>
</body>
</html>`;
}

main().catch((e) => {
  console.error(e.message);
  // exitCode, not exit(): let pending sockets close (exit() mid-close trips libuv on Windows).
  process.exitCode = 1;
});
