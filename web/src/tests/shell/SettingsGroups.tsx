import { For, Show, createSignal } from "solid-js";
import type { Mode } from "../../api/types";
import CustomPromptDialog from "./CustomPrompt";
import type { Control, CustomPrompt } from "./settings";
import type { AnyTestDef } from "./types";

type Group = { title: string | undefined; summary?: (choice: string) => string; controls: Control<unknown>[] };

/** A test's `bar()` as titled groups: a group that starts with a note takes it as its title. */
function titled(groups: Control<unknown>[][]): Group[] {
  return groups.map((group) =>
    group[0]?.kind === "note"
      ? { title: group[0].label, summary: group[0].summary, controls: group.slice(1) }
      : { title: undefined, controls: group },
  );
}

/** The settings in one line: ranked's fixed description, or the active choice of each group. */
export function settingsSummary(def: AnyTestDef, value: unknown, mode: Mode): string {
  return titled(def.settings.bar(value, mode))
    .map((group) => {
      const active = group.controls.filter((c) => c.kind !== "note" && c.active).map((c) => c.label);
      if (active.length === 0) return group.title ?? "";
      return group.summary ? group.summary(active.join(" ")) : active.join(" ");
    })
    .filter(Boolean)
    .join(" · ");
}

/** Whether the test has practice options at all. */
export const hasSettings = (def: AnyTestDef) => def.settings.bar(def.settings.defaults.practice, "practice").length > 0;

/** A test's practice options as titled rows of pills (and its custom-number dialogs). */
export default function SettingsGroups(props: { def: AnyTestDef; value: unknown; onChange: (next: unknown) => void }) {
  const [prompt, setPrompt] = createSignal<CustomPrompt<unknown>>();
  const groups = () => titled(props.def.settings.bar(props.value, "practice"));
  return (
    <>
      <For each={groups()}>
        {(group) => (
          <div class="flex flex-col gap-2">
            <Show when={group.title}>
              <span class="text-sub">{group.title}</span>
            </Show>
            <div class="flex flex-wrap gap-2">
              <For each={group.controls}>
                {(c) =>
                  c.kind === "note" ? (
                    <span class="px-2 py-1 text-sub">{c.label}</span>
                  ) : (
                    <button
                      type="button"
                      class={`pill !bg-bg ${c.active ? "active" : ""}`}
                      aria-pressed={c.active}
                      onClick={() => (c.kind === "option" ? props.onChange(c.next) : setPrompt(c.prompt))}
                    >
                      {c.label}
                    </button>
                  )
                }
              </For>
            </div>
          </div>
        )}
      </For>
      <Show when={prompt()}>
        {(current) => (
          <CustomPromptDialog
            prompt={current()}
            onApply={(next) => {
              setPrompt(undefined);
              props.onChange(next);
            }}
            onClose={() => setPrompt(undefined)}
          />
        )}
      </Show>
    </>
  );
}
