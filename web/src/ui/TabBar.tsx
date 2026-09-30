import { A } from "@solidjs/router";
import { For } from "solid-js";

const TABS = [
  { href: "/", icon: "fa-table-cells-large", label: "tests", end: true },
  { href: "/duel", icon: "fa-user-group", label: "1v1" },
  { href: "/party", icon: "fa-people-group", label: "party" },
  { href: "/leaderboards", icon: "fa-trophy", label: "boards" },
  { href: "/profile", icon: "fa-user", label: "me" },
];

/**
 * A phone's sections, within the thumb's reach at the bottom of the screen, above the
 * iPhone's home bar (and whatever bar the browser keeps below). Only below `sm`.
 */
export default function TabBar() {
  return (
    <nav
      aria-label="sections"
      data-testid="tab-bar"
      class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-sub-alt bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <For each={TABS}>
        {(tab) => (
          <A
            href={tab.href}
            end={tab.end}
            class="flex min-h-14 flex-col items-center justify-center gap-1 text-sub [-webkit-tap-highlight-color:transparent]"
            activeClass="!text-main"
          >
            <i class={`fa-solid fa-fw ${tab.icon} text-[1.15rem]`} />
            <span class="text-[0.7rem] leading-none">{tab.label}</span>
          </A>
        )}
      </For>
    </nav>
  );
}
