import { Show, createSignal } from "solid-js";

/**
 * A guest's name in the party, with a pencil to change it: Enter saves, Escape (or leaving
 * the field) keeps the old one.
 */
export default function NameEditor(props: { name: string; rename: (name: string) => void }) {
  const [editing, setEditing] = createSignal(false);
  const [text, setText] = createSignal("");
  const save = () => {
    const name = text().trim();
    setEditing(false);
    if (name && name !== props.name) props.rename(name);
  };
  return (
    <Show
      when={editing()}
      fallback={
        <span class="flex grow items-center gap-2">
          <span class="text-text">{props.name}</span>
          <button
            type="button"
            class="btn-text !p-0 text-sm"
            aria-label="change your name"
            title="change your name for this party"
            onClick={() => {
              setText(props.name);
              setEditing(true);
            }}
          >
            <i class="fa-solid fa-pen" />
          </button>
        </span>
      }
    >
      <form
        class="flex grow"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          ref={(el) => queueMicrotask(() => el.select())}
          class="field w-full !py-0.5 text-sm"
          aria-label="your name"
          maxLength={20}
          value={text()}
          onInput={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          onBlur={() => setEditing(false)}
        />
      </form>
    </Show>
  );
}
