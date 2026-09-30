import { For, type JSX } from "solid-js";
import { CATALOG, CATEGORIES, type TestInfo } from "../tests/catalog";

/**
 * The games in sections by category (see `CATEGORIES`), each a grid of `card(info)`.
 * `compact`: small cards, two to a row even on a phone.
 */
export default function ByCategory(props: { card: (info: TestInfo) => JSX.Element; idPrefix?: string; compact?: boolean }) {
  return (
    <div class={`flex flex-col ${props.compact ? "gap-6" : "gap-10"}`}>
      <For each={CATEGORIES}>
        {(category) => {
          const games = CATALOG.filter((info) => info.category === category.id);
          return (
            <section id={`${props.idPrefix ?? ""}${category.id}`} data-testid={`category-${category.id}`} class={`flex scroll-mt-4 flex-col ${props.compact ? "gap-2" : "gap-4"}`}>
              <div class="flex items-baseline gap-3">
                <h2 class="text-[1.25rem] text-text">{category.name}</h2>
                <span class={`text-sm text-sub ${props.compact ? "hidden sm:inline" : ""}`}>{category.blurb}</span>
              </div>
              <div class={`grid ${props.compact ? "grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"}`}>
                <For each={games}>{(info) => props.card(info)}</For>
              </div>
            </section>
          );
        }}
      </For>
    </div>
  );
}
