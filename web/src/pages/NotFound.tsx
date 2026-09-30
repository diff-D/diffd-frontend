import { A } from "@solidjs/router";

export default function NotFound() {
  return (
    <div class="flex flex-col items-center gap-4 pt-16 text-sub">
      <p class="text-[4rem] text-main">404</p>
      <A href="/" class="btn">
        back to the tests
      </A>
    </div>
  );
}
