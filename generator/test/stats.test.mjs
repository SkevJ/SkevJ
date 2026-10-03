import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDays, streaks, runs, calendarWindow, weeklyTotals, weekdayTotals,
  commitHistograms, percentages, languageShares, hourLabel, shortDate,
} from '../lib/stats.mjs';

const days = (start, counts) => {
  const t0 = Date.parse(`${start}T00:00:00Z`);
  return counts.map((c, i) => [new Date(t0 + i * 86400000).toISOString().slice(0, 10), c]);
};

test('normalizeDays sorts, fills holes with zero and keeps the larger duplicate', () => {
  const out = normalizeDays([['2026-01-03', 2], ['2026-01-01', 1], ['2026-01-01', 4]]);
  assert.deepEqual(out, [['2026-01-01', 4], ['2026-01-02', 0], ['2026-01-03', 2]]);
});

test('a streak survives an empty today, but not an empty yesterday', () => {
  const alive = streaks(days('2026-09-01', [0, 1, 2, 3, 0]));
  assert.equal(alive.current.length, 3);
  assert.equal(alive.current.start, '2026-09-02');
  assert.equal(alive.current.end, '2026-09-04');
  const broken = streaks(days('2026-09-01', [1, 1, 0, 0]));
  assert.equal(broken.current.length, 0);
});

test('longest streak keeps the first of two equal runs', () => {
  const s = streaks(days('2026-01-01', [1, 1, 0, 2, 2, 0]));
  assert.equal(s.longest.length, 2);
  assert.equal(s.longest.start, '2026-01-01');
});

test('a streak that is still running can be the longest', () => {
  const s = streaks(days('2026-01-01', [1, 0, 5, 5, 5]));
  assert.equal(s.current.length, 3);
  assert.equal(s.longest.length, 3);
});

test('runs lists every stretch of active days, including one still going', () => {
  const r = runs(days('2026-01-01', [1, 1, 0, 0, 3, 0, 2, 2, 2]));
  assert.deepEqual(r, [
    { start: '2026-01-01', end: '2026-01-02', length: 2 },
    { start: '2026-01-05', end: '2026-01-05', length: 1 },
    { start: '2026-01-07', end: '2026-01-09', length: 3 },
  ]);
  assert.deepEqual(runs(days('2026-01-01', [0, 4, 0])), [{ start: '2026-01-02', end: '2026-01-02', length: 1 }]);
});

test('calendar window covers 53 Sunday-first weeks like the profile graph', () => {
  const all = normalizeDays(days('2025-01-01', new Array(700).fill(1)));
  const w = calendarWindow(all);
  assert.equal(new Date(`${w[0][0]}T00:00:00Z`).getUTCDay(), 0);
  const weeks = weeklyTotals(w);
  assert.equal(weeks.length, 53);
  assert.equal(weeks.slice(0, -1).every((x) => x.total === 7), true);
});

test('weekday totals are Monday first', () => {
  // 2026-09-28 is a Monday.
  const out = weekdayTotals(days('2026-09-28', [1, 2, 3, 4, 5, 6, 7]));
  assert.deepEqual(out, [1, 2, 3, 4, 5, 6, 7]);
});

test('commit times are binned in the configured UTC offset', () => {
  // 02:30 UTC on Monday is 20:30 on Sunday in UTC-6.
  const h = commitHistograms(['2026-09-28T02:30:00Z', '2026-09-28T21:00:00-06:00'], -360);
  assert.equal(h.hours[20], 1);
  assert.equal(h.hours[21], 1);
  assert.equal(h.weekdays[6], 1); // Sunday
  assert.equal(h.weekdays[0], 1); // Monday
  assert.equal(h.total, 2);
});

test('percentages always add up to 100', () => {
  for (const v of [[1, 1, 1], [50.1, 34.5, 7.4, 2.6, 2, 3.4], [999, 1], [0, 0, 5]]) {
    assert.equal(percentages(v).reduce((a, b) => a + b, 0), 100);
  }
  assert.deepEqual(percentages([0, 0]), [0, 0]);
});

test('language shares fold the tail into Other and honour exclusions', () => {
  const langs = [
    { name: 'TypeScript', bytes: 500 }, { name: 'C#', bytes: 300 }, { name: 'HTML', bytes: 100 },
    { name: 'CSS', bytes: 60 }, { name: 'Shell', bytes: 40 },
  ];
  const out = languageShares(langs, { top: 2, excludeLanguages: ['html'] });
  assert.deepEqual(out.map((i) => i.name), ['TypeScript', 'C#', 'Other']);
  assert.equal(out[2].bytes, 100);
  assert.equal(out.reduce((a, i) => a + i.pct, 0), 100);
});

test('labels read the way people say them', () => {
  assert.equal(hourLabel(0), '12 AM');
  assert.equal(hourLabel(12), '12 PM');
  assert.equal(hourLabel(15), '3 PM');
  assert.equal(shortDate('2026-09-01'), 'Sep 1');
  assert.equal(shortDate('2026-10-03', { year: true }), 'Oct 3, 2026');
});
