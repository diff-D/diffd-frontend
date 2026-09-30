import { A } from "@solidjs/router";
import ByCategory from "../ui/ByCategory";
import { useTitle } from "../ui/title";

/** Pick a test to play 1v1. */
export default function DuelHub() {
  useTitle(() => "1v1");
  return (
    <div class="flex flex-col gap-8 pt-8">
      <div class="flex flex-col gap-2">
        <h1 class="text-[2rem] text-text">1v1</h1>
        <p class="text-sub">the same challenge for both of you, at the same time: the better score wins</p>
      </div>
      <ByCategory
        card={(info) => (
          <A href={`/duel/${info.id}`} data-testid={`duel-card-${info.id}`} class="card !flex-row items-center gap-3">
            <i class={`fa-solid fa-fw ${info.icon} text-[1.5rem] text-main`} />
            <span class="text-[1.25rem] text-text">{info.name}</span>
          </A>
        )}
      />
    </div>
  );
}
