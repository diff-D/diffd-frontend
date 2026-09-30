import { createSignal } from "solid-js";

export type NoticeAction = { label: string; run: () => void };

export type Notice = { id: number; text: string; actions: NoticeAction[] };

const [notices, setNotices] = createSignal<Notice[]>([]);
let nextId = 0;

export { notices };

export function dismiss(id: number): void {
  setNotices((list) => list.filter((notice) => notice.id !== id));
}

/** Shows a short message in the corner (4 seconds, or `ms`), with optional buttons. */
export function notify(text: string, options: { actions?: NoticeAction[]; ms?: number } = {}): void {
  const id = nextId++;
  setNotices((list) => [...list, { id, text, actions: options.actions ?? [] }]);
  setTimeout(() => dismiss(id), options.ms ?? 4000);
}
