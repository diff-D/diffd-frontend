import { Match, Show, Switch, createSignal, onCleanup, onMount } from "solid-js";
import { Dynamic } from "solid-js/web";
import { endFocus } from "../../state/focus";
import { phoneLink, usePhoneLink } from "../../state/remote";
import GameBar from "./GameBar";
import GameHeader from "./GameHeader";
import ResultFrame from "./ResultFrame";
import { createRun } from "./run";
import SettingsBar from "./SettingsBar";
import { type Remembered, loadSettings, saveSettings } from "./settings";
import RemoteNext from "./RemoteNext";
import StartScreen from "./StartScreen";
import type { AnyTestDef } from "./types";

/** A test page: the settings bar, then the start screen, play screen or result, then restart. */
/** `daily`: today's daily challenge: one ranked attempt, no settings, no restarting. */
export default function TestShell(props: { def: AnyTestDef; daily?: boolean }) {
  const def = props.def;
  const [remembered, setRemembered] = createSignal<Remembered<unknown>>(loadSettings(def.id, def.settings));
  const run = createRun(def, restart);
  usePhoneLink();
  const remote = def.remote ? phoneLink : undefined;
  const phase = run.phase;
  let restartButton: HTMLButtonElement | undefined;

  function restart() {
    // a focused button (settings, restart) would swallow Space and Enter
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    const current = remembered();
    if (props.daily) void run.start("ranked", null, true);
    else void run.start(current.mode, current[current.mode]);
  }

  function change(next: Remembered<unknown>) {
    setRemembered(next);
    saveSettings(def.id, next);
    restart();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Tab" || e.shiftKey) return;
    const target = e.target as HTMLElement | null;
    // dialogs and text boxes outside the test (theme search, custom prompt) keep Tab
    if (target?.closest("[role=dialog]")) return;
    if (target?.matches("input, textarea") && !target.closest("[data-test-area]")) return;
    e.preventDefault();
    restartButton?.focus();
  }

  // a daily challenge is one attempt: its run starts only when the player says so
  const [armed, setArmed] = createSignal(!props.daily);
  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    if (armed()) restart();
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    endFocus();
  });

  // tests with a start screen mount their play screen once started; the others right away
  const playing = () => phase() === "playing" || (phase() === "ready" && !def.howToPlay);

  return (
    <div class="flex grow flex-col" data-phase={phase()}>
      {/* faded out while playing; on a phone, gone (the game gets the screen) */}
      <div class={`flex min-h-8 items-center justify-center gap-4 transition-opacity ${phase() === "playing" ? "pointer-events-none opacity-0 max-sm:hidden" : ""}`}>
        <Show when={phase() !== "finished" && !props.daily}>
          <Show when={def.inlineSettings} fallback={<GameHeader def={def} remembered={remembered()} onChange={change} />}>
            <SettingsBar def={def} remembered={remembered()} onChange={change} />
          </Show>
        </Show>
      </div>
      <div data-test-area class="flex grow flex-col justify-start gap-8 pt-6 sm:justify-center sm:pt-0">
        <Switch>
          <Match when={!armed()}>
            <button
              type="button"
              data-testid="daily-start"
              class="flex flex-col items-center gap-4 self-center rounded-lg p-8 text-center"
              onClick={() => {
                setArmed(true);
                restart();
              }}
            >
              <i class={`fa-solid ${def.icon} text-[4rem] text-main`} />
              <span class="text-[2rem] text-text">{def.name}</span>
              <span class="max-w-xl text-sub">{def.howToPlay ?? def.description}</span>
              <span class="btn primary">start today's challenge</span>
              <span class="text-sm text-sub">one attempt: it counts once it starts</span>
            </button>
          </Match>
          <Match when={phase() === "loading" && def.prepare}>
            {(prepare) => <p class="text-center text-sub">{prepare().loading}</p>}
          </Match>
          <Match when={phase() === "failed"}>
            <p class="text-center text-sub">{run.failure()}</p>
          </Match>
          <Match when={phase() === "finished" && run.outcome()}>
            {(outcome) => (
              <>
                <ResultFrame def={def} outcome={outcome()} run={run.run()!} events={run.events()} />
                <Show when={def.remote && !props.daily}>
                  <RemoteNext link={phoneLink} text="play again" onNext={restart} />
                </Show>
              </>
            )}
          </Match>
          <Match when={phase() === "ready" && def.howToPlay}>
            <StartScreen def={def} onStart={run.began} remote={remote} />
          </Match>
          <Match when={playing() && run.run()} keyed>
            {(current) => (
              <>
              <Show when={phase() === "playing" && !props.daily}>
                <GameBar restart={restart} />
              </Show>
              <Dynamic
                component={def.Play}
                challenge={current.challenge}
                settings={current.settings}
                started={run.began}
                finish={(events: unknown[]) => run.finish(current.id, events)}
                remote={remote}
                live={current.live}
              />
              </>
            )}
          </Match>
        </Switch>
        <Show when={!props.daily}>
        <button
          ref={restartButton}
          type="button"
          class={`btn-text self-center px-8 py-4 ${phase() === "playing" ? "opacity-0 focus-visible:opacity-100" : ""}`}
          aria-label={phase() === "finished" ? "next test" : "restart test"}
          onClick={() => restart()}
        >
          <i class={`fa-solid fa-fw ${phase() === "finished" ? "fa-chevron-right" : "fa-rotate-right"}`} />
        </button>
        </Show>
      </div>
    </div>
  );
}
