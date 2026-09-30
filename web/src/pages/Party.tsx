import { useNavigate, useParams } from "@solidjs/router";
import { Show, createSignal } from "solid-js";
import PartyRoom from "../party/PartyRoom";
import { useTitle } from "../ui/title";

/** `/party`: start a party or join one by its code; `/party/new` starts one; `/party/:code`: the party. */
export default function Party() {
  useTitle(() => "party");
  const params = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const [code, setCode] = createSignal("");

  return (
    <Show when={params.code} fallback={
      <div class="flex flex-col items-center gap-8 pt-12 text-center">
        <i class="fa-solid fa-people-group text-[4rem] text-main" />
        <div class="flex flex-col gap-2">
          <h1 class="text-[2rem] text-text">party</h1>
          <p class="max-w-xl text-sub">play games together: up to 12 players, the same challenge for everyone, points for every player you beat</p>
        </div>
        <button type="button" class="btn primary text-[1.25rem]" onClick={() => navigate("/party/new")}>
          <i class="fa-solid fa-plus" /> start a party
        </button>
        <form
          class="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const room = code().trim().toUpperCase();
            if (room) navigate(`/party/${room}`);
          }}
        >
          <input
            class="field w-40 text-center tracking-[0.2em] uppercase"
            aria-label="party code"
            placeholder="CODE"
            maxLength={6}
            value={code()}
            onInput={(e) => setCode(e.currentTarget.value)}
          />
          <button type="submit" class="btn">
            join
          </button>
        </form>
      </div>
    }>
      {/* `new` starts a party; the page then moves to the party's own address */}
      <PartyRoom code={params.code === "new" ? undefined : params.code} />
    </Show>
  );
}
