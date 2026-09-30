/** `lives`: absent in challenges from before practice settings (three). */
export type VerbalMemoryChallenge = { lives?: number; words: string[] };

export type VerbalMemorySettings = { lives: number };

export type VerbalAnswer = "seen" | "new";

export type VerbalMemoryEvent = { t_ms: number; index: number; answer: VerbalAnswer };

export type VerbalMemoryScore = { score: number; lives_left: number };
