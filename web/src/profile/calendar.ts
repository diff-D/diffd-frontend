/** One day of the activity calendar: its column (week) and row (Monday first), and its shade 0-4. */
export type CalendarDay = { day: string; runs: number; week: number; weekday: number; level: 0 | 1 | 2 | 3 | 4 };

const MS_PER_DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * The last `weeks` weeks up to `today` (`YYYY-MM-DD`, UTC), a column per week with Monday on
 * top; each day's runs from `activity` and a shade relative to the busiest day.
 */
export function calendarDays(activity: { day: string; runs: number }[], today: string, weeks: number): CalendarDay[] {
  const runs = new Map(activity.map((a) => [a.day, a.runs]));
  const end = Date.parse(`${today}T00:00:00Z`);
  const weekday = (new Date(end).getUTCDay() + 6) % 7;
  const start = end - ((weeks - 1) * 7 + weekday) * MS_PER_DAY;
  const days: CalendarDay[] = [];
  for (let t = start, i = 0; t <= end; t += MS_PER_DAY, i++) {
    const day = iso(t);
    days.push({ day, runs: runs.get(day) ?? 0, week: Math.floor(i / 7), weekday: i % 7, level: 0 });
  }
  const busiest = Math.max(0, ...days.map((d) => d.runs));
  for (const d of days) if (d.runs > 0) d.level = Math.min(4, Math.max(1, Math.ceil((d.runs / busiest) * 4))) as CalendarDay["level"];
  return days;
}
