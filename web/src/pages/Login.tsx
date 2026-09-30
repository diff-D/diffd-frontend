import { A, useNavigate } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import { auth, errorMessage } from "../api/client";
import { refreshIdentity } from "../state/identity";
import { useNextPath, withNext } from "./next";
import { notify } from "../state/notices";
import { loadAccountTheme } from "../state/theme";
import { useTitle } from "../ui/title";

export default function Login() {
  useTitle(() => "sign in");
  const navigate = useNavigate();
  const next = useNextPath();
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget as HTMLFormElement);
    try {
      await auth.login({ username: String(form.get("username") ?? ""), password: String(form.get("password") ?? "") });
      // the account's theme first, so the page never shows signed in with the old one
      await loadAccountTheme().catch(() => notify("couldn't load your theme"));
      await refreshIdentity();
      navigate(next());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form class="mx-auto flex w-full max-w-sm flex-col gap-4 pt-8" onSubmit={submit}>
      <h1 class="text-2xl text-text">sign in</h1>
      <label class="flex flex-col gap-1 text-sm text-sub">
        username
        <input class="field" name="username" autocomplete="username" required />
      </label>
      <label class="flex flex-col gap-1 text-sm text-sub">
        password
        <input class="field" name="password" type="password" autocomplete="current-password" required />
      </label>
      <Show when={error()}>
        <p class="text-sm text-error">{error()}</p>
      </Show>
      <button class="btn" type="submit" disabled={busy()}>
        sign in
      </button>
      <p class="text-sm text-sub">
        no account?{" "}
        <A href={withNext("/register", next())} class="text-main">
          sign up
        </A>
      </p>
    </form>
  );
}
