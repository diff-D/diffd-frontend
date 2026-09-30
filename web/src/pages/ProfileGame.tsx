import { A, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { ApiError, profile, users } from "../api/client";
import { boardLabel, lowerIsBetter } from "../profile/GameTile";
import RunsTable from "../profile/RunsTable";
import { testInfo } from "../tests/catalog";
import ScoreChart from "../ui/ScoreChart";
import Stat from "../ui/Stat";
import { summarize } from "../ui/stats";
import { formatDuration } from "./format";
import NotFound from "./NotFound";
import { useTitle } from "../ui/title";

const TYPING_BOARDS = ["time-15", "time-30", "time-60", "words-25", "words-50"];

/**
 * One game of a player (yours with `/profile/:test`, anyone's ranked play with
 * `/u/:username/:test`): its latest scores charted, its numbers, and its runs a page at a time.
 */
export default function ProfileGame() {
  const params = useParams<{ username?: string; test: string }>();
  const info = () => testInfo(params.test);
  useTitle(() => `${params.username ?? "your"} · ${info()?.name ?? params.test}`);
  const [key, setKey] = createSignal<string>();
  const [detail] = createResource(
    () => (info() ? { test: params.test, key: key(), name: params.username } : false),
    ({ test, key, name }) =>
      (name ? users.game(name, test, key) : profile.game(test, key)).catch((err: unknown) =>
        err instanceof ApiError && err.status === 404 ? null : Promise.reject(err),
      ),
  );
  const back = () => (params.username ? `/u/${encodeURIComponent(params.username)}` : "/profile");

  return (
    <Show when={info() && detail() !== null} fallback={<NotFound />}>
      <div class="flex flex-col gap-8 pt-4">
        <div class="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <A href={back()} class="btn-text">
            <i class="fa-solid fa-arrow-left" /> {params.username ?? "profile"}
          </A>
          <h1 class="flex items-center gap-3 text-[2rem] text-text">
            <i class={`fa-solid ${info()!.icon} text-main`} /> {info()!.name}
          </h1>
        </div>
        <Show when={params.test === "typing"}>
          <div role="group" aria-label="board" class="flex flex-wrap gap-2 text-sm">
            <For each={TYPING_BOARDS}>
              {(board) => {
                const active = () => (key() ?? info()!.defaultKey) === board;
                return (
                  <button type="button" class={`pill !bg-sub-alt ${active() ? "active" : ""}`} aria-pressed={active()} onClick={() => setKey(board)}>
                    {boardLabel(board)}
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
        <Show when={detail()} fallback={<p class="text-sub">loading…</p>}>
          {(d) => {
            const format = (value: number) => info()!.formatScore(Math.round(value * 100) / 100);
            const stats = () => summarize(d().scores.map((s) => s.primary_score));
            const best = () => d().game.bests.find((b) => b.settings_key === d().settings_key);
            return (
              <>
                <div data-testid="game-stats" class="flex flex-wrap gap-x-12 gap-y-4">
                  <Stat label="best" value={best() ? format(best()!.primary_score) : "–"} testId="game-best" />
                  <Show when={stats()}>
                    {(s) => (
                      <>
                        <Stat label={`average (last ${d().scores.length})`} value={format(s().average)} />
                        <Stat label="median" value={format(s().median)} />
                        <Stat label="std dev" value={`±${format(s().spread)}`} />
                      </>
                    )}
                  </Show>
                  <Stat label="runs" value={d().game.runs} testId="game-runs" />
                  <Stat label="time played" value={formatDuration(d().game.time_ms)} />
                  <Show when={d().game.wins + d().game.losses + d().game.draws > 0}>
                    <Stat label="1v1" value={`${d().game.wins}·${d().game.losses}·${d().game.draws}`} />
                  </Show>
                </div>
                <Show when={d().scores.length > 0} fallback={<p class="text-sub">no ranked runs on this board yet</p>}>
                  <ScoreChart scores={d().scores} format={format} lowerIsBetter={lowerIsBetter(params.test)} />
                </Show>
              </>
            );
          }}
        </Show>
        <RunsTable
          title={params.username ? "ranked runs" : "runs"}
          load={(cursor) => (params.username ? users.history(params.username, cursor, params.test) : profile.history(cursor, params.test))}
        />
      </div>
    </Show>
  );
}
