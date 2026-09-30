import { A, useNavigate, useParams } from "@solidjs/router";
import { Show, createSignal, onMount } from "solid-js";
import { ApiError, errorMessage, remote } from "../api/client";

/** A phone scanned the QR code: pair it, then open the controller. */
export default function RemotePair() {
  const params = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = createSignal("");
  onMount(async () => {
    try {
      await remote.claim(params.code);
      navigate("/remote", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 404
          ? "this code has expired: make a new one on your computer"
          : errorMessage(err),
      );
    }
  });
  return (
    <div class="flex flex-col items-center gap-6 pt-16 text-center">
      <i class="fa-solid fa-mobile-screen-button text-[4rem] text-main" />
      <Show when={error()} fallback={<span class="text-[1.5rem] text-text">pairing…</span>}>
        <p data-testid="pair-error" class="max-w-sm text-error">
          {error()}
        </p>
        <A href="/remote" class="btn">
          open the remote
        </A>
      </Show>
    </div>
  );
}
