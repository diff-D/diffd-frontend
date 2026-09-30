import { A } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import type { Mode } from "../../api/types";
import CustomPromptDialog from "./CustomPrompt";
import type { Control, CustomPrompt, Remembered } from "./settings";
import type { AnyTestDef } from "./types";

function Choice(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class={`btn-text ${props.active ? "!text-main" : ""}`}
      aria-pressed={props.active}
      onClick={() => props.onClick()}
    >
      {props.label}
    </button>
  );
}

/** `ranked | practice`, then the test's own groups of choices for that mode. */
export default function SettingsBar(props: {
  def: AnyTestDef;
  remembered: Remembered<unknown>;
  onChange: (next: Remembered<unknown>) => void;
}) {
  const [prompt, setPrompt] = createSignal<CustomPrompt<unknown>>();
  const mode = () => props.remembered.mode;
  const groups = (): Control<unknown>[][] => props.def.settings.bar(props.remembered[mode()], mode());
  const setMode = (next: Mode) => props.onChange({ ...props.remembered, mode: next });
  const setSettings = (next: unknown) =>
    props.onChange(mode() === "ranked" ? { ...props.remembered, ranked: next } : { ...props.remembered, practice: next });

  function control(c: Control<unknown>) {
    if (c.kind === "note") return <span class="px-2 text-sub">{c.label}</span>;
    const select = c.kind === "option" ? () => setSettings(c.next) : () => setPrompt(c.prompt);
    return <Choice label={c.label} active={c.active} onClick={select} />;
  }

  return (
    <div data-testid="settings-bar" class="flex flex-wrap items-center justify-center gap-x-2 rounded-lg bg-sub-alt px-2 text-sm">
      <Choice label="ranked" active={mode() === "ranked"} onClick={() => setMode("ranked")} />
      <Choice label="practice" active={mode() === "practice"} onClick={() => setMode("practice")} />
      <A href={`/duel/${props.def.id}`} class="btn-text">
        1v1
      </A>
      <For each={groups()}>
        {(group) => (
          <>
            <span class="h-6 w-1 rounded bg-bg" />
            <For each={group}>{(c) => control(c)}</For>
          </>
        )}
      </For>
      <Show when={prompt()}>
        {(open) => (
          <CustomPromptDialog
            prompt={open()}
            onApply={(next) => {
              setPrompt(undefined);
              setSettings(next);
            }}
            onClose={() => setPrompt(undefined)}
          />
        )}
      </Show>
    </div>
  );
}
