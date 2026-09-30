// The server's scoring rules; both must pass fixtures/scoring/maths-*.json.
import type { Timed } from "../../ui/stats";
import type { MathsChallenge, MathsEvent, MathsScore, Op, Problem } from "./types";

const round2 = (x: number): number => Math.round(x * 100) / 100;

/** How long a given-up problem's answer stays on screen before the next one. */
export const REVEAL_MS = 600;

export const SYMBOLS: Record<Op, string> = { add: "+", subtract: "−", multiply: "×", divide: "÷" };

/** The answer (divisions always come out exact). */
export function solve(problem: Problem): number {
  switch (problem.op) {
    case "add":
      return problem.a + problem.b;
    case "subtract":
      return problem.a - problem.b;
    case "multiply":
      return problem.a * problem.b;
    case "divide":
      return Math.trunc(problem.a / problem.b);
  }
}

export function scoreMaths(challenge: MathsChallenge, events: MathsEvent[]): MathsScore {
  const limitMs = challenge.time_s * 1000;
  let correct = 0;
  let wrong = 0;
  for (const [expected, event] of events.entries()) {
    if (event.t_ms > limitMs) break;
    if (event.index !== expected) throw new Error("answers must be in order, one per problem");
    const problem = challenge.problems[event.index];
    if (problem === undefined) throw new Error("answer beyond the generated problems");
    if (solve(problem) === event.answer) correct += 1;
    else wrong += 1;
  }
  const answered = correct + wrong;
  return {
    correct,
    wrong,
    accuracy: answered === 0 ? 0 : round2((correct / answered) * 100),
    per_minute: round2(correct / (challenge.time_s / 60)),
  };
}

/** How long each right answer took, from the moment its problem appeared (a wrong answer's
 * reveal delays the next problem); the operator is its category. */
export function answerTimes(challenge: MathsChallenge, events: MathsEvent[]): Timed[] {
  const limitMs = challenge.time_s * 1000;
  const times: Timed[] = [];
  let shownAt = 0;
  for (const event of events) {
    if (event.t_ms > limitMs) break;
    const problem = challenge.problems[event.index];
    const right = event.answer === solve(problem);
    if (right) times.push({ ms: event.t_ms - shownAt, label: `${problem.a} ${SYMBOLS[problem.op]} ${problem.b}`, category: SYMBOLS[problem.op] });
    shownAt = event.t_ms + (right ? 0 : REVEAL_MS);
  }
  return times;
}
