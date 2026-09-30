import { A } from "@solidjs/router";
import { For, Show, createResource } from "solid-js";
import { daily, profile } from "../api/client";
import type { Best } from "../api/types";
import { CATEGORIES, type TestInfo, testInfo } from "../tests/catalog";
import teaWordsUrl from "../../../wordlists/tea_dictionary.txt?url";
import unjumbleWordsUrl from "../../../wordlists/unjumble_dictionary.txt?url";
import ByCategory from "../ui/ByCategory";

/** A word game's dictionary, fetched ahead while the pointer is on its card. */
const DICTIONARIES: Record<string, string> = { unjumble: unjumbleWordsUrl };
const prefetched = new Set<string>();
function prefetch(id: string) {
  const url = DICTIONARIES[id] ?? (id.endsWith("_tea") ? teaWordsUrl : undefined);
  if (!url || prefetched.has(url)) return;
  prefetched.add(url);
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = url;
  document.head.append(link);
}

export default function Home() {
  // without bests (e.g. the server is down) the cards just don't show them
  const [bests] = createResource(() =>
    profile.bests().then(
      (res) => res.bests,
      (): Best[] => [],
    ),
  );
  const [today] = createResource(() => daily.today().catch(() => undefined));
  /** Your best ranked run with the test's default settings. */
  const best = (info: TestInfo) =>
    bests()?.find((b) => b.test === info.id && b.settings_key === info.defaultKey);

  return (
    <div class="flex flex-col gap-8 pt-8">
      <Show when={today()}>
        {(info) => {
          const game = testInfo(info().test);
          return (
            <A
              href="/daily"
              data-testid="daily-card"
              class="card !flex-row flex-wrap items-center gap-x-6 gap-y-2 ring-1 ring-main"
              onPointerEnter={() => prefetch(info().test)}
            >
              <i class={`fa-solid ${game?.icon} text-[2rem] text-main`} />
              <div class="flex grow flex-col">
                <span class="text-sm text-main">daily challenge · {info().date}</span>
                <span class="text-[1.25rem] text-text">{game?.name}</span>
                <span class="text-sm text-sub">
                  one game for everyone today, one attempt
                  <Show when={info().streak > 0}>
                    <span data-testid="daily-streak" class="ml-2 text-main">
                      <i class="fa-solid fa-fire" /> {info().streak}-day streak
                    </span>
                  </Show>
                </span>
              </div>
              <span class="text-main">
                {info().played === "finished" && info().score !== null
                  ? `you: ${game?.formatScore(info().score!)}`
                  : info().played === "started"
                    ? "played"
                    : "play now"}{" "}
                <i class="fa-solid fa-chevron-right" />
              </span>
            </A>
          );
        }}
      </Show>
      <div class="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="categories" class="flex gap-2 max-sm:-mx-4 max-sm:w-[calc(100%+2rem)] max-sm:overflow-x-auto max-sm:px-4 sm:flex-wrap">
          <For each={CATEGORIES}>
            {(category) => (
              <a href={`#${category.id}`} class="btn shrink-0 text-sm">
                {category.name}
              </a>
            )}
          </For>
        </nav>
        {/* a phone has these in its tab bar */}
        <nav aria-label="play with others" class="flex flex-wrap gap-4 text-sm max-sm:hidden">
          <A href="/duel" class="btn-text !px-0">
            <i class="fa-solid fa-user-group" /> 1v1
          </A>
          <A href="/party" class="btn-text !px-0">
            <i class="fa-solid fa-people-group" /> party
          </A>
          <A href="/leaderboards" class="btn-text !px-0">
            <i class="fa-solid fa-trophy" /> leaderboards
          </A>
        </nav>
      </div>
      <ByCategory
        card={(info) => (
          <A
            href={`/t/${info.id}`}
            data-testid={`card-${info.id}`}
            class="card max-sm:gap-1 max-sm:p-4"
            onPointerEnter={() => prefetch(info.id)}
            onFocus={() => prefetch(info.id)}
          >
            {/* a phone: two to a row, the name and best only */}
            <div class="flex items-center gap-3 max-sm:gap-2">
              <i class={`fa-solid fa-fw ${info.icon} text-[1.5rem] text-main max-sm:text-[1.1rem]`} />
              <span class="text-[1.25rem] text-text max-sm:text-base">{info.name}</span>
            </div>
            <span class="text-sm text-sub max-sm:hidden">{info.description}</span>
            <div class="mt-auto flex items-center justify-between gap-2 text-sm">
              <Show when={bests()} fallback={<span />}>
                <Show when={best(info)} fallback={<span class="text-sub">not played yet</span>}>
                  {(b) => <span class="text-main">best {info.formatScore(b().primary_score)}</span>}
                </Show>
              </Show>
              {/* (a span: Font Awesome's own display would win over `touch:hidden`) */}
              <Show when={info.remote}>
                <span class="touch:hidden">
                  <i
                    data-testid="remote-badge"
                    class="fa-solid fa-mobile-screen-button text-sub"
                    title="can be played from your phone"
                    aria-label="can be played from your phone"
                  />
                </span>
              </Show>
            </div>
          </A>
        )}
      />
    </div>
  );
}
