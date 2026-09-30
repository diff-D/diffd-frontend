import { A } from "@solidjs/router";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import type { Mode } from "../../api/types";
import RemoteButton from "../../ui/RemoteButton";
import type { Remembered } from "./settings";
import SettingsGroups, { hasSettings, settingsSummary } from "./SettingsGroups";
import type { AnyTestDef } from "./types";

/**
 * Above a game: its name (with how to play), ranked / practice / 1v1, and the settings as a
 * chip that opens a panel of titled choices (practice only; ranked is always the same).
 */
export default function GameHeader(props: {
  def: AnyTestDef;
  remembered: Remembered<unknown>;
  onChange: (next: Remembered<unknown>) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [help, setHelp] = createSignal(false);
  let root!: HTMLDivElement;

  const mode = () => props.remembered.mode;
  const setMode = (next: Mode) => props.onChange({ ...props.remembered, mode: next });
  const setSettings = (next: unknown) =>
    props.onChange(mode() === "ranked" ? { ...props.remembered, ranked: next } : { ...props.remembered, practice: next });

  function openSettings() {
    // ranked is fixed: changing anything means practising
    if (mode() === "ranked") setMode("practice");
    setOpen((o) => !o || mode() === "ranked");
  }

  // on pointer down: a click on a choice re-renders it, so at click time it is no longer
  // inside the panel and would look like a click outside
  const close = (e: PointerEvent) => {
    if (!root.contains(e.target as Node)) {
      setOpen(false);
      setHelp(false);
    }
  };
  const escape = (e: KeyboardEvent) => {
    if (e.key === "Escape" && (open() || help())) {
      setOpen(false);
      setHelp(false);
    }
  };
  onMount(() => {
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
  });
  onCleanup(() => {
    document.removeEventListener("pointerdown", close);
    window.removeEventListener("keydown", escape);
  });

  return (
    <div ref={root} data-testid="game-header" class="relative flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-3">
      <div class="flex items-center gap-2">
        <i class={`fa-solid ${props.def.icon} text-main`} />
        <span class="text-text">{props.def.name}</span>
        <Show when={props.def.howToPlay}>
          <button type="button" class="btn-text !p-1 text-sm" aria-label="how to play" aria-expanded={help()} onClick={() => setHelp((h) => !h)}>
            <i class="fa-regular fa-circle-question" />
          </button>
        </Show>
      </div>

      <div role="group" aria-label="mode" class="flex rounded-full bg-sub-alt p-1 text-sm">
        <button type="button" class={`pill ${mode() === "ranked" ? "active" : ""}`} aria-pressed={mode() === "ranked"} onClick={() => setMode("ranked")}>
          ranked
        </button>
        <button type="button" class={`pill ${mode() === "practice" ? "active" : ""}`} aria-pressed={mode() === "practice"} onClick={() => setMode("practice")}>
          practice
        </button>
        <A href={`/duel/${props.def.id}`} class="pill">
          1v1
        </A>
      </div>

      <Show when={hasSettings(props.def)}>
        <button
          type="button"
          data-testid="settings-chip"
          class="flex items-center gap-2 rounded-full bg-sub-alt px-4 py-1 text-sm text-text"
          aria-expanded={open()}
          onClick={openSettings}
        >
          <i class={`fa-solid ${mode() === "ranked" ? "fa-lock text-sub" : "fa-sliders text-main"}`} />
          {settingsSummary(props.def, props.remembered[mode()], mode())}
        </button>
      </Show>

      <Show when={props.def.remote}>
        <RemoteButton />
      </Show>

      <Show when={help()}>
        <p data-testid="how-to-play" class="absolute top-full z-30 mt-2 max-w-md rounded-lg bg-sub-alt p-4 text-center text-sm text-text shadow-xl">
          {props.def.howToPlay}
        </p>
      </Show>

      <Show when={open() && mode() === "practice"}>
        <div
          role="dialog"
          aria-label="practice settings"
          data-testid="settings-panel"
          class="absolute top-full z-30 mt-2 flex w-[min(30rem,92vw)] flex-col gap-4 rounded-lg bg-sub-alt p-5 text-sm shadow-xl"
        >
          <SettingsGroups def={props.def} value={props.remembered.practice} onChange={setSettings} />
          <div class="flex justify-between border-t border-bg pt-3">
            <span class="text-sub">practice runs keep their own bests</span>
            <button type="button" class="btn-text !p-0" onClick={() => setSettings(props.def.settings.defaults.practice)}>
              reset
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
