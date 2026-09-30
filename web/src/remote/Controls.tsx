import { For, Match, Show, Switch, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import type { RemoteAction, RemoteControl, RemoteSpec, RemoteVerdict } from "../tests/shell/remote";

/** A live run's answer from the phone (as the server takes it). */
export type LiveAnswer = { type: "typed"; value: string } | { type: "enter"; value: string; index?: number } | { type: "skip"; index?: number };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * How the controls sit: their text size, how wide and how tall they are (as a share of the
 * default), and how far down the screen they start (for a thumb).
 */
type Layout = { size: number; width: number; height: number; lower: number };
const LAYOUT_KEY = "diffd:remote-layouts";
/** The layout before this phone changed it: the old one for every kind of control. */
const OLD_LAYOUT_KEY = "diffd:remote-layout";

/**
 * Each kind of control keeps a layout of its own (a number pad wants different room from
 * two big buttons); `button` is the rest (start, next). Their defaults differ too.
 */
type ControlKind = RemoteControl["kind"] | "button";
const DEFAULT_LAYOUTS: Record<ControlKind, Layout> = {
  keypad: { size: 1, width: 1, height: 1, lower: 0 },
  text: { size: 1, width: 1, height: 1, lower: 0 },
  grid: { size: 1, width: 0.9, height: 1, lower: 10 },
  choice: { size: 1, width: 1, height: 1, lower: 5 },
  button: { size: 1, width: 1, height: 1, lower: 10 },
};
/** A number pad's numbers are typed on it, or on the phone's own keyboard (remembered). */
type KeypadInput = "pad" | "keyboard";
const KEYPAD_INPUT_KEY = "diffd:remote-keypad-input";
const KEYPAD_INPUTS: [KeypadInput, string][] = [
  ["pad", "number pad"],
  ["keyboard", "phone keyboard"],
];
function loadKeypadInput(): KeypadInput {
  try {
    return localStorage.getItem(KEYPAD_INPUT_KEY) === "keyboard" ? "keyboard" : "pad";
  } catch {
    return "pad";
  }
}

/** What the layout panel says it is sizing. */
const KIND_NAMES: Record<ControlKind, string> = {
  keypad: "number pad",
  text: "word box",
  grid: "tiles",
  choice: "buttons",
  button: "start button",
};

/** The layout sliders: what each sets, its range, and how its value reads. */
const SLIDERS: { key: keyof Layout; name: string; label: string; min: number; max: number; step: number; unit: (v: number) => string }[] = [
  { key: "size", name: "size", label: "control size", min: 0.7, max: 1.5, step: 0.05, unit: (v) => `${Math.round(v * 100)}%` },
  { key: "width", name: "width", label: "control width", min: 0.5, max: 1, step: 0.05, unit: (v) => `${Math.round(v * 100)}%` },
  { key: "height", name: "height", label: "control height", min: 0.6, max: 2, step: 0.05, unit: (v) => `${Math.round(v * 100)}%` },
  { key: "lower", name: "lower", label: "move controls down", min: 0, max: 45, step: 1, unit: (v) => `${v}%` },
];

function loadLayouts(): Record<ControlKind, Layout> {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "null") as Partial<Record<ControlKind, Partial<Layout>>> | null;
    const old = JSON.parse(localStorage.getItem(OLD_LAYOUT_KEY) ?? "null") as Partial<Layout> | null;
    const layouts = { ...DEFAULT_LAYOUTS };
    for (const kind of Object.keys(layouts) as ControlKind[]) layouts[kind] = { ...layouts[kind], ...old, ...saved?.[kind] };
    return layouts;
  } catch {
    return DEFAULT_LAYOUTS;
  }
}

/** The ✓ or ✗ of the last answer, fading in and out inside the box it was typed in. */
function VerdictMark(props: { verdict: RemoteVerdict | undefined }) {
  return (
    <Show when={props.verdict} keyed>
      {(shown) => (
        <i
          data-testid="remote-verdict"
          data-verdict={shown.verdict}
          class={`mark-pop pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base fa-solid ${
            shown.verdict === "good" ? "fa-check text-main" : "fa-xmark text-error"
          }`}
        />
      )}
    </Show>
  );
}

/**
 * A test's controls for a phone (a number pad, a text box for words, the tiles, two big
 * buttons), each press going to `send`; before a test starts (`start`), greyed out under a
 * hint, a tap anywhere starting it. `adjusting` opens the panel that sizes them, for each
 * kind of control apart (remembered on this device).
 */
export default function Controls(props: {
  spec: RemoteSpec | null;
  send: (action: RemoteAction) => void;
  /** A live run's answer, straight to the server (with the question on screen). */
  sendLive: (input: LiveAnswer, shown: number | undefined) => void;
  /** A live run: whether the last answer was right, from the server. */
  liveVerdict?: RemoteVerdict;
  /** A live run: the question after the phone's last answer, from the server, which the
   * page's own word may not have caught up with yet. */
  ahead?: { index: number; prompt?: string };
  adjusting: boolean;
  onDone: () => void;
  waiting: string;
}) {
  /** In a live run, the controls whose answers go straight to the server: at the question
   * the server moved on to, if the page hasn't caught up. */
  const liveControl = () => {
    const control = shown();
    if (!((control?.kind === "keypad" || control?.kind === "text") && control.live)) return undefined;
    const ahead = props.ahead;
    if (!ahead || ahead.index <= (control.index ?? 0)) return control;
    return control.kind === "text" ? { ...control, index: ahead.index, prompt: ahead.prompt ?? control.prompt } : { ...control, index: ahead.index };
  };
  /** Live: the number typed here (the page's display would come a trip late). */
  const [number, setNumber] = createSignal("");
  /** Presses and typing: to the page, or in a live run as answers to the server. */
  function send(action: RemoteAction) {
    const live = liveControl();
    if (!live) return props.send(action);
    const answer = (input: LiveAnswer) => props.sendLive(input, live.index);
    if (action.type === "key" || action.type === "back") {
      const value = action.type === "key" ? (number() + action.key).slice(0, 12) : number().slice(0, -1);
      setNumber(value);
      answer({ type: "typed", value });
    } else if (action.type === "enter") answer({ type: "enter", value: number(), index: live.index });
    else if (action.type === "skip") answer({ type: "skip", index: live.index });
    else props.send(action);
  }
  // a right answer clears what was typed, for the next one
  createEffect(
    on(
      () => props.liveVerdict,
      (verdict) => {
        if (verdict?.verdict !== "good") return;
        setNumber("");
        setTyped("");
        setText("");
      },
    ),
  );
  /** The verdict to show: the server's in a live run, else the page's. */
  const verdictOf = (fromPage: RemoteVerdict | undefined) => (liveControl() ? props.liveVerdict : fromPage);
  const [layouts, setLayouts] = createSignal(loadLayouts());
  /** The slider being dragged: the panel fades to just it, so the controls show through. */
  const [dragging, setDragging] = createSignal<keyof Layout>();
  const stopDragging = () => setDragging(undefined);
  window.addEventListener("pointerup", stopDragging);
  window.addEventListener("pointercancel", stopDragging);
  onCleanup(() => {
    window.removeEventListener("pointerup", stopDragging);
    window.removeEventListener("pointercancel", stopDragging);
  });
  function change(next: Partial<Layout>) {
    const value = { ...layouts(), [kind()]: { ...layout(), ...next } };
    setLayouts(value);
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(value));
    } catch {
      // private mode: it just isn't remembered
    }
  }

  /**
   * A control's handlers: it acts as the finger touches it (a click only comes once the
   * finger lifts), and on Enter/Space from a keyboard.
   */
  const press = (action: RemoteAction) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.button === 0) send(action);
    },
    onClick: (e: MouseEvent) => {
      if (e.detail === 0) send(action);
    },
  });
  const big = "pad text-[2rem] min-h-[var(--pad-h)]";

  // before a test starts, its controls show greyed out under a hint, so they can be sized
  // first; a tap anywhere starts it
  const starting = () => {
    const current = props.spec;
    return current?.kind === "start" ? current : undefined;
  };
  /** The spec whose controls are drawn: the preview while starting. */
  const shown = (): RemoteSpec | null => starting()?.preview ?? props.spec;
  const kind = (): ControlKind => {
    const current = shown()?.kind;
    return current === "keypad" || current === "text" || current === "grid" || current === "choice" ? current : "button";
  };
  const layout = () => layouts()[kind()];

  // a number is typed on the number pad here, or on the phone's own keyboard
  const [typing, setTyping] = createSignal<KeypadInput>(loadKeypadInput());
  function chooseTyping(next: KeypadInput) {
    setTyping(next);
    try {
      localStorage.setItem(KEYPAD_INPUT_KEY, next);
    } catch {
      // private mode: it just isn't remembered
    }
  }
  const keypadValue = () => {
    const current = shown();
    return current?.kind === "keypad" ? current.value : undefined;
  };
  /** What the phone's keyboard has typed: each change goes to the computer as keys. */
  const [typed, setTyped] = createSignal("");
  // the computer moved on (a new problem, a new level): the box starts empty
  createEffect(on(keypadValue, (value) => value === "" && setTyped("")));
  function typedTo(next: string, box: HTMLInputElement) {
    const value = next.replace(/\D/g, "");
    const before = typed();
    let common = 0;
    while (common < before.length && common < value.length && before[common] === value[common]) common++;
    for (let i = common; i < before.length; i++) send({ type: "back" });
    for (const key of value.slice(common)) send({ type: "key", key });
    setTyped(value);
    if (box.value !== value) box.value = value;
  }

  // the word games: the phone's own keyboard types into a box of its own, cleared when the
  // computer moves on (`clear`)
  const textSpec = () => {
    const current = shown();
    return current?.kind === "text" ? current : undefined;
  };
  const [text, setText] = createSignal("");
  // the page moved on (a memo: any other change to the screen leaves the word being typed)
  const textClear = createMemo(() => textSpec()?.clear);
  createEffect(on(textClear, () => setText(""), { defer: true }));
  /**
   * The word typed here goes in as a whole, on Enter (or the button): it isn't sent as it's
   * typed. In a live run it goes straight to the server, which judges it; otherwise to the
   * page, which does.
   */
  function submitWord() {
    const word = text();
    if (word.trim() === "") return;
    const live = liveControl();
    if (live) {
      props.sendLive({ type: "enter", value: word, index: live.index }, live.index);
      return;
    }
    props.send({ type: "text", value: word });
    props.send({ type: "enter" });
  }
  // a new question starts a new number (a memo: any other change to the screen keeps it)
  const liveIndex = createMemo(() => liveControl()?.index);
  createEffect(
    on(liveIndex, () => {
      setNumber("");
      setTyped("");
      setText("");
    }),
  );
  /** A button next to the text box: acts at once and leaves the keyboard open. */
  const keepTyping = (act: RemoteAction | (() => void)) => {
    const run = () => (typeof act === "function" ? act() : send(act));
    return {
      onPointerDown: (e: PointerEvent) => {
        e.preventDefault();
        if (e.button === 0) run();
      },
      onClick: (e: MouseEvent) => {
        if (e.detail === 0) run();
      },
    };
  };
  const verdictClass = (verdict: RemoteVerdict | undefined) => (verdict?.verdict === "good" ? "good" : verdict?.verdict === "bad" ? "error" : "");

  return (
    <>
    <Show when={props.adjusting}>
      {/* over the controls, not pushing them down; while a slider is dragged only it shows */}
      <div
        data-testid="remote-layout"
        data-dragging={dragging() ?? ""}
        class={`fixed inset-x-4 top-16 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-lg p-4 text-sm text-sub transition-[background-color,box-shadow] duration-150 ${
          dragging() ? "bg-transparent" : "bg-sub-alt shadow-xl"
        }`}
      >
        <span data-testid="remote-layout-kind" class={`transition-opacity duration-150 ${dragging() ? "opacity-0" : ""}`}>
          sizing the {KIND_NAMES[kind()]}
        </span>
        <Show when={kind() === "keypad"}>
          <div role="group" aria-label="type numbers with" class={`flex self-start rounded-full bg-bg p-1 transition-opacity duration-150 ${dragging() ? "opacity-0" : ""}`}>
            <For each={KEYPAD_INPUTS}>
              {([id, label]) => (
                <button type="button" class={`pill ${typing() === id ? "active" : ""}`} aria-pressed={typing() === id} onClick={() => chooseTyping(id)}>
                  {label}
                </button>
              )}
            </For>
          </div>
        </Show>
        <For each={SLIDERS}>
          {(slider) => (
            <label
              class={`flex items-center gap-3 rounded-full transition-opacity duration-150 ${
                dragging() === undefined ? "" : dragging() === slider.key ? "bg-sub-alt px-3 py-2 shadow-xl" : "pointer-events-none opacity-0"
              }`}
            >
              <span class="w-14">{slider.name}</span>
              <input
                type="range"
                aria-label={slider.label}
                class="grow accent-[var(--main-color)]"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={layout()[slider.key]}
                onPointerDown={() => setDragging(slider.key)}
                onInput={(e) => change({ [slider.key]: Number(e.currentTarget.value) })}
                onChange={stopDragging}
              />
              <span class="w-12 text-right">{slider.unit(layout()[slider.key])}</span>
            </label>
          )}
        </For>
        <div class={`flex justify-between transition-opacity duration-150 ${dragging() ? "pointer-events-none opacity-0" : ""}`}>
          <button type="button" class="btn-text" onClick={() => change(DEFAULT_LAYOUTS[kind()])}>
            reset
          </button>
          <button type="button" class="btn-text !text-main" onClick={() => props.onDone()}>
            done
          </button>
        </div>
      </div>
    </Show>
    <div
      data-testid="remote-controls"
      data-kind={kind()}
      class="relative mx-auto flex grow flex-col"
      style={{
        zoom: layout().size,
        "padding-top": `${layout().lower}vh`,
        width: `${layout().width * 100}%`,
        "--pad-h": `${5 * layout().height}rem`,
      }}
    >
      <Show when={starting()}>
        {(start) => (
          <button
            type="button"
            data-testid="remote-start"
            class="absolute inset-0 z-10 flex items-start justify-center pt-4 text-[1.5rem] text-text"
            {...press({ type: "next" })}
          >
            <span class="rounded-full bg-bg/90 px-4 py-2 shadow-xl">{start().text}</span>
          </button>
        )}
      </Show>
      <div class={`flex grow flex-col ${starting() ? "pointer-events-none opacity-40" : ""}`} inert={starting() !== undefined}>
      <Switch fallback={<p class="pt-16 text-center text-sub">{props.waiting}</p>}>
        <Match when={shown()?.kind === "wait" && (shown() as { text: string })}>
          {(wait) => <p class="pt-16 text-center text-[1.5rem] text-text">{wait().text}</p>}
        </Match>
        <Match when={shown()?.kind === "next" && (shown() as { text: string })}>
          {(next) => (
            <button type="button" class={`${big} min-h-[calc(var(--pad-h)*2.4)]`} {...press({ type: "next" })}>
              {next().text}
            </button>
          )}
        </Match>
        <Match when={shown()?.kind === "keypad" && (shown() as { value: string; enter: string; verdict?: RemoteVerdict })}>
          {(pad) => (
            <div data-testid="remote-keypad" data-input={typing()} class="flex flex-col gap-3">
              <button
                type="button"
                class="btn-text self-end !p-0 text-sm"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => chooseTyping(typing() === "pad" ? "keyboard" : "pad")}
              >
                <i class={`fa-solid ${typing() === "pad" ? "fa-keyboard" : "fa-calculator"}`} /> {typing() === "pad" ? "use the phone's keyboard" : "use the number pad"}
              </button>
              <Show
                when={typing() === "pad"}
                fallback={
                  <>
                    <form
                      class="relative"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send({ type: "enter" });
                      }}
                    >
                      <input
                        data-testid="remote-number"
                        aria-label="your number"
                        class={`field h-[var(--pad-h)] w-full text-right text-[2.5rem] ${verdictClass(verdictOf(pad().verdict))}`}
                        inputmode="numeric"
                        enterkeyhint="go"
                        autocomplete="off"
                        value={typed()}
                        onInput={(e) => typedTo(e.currentTarget.value, e.currentTarget)}
                      />
                      <VerdictMark verdict={verdictOf(pad().verdict)} />
                    </form>
                    <button type="button" class={`${big} !text-base`} {...keepTyping({ type: "enter" })}>
                      {pad().enter}
                    </button>
                  </>
                }
              >
              <div class="relative">
                <div
                  data-testid="remote-value"
                  class={`field flex h-[var(--pad-h)] items-center justify-end overflow-hidden text-[2.5rem] leading-none ${verdictClass(verdictOf(pad().verdict))}`}
                >
                  {liveControl() ? number() : pad().value}
                </div>
                <VerdictMark verdict={verdictOf(pad().verdict)} />
              </div>
              <div class="grid grid-cols-3 gap-3">
                <For each={KEYS}>
                  {(key) => (
                    <button type="button" class={big} {...press({ type: "key", key })}>
                      {key}
                    </button>
                  )}
                </For>
                <button type="button" class={big} aria-label="delete" {...press({ type: "back" })}>
                  <i class="fa-solid fa-delete-left" />
                </button>
                <button type="button" class={big} {...press({ type: "key", key: "0" })}>
                  0
                </button>
                <button type="button" class={`${big} !text-base`} {...press({ type: "enter" })}>
                  {pad().enter}
                </button>
              </div>
              </Show>
            </div>
          )}
        </Match>
        <Match when={shown()?.kind === "grid" && (shown() as { cols: number; tiles: number; active: boolean })}>
          {(grid) => (
            <div
              data-testid="remote-grid"
              class={`grid gap-3 transition-opacity ${grid().active ? "" : "opacity-40"}`}
              style={{ "grid-template-columns": `repeat(${grid().cols}, minmax(0, 1fr))` }}
            >
              <For each={Array.from({ length: grid().tiles }, (_, i) => i)}>
                {(tile) => (
                  <button
                    type="button"
                    aria-label={`tile ${tile + 1}`}
                    class="pad"
                    style={{ "aspect-ratio": `1 / ${layout().height}` }}
                    disabled={!grid().active}
                    {...press({ type: "tap", tile })}
                  />
                )}
              </For>
            </div>
          )}
        </Match>
        <Match when={shown()?.kind === "choice" && (shown() as { options: { id: string; label: string }[] })}>
          {(choice) => (
            <div data-testid="remote-choice" class="flex h-[calc(var(--pad-h)*5)] flex-col gap-4">
              <For each={choice().options}>
                {(option) => (
                  <button type="button" class={`${big} grow text-[3rem]`} {...press({ type: "choose", id: option.id })}>
                    {option.label}
                  </button>
                )}
              </For>
            </div>
          )}
        </Match>
        <Match when={textSpec()}>
          {(word) => (
            <div data-testid="remote-text" class="flex flex-col gap-3">
              <span data-testid="remote-prompt" class="text-center text-[3rem] leading-none tracking-[0.25em] break-all text-text">
                {(liveControl() as { prompt?: string } | undefined)?.prompt ?? word().prompt}
              </span>
              {/* a form: the phone keyboard's send key submits it, even mid-word (an Android
                  keyboard composing a word doesn't report Enter as a key) */}
              <form
                class="relative"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitWord();
                }}
              >
                <input
                  data-testid="remote-word"
                  aria-label="your word"
                  class={`field h-[var(--pad-h)] w-full text-center text-[2rem] ${verdictClass(verdictOf(word().verdict))}`}
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck={false}
                  enterkeyhint="send"
                  value={text()}
                  onInput={(e) => setText(e.currentTarget.value)}
                />
                <VerdictMark verdict={verdictOf(word().verdict)} />
              </form>
              <p data-testid="remote-note" class="h-6 text-center text-error" aria-live="polite">
                {word().note}
              </p>
              <div class="grid grid-cols-2 gap-3">
                <Show when={word().skip} fallback={<span />}>
                  {(skip) => (
                    <button type="button" class={`${big} !text-base`} {...keepTyping({ type: "skip" })}>
                      {skip()}
                    </button>
                  )}
                </Show>
                <button type="button" class={`${big} !text-base`} {...keepTyping(submitWord)}>
                  {word().enter}
                </button>
              </div>
            </div>
          )}
        </Match>
      </Switch>
      </div>
    </div>
    </>
  );
}
