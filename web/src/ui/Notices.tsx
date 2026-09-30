import { For } from "solid-js";
import { dismiss, notices } from "../state/notices";

export default function Notices() {
  return (
    // a phone: at the top, clear of the notch, the tab bar and the keyboard
    <div class="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:top-auto sm:right-4 sm:bottom-4 sm:items-stretch" role="status">
      <For each={notices()}>
        {(notice) => (
          <div class="flex items-center gap-4 rounded-lg bg-sub-alt px-4 py-2 text-text shadow-xl">
            <span>{notice.text}</span>
            <For each={notice.actions}>
              {(action) => (
                <button
                  type="button"
                  class="btn-text !text-main"
                  onClick={() => {
                    dismiss(notice.id);
                    action.run();
                  }}
                >
                  {action.label}
                </button>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}
