// Pure functions over contribution and commit data. No I/O here, so they are easy to test.

const DAY = 86400000;
const toTime = (date) => Date.parse(`${date}T00:00:00Z`);
const toDate = (t) => new Date(t).toISOString().slice(0, 10);

// [[date, count]] in any order, possibly with holes -> ascending and contiguous.
export function normalizeDays(days) {
  const map = new Map();
  for (const [d, c] of days) map.set(d, Math.max(map.get(d) || 0, c));
  const dates = [...map.keys()].sort();
  if (!dates.length) return [];
  const out = [];
  for (let t = toTime(dates[0]), end = toTime(dates[dates.length - 1]); t <= end; t += DAY) {
    const d = toDate(t);
    out.push([d, map.get(d) || 0]);
  }
  return out;
}

// Longest run ever, and the run that is still alive. Today may still be empty
// (the day is not over), so a streak survives until a full day passes with nothing.
export function streaks(days) {
  let longest = { length: 0, start: null, end: null };
  let run = 0, runStart = null;
  for (const [d, c] of days) {
    if (c > 0) {
      if (run === 0) runStart = d;
      run++;
      if (run > longest.length) longest = { length: run, start: runStart, end: d };
    } else run = 0;
  }
  let i = days.length - 1;
  if (i >= 0 && days[i][1] === 0) i--;
  let length = 0, start = null;
  const end = i >= 0 ? days[i][0] : null;
  while (i >= 0 && days[i][1] > 0) { length++; start = days[i][0]; i--; }
  const current = length ? { length, start, end } : { length: 0, start: null, end: null };
  return { current, longest };
}

// Every run of consecutive active days, oldest first.
export function runs(days) {
  const out = [];
  let start = null, length = 0;
  days.forEach(([d, c], i) => {
    if (c > 0) {
      if (!length) start = d;
      length++;
    }
    if ((c === 0 || i === days.length - 1) && length) {
      out.push({ start, end: c > 0 ? d : days[i - 1][0], length });
      length = 0;
    }
  });
  return out;
}

// The window GitHub shows on the profile: the last 53 weeks, Sunday-first,
// ending with the (possibly partial) week that contains the last day.
export function calendarWindow(days) {
  if (!days.length) return [];
  const last = toTime(days[days.length - 1][0]);
  const lastDow = new Date(last).getUTCDay();
  const start = last - (lastDow + 52 * 7) * DAY;
  return days.filter(([d]) => toTime(d) >= start);
}

export function weeklyTotals(windowDays) {
  const weeks = [];
  for (const [d, c] of windowDays) {
    const dow = new Date(toTime(d)).getUTCDay();
    if (dow === 0 || !weeks.length) weeks.push({ start: d, total: 0 });
    weeks[weeks.length - 1].total += c;
  }
  return weeks;
}

// Monday-first totals.
export function weekdayTotals(windowDays) {
  const out = new Array(7).fill(0);
  for (const [d, c] of windowDays) out[(new Date(toTime(d)).getUTCDay() + 6) % 7] += c;
  return out;
}

// Commit timestamps -> hour-of-day and Monday-first weekday histograms in a fixed UTC offset.
export function commitHistograms(timestamps, offsetMinutes) {
  const hours = new Array(24).fill(0);
  const weekdays = new Array(7).fill(0);
  for (const ts of timestamps) {
    const t = Date.parse(ts);
    if (Number.isNaN(t)) continue;
    const local = new Date(t + offsetMinutes * 60000);
    hours[local.getUTCHours()]++;
    weekdays[(local.getUTCDay() + 6) % 7]++;
  }
  return { hours, weekdays, total: timestamps.length };
}

// Integer percentages that add up to exactly 100 (largest remainder method).
export function percentages(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  if (!sum) return values.map(() => 0);
  const raw = values.map((v) => (v / sum) * 100);
  const floor = raw.map(Math.floor);
  let left = 100 - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left <= 0) break; floor[i]++; left--; }
  return floor;
}

// Bytes per language -> the top N plus "Other", with percentages that sum to 100.
export function languageShares(perLanguage, { top = 6, excludeLanguages = [] } = {}) {
  const skip = new Set(excludeLanguages.map((s) => s.toLowerCase()));
  const sorted = perLanguage
    .filter((l) => l.bytes > 0 && !skip.has(l.name.toLowerCase()))
    .sort((a, b) => b.bytes - a.bytes);
  const items = sorted.slice(0, top).map(({ name, bytes }) => ({ name, bytes }));
  const tail = sorted.slice(top).reduce((a, l) => a + l.bytes, 0);
  if (tail > 0) items.push({ name: 'Other', bytes: tail, other: true });
  const pct = percentages(items.map((i) => i.bytes));
  items.forEach((it, i) => (it.pct = pct[i]));
  return items;
}

export const argmax = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(date, { year = false } = {}) {
  const t = new Date(toTime(date));
  return `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}${year ? `, ${t.getUTCFullYear()}` : ''}`;
}
export const monthName = (date) => MONTHS[new Date(toTime(date)).getUTCMonth()];

export function hourLabel(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// Everything the activity cards show, derived from one data snapshot.
export function summarize(data) {
  const days = normalizeDays(data.calendar?.days || []);
  const window = calendarWindow(days);
  const { current, longest } = streaks(days);
  const weeks = weeklyTotals(window);
  const activeDays = window.filter(([, c]) => c > 0).length;
  const bestDay = window.reduce((b, d) => (d[1] > b[1] ? d : b), ['', 0]);
  const lastYearTotal = data.calendar?.lastYearTotal ?? window.reduce((a, [, c]) => a + c, 0);
  const allTime = days.reduce((a, [, c]) => a + c, 0);
  const weekdays = data.commits?.weekdays?.some((v) => v > 0) ? data.commits.weekdays : weekdayTotals(window);
  return {
    today: days.length ? days[days.length - 1][0] : null,
    days,
    window,
    runs: runs(days),
    lastYearTotal,
    allTime,
    activeDays,
    windowDays: window.length,
    bestDay: { date: bestDay[0], count: bestDay[1] },
    weeks,
    current,
    longest,
    hours: data.commits?.hours || null,
    commitCount: data.commits?.total || 0,
    weekdays,
    weekdaysFrom: data.commits?.weekdays?.some((v) => v > 0) ? 'commits' : 'contributions',
  };
}
