/** A point on a chart, in pixels. */
export type Point = { x: number; y: number };

/**
 * A round, whole step for about `ticks` gridlines up to `max` (1, 2, 5, 10, 20, 25, 50, …),
 * and the axis top it gives: the first step at or above `max`.
 */
export function niceScale(max: number, ticks = 4): { step: number; top: number } {
  const rough = Math.max(max, 1) / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((m) => m * magnitude)
      .filter(Number.isInteger)
      .find((s) => s >= rough) ?? 10 * magnitude;
  return { step, top: Math.max(step, Math.ceil(max / step) * step) };
}

/**
 * A smooth SVG path through the points (sorted by x) that never bulges past its neighbours:
 * monotone cubic interpolation (Fritsch–Carlson), so a curve doesn't dip below zero or
 * overshoot a peak.
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  // tangents: the average of the slopes around a point, flat where the curve turns
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const length = Math.hypot(a, b);
    if (length > 3) {
      tangent[i] = (3 * a * slope[i]) / length;
      tangent[i + 1] = (3 * b * slope[i]) / length;
    }
  }
  let path = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const third = dx[i] / 3;
    const c1 = { x: points[i].x + third, y: points[i].y + tangent[i] * third };
    const c2 = { x: points[i + 1].x - third, y: points[i + 1].y - tangent[i + 1] * third };
    path += ` C${c1.x},${c1.y} ${c2.x},${c2.y} ${points[i + 1].x},${points[i + 1].y}`;
  }
  return path;
}
