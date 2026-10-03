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
const root = path.resolve(here, '..');

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
  for (const [name, make] of cards) {
    for (const theme of ['light', 'dark']) {
      const doc = await make(themes[theme]);
      overflows.push(...doc.overflows.map((o) => `${name}-${theme}: ${o}`));
      const svg = await doc.render();
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
  if (args.preview) await writePreview(out);

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

// The README as GitHub renders it, side by side in both themes, with local files.
async function writePreview(out) {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const local = readme.replace(/https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/output\//g, './');
  const forTheme = (theme) =>
    local
      .replace(/<source[^>]*>/g, '')
      .replace(/-light\.svg/g, `-${theme}.svg`);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Profile preview</title><style>
  body{margin:0;display:flex;gap:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif}
  .col{flex:1;padding:32px 0;display:flex;justify-content:center}
  .light{background:#fff;color:#1f2328}.dark{background:#0d1117;color:#f0f6fc}
  .box{width:846px;padding:24px;border:1px solid;border-radius:6px}
  .light .box{border-color:#d1d9e0}.dark .box{border-color:#3d444d}
  .box p{margin:0 0 16px}.box img{max-width:100%;box-sizing:content-box}
  .light img{background:#fff}.dark img{background:#0d1117}
  a{color:inherit}
  </style></head><body>
  <div class="col light"><div class="box">${forTheme('light')}</div></div>
  <div class="col dark"><div class="box">${forTheme('dark')}</div></div>
  </body></html>`;
  await writeFile(path.join(out, 'preview.html'), html);
}

main().catch((e) => {
  console.error(e.message);
  // exitCode, not exit(): let pending sockets close (exit() mid-close trips libuv on Windows).
  process.exitCode = 1;
});
