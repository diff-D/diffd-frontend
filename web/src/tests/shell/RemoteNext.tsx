import { type RemoteLink, useRemote } from "./remote";

/** A paired phone shows one big button, `text`, that does `onNext` (start a test, play again). */
export default function RemoteNext(props: { link?: RemoteLink; text: string; onNext: () => void }) {
  useRemote(
    props.link,
    () => ({ kind: "next", text: props.text }),
    (action) => action.type === "next" && props.onNext(),
  );
  return null;
}
