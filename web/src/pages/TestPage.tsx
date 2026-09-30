import { useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { testDef } from "../tests/registry";
import TestShell from "../tests/shell/TestShell";
import { useTitle } from "../ui/title";
import NotFound from "./NotFound";

export default function TestPage() {
  const params = useParams<{ test: string }>();
  useTitle(() => testDef(params.test)?.name);
  return (
    <Show when={testDef(params.test)} keyed fallback={<NotFound />}>
      {(def) => <TestShell def={def} />}
    </Show>
  );
}
