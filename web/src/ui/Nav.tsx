import { A, useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { auth, errorMessage } from "../api/client";
import { focused } from "../state/focus";
import { currentUsername, isAdmin, isStaff, refreshIdentity } from "../state/identity";
import { notify } from "../state/notices";
import Bell from "./Bell";

function IconLink(props: { href: string; icon: string; label: string; end?: boolean }) {
  return (
    <A href={props.href} end={props.end} aria-label={props.label} title={props.label} class="btn-text !px-1.5 sm:!px-2" activeClass="!text-main">
      <i class={`fa-solid fa-fw ${props.icon}`} />
    </A>
  );
}

export default function Nav() {
  const navigate = useNavigate();

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
    // phones: the logo and the account in one slim row; the sections are the tab bar's
    <header class={`flex items-center gap-2 transition-opacity ${focused() ? "opacity-0 hover:opacity-100 focus-within:opacity-100" : ""}`}>
      <A href="/" aria-label="diff'D home" class="shrink-0 text-[1.75rem] leading-none text-main sm:mr-4 sm:text-[2rem]">
        diff'D
      </A>
      <nav aria-label="sections" class="hidden items-center gap-1 sm:flex">
        <IconLink href="/" icon="fa-table-cells-large" label="tests" end />
        <IconLink href="/duel" icon="fa-user-group" label="1v1" />
        <IconLink href="/party" icon="fa-people-group" label="party" />
        <IconLink href="/leaderboards" icon="fa-trophy" label="leaderboards" />
        <IconLink href="/profile" icon="fa-user" label="profile" />
        <Show when={currentUsername()}>
          <IconLink href="/friends" icon="fa-address-book" label="friends" />
        </Show>
        <Show when={isStaff()}>
          <IconLink href="/admin" icon="fa-shield-halved" label={isAdmin() ? "admin" : "moderation"} />
        </Show>
      </nav>
      <div class="grow" />
      <div class="flex min-w-0 items-center">
        <Show when={currentUsername()} fallback={<IconLink href="/login" icon="fa-right-to-bracket" label="sign in" />}>
          {(username) => (
            <>
              <Bell />
              <A href="/profile" class="btn-text max-w-[9rem] truncate sm:max-w-[16rem]">
                {username()}
              </A>
              {/* a phone signs out from its "me" tab */}
              <button type="button" class="btn-text !px-1.5 max-sm:hidden sm:!px-2" aria-label="sign out" title="sign out" onClick={signOut}>
                <i class="fa-solid fa-fw fa-right-from-bracket" />
              </button>
            </>
          )}
        </Show>
      </div>
    </header>
  );
}
