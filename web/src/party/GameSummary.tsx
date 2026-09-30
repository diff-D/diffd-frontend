import { For, Show, createEffect, createSignal } from "solid-js";
import type { PartyResults, PartyRunResult } from "../api/types";
import { testDef } from "../tests/registry";
import ResultFrame from "../tests/shell/ResultFrame";
import Sheet from "../ui/Sheet";
import type { PlayedGame } from "./createParty";
import { formatGameScore, gameIcon, gameName } from "./games";

/**
 * A game's placings: place, player, score (or "left") and the points won. With `onSelect`,
 * each player who finished can be picked (`selected` marks the one picked).
 */
export function Placings(props: { results: PartyResults; me?: string; selected?: string; onSelect?: (id: string) => void }) {
  return (
    <ol class="flex flex-col gap-1">
      <For each={props.results.placings}>
        {(placing) => {
          const row = (
            <>
              <span class={`w-8 text-right ${placing.place === 1 ? "text-main" : "text-sub"}`}>{placing.place ?? "–"}</span>
              <span class="grow text-text">
                {placing.name}
                {placing.id === props.me ? <span class="text-sub"> (you)</span> : ""}
              </span>
              <span class="text-text">{placing.score === null ? "left" : formatGameScore(props.results.test, placing.score)}</span>
              <span class="w-14 text-right text-sm text-main">+{placing.points}</span>
            </>
          );
          return (
            <li>
              <Show
                when={props.onSelect && placing.score !== null}
                fallback={<div class={`flex items-center gap-3 rounded px-1 ${placing.id === props.me ? "bg-sub-alt/60" : ""}`}>{row}</div>}
              >
                <button
                  type="button"
                  data-testid={`placing-${placing.name}`}
                  aria-pressed={props.selected === placing.id}
                  class={`flex w-full items-center gap-3 rounded px-1 text-left hover:bg-sub-alt ${props.selected === placing.id ? "bg-sub-alt ring-1 ring-main" : ""}`}
                  onClick={() => props.onSelect!(placing.id)}
                >
                  {row}
                </button>
              </Show>
            </li>
          );
        }}
      </For>
    </ol>
  );
}

/**
 * One game of the party looked back at: its placings, and a player's result in full (yours
 * first; click another player for theirs, fetched from the party). The × at the top right, a
 * click outside or Escape closes it.
 */
export default function GameSummary(props: {
  game: PlayedGame;
  number: number;
  me?: string;
  onClose: () => void;
  /** Another player's run of this game, once fetched; and asking for it. */
  lookup: (id: string) => PartyRunResult | undefined;
  request: (id: string) => void;
}) {
  /** Games with runs (not the party's own, like sketch) show each player's in full. */
  const runs = () => testDef(props.game.results.test) !== undefined;
  const firstFinished = () => props.game.results.placings.find((p) => p.score !== null)?.id;
  /** You in this game's placings (your id then, if you have reconnected since). */
  const me = () => props.game.mine?.id ?? props.me;
  const [selected, setSelected] = createSignal(props.game.mine ? me() : firstFinished());
  const selectedName = () => props.game.results.placings.find((p) => p.id === selected())?.name;
  // someone else's run comes from the party
  createEffect(() => {
    const id = selected();
    if (runs() && id && id !== me()) props.request(id);
  });
  return (
    <Sheet
      label={`game ${props.number} · ${gameName(props.game.results.test)}`}
      testId="game-summary"
      onClose={() => props.onClose()}
      top="8vh"
      class="sm:w-[min(52rem,calc(100%-2rem))]"
    >
      <div class="relative flex flex-col gap-6 overflow-y-auto p-6 pt-0 sm:pt-6">
        <button type="button" class="btn-text absolute top-3 right-3" aria-label="close" title="close" onClick={() => props.onClose()}>
          <i class="fa-solid fa-xmark" />
        </button>
        <h2 class="flex items-center gap-3 pr-8 text-[1.5rem] text-text">
          <i class={`fa-solid ${gameIcon(props.game.results.test)} text-main`} />
          game {props.number} · {gameName(props.game.results.test)}
        </h2>
        <Placings results={props.game.results} me={me()} selected={runs() ? selected() : undefined} onSelect={runs() ? setSelected : undefined} />
        <Show when={runs() && selected()} fallback={<Show when={runs()}><p class="text-sm text-sub">nobody finished this one</p></Show>}>
          {(id) => (
            <Show
              when={id() === me()}
              fallback={
                <Show when={props.lookup(id())} fallback={<p class="text-sm text-sub">loading {selectedName()}'s run…</p>}>
                  {(run) => (
                    <section data-testid="player-result" class="flex flex-col gap-4">
                      <h3 class="text-sub">{selectedName()}'s result</h3>
                      <ResultFrame
                        def={testDef(run().test)!}
                        outcome={{ score: run().score, isPb: null, saved: true, retry: () => {} }}
                        run={{ id: "", mode: run().mode, settings: run().settings, challenge: run().challenge }}
                        events={run().events}
                        links={false}
                      />
                    </section>
                  )}
                </Show>
              }
            >
              <Show when={props.game.mine && testDef(props.game.results.test) && props.game.mine} fallback={<p class="text-sm text-sub">you didn't finish this one</p>}>
                {(mine) => (
                  <section data-testid="player-result" class="flex flex-col gap-4">
                    <h3 class="text-sub">your result</h3>
                    <ResultFrame
                      def={testDef(props.game.results.test)!}
                      outcome={mine().outcome}
                      run={{ id: mine().started.run_id, mode: mine().started.mode, settings: mine().started.settings, challenge: mine().started.challenge }}
                      events={mine().events}
                      links={false}
                    />
                  </section>
                )}
              </Show>
            </Show>
          )}
        </Show>
      </div>
    </Sheet>
  );
}
