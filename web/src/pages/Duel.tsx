import { useParams, useSearchParams } from "@solidjs/router";
import { Show } from "solid-js";
import DuelRoom from "../duel/DuelRoom";
import { testDef } from "../tests/registry";
import { useTitle } from "../ui/title";
import NotFound from "./NotFound";

export default function Duel() {
  const params = useParams<{ test: string; code?: string }>();
  const [search] = useSearchParams<{ challenge?: string }>();
  useTitle(() => (testDef(params.test) ? `${testDef(params.test)!.name} 1v1` : undefined));
  return (
    <Show when={testDef(params.test)} keyed fallback={<NotFound />}>
      {(def) => <DuelRoom def={def} code={params.code} challenge={search.challenge} />}
    </Show>
  );
}
