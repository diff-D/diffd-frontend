import { For, createMemo, createSignal, onMount } from "solid-js";
import { isTouch } from "../state/device";
import { previewTheme, selectTheme, themeName } from "../state/theme";
import Sheet from "./Sheet";
import { themeNames, themes } from "../themes";

const label = (name: string) => name.replaceAll("_", " ");

/**
 * Picking previews a theme (typing, the arrow keys, a click); only Enter sets it, and Escape
 * or a click outside goes back to the one you had. On a touch screen a tap sets it (there's
 * no Enter to press), and the search waits to be tapped (no keyboard popping up).
 */
export default function ThemePicker(props: { onClose: () => void }) {
  const original = themeName();
  const [query, setQuery] = createSignal("");
  const [active, setActive] = createSignal(0);
  const matches = createMemo(() => {
    const q = query().trim().toLowerCase();
    return themeNames.filter((name) => label(name).includes(q));
  });
  let search!: HTMLInputElement;
  onMount(() => {
    if (!isTouch()) search.focus();
  });

  function preview(index: number, scroll = false) {
    const name = matches()[index];
    if (name === undefined) return;
    setActive(index);
    previewTheme(name);
    if (scroll) document.querySelector(`[data-theme="${name}"]`)?.scrollIntoView({ block: "nearest" });
  }
  function choose(name: string) {
    selectTheme(name);
    props.onClose();
  }
  function cancel() {
    previewTheme(original);
    props.onClose();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      preview(Math.min(active() + 1, matches().length - 1), true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      preview(Math.max(active() - 1, 0), true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const name = matches()[active()];
      if (name !== undefined) choose(name);
    }
  }

  return (
    <Sheet label="themes" onClose={cancel} class="text-base sm:w-[min(40rem,90vw)]">
        <input
          ref={search}
          class="bg-bg p-4 text-text outline-none placeholder:text-sub"
          placeholder="search themes"
          value={query()}
          onInput={(e) => {
            setQuery(e.currentTarget.value);
            preview(0);
          }}
          onKeyDown={onKeyDown}
        />
        <ul class="overflow-y-auto" role="listbox">
          <For each={matches()}>
            {(name, i) => (
              <li
                role="option"
                aria-selected={i() === active()}
                data-theme={name}
                class={`flex cursor-pointer items-center justify-between px-4 py-2 ${i() === active() ? "bg-sub-alt text-text" : "text-sub"}`}
                // a click previews and leaves the search focused, so Enter sets it
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (isTouch() ? choose(name) : preview(i()))}
              >
                <span>{label(name)}</span>
                <span class="flex gap-1 rounded-full p-1" style={{ background: themes[name].bg }}>
                  <For each={[themes[name].main, themes[name].sub, themes[name].text]}>
                    {(colour) => <span class="size-3 rounded-full" style={{ background: colour }} />}
                  </For>
                </span>
              </li>
            )}
          </For>
        </ul>
        <p class="border-t border-sub-alt px-4 py-2 text-xs text-sub touch:hidden">
          <kbd>enter</kbd> sets the theme · <kbd>esc</kbd> goes back
        </p>
    </Sheet>
  );
}
