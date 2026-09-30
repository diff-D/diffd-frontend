import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { errorMessage, remote } from "../api/client";
import { isTouch } from "../state/device";
import { notify } from "../state/notices";
import { devices, expectPhone, phones, refreshDevices } from "../state/remote";
import { timeAgo } from "../pages/format";
import QrCode from "./QrCode";

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** "remote": pair a phone with a QR code, see the paired ones, forget one; not on a phone itself. */
export default function RemoteButton() {
  if (isTouch()) return null;
  const [open, setOpen] = createSignal(false);
  const [code, setCode] = createSignal<string>();
  let root!: HTMLDivElement;
  const link = () => `${location.origin}/remote/pair/${code()}`;

  async function newCode() {
    try {
      const pairing = await remote.pair();
      setCode(pairing.code);
      expectPhone();
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  function toggle() {
    const next = !open();
    setOpen(next);
    // a code is used up once scanned: never show the last one again
    if (next) {
      setCode(undefined);
      void newCode();
    }
  }

  async function forget(id: string) {
    try {
      await remote.forget(id);
      await refreshDevices();
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  const closeOutside = (e: MouseEvent) => {
    if (!root.contains(e.target as Node)) setOpen(false);
  };
  onMount(() => document.addEventListener("click", closeOutside));
  onCleanup(() => document.removeEventListener("click", closeOutside));

  return (
    <div ref={root} class="relative">
      <button type="button" class="btn-text" aria-expanded={open()} onClick={toggle}>
        <i class="fa-solid fa-mobile-screen-button" /> remote
        <Show when={phones() > 0}>
          <span data-testid="phones-online" class="ml-1 text-main">
            · {phones()} connected
          </span>
        </Show>
      </button>
      <Show when={open()}>
        <div
          role="dialog"
          aria-label="phone remote"
          class="absolute left-1/2 z-40 mt-2 flex w-80 -translate-x-1/2 flex-col items-center gap-3 rounded-lg bg-sub-alt p-4 text-center shadow-xl"
        >
          <span class="text-text">play with your phone</span>
          <Show when={code()} fallback={<span class="text-sub">making a code…</span>}>
            <QrCode text={link()} label="QR code to pair a phone" />
            <span class="text-sm text-sub">scan it on the same Wi-Fi; the code works for 5 minutes</span>
            <input data-testid="remote-link" aria-label="pairing link" class="field w-full text-xs" readOnly value={link()} onFocus={(e) => e.currentTarget.select()} />
            <Show when={LOCAL.has(location.hostname)}>
              <span class="text-sm text-error">open this site by its network address (not localhost) so a phone can reach it</span>
            </Show>
          </Show>
          <Show when={devices().length > 0}>
            <div class="flex w-full flex-col gap-1 text-left">
              <span class="text-sm text-sub">paired phones · {phones()} connected</span>
              <For each={devices()}>
                {(device) => (
                  <div class="flex items-center justify-between gap-2 text-sm">
                    <span class="text-text">{device.label}</span>
                    <span class="text-sub">{timeAgo(device.last_used_at)}</span>
                    <button type="button" class="btn-text" onClick={() => void forget(device.id)}>
                      forget
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
