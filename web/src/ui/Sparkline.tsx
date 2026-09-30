import { Show } from "solid-js";

/**
 * A tiny line of recent scores, oldest to newest; `flip` for scores where lower is better
 * (reaction time), so up always means better.
 */
export default function Sparkline(props: { values: number[]; flip?: boolean; label: string }) {
  const points = () => {
    const values = props.values;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const last = values.length - 1;
    return values
      .map((value, i) => {
        const x = last === 0 ? 50 : (i / last) * 100;
        const level = (value - min) / span;
        const y = 22 - (props.flip ? 1 - level : level) * 20;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };
  return (
    <Show when={props.values.length > 1} fallback={<span class="text-sub">–</span>}>
      <svg viewBox="0 0 100 24" preserveAspectRatio="none" class="h-6 w-24" role="img" aria-label={props.label}>
        <polyline points={points()} fill="none" stroke="var(--main-color)" stroke-width="2" vector-effect="non-scaling-stroke" />
      </svg>
    </Show>
  );
}
