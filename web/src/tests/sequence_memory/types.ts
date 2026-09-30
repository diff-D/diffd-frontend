/**
 * Level n flashes the first n tiles (0-8, row by row), from `start_level` (absent in
 * challenges from before practice settings: 1).
 */
export type SequenceMemoryChallenge = { start_level?: number; sequence: number[] };

export type SequenceMemorySettings = { start_level: number };

export type SequenceMemoryEvent = { t_ms: number; level: number; tile: number };

export type SequenceMemoryScore = { level: number };
