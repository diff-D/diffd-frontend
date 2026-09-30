import { A, useNavigate } from "@solidjs/router";
import { For, Match, Show, Switch, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { Dynamic } from "solid-js/web";
import { parties } from "../api/client";
import type { PartyMember } from "../api/types";
import { currentUsername } from "../state/identity";
import { notify } from "../state/notices";
import { phoneLink, usePhoneLink } from "../state/remote";
import { CATALOG, testInfo } from "../tests/catalog";
import { testDef } from "../tests/registry";
import ResultFrame from "../tests/shell/ResultFrame";
import SettingsGroups, { hasSettings, settingsSummary } from "../tests/shell/SettingsGroups";
import ByCategory from "../ui/ByCategory";
import { copyText } from "../ui/clipboard";
import InviteFriends from "../ui/InviteFriends";
import Sheet from "../ui/Sheet";
import RemoteButton from "../ui/RemoteButton";
import { createParty } from "./createParty";
import GameSummary, { Placings } from "./GameSummary";
import NameEditor from "./NameEditor";
import PartyChat from "./PartyChat";
import PlayerName from "../ui/PlayerName";
import { SKETCH, gameName } from "./games";
import Sketch from "./sketch/Sketch";
import SketchOptions, { sketchSummary } from "./sketch/SketchOptions";

const score = (test: string, value: number) => testInfo(test)?.formatScore(value) ?? String(value);
const progressOf = (test: string, value: number) => {
  const info = testInfo(test);
  return (info?.formatProgress ?? info?.formatScore)?.(value) ?? String(value);
};

/** Players by standings, the host first among equals. */
function standings(members: PartyMember[], host: string): PartyMember[] {
  return [...members].sort((a, b) => b.points - a.points || Number(b.id === host) - Number(a.id === host));
}

/** A party: a lobby between games, the game for everyone at once, then the placings. */
export default function PartyRoom(props: { code?: string }) {
  const navigate = useNavigate();
  // the address becomes the party's, to share (and to come back to)
  const p = createParty((code) => {
    if (!location.pathname.endsWith(`/${code}`)) navigate(`/party/${code}`, { replace: true });
  });
  usePhoneLink();
  onMount(() => p.connect(props.code));

  // r toggles ready in the lobby (not while typing, e.g. in the chat)
  const toggleReady = () => {
    if (p.stage() !== "lobby" || p.isHost() || !canPlay()) return;
    p.ready(!meMember()?.ready);
  };
  function onKeyDown(e: KeyboardEvent) {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (e.key !== "r" || typing || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    toggleReady();
  }
  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  const code = () => p.party()?.code;
  const link = () => `${location.origin}/party/${code()}`;
  const members = () => p.party()?.members ?? [];
  const meMember = () => members().find((m) => m.id === p.me());
  const picked = () => p.party()?.game ?? undefined;
  const def = () => (picked() ? testDef(picked()!) : undefined);
  /** The picked game as the lobby shows it: a test, or one of the party's own. */
  const chosenGame = () => def() ?? (picked() === SKETCH.id ? { ...SKETCH, howToPlay: undefined, remote: false } : undefined);
  const gameDef = () => (p.game() ? testDef(p.game()!.test) : undefined);

  // a word game's dictionary must be here before its play screen mounts
  const [loaded, setLoaded] = createSignal<string>();
  createEffect(
    on(picked, (test) => {
      const needs = test && testDef(test)?.prepare;
      if (!test) return;
      if (!needs) return setLoaded(test);
      setLoaded(undefined);
      needs.load().then(
        () => setLoaded(test),
        () => notify(needs.error),
      );
    }),
  );
  const canPlay = () => picked() !== undefined && loaded() === picked();
  const [tuning, setTuning] = createSignal(false);
  const [inviting, setInviting] = createSignal(false);
  /** The played game being looked back at (its index), if any. */
  const [viewing, setViewing] = createSignal<number>();
  // the settings panel closes when a game starts
  createEffect(
    on(p.stage, (stage) => {
      if (stage === "countdown") {
        setTuning(false);
        setViewing(undefined);
      }
    }),
  );
  /** The game's settings in a line: the ranked game, or practice with the host's choices. */
  const settingsLine = () => {
    const chosen = def();
    if (picked() === SKETCH.id) return sketchSummary(p.party()?.settings);
    if (!chosen) return "";
    const custom = p.party()?.settings;
    // loaded on the pages: unofficial, whatever the settings
    if (p.party()?.local) return `loaded locally · ${custom === undefined ? settingsSummary(chosen, chosen.settings.defaults.ranked, "ranked") || "standard" : settingsSummary(chosen, custom, "practice")} · doesn't count`;
    return custom === undefined ? `ranked · ${settingsSummary(chosen, chosen.settings.defaults.ranked, "ranked") || "standard"}` : `practice · ${settingsSummary(chosen, custom, "practice")}`;
  };

  const here = () => members().filter((m) => !m.away);
  const waitingFor = () => here().filter((m) => m.id !== p.party()?.host && !m.ready);

  function copy() {
    copyText(link()).then(
      () => notify("link copied"),
      () => notify("couldn't copy — select the link instead"),
    );
  }

  const Scoreboard = () => (
    <ul data-testid="party-scoreboard" class="flex flex-wrap justify-center gap-2 text-sm">
      <For each={members().filter((m) => m.playing)}>
        {(m) => {
          const test = () => p.game()?.test ?? "";
          const done = () => p.scores()[m.id];
          return (
            <li class={`flex items-center gap-2 rounded-full bg-sub-alt px-3 py-1 ${m.id === p.me() ? "ring-1 ring-main" : ""}`}>
              <span class="text-text">{m.name}</span>
              <span class={done() !== undefined ? "text-main" : "text-sub"}>
                {done() !== undefined ? `done · ${score(test(), done())}` : progressOf(test(), p.progress()[m.id] ?? 0)}
              </span>
            </li>
          );
        }}
      </For>
    </ul>
  );

  return (
    <div data-testid="party" data-stage={p.stage()} class="flex grow flex-col gap-6 pt-6">
      <Show when={p.notice() === "reconnecting…"}>
        <p data-testid="party-reconnecting" class="self-center rounded-full bg-sub-alt px-4 py-1 text-sm text-sub">
          <i class="fa-solid fa-plug" /> reconnecting…
        </p>
      </Show>
      <Switch>
        <Match when={p.stage() === "connecting"}>
          <p class="text-center text-sub">{props.code ? "joining the party…" : "starting a party…"}</p>
        </Match>
        <Match when={p.stage() === "closed"}>
          <div class="flex flex-col items-center gap-4 pt-12 text-center">
            <p class={p.closedBy() === "replaced" ? "text-sub" : "text-error"}>{p.notice()}</p>
            <Show
              when={p.closedBy() === "replaced" && code()}
              fallback={
                <A href="/party" class="btn">
                  start a new party
                </A>
              }
            >
              {(room) => (
                <button type="button" class="btn primary" onClick={() => p.connect(room())}>
                  play here
                </button>
              )}
            </Show>
          </div>
        </Match>
        <Match when={p.stage() === "countdown"}>
          <div class="flex flex-col items-center gap-4 pt-12 text-center">
            <span class="text-[1.5rem] text-text">{gameDef()?.name}</span>
            <span data-testid="countdown" class="text-[6rem] leading-none text-main">
              {p.countdown()}
            </span>
            <Show when={gameDef()?.remote}>
              <RemoteButton />
            </Show>
          </div>
        </Match>
        <Match when={p.stage() === "playing" && p.game() && gameDef()}>
          {(current) => (
            <>
              <Scoreboard />
              <Dynamic
                component={current().Play}
                challenge={p.game()!.challenge}
                settings={p.game()!.settings}
                started={() => {}}
                finish={p.finish}
                progress={p.reportProgress}
                remote={current().remote ? phoneLink : undefined}
                live={p.liveRun()}
              />
            </>
          )}
        </Match>
        {/* (the turn read straight from the party: a <Match> accessor goes stale as the game ends) */}
        <Match when={p.stage() === "sketching" && p.sketch() !== undefined}>
          {
            <Sketch
              turn={p.sketch()!}
              words={p.sketchWords()}
              drawing={p.drawing()}
              members={members()}
              me={p.me()}
              chat={p.chat()}
              say={p.say}
              pickWord={p.pickWord}
              draw={p.draw}
            />
          }
        </Match>
        <Match when={(p.stage() === "finished" || p.stage() === "spectating") && p.stage()}>
          <p class="text-center text-sub">{p.stage() === "spectating" ? "a game is on: you'll play the next one" : "waiting for the others…"}</p>
          <Scoreboard />
          <Show when={p.stage() === "finished" && p.outcome() && p.game() && gameDef()}>
            {(current) => (
              <ResultFrame
                def={current()}
                outcome={p.outcome()!}
                run={{ id: p.game()!.run_id, mode: p.game()!.mode, settings: p.game()!.settings, challenge: p.game()!.challenge }}
                events={p.events()}
              />
            )}
          </Show>
        </Match>
        <Match when={p.stage() === "lobby"}>
          <div class="grid gap-8 lg:grid-cols-[18rem_1fr] lg:grid-rows-[auto_1fr]">
            {/* on a phone: who is here, then the game, then the chat and the rest */}
            <aside class="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
              <div class="flex flex-col gap-2">
                <span class="text-sub">party</span>
                <span data-testid="party-code" class="text-[2rem] leading-none tracking-[0.2em] text-main">
                  {code()}
                </span>
                <div class="flex gap-2">
                  <input data-testid="party-link" aria-label="party link" class="field grow text-xs" readOnly value={link()} onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" class="btn" aria-label="copy link" title="copy link" onClick={copy}>
                    <i class="fa-solid fa-copy" />
                  </button>
                  <Show when={currentUsername()}>
                    <button type="button" class="btn" aria-label="invite friends" title="invite friends" onClick={() => setInviting(true)}>
                      <i class="fa-solid fa-user-plus" />
                    </button>
                  </Show>
                </div>
              </div>
              <section class="flex flex-col gap-2">
                <h2 class="text-sub">players · {members().length}/12</h2>
                <ul data-testid="party-members" class="flex flex-col gap-1">
                  <For each={standings(members(), p.party()?.host ?? "")}>
                    {(m) => (
                      <li class={`flex items-center gap-2 rounded px-2 py-1 ${m.id === p.me() ? "bg-sub-alt" : ""} ${m.away ? "opacity-50" : ""}`} title={m.away ? "away: their connection dropped" : undefined}>
                        <Show when={m.id === p.party()?.host} fallback={<i class={`fa-solid fa-fw ${m.ready ? "fa-circle-check text-main" : "fa-circle text-sub"}`} />}>
                          <i class="fa-solid fa-fw fa-crown text-main" title="host" />
                        </Show>
                        <Show
                          when={m.user}
                          fallback={
                            <Show when={m.id === p.me()} fallback={<span class="grow text-text">{m.name}</span>}>
                              <NameEditor name={m.name} rename={p.rename} />
                            </Show>
                          }
                        >
                          <A href={`/u/${encodeURIComponent(m.name)}`} class="grow text-text hover:text-main">
                            <PlayerName name={m.name} tag={m.tag} />
                          </A>
                        </Show>
                        <span class="text-sm text-sub">
                          {m.points} {m.points === 1 ? "pt" : "pts"}
                        </span>
                        <Show when={p.isHost() && m.id !== p.me()}>
                          <button
                            type="button"
                            class="btn-text !p-0 text-sm"
                            aria-label={`remove ${m.name}`}
                            title={`remove ${m.name}`}
                            onClick={() => confirm(`remove ${m.name} from the party?`) && p.kick(m.id)}
                          >
                            <i class="fa-solid fa-xmark" />
                          </button>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </section>
            </aside>

            <main class="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <Show when={p.results()}>
                {(results) => (
                  <button
                    type="button"
                    data-testid="party-results"
                    class="card !cursor-pointer gap-2 text-left"
                    title="see this game in full"
                    onClick={() => setViewing(p.played().length - 1)}
                  >
                    <span class="flex items-baseline justify-between text-sub">
                      <span>last game · {gameName(results().test)}</span>
                      <span class="text-sm">
                        details <i class="fa-solid fa-chevron-right" />
                      </span>
                    </span>
                    <Placings results={results()} me={p.me()} />
                  </button>
                )}
              </Show>

              <Show
                when={chosenGame()}
                fallback={<p class="text-sub">{p.isHost() ? "pick the first game" : "the host is picking a game…"}</p>}
              >
                {(chosen) => (
                  <section data-testid="party-game" class="flex flex-wrap items-center gap-4 rounded-lg bg-sub-alt p-4">
                    <i class={`fa-solid ${chosen().icon} text-[2rem] text-main`} />
                    <div class="flex grow flex-col">
                      <span class="text-[1.25rem] text-text">{chosen().name}</span>
                      <span class="text-sm text-sub">{chosen().howToPlay ?? chosen().description}</span>
                      <Show
                        when={p.isHost() && (picked() === SKETCH.id || hasSettings(def()!))}
                        fallback={
                          <span data-testid="party-settings" class="mt-1 text-sm text-main">
                            {settingsLine()}
                          </span>
                        }
                      >
                        <button
                          type="button"
                          data-testid="party-settings"
                          class="mt-1 self-start text-sm text-main hover:text-text"
                          aria-expanded={tuning()}
                          onClick={() => setTuning((t) => !t)}
                        >
                          <i class="fa-solid fa-sliders" /> {settingsLine()}
                        </button>
                      </Show>
                      {/* a game played live can load on the pages instead, for slow connections */}
                      <Show when={p.isHost() && def()?.live}>
                        <label class="mt-2 flex items-center gap-2 text-sm text-text">
                          <input
                            type="checkbox"
                            checked={p.party()?.local ?? false}
                            onChange={(e) => p.pick(picked()!, p.party()?.settings, e.currentTarget.checked)}
                          />
                          load challenge locally
                          <span class="text-sub">(for slow connections; the game won't count on leaderboards)</span>
                        </label>
                      </Show>
                    </div>
                    {/* games a phone can play: pair one here, before the game */}
                    <Show when={chosen().remote}>
                      <RemoteButton />
                    </Show>
                    <Show
                      when={p.isHost()}
                      fallback={
                        <button
                          type="button"
                          class={`btn ${meMember()?.ready ? "primary" : "outline"}`}
                          disabled={!canPlay()}
                          aria-pressed={meMember()?.ready ?? false}
                          aria-keyshortcuts="r"
                          title="ready (r)"
                          onClick={toggleReady}
                        >
                          {!canPlay() ? "loading…" : meMember()?.ready ? "ready ✓" : "ready"}
                        </button>
                      }
                    >
                      <div class="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          class="btn primary"
                          disabled={!canPlay() || here().length < 2 || waitingFor().length > 0}
                          onClick={() => p.start()}
                        >
                          <i class="fa-solid fa-play" /> start
                        </button>
                        <span data-testid="party-waiting" class="text-xs text-sub">
                          {here().length < 2
                            ? "invite someone to play"
                            : waitingFor().length > 0
                              ? `waiting for ${waitingFor()
                                  .map((m) => m.name)
                                  .join(", ")}`
                              : "everyone's ready"}
                        </span>
                      </div>
                    </Show>
                  </section>
                )}
              </Show>

              <Show when={p.isHost() && tuning() && picked() === SKETCH.id}>
                <section data-testid="party-settings-panel" class="flex flex-col gap-4 rounded-lg bg-sub-alt p-4 text-sm">
                  <SketchOptions value={p.party()?.settings} onChange={(next) => p.pick(SKETCH.id, next)} />
                </section>
              </Show>
              <Show when={p.isHost() && tuning() && def()}>
                {(chosen) => (
                  <section data-testid="party-settings-panel" class="flex flex-col gap-4 rounded-lg bg-sub-alt p-4 text-sm">
                    <SettingsGroups
                      def={chosen()}
                      value={p.party()?.settings ?? chosen().settings.defaults.practice}
                      onChange={(next) => p.pick(chosen().id, next)}
                    />
                    <div class="flex justify-between gap-4 border-t border-bg pt-3">
                      <span class="text-sub">custom settings are practice: they don't count for the leaderboards</span>
                      <button type="button" class="btn-text shrink-0 !p-0" onClick={() => p.pick(chosen().id)}>
                        back to ranked
                      </button>
                    </div>
                  </section>
                )}
              </Show>

              <Show when={p.isHost()}>
                <section class="flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <h2 class="text-sub">{def() ? "change the game" : "games"}</h2>
                    <button
                      type="button"
                      class="btn-text text-sm"
                      onClick={() => {
                        const others = CATALOG.filter((info) => info.id !== picked());
                        p.pick(others[Math.floor(Math.random() * others.length)].id);
                      }}
                    >
                      <i class="fa-solid fa-dice" /> surprise me
                    </button>
                  </div>
                  <section id="party-party" data-testid="category-party" class="flex flex-col gap-2">
                    <div class="flex items-baseline gap-3">
                      <h2 class="text-[1.25rem] text-text">party games</h2>
                      <span class="hidden text-sm text-sub sm:inline">only played together</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                      <button
                        type="button"
                        data-testid={`pick-${SKETCH.id}`}
                        title={SKETCH.name}
                        class={`card !flex-row items-center gap-2 !p-3 text-left text-sm sm:gap-3 sm:text-base ${picked() === SKETCH.id ? "ring-2 ring-main" : ""}`}
                        onClick={() => p.pick(SKETCH.id)}
                      >
                        <i class={`fa-solid fa-fw ${SKETCH.icon} text-main`} />
                        <span class="min-w-0 truncate text-text">{SKETCH.name}</span>
                      </button>
                    </div>
                  </section>
                  <ByCategory
                    idPrefix="party-"
                    compact
                    card={(info) => (
                      <button
                        type="button"
                        data-testid={`pick-${info.id}`}
                        title={info.name}
                        class={`card !flex-row items-center gap-2 !p-3 text-left text-sm sm:gap-3 sm:text-base ${picked() === info.id ? "ring-2 ring-main" : ""}`}
                        onClick={() => p.pick(info.id)}
                      >
                        <i class={`fa-solid fa-fw ${info.icon} text-main`} />
                        <span class="min-w-0 truncate text-text">{info.name}</span>
                      </button>
                    )}
                  />
                </section>
              </Show>
            </main>

            <aside class="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
              <PartyChat lines={p.chat()} me={p.me()} send={p.say} />
              <Show when={p.played().length > 1}>
                <section class="flex flex-col gap-2">
                  <h2 class="text-sub">games so far</h2>
                  <ol data-testid="party-games" class="flex flex-col gap-1 text-sm">
                    <For each={p.played()}>
                      {(game, i) => (
                        <li>
                          <button type="button" class="flex w-full gap-2 rounded px-1 text-left hover:bg-sub-alt" onClick={() => setViewing(i())}>
                            <span class="w-5 text-right text-sub">{game.results.game}</span>
                            <span class="grow text-text">{gameName(game.results.test)}</span>
                            <span class="text-main">{game.results.placings.find((placing) => placing.place === 1)?.name ?? "–"}</span>
                          </button>
                        </li>
                      )}
                    </For>
                  </ol>
                </section>
              </Show>
            </aside>
            <Show when={viewing() !== undefined && p.played()[viewing()!]}>
              {(game) => (
                <GameSummary
                  game={game()}
                  number={game().results.game}
                  me={p.me()}
                  onClose={() => setViewing(undefined)}
                  lookup={(id) => p.runResult(game().results.game, id)}
                  request={(id) => p.requestResult(game().results.game, id)}
                />
              )}
            </Show>
            <Show when={inviting() && currentUsername() && code()}>
              {(room) => (
                <Sheet label="invite friends" onClose={() => setInviting(false)} top="15vh">
                  <div class="flex flex-col gap-4 overflow-y-auto p-6 pt-0 sm:pt-6">
                    <InviteFriends send={(username) => parties.invite(room(), username)} />
                    <button type="button" class="btn-text self-end" onClick={() => setInviting(false)}>
                      done
                    </button>
                  </div>
                </Sheet>
              )}
            </Show>
          </div>
        </Match>
      </Switch>
    </div>
  );
}
