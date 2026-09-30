export type NumberMemorySettings = { start_level: number };

/** `numbers[n - 1]` is the n-digit number of level n. */
export type NumberMemoryChallenge = { start_level: number; numbers: string[] };

export type NumberMemoryEvent = { t_ms: number; level: number; answer: string };

export type NumberMemoryScore = { level: number; start_level: number };
