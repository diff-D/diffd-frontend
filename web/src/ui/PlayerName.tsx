import { Show } from "solid-js";

/** A player's name, after their organisation's tag in a quieter colour ("PRX rain"). */
export default function PlayerName(props: { name: string; tag?: string | null }) {
  return (
    <>
      <Show when={props.tag}>
        {(tag) => <span class="mr-[0.4em] text-sub">{tag()}</span>}
      </Show>
      {props.name}
    </>
  );
}
