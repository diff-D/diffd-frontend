import { createEffect, onCleanup } from "solid-js";

const SITE = "diff'D";

/** Names the browser tab after the page while it is open (`undefined`: just the site). */
export function useTitle(title: () => string | undefined): void {
  createEffect(() => {
    const page = title();
    document.title = page ? `${page} · ${SITE}` : SITE;
  });
  onCleanup(() => {
    document.title = SITE;
  });
}
