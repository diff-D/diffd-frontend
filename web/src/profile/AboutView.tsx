import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { About } from "../api/types";
import { orgKindLabel } from "./orgKinds";

/** A player's bio and the organisations they are in (each a link to its page). */
export default function AboutView(props: { about: About }) {
  const members = () => props.about.organisations.filter((org) => org.status === "member");
  return (
    <Show when={props.about.bio || members().length > 0}>
      <div class="flex flex-col gap-3">
        <Show when={props.about.bio}>
          {(bio) => (
            <p data-testid="bio" class="max-w-2xl whitespace-pre-line text-text">
              {bio()}
            </p>
          )}
        </Show>
        <Show when={members().length > 0}>
          <ul data-testid="profile-orgs" class="flex flex-wrap gap-2 text-sm">
            <For each={members()}>
              {(org) => (
                <li>
                  <A
                    href={`/orgs/${encodeURIComponent(org.tag)}`}
                    class={`flex items-baseline gap-2 rounded-lg bg-sub-alt px-3 py-1 hover:text-main ${org.tag === props.about.display ? "ring-1 ring-main" : ""}`}
                    title={orgKindLabel(org.kind)}
                  >
                    <span class="text-main">{org.tag}</span>
                    <span class="text-text">{org.name}</span>
                  </A>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </Show>
  );
}
