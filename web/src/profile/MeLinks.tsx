import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { auth, errorMessage } from "../api/client";
import { currentUsername, isAdmin, isStaff, refreshIdentity } from "../state/identity";
import { notify } from "../state/notices";
import { themeName } from "../state/theme";
import ThemePicker from "../ui/ThemePicker";

/**
 * A phone's "me" tab: what the computer's header and footer hold besides the sections
 * (friends, organisations, moderation, the theme, signing in and out). Only below `sm`.
 */
export default function MeLinks() {
  const navigate = useNavigate();
  const [picking, setPicking] = createSignal(false);
  const row = "flex min-h-12 items-center gap-3 px-4 text-text";
  async function signOut() {
    try {
      await auth.logout();
      await refreshIdentity();
      navigate("/");
    } catch (err) {
      notify(errorMessage(err));
    }
  }
  return (
    <nav aria-label="more" data-testid="me-links" class="flex flex-col divide-y divide-bg overflow-hidden rounded-lg bg-sub-alt sm:hidden">
      <Show
        when={currentUsername()}
        fallback={
          <A href="/login" class={row}>
            <i class="fa-solid fa-fw fa-right-to-bracket text-main" /> sign in
          </A>
        }
      >
        <A href="/friends" class={row}>
          <i class="fa-solid fa-fw fa-address-book text-sub" /> friends
        </A>
      </Show>
      <A href="/orgs" class={row}>
        <i class="fa-solid fa-fw fa-building text-sub" /> organisations
      </A>
      <Show when={isStaff()}>
        <A href="/admin" class={row}>
          <i class="fa-solid fa-fw fa-shield-halved text-sub" /> {isAdmin() ? "admin" : "moderation"}
        </A>
      </Show>
      <button type="button" class={`${row} text-left`} onClick={() => setPicking(true)}>
        <i class="fa-solid fa-fw fa-palette text-sub" /> theme <span class="ml-auto text-sub">{themeName().replaceAll("_", " ")}</span>
      </button>
      <Show when={currentUsername()}>
        <button type="button" class={`${row} text-left`} onClick={() => void signOut()}>
          <i class="fa-solid fa-fw fa-right-from-bracket text-sub" /> sign out
        </button>
      </Show>
      <Show when={picking()}>
        <ThemePicker onClose={() => setPicking(false)} />
      </Show>
    </nav>
  );
}
