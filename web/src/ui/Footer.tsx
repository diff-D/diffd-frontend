import { useLocation } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { focused } from "../state/focus";
import { themeName } from "../state/theme";
import ThemePicker from "./ThemePicker";

const SOURCE_URL: string | undefined = import.meta.env.VITE_SOURCE_URL;

export default function Footer() {
  const location = useLocation();
  const [picking, setPicking] = createSignal(false);
  const theme = () => themeName().replaceAll("_", " ");
  return (
    <footer class={`flex flex-col items-center gap-4 text-xs text-sub transition-opacity ${focused() ? "opacity-0 hover:opacity-100 focus-within:opacity-100" : ""}`}>
      {/* only test pages restart with tab + enter */}
      <Show when={location.pathname.startsWith("/t/")}>
        <div class="touch:hidden">
          <kbd>tab</kbd> + <kbd>enter</kbd> - restart test
        </div>
      </Show>
      <div class="flex w-full items-center justify-between">
        <div>
          {/* the published frontend (GPL-3.0): on the home page only */}
          <Show when={location.pathname === "/" && SOURCE_URL}>
            {(url) => (
              <a class="btn-text" href={url()}>
                <i class="fa-solid fa-code" /> source (GPL-3.0)
              </a>
            )}
          </Show>
        </div>
        <button type="button" class="btn-text flex items-center gap-2" aria-label={`theme: ${theme()}`} onClick={() => setPicking(true)}>
          <i class="fa-solid fa-palette" />
          {theme()}
        </button>
      </div>
      <Show when={picking()}>
        <ThemePicker onClose={() => setPicking(false)} />
      </Show>
    </footer>
  );
}
