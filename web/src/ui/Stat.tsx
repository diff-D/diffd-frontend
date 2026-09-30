export default function Stat(props: { label: string; value: string | number; big?: boolean; testId?: string }) {
  return (
    <div class="flex flex-col">
      <span class={props.big ? "text-[2rem] leading-none text-sub" : "text-base text-sub"}>{props.label}</span>
      <span data-testid={props.testId} class={props.big ? "text-[4rem] leading-[4rem] text-main" : "text-[2rem] text-main"}>
        {props.value}
      </span>
    </div>
  );
}
