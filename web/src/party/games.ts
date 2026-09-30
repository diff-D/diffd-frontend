import { testInfo } from "../tests/catalog";

/** Party-only games: played together in a party, never alone or on the boards. */
export const SKETCH = {
  id: "sketch",
  name: "sketch",
  icon: "fa-pencil",
  description: "take turns drawing a word while everyone else guesses it in the chat",
};

/** A party game's name, icon and score as the party shows them. */
export const gameName = (test: string) => (test === SKETCH.id ? SKETCH.name : (testInfo(test)?.name ?? test));
export const gameIcon = (test: string) => (test === SKETCH.id ? SKETCH.icon : testInfo(test)?.icon);
export const formatGameScore = (test: string, value: number) => (test === SKETCH.id ? `${value} pts` : (testInfo(test)?.formatScore(value) ?? String(value)));
