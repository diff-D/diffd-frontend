// The server's scoring rules; both must pass fixtures/scoring/reaction-*.json.
import type { ReactionChallenge, ReactionEvent, ReactionScore } from "./types";

const round2 = (x: number): number => Math.round(x * 100) / 100;

export function scoreReaction(challenge: ReactionChallenge, events: ReactionEvent[]): ReactionScore {
  const roundsMs: number[] = [];
  let earlyClicks = 0;
  let attempts = 0;
  let inRound = false;
  let goAt: number | null = null;
  for (const event of events) {
    if (roundsMs.length === challenge.rounds) break;
    switch (event.kind) {
      case "round_start":
        if (inRound) throw new Error("a round started before the previous one ended");
        if (attempts === challenge.delays_ms.length) throw new Error("more attempts than generated delays");
        attempts += 1;
        inRound = true;
        goAt = null;
        break;
      case "go":
        if (!inRound || goAt !== null) throw new Error("go outside a round");
        goAt = event.t_ms;
        break;
      case "click":
        // clicks between rounds are ignored
        if (!inRound) break;
        if (goAt === null) earlyClicks += 1;
        else roundsMs.push(round2(event.t_ms - goAt));
        inRound = false;
        break;
    }
  }
  if (roundsMs.length < challenge.rounds) throw new Error("not all rounds were completed");
  const averageMs = round2(roundsMs.reduce((a, b) => a + b, 0) / roundsMs.length);
  return { rounds_ms: roundsMs, average_ms: averageMs, early_clicks: earlyClicks };
}
