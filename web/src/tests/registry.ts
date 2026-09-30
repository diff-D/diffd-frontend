import ReactionPlay from "./reaction";
import { scoreReaction } from "./reaction/logic";
import ReactionResults from "./reaction/Results";
import { reactionSettings } from "./reaction/settings";
import type { ReactionChallenge, ReactionEvent, ReactionScore, ReactionSettings } from "./reaction/types";
import {
  BLACK_TEA,
  BLUE_TEA,
  GREEN_TEA,
  MATHS,
  NUMBER_MEMORY,
  PATTERN_MEMORY,
  REACTION,
  RED_TEA,
  SEQUENCE_MEMORY,
  TYPING,
  UNJUMBLE,
  VERBAL_MEMORY,
  YELLOW_TEA,
} from "./catalog";
import MathsPlay from "./maths";
import { scoreMaths } from "./maths/logic";
import MathsResults from "./maths/Results";
import { mathsSettings } from "./maths/settings";
import type { MathsChallenge, MathsEvent, MathsScore, MathsSettings } from "./maths/types";
import NumberMemoryPlay from "./number_memory";
import { scoreNumberMemory } from "./number_memory/logic";
import NumberMemoryResults from "./number_memory/Results";
import { numberMemorySettings } from "./number_memory/settings";
import type { NumberMemoryChallenge, NumberMemoryEvent, NumberMemoryScore, NumberMemorySettings } from "./number_memory/types";
import PatternMemoryPlay from "./pattern_memory";
import { scorePatternMemory } from "./pattern_memory/logic";
import PatternMemoryResults from "./pattern_memory/Results";
import { patternMemorySettings } from "./pattern_memory/settings";
import type { PatternMemoryChallenge, PatternMemoryEvent, PatternMemoryScore, PatternMemorySettings } from "./pattern_memory/types";
import SequenceMemoryPlay from "./sequence_memory";
import { scoreSequenceMemory } from "./sequence_memory/logic";
import SequenceMemoryResults from "./sequence_memory/Results";
import { sequenceMemorySettings } from "./sequence_memory/settings";
import type { SequenceMemoryChallenge, SequenceMemoryEvent, SequenceMemoryScore, SequenceMemorySettings } from "./sequence_memory/types";
import type { AnyTestDef, TestDef } from "./shell/types";
import TeaPlay from "./tea";
import { loadTeaWords, teaWords } from "./tea/dictionary";
import { scoreTea } from "./tea/logic";
import TeaResults from "./tea/Results";
import { teaSettings } from "./tea/settings";
import type { TeaChallenge, TeaEvent, TeaScore, TeaSettings } from "./tea/types";
import TypingPlay from "./typing";
import { scoreTyping } from "./typing/logic";
import TypingResults from "./typing/Results";
import { typingSettings } from "./typing/settings";
import type { TypingChallenge, TypingEvent, TypingScore, TypingSettings } from "./typing/types";
import UnjumblePlay from "./unjumble";
import { dictionary, loadDictionary } from "./unjumble/dictionary";
import { scoreUnjumble } from "./unjumble/logic";
import UnjumbleResults from "./unjumble/Results";
import { unjumbleSettings } from "./unjumble/settings";
import type { UnjumbleChallenge, UnjumbleEvent, UnjumbleScore, UnjumbleSettings } from "./unjumble/types";
import VerbalMemoryPlay from "./verbal_memory";
import { scoreVerbalMemory } from "./verbal_memory/logic";
import VerbalMemoryResults from "./verbal_memory/Results";
import { verbalMemorySettings } from "./verbal_memory/settings";
import type { VerbalMemoryChallenge, VerbalMemoryEvent, VerbalMemoryScore, VerbalMemorySettings } from "./verbal_memory/types";

const typing: TestDef<TypingSettings, TypingChallenge, TypingScore> = {
  ...TYPING,
  settings: typingSettings,
  Play: TypingPlay,
  Results: TypingResults,
  score: (challenge, events) => scoreTyping(challenge, events as TypingEvent[]),
  primary: (score) => score.wpm,
  headline: (score) => [{ label: "acc", value: `${Math.round(score.accuracy)}%` }],
};

const reaction: TestDef<ReactionSettings, ReactionChallenge, ReactionScore> = {
  ...REACTION,
  live: true,
  settings: reactionSettings,
  Play: ReactionPlay,
  Results: ReactionResults,
  score: (challenge, events) => scoreReaction(challenge, events as ReactionEvent[]),
  primary: (score) => score.average_ms,
};

const numberMemory: TestDef<NumberMemorySettings, NumberMemoryChallenge, NumberMemoryScore> = {
  ...NUMBER_MEMORY,
  remotePreview: { kind: "keypad", value: "", enter: "submit" },
  settings: numberMemorySettings,
  Play: NumberMemoryPlay,
  Results: NumberMemoryResults,
  score: (challenge, events) => scoreNumberMemory(challenge, events as NumberMemoryEvent[]),
  primary: (score) => score.level,
};

const sequenceMemory: TestDef<SequenceMemorySettings, SequenceMemoryChallenge, SequenceMemoryScore> = {
  ...SEQUENCE_MEMORY,
  remotePreview: { kind: "grid", cols: 3, tiles: 9, active: false },
  settings: sequenceMemorySettings,
  Play: SequenceMemoryPlay,
  Results: SequenceMemoryResults,
  score: (challenge, events) => scoreSequenceMemory(challenge, events as SequenceMemoryEvent[]),
  primary: (score) => score.level,
};

const patternMemory: TestDef<PatternMemorySettings, PatternMemoryChallenge, PatternMemoryScore> = {
  ...PATTERN_MEMORY,
  remotePreview: { kind: "grid", cols: 3, tiles: 9, active: false },
  settings: patternMemorySettings,
  Play: PatternMemoryPlay,
  Results: PatternMemoryResults,
  score: (challenge, events) => scorePatternMemory(challenge, events as PatternMemoryEvent[]),
  primary: (score) => score.level,
};

const verbalMemory: TestDef<VerbalMemorySettings, VerbalMemoryChallenge, VerbalMemoryScore> = {
  ...VERBAL_MEMORY,
  remotePreview: {
    kind: "choice",
    options: [
      { id: "seen", label: "seen" },
      { id: "new", label: "new" },
    ],
  },
  settings: verbalMemorySettings,
  Play: VerbalMemoryPlay,
  Results: VerbalMemoryResults,
  score: (challenge, events) => scoreVerbalMemory(challenge, events as VerbalMemoryEvent[]),
  primary: (score) => score.score,
};

const maths: TestDef<MathsSettings, MathsChallenge, MathsScore> = {
  ...MATHS,
  live: true,
  remotePreview: { kind: "keypad", value: "", enter: "give up" },
  settings: mathsSettings,
  Play: MathsPlay,
  Results: MathsResults,
  score: (challenge, events) => scoreMaths(challenge, events as MathsEvent[]),
  primary: (score) => score.correct,
};

const unjumble: TestDef<UnjumbleSettings, UnjumbleChallenge, UnjumbleScore> = {
  ...UNJUMBLE,
  live: true,
  remotePreview: { kind: "text", prompt: "", clear: 0, enter: "try", skip: "skip" },
  settings: unjumbleSettings,
  Play: UnjumblePlay,
  Results: UnjumbleResults,
  score: (challenge, events) => scoreUnjumble(challenge, events as UnjumbleEvent[], (word) => dictionary().has(word)),
  primary: (score) => score.solved,
  prepare: { load: loadDictionary, loading: "loading words…", error: "couldn't load the dictionary" },
};

/** The five tea games share their play screen, results and scoring; the rules come with the challenge. */
const teas = [BLACK_TEA, GREEN_TEA, RED_TEA, YELLOW_TEA, BLUE_TEA].map(
  (info): TestDef<TeaSettings, TeaChallenge, TeaScore> => ({
    ...info,
    live: true,
    remotePreview: { kind: "text", prompt: "", clear: 0, enter: "enter" },
    settings: teaSettings(info.id),
    Play: TeaPlay,
    Results: TeaResults,
    score: (challenge, events) => scoreTea(challenge, events as TeaEvent[], (word) => teaWords().has(word)),
    primary: (score) => score.points,
    prepare: { load: loadTeaWords, loading: "loading words…", error: "couldn't load the dictionary" },
  }),
);

const DEFS = new Map<string, AnyTestDef>(
  [typing, reaction, numberMemory, sequenceMemory, patternMemory, verbalMemory, maths, unjumble, ...teas].map((def) => [def.id, def]),
);

export function testDef(id: string): AnyTestDef | undefined {
  return DEFS.get(id);
}
