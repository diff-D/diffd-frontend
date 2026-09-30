/**
 * You and your opponent, live, in one line. Once the opponent has finished, their side
 * shows their final score (`theirScore`) instead.
 */
export default function DuelStatus(props: {
  opponent: string;
  mine: number;
  theirs: number;
  theirScore: number | null;
  format: (value: number) => string;
  formatScore: (value: number) => string;
}) {
  return (
    <div data-testid="duel-status" class="flex justify-center gap-8 text-sm">
      <span>
        <span class="text-main">you</span> <span data-testid="my-progress" class="text-text">{props.format(props.mine)}</span>
      </span>
      <span>
        <span class="text-sub">{props.opponent}</span>{" "}
        <span data-testid="opponent-progress" class="text-text">
          {props.theirScore === null ? props.format(props.theirs) : `done · ${props.formatScore(props.theirScore)}`}
        </span>
      </span>
    </div>
  );
}
