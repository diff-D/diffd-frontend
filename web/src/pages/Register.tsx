import { A, useNavigate } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import { auth, errorMessage, settings } from "../api/client";
import { refreshIdentity } from "../state/identity";
import { useNextPath, withNext } from "./next";
import { copyText } from "../ui/clipboard";
import { notify } from "../state/notices";
import { themeName } from "../state/theme";
import { useTitle } from "../ui/title";

export default function Register() {
  useTitle(() => "sign up");
  const navigate = useNavigate();
  const next = useNextPath();
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [codes, setCodes] = createSignal<string[]>();
  const [saved, setSaved] = createSignal(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const email = String(form.get("email") ?? "").trim();
    try {
      const res = await auth.register({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
        email: email === "" ? undefined : email,
      });
      await refreshIdentity();
      // keep the theme picked before signing up
      settings.put({ theme: themeName() }).catch(() => undefined);
      setCodes(res.backup_codes);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const codesText = () => `${(codes() ?? []).join("\n")}\n`;

  async function copy() {
    try {
      await copyText(codesText());
      notify("copied");
    } catch {
      notify("couldn't copy — select the codes instead");
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([codesText()], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "diffd-backup-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class="mx-auto flex w-full max-w-sm flex-col gap-4 pt-8">
      <Show
        when={codes()}
        fallback={
          <form class="flex flex-col gap-4" onSubmit={submit}>
            <h1 class="text-2xl text-text">sign up</h1>
            <label class="flex flex-col gap-1 text-sm text-sub">
              username
              <input class="field" name="username" autocomplete="username" required minLength={3} maxLength={20} />
            </label>
            <label class="flex flex-col gap-1 text-sm text-sub">
              password
              <input class="field" name="password" type="password" autocomplete="new-password" required minLength={8} maxLength={128} />
            </label>
            <label class="flex flex-col gap-1 text-sm text-sub">
              email (optional)
              <input class="field" name="email" type="email" autocomplete="email" />
            </label>
            <Show when={error()}>
              <p class="text-sm text-error">{error()}</p>
            </Show>
            <button class="btn" type="submit" disabled={busy()}>
              sign up
            </button>
            <p class="text-sm text-sub">
              already have an account?{" "}
              <A href={withNext("/login", next())} class="text-main">
                sign in
              </A>
            </p>
          </form>
        }
      >
        {(list) => (
          <>
            <h1 class="text-2xl text-text">save your backup codes</h1>
            <p class="text-sm text-sub">
              There is no email reset. Each code resets your password once. They are shown only now.
            </p>
            <ul data-testid="backup-codes" class="grid grid-cols-2 gap-2 text-main">
              <For each={list()}>{(code) => <li>{code}</li>}</For>
            </ul>
            <div class="flex gap-2">
              <button class="btn" type="button" onClick={() => void copy()}>
                copy
              </button>
              <button class="btn" type="button" onClick={download}>
                download .txt
              </button>
            </div>
            <label class="flex items-center gap-2 text-sub">
              <input type="checkbox" checked={saved()} onChange={(e) => setSaved(e.currentTarget.checked)} />I have saved these codes
            </label>
            <button class="btn" type="button" disabled={!saved()} onClick={() => navigate(next())}>
              continue
            </button>
          </>
        )}
      </Show>
    </div>
  );
}
