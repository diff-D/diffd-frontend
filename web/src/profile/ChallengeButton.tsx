import { useNavigate } from "@solidjs/router";
import { For, createSignal } from "solid-js";
import { CATALOG } from "../tests/catalog";

/** Picks a test and opens a room that only this friend can join; they get a notification. */
export default function ChallengeButton(props: { username: string }) {
  const navigate = useNavigate();
  const [test, setTest] = createSignal(CATALOG[0].id);
  return (
    <div class="flex items-center gap-2">
      <select aria-label="test to play" class="field" value={test()} onChange={(e) => setTest(e.currentTarget.value)}>
        <For each={CATALOG}>{(info) => <option value={info.id}>{info.name}</option>}</For>
      </select>
      <button type="button" class="btn" onClick={() => navigate(`/duel/${test()}?challenge=${encodeURIComponent(props.username)}`)}>
        <i class="fa-solid fa-bolt" /> challenge
      </button>
    </div>
  );
}
