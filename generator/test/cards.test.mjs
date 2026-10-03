// Smoke test: every card renders offline, in both themes, with no NaN, no
// "undefined" and balanced groups. (Text overflow is checked at build time,
// where the real font metrics are available.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../config.mjs';
import { themes } from '../lib/theme.mjs';
import { FontKit } from '../lib/fonts.mjs';
import { summarize, languageShares } from '../lib/stats.mjs';
import { hero, section, work, workRowHeight, tools, lately, toolsRowHeight, contact } from '../cards/editorial.mjs';
import { output, rhythm, streak, languages } from '../cards/plates.mjs';

const fonts = await new FontKit().load({ offline: true });

const t0 = Date.parse('2025-09-28T00:00:00Z');
const data = {
  calendar: {
    days: Array.from({ length: 371 }, (_, i) => [new Date(t0 + i * 86400000).toISOString().slice(0, 10), (i * 7) % 5]),
    lastYearTotal: 742,
  },
  languages: { perLanguage: [{ name: 'TypeScript', bytes: 9 }, { name: 'C#', bytes: 6 }, { name: 'TSQL', bytes: 1 }], repos: 3 },
  commits: { hours: Array.from({ length: 24 }, (_, h) => (h * 5) % 11), weekdays: [3, 4, 5, 6, 7, 2, 9], total: 36 },
};
const s = summarize(data);
const toolsGroup = config.tools.find((g) => !g.entries);
const latelyGroup = config.tools.find((g) => g.entries);

const makers = {
  hero: (theme) => hero({ theme, fonts, config }),
  section: (theme) => section({ theme, fonts, section: config.sections.work }),
  work: (theme) => work({ theme, fonts, item: config.work[0], index: 0, height: workRowHeight(config.work, fonts) }),
  tools: (theme) => tools({ theme, fonts, group: toolsGroup, index: 0, height: toolsRowHeight(config.tools, fonts) }),
  lately: (theme) => lately({ theme, fonts, group: latelyGroup, height: toolsRowHeight(config.tools, fonts) }),
  contact: (theme) => contact({ theme, fonts, config }),
  output: (theme) => output({ theme, fonts, s }),
  rhythm: (theme) => rhythm({ theme, fonts, s, tzLabel: 'UTC−6' }),
  rhythmWithoutHours: (theme) => rhythm({ theme, fonts, s: { ...s, hours: null }, tzLabel: 'UTC−6' }),
  streak: (theme) => streak({ theme, fonts, s }),
  streakBroken: (theme) => streak({ theme, fonts, s: { ...s, current: { length: 0, start: null, end: null } } }),
  languages: (theme) => languages({ theme, fonts, items: languageShares(data.languages.perLanguage), repos: 3 }),
};

for (const [name, make] of Object.entries(makers)) {
  for (const theme of ['light', 'dark']) {
    test(`${name} renders in ${theme}`, async () => {
      const svg = await (await make(themes[theme])).render();
      assert.match(svg, /^<svg [^>]*viewBox="0 0 \d+ \d+"/);
      assert.ok(svg.trimEnd().endsWith('</svg>'));
      assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
      // Every opened group is closed.
      assert.equal((svg.match(/<g[ >]/g) || []).length, (svg.match(/<\/g>/g) || []).length);
    });
  }
}

test('the profile describes kinds of work, never the structure of a private system', () => {
  const text = JSON.stringify(config).toLowerCase();
  assert.doesNotMatch(text, /\bmodules?\b/);
  assert.doesNotMatch(text, /\d[\d,+~]*\s*(screens|users|people use|tests)\b/);
});

test('wrapping honours no-break spaces and forced breaks', () => {
  const style = { v: 'NS', size: 10, track: 0 };
  const lines = fonts.wrap([{ text: 'one two\nthree four', style }], 1000);
  assert.deepEqual(lines.map((l) => l.map((w) => w.text).join('')), ['one two', 'three four']);
  const narrow = fonts.wrap([{ text: 'aa bb cc', style }], 30);
  assert.deepEqual(narrow.map((l) => l.map((w) => w.text).join('')), ['aa', 'bb cc']);
});
