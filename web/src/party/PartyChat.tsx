import { For, Match, Show, Switch, createEffect, createSignal, on } from "solid-js";
import type { PartyChatLine } from "../api/types";

/**
 * The party's chat: a fixed box of the latest lines (newest at the bottom) and a line to
 * write in (in sketch, where guesses go: `placeholder` says so). `fill`: as tall as its
 * place from md up (beside sketch's drawing), the line to write in at its foot.
 */
export default function PartyChat(props: { lines: PartyChatLine[]; me?: string; send: (text: string) => void; placeholder?: string; fill?: boolean }) {
  const [text, setText] = createSignal("");
  let list!: HTMLOListElement;
  // follow new lines unless you scrolled up to read older ones
  let following = true;
  createEffect(
    on(
      () => props.lines.length,
      () => {
        if (following) list.scrollTop = list.scrollHeight;
      },
    ),
  );

  // the party drops a member's lines closer than half a second apart: hold on to it instead
  let sentAt = -Infinity;
  function submit(e: SubmitEvent) {
    e.preventDefault();
    const line = text().trim();
    if (!line || performance.now() - sentAt < 550) return;
    sentAt = performance.now();
    props.send(line);
    setText("");
  }

  return (
    <section class={`flex flex-col gap-2 ${props.fill ? "md:h-full" : ""}`}>
      <h2 class="text-sub">chat</h2>
      <ol
        ref={list}
        data-testid="party-chat"
        aria-live="polite"
        class={`flex flex-col ${props.fill ? "h-48 md:h-0 md:grow" : "h-48"} gap-1 overflow-y-auto rounded-lg bg-sub-alt/40 p-2 text-sm [overflow-wrap:anywhere]`}
        onScroll={() => (following = list.scrollTop + list.clientHeight >= list.scrollHeight - 8)}
      >
        {/* a fixed box: lines sit at its bottom, older ones scroll up */}
        <li aria-hidden="true" class="mt-auto" />
        <Show when={props.lines.length === 0}>
          <li class="text-sub">say hi</li>
        </Show>
        <For each={props.lines}>
          {(line) => (
            <Switch
              fallback={
                <li class={line.kind === "insider" ? "rounded bg-main/10 px-1" : ""}>
                  <bdi class={line.id === props.me ? "text-main" : "text-sub"}>{line.name}</bdi> <bdi class="text-text">{line.text}</bdi>
                </li>
              }
            >
              <Match when={line.kind === "guessed"}>
                <li class="text-main">
                  <i class="fa-solid fa-check" /> <bdi>{line.name}</bdi> {line.text}
                </li>
              </Match>
              <Match when={line.kind === "hidden"}>
                <li data-testid="chat-hidden" title="too near the word: the others don't see it">
                  <bdi class="text-main">{line.name}</bdi> <bdi class="text-text">{line.text}</bdi>{" "}
                  <span class="text-sub italic">{line.close ? "is close! only you see this" : "only you see this"}</span>
                </li>
              </Match>
            </Switch>
          )}
        </For>
      </ol>
      <form class="flex" onSubmit={submit}>
        <input class="field grow text-sm" aria-label="chat message" placeholder={props.placeholder ?? "message"} maxLength={200} value={text()} onInput={(e) => setText(e.currentTarget.value)} />
      </form>
    </section>
  );
}
