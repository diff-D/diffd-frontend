/** One timed item of a run: a solved word, a right answer, a reaction. */
export type Timed = { ms: number; label: string; category?: string };

/** `spread`: the standard deviation, how far a typical time is from the average. */
export type Summary = { fastest: number[]; slowest: number[]; average: number; median: number; spread: number };

/** The 3 fastest and 3 slowest times, the average, the median and the spread; null without times. */
export function summarize(times: number[]): Summary | null {
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    fastest: sorted.slice(0, 3),
    slowest: sorted.slice(-3).reverse(),
    average,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    spread: Math.sqrt(sorted.reduce((sum, t) => sum + (t - average) ** 2, 0) / sorted.length),
  };
}

/** Average time per category, in the order the categories are given. */
export function averageByCategory(items: Timed[], order: string[]): { category: string; average: number; count: number }[] {
  return order.flatMap((category) => {
    const times = items.filter((item) => item.category === category).map((item) => item.ms);
    return times.length === 0 ? [] : [{ category, average: times.reduce((a, b) => a + b, 0) / times.length, count: times.length }];
  });
}

/** Seconds with one decimal ("1.4s"), or milliseconds under a second when `precise`. */
export const formatMs = (ms: number, precise = false): string => (precise && ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)}s`);
